import { useMemo, useState } from 'react';
import { KPICard } from '@/components/KPICard';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useMaintenance, useAssets, useFacilities, createMaintenance, updateMaintenance } from '@/features/ops/data';
import {
  ASSET_CATEGORY_OPTIONS, MAINTENANCE_PRIORITY_META, MAINTENANCE_STATUS_META,
} from '@/features/ops/meta';
import type { MaintenanceRequest, MaintenancePriority, MaintenanceStatus, AssetCategory } from '@/types/ops';
import { nextTicketNo } from './facilitySchema';

const PRIORITY_OPTIONS = (Object.keys(MAINTENANCE_PRIORITY_META) as MaintenancePriority[])
  .map((v) => ({ value: v, label: MAINTENANCE_PRIORITY_META[v].label }));
const WORKFLOW_OPTIONS = (['open', 'assigned', 'in_progress', 'done', 'cancelled'] as MaintenanceStatus[])
  .map((v) => ({ value: v, label: MAINTENANCE_STATUS_META[v].label }));
const PRIORITY_ORDER: Record<MaintenancePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface RaiseDraft {
  title: string; description: string; assetId: string; facilityId: string;
  location: string; category: string; priority: MaintenancePriority;
}
const emptyRaise: RaiseDraft = { title: '', description: '', assetId: '', facilityId: '', location: '', category: '', priority: 'medium' };

interface WorkDraft { status: MaintenanceStatus; assignedTo: string; resolutionNote: string; cost: string }

