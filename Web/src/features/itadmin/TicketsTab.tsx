import { useMemo, useState } from 'react';
import { KPICard } from '@/components/KPICard';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Input, Select, Textarea } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useItTickets, createItTicket, updateItTicket, nextTicketNo } from './data';
import {
  TICKET_CATEGORY_META, TICKET_CATEGORY_OPTIONS,
  TICKET_PRIORITY_META, TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_META, TICKET_STATUS_OPTIONS, OPEN_TICKET_STATUSES,
} from './meta';
import type { ItTicket, TicketCategory, TicketPriority, TicketStatus } from './types';

interface RaiseForm { title: string; category: TicketCategory; priority: TicketPriority; location: string; description: string }
const emptyRaise: RaiseForm = { title: '', category: 'hardware', priority: 'medium', location: '', description: '' };

export function TicketsTab({ canManage }: { canManage: boolean }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: tickets, loading, error } = useItTickets(schoolId);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [raising, setRaising] = useState(false);
  const [form, setForm] = useState<RaiseForm>(emptyRaise);
  const [triaging, setTriaging] = useState<ItTicket | null>(null);
  const [busy, setBusy] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets
      .filter((t) => (status ? t.status === status : true))
      .filter((t) => (needle
        ? [t.ticketNo, t.title, t.description, t.location, t.raisedByName, t.assignedToName].some((x) => x?.toLowerCase().includes(needle))
        : true))
      .sort((a, b) => (b.raisedAt ?? 0) - (a.raisedAt ?? 0));
  }, [tickets, q, status]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const vendor = tickets.filter((t) => t.status === 'vendor').length;
    const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    return { open, inProgress, vendor, resolved };
  }, [tickets]);

  const doRaise = async () => {
    if (!schoolId || !form.title.trim()) return;
    setBusy(true);
    try {
      await createItTicket(schoolId, {
        schoolId,
        ticketNo: nextTicketNo(tickets),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        priority: form.priority,
        status: 'open',
        location: form.location.trim() || undefined,
        raisedByUid: actor.uid,
        raisedByName: actor.name,
        raisedAt: Date.now(),
      }, actor);
      toast.success('Ticket raised', 'IT has been notified.');
      setRaising(false);
      setForm(emptyRaise);
    } catch { toast.error('Could not raise ticket', 'Please try again.'); } finally { setBusy(false); }
  };

  const columns: Column<ItTicket>[] = [
    {
      key: 'title', header: 'Ticket', primary: true,
      render: (t) => (
        <span className="ita-name">
          <span className="ita-name__icon"><Icon name={TICKET_CATEGORY_META[t.category].icon} size={16} /></span>
          <span className="ita-name__text">
            <span className="ita-name__title">
              <span className="ita-name__label">{t.title}</span>
              <Badge variant={TICKET_PRIORITY_META[t.priority].variant}>{TICKET_PRIORITY_META[t.priority].label}</Badge>
            </span>
            <span className="ita-name__sub">
              {t.ticketNo ? `${t.ticketNo} · ` : ''}{TICKET_CATEGORY_META[t.category].label}
              {t.raisedByName ? ` · ${t.raisedByName}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    { key: 'assignedToName', header: 'Assigned', hideOnMobile: true, render: (t) => t.assignedToName || <span className="ita-muted">Unassigned</span> },
    { key: 'raisedAt', header: 'Raised', hideOnMobile: true, render: (t) => (t.raisedAt ? formatRelative(t.raisedAt) : '—') },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (t) => <Badge variant={TICKET_STATUS_META[t.status].variant}>{TICKET_STATUS_META[t.status].label}</Badge>,
    },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search number, title, reporter…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tickets" />
      </div>
      <Select className="nx-toolbar__filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
        options={[{ value: '', label: 'All statuses' }, ...TICKET_STATUS_OPTIONS]} />
    </div>
  );

  const filtered = !!(q || status);

  return (
    <div>
      <div className="kpi-grid kpi-grid--4">
        <KPICard icon="help-circle" label="Open" count={stats.open} format="us" subColor={stats.open ? 'var(--danger)' : undefined} />
        <KPICard icon="clock" label="In progress" count={stats.inProgress} format="us" />
        <KPICard icon="external-link" label="With vendor" count={stats.vendor} format="us" />
        <KPICard icon="check-circle" label="Resolved" count={stats.resolved} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>IT helpdesk — any staff member can raise a ticket; IT triages and resolves.</p>
        <Button variant="gold" leftIcon="plus" onClick={() => { setForm(emptyRaise); setRaising(true); }}>Raise ticket</Button>
      </div>

      <DataTable
        columns={columns} rows={rows} rowKey={(t) => t.id} loading={loading}
        error={error ? 'Could not load the ticket queue.' : null}
        toolbar={toolbar}
        onRowClick={canManage ? (t) => setTriaging(t) : undefined}
        actions={canManage ? (t) => (
          <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Triage ${t.title}`} onClick={() => setTriaging(t)}>Triage</Button>
        ) : undefined}
        emptyIcon="help-circle"
        emptyTitle={filtered ? 'No matching tickets' : 'No tickets yet'}
        emptyMessage={filtered ? 'Try a different search or filter.' : 'Raise a ticket and it will appear here for IT to triage.'}
      />

      <p style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon name="info" size={13} /> L1 issues are resolved by IT in-house; anything needing a third party is set to <strong style={{ margin: '0 3px' }}>With vendor</strong> with a note.
      </p>

      {/* Raise — any staff member */}
      <Modal
        open={raising} onClose={() => setRaising(false)} size="md" icon="help-circle" tone="gold"
        title="Raise a support ticket" description="Describe the issue — IT will triage and respond."
        dismissible={!busy}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRaising(false)} disabled={busy}>Cancel</Button>
            <Button type="button" variant="gold" loading={busy} disabled={!form.title.trim()} onClick={() => void doRaise()}>Raise ticket</Button>
          </>
        }
      >
        <div className="ita-form-grid">
          <Field label="Issue" className="ita-col-full">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Projector in Lab 2 not turning on" aria-label="Issue title" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TicketCategory }))} options={TICKET_CATEGORY_OPTIONS} aria-label="Category" />
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))} options={TICKET_PRIORITY_OPTIONS} aria-label="Priority" />
          </Field>
          <Field label="Location" className="ita-col-full">
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Room / lab / office" aria-label="Location" />
          </Field>
          <Field label="Details" className="ita-col-full">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happened, when, any error messages…" aria-label="Details" />
          </Field>
        </div>
      </Modal>

      {/* Triage — IT only */}
      {triaging && (
        <TriageModal
          ticket={triaging}
          onClose={() => setTriaging(null)}
          onSaved={() => setTriaging(null)}
          schoolId={schoolId}
          actor={actor}
        />
      )}
    </div>
  );
}

