import { useMemo } from 'react';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { useAttendanceBySections } from '@/features/daily/data';
import { ATTENDANCE_MIN_PERCENT, ATTENDANCE_STATUS_META } from '@/features/daily/meta';
import type { AttendanceDay, AttendanceStatus } from '@/types/daily';
import './attendance.css';

export function MyAttendancePage() {
  const { schoolId, role, member } = useSession();

  const childIds = useMemo<string[]>(() => {
    if (role === 'student') return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [role, member]);

  // Own-record scoping: fetch ONLY the family's own child record(s) by id — never
  // the whole students collection (the tightened rules forbid non-staff reading all).
  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);
  // Scope attendance to the children's own sections so the query works under
  // tightened rules that deny non-staff full collection list access.
  const childSectionIds = useMemo(
    () => [...new Set(children.map((c) => c.sectionId).filter((id): id is string => !!id))],
    [children],
  );
  const { data: days, loading: aLoading } = useAttendanceBySections(schoolId, childSectionIds);

  if (sLoading || aLoading) return <div className="nx-page"><Skeleton height={48} /><Panel><Skeleton height={200} /></Panel></div>;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Attendance</h1>
          <p className="nx-page__sub">{role === 'student' ? 'Your attendance record.' : "Your children's attendance."}</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Panel><EmptyState icon="clock" title="No attendance to show" message="Attendance will appear here once your school links your account and marks attendance." /></Panel>
      ) : (
        children.map((child) => <ChildAttendance key={child.id} studentId={child.id} name={child.fullName} days={days} />)
      )}
    </div>
  );
}

function ChildAttendance({ studentId, name, days }: { studentId: string; name: string; days: AttendanceDay[] }) {
  const mine = useMemo(
    () => days.filter((d) => d.entries?.[studentId] != null).sort((a, b) => b.date.localeCompare(a.date)),
    [days, studentId],
  );
  const stats = useMemo(() => {
    let present = 0, total = 0;
    for (const d of mine) {
      const st = d.entries[studentId];
      if (st === 'holiday') continue;
      total++;
      if (st === 'present' || st === 'late' || st === 'half_day') present += st === 'half_day' ? 0.5 : 1;
    }
    return { present, total, pct: total ? Math.round((present / total) * 100) : 0 };
  }, [mine, studentId]);

  const recent = mine.slice(0, 21);
  const color = stats.pct >= 85 ? 'var(--success)' : stats.pct >= ATTENDANCE_MIN_PERCENT ? 'var(--warning)' : 'var(--danger)';

  return (
    <Panel title={name} headerRight={stats.pct < ATTENDANCE_MIN_PERCENT && stats.total > 0 ? <Badge variant="danger">Below {ATTENDANCE_MIN_PERCENT}%</Badge> : undefined}>
      <div className="nx-att-pct" style={{ marginBottom: 16 }}>
        <div className="nx-att-pct__bar"><div className="nx-att-pct__fill" style={{ width: `${stats.pct}%`, background: color }} /></div>
        <span className="nx-att-pct__val" style={{ color }}>{stats.total ? `${stats.pct}%` : '—'}</span>
      </div>
      {recent.length === 0 ? (
        <EmptyState icon="clock" title="No records yet" />
      ) : (
        <>
          <div className="nx-att-cal">
            {recent.map((d) => {
              const st = d.entries[studentId] as AttendanceStatus;
              const cls = st === 'present' ? 'is-present' : st === 'absent' ? 'is-absent' : st === 'late' ? 'is-late' : st === 'half_day' ? 'is-half_day' : st === 'leave' ? 'is-leave' : '';
              return <div key={d.id} className={`nx-att-cal__cell ${cls}`} title={`${d.date}: ${ATTENDANCE_STATUS_META[st]?.label ?? st}`}>{d.date.slice(8)}</div>;
            })}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>Last {recent.length} recorded days · {stats.present % 1 === 0 ? stats.present : stats.present.toFixed(1)} attended of {stats.total} marked</p>
        </>
      )}
    </Panel>
  );
}
