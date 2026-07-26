import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Panel } from '@/components/Panel';
import { Field, Input, Select } from '@/components/form';
import { KPICard } from '@/components/KPICard';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import {
  useEvent, useEventRegistrations, deleteEvent,
  createRegistration, updateRegistration, deleteRegistration,
  approveEvent, rejectEvent, requestEvent,
} from '@/features/analytics/data';
import { EVENT_STATUS_META, EVENT_TYPE_META, EVENT_AUDIENCE_OPTIONS, REGISTRATION_STATUS_META } from '@/features/analytics/meta';
import { formatDate, formatINR, formatRelative } from '@/lib/format';
import type { EventRegistration, RegistrationStatus, SchoolEvent } from '@/types/community';
import { countRegistrations, deriveStatus, isAtCapacity } from './util';
import { approvalOf, canRequestEvent, canResubmit, canReviewApproval, EVENT_APPROVAL_META, approvePatch, rejectPatch, resubmitPatch } from './eventWorkflow';
import { downloadRegistrationsCsv } from './exportRegistrations';
import { ParticipantSheet } from './ParticipantSheet';

const PARTICIPANT_TYPE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'staff', label: 'Staff' },
  { value: 'parent', label: 'Parent' },
];

const STATUS_RANK: Record<RegistrationStatus, number> = { registered: 0, waitlist: 1, attended: 2, cancelled: 3 };

