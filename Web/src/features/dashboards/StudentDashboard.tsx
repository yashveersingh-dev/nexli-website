import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Panel, PanelAction } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudent } from '@/features/school/data';
import { useTimetable } from '@/features/school/data';
import { useHomework, useSectionAttendance, useCirculars } from '@/features/daily/data';
import { ATTENDANCE_MIN_PERCENT, CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import { DEFAULT_PERIODS, type Weekday } from '@/types/academics';
import type { AttendanceDay } from '@/types/daily';
import './dashboards.css';

const JS_TO_WD: Record<number, Weekday> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function periodLabel(no: number) { const p = DEFAULT_PERIODS.find((x) => x.no === no); return p ? `${p.startTime}` : `P${no}`; }

function attendancePct(days: AttendanceDay[], studentId: string) {
  let present = 0, total = 0;
  for (const d of days) { const st = d.entries?.[studentId]; if (!st || st === 'holiday') continue; total++; if (st === 'present' || st === 'late' || st === 'half_day') present += st === 'half_day' ? 0.5 : 1; }
  return { pct: total ? Math.round((present / total) * 100) : 0, total };
}

export function StudentDashboard() {
  const { schoolId, member } = useSession();
  const { data: me } = useStudent(schoolId, member?.studentId);
  const sectionId = me?.sectionId;
  const { data: timetable } = useTimetable(schoolId, sectionId);
  const { data: homework } = useHomework(schoolId, sectionId);
  // Use section-scoped query so a student-role account never needs list access
  // to the full attendance_days collection (which tightened rules deny non-staff).
  const { data: attendance } = useSectionAttendance(schoolId, sectionId);
  const { data: circulars } = useCirculars(schoolId);

  const wd = JS_TO_WD[new Date().getDay()];
  const todayClasses = useMemo(
    () => timetable.filter((t) => t.day === wd).sort((a, b) => a.periodNo - b.periodNo),
    [timetable, wd],
  );
  const upcomingHw = useMemo(
    () => homework.filter((h) => (h.dueDate ?? 0) >= Date.now() - 86400000).sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0)).slice(0, 5),
    [homework],
  );
  const att = me ? attendancePct(attendance, me.id) : { pct: 0, total: 0 };
  const notices = circulars.filter((c) => ['whole_school', 'students', 'grade', 'section'].includes(c.audience)).slice(0, 4);
  const name = (me?.firstName || member?.name?.split(' ')[0]) ?? 'there';
  const attColor = att.pct >= 85 ? 'var(--success)' : att.pct >= ATTENDANCE_MIN_PERCENT ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{greeting()}, {name}</h1>
          <p className="nx-page__sub">{me ? [me.gradeName, me.sectionName].filter(Boolean).join(' · ') : ''}</p>
        </div>
      </div>

      {!me ? (
        <Panel><EmptyState icon="user" title="Account not linked to a student" message="Your school will link your account. Your timetable and homework will appear here." /></Panel>
      ) : (
        <>
          <div className="grid g-2">
            <Panel title="Today's classes" sub={wd ? undefined : 'Holiday'}>
              {!wd || todayClasses.length === 0 ? (
                <EmptyState icon="calendar" title={wd ? 'No classes scheduled' : 'Enjoy your day off'} />
              ) : (
                <div className="nx-timeline">
                  {todayClasses.map((t) => (
                    <div className="nx-timeline__item" key={t.id}>
                      <span className="nx-timeline__dot" />
                      <div>
                        <div className="nx-timeline__title">{t.subjectName ?? 'Period ' + t.periodNo}{t.roomName ? ` · ${t.roomName}` : ''}</div>
                        <div className="nx-timeline__time">{periodLabel(t.periodNo)}{t.teacherName ? ` · ${t.teacherName}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="My attendance" headerRight={att.pct < ATTENDANCE_MIN_PERCENT && att.total > 0 ? <span style={{ fontSize: 11, color: 'var(--danger)' }}>Below {ATTENDANCE_MIN_PERCENT}%</span> : undefined}>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                {att.total ? (
                  <>
                    <div style={{ fontSize: 40, fontWeight: 700, color: attColor }}>{att.pct}%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>across {att.total} recorded days</div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '14px 0' }}>No attendance recorded yet</div>
                )}
              </div>
              <Link to="/attendance" className="nx-chip-link" style={{ width: 'fit-content', margin: '0 auto' }}><Icon name="clock" size={13} /> View details</Link>
            </Panel>
          </div>

          <div className="grid g-2">
            <Panel title="Homework due" headerRight={<PanelAction><Link to="/assignments" style={{ color: 'inherit' }}>All</Link></PanelAction>}>
              {upcomingHw.length === 0 ? <EmptyState icon="file-text" title="All caught up" message="No homework due." /> : upcomingHw.map((h) => (
                <div className="nx-kv" key={h.id}>
                  <span className="nx-kv__k">{h.title}{h.subjectName ? ` · ${h.subjectName}` : ''}</span>
                  <span className="nx-kv__v">{h.dueDate ? formatRelative(h.dueDate) : '—'}</span>
                </div>
              ))}
            </Panel>

            <Panel title="Notices" headerRight={<PanelAction><Link to="/communication" style={{ color: 'inherit' }}>All</Link></PanelAction>}>
              {notices.length === 0 ? <EmptyState icon="megaphone" title="No notices" /> : notices.map((c) => {
                const m = CIRCULAR_CATEGORY_META[c.category] ?? CIRCULAR_CATEGORY_META.general;
                return (
                  <Link key={c.id} to={`/communication/${c.id}`} className="nx-noticerow">
                    <span className="nx-noticerow__icon is-normal"><Icon name={m.icon} size={15} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="nx-noticerow__title">{c.title}</div>
                      <div className="nx-noticerow__time">{c.publishedAt ? formatRelative(c.publishedAt) : ''}</div>
                    </div>
                  </Link>
                );
              })}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
