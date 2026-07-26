import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Select, Textarea } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { formatDate } from '@/lib/format';
import {
  useStudentLeaveRequests, decideStudentLeave, leaveDays,
  type StudentLeaveRequest, type StudentLeaveStatus,
} from '@/features/family/studentLeave';
import '@/features/school/school.css';

const STATUS_META: Record<StudentLeaveStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

/**
 * Staff-facing student-leave queue (HR tab). Class teachers / admins list every
 * student leave request parents have submitted and approve or reject them. Write
 * access is gated on `hr.write` (HR/leadership) OR `attendance.write` (class
 * teachers, who own day-to-day student leave).
 */
export function StudentLeavePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canDecide = can('hr.write') || can('attendance.write') || can('students.write');
  const { data: requests, loading, error } = useStudentLeaveRequests(schoolId);

  const [status, setStatus] = useState('');
  const [reject, setReject] = useState<StudentLeaveRequest | null>(null);

  const filtered = useMemo(
    () => requests
      .filter((r) => !status || r.status === status)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [requests, status],
  );

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  const decide = async (r: StudentLeaveRequest, next: 'approved' | 'rejected', note?: string) => {
    if (!schoolId) return;
    try {
      await decideStudentLeave(schoolId, r.id, next, { uid: uid ?? 'unknown', name: member?.name }, note);
      toast.success(`Leave ${next}`, r.studentName);
      setReject(null);
    } catch {
      toast.error('Action failed', 'Please try again.');
    }
  };

  const columns: Column<StudentLeaveRequest>[] = [
    {
      key: 'student', header: 'Student', primary: true,
      render: (r) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.studentName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {[r.gradeName, r.sectionName].filter(Boolean).join(' · ') || 'Requested by ' + r.requestedByName}
          </div>
        </div>
      ),
    },
    { key: 'dates', header: 'Dates', render: (r) => `${formatDate(r.fromDate)} – ${formatDate(r.toDate)}` },
    { key: 'days', header: 'Days', align: 'right', hideOnMobile: true, render: (r) => leaveDays(r.fromDate, r.toDate) },
    { key: 'reason', header: 'Reason', hideOnMobile: true, render: (r) => <span style={{ color: 'var(--text-muted)' }}>{r.reason}</span> },
    { key: 'status', header: 'Status', render: (r) => { const m = STATUS_META[r.status]; return <Badge variant={m.variant}>{m.label}</Badge>; } },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <button type="button" className="nx-formpage__back" style={{ marginBottom: 10 }} onClick={() => navigate('/hr')} aria-label="Back to HR"><Icon name="chevron-left" size={18} /></button>
          <h1 className="nx-page__title">Student leave requests</h1>
          <p className="nx-page__sub">{loading ? 'Loading…' : `${pendingCount} pending of ${requests.length} total`}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error ? 'Could not load student leave requests.' : null}
        emptyIcon="calendar"
        emptyTitle="No student leave requests"
        emptyMessage="Leave requests submitted by parents will appear here for review."
        actions={canDecide ? (r) => r.status === 'pending' ? (
          <>
            <Button size="sm" variant="subtle" onClick={() => decide(r, 'approved')}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => setReject(r)}>Reject</Button>
          </>
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {r.decidedByName ? `by ${r.decidedByName}` : '—'}
          </span>
        ) : undefined}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__filter" style={{ marginLeft: 'auto' }}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
                options={[{ value: '', label: 'All statuses' }, ...Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
            </div>
          </div>
        }
      />

      {reject && (
        <RejectModal
          request={reject}
          onClose={() => setReject(null)}
          onConfirm={(note) => decide(reject, 'rejected', note)}
        />
      )}
    </div>
  );
}

function RejectModal({
  request, onClose, onConfirm,
}: {
  request: StudentLeaveRequest;
  onClose: () => void;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal open onClose={onClose} title="Reject leave request" icon="x" tone="danger"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => onConfirm(note)}>Reject</Button></>}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Reject the leave request for <strong style={{ color: 'var(--text)' }}>{request.studentName}</strong>? You can add an optional note for the parent.
      </p>
      <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Reason for rejection" /></Field>
    </Modal>
  );
}