export function EventDetailPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const { schoolId, uid, role, member, school } = useSession();
  const { canOperate: canWrite, isApprover } = useOwnership('events');
  const canRequest = canRequestEvent(role, canWrite);

  const { data: event, loading } = useEvent(schoolId, id);
  const { data: registrations, loading: regLoading } = useEventRegistrations(schoolId, id);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<EventRegistration | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [review, setReview] = useState<null | 'approve' | 'reject'>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => countRegistrations(registrations), [registrations]);
  const sortedRegs = useMemo(
    () => registrations.slice().sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || (a.registeredAt ?? 0) - (b.registeredAt ?? 0)),
    [registrations],
  );

  if (loading) {
    return (
      <div className="nx-page">
        <Skeleton height={56} />
        <Skeleton height={220} />
      </div>
    );
  }

  if (!event || !id) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <button type="button" className="nx-formpage__back" onClick={() => navigate('/events')} aria-label="Back to events">
            <Icon name="chevron-left" size={18} />
          </button>
        </div>
        <EmptyState icon="alert-triangle" title="Event not found" message="This event may have been removed." action={<Button variant="gold" onClick={() => navigate('/events')}>Back to events</Button>} />
      </div>
    );
  }

  const approval = approvalOf(event);
  const isPublishedEvent = approval === 'approved';
  // Staff who may see an unpublished event: approvers, the owning operators, and
  // teachers who can raise requests. Everyone else only ever reaches approved events.
  const canSeeUnpublished = isApprover || canWrite || canRequest;
  if (!isPublishedEvent && !canSeeUnpublished) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <button type="button" className="nx-formpage__back" onClick={() => navigate('/events')} aria-label="Back to events">
            <Icon name="chevron-left" size={18} />
          </button>
        </div>
        <EmptyState
          icon="clock"
          title="Event not available yet"
          message="This event is awaiting approval and isn’t published. It will appear here once a Principal or VP approves it."
          action={<Button variant="gold" onClick={() => navigate('/events')}>Back to events</Button>}
        />
      </div>
    );
  }

  const type = EVENT_TYPE_META[event.type] ?? EVENT_TYPE_META.other;
  const status = EVENT_STATUS_META[event.status] ?? EVENT_STATUS_META.upcoming;
  const approvalMeta = EVENT_APPROVAL_META[approval];
  const showReview = isApprover && canReviewApproval(approval);
  // Owner (or original requester) may push a rejected event back into the queue.
  const showResubmit = canResubmit(event, canWrite, member?.name);
  const audienceLabel = EVENT_AUDIENCE_OPTIONS.find((a) => a.value === event.audience)?.label;
  const dateLine = formatDate(event.startDate, event.allDay ? 'dddd, DD MMMM YYYY' : 'dddd, DD MMMM YYYY · h:mm A');
  const endLine = event.endDate ? formatDate(event.endDate, event.allDay ? 'DD MMM YYYY' : 'DD MMM YYYY · h:mm A') : null;

  const runApprove = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      // Publish at the event's date-derived schedule status (cancelled stays cancelled).
      const scheduled = event.status === 'cancelled' ? 'upcoming' : deriveStatus(event.startDate, event.endDate, event.allDay);
      await approveEvent(schoolId, id, { ...approvePatch(scheduled, member?.name, note), title: event.title }, actor);
      toast.success('Event approved & published', `“${event.title}” is now live on the calendar.`);
      setReview(null); setNote('');
    } catch {
      toast.error('Could not approve', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const runReject = async () => {
    if (!schoolId) return;
    if (!note.trim()) { toast.error('Add a note', 'Tell the requester why this event isn’t going ahead.'); return; }
    setBusy(true);
    try {
      await rejectEvent(schoolId, id, { ...rejectPatch(member?.name, note), title: event.title }, actor);
      toast.success('Request rejected', `“${event.title}” was sent back with your note.`);
      setReview(null); setNote('');
    } catch {
      toast.error('Could not reject', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const runResubmit = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await requestEvent(
        schoolId,
        id,
        { ...resubmitPatch(member?.name, !!event.isTeacherRequest), title: event.title },
        actor,
      );
      toast.success('Resubmitted for approval', `“${event.title}” is back in the Principal / VP pending queue.`);
      setResubmitting(false);
    } catch {
      toast.error('Could not resubmit', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await deleteEvent(schoolId, id, actor);
      toast.success('Event deleted', event.title);
      navigate('/events');
    } catch {
      toast.error('Could not delete event');
    } finally {
      setBusy(false);
      setDeletingEvent(false);
    }
  };

  const markAttended = async (reg: EventRegistration) => {
    if (!schoolId) return;
    try {
      await updateRegistration(schoolId, reg.id, { status: 'attended' }, actor);
    } catch {
      toast.error('Could not update registration');
    }
  };

  const cancelRegistration = async (reg: EventRegistration) => {
    if (!schoolId) return;
    try {
      await updateRegistration(schoolId, reg.id, { status: 'cancelled' }, actor);
      // Promote the first waitlisted participant if a seat opened up.
      const seats = counts.seats - (reg.status === 'registered' || reg.status === 'attended' ? 1 : 0);
      if (!isAtCapacity(seats, event.capacity)) {
        const next = registrations.find((r) => r.status === 'waitlist');
        if (next) await updateRegistration(schoolId, next.id, { status: 'registered' }, actor);
      }
    } catch {
      toast.error('Could not cancel registration');
    }
  };

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteRegistration(schoolId, removing.id, actor);
      toast.success('Registration removed');
      setRemoving(null);
    } catch {
      toast.error('Could not remove registration');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    if (registrations.length === 0) {
      toast.info('Nothing to export', 'Add participants before exporting.');
      return;
    }
    try {
      downloadRegistrationsCsv(event, registrations);
      toast.success('Participant list exported', 'CSV downloaded to your device.');
    } catch {
      toast.error('Could not export', 'Please try again.');
    }
  };

  const exportPdf = () => {
    if (registrations.length === 0) {
      toast.info('Nothing to print', 'Add participants before printing.');
      return;
    }
    // The print-only ParticipantSheet (rendered below) is the printable surface.
    window.print();
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div className="ev-detail__heading">
          <button type="button" className="nx-formpage__back" onClick={() => navigate('/events')} aria-label="Back to events">
            <Icon name="chevron-left" size={18} />
          </button>
          <div>
            <div className="ev-detail__eyebrow">
              <span className="ev-card__type"><Icon name={type.icon} size={13} />{type.label}</span>
              {isPublishedEvent
                ? <Badge variant={status.variant}>{status.label}</Badge>
                : <Badge variant={approvalMeta.variant}>{approvalMeta.label}</Badge>}
              {event.isTeacherRequest && <Badge variant="info">Teacher request</Badge>}
            </div>
            <h1 className="nx-page__title">{event.title}</h1>
          </div>
        </div>
        <div className="ev-detail__actions">
          {showReview && (
            <>
              <Button variant="subtle" leftIcon="x" onClick={() => { setNote(''); setReview('reject'); }}>Reject</Button>
              <Button variant="gold" leftIcon="check-circle" onClick={() => { setNote(''); setReview('approve'); }}>Approve</Button>
            </>
          )}
          {showResubmit && (
            <Button variant="gold" leftIcon="refresh" onClick={() => setResubmitting(true)}>Resubmit for approval</Button>
          )}
          {canWrite && (
            <>
              <Button variant="ghost" leftIcon="edit" onClick={() => navigate(`/events/${id}/edit`)}>Edit</Button>
              <Button variant="ghost" leftIcon="x" onClick={() => setDeletingEvent(true)} aria-label="Delete event" />
            </>
          )}
        </div>
      </div>

      {/* Approval status context line — requester / approver / rejection note. */}
      {approval !== 'approved' && (
        <div className={`ev-status-strip ev-status-strip--${approval}`} role="status">
          <Icon name={approvalMeta.icon} size={16} aria-hidden="true" />
          <span>
            {approval === 'requested' && (
              <>
                {event.isTeacherRequest ? 'Event request' : 'Event'} raised
                {event.requestedByName ? <> by <b>{event.requestedByName}</b></> : ''}
                {event.requestedAt ? ` · ${formatRelative(event.requestedAt)}` : ''} — awaiting Principal / VP approval.
              </>
            )}
            {approval === 'rejected' && (
              <>
                Rejected{event.approvedByName ? <> by <b>{event.approvedByName}</b></> : ''}
                {event.approvalNote ? <>: <b>{event.approvalNote}</b></> : '.'}
              </>
            )}
            {approval === 'draft' && <>Draft — not yet submitted for approval.</>}
          </span>
        </div>
      )}

      {event.rationale && (
        <Panel title="Rationale">
          <p className="ev-detail__desc ev-detail__desc--top">{event.rationale}</p>
        </Panel>
      )}

      <Panel title="Event details">
        <dl className="ev-info">
          <InfoItem icon="calendar" label="When">
            {dateLine}
            {endLine && <span className="ev-info__muted"> — {endLine}</span>}
            {event.allDay && <Badge variant="muted">All day</Badge>}
          </InfoItem>
          {event.venue && <InfoItem icon="map-pin" label="Venue">{event.venue}</InfoItem>}
          {audienceLabel && (
            <InfoItem icon="users" label="Audience">
              {audienceLabel}
              {event.audience === 'grade' && event.gradeId && <span className="ev-info__muted"> · grade-scoped</span>}
            </InfoItem>
          )}
          {event.organiser && <InfoItem icon="user" label="Organiser">{event.organiser}</InfoItem>}
          {event.fee != null && event.fee > 0 && <InfoItem icon="wallet" label="Fee">{formatINR(event.fee)} per participant</InfoItem>}
          {event.registrationRequired && (
            <InfoItem icon="user-plus" label="Registration">
              Required{event.capacity ? ` · ${event.capacity} seats` : ' · unlimited seats'}
            </InfoItem>
          )}
        </dl>
        {event.description && <p className="ev-detail__desc">{event.description}</p>}
      </Panel>

      {event.registrationRequired ? (
        <>
          <div className="kpi-grid">
            <KPICard icon="user-plus" label="Registered" count={counts.seats} sub={event.capacity ? `of ${event.capacity} seats` : 'unlimited'} />
            <KPICard icon="check-circle" label="Attended" count={counts.attended} sub={counts.seats > 0 ? `${Math.round((counts.attended / counts.seats) * 100)}% of seats` : undefined} />
            <KPICard icon="clock" label="Waitlist" count={counts.waitlist} />
            <KPICard icon="minus-circle" label="Cancelled" count={counts.cancelled} />
          </div>

          <Panel
            title="Registrations"
            headerRight={
              canWrite ? (
                <div className="ev-panel__actions">
                  <Button variant="ghost" size="sm" leftIcon="download" onClick={exportCsv} disabled={counts.total === 0} title="Download the participant list as a CSV (opens in Excel)">
                    Export to Excel
                  </Button>
                  <Button variant="ghost" size="sm" leftIcon="file-text" onClick={exportPdf} disabled={counts.total === 0} title="Print or save the participant sheet as a PDF">
                    Export to PDF
                  </Button>
                  <Button variant="gold" size="sm" leftIcon="user-plus" onClick={() => setAdding(true)} disabled={event.status === 'cancelled' || !isPublishedEvent}>
                    Add participant
                  </Button>
                </div>
              ) : undefined
            }
          >
            {regLoading ? (
              <div className="ev-reglist">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={56} radius={10} />)}</div>
            ) : sortedRegs.length === 0 ? (
              <EmptyState
                icon="user-plus"
                title="No registrations yet"
                message={canWrite ? 'Add participants as they sign up. Seats past capacity are waitlisted automatically.' : 'No one has registered yet.'}
              />
            ) : (
              <ul className="ev-reglist">
                {sortedRegs.map((r) => (
                  <RegistrationRow
                    key={r.id}
                    reg={r}
                    canWrite={canWrite}
                    onAttend={() => markAttended(r)}
                    onCancel={() => cancelRegistration(r)}
                    onRemove={() => setRemoving(r)}
                  />
                ))}
              </ul>
            )}
            {counts.seats > 0 && (
              <div className="ev-participation" role="status">
                <div className="ev-participation__bar" aria-hidden="true">
                  <span style={{ width: `${Math.round((counts.attended / counts.seats) * 100)}%` }} />
                </div>
                <span className="ev-participation__label">
                  <b>{Math.round((counts.attended / counts.seats) * 100)}%</b> participation · {counts.attended} of {counts.seats} attended
                </span>
              </div>
            )}
          </Panel>

          <ParticipantSheet event={event} registrations={registrations} counts={counts} school={school} />
        </>
      ) : (
        <InfoCard icon="info" title="No registration needed">
          This event is open to its audience without sign-up. Turn on “Registration required” when editing to track participants.
        </InfoCard>
      )}

      {adding && (
        <AddParticipantModal
          event={event}
          seats={counts.seats}
          onClose={() => setAdding(false)}
          onDone={() => setAdding(false)}
        />
      )}

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        tone="danger"
        loading={busy}
        title="Remove registration?"
        message={`${removing?.participantName ?? 'This participant'} will be removed from this event.`}
        confirmLabel="Remove"
      />

      <ConfirmModal
        open={deletingEvent}
        onClose={() => setDeletingEvent(false)}
        onConfirm={confirmDeleteEvent}
        tone="danger"
        loading={busy}
        title="Delete event?"
        message={`"${event.title}" and its registrations reference will be removed. This cannot be undone.`}
        confirmLabel="Delete event"
      />

      <ConfirmModal
        open={resubmitting}
        onClose={() => setResubmitting(false)}
        onConfirm={runResubmit}
        loading={busy}
        tone="gold"
        icon="refresh"
        title="Resubmit for approval?"
        message={`“${event.title}” will return to the Principal / VP pending queue for review. ${event.approvalNote ? 'Consider addressing the rejection note before resubmitting.' : ''}`.trim()}
        confirmLabel="Resubmit"
      />

      <ConfirmModal
        open={review === 'approve'}
        onClose={() => { setReview(null); setNote(''); }}
        onConfirm={runApprove}
        loading={busy}
        tone="gold"
        icon="check-circle"
        title="Approve & publish?"
        message={`This publishes “${event.title}” to the events calendar for its audience.`}
        confirmLabel="Approve & publish"
      >
        <Field label="Note to requester" optional htmlFor="ev-approve-note">
          <textarea
            id="ev-approve-note"
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
        open={review === 'reject'}
        onClose={() => { setReview(null); setNote(''); }}
        onConfirm={runReject}
        loading={busy}
        tone="danger"
        icon="x"
        title="Reject this request?"
        message={`Send “${event.title}” back to ${event.requestedByName ?? 'the requester'} with a note on why it isn’t going ahead.`}
        confirmLabel="Reject"
      >
        <Field label="Reason" required htmlFor="ev-reject-note" hint="The requester will see this note on the rejected event.">
          <textarea
            id="ev-reject-note"
            className="nx-input"
            rows={3}
            value={note}
            maxLength={280}
            placeholder="e.g. Clashes with the exam week — please propose a date after the 20th."
            onChange={(e) => setNote(e.target.value)}
            aria-required="true"
          />
        </Field>
      </ConfirmModal>
    </div>
  );
}

