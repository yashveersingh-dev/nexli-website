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
import { useSession } from '@/app/providers/SessionProvider';
import {
  useReportCard, useReportCards, usePublishedReportCards, useScheme,
  submitReportCard, reviewReportCard, type Actor,
} from './data';
import { ReportCardDoc } from './ReportCardDoc';
import { ReportCardTrend } from './ReportCardTrend';
import { findSeedScheme } from './schemes';
import {
  statusOf, canApproveReportCard, canSubmitStatus, canReviewStatus, canEditStatus,
  RC_STATUS_META, submitPatch, approvePatch, returnPatch,
} from './workflow';

/**
 * Read-only, printable report-card view + approval action bar. Reused by staff
 * (`/report-cards/:id`) and parents/students (`MyReportCardRoutes` → `/report-cards/:id`).
 * When `requirePublished` is set (parent/student), an unpublished/foreign card is
 * hidden behind an honest empty state rather than leaked.
 */
export function ReportCardView({ basePath = '/report-cards', requirePublished = false }: { basePath?: string; requirePublished?: boolean }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, school, role, member, uid, can } = useSession();
  const { data: card, loading } = useReportCard(schoolId, id);
  const { data: scheme } = useScheme(schoolId, card?.schemeId);
  // Sibling cards for the same student (for the cross-term academic trend).
  // Staff may read all of a student's cards; families may only query PUBLISHED ones
  // (Firestore rules reject an unfiltered studentId query for non-staff). Pick the
  // matching hook by context — both are always called to keep hook order stable.
  const staffCards = useReportCards(requirePublished ? undefined : schoolId, card?.studentId);
  const familyCards = usePublishedReportCards(requirePublished ? schoolId : undefined, card?.studentId);
  const studentCards = requirePublished ? familyCards.data : staffCards.data;

  const canWrite = can('gradebook.write') || can('exams.write');
  const isApprover = canApproveReportCard(role, can);
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const [action, setAction] = useState<null | 'submit' | 'approve' | 'return'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const allowedStudentIds = useMemo<string[] | null>(() => {
    if (!requirePublished) return null;
    if (role === 'student') return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [requirePublished, role, member]);

  const gradeBands = useMemo(
    () => scheme?.gradeBands ?? (card?.schemeId ? findSeedScheme(card.schemeId)?.gradeBands : undefined),
    [scheme, card],
  );

  // Academic-trend points: this student's cards in the SAME academic year that
  // actually carry marks, ordered by term, as { term, pct }. For parents/students
  // only published cards are considered (parity with the visibility gate).
  const trendPoints = useMemo(() => {
    if (!card) return [];
    return studentCards
      .filter((c) => c.academicYear === card.academicYear)
      .filter((c) => c.totals.max > 0)
      .filter((c) => (requirePublished ? c.published === true : true))
      .sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
      .map((c) => ({ term: c.termLabel ?? c.term, pct: c.totals.percentage, current: c.id === card.id }));
  }, [studentCards, card, requirePublished]);

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
                ? 'This report card is not published yet, or it is not linked to your account.'
                : 'This report card may have been removed.'
            }
            action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back to cards</Button>}
          />
        </Panel>
      </div>
    );
  }

  const status = statusOf(card);
  const meta = RC_STATUS_META[status];
  const staff = !requirePublished;
  const showSubmit = staff && canWrite && canSubmitStatus(status);
  const showReview = staff && isApprover && canReviewStatus(status);
  const showEdit = staff && canWrite && canEditStatus(status);

  const runSubmit = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await submitReportCard(schoolId, card.id, { ...submitPatch(member?.name), studentName: card.studentName }, actor);
      toast.success('Submitted for approval', `${card.studentName}'s card is now with leadership.`);
      setAction(null);
    } catch { toast.error('Could not submit', 'Please try again.'); }
    finally { setBusy(false); }
  };

  const runApprove = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await reviewReportCard(schoolId, card.id, { ...approvePatch(member?.name, note), studentName: card.studentName }, actor, true);
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
      await reviewReportCard(schoolId, card.id, { ...returnPatch(note), studentName: card.studentName }, actor, false);
      toast.success('Card returned', `${card.studentName}'s card was sent back for changes.`);
      setAction(null); setNote('');
    } catch { toast.error('Could not return', 'Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head rc-noprint rc-cardbar">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back</Button>
        <div className="rc-cardbar__actions">
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
              <Button variant="gold" size="sm" leftIcon="check" onClick={() => { setNote(''); setAction('approve'); }}>Approve</Button>
            </>
          )}
          <Button variant={showReview || showSubmit ? 'ghost' : 'gold'} size="sm" leftIcon="download" onClick={() => window.print()}>Print / save PDF</Button>
        </div>
      </div>

      {staff && status !== 'draft' && (
        <div className="rc-status-strip rc-noprint" role="status">
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

      <ReportCardDoc card={card} school={school} gradeBands={gradeBands} className="rc-print" />

      <ReportCardTrend points={trendPoints} card={card} className="rc-noprint" />

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
        icon="check"
        title="Approve & publish?"
        message={`This publishes ${card.studentName}'s card to the linked parent and student.`}
        confirmLabel="Approve & publish"
      >
        <Field label="Note to teacher" optional htmlFor="rc-approve-note">
          <textarea id="rc-approve-note" className="nx-input" rows={3} value={note} maxLength={280}
            placeholder="Add an optional note…" onChange={(e) => setNote(e.target.value)} />
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
        <Field label="Reason / what to revise" required htmlFor="rc-return-note" hint="The teacher will see this note on their returned card.">
          <textarea id="rc-return-note" className="nx-input" rows={3} value={note} maxLength={280}
            placeholder="e.g. Please recheck the maths marks and add the co-scholastic grades."
            onChange={(e) => setNote(e.target.value)} aria-required="true" />
        </Field>
      </ConfirmModal>
    </div>
  );
}
