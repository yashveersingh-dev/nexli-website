import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useEvents } from '@/features/analytics/data';
import { EVENT_TYPE_META } from '@/features/analytics/meta';
import { isPublished } from '@/features/events/eventWorkflow';
import { dateChip, sortByStart, startOfToday } from '@/features/events/util';
import { formatDate } from '@/lib/format';
import type { SchoolEvent } from '@/types/community';
import { useStudentContext } from './useStudentContext';
import { PortalPage } from './PortalShell';
import './studentportal.css';

/** Is this event visible to a student in the given grade? */
function visibleToStudent(e: SchoolEvent, gradeId?: string): boolean {
  if (!isPublished(e) || e.status === 'cancelled') return false;
  switch (e.audience) {
    case 'staff':
    case 'parents':
      return false;
    case 'grade':
      // Grade-targeted events: show only for the student's own grade.
      // Guard against missing gradeId: if the event has no gradeId stored,
      // treat it as whole-school rather than leaking to all grades.
      return !!e.gradeId && e.gradeId === gradeId;
    default:
      // whole_school / students / invitees / undefined → visible.
      return true;
  }
}

/** Read-only school calendar: upcoming events + holidays relevant to the student. */
export function StudentCalendarPage() {
  const ctx = useStudentContext();
  return (
    <PortalPage ctx={ctx} title="Calendar" icon="calendar" sub="Upcoming school events and holidays.">
      {ctx.status === 'ready' && <CalendarBody gradeId={ctx.student?.gradeId} />}
    </PortalPage>
  );
}

function CalendarBody({ gradeId }: { gradeId?: string }) {
  const { schoolId } = useSession();
  const { data: events, loading, error } = useEvents(schoolId);
  const today = startOfToday();

  const { holidays, upcoming } = useMemo(() => {
    const relevant = events.filter((e) => visibleToStudent(e, gradeId) && (e.endDate ?? e.startDate) >= today);
    const hol: SchoolEvent[] = [];
    const up: SchoolEvent[] = [];
    for (const e of relevant) {
      if (e.type === 'holiday') hol.push(e);
      else up.push(e);
    }
    return { holidays: sortByStart(hol, 'asc'), upcoming: sortByStart(up, 'asc') };
  }, [events, gradeId, today]);

  // Group upcoming events by month for a calm, scannable agenda.
  const grouped = useMemo(() => {
    const map = new Map<string, SchoolEvent[]>();
    for (const e of upcoming) {
      const key = formatDate(e.startDate, 'MMMM YYYY');
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [upcoming]);

  if (loading) {
    return (
      <div className="sp-stack">
        <Panel><Skeleton height={200} /></Panel>
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState icon="alert-triangle" title="Could not load the calendar" message="Check your connection and try again." />
      </Panel>
    );
  }

  return (
    <div className="sp-stack">
      {holidays.length > 0 && (
        <Panel title="Upcoming holidays">
          <ul className="sp-holidays">
            {holidays.slice(0, 8).map((h) => (
              <li key={h.id} className="sp-holiday">
                <span className="sp-holiday__icon" aria-hidden="true"><Icon name="calendar" size={14} /></span>
                <span className="sp-holiday__name">{h.title}</span>
                <span className="sp-holiday__date">
                  {formatDate(h.startDate, 'ddd, DD MMM')}
                  {h.endDate && h.endDate > h.startDate ? ` – ${formatDate(h.endDate, 'DD MMM')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Upcoming events">
        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Nothing scheduled yet"
            message="When your school adds events to the calendar, they'll appear here."
          />
        ) : (
          <div className="sp-agenda">
            {grouped.map(([month, list]) => (
              <section key={month} className="sp-agenda__group">
                <h3 className="sp-agenda__month">{month}</h3>
                <ul className="sp-agenda__list">
                  {list.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function EventRow({ event }: { event: SchoolEvent }) {
  const type = EVENT_TYPE_META[event.type] ?? EVENT_TYPE_META.other;
  const chip = dateChip(event.startDate);
  const timeLabel = event.allDay ? 'All day' : formatDate(event.startDate, 'h:mm A');
  return (
    <li className="sp-event">
      <div className="sp-event__chip" aria-hidden="true">
        <span className="sp-event__d">{chip.day}</span>
        <span className="sp-event__m">{chip.month}</span>
      </div>
      <div className="sp-event__main">
        <span className="sp-event__type"><Icon name={type.icon} size={13} aria-hidden="true" />{type.label}</span>
        <h4 className="sp-event__title">{event.title}</h4>
        <div className="sp-event__facts">
          <span><Icon name="clock" size={12} aria-hidden="true" />{formatDate(event.startDate, 'ddd, DD MMM')} · {timeLabel}</span>
          {event.venue && <span><Icon name="map-pin" size={12} aria-hidden="true" />{event.venue}</span>}
        </div>
      </div>
      {event.registrationRequired && <Badge variant="info">Sign-up</Badge>}
    </li>
  );
}