export function MaintenanceTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  // Raising a maintenance request is open to any active staff member.
  // Managing tickets (status/assignment/resolution) belongs to Facilities/Estate.
  const canManage = useOwnership('facility').canOperate;
  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: tickets, loading, error } = useMaintenance(schoolId);
  const { data: assets } = useAssets(schoolId);
  const { data: facilities } = useFacilities(schoolId);

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [raising, setRaising] = useState(false);
  const [raise, setRaise] = useState<RaiseDraft>(emptyRaise);
  const [working, setWorking] = useState<MaintenanceRequest | null>(null);
  const [work, setWork] = useState<WorkDraft>({ status: 'open', assignedTo: '', resolutionNote: '', cost: '' });
  const [busy, setBusy] = useState(false);

  const assetOptions = [{ value: '', label: 'None' }, ...assets.map((a) => ({ value: a.id, label: a.tag ? `${a.name} · ${a.tag}` : a.name }))];
  const facilityOptions = [{ value: '', label: 'None' }, ...facilities.map((f) => ({ value: f.id, label: f.building ? `${f.name} · ${f.building}` : f.name }))];

  const rows = useMemo(() => {
    return tickets
      .filter((t) => (status ? t.status === status : true))
      .filter((t) => (priority ? t.priority === priority : true))
      .sort((a, b) =>
        (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) ||
        ((b.reportedAt ?? b.createdAt ?? 0) - (a.reportedAt ?? a.createdAt ?? 0)),
      );
  }, [tickets, status, priority]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
    const resolved = tickets.filter((t) => t.status === 'done').length;
    const urgent = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'done' && t.status !== 'cancelled').length;
    return { open, resolved, urgent };
  }, [tickets]);

  const raiseValid = raise.title.trim().length >= 3;

  const submitRaise = async () => {
    if (!schoolId || !raiseValid) return;
    setBusy(true);
    try {
      await createMaintenance(schoolId, {
        schoolId,
        ticketNo: nextTicketNo(tickets),
        title: raise.title.trim(),
        description: raise.description.trim() || undefined,
        assetId: raise.assetId || undefined,
        facilityId: raise.facilityId || undefined,
        location: raise.location.trim() || undefined,
        category: (raise.category || undefined) as AssetCategory | undefined,
        priority: raise.priority,
        status: 'open',
        reportedAt: Date.now(),
        reportedByUid: uid ?? undefined,
        reportedByName: member?.name,
      }, actor);
      toast.success('Ticket raised', raise.title.trim());
      setRaising(false); setRaise(emptyRaise);
    } catch { toast.error('Could not raise ticket'); } finally { setBusy(false); }
  };

  const openWork = (t: MaintenanceRequest) => {
    setWorking(t);
    setWork({ status: t.status, assignedTo: t.assignedTo ?? '', resolutionNote: t.resolutionNote ?? '', cost: t.cost != null ? String(t.cost) : '' });
  };

  const costValid = work.cost === '' || (!Number.isNaN(Number(work.cost)) && Number(work.cost) >= 0);

  const submitWork = async () => {
    if (!schoolId || !working || !costValid) return;
    setBusy(true);
    const isDone = work.status === 'done';
    try {
      await updateMaintenance(schoolId, working.id, {
        status: work.status,
        assignedTo: work.assignedTo.trim() || undefined,
        resolutionNote: work.resolutionNote.trim() || undefined,
        cost: work.cost ? Number(work.cost) : undefined,
        resolvedAt: isDone ? Date.now() : undefined,
      }, actor);
      toast.success('Ticket updated', working.ticketNo ?? working.title);
      setWorking(null);
    } catch { toast.error('Could not update ticket'); } finally { setBusy(false); }
  };

  const ctx = (t: MaintenanceRequest) => {
    const a = t.assetId ? assets.find((x) => x.id === t.assetId) : undefined;
    const f = t.facilityId ? facilities.find((x) => x.id === t.facilityId) : undefined;
    return [a?.name, f?.name, t.location].filter(Boolean).join(' · ');
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="alert-triangle" label="Open tickets" count={stats.open} format="us" subColor={stats.open ? 'var(--warning)' : undefined} />
        <KPICard icon="check-circle" label="Resolved" count={stats.resolved} format="us" />
        <KPICard icon="info" label="Urgent open" count={stats.urgent} format="us" subColor={stats.urgent ? 'var(--danger)' : undefined} />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <Select className="nx-toolbar__filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
            options={[{ value: '', label: 'All statuses' }, ...WORKFLOW_OPTIONS]} />
          <Select className="nx-toolbar__filter" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority"
            options={[{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS]} />
        </div>
        <Button variant="gold" leftIcon="plus" onClick={() => { setRaise(emptyRaise); setRaising(true); }}>Raise ticket</Button>
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load tickets" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="settings"
          title={status || priority ? 'No matching tickets' : 'No maintenance tickets'}
          message={status || priority ? 'Try a different filter.' : 'Raise a ticket when something needs repair.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((t) => {
            const context = ctx(t);
            return (
              <Panel key={t.id}>
                <div className="fac-ticket">
                  <div className="fac-ticket__head">
                    <span className="fac-card__icon" style={{ flexShrink: 0 }}><Icon name="settings" size={18} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="fac-badges">
                        <span className="fac-ticket__title">{t.title}</span>
                      </div>
                      {t.ticketNo && <div className="fac-ticket__no">{t.ticketNo}</div>}
                    </div>
                  </div>
                  {t.description && <div className="fac-ticket__desc">{t.description}</div>}
                  <div className="fac-badges">
                    <Badge variant={MAINTENANCE_STATUS_META[t.status].variant}>{MAINTENANCE_STATUS_META[t.status].label}</Badge>
                    <Badge variant={MAINTENANCE_PRIORITY_META[t.priority].variant}>{MAINTENANCE_PRIORITY_META[t.priority].label}</Badge>
                    {t.assignedTo && <Badge variant="info">{t.assignedTo}</Badge>}
                  </div>
                  <div className="fac-ticket__meta">
                    {context && <span>{context}</span>}
                    {t.reportedAt && <span>Raised {formatDate(t.reportedAt)}</span>}
                    {t.cost != null && <span>Cost {formatINR(t.cost)}</span>}
                  </div>
                  {t.resolutionNote && <div className="fac-ticket__desc" style={{ color: 'var(--text-muted)' }}>Resolution: {t.resolutionNote}</div>}
                  {canManage && (
                    <div className="fac-ticket__foot">
                      <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => openWork(t)}>Update</Button>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Raise ticket */}
      <Modal open={raising} onClose={() => setRaising(false)} icon="settings" tone="gold" title="Raise maintenance ticket" size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setRaising(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!raiseValid} onClick={submitRaise}>Raise ticket</Button>
        </>}>
        <Field label="Title" required><Input value={raise.title} onChange={(e) => setRaise({ ...raise, title: e.target.value })} autoFocus placeholder="e.g. Projector not switching on" /></Field>
        <Field label="Description" optional><Textarea value={raise.description} onChange={(e) => setRaise({ ...raise, description: e.target.value })} rows={2} placeholder="What's wrong, and any details" /></Field>
        <div className="nx-section__grid">
          <Field label="Priority" required>
            <Select value={raise.priority} onChange={(e) => setRaise({ ...raise, priority: e.target.value as MaintenancePriority })} options={PRIORITY_OPTIONS} />
          </Field>
          <Field label="Category" optional>
            <Select value={raise.category} onChange={(e) => setRaise({ ...raise, category: e.target.value })} placeholder="Select" options={ASSET_CATEGORY_OPTIONS} />
          </Field>
          <Field label="Asset" optional>
            <Select value={raise.assetId} onChange={(e) => setRaise({ ...raise, assetId: e.target.value })} options={assetOptions} />
          </Field>
          <Field label="Facility" optional>
            <Select value={raise.facilityId} onChange={(e) => setRaise({ ...raise, facilityId: e.target.value })} options={facilityOptions} />
          </Field>
          <Field label="Location" optional><Input value={raise.location} onChange={(e) => setRaise({ ...raise, location: e.target.value })} placeholder="Where is it?" /></Field>
        </div>
      </Modal>

      {/* Workflow update */}
      <Modal open={!!working} onClose={() => setWorking(null)} icon="settings" tone="gold"
        title={working ? `Update ${working.ticketNo ?? 'ticket'}` : 'Update ticket'} description={working?.title} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setWorking(null)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!costValid} onClick={submitWork}>Save</Button>
        </>}>
        <div className="nx-section__grid">
          <Field label="Status" required>
            <Select value={work.status} onChange={(e) => setWork({ ...work, status: e.target.value as MaintenanceStatus })} options={WORKFLOW_OPTIONS} />
          </Field>
          <Field label="Assigned to" optional><Input value={work.assignedTo} onChange={(e) => setWork({ ...work, assignedTo: e.target.value })} placeholder="Technician / vendor" /></Field>
          <Field label="Cost (₹)" optional><Input value={work.cost} onChange={(e) => setWork({ ...work, cost: e.target.value })} inputMode="numeric" type="number" min={0} prefix="₹" /></Field>
        </div>
        <Field label="Resolution note" optional><Textarea value={work.resolutionNote} onChange={(e) => setWork({ ...work, resolutionNote: e.target.value })} rows={2} placeholder="What was done to fix it" /></Field>
        {work.status === 'done' && <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><Icon name="check-circle" size={13} /> Marking as resolved stamps the resolution time.</p>}
      </Modal>
    </div>
  );
}
