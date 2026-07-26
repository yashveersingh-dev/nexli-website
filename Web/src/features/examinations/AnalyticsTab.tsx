import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Donut, DonutLegend, BarChart, type BarItem } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useSections } from '@/features/school/data';
import { useExamPapers, useExamResults } from '@/features/daily/data';
import type { Exam, ExamPaper, ExamResult } from '@/types/daily';
import { sortPapers } from './shared';
import { letterGrade, resultStatusFor, RESULT_STATUS_META, type ResultStatus } from './examSchema';

const C = {
  pass: 'var(--success)',
  compartment: 'var(--warning)',
  fail: 'var(--danger)',
  gold: 'var(--gold)',
};

/** Percentage from a result's marks against the papers' max (mirrors ResultsTab). */
function pctFor(papers: ExamPaper[], marks: Record<string, number> | undefined): { pct: number; failed: number; entered: number } {
  let total = 0;
  let max = 0;
  let entered = 0;
  let failed = 0;
  for (const p of papers) {
    const v = marks?.[p.id];
    if (v == null || Number.isNaN(v)) continue;
    const pm = p.maxMarks ?? 0;
    total += v;
    max += pm;
    entered++;
    const pass = p.passMarks ?? Math.ceil(pm * 0.33);
    if (v < pass) failed++;
  }
  const pct = max > 0 ? Math.round((total / max) * 1000) / 10 : 0;
  return { pct, failed, entered };
}

interface Computed {
  status: ResultStatus;
  pct: number;
}

