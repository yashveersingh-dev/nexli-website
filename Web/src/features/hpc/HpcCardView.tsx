import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { ConfirmModal } from '@/components/Modal';
import { Field } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatRelative } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useHpcCard, submitHpcCard, reviewHpcCard, type Actor } from '@/features/analytics/data';
import { HpcCardDoc } from './HpcCardDoc';
import {
  statusOf, canApproveHpc, canSubmitStatus, canReviewStatus, canEditStatus,
  HPC_STATUS_META, submitPatch, approvePatch, returnPatch,
} from './hpcWorkflow';

/**
 * Read-only, printable HPC card view + approval action bar. Reused by staff
 * (`/hpc/:id`) and parents/students (`MyHpcRoutes` → `/hpc/:id`). When
 * `requirePublished` is set (parent/student), an unpublished/foreign card is
 * hidden behind an honest empty state rather than leaked.
 */
export function HpcCardView({ basePath = '/hpc', requirePublished = false }: { basePath?: string; requirePublished?: boolean }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, school, role, member, uid, can } = useSession();
  const { data: card, loading } = useHpcCard(schoolId, id);

  // Edit/submit are operate actions (card authors); leadership only reviews (approve/return).
  const canWrite = useOwnership('hpc').canOperate;
  const isApprover = canApproveHpc(role, can);
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const [action, setAction] = useState<null | 'submit' | 'approve' | 'return'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // For parent/student views, restrict to the linked child(ren)/self.
  const allowedStudentIds = useMemo<string[] | null>(() => {
    if (!requirePublished) return null;
    if (role === 'student') return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [requirePublished, role, member]);

  if (loading) {
    return (
      <div className="nx-page">
        <Skeleton height={48} />
        <Skeleton height={420} />
      </div>
    );
  }

  const visible =
    !!card &&
    (!requirePublished || (card.published === true && (allowedStudentIds?.includes(card.studentId) ?? false)));

  if (!card || !visible) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="file-text"
            title="Card not available"
            message={
              requirePublished
                ? 'This progress card is not published yet, or it is not linked to your account.'
                : 'This holistic progress card may have been removed.'
            }
            action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back to cards</Button>}
          />
        </Panel>
      </div>
    );
  }

  const status = statusOf(card);
  const meta = HPC_STATUS_META[status];
  const staff = !requirePublished;
  const showSubmit = staff && canWrite && canSubmitStatus(status);
  const showReview = staff && isApprover && canReviewStatus(status);
  const showEdit = staff && canWrite && canEditStatus(status);

  const runSubmit = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await submitHpcCard(schoolId, card.id, { ...submitPatch(member?.name), studentName: card.studentName }, actor);
      toast.success('Submitted for approval', `${card.studentName}'s card is now with leadership.`);
      setAction(null);
    } catch { toast.error('Could not submit', 'Please try again.'); }
    finally { setBusy(false); }
  };

  const runApprove = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await reviewHpcCard(schoolId, card.id, { ...approvePatch(member?.name, note), studentName: card.studentName }, actor, true);
      toast.success('Card approved & published', `${card.studentName}'s card is now visible to parent & student.`);
      setAction(null); setNote('');
    } catch { toast.error('Could not approve', 'Please try again.'); }
    finally { setBusy(false); }
  };

  const runReturn = async () => {
    if (!schoolId) return;
    if (!note.trim()) { toast.error('Add a note', 'Tell the teacher what to revise before returning.'); return; }
    setBusy(true);
    try {
      await reviewHpcCard(schoolId, card.id, { ...returnPatch(note), studentName: card.studentName }, actor, false);
      toast.success('Card returned', `${card.studentName}'s card was sent back for changes.`);
      setAction(null); setNote('');
    } catch { toast.error('Could not return', 'Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head hpc-noprint hpc-cardbar">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back</Button>
        <div className="hpc-cardbar__actions">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {showEdit && (
            <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`${basePath}/${card.id}/edit`)}>Edit</Button>
          )}
          {showSubmit && (
            <Button variant="gold" size="sm" leftIcon="send" onClick={() => setAction('submit')}>Submit for approval</Button>
          )}
          {showReview && (
            <>
              <Button variant="subtle" size="sm" leftIcon="info" onClick={() => { setNote(''); setAction('return'); }}>Return</Button>
              <Button variant="gold" size="sm" leftIcon="shield-check" onClick={() => { setNote(''); setAction('approve'); }}>Approve</Button>
            </>
          )}
          <Button variant={showReview || showSubmit ? 'ghost' : 'gold'} size="sm" leftIcon="download" onClick={() => window.print()}>Print / save PDF</Button>
        </div>
      </div>

      {/* Status context line for staff — submitter / approver / return note. */}
      {staff && (status !== 'draft') && (
        <div className="hpc-status-strip hpc-noprint" role="status">
          <Icon name={meta.icon} size={15} />
          <span>
            {status === 'submitted' && card.submittedByName && (
              <>Submitted by <b>{card.submittedByName}</b>{card.submittedAt ? ` · ${formatRelative(card.submittedAt)}` : ''} — awaiting approval.</>
            )}
            {status === 'submitted' && !card.submittedByName && <>Awaiting leadership approval.</>}
            {status === 'approved' && (
              <>Approved{card.approvedByName ? <> by <b>{card.approvedByName}</b></> : ''}{card.approvedAt ? ` · ${formatRelative(card.approvedAt)}` : ''} — published to parent &amp; student.</>
            )}
            {status === 'returned' && (
              <>Returned for changes{card.approvalNote ? <>: <b>{card.approvalNote}</b></> : ''}. Edit and resubmit.</>
            )}
          </span>
        </div>
      )}

      <HpcCardDoc card={card} school={school} className="hpc-print" />

      <ConfirmModal
        open={action === 'submit'}
        onClose={() => setAction(null)}
        onConfirm={runSubmit}
        loading={busy}
        tone="gold"
        icon="send"
        title="Submit for approval?"
        message={`${card.studentName}'s card will be sent to a Principal or Vice Principal. You won't be able to edit it until it is approved or returned.`}
        confirmLabel="Submit"
      />

      <ConfirmModal
        open={action === 'approve'}
        onClose={() => { setAction(null); setNote(''); }}
        onConfirm={runApprove}
        loading={busy}
        tone="gold"
        icon="shield-check"
        title="Approve & publish?"
        message={`This publishes ${card.studentName}'s card to the linked parent and student.`}
        confirmLabel="Approve & publish"
      >
        <Field label="Note to teacher" optional htmlFor="hpc-approve-note">
          <textarea
            id="hpc-approve-note"
            className="nx-input"
            rows={3}
            value={note}
            maxLength={280}
            placeholder="Add an optional note…"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </ConfirmModal>

      <ConfirmModal
        open={action === 'return'}
        onClose={() => { setAction(null); setNote(''); }}
        onConfirm={runReturn}
        loading={busy}
        tone="danger"
        icon="info"
        title="Return for changes?"
        message={`Send ${card.studentName}'s card back to the teacher with a note on what to revise.`}
        confirmLabel="Return card"
      >
        <Field label="Reason / what to revise" required htmlFor="hpc-return-note" hint="The teacher will see this note on their returned card.">
          <textarea
            id="hpc-return-note"
            className="nx-input"
            rows={3}
            value={note}
            maxLength={280}
            placeholder="e.g. Please add the co-scholastic remarks and recheck attendance."
            onChange={(e) => setNote(e.target.value)}
            aria-required="true"
          />
        </Field>
      </ConfirmModal>
    </div>
  );
}
