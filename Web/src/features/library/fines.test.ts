import { describe, it, expect } from 'vitest';
import { computeFine, daysOverdue, isOverdue, finePerDay, DAY_MS, DEFAULT_FINE_PER_DAY } from './fines';
import type { BookCirculation } from '@/types/daily';

/**
 * Pure library-fine logic tests. These import ONLY `./fines` (no Firebase), proving
 * the extraction is genuinely Firebase-free. Cases:
 *  - overdue days × rate (default + custom rate)
 *  - not overdue (and returned/lost loans) → 0
 *  - a stored `fine` on the loan takes precedence over the computed value.
 */

// Fixed "now" so the maths is timezone- and clock-independent.
const NOW = new Date(2026, 5, 19, 12, 0, 0).getTime();

function circ(over: Partial<BookCirculation> & Pick<BookCirculation, 'dueDate'>): BookCirculation {
  return {
    id: over.id ?? 'c1',
    schoolId: 'sch1',
    bookId: 'b1',
    borrowerId: 'stu1',
    issuedDate: over.issuedDate ?? NOW - 30 * DAY_MS,
    dueDate: over.dueDate,
    status: over.status ?? 'issued',
    ...(over.returnedDate !== undefined ? { returnedDate: over.returnedDate } : {}),
    ...(over.fine !== undefined ? { fine: over.fine } : {}),
  };
}

describe('isOverdue', () => {
  it('is true when not returned and the due date has passed', () => {
    expect(isOverdue(circ({ dueDate: NOW - 5 * DAY_MS }), NOW)).toBe(true);
  });
  it('is false when the due date is still in the future', () => {
    expect(isOverdue(circ({ dueDate: NOW + 5 * DAY_MS }), NOW)).toBe(false);
  });
  it('is false once the book is returned (even if past due)', () => {
    expect(isOverdue(circ({ dueDate: NOW - 5 * DAY_MS, status: 'returned', returnedDate: NOW }), NOW)).toBe(false);
  });
  it('is false for a lost book', () => {
    expect(isOverdue(circ({ dueDate: NOW - 5 * DAY_MS, status: 'lost' }), NOW)).toBe(false);
  });
});

describe('daysOverdue', () => {
  it('counts whole overdue days', () => {
    expect(daysOverdue(circ({ dueDate: NOW - 3 * DAY_MS }), NOW)).toBe(3);
  });
  it('floors partial days (just under one day overdue → 0)', () => {
    expect(daysOverdue(circ({ dueDate: NOW - (DAY_MS - 1000) }), NOW)).toBe(0);
  });
  it('is 0 when not overdue', () => {
    expect(daysOverdue(circ({ dueDate: NOW + 2 * DAY_MS }), NOW)).toBe(0);
  });
});

describe('computeFine', () => {
  it('is days overdue × default rate', () => {
    expect(computeFine(circ({ dueDate: NOW - 4 * DAY_MS }), DEFAULT_FINE_PER_DAY, NOW)).toBe(4 * DEFAULT_FINE_PER_DAY);
  });
  it('honours a custom per-day rate', () => {
    expect(computeFine(circ({ dueDate: NOW - 4 * DAY_MS }), 5, NOW)).toBe(20);
  });
  it('is 0 when nothing is overdue', () => {
    expect(computeFine(circ({ dueDate: NOW + 4 * DAY_MS }), DEFAULT_FINE_PER_DAY, NOW)).toBe(0);
  });
  it('uses a stored fine in preference to the computed value', () => {
    // 10 days overdue would compute to 20 at the default rate, but a settled fine of 7 wins.
    expect(computeFine(circ({ dueDate: NOW - 10 * DAY_MS, fine: 7 }), DEFAULT_FINE_PER_DAY, NOW)).toBe(7);
  });
  it('respects a stored fine of 0 (waived) even when overdue', () => {
    expect(computeFine(circ({ dueDate: NOW - 10 * DAY_MS, fine: 0 }), DEFAULT_FINE_PER_DAY, NOW)).toBe(0);
  });

  it('uses the school-configured rate end-to-end via finePerDay', () => {
    // A school configured ₹5/day → 6 days overdue computes to ₹30.
    const rate = finePerDay({ finePerDay: 5 });
    expect(computeFine(circ({ dueDate: NOW - 6 * DAY_MS }), rate, NOW)).toBe(30);
  });
});

describe('finePerDay (settings resolver)', () => {
  it('returns the configured rate when set', () => {
    expect(finePerDay({ finePerDay: 5 })).toBe(5);
  });
  it('respects a configured rate of 0 (fines disabled)', () => {
    expect(finePerDay({ finePerDay: 0 })).toBe(0);
  });
  it('falls back to the default when unset/empty/null', () => {
    expect(finePerDay(undefined)).toBe(DEFAULT_FINE_PER_DAY);
    expect(finePerDay(null)).toBe(DEFAULT_FINE_PER_DAY);
    expect(finePerDay({})).toBe(DEFAULT_FINE_PER_DAY);
  });
  it('falls back to the default for an invalid (negative / NaN) rate', () => {
    expect(finePerDay({ finePerDay: -3 })).toBe(DEFAULT_FINE_PER_DAY);
    expect(finePerDay({ finePerDay: Number.NaN })).toBe(DEFAULT_FINE_PER_DAY);
  });
});
