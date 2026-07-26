import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { touchSchoolUsage } from '@/lib/usage';
import { KPICard } from '@/components/KPICard';
import { Panel, PanelAction } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { Donut, DonutLegend } from '@/components/charts';
import { formatINRCompact, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { useStudents, useStaff, useSections, useGrades } from '@/features/school/data';
import { useAllAttendance, useCirculars } from '@/features/daily/data';
import { useInvoices, usePayments } from '@/features/finance/data';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import { ROLES, type RoleId } from '@/types/roles';
import './dashboards.css';

const TEACHING_ROLES: RoleId[] = ['class_teacher', 'subject_teacher', 'substitute_teacher', 'hod', 'special_educator', 'sports_teacher', 'arts_teacher'];
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Attendance window this dashboard reads. The headline KPIs are today-only and
 * the health/at-risk breakdown is a recent-trend signal, so a rolling ~6-week
 * window is both accurate for what's shown and far cheaper than all-history.
 */
const ATT_WINDOW_DAYS = 45;

/** Attendance threshold below which a student / day is flagged a concern (red). */
const AT_RISK_PCT = 75;
const HEALTHY_PCT = 90;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function StaffDashboard() {
  const { schoolId, role, uid, member, school, can } = useSession();

  // Executive roles get a dedicated read-only analytics dashboard (no quick
  // actions / operational controls). Delegate before any other rendering.
  const isExecutive = role === 'chairman' || role === 'trustee' || role === 'director';
  if (isExecutive) return <ExecutiveDashboard />;

  const { data: students } = useStudents(schoolId);
  const { data: staff } = useStaff(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: attendance } = useAllAttendance(schoolId, { sinceDays: ATT_WINDOW_DAYS });
  const { data: circulars } = useCirculars(schoolId);

  // Fee data is only read for leadership/finance roles (gated below before render).
  const canSeeFees = can('fees.read');
  const { data: invoices } = useInvoices(canSeeFees ? schoolId : undefined);
  const { data: payments } = usePayments(canSeeFees ? schoolId : undefined);

  const isTeacher = !!role && TEACHING_ROLES.includes(role);
  // Leadership command center: principals, VPs, directors, coordinators-with-reports,
  // chief accountant — anyone with the broad analytical (`reports.read`) view.
  const isLeadership = can('reports.read');
  const name = member?.name?.split(' ')[0] ?? 'there';

  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active').length, [students]);

  /* ---- Attendance: today's headline + at-risk students + per-grade rollup ---- */
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

  // Per-student attendance % across all recorded days → at-risk count + distribution.
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
    return { healthy, watch, atRisk, tracked: seen.size, perStudent: seen };
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

  /* ---- Fees: this-month collection, outstanding dues, MoM trend ---- */
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
    let outstanding = 0, billed = 0;
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      // Recompute from net − paid (canonical) rather than trusting a stored
      // `dueAmount`, which can be missing/stale on seed/legacy invoices and made
      // this dashboard read ₹0 while other screens showed the real outstanding.
      outstanding += Math.max(0, (inv.netAmount ?? 0) - (inv.paidAmount ?? 0));
      billed += inv.netAmount ?? 0;
    }
    const collectedOfBilled = billed > 0 ? Math.max(0, billed - outstanding) : collectedTotal;
    const trend = collectedPrevMonth > 0
      ? Math.round(((collectedThisMonth - collectedPrevMonth) / collectedPrevMonth) * 100)
      : null;
    return { collectedThisMonth, outstanding, collectedOfBilled, billed, trend };
  }, [invoices, payments]);

  const pendingItems = circulars.filter((c) => c.pinned || c.emergency).length;

  // Keep the platform's denormalized usage counts fresh from real data already
  // loaded here (writes only when they actually changed; telemetry-only fields).
  useEffect(() => {
    if (!schoolId) return;
    const patch: { studentCount?: number; staffCount?: number } = {};
    if (students.length > 0 && activeStudents !== (school?.studentCount ?? -1)) patch.studentCount = activeStudents;
    if (staff.length > 0 && staff.length !== (school?.staffCount ?? -1)) patch.staffCount = staff.length;
    if (patch.studentCount != null || patch.staffCount != null) void touchSchoolUsage(schoolId, patch);
  }, [schoolId, students.length, activeStudents, staff.length, school?.studentCount, school?.staffCount]);

  const myClasses = useMemo(() => sections.filter((s) => s.classTeacherUid === uid), [sections, uid]);
  const pinned = circulars.filter((c) => c.pinned).slice(0, 2);
  const recentCirculars = circulars.slice(0, 5);

  /* ---- Attendance-today semantic tone ---- */
  const attTone = todayAtt.pct == null
    ? 'var(--gold)'
    : todayAtt.pct < AT_RISK_PCT ? 'var(--danger)' : todayAtt.pct < HEALTHY_PCT ? 'var(--gold)' : 'var(--success)';

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{greeting()}, {name}</h1>
          <p className="nx-page__sub">{role ? ROLES[role]?.label : ''}{school?.name ? ` · ${school.name}` : ''}</p>
        </div>
      </div>

      {/* ===================== KPI BAND ===================== */}
      <div className="kpi-grid">
        {can('students.read') && (
          <KPICard icon="users" label="Active students" count={activeStudents} format="us" />
        )}
        {can('hr.read') && (
          <KPICard icon="briefcase" label="Staff" count={staff.length} format="us" />
        )}
        <KPICard
          icon="clock"
          label="Attendance today"
          count={todayAtt.pct ?? 0}
          format="percent"
          suffix="%"
          sub={todayAtt.total ? `${todayAtt.present}/${todayAtt.total} present` : 'Not marked yet'}
          subColor={attTone}
        />
        {isLeadership && (
          <KPICard
            icon="alert-triangle"
            label="At-risk students"
            count={attInsights.atRisk}
            format="us"
            sub={attInsights.tracked ? `<${AT_RISK_PCT}% attendance` : 'No attendance data'}
            subColor={attInsights.atRisk > 0 ? 'var(--danger)' : 'var(--success)'}
          />
        )}
        {canSeeFees && (
          <KPICard
            icon="credit-card"
            label="Fees this month"
            value={formatINRCompact(feeStats.collectedThisMonth)}
            sub="Collected"
            subColor="var(--gold)"
            delta={feeStats.trend != null ? { value: `${Math.abs(feeStats.trend)}% vs last month`, dir: feeStats.trend >= 0 ? 'up' : 'down' } : undefined}
          />
        )}
        {canSeeFees && (
          <KPICard
            icon="wallet"
            label="Outstanding dues"
            value={formatINRCompact(feeStats.outstanding)}
            sub={feeStats.outstanding > 0 ? 'Pending collection' : 'All clear'}
            subColor={feeStats.outstanding > 0 ? 'var(--danger)' : 'var(--success)'}
          />
        )}
        {isLeadership ? (
          <KPICard
            icon="megaphone"
            label="Priority notices"
            count={pendingItems}
            format="us"
            sub={`${circulars.length} total circulars`}
            subColor={pendingItems > 0 ? 'var(--info)' : undefined}
          />
        ) : (
          <KPICard icon="megaphone" label="Circulars" count={circulars.length} format="us" />
        )}
      </div>

      {/* ===================== LEADERSHIP COMMAND CENTER ===================== */}
      {isLeadership && (
        <>
          <div className="grid g-2">
            {/* Attendance distribution donut */}
            <Panel
              title="Attendance health"
              sub={`last ${ATT_WINDOW_DAYS} days`}
              headerRight={<PanelAction onClick={() => undefined}><Link to="/attendance" style={{ color: 'inherit' }}>Open</Link></PanelAction>}
            >
              {attInsights.tracked === 0 ? (
                <EmptyState icon="clock" title="No attendance recorded yet" message="Once classes start marking attendance, the health breakdown appears here." />
              ) : (
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
              )}
            </Panel>

            {/* Fee collection donut — gated on fees.read */}
            {canSeeFees ? (
              <Panel
                title="Fee collection"
                sub="collected vs outstanding"
                headerRight={<PanelAction onClick={() => undefined}><Link to="/fees" style={{ color: 'inherit' }}>Open</Link></PanelAction>}
              >
                {feeStats.billed === 0 && feeStats.collectedOfBilled === 0 ? (
                  <EmptyState icon="credit-card" title="No fee activity yet" message="Raise invoices and record payments to see collection progress." />
                ) : (
                  <div className="donut-wrap">
                    <Donut
                      segments={[
                        { value: feeStats.collectedOfBilled, color: 'var(--success)' },
                        { value: feeStats.outstanding, color: 'var(--danger)' },
                      ].filter((s) => s.value > 0)}
                      centerValue={feeStats.billed > 0 ? `${Math.round((feeStats.collectedOfBilled / feeStats.billed) * 100)}%` : '—'}
                      centerLabel="collected"
                    />
                    <DonutLegend
                      items={[
                        { label: 'Collected', value: formatINRCompact(feeStats.collectedOfBilled), color: 'var(--success)' },
                        { label: 'Outstanding', value: formatINRCompact(feeStats.outstanding), color: 'var(--danger)' },
                      ]}
                    />
                  </div>
                )}
              </Panel>
            ) : (
              <Panel title="Today at a glance" sub="attendance by grade">
                <AttByGradeList rows={attByGrade} />
              </Panel>
            )}
          </div>

          <div className="grid g-2">
            {/* Enrolment by grade — horizontal bars (readable with many grades) */}
            <Panel title="Enrolment by grade" sub="active students">
              {enrolByGrade.length === 0 ? (
                <EmptyState icon="bar-chart" title="No enrolment data" message="Active students grouped by grade will chart here." />
              ) : (
                <EnrolmentByGradeChart rows={enrolByGrade} />
              )}
            </Panel>

            {/* Attendance by grade ranked list (when fee donut took the slot above) */}
            {canSeeFees ? (
              <Panel title="Attendance by grade" sub="today, ranked">
                <AttByGradeList rows={attByGrade} />
              </Panel>
            ) : (
              <Panel title="Priority notices" headerRight={<PanelAction onClick={() => undefined}><Link to="/communication" style={{ color: 'inherit' }}>View all</Link></PanelAction>}>
                <NoticeList items={[...pinned, ...recentCirculars.filter((c) => !c.pinned)].slice(0, 5)} />
              </Panel>
            )}
          </div>
        </>
      )}

      {/* ===================== TEACHER BRANCH (preserved) ===================== */}
      {isTeacher && (
        <Panel title="My classes" headerRight={<PanelAction>Mark attendance</PanelAction>}>
          {myClasses.length === 0 ? (
            <EmptyState icon="book" title="No assigned classes" message="You haven't been set as a class teacher for any section yet." />
          ) : (
            <div className="nx-modgrid">
              {myClasses.map((s) => (
                <Link key={s.id} to="/attendance" className="nx-modcard">
                  <span className="nx-modcard__icon"><Icon name="users" size={18} /></span>
                  <span className="nx-modcard__label">{s.name}</span>
                  <Icon name="chevron-right" size={15} className="nx-modcard__chev" />
                </Link>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ===================== QUICK ACTIONS + NOTICES (preserved) ===================== */}
      <div className="grid g-2">
        <Panel title="Quick actions">
          <div className="nx-modgrid">
            <QuickAction to="/attendance" icon="clock" label="Mark attendance" show={can('attendance.write') || can('attendance.write.section') || can('attendance.write.period')} />
            <QuickAction to="/communication/new" icon="megaphone" label="New circular" show={can('announcements.send')} />
            <QuickAction to="/students/new" icon="user-plus" label="New admission" show={can('students.write')} />
            <QuickAction to="/gradebook/new" icon="edit" label="New assessment" show={can('gradebook.write') || can('gradebook.write.subject')} />
            <QuickAction to="/homework" icon="clipboard" label="Homework" show={can('homework.write')} />
            <QuickAction to="/fees" icon="credit-card" label="Fees" show={can('fees.read')} />
          </div>
        </Panel>

        <Panel title="Notices" headerRight={<PanelAction onClick={() => undefined}><Link to="/communication" style={{ color: 'inherit' }}>View all</Link></PanelAction>}>
          {recentCirculars.length === 0 ? (
            <EmptyState icon="megaphone" title="No circulars yet" message="School circulars will appear here." />
          ) : (
            <NoticeList items={[...pinned, ...recentCirculars.filter((c) => !c.pinned)].slice(0, 5)} />
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

/**
 * Horizontal enrolment-by-grade chart. One row per grade — readable even with
 * 15+ grades, where vertical bars overlap. Gold fill for grades at/above the
 * mean, muted below; count shown to the right and a running total at the bottom.
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

function AttByGradeList({ rows }: { rows: { label: string; pct: number }[] }) {
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

function NoticeList({ items }: { items: { id: string; title: string; category: string; pinned?: boolean; emergency?: boolean; publishedAt?: number }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((c) => {
        const m = CIRCULAR_CATEGORY_META[c.category as keyof typeof CIRCULAR_CATEGORY_META] ?? CIRCULAR_CATEGORY_META.general;
        return (
          <Link key={c.id} to={`/communication/${c.id}`} className="nx-noticerow">
            <span className={`nx-noticerow__icon is-${c.emergency ? 'emergency' : 'normal'}`}><Icon name={m.icon} size={15} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="nx-noticerow__title">{c.pinned && <Icon name="award" size={11} />} {c.title}</div>
              <div className="nx-noticerow__time">{c.publishedAt ? formatRelative(c.publishedAt) : ''}</div>
            </div>
            {c.emergency && <Badge variant="danger">Urgent</Badge>}
          </Link>
        );
      })}
    </div>
  );
}

function QuickAction({ to, icon, label, show }: { to: string; icon: IconName; label: string; show: boolean }) {
  if (!show) return null;
  return (
    <Link to={to} className="nx-modcard">
      <span className="nx-modcard__icon"><Icon name={icon} size={18} /></span>
      <span className="nx-modcard__label">{label}</span>
      <Icon name="chevron-right" size={15} className="nx-modcard__chev" />
    </Link>
  );
}
