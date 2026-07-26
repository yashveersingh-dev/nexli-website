/**
 * Pure attendance date-window helper. Kept dependency-free (no Firestore, no
 * React) so it is trivially unit-testable and so importing it never triggers
 * Firebase initialization. `features/daily/data.ts` re-exports `attendanceSinceCutoff`
 * and uses it to add a server-side `where('date', '>=', cutoff)` bound to
 * `useAllAttendance`.
 */

/** `useAllAttendance` window option. `since` (explicit) wins over `sinceDays`. */
export interface AttendanceWindow {
  /** Rolling window length in calendar days, inclusive of today (e.g. 30). */
  sinceDays?: number;
  /** Explicit lower bound as a `'yyyy-mm-dd'` string. Takes precedence. */
  since?: string;
}

/**
 * Resolve a window option to a lower-bound `date` string (`'yyyy-mm-dd'`) for a
 * `where('date', '>=', cutoff)` filter, or `null` when no bound is requested
 * (whole-collection / legacy behaviour).
 *
 * `now` is an injectable seam (defaults to today) so the rolling-window maths is
 * deterministic in tests.
 */
export function attendanceSinceCutoff(opts?: AttendanceWindow, now: Date = new Date()): string | null {
  if (!opts) return null;
  if (opts.since) return opts.since;
  if (opts.sinceDays != null && opts.sinceDays > 0) {
    const d = new Date(now);
    d.setDate(d.getDate() - (opts.sinceDays - 1)); // inclusive of today → N calendar days
    return d.toISOString().slice(0, 10);
  }
  return null;
}
