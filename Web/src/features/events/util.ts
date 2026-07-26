import type { EventRegistration, EventStatus, SchoolEvent } from '@/types/community';

/** Start of today (local) in epoch ms — used for upcoming/past partitioning. */
export function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** End of the current month (local) in epoch ms. */
export function endOfThisMonth(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

/** Start of the current month (local) in epoch ms. */
export function startOfThisMonth(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

/**
 * Derive a sensible status from the event's dates. Cancelled is sticky (never
 * auto-derived). The end of the window is `endDate` when present, else the end
 * of the start day for an all-day event, else `startDate`.
 */
export function deriveStatus(
  startDate: number,
  endDate: number | undefined,
  allDay: boolean | undefined,
  now = Date.now(),
): Exclude<EventStatus, 'cancelled'> {
  if (!Number.isFinite(startDate)) return 'upcoming';
  let end = endDate ?? startDate;
  if (allDay && !endDate) {
    const d = new Date(startDate);
    end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  }
  if (now < startDate) return 'upcoming';
  if (now > end) return 'completed';
  return 'ongoing';
}

/** Calendar-style date-chip parts for a card. */
export function dateChip(ts: number): { day: string; month: string } {
  const d = new Date(ts);
  return {
    day: String(d.getDate()),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
}

/** Sort upcoming events soonest-first; past events most-recent-first. */
export function sortByStart(events: SchoolEvent[], dir: 'asc' | 'desc'): SchoolEvent[] {
  return events.slice().sort((a, b) => (dir === 'asc' ? a.startDate - b.startDate : b.startDate - a.startDate));
}

/** Active (non-cancelled) registrations that hold a seat. */
export function activeRegistrations(regs: EventRegistration[]): EventRegistration[] {
  return regs.filter((r) => r.status === 'registered' || r.status === 'attended');
}

export interface RegistrationCounts {
  registered: number;
  attended: number;
  waitlist: number;
  cancelled: number;
  /** Seats held (registered + attended). */
  seats: number;
  total: number;
}

export function countRegistrations(regs: EventRegistration[]): RegistrationCounts {
  const c: RegistrationCounts = { registered: 0, attended: 0, waitlist: 0, cancelled: 0, seats: 0, total: regs.length };
  for (const r of regs) {
    if (r.status === 'registered') c.registered += 1;
    else if (r.status === 'attended') c.attended += 1;
    else if (r.status === 'waitlist') c.waitlist += 1;
    else if (r.status === 'cancelled') c.cancelled += 1;
  }
  c.seats = c.registered + c.attended;
  return c;
}

/** Whether adding one more seated participant would exceed capacity. */
export function isAtCapacity(seats: number, capacity?: number): boolean {
  return capacity != null && capacity > 0 && seats >= capacity;
}

/** epoch ms → `yyyy-MM-ddTHH:mm` (local) for a datetime-local input. */
export function toDateTimeLocal(ts?: number): string {
  if (ts == null || !Number.isFinite(ts)) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** epoch ms → `yyyy-MM-dd` (local) for a date input. */
export function toDateInput(ts?: number): string {
  if (ts == null || !Number.isFinite(ts)) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A `datetime-local`/`date` string → epoch ms, or undefined if blank/invalid. */
export function fromDateInput(value: string): number | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}
