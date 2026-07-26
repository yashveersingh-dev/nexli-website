import { z } from 'zod';
import type { IepPlan, IepGoal, IepGoalStatus, IepStatus } from '@/types/special';
import {
  appendProgress,
  goalLog,
  latestStatusFromLog,
  type GoalWithLog,
  type ProgressActor,
} from './progressLog';

/* ============================================================================
 * Special Education / IEP form schema.
 * String-based (input === output) to satisfy the kit `Form<T>` (`ZodType<T>`):
 * no `z.coerce` / `.default()`. Dates are native ISO strings (yyyy-mm-dd) and
 * are coerced to epoch ms at submit. Defaults come from `defaultValues`.
 * Mirrors `studentSchema.ts` / `safeguardingSchema.ts`.
 * ==========================================================================*/

const goalStatuses = ['not_started', 'in_progress', 'achieved', 'revised'] as const;
const planStatuses = ['draft', 'active', 'review_due', 'closed'] as const;

export const iepGoalSchema = z.object({
  area: z.string().trim().min(1, 'Select an area'),
  goal: z.string().trim().min(3, 'Describe the goal'),
  strategy: z.string().trim().optional(),
  status: z.enum(goalStatuses),
  targetDate: z.string().optional(),
});

export const iepPlanSchema = z.object({
  studentId: z.string().trim().min(1, 'Select a student'),
  disability: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  strengths: z.string().trim().optional(),
  needs: z.string().trim().optional(),
  accommodations: z.array(z.string()),
  goals: z.array(iepGoalSchema).min(1, 'Add at least one goal'),
  startDate: z.string().optional(),
  reviewDate: z.string().optional(),
  teamMembers: z.array(z.string()),
  status: z.enum(planStatuses),
});

export type IepGoalValues = z.infer<typeof iepGoalSchema>;
export type IepPlanValues = z.infer<typeof iepPlanSchema>;

/* --------------------------------- helpers -------------------------------- */

/** epoch ms → yyyy-mm-dd for a native date input (empty string when unset). */
export function msToDateInput(ms?: number): string {
  if (!ms && ms !== 0) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** yyyy-mm-dd → epoch ms (undefined when blank/invalid). Noon UTC avoids TZ drift. */
function dateInputToMs(value?: string): number | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const ms = new Date(`${v}T12:00:00`).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/** Fresh blank goal row for `useFieldArray.append`. */
export const emptyGoal = (): IepGoalValues => ({
  area: 'Academic',
  goal: '',
  strategy: '',
  status: 'not_started',
  targetDate: '',
});

/** Defaults for a brand-new plan (one starter goal). */
export const emptyIepForm = (): IepPlanValues => ({
  studentId: '',
  disability: '',
  diagnosis: '',
  strengths: '',
  needs: '',
  accommodations: [],
  goals: [emptyGoal()],
  startDate: '',
  reviewDate: '',
  teamMembers: [],
  status: 'draft',
});

/** Existing plan → editable form values. */
export function iepToForm(p: IepPlan): IepPlanValues {
  return {
    studentId: p.studentId,
    disability: p.disability ?? '',
    diagnosis: p.diagnosis ?? '',
    strengths: p.strengths ?? '',
    needs: p.needs ?? '',
    accommodations: p.accommodations ?? [],
    goals:
      p.goals && p.goals.length > 0
        ? p.goals.map((g) => ({
            area: g.area,
            goal: g.goal,
            strategy: g.strategy ?? '',
            status: g.status,
            targetDate: msToDateInput(g.targetDate),
          }))
        : [emptyGoal()],
    startDate: msToDateInput(p.startDate),
    reviewDate: msToDateInput(p.reviewDate),
    teamMembers: p.teamMembers ?? [],
    status: p.status,
  };
}

/** Map a goal form row → the stored `IepGoal` (drops empty optionals). */
function formToGoal(g: IepGoalValues): IepGoal {
  const out: IepGoal = {
    area: g.area.trim(),
    goal: g.goal.trim(),
    status: g.status as IepGoalStatus,
  };
  const strategy = g.strategy?.trim();
  if (strategy) out.strategy = strategy;
  const td = dateInputToMs(g.targetDate);
  if (td !== undefined) out.targetDate = td;
  return out;
}

/**
 * Carry an existing goal's append-only `progressLog` onto the freshly-mapped
 * form goal (matched by position — the form array has no stable goal id). When
 * the form changes the status vs. the log's latest, APPEND a new entry so the
 * form edit path stays append-only too; otherwise the prior log rides along
 * unchanged.
 */
function mergeGoalProgress(next: IepGoal, prev: IepGoal | undefined, actor?: ProgressActor): IepGoal {
  if (!prev) return next; // newly-added goal — no history to carry
  const prevLog = goalLog(prev as GoalWithLog);
  const withLog: GoalWithLog = prevLog.length ? { ...next, progressLog: prevLog } : { ...next };
  if (actor && next.status !== latestStatusFromLog(prev as GoalWithLog)) {
    return appendProgress(withLog, next.status as IepGoalStatus, actor);
  }
  return withLog;
}

/**
 * Map form values → the IEP plan payload. `studentName`/`gradeName` are resolved
 * by the caller from the picked student; `schoolId` is stamped by the writer.
 *
 * On edit, pass the existing plan's `goals` (+ the editing `actor`) so each
 * goal's append-only `progressLog` survives the round-trip (the form itself does
 * not expose the log) and form-driven status changes append an entry.
 */
export function formToIep(
  v: IepPlanValues,
  prevGoals?: IepGoal[],
  actor?: ProgressActor,
): Omit<IepPlan, 'id' | 'schoolId' | 'studentName' | 'gradeName'> {
  return {
    studentId: v.studentId,
    disability: v.disability?.trim() || undefined,
    diagnosis: v.diagnosis?.trim() || undefined,
    strengths: v.strengths?.trim() || undefined,
    needs: v.needs?.trim() || undefined,
    accommodations: v.accommodations.length ? v.accommodations : undefined,
    goals: v.goals.map((g, i) => mergeGoalProgress(formToGoal(g), prevGoals?.[i], actor)),
    startDate: dateInputToMs(v.startDate),
    reviewDate: dateInputToMs(v.reviewDate),
    teamMembers: v.teamMembers.length ? v.teamMembers : undefined,
    status: v.status as IepStatus,
  };
}

/* ------------------------------ review status ----------------------------- */

/** A plan is review-due when its review date has passed and it is still active. */
export function isReviewDue(plan: Pick<IepPlan, 'reviewDate' | 'status'>, now = Date.now()): boolean {
  if (plan.status === 'closed' || plan.status === 'draft') return false;
  if (!plan.reviewDate) return false;
  return plan.reviewDate < now;
}

/** Count of goals marked achieved (for the CWSN register). */
export function goalsAchieved(goals: IepGoal[] | undefined): number {
  if (!goals) return 0;
  return goals.filter((g) => g.status === 'achieved').length;
}
