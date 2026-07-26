import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useFacilities, createFacility, updateFacility, deleteFacility } from '@/features/ops/data';
import { FACILITY_TYPE_OPTIONS } from '@/features/ops/meta';
import type { Facility, FacilityType } from '@/types/ops';

type Condition = NonNullable<Facility['condition']>;
const CONDITION_META: Record<Condition, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  good: { label: 'Good', variant: 'success' },
  fair: { label: 'Fair', variant: 'warning' },
  poor: { label: 'Poor', variant: 'danger' },
};
const CONDITION_OPTIONS = (Object.keys(CONDITION_META) as Condition[]).map((v) => ({ value: v, label: CONDITION_META[v].label }));
const typeLabel = (t: FacilityType) => FACILITY_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

interface Draft {
  name: string; type: FacilityType; building: string; floor: string;
  capacity: string; inCharge: string; condition: Condition;
}
const emptyDraft: Draft = { name: '', type: 'classroom', building: '', floor: '', capacity: '', inCharge: '', condition: 'good' };

export function FacilitiesTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('facility').canOperate;
  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: facilities, loading } = useFacilities(schoolId);

  const [editing, setEditing] = useState<Facility | null | undefined>(undefined); // undefined=closed, null=new
  const [removing, setRemoving] = useState<Facility | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...facilities].sort((a, b) => (a.building ?? '').localeCompare(b.building ?? '') || a.name.localeCompare(b.name)),
    [facilities],
  );

  const open = (f: Facility | null) => {
    setEditing(f);
    setDraft(f ? {
      name: f.name, type: f.type, building: f.building ?? '', floor: f.floor ?? '',
      capacity: f.capacity != null ? String(f.capacity) : '', inCharge: f.inCharge ?? '', condition: f.condition ?? 'good',
    } : emptyDraft);
  };

  const valid = draft.name.trim().length >= 2 && (draft.capacity === '' || (!Number.isNaN(Number(draft.capacity)) && Number(draft.capacity) >= 0));

  const save = async () => {
    if (!schoolId || !valid) return;
    setBusy(true);
    const payload = {
      name: draft.name.trim(),
      type: draft.type,
      building: draft.building.trim() || undefined,
      floor: draft.floor.trim() || undefined,
      capacity: draft.capacity ? Number(draft.capacity) : undefined,
      inCharge: draft.inCharge.trim() || undefined,
      condition: draft.condition,
    };
    try {
      if (editing) await updateFacility(schoolId, editing.id, payload, actor);
      else await createFacility(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Facility updated' : 'Facility added', payload.name);
      setEditing(undefined);
    } catch { toast.error('Could not save'); } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteFacility(schoolId, removing.id, actor); toast.success('Facility removed', removing.name); setRemoving(null); }
    catch { toast.error('Could not remove'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Rooms, labs, grounds and other spaces — with condition and in-charge.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add facility</Button>}
      </div>

      {loading ? (
        <div className="grid g-2"><Skeleton height={120} /><Skeleton height={120} /></div>
      ) : sorted.length === 0 ? (
        <Panel><EmptyState icon="building" title="No facilities yet" message={canWrite ? 'Add a room or space to start the facility register.' : 'Facilities will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {sorted.map((f) => (
            <Panel key={f.id}>
              <div className="fac-card">
                <span className="fac-card__icon"><Icon name="building" size={18} /></span>
                <div className="fac-card__body">
                  <div className="fac-badges">
                    <span className="fac-card__title">{f.name}</span>
                    {f.condition && <Badge variant={CONDITION_META[f.condition].variant}>{CONDITION_META[f.condition].label}</Badge>}
                  </div>
                  <div className="fac-card__meta">
                    {typeLabel(f.type)}
                    {f.building ? ` · ${f.building}` : ''}
                    {f.floor ? ` · Floor ${f.floor}` : ''}
                    {f.capacity != null ? ` · ${f.capacity} cap.` : ''}
                  </div>
                  {f.inCharge && <div className="fac-card__meta">In-charge: {f.inCharge}</div>}
                </div>
                {canWrite && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${f.name}`} onClick={() => open(f)} />
                    <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${f.name}`} onClick={() => setRemoving(f)} />
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="building" tone="gold"
        title={editing ? 'Edit facility' : 'Add facility'} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!valid} onClick={save}>Save</Button>
        </>}>
        <Field label="Name" required><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus placeholder="e.g. Physics Lab" /></Field>
        <div className="nx-section__grid">
          <Field label="Type" required>
            <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as FacilityType })} options={FACILITY_TYPE_OPTIONS} />
          </Field>
          <Field label="Condition">
            <Select value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value as Condition })} options={CONDITION_OPTIONS} />
          </Field>
          <Field label="Building" optional><Input value={draft.building} onChange={(e) => setDraft({ ...draft, building: e.target.value })} placeholder="e.g. Block A" /></Field>
          <Field label="Floor" optional><Input value={draft.floor} onChange={(e) => setDraft({ ...draft, floor: e.target.value })} placeholder="e.g. 2" /></Field>
          <Field label="Capacity" optional><Input value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} inputMode="numeric" type="number" min={0} /></Field>
          <Field label="In-charge" optional><Input value={draft.inCharge} onChange={(e) => setDraft({ ...draft, inCharge: e.target.value })} placeholder="Staff name" /></Field>
        </div>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmRemove} tone="danger" loading={busy}
        title="Remove facility?" message={removing ? `${removing.name} will be deleted. Assets linked to it keep their location text.` : ''} confirmLabel="Remove" />
    </div>
  );
}
