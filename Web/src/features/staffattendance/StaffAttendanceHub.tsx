import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { KPICard } from '@/components/KPICard';
import { Icon, type IconName } from '@/components/Icon';
import { Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStaff } from '@/features/school/data';
import { useStaffAttendanceForDate, todayKey } from './data';
import { STAFF_STATUS_META, METHOD_LABEL, formatTime } from './meta';
import type { StaffAttendanceRecord } from './types';

const MODES: { to: string; icon: IconName; title: string; desc: string }[] = [
  { to: 'manual', icon: 'calendar', title: 'Manual marking', desc: 'HR/reception roster — mark a full day for any date.' },
  { to: 'kiosk', icon: 'shield-check', title: 'Device kiosk', desc: 'On-site self check-in. Staff tap in / out at the desk.' },
  { to: 'otp', icon: 'phone', title: 'Mobile OTP', desc: 'Staff verify by phone OTP and check in from their mobile.' },
];

/** Staff Attendance hub — today's overview, the staff roster, and the 3 modes. */
export function StaffAttendanceHub() {
  const navigate = useNavigate();
  const { schoolId, isSuperAdmin, can } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('staff_attendance');
  const canConfigure = isSuperAdmin || can('schedule.configure');
  const today = todayKey();
  const { data: staff, loading: staffLoading } = useStaff(schoolId);
  const { data: records, loading: recLoading } = useStaffAttendanceForDate(schoolId, today);
  const [q, setQ] = useState('');

  const activeStaff = useMemo(
    () => staff.filter((s) => s.status !== 'resigned' && s.status !== 'retired'),
    [staff],
  );

  const byStaff = useMemo(() => {
    const m = new Map<string, StaffAttendanceRecord>();
    for (const r of records) m.set(r.staffId, r);
    return m;
  }, [records]);

  const kpis = useMemo(() => {
    let present = 0, late = 0, absent = 0, marked = 0;
    const methods = { manual: 0, device: 0, otp: 0, biometric: 0 };
    for (const s of activeStaff) {
      const r = byStaff.get(s.id);
      if (!r) continue;
      marked++;
      methods[r.method] = (methods[r.method] ?? 0) + 1;
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
    }
    return { present, late, absent, notMarked: activeStaff.length - marked, methods };
  }, [activeStaff, byStaff]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const sorted = [...activeStaff].sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter(
      (s) => s.name.toLowerCase().includes(term) || (s.employeeId ?? '').toLowerCase().includes(term),
    );
  }, [activeStaff, q]);

  const loading = staffLoading || recLoading;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Staff Attendance</h1>
          <p className="nx-page__sub">Today's attendance across manual, kiosk and mobile check-in.</p>
        </div>
        <div className="nx-page__head-actions">
          {canConfigure && (
            <Button variant="ghost" leftIcon="settings" onClick={() => navigate('settings')}>Schedule settings</Button>
          )}
          {canOperate && (
            <Button variant="gold" leftIcon="calendar" onClick={() => navigate('manual')}>Mark attendance</Button>
          )}
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard icon="check-circle" label="Present" count={kpis.present} sub={`${kpis.late} late`} />
        <KPICard icon="clock" label="Late" count={kpis.late} />
        <KPICard icon="x" label="Absent" count={kpis.absent} />
        <KPICard icon="user" label="Not marked" count={kpis.notMarked} sub={`${activeStaff.length} staff`} />
      </div>

      {/* Mode launchers (operate surfaces) */}
      {canOperate && (
        <Panel title="Check-in modes" sub="how staff are marked today">
          <div className="nx-sa-modes">
            {MODES.map((m) => (
              <button key={m.to} type="button" className="nx-sa-mode" onClick={() => navigate(m.to)}>
                <span className="nx-sa-mode__icon"><Icon name={m.icon} size={20} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="nx-sa-mode__title">{m.title}</span>
                  <span className="nx-sa-mode__desc">{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            By method today — Manual {kpis.methods.manual} · Kiosk {kpis.methods.device} · Mobile OTP {kpis.methods.otp}
            {kpis.methods.biometric > 0 ? ` · Biometric ${kpis.methods.biometric}` : ''}
          </p>
        </Panel>
      )}

      {/* Staff roster with today's status */}
      <Panel
        title="Staff today"
        headerRight={
          <div style={{ width: 'min(260px, 50vw)' }}>
            <Input
              leftIcon="search"
              size="sm"
              placeholder="Search name or ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search staff"
            />
          </div>
        }
        bodyClassName="nx-sa-list"
      >
        {loading ? (
          <Skeleton height={280} />
        ) : activeStaff.length === 0 ? (
          <EmptyState icon="users" title="No staff yet" message="Add staff in the HR module to track attendance." />
        ) : filtered.length === 0 ? (
          <EmptyState icon="search" title="No matches" message="No staff match that search." />
        ) : (
          filtered.map((s) => {
            const r = byStaff.get(s.id);
            const meta = r ? STAFF_STATUS_META[r.status] : null;
            return (
              <div className="nx-sa-row" key={s.id}>
                <Avatar name={s.name} src={s.photoUrl} size={34} />
                <div className="nx-sa-row__main">
                  <div className="nx-sa-row__name">{s.name}</div>
                  <div className="nx-sa-row__meta">
                    {s.designation || s.employeeId || '—'}
                    {r?.checkInAt ? ` · in ${formatTime(r.checkInAt)}` : ''}
                    {r?.checkOutAt ? ` · out ${formatTime(r.checkOutAt)}` : ''}
                  </div>
                </div>
                <div className="nx-sa-row__right">
                  {r && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{METHOD_LABEL[r.method]}</span>}
                  <span className={`nx-sa-pill nx-sa-pill--${meta?.key ?? 'none'}`}>
                    {meta ? meta.label : 'Not marked'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}