export function AnalyticsTab({ exam }: { exam: Exam }) {
  const { schoolId } = useSession();
  const { data: papers, loading: pLoading } = useExamPapers(schoolId, exam.id);
  const { data: results, loading: rLoading } = useExamResults(schoolId, exam.id);
  const { data: sections } = useSections(schoolId);

  const sortedPapers = useMemo(() => sortPapers(papers), [papers]);

  // Only results that actually carry marks count toward analytics.
  const scored = useMemo(
    () => results.filter((r) => r.marks && Object.keys(r.marks).length > 0),
    [results],
  );

  // Per-student computed status + percentage. Trust the saved percentage/status
  // when present, otherwise recompute from marks against the papers.
  const computedByStudent = useMemo(() => {
    const m = new Map<string, Computed>();
    for (const r of scored) {
      // Papers relevant to the student's grade (or all if papers aren't grade-scoped).
      const relevant = papers.filter((p) => !p.gradeId || !r.gradeName || p.gradeName === r.gradeName);
      const usePapers = relevant.length ? relevant : papers;
      const { pct, failed, entered } = pctFor(usePapers, r.marks);
      const finalPct = r.percentage != null ? r.percentage : pct;
      const status = r.resultStatus ?? (entered > 0 ? resultStatusFor(failed, finalPct) : 'fail');
      m.set(r.id, { status, pct: finalPct });
    }
    return m;
  }, [scored, papers]);

  const statusCounts = useMemo(() => {
    const counts = { pass: 0, compartment: 0, fail: 0 };
    for (const c of computedByStudent.values()) counts[c.status]++;
    return counts;
  }, [computedByStudent]);

  const totalScored = computedByStudent.size;
  const passPct = totalScored > 0 ? Math.round((statusCounts.pass / totalScored) * 100) : 0;
  const avgPct = useMemo(() => {
    if (totalScored === 0) return 0;
    let sum = 0;
    for (const c of computedByStudent.values()) sum += c.pct;
    return Math.round((sum / totalScored) * 10) / 10;
  }, [computedByStudent, totalScored]);

  // Subject-wise averages (per paper) across all scored students.
  const subjectAverages = useMemo(() => {
    const agg = new Map<string, { name: string; sumPct: number; n: number; maxMarks: number }>();
    for (const p of sortedPapers) {
      agg.set(p.id, { name: p.subjectName ?? '—', sumPct: 0, n: 0, maxMarks: p.maxMarks ?? 0 });
    }
    for (const r of scored) {
      for (const p of sortedPapers) {
        const v = r.marks?.[p.id];
        if (v == null || Number.isNaN(v)) continue;
        const pm = p.maxMarks ?? 0;
        const a = agg.get(p.id)!;
        a.sumPct += pm > 0 ? (v / pm) * 100 : 0;
        a.n++;
      }
    }
    return Array.from(agg.values())
      .filter((a) => a.n > 0)
      .map((a) => ({ name: a.name, avg: Math.round((a.sumPct / a.n) * 10) / 10 }));
  }, [sortedPapers, scored]);

  // Top & bottom performers by percentage.
  const ranked = useMemo(() => {
    const rows = scored
      .map((r) => ({ result: r, pct: computedByStudent.get(r.id)?.pct ?? 0, status: computedByStudent.get(r.id)?.status }))
      .sort((a, b) => b.pct - a.pct);
    return rows;
  }, [scored, computedByStudent]);

  const topPerformers = ranked.slice(0, 5);
  const bottomPerformers = ranked.slice(-5).reverse();

  // Section comparison (average % per section).
  const sectionComparison = useMemo(() => {
    const agg = new Map<string, { name: string; sum: number; n: number; pass: number }>();
    const sectionName = (id?: string) => {
      const sec = sections.find((s) => s.id === id);
      return sec?.name ?? id ?? '—';
    };
    for (const r of scored) {
      const key = r.sectionId ?? '__none';
      const a = agg.get(key) ?? { name: r.sectionId ? sectionName(r.sectionId) : 'Unassigned', sum: 0, n: 0, pass: 0 };
      const c = computedByStudent.get(r.id);
      a.sum += c?.pct ?? 0;
      a.n++;
      if (c?.status === 'pass') a.pass++;
      agg.set(key, a);
    }
    return Array.from(agg.values())
      .map((a) => ({ name: a.name, avg: Math.round((a.sum / a.n) * 10) / 10, passPct: Math.round((a.pass / a.n) * 100), n: a.n }))
      .sort((a, b) => b.avg - a.avg);
  }, [scored, computedByStudent, sections]);

  if (pLoading || rLoading) {
    return (
      <div className="nx-analytics">
        <div className="kpi-grid kpi-grid--4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={96} radius={12} />)}</div>
        <Skeleton height={260} radius={14} />
      </div>
    );
  }

  // Honest empty states.
  if (papers.length === 0) {
    return <EmptyState icon="calendar" title="No datesheet yet" message="Add subject papers on the Datesheet tab, then enter results to unlock analytics." />;
  }
  if (totalScored === 0) {
    return (
      <EmptyState
        icon="bar-chart"
        title="No results to analyse yet"
        message="Once marks are entered on the Results tab, pass rates, subject averages and performer insights will appear here."
      />
    );
  }

  const donutSegments = [
    { value: statusCounts.pass, color: C.pass, label: 'Pass' },
    { value: statusCounts.compartment, color: C.compartment, label: 'Compartment' },
    { value: statusCounts.fail, color: C.fail, label: 'Fail' },
  ].filter((s) => s.value > 0);

  const subjBars: BarItem[] = subjectAverages.map((s) => ({
    value: s.avg,
    label: s.name,
    color: s.avg >= 60 ? 'success' : s.avg >= 33 ? 'warning' : 'danger',
  }));

  return (
    <div className="nx-analytics">
      {/* KPIs */}
      <div className="kpi-grid kpi-grid--4">
        <KPICard icon="users" label="Students analysed" count={totalScored} sub="with marks entered" />
        <KPICard
          icon="trending-up"
          label="Pass percentage"
          count={passPct}
          suffix="%"
          sub={`${statusCounts.pass} of ${totalScored} passed`}
          subColor="var(--success)"
        />
        <KPICard icon="award" label="Average score" count={avgPct} suffix="%" sub="across all students" />
        <KPICard
          icon="alert-triangle"
          label="Need attention"
          count={statusCounts.compartment + statusCounts.fail}
          sub={`${statusCounts.compartment} compartment · ${statusCounts.fail} fail`}
          subColor={statusCounts.fail > 0 ? 'var(--danger)' : 'var(--warning)'}
        />
      </div>

      {/* Pass rate donut + status distribution */}
      <div className="nx-analytics__grid">
        <Panel title="Result outcomes" sub="pass / compartment / fail">
          <div className="donut-wrap">
            <Donut
              segments={donutSegments}
              centerValue={`${passPct}%`}
              centerLabel="pass rate"
            />
            <DonutLegend
              items={[
                { label: 'Pass', value: statusCounts.pass, color: C.pass },
                { label: 'Compartment', value: statusCounts.compartment, color: C.compartment },
                { label: 'Fail', value: statusCounts.fail, color: C.fail },
              ]}
            />
          </div>
        </Panel>

        <Panel title="Status distribution" sub="share of students">
          <div className="an-dist">
            {(['pass', 'compartment', 'fail'] as const).map((key) => {
              const count = statusCounts[key];
              const pct = totalScored > 0 ? Math.round((count / totalScored) * 100) : 0;
              const meta = RESULT_STATUS_META[key];
              return (
                <div className="an-dist__row" key={key}>
                  <span>{meta.label}</span>
                  <span className="an-dist__bar">
                    <span
                      className="an-dist__fill"
                      style={{ width: `${pct}%`, background: key === 'pass' ? C.pass : key === 'compartment' ? C.compartment : C.fail }}
                    />
                  </span>
                  <span className="an-dist__val">{count} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Subject-wise average */}
      <Panel title="Subject-wise average" sub="average % score per subject">
        {subjBars.length === 0 ? (
          <EmptyState icon="bar-chart" title="No subject marks yet" message="Subject averages appear once marks are entered." />
        ) : (
          <>
            <BarChart bars={subjBars} max={100} axis={['100', '50', '0']} />
            <div className="nx-analytics__barlabels" aria-hidden="true">
              {subjectAverages.map((s) => (
                <span key={s.name} className="nx-analytics__barlabel" title={`${s.name}: ${s.avg}%`}>{s.name}</span>
              ))}
            </div>
            <ul className="nx-sr-only">
              {subjectAverages.map((s) => <li key={s.name}>{s.name}: {s.avg}% average</li>)}
            </ul>
          </>
        )}
      </Panel>

      {/* Top & bottom performers */}
      <div className="nx-analytics__grid">
        <Panel title="Top performers" headerRight={<Icon name="trending-up" size={16} />}>
          <PerformerList rows={topPerformers} />
        </Panel>
        <Panel title="Needs support" headerRight={<Icon name="alert-triangle" size={16} />}>
          <PerformerList rows={bottomPerformers} />
        </Panel>
      </div>

      {/* Section comparison */}
      {sectionComparison.length > 1 && (
        <Panel title="Section comparison" sub="average % and pass rate by section">
          <div className="an-dist">
            {sectionComparison.map((s) => (
              <div className="an-dist__row nx-seccomp__row" key={s.name}>
                <span className="nx-seccomp__name">
                  {s.name}
                  <span className="nx-seccomp__sub">{s.n} student{s.n === 1 ? '' : 's'}</span>
                </span>
                <span className="an-dist__bar">
                  <span className="an-dist__fill" style={{ width: `${Math.min(s.avg, 100)}%` }} />
                </span>
                <span className="an-dist__val">{s.avg}%</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function PerformerList({ rows }: { rows: { result: ExamResult; pct: number; status?: ResultStatus }[] }) {
  if (rows.length === 0) {
    return <EmptyState icon="users" title="No data" message="No student results to rank yet." />;
  }
  return (
    <ol className="nx-perf">
      {rows.map((row, i) => (
        <li className="nx-perf__row" key={row.result.id}>
          <span className="nx-perf__rank" aria-hidden="true">{i + 1}</span>
          <span className="nx-perf__main">
            <span className="nx-perf__name">{row.result.studentName ?? 'Student'}</span>
            <span className="nx-perf__meta">
              {row.result.gradeName ? `${row.result.gradeName} · ` : ''}{letterGrade(row.pct)}
            </span>
          </span>
          <span className="nx-perf__pct">{row.pct}%</span>
          {row.status && <Badge variant={RESULT_STATUS_META[row.status].variant}>{RESULT_STATUS_META[row.status].label}</Badge>}
        </li>
      ))}
    </ol>
  );
}
