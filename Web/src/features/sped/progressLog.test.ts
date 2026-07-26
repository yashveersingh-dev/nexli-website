import { describe, it, expect } from 'vitest';
import {
  appendProgress,
  goalLog,
  latestStatusFromLog,
  makeProgressEntry,
  type GoalWithLog,
} from './progressLog';
import type { IepGoal } from '@/types/special';

/**
 * IEP goal progress-log helpers. The invariant under test: status changes are
 * APPEND-ONLY — appending must never mutate or drop prior entries, and the
 * "latest status" must always reflect the newest entry (by `at`).
 */

const baseGoal = (overrides: Partial<IepGoal> = {}): IepGoal => ({
  area: 'Academic',
  goal: 'Read 30 sight words',
  status: 'not_started',
  ...overrides,
});

const actor = { uid: 'u1', name: 'Ms Rao' };

describe('makeProgressEntry', () => {
  it('stamps uid, status and name; drops a blank note', () => {
    const e = makeProgressEntry('in_progress', actor, '   ', 1000);
    expect(e).toEqual({ at: 1000, byUid: 'u1', byName: 'Ms Rao', status: 'in_progress' });
    expect('note' in e).toBe(false);
  });

  it('keeps a trimmed note and omits byName when actor has none', () => {
    const e = makeProgressEntry('achieved', { uid: 'u2' }, '  great work  ', 2000);
    expect(e).toEqual({ at: 2000, byUid: 'u2', status: 'achieved', note: 'great work' });
  });
});

describe('latestStatusFromLog', () => {
  it("falls back to the goal's own status when the log is empty", () => {
    expect(latestStatusFromLog(baseGoal({ status: 'revised' }))).toBe('revised');
  });

  it('returns the status of the entry with the greatest `at` regardless of order', () => {
    const goal: GoalWithLog = {
      ...baseGoal(),
      progressLog: [
        { at: 30, byUid: 'u1', status: 'achieved' },
        { at: 10, byUid: 'u1', status: 'not_started' },
        { at: 20, byUid: 'u1', status: 'in_progress' },
      ],
    };
    expect(latestStatusFromLog(goal)).toBe('achieved');
  });
});

describe('goalLog', () => {
  it('returns [] for a goal with no log', () => {
    expect(goalLog(baseGoal())).toEqual([]);
  });
});

describe('appendProgress', () => {
  it('seeds the prior status then appends the new one for a goal with no log', () => {
    const goal = baseGoal({ status: 'not_started' });
    const next = appendProgress(goal, 'in_progress', actor, 'started today', 1000);

    expect(next.status).toBe('in_progress');
    expect(next.progressLog).toEqual([
      { at: 999, byUid: 'u1', byName: 'Ms Rao', status: 'not_started' },
      { at: 1000, byUid: 'u1', byName: 'Ms Rao', status: 'in_progress', note: 'started today' },
    ]);
    expect(latestStatusFromLog(next)).toBe('in_progress');
  });

  it('does not seed when the new status equals the current status', () => {
    const goal = baseGoal({ status: 'in_progress' });
    const next = appendProgress(goal, 'in_progress', actor, undefined, 1000);
    expect(next.progressLog).toEqual([
      { at: 1000, byUid: 'u1', byName: 'Ms Rao', status: 'in_progress' },
    ]);
  });

  it('appends to an existing log without mutating prior entries (append-only)', () => {
    const prior = { at: 1000, byUid: 'u0', status: 'in_progress' as const };
    const goal: GoalWithLog = { ...baseGoal({ status: 'in_progress' }), progressLog: [prior] };
    const before = JSON.parse(JSON.stringify(goal.progressLog));

    const next = appendProgress(goal, 'achieved', actor, 'met target', 2000);

    // Original array/entries untouched.
    expect(goal.progressLog).toEqual(before);
    expect(goal.progressLog).toHaveLength(1);
    // New log preserves history and adds the new entry last.
    expect(next.progressLog).toHaveLength(2);
    expect(next.progressLog?.[0]).toEqual(prior);
    expect(next.progressLog?.[1]).toMatchObject({ status: 'achieved', note: 'met target', at: 2000 });
    expect(next.status).toBe('achieved');
  });

  it('builds a full chronological trail across several changes', () => {
    let g: GoalWithLog = baseGoal({ status: 'not_started' });
    g = appendProgress(g, 'in_progress', actor, undefined, 1000);
    g = appendProgress(g, 'achieved', actor, undefined, 2000);
    g = appendProgress(g, 'revised', actor, 'regressed', 3000);

    expect(g.progressLog?.map((e) => e.status)).toEqual([
      'not_started',
      'in_progress',
      'achieved',
      'revised',
    ]);
    expect(latestStatusFromLog(g)).toBe('revised');
  });
});
