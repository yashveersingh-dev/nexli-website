import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Textarea, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useConsentPurposes,
  createConsentPurpose,
  updateConsentPurpose,
  deleteConsentPurpose,
  type Actor,
} from './data';
import { ChipInput } from './ChipInput';
import { STARTER_PURPOSES } from './meta';
import type { ConsentPurpose } from '@/types/compliance';

export function PurposesTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('consent.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: purposes, loading, error } = useConsentPurposes(schoolId);

  const [editing, setEditing] = useState<ConsentPurpose | null | undefined>(undefined);
  const [removing, setRemoving] = useState<ConsentPurpose | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  // form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [active, setActive] = useState(true);
  const [cats, setCats] = useState<string[]>([]);

  const sorted = useMemo(
    () => [...purposes].sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name)),
    [purposes],
  );

  const open = (p: ConsentPurpose | null) => {
    setEditing(p);
    setName(p?.name ?? '');
    setDescription(p?.description ?? '');
    setRequired(p?.required ?? false);
    setActive(p?.active ?? true);
    setCats(p?.dataCategories ?? []);
  };

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      required,
      active,
      dataCategories: cats.length ? cats : undefined,
    };
    try {
      if (editing) await updateConsentPurpose(schoolId, editing.id, payload, actor);
      else await createConsentPurpose(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Purpose updated' : 'Purpose added');
      setEditing(undefined);
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteConsentPurpose(schoolId, removing.id, actor);
      toast.success('Deleted');
      setRemoving(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const addStarters = async () => {
    if (!schoolId) return;
    setSeeding(true);
    try {
      const existing = new Set(purposes.map((p) => p.name.toLowerCase()));
      const fresh = STARTER_PURPOSES.filter((s) => !existing.has(s.name.toLowerCase()));
      await Promise.all(
        fresh.map((s) =>
          createConsentPurpose(schoolId, { schoolId, name: s.name, description: s.description, required: s.required, active: true, dataCategories: s.dataCategories }, actor),
        ),
      );
      toast.success(fresh.length ? `Added ${fresh.length} starter purposes` : 'Already up to date');
    } catch {
      toast.error('Could not add starters');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>
          The catalogue of purposes for which the school processes student &amp; guardian personal data.
        </p>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>
            Add purpose
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load purposes" message="Please try again." />
        </Panel>
      ) : sorted.length === 0 ? (
        <Panel>
          <EmptyState
            icon="shield-check"
            title="No purposes defined yet"
            message={
              canWrite
                ? 'Start with the common K-12 purposes (Academic records, Photographs & media, Health & emergency, Transport tracking, Third-party LMS), then tailor them.'
                : 'Data-processing purposes will appear here.'
            }
            action={
              canWrite ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button variant="gold" leftIcon="plus" loading={seeding} onClick={addStarters}>
                    Add starter purposes
                  </Button>
                  <Button variant="ghost" leftIcon="edit" onClick={() => open(null)}>
                    Add manually
                  </Button>
                </div>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="cmp-consent-grid">
          {sorted.map((p) => (
            <div key={p.id} className={`cns-purpose${p.active === false ? ' is-inactive' : ''}`}>
              <div className="cns-purpose__head">
                <span className="cns-purpose__icon">
                  <Icon name={p.required ? 'lock' : 'shield'} size={17} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cns-purpose__title">{p.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <Badge variant={p.required ? 'info' : 'muted'}>{p.required ? 'Required' : 'Optional'}</Badge>
                    {p.active === false && <Badge variant="warning">Inactive</Badge>}
                  </div>
                </div>
              </div>
              {p.description && <p className="cns-purpose__desc">{p.description}</p>}
              {p.dataCategories && p.dataCategories.length > 0 && (
                <div className="cns-purpose__cats">
                  {p.dataCategories.map((c) => (
                    <span key={c} className="cns-cat">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {canWrite && (
                <div className="cns-purpose__foot">
                  <div style={{ flex: 1 }} />
                  <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => open(p)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Delete ${p.name}`} onClick={() => setRemoving(p)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        icon="shield-check"
        tone="gold"
        title={editing ? 'Edit purpose' : 'Add purpose'}
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!name.trim()} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Purpose name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Photographs & media" autoFocus />
        </Field>
        <Field label="Description" optional hint="Explain plainly what data is used and why (purpose limitation).">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} autoResize rows={3} placeholder="What is processed and for what purpose…" />
        </Field>
        <Field label="Data categories" optional hint="Type a category and press Enter or comma.">
          <ChipInput value={cats} onChange={setCats} placeholder="Name, Photographs, Email…" aria-label="Data categories" />
        </Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <Toggle checked={required} onChange={setRequired} label="Required for enrolment" description="Mandatory purposes cannot be declined without affecting admission." />
          <Toggle checked={active} onChange={setActive} label="Active" description="Inactive purposes are hidden from new consent collection." />
        </div>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Delete purpose?"
        message={removing ? `"${removing.name}" will be removed. Existing consent records are not deleted.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
