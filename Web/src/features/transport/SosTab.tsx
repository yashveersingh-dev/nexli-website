import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useSosAlerts, useVehicles, useRoutes, raiseSos, updateSos, type Actor } from '@/features/ops/data';
import { SOS_TYPE_META, SOS_STATUS_META } from '@/features/ops/meta';
import type { SosAlert, SosType } from '@/types/ops';

const time = (t?: number) => (t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const TYPE_OPTIONS = (Object.keys(SOS_TYPE_META) as SosType[]).map((t) => ({ value: t, label: SOS_TYPE_META[t].label }));

export function SosTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('transport').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: alerts, loading, error } = useSosAlerts(schoolId);
  const { data: vehicles } = useVehicles(schoolId);
  const { data: routes } = useRoutes(schoolId);

  const [raising, setRaising] = useState(false);
  const [resolve, setResolve] = useState<SosAlert | null>(null);
  const [busy, setBusy] = useState(false);

  // Raise form
  const [type, setType] = useState<SosType>('breakdown');
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [message, setMessage] = useState('');

  const active = useMemo(() => alerts.filter((a) => a.status !== 'resolved'), [alerts]);
  const resolved = useMemo(() => alerts.filter((a) => a.status === 'resolved'), [alerts]);

  const vehicleOptions = [{ value: '', label: 'No vehicle' }, ...vehicles.slice().sort((a, b) => a.regNo.localeCompare(b.regNo)).map((v) => ({ value: v.id, label: v.regNo }))];
  const routeOptions = [{ value: '', label: 'No route' }, ...routes.slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ value: r.id, label: r.name }))];

  const submitRaise = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      const route = routes.find((r) => r.id === routeId);
      await raiseSos(schoolId, {
        schoolId, type,
        vehicleId: vehicleId || undefined, vehicleRegNo: vehicle?.regNo,
        routeId: routeId || undefined, routeName: route?.name,
        message: message.trim() || undefined,
        raisedByUid: uid ?? undefined, raisedByName: member?.name,
        raisedAt: Date.now(), status: 'active',
      }, actor);
      toast.success('SOS raised', SOS_TYPE_META[type].label);
      setRaising(false); setType('breakdown'); setVehicleId(''); setRouteId(''); setMessage('');
    } catch { toast.error('Could not raise SOS'); } finally { setBusy(false); }
  };

  const acknowledge = async (a: SosAlert) => {
    if (!schoolId) return;
    try { await updateSos(schoolId, a.id, { status: 'acknowledged', acknowledgedByName: member?.name }, actor); toast.success('Acknowledged'); }
    catch { toast.error('Could not acknowledge'); }
  };

  const confirmResolve = async () => {
    if (!schoolId || !resolve) return;
    setBusy(true);
    try { await updateSos(schoolId, resolve.id, { status: 'resolved', resolvedAt: Date.now() }, actor); toast.success('Resolved'); setResolve(null); }
    catch { toast.error('Could not resolve'); } finally { setBusy(false); }
  };

  const Card = ({ a }: { a: SosAlert }) => {
    const tm = SOS_TYPE_META[a.type];
    const sm = SOS_STATUS_META[a.status];
    const isActive = a.status === 'active';
    const banner = a.status !== 'resolved';
    return (
      <div className={banner ? 'ops-sos' : 'panel'} role={isActive ? 'alert' : undefined} style={banner ? undefined : { padding: 14 }}>
        <span className="ops-sos__icon" style={banner ? undefined : { color: 'var(--text-muted)' }}><Icon name={tm.icon} size={20} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="ops-sos__title">{tm.label}</span>
            <Badge variant={sm.variant}>{sm.label}</Badge>
          </div>
          <div className="ops-sos__meta">
            {[a.vehicleRegNo, a.routeName].filter(Boolean).join(' · ') || 'No vehicle/route'} · {time(a.raisedAt)}
            {a.raisedByName ? ` · by ${a.raisedByName}` : ''}
          </div>
          {a.message && <div style={{ fontSize: 13, marginTop: 4 }}>{a.message}</div>}
          {canWrite && a.status !== 'resolved' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {a.status === 'active' && <Button variant="subtle" size="sm" leftIcon="check" onClick={() => acknowledge(a)}>Acknowledge</Button>}
              <Button variant="ghost" size="sm" leftIcon="check-circle" onClick={() => setResolve(a)}>Resolve</Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Emergency alerts from vehicles. Acknowledge and resolve promptly.</p>
        {canWrite && <Button variant="danger" leftIcon="alert-triangle" onClick={() => setRaising(true)}>Raise SOS</Button>}
      </div>

      {loading ? (
        <Skeleton height={160} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load alerts" message="Please try again." /></Panel>
      ) : alerts.length === 0 ? (
        <Panel><EmptyState icon="shield" title="No SOS alerts" message="Active and past alerts will appear here." /></Panel>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: resolved.length ? 20 : 0 }}>
              {active.map((a) => <Card key={a.id} a={a} />)}
            </div>
          )}
          {resolved.length > 0 && (
            <>
              <h3 className="nx-section__title" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Resolved</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {resolved.slice(0, 20).map((a) => <Card key={a.id} a={a} />)}
              </div>
            </>
          )}
        </>
      )}

      <Modal
        open={raising}
        onClose={() => setRaising(false)}
        icon="alert-triangle"
        tone="danger"
        title="Raise SOS alert"
        description="Notify the transport team of an emergency on a vehicle or route."
        size="md"
        dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setRaising(false)} disabled={busy}>Cancel</Button>
          <Button variant="danger" leftIcon="alert-triangle" loading={busy} onClick={submitRaise}>Raise SOS</Button>
        </>}
      >
        <div className="nx-section__grid">
          <Field label="Type" required><Select value={type} onChange={(e) => setType(e.target.value as SosType)} options={TYPE_OPTIONS} /></Field>
          <Field label="Vehicle"><Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} options={vehicleOptions} /></Field>
          <Field label="Route"><Select value={routeId} onChange={(e) => setRouteId(e.target.value)} options={routeOptions} /></Field>
        </div>
        <Field label="Message" optional><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="What is happening? Location, injuries, help needed…" /></Field>
      </Modal>

      <ConfirmModal
        open={!!resolve}
        onClose={() => setResolve(null)}
        onConfirm={confirmResolve}
        tone="gold"
        loading={busy}
        title="Resolve this alert?"
        message={resolve ? `Mark the ${SOS_TYPE_META[resolve.type].label.toLowerCase()} alert as resolved.` : ''}
        confirmLabel="Resolve"
      />
    </div>
  );
}
