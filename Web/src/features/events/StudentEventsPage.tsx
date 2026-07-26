import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudent } from '@/features/school/data';
import {
  useEvents, useEventRegistrations,
  createRegistration, updateRegistration,
} from '@/features/analytics/data';
import { EVENT_TYPE_META, REGISTRATION_STATUS_META } from '@/features/analytics/meta';
import { formatDate } from '@/lib/format';
import type { EventRegistration, SchoolEvent } from '@/types/community';
import { isPublished } from './eventWorkflow';
import { countRegistrations, dateChip, isAtCapacity, sortByStart, startOfToday } from './util';
import '@/features/analytics/analytics.css';
import './events.css';

/**
 * Student-facing surface for the Events module: published, registration-required
 * events the student can self-register for (or cancel). Respects `capacity` →
 * over-capacity sign-ups land on the `waitlist`. Read/write is scoped to the
 * student's own linked record (`member.studentId`); they only ever act on their
 * own registration. Spark-native: real-time Firestore hooks, no server code.
 */
export function StudentEventsPage() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const studentId = member?.studentId;

  const { data: student } = useStudent(schoolId, studentId);
  const { data: events, loading: evLoading, error } = useEvents(schoolId);
  const { data: allRegs, loading: regLoading } = useEventRegistrations(schoolId);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<{ event: SchoolEvent; reg: EventRegistration } | null>(null);

  const today = startOfToday();
  const myGradeId = student?.gradeId;

  // Published, registration-required, upcoming (non-cancelled) events the student
  // is actually an audience for. Without an audience check a student would see —
  // and could self-register for — staff/parents/invitees-only or other-grade
  // events. Students see whole-school, students-wide, and their own grade only.
  const openEvents = useMemo(
    () =>
      sortByStart(
        events.filter((e) => {
          if (!isPublished(e) || !e.registrationRequired || e.status === 'cancelled' || e.startDate < today) {
            return false;
          }
          if (e.audience === 'whole_school' || e.audience === 'students') return true;
          if (e.audience === 'grade') return !!myGradeId && e.gradeId === myGradeId;
          return false; // 'staff' | 'parents' | 'invitees' are not student-self-serve
        }),
        'asc',
      ),
    [events, today, myGradeId],
  );

  // This student's own registrations, keyed by event for O(1) lookup.
  const myRegByEvent = useMemo(() => {
    const map = new Map<string, EventRegistration>();
    if (!studentId) return map;
    for (const r of allRegs) {
      if (r.participantId === studentId && r.status !== 'cancelled') map.set(r.eventId, r);
    }
    return map;
  }, [allRegs, studentId]);

  // Seat counts per event (across all participants) → capacity / waitlist logic.
  const countsByEvent = useMemo(() => {
    const grouped = new Map<string, EventRegistration[]>();
    for (const r of allRegs) {
      const list = grouped.get(r.eventId) ?? [];
      list.push(r);
      grouped.set(r.eventId, list);
    }
    const out = new Map<string, ReturnType<typeof countRegistrations>>();
    for (const [eventId, list] of grouped) out.set(eventId, countRegistrations(list));
    return out;
  }, [allRegs]);

  const myActiveCount = myRegByEvent.size;

  const register = async (event: SchoolEvent) => {
    if (!schoolId || !studentId) return;
    setBusyId(event.id);
    try {
      const seats = countsByEvent.get(event.id)?.seats ?? 0;
      const willWaitlist = isAtCapacity(seats, event.capacity);
      const payload: Omit<EventRegistration, 'id' | 'schoolId'> = {
        eventId: event.id,
        eventTitle: event.title,
        participantId: studentId,
        participantName: student?.fullName ?? member?.name ?? 'Student',
        participantType: 'student',
        gradeName: student?.gradeName,
        status: willWaitlist ? 'waitlist' : 'registered',
        registeredAt: Date.now(),
      };
      await createRegistration(schoolId, payload as Omit<EventRegistration, 'id'>, actor);
      toast.success(
        willWaitlist ? 'Added to waitlist' : 'You’re registered',
        willWaitlist ? `“${event.title}” is full — you’ll be moved up if a seat opens.` : event.title,
      );
    } catch {
      toast.error('Could not register', 'It will sync when you are back online.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async () => {
    if (!schoolId || !cancelling) return;
    setBusyId(cancelling.event.id);
    try {
      await updateRegistration(schoolId, cancelling.reg.id, { status: 'cancelled' }, actor);
      toast.success('Registration cancelled', cancelling.event.title);
      setCancelling(null);
    } catch {
      toast.error('Could not cancel', 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (!studentId) {
    return (
      <div className="nx-page">
        <PageHead />
        <Panel>
          <EmptyState
            icon="user"
            title="Account not linked"
            message="Events will appear here once your school links your account to a student record."
          />
        </Panel>
      </div>
    );
  }

  if (evLoading || regLoading) {
    return (
      <div className="nx-page">
        <PageHead />
        <div className="an-events">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={168} radius={12} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <PageHead />

      <div className="kpi-grid">
        <KPICard icon="calendar" label="Open to register" count={openEvents.length} />
        <KPICard icon="check-circle" label="My registrations" count={myActiveCount} />
      </div>

      {error ? (
        <EmptyState icon="alert-triangle" title="Could not load events" message="Check your connection and try again." />
      ) : openEvents.length === 0 ? (
        <Panel>
          <EmptyState
            icon="calendar"
            title="No events open for registration"
            message="When your school publishes an event that needs sign-up, it will appear here for you to register."
          />
        </Panel>
      ) : (
        <Panel title="Events you can register for">
          <ul className="ev-myevents">
            {openEvents.map((event) => {
              const myReg = myRegByEvent.get(event.id);
              const counts = countsByEvent.get(event.id);
              const seats = counts?.seats ?? 0;
              const full = isAtCapacity(seats, event.capacity);
              return (
                <StudentEventRow
                  key={event.id}
                  event={event}
                  myReg={myReg}
                  full={full}
                  busy={busyId === event.id}
                  onRegister={() => register(event)}
                  onCancel={() => myReg && setCancelling({ event, reg: myReg })}
                />
              );
            })}
          </ul>
        </Panel>
      )}

      <ConfirmModal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
        tone="danger"
        loading={!!busyId}
        title="Cancel your registration?"
        message={`You’ll be removed from “${cancelling?.event.title ?? 'this event'}”. You can register again later if seats remain.`}
        confirmLabel="Cancel registration"
      />
    </div>
  );
}

function PageHead() {
  return (
    <div className="nx-page__head">
      <div>
        <h1 className="nx-page__title">Events</h1>
        <p className="nx-page__sub">Register for your school’s upcoming events and activities.</p>
      </div>
    </div>
  );
}

function StudentEventRow({
  event, myReg, full, busy, onRegister, onCancel,
}: {
  event: SchoolEvent;
  myReg: EventRegistration | undefined;
  full: boolean;
  busy: boolean;
  onRegister: () => void;
  onCancel: () => void;
}) {
  const type = EVENT_TYPE_META[event.type] ?? EVENT_TYPE_META.other;
  const chip = dateChip(event.startDate);
  const timeLabel = event.allDay ? 'All day' : formatDate(event.startDate, 'h:mm A');
  const regMeta = myReg ? REGISTRATION_STATUS_META[myReg.status] : null;

  return (
    <li className="ev-myevent">
      <div className="an-event__chip" aria-hidden="true">
        <span className="an-event__d">{chip.day}</span>
        <span className="an-event__m">{chip.month}</span>
      </div>
      <div className="ev-myevent__main">
        <span className="ev-card__type"><Icon name={type.icon} size={13} />{type.label}</span>
        <h3 className="ev-myevent__title">{event.title}</h3>
        <div className="ev-myevent__facts">
          <span><Icon name="clock" size={12} aria-hidden="true" />{formatDate(event.startDate, 'ddd, DD MMM YYYY')} · {timeLabel}</span>
          {event.venue && <span><Icon name="map-pin" size={12} aria-hidden="true" />{event.venue}</span>}
          {event.capacity ? <span><Icon name="users" size={12} aria-hidden="true" />{event.capacity} seats</span> : null}
        </div>
      </div>
      <div className="ev-myevent__action">
        {regMeta ? (
          <>
            <Badge variant={regMeta.variant}>{regMeta.label}</Badge>
            <Button variant="ghost" size="sm" leftIcon="x" loading={busy} onClick={onCancel}>Cancel</Button>
          </>
        ) : full ? (
          <Button variant="subtle" size="sm" leftIcon="clock" loading={busy} onClick={onRegister}>Join waitlist</Button>
        ) : (
          <Button variant="gold" size="sm" leftIcon="check" loading={busy} onClick={onRegister}>Register</Button>
        )}
      </div>
    </li>
  );
}

/** Exported for reuse / tests: the "open for registration" predicate. */
export function isOpenForStudent(event: SchoolEvent, now = Date.now()): boolean {
  return (
    isPublished(event) &&
    !!event.registrationRequired &&
    event.status !== 'cancelled' &&
    event.startDate >= startOfToday(now)
  );
}
