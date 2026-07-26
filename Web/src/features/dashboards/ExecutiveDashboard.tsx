import { useMemo } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Donut, DonutLegend } from '@/components/charts';
import { formatINRCompact } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useStaff, useSections, useGrades } from '@/features/school/data';
import { useAllAttendance, useCirculars } from '@/features/daily/data';
import { useInvoices, usePayments } from '@/features/finance/data';
import { ROLES } from '@/types/roles';
import './dashboards.css';

/**
 * Dedicated executive (chairman / trustee / director) analytics dashboard.
 *
 * Read-only by design: NO quick actions, NO create/edit/manage controls, NO
 * teacher operational content — purely an institutional command view. Reuses the
 * same attendance / fee aggregation patterns as `StaffDashboard` so the numbers
 * match across the app. Rendered via `StaffDashboard`'s `isExecutive` delegation.
 */

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Attendance threshold below which a student is flagged a concern (red). */
const AT_RISK_PCT = 75;
const HEALTHY_PCT = 90;

/**
 * Attendance window this dashboard reads. Headlines are today-only and the
 * health/at-risk breakdown is a recent-trend signal, so a rolling ~6-week window
 * is accurate for what's shown and far cheaper than reading all history.
 */
const ATT_WINDOW_DAYS = 45;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function ExecutiveDashboard() {
  const { schoolId, role, member, school } = useSession();
  const { data: students } = useStudents(schoolId);
  const { data: staff } = useStaff(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: attendance } = useAllAttendance(schoolId, { sinceDays: ATT_WINDOW_DAYS });
  const { data: circulars } = useCirculars(schoolId);
  // Executive roles always have the institutional financial view.
  const { data: invoices } = useInvoices(schoolId);
  const { data: payments } = usePayments(schoolId);

  const name = member?.name?.split(' ')[0] ?? 'there';
  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active').length, [students]);

  /* ---- Attendance: today's headline ---- */
  const todayAtt = useMemo(() => {
    const today = todayStr();
    let present = 0, total = 0;
    for (const d of attendance) {
      if (d.date !== today) continue;
      total += d.total ?? Object.keys(d.entries ?? {}).length;
      present += d.presentCount ?? Object.values(d.entries ?? {}).filter((s) => s === 'present' || s === 'late').length;
    }
    return { present, total, pct: total ? Math.round((present / total) * 100) : null };
  }, [attendance]);

  /* ---- Per-student attendance distribution → at-risk count ---- */
  const attInsights = useMemo(() => {
    const seen = new Map<string, { present: number; total: number }>();
    for (const d of attendance) {
      for (const [sid, status] of Object.entries(d.entries ?? {})) {
        if (status === 'holiday') continue;
        const cur = seen.get(sid) ?? { present: 0, total: 0 };
        cur.total += 1;
        if (status === 'present' || status === 'late') cur.present += 1;
        seen.set(sid, cur);
      }
    }
    let healthy = 0, watch = 0, atRisk = 0;
    for (const { present, total } of seen.values()) {
      if (!total) continue;
      const pct = (present / total) * 100;
      if (pct >= HEALTHY_PCT) healthy += 1;
      else if (pct >= AT_RISK_PCT) watch += 1;
      else atRisk += 1;
    }
    return { healthy, watch, atRisk, tracked: seen.size };
  }, [attendance]);

  /* ---- Enrolment by grade (active students), ordered by grade.order ---- */
  const enrolByGrade = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of students) {
      if (s.status !== 'active') continue;
      const key = s.gradeName ?? s.gradeId ?? '—';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const ordered = grades.length
      ? grades.map((g) => ({ label: g.name, value: counts.get(g.name) ?? counts.get(g.id) ?? 0 }))
      : [...counts.entries()].map(([label, value]) => ({ label, value }));
    return ordered.filter((g) => g.value > 0);
  }, [students, grades]);

  const totalEnrolled = useMemo(() => enrolByGrade.reduce((s, g) => s + g.value, 0), [enrolByGrade]);

  /* ---- Attendance % by grade (today) for the ranked bar list ---- */
  const attByGrade = useMemo(() => {
    const today = todayStr();
    const byGrade = new Map<string, { present: number; total: number }>();
    const sectionGrade = new Map(sections.map((s) => [s.id, s.gradeId] as const));
    const gradeName = new Map(grades.map((g) => [g.id, g.name] as const));
    for (const d of attendance) {
      if (d.date !== today) continue;
      const gid = d.gradeName ?? gradeName.get(sectionGrade.get(d.sectionId) ?? '') ?? 'Other';
      const cur = byGrade.get(gid) ?? { present: 0, total: 0 };
      cur.total += d.total ?? Object.keys(d.entries ?? {}).length;
      cur.present += d.presentCount ?? Object.values(d.entries ?? {}).filter((s) => s === 'present' || s === 'late').length;
      byGrade.set(gid, cur);
    }
    return [...byGrade.entries()]
      .filter(([, v]) => v.total > 0)
      .map(([label, v]) => ({ label, pct: Math.round((v.present / v.total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [attendance, sections, grades]);

  /* ---- Fees: this-month collection, outstanding dues, MoM trend, defaulters ---- */
  const feeStats = useMemo(() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    let collectedThisMonth = 0, collectedPrevMonth = 0, collectedTotal = 0;
    for (const p of payments) {
      if (p.status === 'bounced' || p.status === 'refunded') continue;
      const amt = p.amount ?? 0;
      collectedTotal += amt;
      if (p.paidAt >= mStart) collectedThisMonth += amt;
      else if (p.paidAt >= prevStart) collectedPrevMonth += amt;
    }
    let outstanding = 0, billed = 0, defaulters = 0;
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      // Recompute from net − paid (canonical) rather than trusting a possibly
      // stale stored `dueAmount` — keeps this view consistent with StaffDashboard.
      const due = Math.max(0, (inv.netAmount ?? 0) - (inv.paidAmount ?? 0));
      outstanding += due;
      billed += inv.netAmount ?? 0;
      if (due > 0) defaulters += 1;
    }
    const collectedOfBilled = billed > 0 ? Math.max(0, billed - outstanding) : collectedTotal;
    const collectionPct = billed > 0 ? Math.round((collectedOfBilled / billed) * 100) : null;
    const trend = collectedPrevMonth > 0
      ? Math.round(((collectedThisMonth - collectedPrevMonth) / collectedPrevMonth) * 100)
      : null;
    return { collectedThisMonth, collectedPrevMonth, outstanding, collectedOfBilled, billed, collectionPct, trend, defaulters };
  }, [invoices, payments]);

  const priorityNotices = useMemo(() => circulars.filter((c) => c.pinned || c.emergency).length, [circulars]);

  const attTone = todayAtt.pct == null
    ? 'var(--gold)'
    : todayAtt.pct < AT_RISK_PCT ? 'var(--danger)' : todayAtt.pct < HEALTHY_PCT ? 'var(--gold)' : 'var(--success)';

  const feeTrendDelta = feeStats.trend != null
    ? { value: `${Math.abs(feeStats.trend)}% vs last month`, dir: feeStats.trend >= 0 ? ('up' as const) : ('down' as const) }
    : undefined;

  const roleLabel = role ? ROLES[role]?.label : '';

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{greeting()}, {name}</h1>
          <p className="nx-page__sub">{roleLabel}{school?.name ? ` · ${school.name}` : ''}</p>
        </div>
      </div>

      {role === 'chairman' && (
        <ChairmanView
          activeStudents={activeStudents}
          staffCount={staff.length}
          sectionsCount={sections.length}
          todayAtt={todayAtt}
          attTone={attTone}
          attInsights={attInsights}
          attByGrade={attByGrade}
          enrolByGrade={enrolByGrade}
          totalEnrolled={totalEnrolled}
          feeStats={feeStats}
          feeTrendDelta={feeTrendDelta}
          priorityNotices={priorityNotices}
        />
      )}

      {role === 'trustee' && (
        <TrusteeView
          activeStudents={activeStudents}
          staffCount={staff.length}
          todayAtt={todayAtt}
          attInsights={attInsights}
          attByGrade={attByGrade}
          enrolByGrade={enrolByGrade}
          totalEnrolled={totalEnrolled}
          feeStats={feeStats}
        />
      )}

      {role === 'director' && (
        <DirectorView
          activeStudents={activeStudents}
          staffCount={staff.length}
          todayAtt={todayAtt}
          attTone={attTone}
          attInsights={attInsights}
          attByGrade={attByGrade}
          enrolByGrade={enrolByGrade}
          totalEnrolled={totalEnrolled}
          feeStats={feeStats}
          feeTrendDelta={feeTrendDelta}
          priorityNotices={priorityNotices}
        />
      )}
    </div>
  );
}

/* =============================================================================
 * Shared computed shapes (kept local; mirror StaffDashboard's memoized results).
 * ===========================================================================*/

interface TodayAtt { present: number; total: number; pct: number | null }
interface AttInsights { healthy: number; watch: number; atRisk: number; tracked: number }
interface FeeStats {
  collectedThisMonth: number; collectedPrevMonth: number; outstanding: number;
  collectedOfBilled: number; billed: number; collectionPct: number | null;
  trend: number | null; defaulters: number;
}
type Delta = { value: string; dir: 'up' | 'down' };
type GradeRow = { label: string; value: number };
type AttGradeRow = { label: string; pct: number };

/* =============================================================================
 * CHAIRMAN
 * ===========================================================================*/

function ChairmanView(props: {
  activeStudents: number; staffCount: number; sectionsCount: number;
  todayAtt: TodayAtt; attTone: string; attInsights: AttInsights; attByGrade: AttGradeRow[];
  enrolByGrade: GradeRow[]; totalEnrolled: number;
  feeStats: FeeStats; feeTrendDelta?: Delta; priorityNotices: number;
}) {
  const { activeStudents, staffCount, sectionsCount, todayAtt, attTone, attInsights, attByGrade, enrolByGrade, totalEnrolled, feeStats, feeTrendDelta, priorityNotices } = props;
  return (
    <>
      {/* ---- KPI band ---- */}
      <div className="kpi-grid">
        <KPICard icon="users" label="Active students" count={activeStudents} format="us" />
        <KPICard icon="briefcase" label="Staff" count={staffCount} format="us" />
        <KPICard
          icon="clock" label="Attendance today" count={todayAtt.pct ?? 0} format="percent" suffix="%"
          sub={todayAtt.total ? `${todayAtt.present}/${todayAtt.total} present` : 'Not marked yet'} subColor={attTone}
        />
        <KPICard
          icon="wallet" label="Outstanding fees" value={formatINRCompact(feeStats.outstanding)}
          sub={feeStats.outstanding > 0 ? 'Pending collection' : 'All clear'}
          subColor={feeStats.outstanding > 0 ? 'var(--danger)' : 'var(--success)'}
        />
      </div>

      {/* ---- Financial health ---- */}
      <div className="grid g-2">
        <Panel title="Financial health" sub="collected vs outstanding">
          <FeeCollectionDonut feeStats={feeStats} />
        </Panel>
        <Panel title="Monthly collection" sub="this month vs last">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KPICard
              icon="credit-card" label="Fees this month" value={formatINRCompact(feeStats.collectedThisMonth)}
              sub="Collected" subColor="var(--gold)" delta={feeTrendDelta}
            />
            <KPICard
              icon="trending-up" label="Last month" value={formatINRCompact(feeStats.collectedPrevMonth)}
              sub="Collected" subColor="var(--text-muted)"
            />
          </div>
        </Panel>
      </div>

      {/* ---- Admissions & growth ---- */}
      <Panel title="Admissions & growth" sub={`active students by grade · ${totalEnrolled} enrolled`}>
        {enrolByGrade.length === 0 ? (
          <EmptyState icon="bar-chart" title="No enrolment data" message="Active students grouped by grade will chart here." />
        ) : (
          <EnrolmentByGradeChart rows={enrolByGrade} />
        )}
      </Panel>

      {/* ---- Academic performance ---- */}
      <div className="grid g-2">
        <Panel title="Attendance health" sub={`last ${ATT_WINDOW_DAYS} days`}>
          <AttendanceHealthDonut attInsights={attInsights} />
        </Panel>
        <Panel title="Attendance by grade" sub="today, ranked">
          <AttByGradeList rows={attByGrade} />
        </Panel>
      </div>

      {/* ---- HR overview ---- */}
      <Panel title="HR overview" sub="staffing">
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <KPICard icon="briefcase" label="Staff headcount" count={staffCount} format="us" sub="On record" />
          {/* Staff attendance is not separately tracked in the attendance store
              (entries are student rosters only), so we surface headcount only. */}
          <KPICard icon="shield-check" label="Staff attendance" value="—" sub="Not tracked separately" subColor="var(--text-muted)" />
        </div>
      </Panel>

      {/* ---- Institutional KPIs ---- */}
      <div className="kpi-grid">
        <KPICard
          icon="alert-triangle" label="At-risk students" count={attInsights.atRisk} format="us"
          sub={attInsights.tracked ? `<${AT_RISK_PCT}% attendance` : 'No attendance data'}
          subColor={attInsights.atRisk > 0 ? 'var(--danger)' : 'var(--success)'}
        />
        <KPICard icon="megaphone" label="Priority notices" count={priorityNotices} format="us" sub="Pinned / urgent" subColor={priorityNotices > 0 ? 'var(--info)' : undefined} />
        <KPICard icon="building" label="Sections" count={sectionsCount} format="us" sub="Across all grades" />
      </div>
    </>
  );
}

/* =============================================================================
 * TRUSTEE
 * ===========================================================================*/

function TrusteeView(props: {
  activeStudents: number; staffCount: number;
  todayAtt: TodayAtt; attInsights: AttInsights; attByGrade: AttGradeRow[];
  enrolByGrade: GradeRow[]; totalEnrolled: number; feeStats: FeeStats;
}) {
  const { activeStudents, staffCount, attInsights, attByGrade, enrolByGrade, totalEnrolled, feeStats } = props;
  return (
    <>
      {/* ---- KPI band ---- */}
      <div className="kpi-grid">
        <KPICard icon="users" label="Active students" count={activeStudents} format="us" />
        <KPICard icon="briefcase" label="Staff" count={staffCount} format="us" />
        <KPICard
          icon="credit-card" label="Fee collection" count={feeStats.collectionPct ?? 0} format="percent" suffix="%"
          sub={feeStats.collectionPct != null ? 'Of billed' : 'No invoices yet'}
          subColor={feeStats.collectionPct != null ? 'var(--gold)' : 'var(--text-muted)'}
        />
        <KPICard
          icon="wallet" label="Outstanding dues" value={formatINRCompact(feeStats.outstanding)}
          sub={feeStats.outstanding > 0 ? 'Pending collection' : 'All clear'}
          subColor={feeStats.outstanding > 0 ? 'var(--danger)' : 'var(--success)'}
        />
      </div>

      {/* ---- Financial health ---- */}
      <div className="grid g-2">
        <Panel title="Financial health" sub="collected vs outstanding">
          <FeeCollectionDonut feeStats={feeStats} />
        </Panel>
        <Panel title="Defaulters" sub="invoices with dues">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KPICard
              icon="alert-triangle" label="Defaulting invoices" count={feeStats.defaulters} format="us"
              sub={feeStats.defaulters > 0 ? 'Outstanding balance' : 'All settled'}
              subColor={feeStats.defaulters > 0 ? 'var(--danger)' : 'var(--success)'}
            />
            <KPICard icon="wallet" label="Total outstanding" value={formatINRCompact(feeStats.outstanding)} sub="Across invoices" subColor="var(--text-muted)" />
          </div>
        </Panel>
      </div>

      {/* ---- Admissions & growth ---- */}
      <div className="grid g-2">
        <Panel title="Enrolment by grade" sub="active students">
          {enrolByGrade.length === 0 ? (
            <EmptyState icon="bar-chart" title="No enrolment data" message="Active students grouped by grade will chart here." />
          ) : (
            <EnrolmentByGradeChart rows={enrolByGrade} />
          )}
        </Panel>
        <Panel title="Total enrolment" sub="admissions pipeline">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KPICard icon="users" label="Total enrolled" count={totalEnrolled} format="us" sub="Active across grades" subColor="var(--gold)" />
            <KPICard icon="user-plus" label="Pipeline" value="—" sub="Admissions tracked separately" subColor="var(--text-muted)" />
          </div>
        </Panel>
      </div>

      {/* ---- Academic quality ---- */}
      <Panel title="Academic quality" sub="attendance health">
        <AttendanceHealthDonut attInsights={attInsights} />
        <p className="nx-page__sub" style={{ marginTop: 12 }}>
          Attendance data available. Pass/fail and exam results are reported separately in the academics module.
        </p>
      </Panel>

      {/* ---- Operations summary ---- */}
      <div className="grid g-2">
        <Panel title="Attendance by grade" sub="today, ranked">
          <AttByGradeList rows={attByGrade} />
        </Panel>
        <Panel title="Operations" sub="staffing & risk">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KPICard icon="briefcase" label="Staff" count={staffCount} format="us" sub="On record" />
            <KPICard
              icon="alert-triangle" label="At-risk students" count={attInsights.atRisk} format="us"
              sub={attInsights.tracked ? `<${AT_RISK_PCT}% attendance` : 'No attendance data'}
              subColor={attInsights.atRisk > 0 ? 'var(--danger)' : 'var(--success)'}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* =============================================================================
 * DIRECTOR
 * ===========================================================================*/

function DirectorView(props: {
  activeStudents: number; staffCount: number;
  todayAtt: TodayAtt; attTone: string; attInsights: AttInsights; attByGrade: AttGradeRow[];
  enrolByGrade: GradeRow[]; totalEnrolled: number;
  feeStats: FeeStats; feeTrendDelta?: Delta; priorityNotices: number;
}) {
  const { activeStudents, staffCount, todayAtt, attTone, attInsights, attByGrade, enrolByGrade, totalEnrolled, feeStats, feeTrendDelta, priorityNotices } = props;
  return (
    <>
      {/* ---- KPI band ---- */}
      <div className="kpi-grid">
        <KPICard icon="users" label="Active students" count={activeStudents} format="us" />
        <KPICard icon="briefcase" label="Staff" count={staffCount} format="us" />
        <KPICard
          icon="credit-card" label="Fees this month" value={formatINRCompact(feeStats.collectedThisMonth)}
          sub="Collected" subColor="var(--gold)" delta={feeTrendDelta}
        />
        <KPICard
          icon="wallet" label="Outstanding dues" value={formatINRCompact(feeStats.outstanding)}
          sub={feeStats.outstanding > 0 ? 'Pending collection' : 'All clear'}
          subColor={feeStats.outstanding > 0 ? 'var(--danger)' : 'var(--success)'}
        />
      </div>

      {/* ---- Financial P&L overview ---- */}
      <div className="grid g-2">
        <Panel title="Fee P&L" sub="collected vs outstanding">
          <FeeCollectionDonut feeStats={feeStats} />
        </Panel>
        <Panel title="Monthly trend" sub="this month vs last">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KPICard icon="credit-card" label="This month" value={formatINRCompact(feeStats.collectedThisMonth)} sub="Collected" subColor="var(--gold)" delta={feeTrendDelta} />
            <KPICard icon="trending-up" label="Last month" value={formatINRCompact(feeStats.collectedPrevMonth)} sub="Collected" subColor="var(--text-muted)" />
          </div>
        </Panel>
      </div>

      {/* ---- Enrolment ---- */}
      <Panel title="Enrolment" sub={`active students by grade · ${totalEnrolled} total strength`}>
        {enrolByGrade.length === 0 ? (
          <EmptyState icon="bar-chart" title="No enrolment data" message="Active students grouped by grade will chart here." />
        ) : (
          <EnrolmentByGradeChart rows={enrolByGrade} />
        )}
      </Panel>

      {/* ---- Operations overview ---- */}
      <div className="grid g-2">
        <Panel title="Today's attendance" sub="student presence">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KPICard
              icon="clock" label="Attendance today" count={todayAtt.pct ?? 0} format="percent" suffix="%"
              sub={todayAtt.total ? `${todayAtt.present}/${todayAtt.total} present` : 'Not marked yet'} subColor={attTone}
            />
            <KPICard icon="briefcase" label="Staff" count={staffCount} format="us" sub="On record" />
          </div>
        </Panel>
        <Panel title="Attendance by grade" sub="today, ranked">
          <AttByGradeList rows={attByGrade} />
        </Panel>
      </div>

      {/* ---- Academic overview ---- */}
      <Panel title="Academic overview" sub="attendance health">
        <AttendanceHealthDonut attInsights={attInsights} />
      </Panel>

      {/* ---- Compliance notes ---- */}
      <div className="kpi-grid">
        <KPICard icon="megaphone" label="Active notices" count={priorityNotices} format="us" sub="Pinned / urgent" subColor={priorityNotices > 0 ? 'var(--info)' : undefined} />
        <KPICard
          icon="alert-triangle" label="At-risk students" count={attInsights.atRisk} format="us"
          sub={attInsights.tracked ? `<${AT_RISK_PCT}% attendance` : 'No attendance data'}
          subColor={attInsights.atRisk > 0 ? 'var(--danger)' : 'var(--success)'}
        />
      </div>
    </>
  );
}

/* =============================================================================
 * Shared presentational helpers
 * ===========================================================================*/

/**
 * Horizontal enrolment-by-grade chart. One row per grade — readable even with
 * 15+ grades, where vertical bars would overlap. Gold fill for grades at/above
 * the mean, muted below; count shown to the right.
 */
function EnrolmentByGradeChart({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const avg = total / (rows.length || 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r) => {
        const pct = Math.round((r.value / max) * 100);
        const aboveAvg = r.value >= avg;
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 56, textAlign: 'right', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
            <div style={{ flex: 1, height: 10, background: 'var(--surface)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: aboveAvg ? 'var(--gold)' : 'var(--text-muted)', borderRadius: 5, transition: 'width 0.4s var(--ease)' }} />
            </div>
            <span style={{ width: 32, textAlign: 'left', color: 'var(--text)', fontWeight: 600, flexShrink: 0 }}>{r.value}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>Total</span>
        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{total}</span>
      </div>
    </div>
  );
}

function FeeCollectionDonut({ feeStats }: { feeStats: FeeStats }) {
  if (feeStats.billed === 0 && feeStats.collectedOfBilled === 0) {
    return <EmptyState icon="credit-card" title="No fee activity yet" message="Raise invoices and record payments to see collection progress." />;
  }
  return (
    <div className="donut-wrap">
      <Donut
        segments={[
          { value: feeStats.collectedOfBilled, color: 'var(--success)' },
          { value: feeStats.outstanding, color: 'var(--danger)' },
        ].filter((s) => s.value > 0)}
        centerValue={feeStats.collectionPct != null ? `${feeStats.collectionPct}%` : '—'}
        centerLabel="collected"
      />
      <DonutLegend
        items={[
          { label: 'Collected', value: formatINRCompact(feeStats.collectedOfBilled), color: 'var(--success)' },
          { label: 'Outstanding', value: formatINRCompact(feeStats.outstanding), color: 'var(--danger)' },
        ]}
      />
    </div>
  );
}

function AttendanceHealthDonut({ attInsights }: { attInsights: AttInsights }) {
  if (attInsights.tracked === 0) {
    return <EmptyState icon="clock" title="No attendance recorded yet" message="Once classes start marking attendance, the health breakdown appears here." />;
  }
  return (
    <div className="donut-wrap">
      <Donut
        segments={[
          { value: attInsights.healthy, color: 'var(--success)' },
          { value: attInsights.watch, color: 'var(--gold)' },
          { value: attInsights.atRisk, color: 'var(--danger)' },
        ].filter((s) => s.value > 0)}
        centerValue={String(attInsights.tracked)}
        centerLabel="students"
      />
      <DonutLegend
        items={[
          { label: `Healthy (≥${HEALTHY_PCT}%)`, value: String(attInsights.healthy), color: 'var(--success)' },
          { label: `Watch (${AT_RISK_PCT}–${HEALTHY_PCT}%)`, value: String(attInsights.watch), color: 'var(--gold)' },
          { label: `At-risk (<${AT_RISK_PCT}%)`, value: String(attInsights.atRisk), color: 'var(--danger)' },
        ]}
      />
    </div>
  );
}

function AttByGradeList({ rows }: { rows: AttGradeRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon="clock" title="Not marked yet" message="Attendance marked today will rank by grade here." />;
  }
  return (
    <div className="nx-attgrade">
      {rows.map((r) => {
        const tone = r.pct < AT_RISK_PCT ? 'var(--danger)' : r.pct < HEALTHY_PCT ? 'var(--gold)' : 'var(--success)';
        return (
          <div className="nx-attgrade__row" key={r.label}>
            <span className="nx-attgrade__label">{r.label}</span>
            <span className="nx-att-pct__bar">
              <span className="nx-att-pct__fill" style={{ width: `${r.pct}%`, background: tone }} />
            </span>
            <span className="nx-att-pct__val" style={{ color: tone }}>{r.pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
