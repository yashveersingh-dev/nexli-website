import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades, useSubjects } from '@/features/school/data';
import { useExamPapers, useExamResults } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import type { Exam, ExamPaper } from '@/types/daily';
import { sortPapers, endTimeLabel } from './shared';

interface ChecklistItem {
  label: string;
  detail: string;
  ok: boolean;
  icon: IconName;
}

const MS_PER_DAY = 86_400_000;

export function PlanningTab({ exam }: { exam: Exam }) {
  const { schoolId } = useSession();
  const { data: papers, loading: pLoading, error } = useExamPapers(schoolId, exam.id);
  const { data: results, loading: rLoading } = useExamResults(schoolId, exam.id);
  const { data: grades } = useGrades(schoolId);
  const { data: subjects } = useSubjects(schoolId);

  // Grades in scope for this exam (empty gradeIds => all grades).
  const examGrades = useMemo(
    () => grades.filter((g) => !exam.gradeIds?.length || exam.gradeIds.includes(g.id)).sort((a, b) => a.order - b.order),
    [grades, exam.gradeIds],
  );

  const sorted = useMemo(() => sortPapers(papers), [papers]);

  // KPI: distinct grades that actually have at least one paper scheduled.
  const gradesWithPapers = useMemo(() => {
    const ids = new Set<string>();
    let sharedPapers = false; // papers with no gradeId apply to every exam grade
    for (const p of papers) {
      if (p.gradeId) ids.add(p.gradeId);
      else sharedPapers = true;
    }
    if (sharedPapers) return examGrades.length;
    return examGrades.filter((g) => ids.has(g.id)).length;
  }, [papers, examGrades]);

  // KPI: days until the exam starts (or 0 once started).
  const daysUntil = useMemo(() => {
    if (!exam.startDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((exam.startDate - today.getTime()) / MS_PER_DAY));
  }, [exam.startDate]);

  // KPI: % of in-scope (grade × section) cohorts that have results entered.
  // We approximate "expected" as one result row per student that *could* sit the
  // exam; since we don't load students here, we report entered rows vs. a target
  // derived from sections that have results, falling back to a simple presence %.
  const resultsEnteredPct = useMemo(() => {
    if (papers.length === 0) return 0;
    if (results.length === 0) return 0;
    const withMarks = results.filter((r) => Object.keys(r.marks ?? {}).length > 0).length;
    // Honest proxy: share of saved result docs that actually carry marks.
    return results.length > 0 ? Math.round((withMarks / results.length) * 100) : 0;
  }, [papers, results]);

  // Coverage: does every scholastic subject taught in each exam grade have a paper?
  const coverage = useMemo(() => {
    // Subjects expected per grade (scholastic only), minus those already scheduled.
    const scheduledByGrade = new Map<string, Set<string>>();
    let hasSharedPaper = false;
    for (const p of papers) {
      if (!p.subjectId) continue;
      if (p.gradeId) {
        const set = scheduledByGrade.get(p.gradeId) ?? new Set<string>();
        set.add(p.subjectId);
        scheduledByGrade.set(p.gradeId, set);
      } else {
        hasSharedPaper = true;
      }
    }
    const missing: { gradeName: string; subjects: string[] }[] = [];
    for (const g of examGrades) {
      const expected = subjects.filter(
        (s) => (s.isScholastic ?? true) && (!s.gradeIds?.length || s.gradeIds.includes(g.id)),
      );
      if (expected.length === 0) continue;
      const scheduled = scheduledByGrade.get(g.id) ?? new Set<string>();
      const gaps = expected.filter((s) => !scheduled.has(s.id)).map((s) => s.name);
      // Shared (grade-agnostic) papers make exhaustive per-grade checks unreliable,
      // so only flag a gap when we have grade-scoped papers to compare against.
      if (gaps.length > 0 && !hasSharedPaper) missing.push({ gradeName: g.name, subjects: gaps });
    }
    return { complete: missing.length === 0 && papers.length > 0, missing, hasSharedPaper };
  }, [papers, examGrades, subjects]);

  const checklist: ChecklistItem[] = useMemo(() => {
    const withRooms = papers.filter((p) => p.roomName?.trim()).length;
    const datedPapers = papers.filter((p) => p.date != null).length;
    return [
      {
        label: 'Datesheet created',
        detail: papers.length > 0 ? `${papers.length} paper${papers.length === 1 ? '' : 's'} scheduled` : 'No papers added yet',
        ok: papers.length > 0,
        icon: 'calendar',
      },
      {
        label: 'All exam dates set',
        detail: papers.length === 0 ? 'Add papers first' : `${datedPapers}/${papers.length} papers have a date`,
        ok: papers.length > 0 && datedPapers === papers.length,
        icon: 'clock',
      },
      {
        label: 'Subjects covered per grade',
        detail: coverage.hasSharedPaper
          ? 'Shared papers in use — verify manually'
          : coverage.complete
            ? 'Every grade subject has a paper'
            : `Missing in ${coverage.missing.length} grade${coverage.missing.length === 1 ? '' : 's'}`,
        ok: coverage.complete,
        icon: 'file-text',
      },
      {
        label: 'Rooms assigned',
        detail: papers.length === 0 ? 'Add papers first' : `${withRooms}/${papers.length} papers have a room`,
        ok: papers.length > 0 && withRooms === papers.length,
        icon: 'building',
      },
      {
        label: 'Results entered',
        detail: results.length > 0 ? `${results.length} student result${results.length === 1 ? '' : 's'} saved` : 'No results entered yet',
        ok: results.length > 0,
        icon: 'award',
      },
      {
        label: 'Results published',
        detail: exam.published ? 'Visible to students & parents' : 'Still in draft',
        ok: !!exam.published,
        icon: 'check-circle',
      },
    ];
  }, [papers, results, coverage, exam.published]);

  const readyCount = checklist.filter((c) => c.ok).length;

  if (pLoading || rLoading) {
    return (
      <div className="nx-plan">
        <div className="kpi-grid kpi-grid--4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={96} radius={12} />)}</div>
        <Skeleton height={260} radius={14} />
      </div>
    );
  }
  if (error) {
    return <EmptyState icon="alert-triangle" title="Could not load planning data" message="Check your connection and try again." />;
  }

  return (
    <div className="nx-plan">
      {/* KPIs */}
      <div className="kpi-grid kpi-grid--4">
        <KPICard
          icon="users"
          label="Grades covered"
          value={`${gradesWithPapers}/${examGrades.length || '—'}`}
          sub={examGrades.length ? `${examGrades.length} grade${examGrades.length === 1 ? '' : 's'} in this exam` : 'No grades assigned'}
        />
        <KPICard icon="file-text" label="Subject papers" count={papers.length} sub="scheduled across the datesheet" />
        <KPICard
          icon="calendar"
          label="Days until start"
          value={daysUntil == null ? '—' : daysUntil === 0 ? 'Started' : daysUntil}
          sub={exam.startDate ? formatDate(exam.startDate) : 'Start date not set'}
        />
        <KPICard
          icon="award"
          label="Results entered"
          count={resultsEnteredPct}
          suffix="%"
          sub={`${results.length} student result${results.length === 1 ? '' : 's'} saved`}
        />
      </div>

      {/* Readiness checklist */}
      <Panel
        title="Readiness checklist"
        sub={`${readyCount}/${checklist.length} ready`}
        headerRight={
          <Badge variant={readyCount === checklist.length ? 'success' : readyCount >= checklist.length - 1 ? 'warning' : 'muted'}>
            {readyCount === checklist.length ? 'Exam ready' : 'In preparation'}
          </Badge>
        }
      >
        <ul className="nx-checklist" aria-label="Exam readiness checklist">
          {checklist.map((item) => (
            <li key={item.label} className={`nx-checklist__row${item.ok ? ' is-ok' : ''}`}>
              <span className={`nx-checklist__mark${item.ok ? ' is-ok' : ''}`} aria-hidden="true">
                <Icon name={item.ok ? 'check-circle' : 'alert-triangle'} size={18} />
              </span>
              <span className="nx-checklist__body">
                <span className="nx-checklist__label">{item.label}</span>
                <span className="nx-checklist__detail">{item.detail}</span>
              </span>
              <span className="nx-checklist__status">
                <Badge variant={item.ok ? 'success' : 'warning'}>{item.ok ? 'Ready' : 'Pending'}</Badge>
              </span>
            </li>
          ))}
        </ul>
        {!coverage.complete && coverage.missing.length > 0 && (
          <div className="nx-plan__hint">
            <Icon name="info" size={14} />
            <span>
              Missing papers:{' '}
              {coverage.missing.map((m, i) => (
                <span key={m.gradeName}>
                  {i > 0 ? '; ' : ''}
                  <strong>{m.gradeName}</strong> — {m.subjects.slice(0, 4).join(', ')}{m.subjects.length > 4 ? `, +${m.subjects.length - 4}` : ''}
                </span>
              ))}
            </span>
          </div>
        )}
      </Panel>

      {/* Chronological timeline */}
      <Panel title="Exam schedule" sub={sorted.length ? `${sorted.length} paper${sorted.length === 1 ? '' : 's'}` : undefined}>
        {sorted.length === 0 ? (
          <EmptyState icon="calendar" title="No papers scheduled" message="Build the datesheet to see the chronological exam schedule here." />
        ) : (
          <ol className="nx-timeline" aria-label="Exam paper timeline">
            {sorted.map((p) => <TimelineRow key={p.id} paper={p} />)}
          </ol>
        )}
      </Panel>
    </div>
  );
}

