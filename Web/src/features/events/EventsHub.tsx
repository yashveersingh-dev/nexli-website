import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/form';
import { KPICard } from '@/components/KPICard';
import { Tabs } from '@/components/Tabs';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useEvents, useEventRegistrations } from '@/features/analytics/data';
import { EVENT_STATUS_META, EVENT_TYPE_META, EVENT_TYPE_OPTIONS } from '@/features/analytics/meta';
import type { EventStatus, EventType, SchoolEvent } from '@/types/community';
import { EventCard } from './EventCard';
import { approvalOf, canRequestEvent, isPublished } from './eventWorkflow';
import { endOfThisMonth, sortByStart, startOfThisMonth, startOfToday } from './util';

const TYPE_FILTER_OPTIONS = [{ value: '', label: 'All types' }, ...EVENT_TYPE_OPTIONS];
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...(Object.keys(EVENT_STATUS_META) as EventStatus[]).map((s) => ({ value: s, label: EVENT_STATUS_META[s].label })),
];

type WhenTab = 'upcoming' | 'past' | 'pending';

/** Events & Activities hub: KPIs + filterable upcoming/past event cards + an approval queue. */
export function EventsHub() {
  const navigate = useNavigate();
  const { canOperate: canWrite, isReviewer, isApprover, ownerLabel } = useOwnership('events');
  const { schoolId, role } = useSession();
  const { data: events, loading, error } = useEvents(schoolId);
  const { data: registrations } = useEventRegistrations(schoolId);

  const canRequest = canRequestEvent(role, canWrite);

  const [when, setWhen] = useState<WhenTab>('upcoming');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const today = startOfToday();
  const monthStart = startOfThisMonth();
  const monthEnd = endOfThisMonth();

  // Only approvers see unapproved events in the calendar; everyone else sees
  // the published (approved) calendar. This is what keeps "published = approved".
  const visibleEvents = useMemo(
    () => (isApprover ? events : events.filter(isPublished)),
    [events, isApprover],
  );

  const pendingCount = useMemo(() => events.filter((e) => approvalOf(e) === 'requested').length, [events]);

  const kpis = useMemo(() => {
    // Count what the user actually sees listed. `visibleEvents` is already
    // audience-filtered (non-approvers → published only; approvers → all), so the
    // KPIs must NOT re-apply isPublished — doing so undercounted events that are
    // visibly listed (e.g. a pending event an approver sees in the Upcoming tab),
    // which is what made "Upcoming events" read 0 while the tab listed 2.
    const upcoming = visibleEvents.filter((e) => e.status !== 'cancelled' && e.startDate >= today).length;
    const thisMonth = visibleEvents.filter((e) => e.startDate >= monthStart && e.startDate <= monthEnd).length;
    const activeRegs = registrations.filter((r) => r.status !== 'cancelled').length;
    return { upcoming, thisMonth, activeRegs };
  }, [visibleEvents, registrations, today, monthStart, monthEnd]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const source = when === 'pending' ? events.filter((e) => approvalOf(e) === 'requested') : visibleEvents;
    const filtered = source.filter((e) => {
      if (when !== 'pending') {
        const isPast = e.startDate < today;
        if (when === 'upcoming' && isPast) return false;
        if (when === 'past' && !isPast) return false;
        if (status && e.status !== (status as EventStatus)) return false;
      }
      if (type && e.type !== (type as EventType)) return false;
      if (needle) {
        const hay = `${e.title} ${e.venue ?? ''} ${e.organiser ?? ''} ${e.requestedByName ?? ''} ${EVENT_TYPE_META[e.type]?.label ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // Pending queue: oldest request first (act on the longest-waiting). Else by date.
    if (when === 'pending') {
      return filtered.slice().sort((a, b) => (a.requestedAt ?? a.startDate) - (b.requestedAt ?? b.startDate));
    }
    return sortByStart(filtered, when === 'upcoming' ? 'asc' : 'desc');
  }, [events, visibleEvents, q, type, status, when, today]);

  const upcomingCount = useMemo(() => visibleEvents.filter((e) => e.startDate >= today).length, [visibleEvents, today]);
  const pastCount = visibleEvents.length - upcomingCount;

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', icon: 'calendar' as const, badge: upcomingCount || undefined },
    { id: 'past', label: 'Past', icon: 'clock' as const, badge: pastCount || undefined },
    ...(isApprover
      ? [{ id: 'pending', label: 'Pending approval', icon: 'check-circle' as const, badge: pendingCount || undefined }]
      : []),
  ];

  const headSub = canWrite
    ? 'Plan, publish and manage your school’s events, trips and meetings.'
    : canRequest
      ? 'Browse the events calendar and request an event for leadership to review.'
      : 'Review the events calendar, registrations and details.';

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Events &amp; Activities</h1>
          <p className="nx-page__sub">{headSub}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" leftIcon="message" onClick={() => navigate('/events/ptm')}>
            Parent meetings
          </Button>
          {canWrite ? (
            <Button variant="gold" leftIcon="plus" onClick={() => navigate('/events/new')}>
              New event
            </Button>
          ) : canRequest ? (
            <Button variant="gold" leftIcon="send" onClick={() => navigate('/events/request')}>
              Request an event
            </Button>
          ) : null}
        </div>
      </div>

      {isReviewer && !canWrite && <ReviewModeNote owner={ownerLabel} />}

      <div className="kpi-grid">
        <KPICard icon="calendar" label="Upcoming events" count={kpis.upcoming} />
        <KPICard icon="sparkles" label="This month" count={kpis.thisMonth} />
        {isApprover ? (
          <KPICard
            icon="clock"
            label="Pending approval"
            count={pendingCount}
            subColor="var(--warning, var(--gold))"
            sub={pendingCount ? 'Awaiting your review' : 'All clear'}
          />
        ) : (
          <KPICard icon="users" label="Registrations" count={kpis.activeRegs} />
        )}
      </div>

      <Tabs variant="line" aria-label="Event timeframe" value={when} onChange={(id) => setWhen(id as WhenTab)} tabs={tabs}>
        {() => (
          <>
            <div className="nx-toolbar">
              <div className="nx-toolbar__search">
                <Input
                  leftIcon="search"
                  placeholder="Search events…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search events"
                />
              </div>
              <Field className="nx-toolbar__filter">
                <Select value={type} onChange={(e) => setType(e.target.value)} options={TYPE_FILTER_OPTIONS} aria-label="Filter by type" />
              </Field>
              {when !== 'pending' && (
                <Field className="nx-toolbar__filter">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_FILTER_OPTIONS} aria-label="Filter by status" />
                </Field>
              )}
            </div>

            {loading ? (
              <div className="an-events">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={168} radius={12} />)}
              </div>
            ) : error ? (
              <EmptyState icon="alert-triangle" title="Could not load events" message="Check your connection and try again." />
            ) : list.length === 0 ? (
              <HubEmpty when={when} hasEvents={visibleEvents.length > 0} canWrite={canWrite} canRequest={canRequest} navigate={navigate} />
            ) : (
              <div className="an-events">
                {list.map((e: SchoolEvent) => (
                  <EventCard key={e.id} event={e} onOpen={() => navigate(`/events/${e.id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}

function HubEmpty({
  when, hasEvents, canWrite, canRequest, navigate,
}: {
  when: WhenTab;
  hasEvents: boolean;
  canWrite: boolean;
  canRequest: boolean;
  navigate: (to: string) => void;
}) {
  if (when === 'pending') {
    return (
      <EmptyState
        icon="check-circle"
        title="Nothing pending approval"
        message="There are no event requests waiting on you right now."
      />
    );
  }
  if (!hasEvents) {
    return (
      <EmptyState
        icon="calendar"
        title="No events yet"
        message={
          canWrite
            ? 'Create your first event to share it with your school community.'
            : canRequest
              ? 'Request an event and it will appear here once a Principal or VP approves it.'
              : 'Events scheduled by your school will appear here.'
        }
        action={
          canWrite ? (
            <Button variant="gold" leftIcon="plus" onClick={() => navigate('/events/new')}>New event</Button>
          ) : canRequest ? (
            <Button variant="gold" leftIcon="send" onClick={() => navigate('/events/request')}>Request an event</Button>
          ) : undefined
        }
      />
    );
  }
  return (
    <EmptyState
      icon="calendar"
      title="No matching events"
      message="Try a different search, type or status filter."
    />
  );
}
