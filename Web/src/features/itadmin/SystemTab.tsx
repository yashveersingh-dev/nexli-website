import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useItBackups, recordItBackup,
  useItIntegrations, saveItIntegration, updateItIntegration,
} from './data';
import {
  BACKUP_SCOPE_META, BACKUP_SCOPE_OPTIONS, BACKUP_RESULT_META, BACKUP_RESULT_OPTIONS,
  INTEGRATION_KIND_META, INTEGRATION_KIND_OPTIONS, INTEGRATION_STATUS_META, INTEGRATION_STATUS_OPTIONS,
} from './meta';
import type { ItBackup, ItIntegration, BackupScope, BackupResult, IntegrationKind, IntegrationStatus } from './types';

export function SystemTab({ canManage }: { canManage: boolean }) {
  const { can } = useSession();
  const navigate = useNavigate();
  const canSeeUsers = can('users.manage') || can('user.manage');
  const canSeeAudit = can('audit.read');

  return (
    <div className="ita-stack">
      <BackupLog canManage={canManage} />
      <IntegrationRegistry canManage={canManage} />

      <Panel title="System surfaces" sub="Where IT manages people & evidence">
        <div className="ita-links">
          <button type="button" className="ita-link" disabled={!canSeeUsers} onClick={() => canSeeUsers && navigate('/users')}>
            <span className="ita-link__icon"><Icon name="users" size={18} /></span>
            <span className="ita-link__text">
              <span className="ita-link__title">Users &amp; roles</span>
              <span className="ita-link__sub">Account lifecycle &amp; role provisioning within the approved matrix.</span>
            </span>
            {canSeeUsers ? <Icon name="arrow-right" size={16} /> : <Badge variant="muted">No access</Badge>}
          </button>
          <button type="button" className="ita-link" disabled={!canSeeAudit} onClick={() => canSeeAudit && navigate('/it-admin?tab=security')}>
            <span className="ita-link__icon"><Icon name="shield-check" size={18} /></span>
            <span className="ita-link__text">
              <span className="ita-link__title">Audit log</span>
              <span className="ita-link__sub">Recent system events — see the Security &amp; Audit tab.</span>
            </span>
            {canSeeAudit ? <Icon name="arrow-right" size={16} /> : <Badge variant="muted">No access</Badge>}
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------- Backup log ------------------------------- */

interface BackupForm { scope: BackupScope; result: BackupResult; destination: string; sizeLabel: string; notes: string }
const emptyBackup: BackupForm = { scope: 'full', result: 'success', destination: '', sizeLabel: '', notes: '' };

function BackupLog({ canManage }: { canManage: boolean }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: backups, loading, error } = useItBackups(schoolId);
  const [recording, setRecording] = useState(false);
  const [form, setForm] = useState<BackupForm>(emptyBackup);
  const [busy, setBusy] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const rows = useMemo(() => [...backups].sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0)), [backups]);

  const doRecord = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await recordItBackup(schoolId, {
        schoolId,
        takenAt: Date.now(),
        scope: form.scope,
        result: form.result,
        destination: form.destination.trim() || undefined,
        sizeLabel: form.sizeLabel.trim() || undefined,
        takenByUid: actor.uid,
        takenByName: actor.name,
        notes: form.notes.trim() || undefined,
      }, actor);
      toast.success('Backup recorded', BACKUP_SCOPE_META[form.scope].label);
      setRecording(false);
      setForm(emptyBackup);
    } catch { toast.error('Could not record', 'Please try again.'); } finally { setBusy(false); }
  };

  const columns: Column<ItBackup>[] = [
    {
      key: 'scope', header: 'Backup', primary: true,
      render: (b) => (
        <span className="ita-name">
          <span className="ita-name__icon"><Icon name="database" size={16} /></span>
          <span className="ita-name__text">
            <span className="ita-name__label">{BACKUP_SCOPE_META[b.scope].label}</span>
            <span className="ita-name__sub">{b.destination || 'No destination noted'}{b.sizeLabel ? ` · ${b.sizeLabel}` : ''}</span>
          </span>
        </span>
      ),
    },
    { key: 'takenAt', header: 'When', render: (b) => <span title={formatDate(b.takenAt, 'DD MMM YYYY, HH:mm')}>{formatRelative(b.takenAt)}</span> },
    { key: 'takenByName', header: 'By', hideOnMobile: true, render: (b) => b.takenByName || '—' },
    { key: 'result', header: 'Result', align: 'right', render: (b) => <Badge variant={BACKUP_RESULT_META[b.result].variant}>{BACKUP_RESULT_META[b.result].label}</Badge> },
  ];

  const last = rows[0];

  return (
    <Panel
      title="Backup log"
      sub={last ? `Last: ${formatRelative(last.takenAt)}` : 'No backups logged'}
      headerRight={canManage ? <Button variant="subtle" size="sm" leftIcon="plus" onClick={() => { setForm(emptyBackup); setRecording(true); }}>Record backup</Button> : undefined}
    >
      <InfoCard icon="info" title="This is an append-only log, not a backup job">
        These entries are a manual record that a backup was taken (date, scope, result). NEXLI does not
        run the backup here — on a future Blaze upgrade a scheduled Cloud Function would append these
        entries automatically. Entries are append-only and cannot be edited or deleted, so the log stays
        a trustworthy history.
      </InfoCard>

      <DataTable
        columns={columns} rows={rows} rowKey={(b) => b.id} loading={loading}
        error={error ? 'Could not load the backup log.' : null}
        emptyIcon="database" emptyTitle="No backups logged yet"
        emptyMessage={canManage ? 'Record your first backup to start the log.' : 'Backup records will appear here.'}
      />

      <Modal
        open={recording} onClose={() => setRecording(false)} size="md" icon="database" tone="gold"
        title="Record a backup" description="Log that a backup was taken." dismissible={!busy}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRecording(false)} disabled={busy}>Cancel</Button>
            <Button type="button" variant="gold" loading={busy} onClick={() => void doRecord()}>Record</Button>
          </>
        }
      >
        <div className="ita-form-grid">
          <Field label="Scope">
            <Select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as BackupScope }))} options={BACKUP_SCOPE_OPTIONS} aria-label="Scope" />
          </Field>
          <Field label="Result">
            <Select value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value as BackupResult }))} options={BACKUP_RESULT_OPTIONS} aria-label="Result" />
          </Field>
          <Field label="Destination" className="ita-col-full">
            <Input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder="e.g. Google Drive · IT vault" aria-label="Destination" />
          </Field>
          <Field label="Size">
            <Input value={form.sizeLabel} onChange={(e) => setForm((f) => ({ ...f, sizeLabel: e.target.value }))} placeholder="e.g. 2.4 GB" aria-label="Size" />
          </Field>
          <Field label="Notes" className="ita-col-full">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Anything noteworthy about this run" aria-label="Notes" />
          </Field>
        </div>
      </Modal>
    </Panel>
  );
}

