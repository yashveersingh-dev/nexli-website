import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Donut, DonutLegend } from '@/components/charts';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades } from '@/features/school/data';
import { useAllAttendance } from '@/features/daily/data';
import { ATTENDANCE_MIN_PERCENT } from '@/features/daily/meta';
import type { AttendanceDay } from '@/types/daily';
import { AiInsightsPanel } from './AiInsightsPanel';

/**
 * Attendance window analysed here. The screen has no term/date picker, so we use
 * a rolling ~term-length (one quarter) window: long enough for a fair attendance
 * %, distribution and at-risk read, while bounding the Firestore read instead of
 * scanning all history.
 */
const ATT_WINDOW_DAYS = 90;

function pctFor(days: AttendanceDay[], studentId: string) {
  let present = 0, total = 0;
  for (const d of days) {
    const st = d.entries?.[studentId];
    if (!st || st === 'holiday') continue;
    total++;
    if (st === 'present' || st === 'late' || st === 'half_day') present += st === 'half_day' ? 0.5 : 1;
  }
  return { pct: total ? Math.round((present / total) * 100) : null, total };
}

export function AcademicAnalyticsTab() {
  const { schoolId } = useSession();
  const { data: students, loading: sLoading, error: sError } = useStudents(schoolId);
  const { data: attendance, loading: aLoading, error: aError } = useAllAttendance(schoolId, { sinceDays: ATT_WINDOW_DAYS });
  const { data: grades } = useGrades(schoolId);

  const active = useMemo(() => students.filter((s) => s.status === 'active'), [students]);

  const analysis = useMemo(() => {
    const rows = active.map((s) => ({ s, ...pctFor(attendance, s.id) }));
    const tracked = rows.filter((r) => r.pct != null);
    const avg = tracked.length ? Math.round(tracked.reduce((a, r) => a + (r.pct ?? 0), 0) / tracked.length) : null;
    const buckets = { high: 0, mid: 0, low: 0 };
    for (const r of tracked) {
      if (r.pct! >= 90) buckets.high++;
      else if (r.pct! >= ATTENDANCE_MIN_PERCENT) buckets.mid++;
      else buckets.low++;
    }
    const atRisk = tracked.filter((r) => r.pct! < ATTENDANCE_MIN_PERCENT).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).slice(0, 12);
    // grade-wise average
    const byGrade = new Map<string, { sum: number; n: number; name: string }>();
    for (const r of tracked) {
      const key = r.s.gradeId ?? 'na';
      const g = byGrade.get(key) ?? { sum: 0, n: 0, name: r.s.gradeName ?? '—' };
      g.sum += r.pct!; g.n++; byGrade.set(key, g);
    }
    const gradeRows = [...byGrade.values()].map((g) => ({ name: g.name, pct: Math.round(g.sum / g.n) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { avg, buckets, atRisk, tracked: tracked.length, gradeRows };
  }, [active, attendance]);

  if (sLoading || aLoading) return <Skeleton height={320} />;

  if (sError || aError) {
    return <Panel><EmptyState icon="alert-triangle" title="Could not load analytics data" message="We could not reach the student or attendance records. Please try again." /></Panel>;
  }

  if (active.length === 0) {
    return <Panel><EmptyState icon="users" title="No students yet" message="Academic analytics will appear once students and attendance are recorded." /></Panel>;
  }
  void grades;

  return (
    <div className="an-tab">
      <div className="kpi-grid">
        <KPICard icon="users" label="Active students" count={active.length} format="us" sub={analysis.tracked ? `${analysis.tracked} with attendance data` : 'attendance not recorded yet'} />
        <KPICard icon="clock" label="Avg attendance" count={analysis.avg ?? 0} format="percent" suffix="%" subColor={analysis.avg != null && analysis.avg < ATTENDANCE_MIN_PERCENT ? 'var(--warning)' : 'var(--gold)'} sub={analysis.avg == null ? 'no data yet' : undefined} />
        <KPICard icon="alert-triangle" label="At-risk (<75%)" count={analysis.buckets.low} format="us" subColor={analysis.buckets.low ? 'var(--danger)' : 'var(--success)'} />
        <KPICard icon="check-circle" label="Above 90%" count={analysis.buckets.high} format="us" />
      </div>

      <div className="an-grid">
        <Panel title="Attendance distribution">
          {analysis.tracked === 0 ? (
            <EmptyState icon="clock" title="No attendance recorded yet" />
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Donut size={150} stroke={20}
                segments={[
                  { value: analysis.buckets.high, color: 'var(--success)', label: '≥90%' },
                  { value: analysis.buckets.mid, color: 'var(--warning)', label: '75–90%' },
                  { value: analysis.buckets.low, color: 'var(--danger)', label: '<75%' },
                ]}
                centerValue={`${analysis.tracked}`} centerLabel="students" />
              <DonutLegend items={[
                { label: '≥ 90%', value: analysis.buckets.high, color: 'var(--success)' },
                { label: '75–90%', value: analysis.buckets.mid, color: 'var(--warning)' },
                { label: 'Below 75%', value: analysis.buckets.low, color: 'var(--danger)' },
              ]} />
            </div>
          )}
        </Panel>

        <Panel title="Average attendance by grade">
          {analysis.gradeRows.length === 0 ? (
            <EmptyState icon="bar-chart" title="No data yet" />
          ) : (
            <div className="an-dist">
              {analysis.gradeRows.map((g) => (
                <div className="an-dist__row" key={g.name}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                  <span className="an-dist__bar"><span className="an-dist__fill" style={{ width: `${g.pct}%`, background: g.pct < ATTENDANCE_MIN_PERCENT ? 'var(--danger)' : g.pct < 90 ? 'var(--warning)' : 'var(--success)' }} /></span>
                  <span className="an-dist__val">{g.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="At-risk students" sub={analysis.atRisk.length ? `${analysis.atRisk.length}` : undefined}>
        {analysis.atRisk.length === 0 ? (
          <EmptyState icon="check-circle" title="No at-risk students" message="Every tracked student is at or above the 75% attendance threshold." />
        ) : (
          <div className="fin-kv-list" style={{ gap: 8 }}>
            {analysis.atRisk.map((r) => (
              <Link key={r.s.id} to={`/students/${r.s.id}`} className="an-risk">
                <span className="an-risk__score" style={{ color: 'var(--danger)' }}>{r.pct}%</span>
                <Avatar name={r.s.fullName} src={r.s.photoUrl} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.s.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[r.s.gradeName, r.s.sectionName].filter(Boolean).join(' · ')} · {r.total} days</div>
                </div>
                <Badge variant="danger">Below {ATTENDANCE_MIN_PERCENT}%</Badge>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <AiInsightsPanel insights={[
        { icon: 'trending-down', title: 'Dropout risk forecast', body: 'Predicts students likely to fall below 60% attendance next term from their trend.' },
        { icon: 'sparkles', title: 'Intervention suggestions', body: 'Recommends counselor referrals and parent outreach for at-risk students.' },
        { icon: 'bar-chart', title: 'Cohort comparison', body: 'Benchmarks each grade against the school and prior-year cohorts.' },
      ]} />
    </div>
  );
}