function TriageModal({
  ticket, onClose, onSaved, schoolId, actor,
}: { ticket: ItTicket; onClose: () => void; onSaved: () => void; schoolId?: string; actor: { uid: string; name?: string } }) {
  const toast = useToast();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [assignedToName, setAssignedToName] = useState(ticket.assignedToName ?? actor.name ?? '');
  const [resolutionNotes, setResolutionNotes] = useState(ticket.resolutionNotes ?? '');
  const [busy, setBusy] = useState(false);

  const isResolving = status === 'resolved' || status === 'closed';
  const isVendor = status === 'vendor';

  const save = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await updateItTicket(schoolId, ticket.id, {
        status,
        priority,
        assignedToName: assignedToName.trim() || undefined,
        assignedToUid: assignedToName.trim()
          ? (assignedToName.trim() === (ticket.assignedToName ?? '') ? ticket.assignedToUid : actor.uid)
          : undefined,
        resolutionNotes: resolutionNotes.trim() || undefined,
        resolvedAt: isResolving ? (ticket.resolvedAt ?? Date.now()) : undefined,
      }, actor);
      toast.success('Ticket updated', ticket.ticketNo ?? ticket.title);
      onSaved();
    } catch { toast.error('Could not update', 'Please try again.'); } finally { setBusy(false); }
  };

  return (
    <Modal
      open onClose={onClose} size="md" icon="edit" tone="gold"
      title="Triage ticket"
      description={`${ticket.ticketNo ? `${ticket.ticketNo} · ` : ''}${ticket.title}`}
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" variant="gold" loading={busy} onClick={() => void save()}>Save</Button>
        </>
      }
    >
      {ticket.description && <p className="ita-triage__desc">{ticket.description}</p>}
      <div className="ita-form-grid">
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)} options={TICKET_STATUS_OPTIONS} aria-label="Status" />
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} options={TICKET_PRIORITY_OPTIONS} aria-label="Priority" />
        </Field>
        <Field label="Assigned to (IT)" className="ita-col-full">
          <Input value={assignedToName} onChange={(e) => setAssignedToName(e.target.value)} placeholder="IT staff member" aria-label="Assigned to" />
        </Field>
        <Field
          label={isVendor ? 'Vendor / escalation note' : 'Resolution notes'}
          className="ita-col-full"
          hint={isVendor ? 'Vendor name, ticket reference and expected turnaround.' : 'What was done to resolve the issue.'}
        >
          <Textarea rows={3} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder={isVendor ? 'e.g. Escalated to Acer service — ref AC-8841, ETA 3 days' : 'e.g. Replaced HDMI cable; projector working'}
            aria-label={isVendor ? 'Vendor note' : 'Resolution notes'} />
        </Field>
      </div>
      {OPEN_TICKET_STATUSES.includes(status) && (
        <p className="ita-triage__hint"><Icon name="info" size={13} /> This ticket stays in the open queue until resolved or closed.</p>
      )}
    </Modal>
  );
}
