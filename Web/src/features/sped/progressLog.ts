import type { IepGoal, IepGoalStatus } from '@/types/special';

/* ============================================================================
 * IEP goal progress log (append-only history).
 *
 * IEP goal status changes used to overwrite `goal.status`, losing all history.
 * Each goal now carries an append-only `progressLog[]`: every status change
 * APPENDS an entry (never mutates a prior one), so the goal keeps a dated,
 * attributable trail. The shared `IepGoal` type (src/types/special.ts) is owned
 * by another area, so the log shape is declared here and layered on via
 * `GoalWithLog` — Firestore is schemaless, the extra field rides along on the
 * stored goal object.
 * ==========================================================================*/

/** One append-only progress entry on an IEP goal. */
export interface IepProgressEntry {
  /** Epoch ms the entry was recorded. */
  at: number;
  /** UID of the staff member who recorded it. */
  byUid: string;
  /** Display name of that staff member (best-effort). */
  byName?: string;
  /** Goal status as of this entry. */
  status: string;
  /** Optional free-text note explaining the change / progress. */
  note?: string;
}

/** An `IepGoal` that may carry the append-only progress log. */
export type GoalWithLog = IepGoal & { progressLog?: IepProgressEntry[] };

/** Safely read a goal's progress log (empty array when absent). */
export function goalLog(goal: GoalWithLog | IepGoal): IepProgressEntry[] {
  return (goal as GoalWithLog).progressLog ?? [];
}

/**
 * The most recent status recorded in the log. Entries are appended in
 * chronological order, but we pick the max `at` defensively so order never
 * matters. Falls back to the goal's own `status` when the log is empty.
 */
export function latestStatusFromLog(goal: GoalWithLog | IepGoal): IepGoalStatus {
  const log = goalLog(goal);
  if (log.length === 0) return goal.status;
  let latest = log[0];
  for (const e of log) if (e.at >= latest.at) latest = e;
  return latest.status as IepGoalStatus;
}

/** Author of a new progress entry. */
export interface ProgressActor {
  uid: string;
  name?: string;
}

/**
 * Build a new progress entry. `note` is dropped when blank/whitespace so we
 * never persist empty strings (Firestore writers strip `undefined`).
 */
export function makeProgressEntry(
  status: IepGoalStatus,
  actor: ProgressActor,
  note?: string,
  at: number = Date.now(),
): IepProgressEntry {
  const entry: IepProgressEntry = { at, byUid: actor.uid, status };
  if (actor.name) entry.byName = actor.name;
  const trimmed = note?.trim();
  if (trimmed) entry.note = trimmed;
  return entry;
}

/**
 * Return a NEW goal with `status` set and a progress entry APPENDED to the log
 * (the previous log is never mutated). Pure — callers persist the result.
 *
 * If the goal had no `progressLog` yet, the goal's current status is seeded as
 * the first entry (so pre-existing plans keep a baseline) before the new one is
 * appended — unless the existing status already equals the new status, in which
 * case only the new entry is added.
 */
export function appendProgress(
  goal: GoalWithLog | IepGoal,
  status: IepGoalStatus,
  actor: ProgressActor,
  note?: string,
  at: number = Date.now(),
): GoalWithLog {
  const existing = goalLog(goal);
  const seed: IepProgressEntry[] =
    existing.length === 0 && goal.status !== status
      ? [makeProgressEntry(goal.status, actor, undefined, at - 1)]
      : [];
  const next = makeProgressEntry(status, actor, note, at);
  return { ...goal, status, progressLog: [...existing, ...seed, next] };
}