/* ---------------------------- Integration seam ---------------------------- */

interface IntegrationForm { kind: IntegrationKind; name: string; vendor: string; status: IntegrationStatus; endpoint: string; mappingNote: string; notes: string }

function IntegrationRegistry({ canManage }: { canManage: boolean }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: integrations, loading, error } = useItIntegrations(schoolId);
  const [editing, setEditing] = useState<ItIntegration | 'new' | null>(null);
  const [busy, setBusy] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const rows = useMemo(() => [...integrations].sort((a, b) => a.name.localeCompare(b.name)), [integrations]);

  const columns: Column<ItIntegration>[] = [
    {
      key: 'name', header: 'Integration', primary: true,
      render: (i) => (
        <span className="ita-name">
          <span className="ita-name__icon"><Icon name={INTEGRATION_KIND_META[i.kind].icon} size={16} /></span>
          <span className="ita-name__text">
            <span className="ita-name__label">{i.name}</span>
            <span className="ita-name__sub">{INTEGRATION_KIND_META[i.kind].label}{i.vendor ? ` · ${i.vendor}` : ''}</span>
          </span>
        </span>
      ),
    },
    { key: 'mappingNote', header: 'Mapping', hideOnMobile: true, render: (i) => i.mappingNote || i.endpoint || '—' },
    { key: 'status', header: 'Status', align: 'right', render: (i) => <Badge variant={INTEGRATION_STATUS_META[i.status].variant}>{INTEGRATION_STATUS_META[i.status].label}</Badge> },
  ];

  return (
    <Panel
      title="Integrations"
      sub="CCTV · biometric · SMS · LMS"
      headerRight={canManage ? <Button variant="subtle" size="sm" leftIcon="plus" onClick={() => setEditing('new')}>Add integration</Button> : undefined}
    >
      <InfoCard icon="settings" title="Documented integration seam">
        Each record holds <strong>non-secret</strong> config (vendor, endpoint, device mapping). On a
        future Blaze upgrade, Cloud Functions read these records to own the live connection and any
        credentials — the client never holds secrets and makes no network calls here.
      </InfoCard>

      <DataTable
        columns={columns} rows={rows} rowKey={(i) => i.id} loading={loading}
        error={error ? 'Could not load integrations.' : null}
        onRowClick={canManage ? (i) => setEditing(i) : undefined}
        actions={canManage ? (i) => (
          <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i)} />
        ) : undefined}
        emptyIcon="wifi" emptyTitle="No integrations registered"
        emptyMessage={canManage ? 'Register CCTV, biometric, SMS or LMS connections here.' : 'Registered integrations will appear here.'}
      />

      {editing && (
        <IntegrationModal
          record={editing === 'new' ? null : editing}
          schoolId={schoolId}
          actor={actor}
          busy={busy}
          setBusy={setBusy}
          onClose={() => setEditing(null)}
          onSaved={() => { toast.success('Integration saved'); setEditing(null); }}
          onError={() => toast.error('Could not save', 'Please try again.')}
        />
      )}
    </Panel>
  );
}

