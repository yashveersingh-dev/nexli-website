import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useVehicles, createVehicle, updateVehicle, deleteVehicle, type Actor } from '@/features/ops/data';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_OPTIONS } from '@/features/ops/meta';
import type { Vehicle, VehicleStatus, VehicleType } from '@/types/ops';
import { vehicleDocs, worstDocLevel, type DocExpiryLevel } from './docExpiry';

const isoToTs = (v: string) => (v ? new Date(`${v}T00:00:00`).getTime() : undefined);
// Format using LOCAL date parts (mirrors isoToTs's local-midnight parse). Using
// toISOString() here would shift the date a day earlier in IST (UTC+5:30) on the
// edit round-trip, silently moving stored doc-expiry dates back by one day.
const tsToIso = (t?: number) => {
  if (!t) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface Draft {
  regNo: string; type: VehicleType; model: string; capacity: string;
  driverName: string; driverPhone: string; conductorName: string; conductorPhone: string;
  status: VehicleStatus; gpsDeviceId: string;
  fitnessExpiry: string; insuranceExpiry: string; pucExpiry: string; permitExpiry: string;
}

const emptyDraft = (): Draft => ({
  regNo: '', type: 'bus', model: '', capacity: '',
  driverName: '', driverPhone: '', conductorName: '', conductorPhone: '',
  status: 'active', gpsDeviceId: '',
  fitnessExpiry: '', insuranceExpiry: '', pucExpiry: '', permitExpiry: '',
});

const toDraft = (v: Vehicle): Draft => ({
  regNo: v.regNo, type: v.type, model: v.model ?? '', capacity: v.capacity ? String(v.capacity) : '',
  driverName: v.driverName ?? '', driverPhone: v.driverPhone ?? '', conductorName: v.conductorName ?? '', conductorPhone: v.conductorPhone ?? '',
  status: v.status, gpsDeviceId: v.gpsDeviceId ?? '',
  fitnessExpiry: tsToIso(v.fitnessExpiry), insuranceExpiry: tsToIso(v.insuranceExpiry), pucExpiry: tsToIso(v.pucExpiry), permitExpiry: tsToIso(v.permitExpiry),
});

const DOC_BADGE: Record<DocExpiryLevel, { variant: 'danger' | 'warning'; label: (days: number | null) => string } | null> = {
  ok: null,
  expiring: { variant: 'warning', label: (d) => (d === 0 ? 'Expires today' : `${d}d left`) },
  expired: { variant: 'danger', label: (d) => (d === -1 ? 'Expired 1d ago' : `Expired ${Math.abs(d ?? 0)}d ago`) },
};

export function VehiclesTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('transport').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: vehicles, loading, error } = useVehicles(schoolId);

  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined); // undefined=closed, null=new
  const [removing, setRemoving] = useState<Vehicle | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => vehicles.slice().sort((a, b) => a.regNo.localeCompare(b.regNo)), [vehicles]);

  const open = (v: Vehicle | null) => { setEditing(v); setDraft(v ? toDraft(v) : emptyDraft()); };
  const set = <K extends keyof Draft>(k: K, val: Draft[K]) => setDraft((d) => ({ ...d, [k]: val }));

  const valid = draft.regNo.trim().length >= 2 && Number(draft.capacity) >= 1;

  const save = async () => {
    if (!schoolId || !valid) return;
    setBusy(true);
    try {
      const payload = {
        schoolId,
        regNo: draft.regNo.trim().toUpperCase(),
        type: draft.type,
        model: draft.model.trim() || undefined,
        capacity: Number(draft.capacity) || 0,
        driverName: draft.driverName.trim() || undefined,
        driverPhone: draft.driverPhone.trim() || undefined,
        conductorName: draft.conductorName.trim() || undefined,
        conductorPhone: draft.conductorPhone.trim() || undefined,
        status: draft.status,
        gpsDeviceId: draft.gpsDeviceId.trim() || undefined,
        fitnessExpiry: isoToTs(draft.fitnessExpiry),
        insuranceExpiry: isoToTs(draft.insuranceExpiry),
        pucExpiry: isoToTs(draft.pucExpiry),
        permitExpiry: isoToTs(draft.permitExpiry),
      };
      if (editing) await updateVehicle(schoolId, editing.id, payload, actor);
      else await createVehicle(schoolId, payload, actor);
      toast.success(editing ? 'Vehicle updated' : 'Vehicle added', payload.regNo);
      setEditing(undefined);
    } catch { toast.error('Could not save', 'Please try again.'); } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteVehicle(schoolId, removing.id, actor); toast.success('Vehicle removed', removing.regNo); setRemoving(null); }
    catch { toast.error('Could not remove'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Fleet vehicles with driver, capacity and compliance documents.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add vehicle</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load vehicles" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="bus" title="No vehicles yet" message={canWrite ? 'Add your first bus or van to build the fleet.' : 'Fleet vehicles will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((v) => {
            const docs = vehicleDocs(v);
            const worst = worstDocLevel(v);
            const typeLabel = VEHICLE_TYPE_OPTIONS.find((o) => o.value === v.type)?.label ?? v.type;
            const sm = VEHICLE_STATUS_META[v.status];
            return (
              <Panel key={v.id}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="ops-bus-marker" style={{ width: 34, height: 34, fontSize: 16, flexShrink: 0 }} aria-hidden="true">🚌</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{v.regNo}</span>
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                      {worst !== 'ok' && (
                        <Badge variant={worst === 'expired' ? 'danger' : 'warning'}>
                          {worst === 'expired' ? 'Docs expired' : 'Docs expiring'}
                        </Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {typeLabel}{v.model ? ` · ${v.model}` : ''} · {v.capacity} seats
                    </div>
                    {(v.driverName || v.driverPhone) && (
                      <div style={{ fontSize: 12.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="user" size={13} aria-hidden="true" /> {v.driverName || 'Driver'}{v.driverPhone ? ` · ${v.driverPhone}` : ''}
                      </div>
                    )}
                  </div>
                  {canWrite && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${v.regNo}`} onClick={() => open(v)} />
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${v.regNo}`} onClick={() => setRemoving(v)} />
                    </div>
                  )}
                </div>
                {docs.some((d) => d.at) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {docs.filter((d) => d.at != null).map((d) => {
                      const b = DOC_BADGE[d.level];
                      return (
                        <span key={d.key} style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{d.label}: {formatDate(d.at as number)}</span>
                          {b && <Badge variant={b.variant}>{b.label(d.days)}</Badge>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        icon="bus"
        tone="gold"
        title={editing ? 'Edit vehicle' : 'Add vehicle'}
        size="lg"
        dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!valid} onClick={save}>Save</Button>
        </>}
      >
        <div className="nx-section__grid">
          <Field label="Registration no." required><Input value={draft.regNo} onChange={(e) => set('regNo', e.target.value)} placeholder="e.g. DL01AB1234" autoFocus /></Field>
          <Field label="Type"><Select value={draft.type} onChange={(e) => set('type', e.target.value as VehicleType)} options={VEHICLE_TYPE_OPTIONS} /></Field>
          <Field label="Model"><Input value={draft.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. Tata Starbus" /></Field>
          <Field label="Capacity (seats)" required><Input value={draft.capacity} onChange={(e) => set('capacity', e.target.value)} type="number" inputMode="numeric" placeholder="0" /></Field>
          <Field label="Status"><Select value={draft.status} onChange={(e) => set('status', e.target.value as VehicleStatus)} options={(Object.keys(VEHICLE_STATUS_META) as VehicleStatus[]).map((s) => ({ value: s, label: VEHICLE_STATUS_META[s].label }))} /></Field>
          <Field label="GPS device ID" optional><Input value={draft.gpsDeviceId} onChange={(e) => set('gpsDeviceId', e.target.value)} placeholder="Optional" /></Field>
        </div>

        <h3 className="nx-section__title" style={{ marginTop: 18, marginBottom: 10 }}>Driver &amp; conductor</h3>
        <div className="nx-section__grid">
          <Field label="Driver name"><Input value={draft.driverName} onChange={(e) => set('driverName', e.target.value)} /></Field>
          <Field label="Driver phone"><Input value={draft.driverPhone} onChange={(e) => set('driverPhone', e.target.value)} inputMode="numeric" maxLength={10} /></Field>
          <Field label="Conductor name"><Input value={draft.conductorName} onChange={(e) => set('conductorName', e.target.value)} /></Field>
          <Field label="Conductor phone"><Input value={draft.conductorPhone} onChange={(e) => set('conductorPhone', e.target.value)} inputMode="numeric" maxLength={10} /></Field>
        </div>

        <h3 className="nx-section__title" style={{ marginTop: 18, marginBottom: 10 }}>Compliance documents</h3>
        <div className="nx-section__grid">
          <Field label="Fitness expiry"><DatePicker value={draft.fitnessExpiry} onChange={(e) => set('fitnessExpiry', e.target.value)} /></Field>
          <Field label="Insurance expiry"><DatePicker value={draft.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} /></Field>
          <Field label="PUC expiry"><DatePicker value={draft.pucExpiry} onChange={(e) => set('pucExpiry', e.target.value)} /></Field>
          <Field label="Permit expiry"><DatePicker value={draft.permitExpiry} onChange={(e) => set('permitExpiry', e.target.value)} /></Field>
        </div>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        tone="danger"
        loading={busy}
        title="Remove vehicle?"
        message={removing ? `${removing.regNo} will be removed from the fleet. Routes referencing it keep their saved details.` : ''}
        confirmLabel="Remove"
      />
    </div>
  );
}
