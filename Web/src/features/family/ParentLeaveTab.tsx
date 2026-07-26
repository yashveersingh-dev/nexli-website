import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Select, Textarea, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { formatDate } from '@/lib/format';
import type { Student } from '@/types/sis';
import {
  useStudentLeaveForStudents, createStudentLeaveRequest, validateLeaveDates, leaveDays,
  type StudentLeaveRequest, type StudentLeaveStatus,
} from './studentLeave';

const STATUS_META: Record<StudentLeaveStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

/**
 * Parent "Leave requests" tab — a parent submits a leave request for their child
 * and sees the status of all requests they have raised. Scoped to the parent's
 * own children (`member.childStudentIds`); the request is reviewed by staff in
 * the HR student-leave queue.
 */
export function ParentLeaveTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const childIds = useMemo(() => member?.childStudentIds ?? [], [member]);
  const { data: children, loading: cLoading } = useStudentsByIds(schoolId, childIds);
  const { data: requests, loading, error } = useStudentLeaveForStudents(schoolId, childIds);
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => requests.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [requests]);

  const columns: Column<StudentLeaveRequest>[] = [
    { key: 'student', header: 'Student', primary: true, render: (r) => <span style={{ fontWeight: 600 }}>{r.studentName}</span> },
    { key: 'dates', header: 'Dates', render: (r) => `${formatDate(r.fromDate)} – ${formatDate(r.toDate)}` },
    { key: 'days', header: 'Days', align: 'right', hideOnMobile: true, render: (r) => leaveDays(r.fromDate, r.toDate) },
    { key: 'status', header: 'Status', render: (r) => { const m = STATUS_META[r.status]; return <Badge variant={m.variant}>{m.label}</Badge>; } },
  ];

  if (cLoading) return <Panel><Skeleton height={140} /></Panel>;

  if (childIds.length === 0) {
    return (
      <Panel>
        <EmptyState icon="users" title="No children linked yet"
          message="Your school will link your children to your account. Once done, you can request leave for them here." />
      </Panel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="gold" leftIcon="plus" onClick={() => setOpen(true)}>Request leave</Button>
      </div>
      <DataTable
        columns={columns}
        rows={sorted}
        rowKey={(r) => r.id}
        loading={loading}
        error={error ? 'Could not load your requests.' : null}
        emptyIcon="calendar"
        emptyTitle="No leave requests yet"
        emptyMessage="Request leave for your child and track its approval status here."
      />

      {open && (
        <RequestLeaveModal
          children={children}
          onClose={() => setOpen(false)}
          onSubmit={async (data) => {
            if (!schoolId) return;
            const child = children.find((c) => c.id === data.studentId);
            try {
              await createStudentLeaveRequest(schoolId, {
                schoolId,
                studentId: data.studentId,
                studentName: child?.fullName ?? 'Student',
                sectionId: child?.sectionId,
                gradeName: child?.gradeName,
                sectionName: child?.sectionName,
                requestedByUid: uid ?? 'unknown',
                requestedByName: member?.name ?? 'Parent',
                fromDate: data.fromDate,
                toDate: data.toDate,
                reason: data.reason,
                status: 'pending',
              }, { uid: uid ?? 'unknown', name: member?.name });
              toast.success('Leave requested', child?.fullName);
              setOpen(false);
            } catch {
              toast.error('Could not submit', 'It will sync when you are back online.');
            }
          }}
        />
      )}
    </div>
  );
}

function RequestLeaveModal({
  children, onClose, onSubmit,
}: {
  children: Student[];
  onClose: () => void;
  onSubmit: (d: { studentId: string; fromDate: number; toDate: number; reason: string }) => void;
}) {
  const [studentId, setStudentId] = useState(children.length === 1 ? children[0].id : '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const days = from && to ? leaveDays(new Date(`${from}T00:00:00`).getTime(), new Date(`${to}T00:00:00`).getTime()) : 0;

  const submit = () => {
    setErr(null);
    if (!studentId) return setErr('Select your child.');
    const dateErrors = validateLeaveDates(from, to, reason);
    if (dateErrors.length) return setErr(dateErrors[0].message);
    onSubmit({
      studentId,
      fromDate: new Date(`${from}T00:00:00`).getTime(),
      toDate: new Date(`${to}T00:00:00`).getTime(),
      reason: reason.trim(),
    });
  };

  return (
    <Modal open onClose={onClose} title="Request leave" icon="calendar" tone="gold"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="gold" onClick={submit}>Submit request</Button></>}>
      {err && <p className="nx-field__error" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Child" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select child" options={children.map((c) => ({ value: c.id, label: c.fullName }))} />
        </Field>
        <div className="nx-section__grid">
          <Field label="From" required><DatePicker value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To" required><DatePicker value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} /></Field>
        </div>
        {days > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{days} day{days === 1 ? '' : 's'}</p>}
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Family function, medical appointment" /></Field>
      </div>
    </Modal>
  );
}
