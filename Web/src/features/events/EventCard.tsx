import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { formatDate, formatINR } from '@/lib/format';
import type { SchoolEvent } from '@/types/community';
import { EVENT_STATUS_META, EVENT_TYPE_META } from '@/features/analytics/meta';
import { dateChip } from './util';
import { approvalOf, EVENT_APPROVAL_META } from './eventWorkflow';

/** A single event card with a calendar date-chip header (mirrors .an-event). */
export function EventCard({ event, onOpen }: { event: SchoolEvent; onOpen: () => void }) {
  const type = EVENT_TYPE_META[event.type] ?? EVENT_TYPE_META.other;
  const status = EVENT_STATUS_META[event.status] ?? EVENT_STATUS_META.upcoming;
  const approval = approvalOf(event);
  // Surface the approval badge for staff while an event isn't yet approved.
  const approvalMeta = approval !== 'approved' ? EVENT_APPROVAL_META[approval] : null;
  const chip = dateChip(event.startDate);
  const timeLabel = event.allDay
    ? 'All day'
    : formatDate(event.startDate, 'h:mm A');

  return (
    <article className="an-event ev-card">
      <button type="button" className="ev-card__btn" onClick={onOpen} aria-label={`Open ${event.title}`}>
        <div className="an-event__date">
          <div className="an-event__chip" aria-hidden="true">
            <span className="an-event__d">{chip.day}</span>
            <span className="an-event__m">{chip.month}</span>
          </div>
          <div className="ev-card__meta">
            <span className="ev-card__type">
              <Icon name={type.icon} size={13} />
              {type.label}
              {event.isTeacherRequest && <span className="ev-card__tag">Teacher request</span>}
            </span>
            {approvalMeta ? (
              <Badge variant={approvalMeta.variant}>{approvalMeta.label}</Badge>
            ) : (
              <Badge variant={status.variant}>{status.label}</Badge>
            )}
          </div>
        </div>
        <div className="an-event__body">
          <h3 className="ev-card__title">{event.title}</h3>
          <ul className="ev-card__facts">
            <li>
              <Icon name="clock" size={13} aria-hidden="true" />
              <span>{formatDate(event.startDate, 'ddd, DD MMM YYYY')} · {timeLabel}</span>
            </li>
            {event.venue && (
              <li>
                <Icon name="map-pin" size={13} aria-hidden="true" />
                <span>{event.venue}</span>
              </li>
            )}
            {event.registrationRequired && (
              <li>
                <Icon name="user-plus" size={13} aria-hidden="true" />
                <span>
                  Registration required
                  {event.fee ? ` · ${formatINR(event.fee)}` : ''}
                  {event.capacity ? ` · ${event.capacity} seats` : ''}
                </span>
              </li>
            )}
          </ul>
        </div>
      </button>
    </article>
  );
}