function TimelineRow({ paper }: { paper: ExamPaper }) {
  const endTime = endTimeLabel(paper.startTime, paper.durationMins);
  return (
    <li className="nx-timeline__row">
      <div className="nx-timeline__rail" aria-hidden="true">
        <span className="nx-timeline__dot" />
      </div>
      <div className="nx-timeline__date">
        {paper.date ? (
          <>
            <span className="nx-timeline__dnum">{formatDate(paper.date, 'D')}</span>
            <span className="nx-timeline__mon">{formatDate(paper.date, 'MMM')}</span>
          </>
        ) : (
          <span className="nx-timeline__mon">TBA</span>
        )}
      </div>
      <div className="nx-timeline__main">
        <div className="nx-timeline__subject">
          {paper.subjectName ?? 'Untitled'}
          {paper.gradeName ? <span className="nx-timeline__grade"> · {paper.gradeName}</span> : ''}
        </div>
        <div className="nx-timeline__meta">
          {paper.date && <span className="nx-timeline__chip">{formatDate(paper.date, 'ddd, DD MMM')}</span>}
          {paper.startTime && (
            <span className="nx-timeline__chip"><Icon name="clock" size={12} />{paper.startTime}{endTime ? `–${endTime}` : ''}</span>
          )}
          {paper.roomName && <span className="nx-timeline__chip"><Icon name="building" size={12} />{paper.roomName}</span>}
          {paper.maxMarks != null && <span className="nx-timeline__chip"><Icon name="award" size={12} />Max {paper.maxMarks}</span>}
        </div>
      </div>
    </li>
  );
}
