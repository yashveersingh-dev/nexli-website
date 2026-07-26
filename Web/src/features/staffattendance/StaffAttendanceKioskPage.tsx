import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStaff } from '@/features/school/data';
import type { StaffProfile } from '@/types/hr';
import { useStaffAttendanceForDate, recordStaffCheckIn, todayKey } from './data';
import { STAFF_STATUS_META, formatTime } from './meta';
import type { CheckDirection } from './types';

/**
 * Workflow 2 — Device kiosk. A self-check-in surface (large tap targets) that
 * runs under the reception/owner session: the operator is logged in; staff
 * self-identify by name / employee ID, then tap a big Check In / Check Out.
 * Calls `recordStaffCheckIn(method: 'device')`.
 */
export function StaffAttendanceKioskPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate, ownerLabel } = useOwnership('staff_attendance');
  const today = todayKey();
  const { data: staff, loading } = useStaff(schoolId);
  const { data: records } = useStaffAttendanceForDate(schoolId, today);

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ name: string; direction: CheckDirection } | null>(null);

  const activeStaff = useMemo(
    () => staff.filter((s) => s.status !== 'resigned' && s.status !== 'retired'),
    [staff],
  );

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 1) return [];
    return activeStaff
      .filter((s) => s.name.toLowerCase().includes(term) || (s.employeeId ?? '').toLowerCase().includes(term))
      .slice(0, 8);
  }, [activeStaff, q]);

  const recent = useMemo(
    () => records.filter((r) => r.checkInAt || r.checkOutAt).sort((a, b) => (b.lastModifiedAt ?? 0) - (a.lastModifiedAt ?? 0)).slice(0, 8),
    [records],
  );

  const todayRecord = useMemo(
    () => (selected ? records.find((r) => r.staffId === selected.id) ?? null : null),
    [selected, records],
  );

  if (!canOperate) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="shield"
            title="Kiosk is an operate surface"
            message={`The device kiosk is run by ${ownerLabel}. You can review attendance from the hub.`}
            action={<Button variant="subtle" onClick={() => navigate('/staff-attendance')}>Back to hub</Button>}
          />
        </Panel>
      </div>
    );
  }

  const punch = async (direction: CheckDirection) => {
    if (!schoolId || !selected) return;
    setBusy(true);
    try {
      await recordStaffCheckIn(schoolId, {
        staffId: selected.id,
        staffName: selected.name,
        method: 'device',
        direction,
        by: { uid: uid ?? 'unknown', name: member?.name },
      });
      setFlash({ name: selected.name, direction });
      setSelected(null);
      setQ('');
      window.setTimeout(() => setFlash(null), 2600);
    } catch {
      toast.error('Could not record', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Check-in kiosk</h1>
          <p className="nx-page__sub">Staff: find yourself and tap Check In or Check Out.</p>
        </div>
        <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/staff-attendance')}>Exit</Button>
      </div>

      <div className="nx-kiosk">
        {flash ? (
          <Panel>
            <div className="nx-kiosk-confirm" role="status" aria-live="polite">
              <div className={`nx-kiosk-confirm__icon${flash.direction === 'out' ? ' is-out' : ''}`}>
                <Icon name={flash.direction === 'in' ? 'check' : 'arrow-right'} size={34} />
              </div>
              <div className="nx-kiosk-confirm__title">
                {flash.direction === 'in' ? 'Checked in' : 'Checked out'}
              </div>
              <div className="nx-kiosk-confirm__sub">{flash.name} · {formatTime(Date.now())}</div>
              <div style={{ marginTop: 16 }}>
                <Button variant="subtle" onClick={() => setFlash(null)}>Next person</Button>
              </div>
            </div>
          </Panel>
        ) : selected ? (
          <Panel>
            <div className="nx-kiosk-found">
              <Avatar name={selected.name} src={selected.photoUrl} size={48} />
              <div className="nx-kiosk-found__main">
                <div className="nx-kiosk-found__name">{selected.name}</div>
                <div className="nx-kiosk-found__meta">
                  {selected.designation || selected.employeeId || '—'}
                  {todayRecord?.checkInAt ? ` · in ${formatTime(todayRecord.checkInAt)}` : ''}
                  {todayRecord?.checkOutAt ? ` · out ${formatTime(todayRecord.checkOutAt)}` : ''}
                </div>
              </div>
              {todayRecord && (
                <span className={`nx-sa-pill nx-sa-pill--${STAFF_STATUS_META[todayRecord.status].key}`}>
                  {STAFF_STATUS_META[todayRecord.status].label}
                </span>
              )}
            </div>
            <div className="nx-kiosk-actions">
              <button type="button" className="nx-kiosk-big nx-kiosk-big--in" onClick={() => punch('in')} disabled={busy}>
                <span className="nx-kiosk-big__icon"><Icon name="check-circle" size={30} /></span>
                Check In
              </button>
              <button type="button" className="nx-kiosk-big nx-kiosk-big--out" onClick={() => punch('out')} disabled={busy}>
                <span className="nx-kiosk-big__icon"><Icon name="arrow-right" size={30} /></span>
                Check Out
              </button>
            </div>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Button variant="ghost" leftIcon="x" onClick={() => setSelected(null)}>Not you? Search again</Button>
            </div>
          </Panel>
        ) : (
          <Panel>
            <Input
              leftIcon="search"
              size="lg"
              placeholder="Type your name or employee ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Find yourself by name or employee ID"
              autoFocus
            />
            {loading ? (
              <div style={{ marginTop: 12 }}><Skeleton height={160} /></div>
            ) : q.trim() && matches.length === 0 ? (
              <div style={{ marginTop: 8 }}>
                <EmptyState icon="user" title="No staff found" message="Check the spelling, or ask reception for help." />
              </div>
            ) : (
              <div className="nx-kiosk-results">
                {matches.map((s) => (
                  <button key={s.id} type="button" className="nx-kiosk-pick" onClick={() => setSelected(s)}>
                    <Avatar name={s.name} src={s.photoUrl} size={36} />
                    <span className="nx-kiosk-pick__main">
                      <span className="nx-kiosk-pick__name">{s.name}</span>
                      <span className="nx-kiosk-pick__meta">{s.designation || s.employeeId || '—'}</span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                  </button>
                ))}
              </div>
            )}
          </Panel>
        )}

        <Panel title="Recent check-ins" sub="today" bodyClassName="nx-sa-feed">
          {recent.length === 0 ? (
            <EmptyState icon="clock" title="No check-ins yet" message="Recent kiosk check-ins will appear here." />
          ) : (
            recent.map((r) => (
              <div className="nx-sa-feed__row" key={r.id}>
                <Avatar name={r.staffName} size={28} />
                <div className="nx-sa-feed__main">
                  <div className="nx-sa-feed__name">{r.staffName}</div>
                  <div className="nx-sa-feed__time">
                    {r.checkOutAt ? `Out ${formatTime(r.checkOutAt)}` : `In ${formatTime(r.checkInAt)}`}
                  </div>
                </div>
                <span className={`nx-sa-pill nx-sa-pill--${STAFF_STATUS_META[r.status].key}`}>
                  {STAFF_STATUS_META[r.status].label}
                </span>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
