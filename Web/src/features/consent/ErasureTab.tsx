import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents } from './data';
import {
  useErasureRequests,
  createErasureRequest,
  updateErasureRequest,
} from './registersData';
import {
  ERASURE_STATUS_META,
  ERASURE_NEXT,
  ERASURE_SUBJECT_OPTIONS,
  type ErasureRequest,
  type ErasureStatus,
} from './registerTypes';
import type { Actor } from './data';

const OPEN = new Set<ErasureStatus>(['requested', 'approved']);

/** DPDP right-to-erasure register: request → review → approve/reject → complete. */
export function ErasureTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('consent.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: requests, loading, error } = useErasureRequests(schoolId);
  const { data: students } = useStudents(schoolId);

  const [view, setView] = useState<'open' | 'all' | 'closed'>('open');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  // new-request form
  const [subjectType, setSubjectType] = useState<NonNullable<ErasureRequest['subjectType']>>('student');
  const [studentId, setStudentId] = useState('');
  const [subjectLabel, setSubjectLabel] = useState('');
  const [reason, setReason] = useState('');

  // review modal
  const [reviewing, setReviewing] = useState<ErasureRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [confirmComplete, setConfirmComplete] = useState<ErasureRequest | null>(null);

  const studentOptions = useMemo(
    () => [
      { value: '', label: 'Select a student…' },
      ...[...students]
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
    ],
    [students],
  );

  const rows = useMemo(
    () =>
      requests.filter((r) =>
        view === 'open' ? OPEN.has(r.status) : view === 'closed' ? !OPEN.has(r.status) : true,
      ),
    [requests, view],
  );

  const resetForm = () => {
    setSubjectType('student');
    setStudentId('');
    setSubjectLabel('');
    setReason('');
  };

  const submitRequest = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const student = subjectType === 'student' ? students.find((s) => s.id === studentId) : undefined;
      const payload: Omit<ErasureRequest, 'id'> = {
        schoolId,
        subjectType,
        studentId: subjectType === 'student' ? studentId || undefined : undefined,
        subjectLabel: subjectType === 'student' ? student?.fullName : subjectLabel.trim() || undefined,
        requestedBy: uid ?? undefined,
        requestedByName: member?.name,
        requestedAt: Date.now(),
        status: 'requested',
        reason: reason.trim() || undefined,
      };
      await createErasureRequest(schoolId, payload, actor);
      toast.success('Erasure request logged');
      setCreating(false);
      resetForm();
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (r: ErasureRequest, to: ErasureStatus) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await updateErasureRequest(
        schoolId,
        r.id,
        {
          status: to,
          decidedAt: Date.now(),
          decidedByName: member?.name,
          decisionNote: decisionNote.trim() || undefined,
        },
        actor,
      );
      toast.success(`Marked ${ERASURE_STATUS_META[to].label.toLowerCase()}`);
      setReviewing(null);
      setDecisionNote('');
    } catch {
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  const complete = async (r: ErasureRequest) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      // NEEDS YASHVEER / follow-up: cascading hard-delete of the data principal's
      // records across collections (students, attendance, fees, etc.) is NOT done
      // here. This only records that erasure was completed. Implement the actual
      // cascade (ideally a privileged server-side/Cloud Function job) before relying
      // on this for a real DPDP erasure.
      await updateErasureRequest(
        schoolId,
        r.id,
        { status: 'completed', completedAt: Date.now(), decidedByName: member?.name },
        actor,
      );
      toast.success('Marked completed', 'Cascading delete is a pending follow-up.');
      setConfirmComplete(null);
    } catch {
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="cns-note" role="note">
        <Icon name="shield-check" size={16} />
        <span>
          <strong>Right to erasure (DPDP).</strong> Log a data-principal's deletion request, review it, and
          record the outcome. Approve only where no legal retention obligation applies.
        </span>
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select
          value={view}
          onChange={(e) => setView(e.target.value as 'open' | 'all' | 'closed')}
          aria-label="View"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'all', label: 'All' },
          ]}
        />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => { resetForm(); setCreating(true); }}>
            New request
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load requests" message="Please try again." />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="minus-circle"
            title={view === 'closed' ? 'Nothing closed' : 'No erasure requests'}
            message={canWrite ? 'Log a deletion request to start the review workflow.' : 'Requests will appear here.'}
            action={
              canWrite && view !== 'closed' ? (
                <Button variant="gold" leftIcon="plus" onClick={() => { resetForm(); setCreating(true); }}>
                  New request
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="fin-kv-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => {
            const meta = ERASURE_STATUS_META[r.status];
            const next = ERASURE_NEXT[r.status];
            return (
              <div key={r.id} className="cns-rec">
                <div className="cns-rec__body">
                  <div className="cns-rec__name">
                    {r.subjectLabel || r.studentId || r.subjectId || 'Data principal'}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}· {ERASURE_SUBJECT_OPTIONS.find((o) => o.value === r.subjectType)?.label ?? r.subjectType ?? 'subject'}
                    </span>
                  </div>
                  <div className="cns-rec__meta">
                    Requested {formatDate(r.requestedAt)}
                    {r.requestedByName ? ` · by ${r.requestedByName}` : ''}
                    {r.reason ? ` · ${r.reason}` : ''}
                    {r.completedAt ? ` · completed ${formatDate(r.completedAt)}` : ''}
                  </div>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
                {canWrite && next.length > 0 && (
                  <div className="cns-rec__actions">
                    {r.status === 'approved' ? (
                      <Button variant="gold" size="sm" leftIcon="check" onClick={() => setConfirmComplete(r)}>
                        Complete
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => { setDecisionNote(r.decisionNote ?? ''); setReviewing(r); }}>
                        Review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New request */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        icon="minus-circle"
        tone="gold"
        title="New erasure request"
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>Cancel</Button>
            <Button
              variant="gold"
              leftIcon="check"
              loading={busy}
              disabled={subjectType === 'student' ? !studentId : !subjectLabel.trim()}
              onClick={submitRequest}
            >
              Log request
            </Button>
          </>
        }
      >
        <Field label="Subject type" required>
          <Select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as NonNullable<ErasureRequest['subjectType']>)}
            options={ERASURE_SUBJECT_OPTIONS}
          />
        </Field>
        {subjectType === 'student' ? (
          <Field label="Student" required>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} options={studentOptions} />
          </Field>
        ) : (
          <Field label="Subject" required hint="Name or reference of the data principal.">
            <Textarea value={subjectLabel} onChange={(e) => setSubjectLabel(e.target.value)} autoResize rows={1} placeholder="e.g. Mr. R. Verma (staff)" />
          </Field>
        )}
        <Field label="Reason" optional>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} autoResize rows={2} placeholder="Why erasure is requested…" />
        </Field>
      </Modal>

      {/* Review (approve / reject) */}
      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        icon="shield-check"
        tone="gold"
        title="Review erasure request"
        description={reviewing?.subjectLabel ?? reviewing?.studentId ?? undefined}
        size="md"
        dismissible={!busy}
        footer={
          reviewing ? (
            <>
              <Button variant="ghost" onClick={() => setReviewing(null)} disabled={busy}>Cancel</Button>
              {ERASURE_NEXT[reviewing.status].includes('rejected') && (
                <Button variant="subtle" leftIcon="x" loading={busy} onClick={() => decide(reviewing, 'rejected')}>
                  Reject
                </Button>
              )}
              {ERASURE_NEXT[reviewing.status].includes('approved') && (
                <Button variant="gold" leftIcon="check" loading={busy} onClick={() => decide(reviewing, 'approved')}>
                  Approve
                </Button>
              )}
            </>
          ) : null
        }
      >
        {reviewing && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
              {reviewing.reason || 'No reason provided.'}
            </p>
            <Field label="Decision note" optional>
              <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} autoResize rows={2} placeholder="Basis for approval/rejection (e.g. retention obligation)…" />
            </Field>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmComplete}
        onClose={() => setConfirmComplete(null)}
        onConfirm={() => { if (confirmComplete) void complete(confirmComplete); }}
        tone="danger"
        icon="minus-circle"
        loading={busy}
        title="Mark erasure completed?"
        message="This records the request as completed. The actual cascading deletion of the principal's data across the system is a pending follow-up and is NOT performed automatically yet."
        confirmLabel="Mark completed"
      />
    </div>
  );
}
