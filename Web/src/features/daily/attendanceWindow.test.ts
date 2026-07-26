import { describe, it, expect } from 'vitest';
import { attendanceSinceCutoff } from './attendanceWindow';

/**
 * Tests for the attendance date-window helper that bounds `useAllAttendance`'s
 * server-side `where('date', '>=', cutoff)`. A fixed `now` is injected so the
 * rolling-window maths is deterministic.
 */
describe('attendanceSinceCutoff', () => {
  // 2026-06-19 (matches the project's current date) — a mid-month weekday.
  const now = new Date('2026-06-19T10:30:00Z');

  it('returns null with no options (legacy whole-collection behaviour)', () => {
    expect(attendanceSinceCutoff(undefined, now)).toBeNull();
    expect(attendanceSinceCutoff({}, now)).toBeNull();
  });

  it('passes an explicit `since` through unchanged', () => {
    expect(attendanceSinceCutoff({ since: '2025-04-01' }, now)).toBe('2025-04-01');
  });

  it('lets `since` win over `sinceDays`', () => {
    expect(attendanceSinceCutoff({ since: '2025-04-01', sinceDays: 30 }, now)).toBe('2025-04-01');
  });

  it('computes an inclusive rolling window of N calendar days', () => {
    // sinceDays:1 → just today.
    expect(attendanceSinceCutoff({ sinceDays: 1 }, now)).toBe('2026-06-19');
    // sinceDays:30 → today minus 29 days (inclusive of both ends).
    expect(attendanceSinceCutoff({ sinceDays: 30 }, now)).toBe('2026-05-21');
    // sinceDays:45 → the dashboards' window.
    expect(attendanceSinceCutoff({ sinceDays: 45 }, now)).toBe('2026-05-06');
    // sinceDays:90 → the analytics / rankings window.
    expect(attendanceSinceCutoff({ sinceDays: 90 }, now)).toBe('2026-03-22');
  });

  it('crosses month and year boundaries correctly', () => {
    const jan = new Date('2026-01-05T00:00:00Z');
    expect(attendanceSinceCutoff({ sinceDays: 10 }, jan)).toBe('2025-12-27');
  });

  it('treats non-positive `sinceDays` as no bound', () => {
    expect(attendanceSinceCutoff({ sinceDays: 0 }, now)).toBeNull();
    expect(attendanceSinceCutoff({ sinceDays: -5 }, now)).toBeNull();
  });
});
