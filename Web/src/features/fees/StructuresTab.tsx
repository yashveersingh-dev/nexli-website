import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useFeeHeads, useFeeStructures, createFeeHead, updateFeeHead, deleteFeeHead, deleteFeeStructure, type Actor } from '@/features/finance/data';
import { FEE_CATEGORY_META, FEE_CATEGORY_OPTIONS, STUDENT_FEE_CATEGORY_META } from '@/features/finance/meta';
import type { FeeHead, FeeCategory } from '@/types/finance';

export function StructuresTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('fees').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: heads, loading: hLoading } = useFeeHeads(schoolId);
  const { data: structures, loading: sLoading } = useFeeStructures(schoolId);

  const [headsOpen, setHeadsOpen] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const removeStructure = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteFeeStructure(schoolId, removing.id, actor); toast.success('Structure deleted'); setRemoving(null); }
    catch { toast.error('Could not delete'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>
          Define fee heads once, then bundle them into structures per grade &amp; category.
        </p>
        <Button variant="ghost" leftIcon="settings" onClick={() => setHeadsOpen(true)}>
          Fee heads {heads.length ? `(${heads.length})` : ''}
        </Button>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/fees/structures/new')}>New structure</Button>}
      </div>

      {sLoading ? (
        <Skeleton height={200} />
      ) : structures.length === 0 ? (
        <Panel><EmptyState icon="credit-card" title="No fee structures yet" message={canWrite ? 'Create a structure to assign fees to students.' : 'Fee structures will appear here.'} action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/fees/structures/new')}>New structure</Button> : undefined} /></Panel>
      ) : (
        <div className="grid g-2">
          {structures.map((s) => (
            <Panel key={s.id} title={s.name} sub={[s.gradeName || 'All grades', s.academicYear].filter(Boolean).join(' · ')}
              headerRight={<Badge variant={STUDENT_FEE_CATEGORY_META[s.studentCategory ?? 'general'].variant}>{STUDENT_FEE_CATEGORY_META[s.studentCategory ?? 'general'].label}</Badge>}>
              <div className="fin-kv-list">
                {s.items.slice(0, 4).map((it, i) => (
                  <div className="nx-kv" key={i}><span className="nx-kv__k">{it.headName}</span><span className="nx-kv__v fin-amount fin-amount--muted">{formatINR(it.amount)}</span></div>
                ))}
                {s.items.length > 4 && <div className="nx-kv"><span className="nx-kv__k" style={{ color: 'var(--text-muted)' }}>+{s.items.length - 4} more</span><span /></div>}
              </div>
              <div className="fin-doc__total" style={{ marginTop: 12, fontSize: 14 }}>
                <span>Annual total</span><span className="fin-amount">{formatINR(s.total)}</span>
              </div>
              {canWrite && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`/fees/structures/${s.id}/edit`)}>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon="x" onClick={() => setRemoving({ id: s.id, name: s.name })}>Delete</Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      <FeeHeadsModal open={headsOpen} onClose={() => setHeadsOpen(false)} heads={heads} loading={hLoading} canWrite={canWrite} schoolId={schoolId} actor={actor} />

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={removeStructure} tone="danger" loading={busy}
        title="Delete fee structure?" message={`"${removing?.name}" will be removed. Invoices already generated are not affected.`} confirmLabel="Delete" />
    </div>
  );
}

function FeeHeadsModal({ open, onClose, heads, loading, canWrite, schoolId, actor }: {
  open: boolean; onClose: () => void; heads: FeeHead[]; loading: boolean; canWrite: boolean; schoolId?: string; actor: Actor;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FeeCategory>('tuition');
  const [editing, setEditing] = useState<FeeHead | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setName(''); setCategory('tuition'); setEditing(null); };

  const submit = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      if (editing) await updateFeeHead(schoolId, editing.id, { name: name.trim(), category }, actor);
      else await createFeeHead(schoolId, { schoolId, name: name.trim(), category, active: true }, actor);
      toast.success(editing ? 'Head updated' : 'Head added');
      reset();
    } catch { toast.error('Could not save'); } finally { setBusy(false); }
  };

  const remove = async (h: FeeHead) => {
    if (!schoolId) return;
    try { await deleteFeeHead(schoolId, h.id, actor); toast.success('Head removed'); }
    catch { toast.error('Could not remove'); }
  };

  return (
    <Modal open={open} onClose={onClose} icon="settings" tone="gold" title="Fee heads" size="md">
      {canWrite && (
        <div className="fin-itemrow" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tuition fee" /></Field>
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value as FeeCategory)} options={FEE_CATEGORY_OPTIONS} /></Field>
          <Button variant="gold" leftIcon={editing ? 'check' : 'plus'} loading={busy} disabled={!name.trim()} onClick={submit}>{editing ? 'Save' : 'Add'}</Button>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {loading ? <Skeleton height={120} /> : heads.length === 0 ? (
          <EmptyState icon="box" title="No fee heads" message="Add your first fee head above." />
        ) : (
          <div className="fin-kv-list">
            {heads.map((h) => (
              <div className="nx-kv" key={h.id} style={{ alignItems: 'center' }}>
                <span className="nx-kv__k" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={FEE_CATEGORY_META[h.category]?.icon ?? 'box'} size={14} /> {h.name}
                </span>
                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Badge variant="muted">{FEE_CATEGORY_META[h.category]?.label}</Badge>
                  {canWrite && <>
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${h.name}`} onClick={() => { setEditing(h); setName(h.name); setCategory(h.category); }} />
                    <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Delete ${h.name}`} onClick={() => remove(h)} />
                  </>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
