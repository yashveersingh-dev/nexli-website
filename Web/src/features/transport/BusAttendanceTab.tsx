import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Field, Select, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/cn';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useRoutes, useTransportMembers, useBusAttendance, saveBusAttendance } from '@/features/ops/data';
import { useStudents } from '@/features/school/data';
import { BOARD_STATUS_META } from '@/features/ops/meta';
import type { BoardStatus, BusTrip } from '@/types/ops';

const STATUSES: BoardStatus[] = ['boarded', 'absent', 'alighted'];
const TRIP_OPTIONS: { value: BusTrip; label: string }[] = [
  { value: 'morning', label: 'Morning (pickup)' },
  { value: 'evening', label: 'Evening (drop)' },
];
const today = () => new Date().toISOString().slice(0, 10);

export function BusAttendanceTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('transport').canOperate;

  const { data: routes, loading: rLoading } = useRoutes(schoolId);
  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState(today());
  const [trip, setTrip] = useState<BusTrip>('morning');

  const { data: members, loading: mLoading } = useTransportMembers(schoolId, routeId || undefined);
  const { data: students } = useStudents(schoolId);
  const { data: existing } = useBusAttendance(schoolId, routeId || undefined, routeId ? date : undefined, routeId ? trip : undefined);

  const [entries, setEntries] = useState<Record<string, BoardStatus>>({});
  const [saving, setSaving] = useState(false);

  const roster = useMemo(() => {
    const byId = new Map(students.map((s) => [s.id, s]));
    return members
      .map((m) => ({ member: m, student: byId.get(m.studentId) }))
      .sort((a, b) => (a.member.studentName ?? '').localeCompare(b.member.studentName ?? ''));
  }, [members, students]);

  // Stable roster identity (sorted student ids). A same-size swap changes this key
  // but not roster.length, so depending on length would seed under the wrong
  // studentId; depend on the key instead.
  const rosterKey = useMemo(() => roster.map(({ member: m }) => m.studentId).join(','), [roster]);

  // Seed entries when route/date/trip changes (existing marks, else default boarded).
  useEffect(() => {
    if (!routeId) { setEntries({}); return; }
    const seed: Record<string, BoardStatus> = {};
    for (const { member: m } of roster) seed[m.studentId] = existing?.entries?.[m.studentId] ?? 'boarded';
    setEntries(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, date, trip, existing, rosterKey]);

  const counts = useMemo(() => {
    const c = { boarded: 0, absent: 0, alighted: 0 };
    for (const st of Object.values(entries)) c[st]++;
    return c;
  }, [entries]);

  const routeOptions = useMemo(
    () => [{ value: '', label: 'Select a route' }, ...routes.slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ value: r.id, label: r.name }))],
    [routes],
  );

  const setAll = (status: BoardStatus) => {
    const next: Record<string, BoardStatus> = {};
    for (const { member: m } of roster) next[m.studentId] = status;
    setEntries(next);
  };

  const save = async () => {
    if (!schoolId || !routeId) return;
    setSaving(true);
    try {
      const route = routes.find((r) => r.id === routeId);
      await saveBusAttendance(
        schoolId,
        {
          schoolId, routeId, routeName: route?.name, date, trip,
          entries,
          boardedCount: counts.boarded, total: roster.length,
        },
        { uid: uid ?? 'unknown', name: member?.name },
      );
      toast.success('Attendance saved', `${counts.boarded}/${roster.length} boarded`);
    } catch {
      toast.error('Could not save', 'It will sync when you are back online.');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Panel>
        <div className="nx-section__grid">
          <Field label="Route"><Select value={routeId} onChange={(e) => setRouteId(e.target.value)} options={routeOptions} placeholder="Select a route" disabled={rLoading} /></Field>
          <Field label="Date"><DatePicker value={date} onChange={(e) => setDate(e.target.value)} max={today()} /></Field>
          <Field label="Trip"><Select value={trip} onChange={(e) => setTrip(e.target.value as BusTrip)} options={TRIP_OPTIONS} /></Field>
        </div>
      </Panel>

      {!routeId ? (
        <Panel><EmptyState icon="bus" title="Pick a route" message="Choose a route, date and trip to take bus attendance." /></Panel>
      ) : mLoading ? (
        <Panel><Skeleton height={260} /></Panel>
      ) : roster.length === 0 ? (
        <Panel><EmptyState icon="users" title="No students on this route" message="Assign students to this route from the Routes tab first." /></Panel>
      ) : (
        <>
          <div className="nx-att-summary" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              <span className="badge badge--success">{counts.boarded} Boarded</span>
              {counts.absent > 0 && <span className="badge badge--danger">{counts.absent} Absent</span>}
              {counts.alighted > 0 && <span className="badge badge--info">{counts.alighted} Alighted</span>}
            </div>
            {canWrite && <Button variant="subtle" size="sm" leftIcon="check-circle" onClick={() => setAll('boarded')}>All boarded</Button>}
          </div>

          <Panel bodyClassName="ops-roster">
            {roster.map(({ member: m, student }, i) => (
              <div className="ops-roster__row" key={m.id}>
                <span style={{ width: 22, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</span>
                <Avatar name={student?.fullName ?? m.studentName} src={student?.photoUrl} size={30} />
                <span className="ops-roster__name">
                  {m.studentName}
                  {m.stopName ? <span style={{ fontWeight: 400, color: 'var(--gold)', fontSize: 11.5 }}> · {m.stopName}</span> : null}
                </span>
                <div className="ops-seg" role="group" aria-label={`Status for ${m.studentName}`}>
                  {STATUSES.map((st) => {
                    const meta = BOARD_STATUS_META[st];
                    const active = entries[m.studentId] === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        className={cn('ops-seg__btn', active && 'is-active')}
                        style={active ? { background: meta.color } : undefined}
                        onClick={() => canWrite && setEntries((e) => ({ ...e, [m.studentId]: st }))}
                        disabled={!canWrite}
                        aria-pressed={active}
                        title={meta.label}
                      >
                        {meta.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Panel>

          {existing?.markedAt && (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
              Last saved by {existing.markedByName ?? 'staff'}.
            </p>
          )}

          {canWrite && (
            <div className="nx-savebar">
              <div className="nx-savebar__inner">
                <div className="nx-savebar__left"><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{roster.length} students</span></div>
                <div className="nx-savebar__right"><Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save attendance</Button></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