function IntegrationModal({
  record, schoolId, actor, busy, setBusy, onClose, onSaved, onError,
}: {
  record: ItIntegration | null;
  schoolId?: string;
  actor: { uid: string; name?: string };
  busy: boolean;
  setBusy: (b: boolean) => void;
  onClose: () => void;
  onSaved: () => void;
  onError: () => void;
}) {
  const [form, setForm] = useState<IntegrationForm>({
    kind: record?.kind ?? 'cctv',
    name: record?.name ?? '',
    vendor: record?.vendor ?? '',
    status: record?.status ?? 'not_configured',
    endpoint: record?.endpoint ?? '',
    mappingNote: record?.mappingNote ?? '',
    notes: record?.notes ?? '',
  });

  const save = async () => {
    if (!schoolId || !form.name.trim()) return;
    setBusy(true);
    try {
      const payload = {
        kind: form.kind,
        name: form.name.trim(),
        vendor: form.vendor.trim() || undefined,
        status: form.status,
        endpoint: form.endpoint.trim() || undefined,
        mappingNote: form.mappingNote.trim() || undefined,
        notes: form.notes.trim() || undefined,
        lastCheckedAt: Date.now(),
      };
      if (record) {
        await updateItIntegration(schoolId, record.id, payload, actor);
      } else {
        const id = `${form.kind}_${Date.now()}`;
        await saveItIntegration(schoolId, id, { ...payload, schoolId }, actor);
      }
      onSaved();
    } catch { onError(); } finally { setBusy(false); }
  };

  return (
    <Modal
      open onClose={onClose} size="md" icon={INTEGRATION_KIND_META[form.kind].icon} tone="gold"
      title={record ? 'Edit integration' : 'Add integration'}
      description={INTEGRATION_KIND_META[form.kind].blurb}
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" variant="gold" loading={busy} disabled={!form.name.trim()} onClick={() => void save()}>Save</Button>
        </>
      }
    >
      {!schoolId ? (
        <EmptyState icon="school" title="No school context" />
      ) : (
        <div className="ita-form-grid">
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as IntegrationKind }))} options={INTEGRATION_KIND_OPTIONS} aria-label="Type" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as IntegrationStatus }))} options={INTEGRATION_STATUS_OPTIONS} aria-label="Status" />
          </Field>
          <Field label="Name" className="ita-col-full">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Main gate cameras" aria-label="Name" />
          </Field>
          <Field label="Vendor">
            <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Provider" aria-label="Vendor" />
          </Field>
          <Field label="Endpoint" hint="Non-secret base URL only.">
            <Input value={form.endpoint} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} placeholder="https://…" aria-label="Endpoint" />
          </Field>
          <Field label="Mapping note" className="ita-col-full" hint="How the device/system maps into NEXLI.">
            <Input value={form.mappingNote} onChange={(e) => setForm((f) => ({ ...f, mappingNote: e.target.value }))} placeholder="e.g. Camera 1 → Main Gate" aria-label="Mapping note" />
          </Field>
          <Field label="Notes" className="ita-col-full">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Config notes (no secrets)" aria-label="Notes" />
          </Field>
        </div>
      )}
    </Modal>
  );
}
