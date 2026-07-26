import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Select, Textarea, DatePicker } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useLeaveRequests, useStaff, createLeaveRequest, updateLeaveRequest } from '@/features/school/data';
import { LEAVE_TYPE_OPTIONS, LEAVE_STATUS_META } from '@/features/school/meta';
import { formatDate } from '@/lib/format';
import type { LeaveRequest, LeaveStatus } from '@/types/hr';
import '@/features/school/school.css';

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
  return d > 0 ? d : 0;
}

export function LeaveRequestsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canManage = can('hr.write') || can('leave.write');
  const { data: leaves, loading, error } = useLeaveRequests(schoolId);
  const { data: staff } = useStaff(schoolId);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => leaves.filter((l) => !status || l.status === status).sort((a, b) => (b.appliedDate ?? 0) - (a.appliedDate ?? 0)),
    [leaves, status],
  );

  const act = async (l: LeaveRequest, next: LeaveStatus) => {
    if (!schoolId) return;
    try {
      await updateLeaveRequest(schoolId, l.id, { status: next, approverUid: uid ?? undefined, approverName: member?.name }, { uid: uid ?? 'unknown', name: member?.name });
      toast.success(`Leave ${next}`, l.staffName);
    } catch {
      toast.error('Action failed');
    }
  };

  const columns: Column<LeaveRequest>[] = [
    { key: 'staff', header: 'Staff', primary: true, render: (l) => <span style={{ fontWeight: 600 }}>{l.staffName}</span> },
    { key: 'type', header: 'Type', render: (l) => LEAVE_TYPE_OPTIONS.find((t) => t.value === l.type)?.label ?? l.type },
    { key: 'dates', header: 'Dates', render: (l) => `${formatDate(l.fromDate)} – ${formatDate(l.toDate)}` },
    { key: 'days', header: 'Days', align: 'right', render: (l) => l.days },
    { key: 'status', header: 'Status', render: (l) => { const m = LEAVE_STATUS_META[l.status]; return <Badge variant={m.variant}>{m.label}</Badge>; } },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <button type="button" className="nx-formpage__back" style={{ marginBottom: 10 }} onClick={() => navigate('/hr')} aria-label="Back to HR"><Icon name="chevron-left" size={18} /></button>
          <h1 className="nx-page__title">Leave requests</h1>
          <p className="nx-page__sub">{loading ? 'Loading…' : `${filtered.length} request${filtered.length === 1 ? '' : 's'}`}</p>
        </div>
        <Button variant="gold" leftIcon="plus" onClick={() => setOpen(true)}>Apply leave</Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(l) => l.id}
        loading={loading}
        error={error ? 'Could not load leave requests.' : null}
        emptyIcon="calendar"
        emptyTitle="No leave requests"
        emptyMessage="Apply for leave or wait for staff submissions."
        actions={canManage ? (l) => l.status === 'pending' ? (
          <>
            <Button size="sm" variant="subtle" onClick={() => act(l, 'approved')}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => act(l, 'rejected')}>Reject</Button>
          </>
        ) : <Badge variant={LEAVE_STATUS_META[l.status].variant}>{LEAVE_STATUS_META[l.status].label}</Badge> : undefined}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__filter" style={{ marginLeft: 'auto' }}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
                options={[{ value: '', label: 'All statuses' }, ...Object.entries(LEAVE_STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
            </div>
          </div>
        }
      />

      {open && <ApplyLeaveModal staff={staff} onClose={() => setOpen(false)} onSubmit={async (data) => {
        if (!schoolId) return;
        try {
          await createLeaveRequest(schoolId, { ...data, schoolId, status: 'pending', appliedDate: Date.now() }, { uid: uid ?? 'unknown', name: member?.name });
          toast.success('Leave applied', data.staffName);
          setOpen(false);
        } catch { toast.error('Could not apply'); }
      }} />}
    </div>
  );
}

function ApplyLeaveModal({
  staff, onClose, onSubmit,
}: {
  staff: { id: string; uid?: string; name: string }[];
  onClose: () => void;
  onSubmit: (d: { staffUid: string; staffName: string; type: LeaveRequest['type']; fromDate: number; toDate: number; days: number; reason?: string }) => void;
}) {
  const [staffId, setStaffId] = useState('');
  const [type, setType] = useState('casual');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const days = daysBetween(from, to);

  const submit = () => {
    const member = staff.find((s) => s.id === staffId);
    if (!member) return setErr('Select a staff member.');
    if (!from || !to || days <= 0) return setErr('Select a valid date range.');
    onSubmit({ staffUid: member.uid ?? member.id, staffName: member.name, type: type as LeaveRequest['type'], fromDate: new Date(from).getTime(), toDate: new Date(to).getTime(), days, reason: reason || undefined });
  };

  return (
    <Modal open onClose={onClose} title="Apply for leave" icon="calendar" tone="gold"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="gold" onClick={submit}>Submit</Button></>}>
      {err && <p className="nx-field__error" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Staff member" required><Select value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Select staff" options={staff.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="Leave type"><Select value={type} onChange={(e) => setType(e.target.value)} options={LEAVE_TYPE_OPTIONS} /></Field>
        <div className="nx-section__grid">
          <Field label="From"><DatePicker value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><DatePicker value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} /></Field>
        </div>
        {days > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{days} day{days === 1 ? '' : 's'}</p>}
        <Field label="Reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional" /></Field>
      </div>
    </Modal>
  );
}
