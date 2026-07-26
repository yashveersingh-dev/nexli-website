import { describe, it, expect } from 'vitest';
import { validateLeaveDates, leaveDays } from './studentLeave';

// Fixed "now" so past/future assertions are deterministic: 2026-06-19 (local).
const NOW = new Date(2026, 5, 19, 10, 0, 0).getTime();
const day = (s: string) => `${s}`; // yyyy-MM-dd passthrough for readability

describe('validateLeaveDates', () => {
  it('accepts a valid same-day-or-forward range with a reason', () => {
    expect(validateLeaveDates(day('2026-06-20'), day('2026-06-22'), 'Family function', NOW)).toEqual([]);
    expect(validateLeaveDates(day('2026-06-19'), day('2026-06-19'), 'Doctor', NOW)).toEqual([]);
  });

  it('requires both dates', () => {
    const errs = validateLeaveDates(undefined, undefined, 'x', NOW);
    expect(errs.map((e) => e.field)).toEqual(expect.arrayContaining(['fromDate', 'toDate']));
  });

  it('rejects a start date in the past', () => {
    const errs = validateLeaveDates(day('2026-06-18'), day('2026-06-20'), 'x', NOW);
    expect(errs.some((e) => e.field === 'fromDate' && /past/i.test(e.message))).toBe(true);
  });

  it('allows today as the start date (boundary)', () => {
    const errs = validateLeaveDates(day('2026-06-19'), day('2026-06-19'), 'x', NOW);
    expect(errs.some((e) => e.field === 'fromDate')).toBe(false);
  });

  it('rejects to-date before from-date', () => {
    const errs = validateLeaveDates(day('2026-06-22'), day('2026-06-20'), 'x', NOW);
    expect(errs.some((e) => e.field === 'toDate' && /on or after/i.test(e.message))).toBe(true);
  });

  it('requires a non-empty reason', () => {
    expect(validateLeaveDates(day('2026-06-20'), day('2026-06-20'), '   ', NOW).some((e) => e.field === 'reason')).toBe(true);
    expect(validateLeaveDates(day('2026-06-20'), day('2026-06-20'), undefined, NOW).some((e) => e.field === 'reason')).toBe(true);
  });

  it('accepts epoch-ms inputs too', () => {
    const from = new Date(2026, 5, 20).getTime();
    const to = new Date(2026, 5, 21).getTime();
    expect(validateLeaveDates(from, to, 'Trip', NOW)).toEqual([]);
  });
});

describe('leaveDays', () => {
  it('counts inclusively (same day = 1)', () => {
    const d = (s: string) => new Date(`${s}T09:00:00`).getTime();
    expect(leaveDays(d('2026-06-20'), d('2026-06-20'))).toBe(1);
    expect(leaveDays(d('2026-06-20'), d('2026-06-22'))).toBe(3);
  });

  it('returns 0 for an inverted range', () => {
    const d = (s: string) => new Date(`${s}T09:00:00`).getTime();
    expect(leaveDays(d('2026-06-22'), d('2026-06-20'))).toBe(0);
  });
});
