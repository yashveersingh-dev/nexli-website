import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useComplianceDocuments, createComplianceDocument, updateComplianceDocument, deleteComplianceDocument, type Actor } from './data';
import { DOCUMENT_CATEGORY_META, DOCUMENT_CATEGORY_OPTIONS, daysUntil } from './meta';
import type { ComplianceDocument, DocumentCategory } from '@/types/compliance';

const iso = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');

export function VaultTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: docs, loading, error } = useComplianceDocuments(schoolId);

  const [editing, setEditing] = useState<ComplianceDocument | null | undefined>(undefined);
  const [removing, setRemoving] = useState<ComplianceDocument | null>(null);
  const [busy, setBusy] = useState(false);
  // form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('license');
  const [authority, setAuthority] = useState('');
  const [refNo, setRefNo] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const sorted = useMemo(() => [...docs].sort((a, b) => (a.expiryDate ?? Infinity) - (b.expiryDate ?? Infinity)), [docs]);

  const open = (d: ComplianceDocument | null) => {
    setEditing(d);
    setTitle(d?.title ?? ''); setCategory(d?.category ?? 'license'); setAuthority(d?.authority ?? '');
    setRefNo(d?.refNo ?? ''); setFileUrl(d?.fileUrl ?? ''); setIssuedDate(iso(d?.issuedDate)); setExpiryDate(iso(d?.expiryDate));
  };

  const save = async () => {
    if (!schoolId || !title.trim()) return;
    setBusy(true);
    const payload = {
      title: title.trim(), category, authority: authority.trim() || undefined, refNo: refNo.trim() || undefined,
      fileUrl: fileUrl.trim() || undefined,
      issuedDate: issuedDate ? new Date(`${issuedDate}T00:00:00`).getTime() : undefined,
      expiryDate: expiryDate ? new Date(`${expiryDate}T00:00:00`).getTime() : undefined,
    };
    try {
      if (editing) await updateComplianceDocument(schoolId, editing.id, payload, actor);
      else await createComplianceDocument(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Document updated' : 'Document added');
      setEditing(undefined);
    } catch { toast.error('Could not save'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteComplianceDocument(schoolId, removing.id, actor); toast.success('Deleted'); setRemoving(null); }
    catch { toast.error('Could not delete'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Licences, NOCs, affiliation &amp; registration certificates — with expiry tracking.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add document</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Could not load documents" message="We could not reach the document vault. Please try again." /></Panel>
      ) : sorted.length === 0 ? (
        <Panel><EmptyState icon="file-text" title="Vault is empty" message={canWrite ? 'Add key statutory documents to track their validity.' : 'School documents will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {sorted.map((d) => {
            const meta = DOCUMENT_CATEGORY_META[d.category];
            const du = d.expiryDate != null ? daysUntil(d.expiryDate) : null;
            const expCls = du == null ? '' : du < 0 ? 'is-expired' : du <= 60 ? 'is-soon' : '';
            return (
              <div key={d.id} className="cmp-doc">
                <span className="cmp-doc__icon"><Icon name={meta.icon} size={18} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{meta.label}{d.authority ? ` · ${d.authority}` : ''}{d.refNo ? ` · ${d.refNo}` : ''}</div>
                  {d.expiryDate != null && (
                    <div className={`cmp-doc__expiry ${expCls}`} style={{ marginTop: 3 }}>
                      {du! < 0 ? `Expired ${formatDate(d.expiryDate)}` : `Valid till ${formatDate(d.expiryDate)}${du! <= 60 ? ` · ${du}d left` : ''}`}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {d.fileUrl && <a className="nx-chip-link" href={d.fileUrl} target="_blank" rel="noreferrer"><Icon name="external-link" size={13} /> View</a>}
                    {canWrite && <>
                      <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => open(d)}>Edit</Button>
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label="Delete" onClick={() => setRemoving(d)} />
                    </>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="file-text" tone="gold"
        title={editing ? 'Edit document' : 'Add document'} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!title.trim()} onClick={save}>Save</Button>
        </>}>
        <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CBSE affiliation certificate" autoFocus /></Field>
        <div className="grid g-2">
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} options={DOCUMENT_CATEGORY_OPTIONS} /></Field>
          <Field label="Authority" optional><Input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="CBSE, Municipality…" /></Field>
        </div>
        <div className="grid g-2">
          <Field label="Reference no." optional><Input value={refNo} onChange={(e) => setRefNo(e.target.value)} /></Field>
          <Field label="Document URL" optional hint="Hosted link (ImageKit upload coming soon)"><Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" /></Field>
        </div>
        <div className="grid g-2">
          <Field label="Issued on" optional><DatePicker value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} /></Field>
          <Field label="Valid till" optional><DatePicker value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>
        </div>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete document?" message={removing ? `"${removing.title}" will be removed from the vault.` : ''} confirmLabel="Delete" />
    </div>
  );
}
