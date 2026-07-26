import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { formatDate } from '@/lib/format';
import type { Student } from '@/types/sis';
import {
  usePtmMeetings, usePtmBookingsForParent, usePtmSlotCounts,
  bookPtmSlot, cancelPtmBooking, slotAvailabilityFromCounts, hasActiveBooking,
  SLOT_FULL, ALREADY_BOOKED,
  type PtmMeeting, type PtmBooking,
} from '@/features/events/ptm';

/**
 * Parent "Meetings" tab — parents see PTMs open to their children and book one
 * slot per child. Capacity is enforced server-side in a transaction (see
 * `bookPtmSlot`); the UI also greys out full slots and prevents a second booking
 * for the same child + meeting.
 */
export function ParentPtmTab() {
  const { schoolId, uid, member } = useSession();
  const childIds = useMemo(() => member?.childStudentIds ?? [], [member]);
  const { data: children, loading: cLoading } = useStudentsByIds(schoolId, childIds);
  const { data: meetings, loading, error } = usePtmMeetings(schoolId);
  const { data: myBookings } = usePtmBookingsForParent(schoolId, uid ?? undefined);

  // Grade/section ids the parent's children belong to — used to scope meetings.
  const childGradeIds = useMemo(() => new Set(children.map((c) => c.gradeId).filter(Boolean) as string[]), [children]);
  const childSectionIds = useMemo(() => new Set(children.map((c) => c.sectionId).filter(Boolean) as string[]), [children]);

  // A meeting is relevant when it has no scope (whole-school) or targets one of
  // the children's grade/section.
  const openMeetings = useMemo(
    () => meetings
      .filter((m) => {
        if (m.sectionId) return childSectionIds.has(m.sectionId);
        if (m.gradeId) return childGradeIds.has(m.gradeId);
        return true;
      })
      .sort((a, b) => a.date - b.date),
    [meetings, childGradeIds, childSectionIds],
  );

  if (cLoading || loading) return <Panel><Skeleton height={160} /></Panel>;

  if (childIds.length === 0) {
    return (
      <Panel>
        <EmptyState icon="users" title="No children linked yet"
          message="Once your school links your children to your account, parent-teacher meetings open to them appear here." />
      </Panel>
    );
  }

  if (error) return <EmptyState icon="alert-triangle" title="Could not load meetings" message="Check your connection and try again." />;

  if (openMeetings.length === 0) {
    return (
      <Panel>
        <EmptyState icon="calendar" title="No meetings open"
          message="When your school schedules a parent-teacher meeting for your child, you can book a slot here." />
      </Panel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {openMeetings.map((m) => (
        <MeetingBookingCard key={m.id} meeting={m} children={children} myBookings={myBookings} schoolId={schoolId} parentName={member?.name} parentUid={uid ?? undefined} />
      ))}
    </div>
  );
}

function MeetingBookingCard({
  meeting, children, myBookings, schoolId, parentName, parentUid,
}: {
  meeting: PtmMeeting;
  children: Student[];
  myBookings: PtmBooking[];
  schoolId?: string;
  parentName?: string;
  parentUid?: string;
}) {
  const toast = useToast();
  // Live availability from the per-slot COUNTERS (counts only — no other family's
  // booking identity is exposed to a parent). Capacity is enforced server-side in
  // the booking transaction regardless of this advisory display.
  const { data: slotCounts } = usePtmSlotCounts(schoolId, meeting.id);
  const avail = slotAvailabilityFromCounts(meeting, slotCounts);

  // Children eligible for THIS meeting (match scope).
  const eligible = useMemo(
    () => children.filter((c) => {
      if (meeting.sectionId) return c.sectionId === meeting.sectionId;
      if (meeting.gradeId) return c.gradeId === meeting.gradeId;
      return true;
    }),
    [children, meeting],
  );

  const [book, setBook] = useState<{ childId: string } | null>(null);
  const [cancel, setCancel] = useState<PtmBooking | null>(null);
  const [busy, setBusy] = useState(false);

  const doBook = async (childId: string, slotId: string) => {
    if (!schoolId) return;
    const child = eligible.find((c) => c.id === childId);
    if (!child) return;
    setBusy(true);
    try {
      await bookPtmSlot(schoolId, { meeting, slotId, studentId: child.id, studentName: child.fullName }, { uid: parentUid ?? 'unknown', name: parentName });
      toast.success('Slot booked', `${child.fullName} · ${meeting.slots.find((s) => s.id === slotId)?.time ?? ''}`);
      setBook(null);
    } catch (e) {
      const msg = e instanceof Error && e.message === SLOT_FULL ? 'That slot just filled up — pick another.'
        : e instanceof Error && e.message === ALREADY_BOOKED ? 'This child already has a slot for this meeting.'
        : 'Please try again.';
      toast.error('Could not book', msg);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!schoolId || !cancel) return;
    setBusy(true);
    try {
      await cancelPtmBooking(schoolId, cancel, { uid: parentUid ?? 'unknown', name: parentName });
      toast.success('Booking cancelled', cancel.studentName);
      setCancel(null);
    } catch {
      toast.error('Could not cancel', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={meeting.title} sub={formatDate(meeting.date, 'ddd, DD MMM YYYY')} headerRight={<Badge variant="muted">{meeting.slots.length} slots</Badge>}>
      {meeting.note && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>{meeting.note}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {eligible.map((child) => {
          const existing = hasActiveBooking(myBookings, meeting.id, child.id);
          return (
            <div key={child.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{child.fullName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{[child.gradeName, child.sectionName].filter(Boolean).join(' · ')}</div>
              </div>
              {existing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant="success"><Icon name="check" size={12} /> {existing.slotTime}</Badge>
                  <Button variant="ghost" size="sm" leftIcon="x" loading={busy} onClick={() => setCancel(existing)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="gold" size="sm" leftIcon="calendar" onClick={() => setBook({ childId: child.id })}>Book slot</Button>
              )}
            </div>
          );
        })}
      </div>

      {book && (
        <Modal open onClose={() => setBook(null)} title="Choose a time slot" icon="clock" tone="gold"
          footer={<Button variant="ghost" onClick={() => setBook(null)}>Close</Button>}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            Booking for <strong style={{ color: 'var(--text)' }}>{eligible.find((c) => c.id === book.childId)?.fullName}</strong> · {meeting.title}
          </p>
          <div className="nx-chips">
            {avail.map((a) => (
              <button
                key={a.slot.id}
                type="button"
                className="nx-chip"
                disabled={a.full || busy}
                aria-disabled={a.full}
                onClick={() => doBook(book.childId, a.slot.id)}
                title={a.full ? 'Full' : `${a.remaining} left`}
              >
                <Icon name="clock" size={12} /> {a.slot.time}
                <span style={{ fontSize: 10.5, color: a.full ? 'var(--danger)' : 'var(--text-muted)' }}>{a.full ? 'Full' : `${a.remaining} left`}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!cancel}
        onClose={() => setCancel(null)}
        onConfirm={doCancel}
        tone="danger"
        loading={busy}
        title="Cancel your booking?"
        message={`Release ${cancel?.studentName ?? 'this child'}'s slot for “${meeting.title}”? You can book again if slots remain.`}
        confirmLabel="Cancel booking"
      />
    </Panel>
  );
}
