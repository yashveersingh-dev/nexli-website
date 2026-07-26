import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import {
  useRoutes, useTransportMembers, createTransportMember, removeTransportMember, type Actor,
} from '@/features/ops/data';
import { useStudents } from '@/features/school/data';
import { ROUTE_STATUS_META } from '@/features/ops/meta';
import type { TransportRoute, TransportMember } from '@/types/ops';

const SHIFT_LABEL: Record<NonNullable<TransportRoute['shift']>, string> = {
  morning: 'Morning', afternoon: 'Afternoon', both: 'Both shifts',
};

export function RoutesTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useOwnership('transport').canOperate;
  const { data: routes, loading, error } = useRoutes(schoolId);
  const { data: members } = useTransportMembers(schoolId);
  const [assignRoute, setAssignRoute] = useState<TransportRoute | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const mem of members) m[mem.routeId] = (m[mem.routeId] ?? 0) + 1;
    return m;
  }, [members]);

  const rows = useMemo(() => routes.slice().sort((a, b) => a.name.localeCompare(b.name)), [routes]);

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Bus routes, their stops and assigned students.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/transport/routes/new')}>New route</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load routes" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="map-pin" title="No routes yet" message={canWrite ? 'Create a route and add its stops to get started.' : 'Bus routes will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((r) => {
            const sm = ROUTE_STATUS_META[r.status];
            const stopCount = r.stops?.length ?? 0;
            return (
              <Panel key={r.id}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{r.name}</span>
                      {r.code && <span style={{ fontSize: 11.5, color: 'var(--gold)', letterSpacing: '0.04em' }}>{r.code}</span>}
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {r.shift ? SHIFT_LABEL[r.shift] : 'Both shifts'} · {stopCount} stop{stopCount === 1 ? '' : 's'} · {counts[r.id] ?? 0} student{(counts[r.id] ?? 0) === 1 ? '' : 's'}
                      {r.monthlyFee ? ` · ${formatINR(r.monthlyFee)}/mo` : ''}
                    </div>
                    {r.vehicleRegNo && (
                      <div style={{ fontSize: 12.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="bus" size={13} aria-hidden="true" /> {r.vehicleRegNo}{r.driverName ? ` · ${r.driverName}` : ''}
                      </div>
                    )}
                  </div>
                  {canWrite && (
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${r.name}`} onClick={() => navigate(`/transport/routes/${r.id}/edit`)} />
                  )}
                </div>

                {stopCount > 0 && (
                  <div className="tr-stopchips" style={{ marginTop: 10 }}>
                    {r.stops.slice().sort((a, b) => a.order - b.order).map((s, i) => (
                      <span className="tr-stopchip" key={`${s.name}-${i}`}>
                        <Icon name="map-pin" size={11} aria-hidden="true" />
                        {s.name}{s.time ? ` · ${s.time}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button variant="subtle" size="sm" leftIcon="users" onClick={() => setAssignRoute(r)}>
                    {canWrite ? 'Manage students' : 'View students'}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {assignRoute && (
        <AssignModal route={assignRoute} onClose={() => setAssignRoute(null)} />
      )}
    </div>
  );
}

function AssignModal({ route, onClose }: { route: TransportRoute; onClose: () => void }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('transport').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: members, loading } = useTransportMembers(schoolId, route.id);
  const { data: students } = useStudents(schoolId);

  const [studentId, setStudentId] = useState('');
  const [stopName, setStopName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<TransportMember | null>(null);

  const assignedIds = useMemo(() => new Set(members.map((m) => m.studentId)), [members]);
  const studentOptions = useMemo(
    () => [
      { value: '', label: 'Select a student' },
      ...students
        .filter((s) => s.status === 'active' && !assignedIds.has(s.id))
        .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''))
        .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
    ],
    [students, assignedIds],
  );
  const stopOptions = useMemo(
    () => [
      { value: '', label: 'No specific stop' },
      ...(route.stops ?? []).slice().sort((a, b) => a.order - b.order).map((s) => ({ value: s.name, label: s.name })),
    ],
    [route.stops],
  );

  const assign = async () => {
    if (!schoolId || !studentId) return;
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    setBusy(true);
    try {
      await createTransportMember(schoolId, {
        schoolId,
        studentId: student.id,
        studentName: student.fullName,
        gradeName: student.gradeName,
        routeId: route.id,
        routeName: route.name,
        stopName: stopName || undefined,
        pickup: true,
        drop: true,
      }, actor);
      toast.success('Student assigned', student.fullName);
      setStudentId(''); setStopName('');
    } catch { toast.error('Could not assign'); } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await removeTransportMember(schoolId, removing.id, actor); toast.success('Removed', removing.studentName); setRemoving(null); }
    catch { toast.error('Could not remove'); } finally { setBusy(false); }
  };

  const sorted = useMemo(() => members.slice().sort((a, b) => a.studentName.localeCompare(b.studentName)), [members]);

  return (
    <>
      <Modal open onClose={onClose} icon="users" tone="gold" title={`Students · ${route.name}`} description={`${members.length} assigned`} size="md" dismissible={!busy}>
        {canWrite && (
          <div style={{ marginBottom: 14 }}>
            <div className="nx-section__grid">
              <Field label="Student"><Select value={studentId} onChange={(e) => setStudentId(e.target.value)} options={studentOptions} placeholder="Select a student" /></Field>
              <Field label="Stop"><Select value={stopName} onChange={(e) => setStopName(e.target.value)} options={stopOptions} /></Field>
            </div>
            <Button variant="gold" size="sm" leftIcon="plus" disabled={!studentId || busy} loading={busy} onClick={assign} style={{ marginTop: 4 }}>Assign student</Button>
          </div>
        )}

        {loading ? (
          <Skeleton height={120} />
        ) : sorted.length === 0 ? (
          <EmptyState icon="users" title="No students assigned" message={canWrite ? 'Assign students above to this route.' : 'Assigned students will appear here.'} />
        ) : (
          <div className="ops-roster">
            {sorted.map((m) => (
              <div className="ops-roster__row" key={m.id}>
                <Icon name="user" size={15} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                <span className="ops-roster__name">
                  {m.studentName}
                  {m.gradeName ? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {m.gradeName}</span> : null}
                  {m.stopName ? <span style={{ fontWeight: 400, color: 'var(--gold)', fontSize: 12 }}> · {m.stopName}</span> : null}
                </span>
                {canWrite && (
                  <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${m.studentName}`} onClick={() => setRemoving(m)} />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        tone="danger"
        loading={busy}
        title="Remove from route?"
        message={removing ? `${removing.studentName} will be unassigned from ${route.name}.` : ''}
        confirmLabel="Remove"
      />
    </>
  );
}
