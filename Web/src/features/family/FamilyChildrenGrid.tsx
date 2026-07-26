import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { ATTENDANCE_MIN_PERCENT } from '@/features/daily/meta';
import type { AttendanceDay } from '@/types/daily';

type ChildLike = {
  id: string;
  fullName: string;
  gradeName?: string;
  sectionName?: string;
  photoUrl?: string;
};

/** A child's attendance % across all recorded (non-holiday) days. */
export function attendancePct(days: AttendanceDay[], studentId: string): { pct: number; total: number } {
  let present = 0,
    total = 0;
  for (const d of days) {
    const st = d.entries?.[studentId];
    if (!st || st === 'holiday') continue;
    total++;
    if (st === 'present' || st === 'late' || st === 'half_day') present += st === 'half_day' ? 0.5 : 1;
  }
  return { pct: total ? Math.round((present / total) * 100) : 0, total };
}

/**
 * Per-child overview cards (attendance + quick links). Shared by the parent
 * dashboard and the "My Children" page so both render the same family overview.
 */
export function FamilyChildrenGrid({ students, days }: { students: ChildLike[]; days: AttendanceDay[] }) {
  if (students.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon="users"
          title="No children linked yet"
          message="Your school will link your children to your account. Once done, their overview appears here."
        />
      </Panel>
    );
  }
  return (
    <div className="grid g-2">
      {students.map((c) => {
        const a = attendancePct(days, c.id);
        const color = a.pct >= 85 ? 'var(--success)' : a.pct >= ATTENDANCE_MIN_PERCENT ? 'var(--warning)' : 'var(--danger)';
        return (
          <Panel
            key={c.id}
            title={c.fullName}
            sub={[c.gradeName, c.sectionName].filter(Boolean).join(' · ')}
            headerRight={<Avatar name={c.fullName} src={c.photoUrl} size={36} />}
          >
            {a.total === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Attendance</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Not recorded yet</span>
              </div>
            ) : (
              <div className="nx-att-pct" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Attendance</span>
                <div className="nx-att-pct__bar">
                  <div className="nx-att-pct__fill" style={{ width: `${a.pct}%`, background: color }} />
                </div>
                <span className="nx-att-pct__val" style={{ color }}>{a.pct}%</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/attendance" className="nx-chip-link"><Icon name="clock" size={13} /> Attendance</Link>
              <Link to="/assignments" className="nx-chip-link"><Icon name="file-text" size={13} /> Homework</Link>
              <Link to="/fees" className="nx-chip-link"><Icon name="credit-card" size={13} /> Fees</Link>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
