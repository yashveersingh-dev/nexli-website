import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input } from '@/components/form';
import { Checkbox } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useVendors, createVendor, updateVendor, deleteVendor, type Actor } from '@/features/finance/data';
import type { Vendor } from '@/types/finance';

interface VendorForm {
  name: string; category: string; contactPerson: string; phone: string; email: string;
  gstin: string; address: string; bankName: string; accountNo: string; ifsc: string; active: boolean;
}

const emptyForm = (): VendorForm => ({
  name: '', category: '', contactPerson: '', phone: '', email: '',
  gstin: '', address: '', bankName: '', accountNo: '', ifsc: '', active: true,
});

function toForm(v: Vendor): VendorForm {
  return {
    name: v.name, category: v.category ?? '', contactPerson: v.contactPerson ?? '', phone: v.phone ?? '', email: v.email ?? '',
    gstin: v.gstin ?? '', address: v.address ?? '', bankName: v.bankName ?? '', accountNo: v.accountNo ?? '', ifsc: v.ifsc ?? '', active: v.active !== false,
  };
}

export function VendorsTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: vendors, loading, error } = useVendors(schoolId);

  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Vendor | 'new' | null>(null);
  const [removing, setRemoving] = useState<Vendor | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return vendors
      .filter((v) => (needle ? [v.name, v.category, v.contactPerson, v.phone, v.gstin].some((x) => x?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || a.name.localeCompare(b.name));
  }, [vendors, q]);

  const remove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteVendor(schoolId, removing.id, actor); toast.success('Vendor deleted'); setRemoving(null); }
    catch { toast.error('Could not delete'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <div className="nx-toolbar__search">
          <Input leftIcon="search" placeholder="Search vendor, GSTIN, contact…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search vendors" />
        </div>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => setEditing('new')}>New vendor</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load vendors" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="building" title={q ? 'No matching vendors' : 'No vendors yet'} message={q ? 'Try a different search.' : canWrite ? 'Add your suppliers to use them on purchase orders and expenses.' : 'Vendors will appear here.'} action={canWrite && !q ? <Button variant="gold" leftIcon="plus" onClick={() => setEditing('new')}>New vendor</Button> : undefined} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((v) => (
            <Panel key={v.id} title={v.name} sub={v.category || undefined}
              headerRight={<Badge variant={v.active !== false ? 'success' : 'muted'}>{v.active !== false ? 'Active' : 'Inactive'}</Badge>}>
              <div className="fin-kv-list">
                {v.contactPerson && <div className="nx-kv"><span className="nx-kv__k"><Icon name="user" size={13} /> Contact</span><span className="nx-kv__v">{v.contactPerson}</span></div>}
                {v.phone && <div className="nx-kv"><span className="nx-kv__k"><Icon name="phone" size={13} /> Phone</span><span className="nx-kv__v">{v.phone}</span></div>}
                {v.email && <div className="nx-kv"><span className="nx-kv__k"><Icon name="mail" size={13} /> Email</span><span className="nx-kv__v" style={{ overflowWrap: 'anywhere' }}>{v.email}</span></div>}
                {v.gstin && <div className="nx-kv"><span className="nx-kv__k"><Icon name="file-text" size={13} /> GSTIN</span><span className="nx-kv__v">{v.gstin}</span></div>}
                {(v.bankName || v.accountNo) && <div className="nx-kv"><span className="nx-kv__k"><Icon name="credit-card" size={13} /> Bank</span><span className="nx-kv__v">{[v.bankName, v.accountNo].filter(Boolean).join(' · ')}</span></div>}
                {!v.contactPerson && !v.phone && !v.email && !v.gstin && <div className="nx-kv"><span className="nx-kv__k" style={{ color: 'var(--text-muted)' }}>No contact details</span><span /></div>}
              </div>
              {canWrite && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => setEditing(v)}>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon="minus-circle" onClick={() => setRemoving(v)}>Delete</Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      {editing && (
        <VendorModal
          vendor={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          schoolId={schoolId} actor={actor} busy={busy} setBusy={setBusy}
        />
      )}

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={remove} tone="danger" loading={busy}
        title="Delete vendor?" message={`"${removing?.name}" will be removed. Existing POs and expenses keep their saved details.`} confirmLabel="Delete" />
    </div>
  );
}

function VendorModal({ vendor, onClose, schoolId, actor, busy, setBusy }: {
  vendor: Vendor | null; onClose: () => void; schoolId?: string; actor: Actor; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<VendorForm>(() => (vendor ? toForm(vendor) : emptyForm()));
  const set = <K extends keyof VendorForm>(k: K, val: VendorForm[K]) => setForm((f) => ({ ...f, [k]: val }));

  const submit = async () => {
    if (!schoolId || !form.name.trim()) { toast.error('Vendor name is required'); return; }
    setBusy(true);
    try {
      const payload = {
        schoolId,
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        address: form.address.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        accountNo: form.accountNo.trim() || undefined,
        ifsc: form.ifsc.trim() || undefined,
        active: form.active,
      };
      if (vendor) { await updateVendor(schoolId, vendor.id, payload, actor); toast.success('Vendor updated', payload.name); }
      else { await createVendor(schoolId, payload, actor); toast.success('Vendor added', payload.name); }
      onClose();
    } catch { toast.error('Could not save', 'Please try again.'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} icon="building" tone="gold" title={vendor ? 'Edit vendor' : 'New vendor'} size="lg" dismissible={!busy}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="check" loading={busy} disabled={!form.name.trim()} onClick={submit}>{vendor ? 'Save changes' : 'Add vendor'}</Button>
      </>}>
      <div className="grid g-2">
        <Field label="Vendor name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Acme Stationers" autoFocus /></Field>
        <Field label="Category" optional><Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Stationery" /></Field>
      </div>
      <div className="grid g-2">
        <Field label="Contact person" optional><Input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Full name" /></Field>
        <Field label="Phone" optional><Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91…" /></Field>
      </div>
      <div className="grid g-2">
        <Field label="Email" optional><Input type="email" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="vendor@email.com" /></Field>
        <Field label="GSTIN" optional><Input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" /></Field>
      </div>
      <Field label="Address" optional><Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, city, PIN" /></Field>

      <div className="nx-subhead" style={{ marginTop: 8 }}>Bank details</div>
      <div className="grid g-2">
        <Field label="Bank name" optional><Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="Bank" /></Field>
        <Field label="Account no." optional><Input value={form.accountNo} onChange={(e) => set('accountNo', e.target.value)} placeholder="Account number" /></Field>
      </div>
      <Field label="IFSC" optional><Input value={form.ifsc} onChange={(e) => set('ifsc', e.target.value)} placeholder="IFSC0000000" /></Field>

      <div style={{ marginTop: 12 }}>
        <Checkbox checked={form.active} onChange={(v) => set('active', v)} label="Active" description="Inactive vendors are hidden from new purchase orders." />
      </div>
    </Modal>
  );
}
