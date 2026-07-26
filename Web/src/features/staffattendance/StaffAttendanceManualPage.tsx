import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Field, DatePicker, Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/cn';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useStaff } from '@/features/school/data';
import { useStaffAttendanceForDate, setStaffDayStatus, todayKey } from './data';
import { MANUAL_STATUSES, STAFF_STATUS_META } from './meta';
import type { StaffAttendanceStatus } from './types';

/** Workflow 1 — Manual marking (HR / Reception). Mirrors MarkAttendancePage. */
export function StaffAttendanceManualPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { schoolId, uid, member } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('staff_attendance');
  const canWrite = canOperate;

  const today = todayKey();
  const [date, setDate] = useState(today);
  const [q, setQ] = useState('');
  const { data: staff, loading } = useStaff(schoolId);
  const { data: existing } = useStaffAttendanceForDate(schoolId, date);

  const [entries, setEntries] = useState<Record<string, StaffAttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const roster = useMemo(
    () =>
      staff
        .filter((s) => s.status !== 'resigned' && s.status !== 'retired')
        .sort((a, b) => (a.employeeId || a.name).localeCompare(b.employeeId || b.name)),
    [staff],
  );

  // Seed entries from existing day docs (else default present) whenever date/data changes.
  useEffect(() => {
    const seed: Record<string, StaffAttendanceStatus> = {};
    const existingById = new Map(existing.map((r) => [r.staffId, r.status] as const));
    for (const s of roster) seed[s.id] = existingById.get(s.id) ?? 'present';
    setEntries(seed);
  }, [date, roster.length, existing]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0, on_duty: 0 };
    for (const st of Object.values(entries)) {
      if (st in c) c[st as keyof typeof c]++;
    }
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter(
      (s) => s.name.toLowerCase().includes(term) || (s.employeeId ?? '').toLowerCase().includes(term),
    );
  }, [roster, q]);

  const setAll = (status: StaffAttendanceStatus) => {
    const next: Record<string, StaffAttendanceStatus> = {};
    for (const s of roster) next[s.id] = status;
    setEntries(next);
  };

  const save = async () => {
    if (!schoolId) return;
    setSaving(true);
    const actor = { uid: uid ?? 'unknown', name: member?.name };
    // Skip no-op writes. Each row is seeded from the existing record's status, so
    // an untouched row has next === prev and is skipped — this stops a manual save
    // from clobbering a kiosk/OTP-derived status (e.g. flipping a 'late' punch back
    // to 'present') for staff the operator never touched. Fresh marks (no existing
    // record) still persist.
    const existingById = new Map(existing.map((r) => [r.staffId, r.status] as const));
    const changed = roster.filter((s) => (entries[s.id] ?? 'present') !== existingById.get(s.id));
    try {
      await Promise.all(
        changed.map((s) =>
          setStaffDayStatus(schoolId, { staffId: s.id, staffName: s.name, date, status: entries[s.id] ?? 'present' }, actor),
        ),
      );
      toast.success(
        changed.length ? 'Attendance saved' : 'No changes to save',
        changed.length ? `${changed.length} updated · ${counts.present}/${roster.length} present` : undefined,
      );
    } catch {
      toast.error('Could not save', 'It will sync when you are back online.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div className="nx-sa-manual__heading">
          <button
            type="button"
            className="nx-formpage__back"
            onClick={() => navigate('/staff-attendance')}
            aria-label="Back to Staff Attendance"
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <div>
            <h1 className="nx-page__title">Manual marking</h1>
            <p className="nx-page__sub">Mark staff attendance for a date. Works offline — changes sync automatically.</p>
          </div>
        </div>
      </div>

      {isReviewer && !canWrite && <ReviewModeNote owner={ownerLabel} />}

      <Panel>
        <div className="nx-section__grid">
          <Field label="Date"><DatePicker value={date} onChange={(e) => setDate(e.target.value)} max={today} /></Field>
          <Field label="Search staff">
            <Input leftIcon="search" placeholder="Name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search staff" />
          </Field>
        </div>
      </Panel>

      {loading ? (
        <Panel><Skeleton height={320} /></Panel>
      ) : roster.length === 0 ? (
        <Panel><EmptyState icon="users" title="No staff to mark" message="Add staff in the HR module first." /></Panel>
      ) : (
        <>
          <div className="nx-att-summary">
            <div className="nx-att-summary__stats">
              <span className="nx-att-chip nx-att-chip--present">{counts.present} Present</span>
              <span className="nx-att-chip nx-att-chip--absent">{counts.absent} Absent</span>
              {counts.late > 0 && <span className="nx-att-chip nx-att-chip--late">{counts.late} Late</span>}
              {(counts.leave > 0 || counts.on_duty > 0) && (
                <span className="nx-att-chip nx-att-chip--leave">{counts.leave + counts.on_duty} Leave / Duty</span>
              )}
            </div>
            {canWrite && <Button variant="subtle" size="sm" leftIcon="check-circle" onClick={() => setAll('present')}>All present</Button>}
          </div>

          <Panel bodyClassName="nx-sa-list">
            {filtered.length === 0 ? (
              <EmptyState icon="search" title="No matches" message="No staff match that search." />
            ) : (
              filtered.map((s) => (
                <div className="nx-sa-row" key={s.id}>
                  <Avatar name={s.name} src={s.photoUrl} size={32} />
                  <div className="nx-sa-row__main">
                    <div className="nx-sa-row__name">{s.name}</div>
                    <div className="nx-sa-row__meta">{s.designation || s.employeeId || '—'}</div>
                  </div>
                  <div className="nx-sa-row__right nx-sa-seg-wrap">
                    <div className="nx-sa-seg" role="group" aria-label={`Status for ${s.name}`}>
                      {MANUAL_STATUSES.map((st) => {
                        const m = STAFF_STATUS_META[st];
                        const active = entries[s.id] === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            className={cn('nx-sa-seg__btn', active && 'is-active', active && `is-${m.key}`)}
                            onClick={() => canWrite && setEntries((e) => ({ ...e, [s.id]: st }))}
                            disabled={!canWrite}
                            aria-pressed={active}
                            title={m.label}
                          >
                            {m.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </Panel>

          {canWrite && (
            <div className="nx-savebar">
              <div className="nx-savebar__inner">
                <div className="nx-savebar__left"><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{roster.length} staff</span></div>
                <div className="nx-savebar__right"><Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save attendance</Button></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
