/**
 * Pure library-fine logic — NO Firebase imports, so it is unit-testable in isolation.
 *
 * `shared.ts` carries a top-level `firebase/firestore` import (for the atomic
 * issue/return transactions), which pulls the whole Firebase SDK into any test that
 * imports it. The overdue/fine maths is pure arithmetic over a circulation record,
 * so it lives here and is re-exported from `shared.ts` for backwards compatibility
 * (existing `./shared` imports keep working unchanged).
 */
import type { BookCirculation } from '@/types/daily';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** A circulation is overdue when not returned/lost and its due date has passed. */
export function isOverdue(c: BookCirculation, now = Date.now()): boolean {
  return c.status !== 'returned' && c.status !== 'lost' && !c.returnedDate && c.dueDate < now;
}

/** Whole days a circulation is overdue (0 when not overdue). */
export function daysOverdue(c: BookCirculation, now = Date.now()): number {
  if (!isOverdue(c, now)) return 0;
  return Math.max(0, Math.floor((now - c.dueDate) / DAY_MS));
}

/**
 * Default overdue fine in rupees per day. Used as the fallback when a school has
 * not configured its own rate (`library_settings/main → finePerDay`); the Library
 * Settings UI writes that doc and `finePerDay` resolves the effective rate.
 */
export const DEFAULT_FINE_PER_DAY = 2;

/**
 * Resolve the effective fine-per-day rate from the (optional) library settings,
 * clamped to a non-negative finite number and falling back to `DEFAULT_FINE_PER_DAY`
 * when unset/invalid. Pure (no Firebase) so it is the single source of truth for
 * both the UI and tests. A rate of 0 (fines disabled) is respected.
 */
export function finePerDay(settings?: { finePerDay?: number } | null): number {
  const v = settings?.finePerDay;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : DEFAULT_FINE_PER_DAY;
}

/**
 * Fine owed on a circulation, in rupees.
 *
 * If a fine was explicitly recorded on the loan (e.g. settled on return) that
 * stored value wins. Otherwise the fine is computed for real from how many whole
 * days the loan is overdue × the per-day rate. Returns 0 when nothing is overdue.
 */
export function computeFine(c: BookCirculation, ratePerDay = DEFAULT_FINE_PER_DAY, now = Date.now()): number {
  if (typeof c.fine === 'number') return c.fine;
  return daysOverdue(c, now) * ratePerDay;
}