function InfoItem({ icon, label, children }: { icon: 'calendar' | 'map-pin' | 'users' | 'user' | 'wallet' | 'user-plus'; label: string; children: React.ReactNode }) {
  return (
    <div className="ev-info__item">
      <dt className="ev-info__label"><Icon name={icon} size={14} aria-hidden="true" />{label}</dt>
      <dd className="ev-info__val">{children}</dd>
    </div>
  );
}

function RegistrationRow({
  reg, canWrite, onAttend, onCancel, onRemove,
}: {
  reg: EventRegistration;
  canWrite: boolean;
  onAttend: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const meta = REGISTRATION_STATUS_META[reg.status];
  const typeLabel = reg.participantType ? PARTICIPANT_TYPE_OPTIONS.find((t) => t.value === reg.participantType)?.label : undefined;
  return (
    <li className="ev-reg">
      <div className="ev-reg__main">
        <div className="ev-reg__name">{reg.participantName}</div>
        <div className="ev-reg__sub">
          {typeLabel && <span>{typeLabel}</span>}
          {reg.gradeName && <span>{reg.gradeName}</span>}
          {reg.registeredAt ? <span>{formatDate(reg.registeredAt, 'DD MMM YYYY')}</span> : null}
        </div>
      </div>
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {canWrite && reg.status !== 'cancelled' && (
        <div className="ev-reg__actions">
          {reg.status !== 'attended' && (
            <Button variant="ghost" size="sm" leftIcon="check" onClick={onAttend} aria-label={`Mark ${reg.participantName} attended`} />
          )}
          <Button variant="ghost" size="sm" leftIcon="minus-circle" onClick={onCancel} aria-label={`Cancel ${reg.participantName}`} />
        </div>
      )}
      {canWrite && reg.status === 'cancelled' && (
        <div className="ev-reg__actions">
          <Button variant="ghost" size="sm" leftIcon="x" onClick={onRemove} aria-label={`Remove ${reg.participantName}`} />
        </div>
      )}
    </li>
  );
}

function AddParticipantModal({
  event, seats, onClose, onDone,
}: {
  event: SchoolEvent;
  seats: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: students } = useStudents(schoolId);
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const [pType, setPType] = useState<'student' | 'staff' | 'parent'>('student');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const studentOptions = useMemo(
    () => [
      { value: '', label: 'Select a student' },
      ...students
        .slice()
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
    ],
    [students],
  );

  const willWaitlist = isAtCapacity(seats, event.capacity);
  const resolvedName = pType === 'student'
    ? students.find((s) => s.id === studentId)?.fullName ?? ''
    : name.trim();
  const canSave = !!resolvedName && (pType !== 'student' || !!studentId);

  const save = async () => {
    if (!schoolId || !canSave) return;
    setBusy(true);
    try {
      const student = pType === 'student' ? students.find((s) => s.id === studentId) : undefined;
      const payload: Omit<EventRegistration, 'id' | 'schoolId'> = {
        eventId: event.id,
        eventTitle: event.title,
        participantId: student?.id,
        participantName: resolvedName,
        participantType: pType,
        gradeName: student?.gradeName,
        status: willWaitlist ? 'waitlist' : 'registered',
        registeredAt: Date.now(),
      };
      await createRegistration(schoolId, payload as Omit<EventRegistration, 'id'>, actor);
      toast.success(willWaitlist ? 'Added to waitlist' : 'Participant registered', resolvedName);
      onDone();
    } catch {
      toast.error('Could not add participant', 'It will sync when you are back online.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon="user-plus"
      tone="gold"
      title="Add participant"
      description={event.title}
      size="md"
      dismissible={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!canSave} onClick={save}>
            {willWaitlist ? 'Add to waitlist' : 'Register'}
          </Button>
        </>
      }
    >
      {willWaitlist && (
        <InfoCard icon="info" title="Event is at capacity">
          {event.capacity} seats are filled, so this participant will be added to the waitlist.
        </InfoCard>
      )}
      <Field label="Participant type">
        <Select value={pType} onChange={(e) => setPType(e.target.value as typeof pType)} options={PARTICIPANT_TYPE_OPTIONS} />
      </Field>
      {pType === 'student' ? (
        <Field label="Student" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select a student" options={studentOptions} />
        </Field>
      ) : (
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </Field>
      )}
    </Modal>
  );
}
