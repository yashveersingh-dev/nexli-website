import { useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useBlacklist, createBlacklist, updateBlacklist, deleteBlacklist, type Actor } from '@/features/ops/data';
import type { BlacklistEntry } from '@/types/ops';

export function BlacklistTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('visitor').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: list, loading } = useBlacklist(schoolId);

  const [editing, setEditing] = useState<BlacklistEntry | null | undefined>(undefined); // undefined=closed, null=new
  const [removing, setRemoving] = useState<BlacklistEntry | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (b: BlacklistEntry | null) => {
    setEditing(b);
    setName(b?.name ?? ''); setPhone(b?.phone ?? ''); setReason(b?.reason ?? '');
  };

  const save = async () => {
    if (!schoolId || !name.trim() || !reason.trim()) return;
    setBusy(true);
    try {
      if (editing) await updateBlacklist(schoolId, editing.id, { name: name.trim(), phone: phone.trim() || undefined, reason: reason.trim() }, actor);
      else await createBlacklist(schoolId, { schoolId, name: name.trim(), phone: phone.trim() || undefined, reason: reason.trim(), addedByName: member?.name, active: true }, actor);
      toast.success(editing ? 'Entry updated' : 'Added to blacklist');
      setEditing(undefined);
    } catch { toast.error('Could not save'); } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteBlacklist(schoolId, removing.id, actor); toast.success('Removed from blacklist'); setRemoving(null); }
    catch { toast.error('Could not remove'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Visitors flagged at check-in. Use sparingly and with a clear reason.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add entry</Button>}
      </div>

      {loading ? (
        <Skeleton height={160} />
      ) : list.length === 0 ? (
        <Panel><EmptyState icon="shield-check" title="No blacklisted visitors" message="Flagged visitors will be warned about at check-in." /></Panel>
      ) : (
        <div className="fin-kv-list" style={{ gap: 10 }}>
          {list.map((b) => (
            <Panel key={b.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className="ops-sos__icon" style={{ marginTop: 2 }}><Icon name="shield" size={18} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{b.name}{b.phone ? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {b.phone}</span> : null}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{b.reason}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{b.addedByName ? `Added by ${b.addedByName}` : ''}{b.createdAt ? ` · ${formatDate(b.createdAt)}` : ''}</div>
                </div>
                {canWrite && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${b.name}`} onClick={() => open(b)} />
                    <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${b.name}`} onClick={() => setRemoving(b)} />
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="shield" tone="gold"
        title={editing ? 'Edit blacklist entry' : 'Add to blacklist'} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!name.trim() || !reason.trim()} onClick={save}>Save</Button>
        </>}>
        <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Phone" optional><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={10} /></Field>
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why is this visitor flagged?" /></Field>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmRemove} tone="danger" loading={busy}
        title="Remove from blacklist?" message={removing ? `${removing.name} will no longer be flagged at check-in.` : ''} confirmLabel="Remove" />
    </div>
  );
}
