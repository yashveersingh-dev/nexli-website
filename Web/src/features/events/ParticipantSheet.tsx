import type { School } from '@/types/models';
import type { EventRegistration, SchoolEvent } from '@/types/community';
import { formatDate } from '@/lib/format';
import { REGISTRATION_STATUS_META } from '@/features/analytics/meta';
import type { RegistrationCounts } from './util';
import { participantTypeLabel, sortedForExport } from './exportRegistrations';

/**
 * Print-friendly participant sheet for an event. Hidden on screen; revealed only
 * inside `@media print` (the HPC/fees print model) so "Export to PDF" is just
 * `window.print()` → browser "Save as PDF". Carries a school + event header and a
 * participation summary so the printed sheet is self-describing.
 */
export function ParticipantSheet({
  event, registrations, counts, school,
}: {
  event: SchoolEvent;
  registrations: EventRegistration[];
  counts: RegistrationCounts;
  school: School | null;
}) {
  const rows = sortedForExport(registrations);
  const attendancePct = counts.seats > 0 ? Math.round((counts.attended / counts.seats) * 100) : 0;
  const dateLine = formatDate(event.startDate, event.allDay ? 'dddd, DD MMMM YYYY' : 'dddd, DD MMMM YYYY · h:mm A');

  return (
    <div className="ev-sheet ev-print" aria-hidden="true">
      <header className="ev-sheet__head">
        {school?.name && <div className="ev-sheet__school">{school.name}</div>}
        <h2 className="ev-sheet__title">{event.title} — Participant list</h2>
        <div className="ev-sheet__meta">
          <span>{dateLine}</span>
          {event.venue && <span>{event.venue}</span>}
          <span>Generated {formatDate(Date.now(), 'DD MMM YYYY · h:mm A')}</span>
        </div>
        <div className="ev-sheet__summary">
          <span><b>{counts.seats}</b> registered{event.capacity ? ` / ${event.capacity} seats` : ''}</span>
          <span><b>{counts.attended}</b> attended ({attendancePct}%)</span>
          <span><b>{counts.waitlist}</b> waitlisted</span>
          <span><b>{counts.cancelled}</b> cancelled</span>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="ev-sheet__empty">No participants registered.</p>
      ) : (
        <table className="ev-sheet__table">
          <thead>
            <tr>
              <th className="ev-sheet__num">#</th>
              <th>Name</th>
              <th>Grade</th>
              <th>Type</th>
              <th>Status</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="ev-sheet__num">{i + 1}</td>
                <td>{r.participantName}</td>
                <td>{r.gradeName ?? '—'}</td>
                <td>{participantTypeLabel(r.participantType)}</td>
                <td>{REGISTRATION_STATUS_META[r.status]?.label ?? r.status}</td>
                <td>{r.registeredAt ? formatDate(r.registeredAt, 'DD MMM YYYY') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
