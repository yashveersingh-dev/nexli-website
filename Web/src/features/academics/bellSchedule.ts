import { setDoc } from 'firebase/firestore';
import { schoolSettingsRef, useDocument } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import type { Actor } from '@/features/school/data';
import type { RoleId } from '@/types/roles';
import {
  DEFAULT_PERIODS,
  type PeriodDef,
  type Substitution,
  type TimetableSlot,
  type Weekday,
} from '@/types/academics';

/**
 * Configurable bell schedule (per school). The grid rows in the timetable are no
 * longer hard-wired to `DEFAULT_PERIODS`: each school stores its own ordered list
 * of periods/breaks at `schools/{id}/settings/bell_schedule`. When that doc is
 * absent we transparently fall back to `DEFAULT_PERIODS`, so existing tenants keep
 * working without any migration.
 *
 * This module also centralises the timetable's two "intelligent" concerns so they
 * are unit-testable and reused by both the Timetable and Substitutions tabs:
 *   • clash detection (teacher / room / section double-booking)
 *   • substitution suggestions (rank free teachers for an absentee's slots)
 */

const BELL_SCHEDULE_DOC = 'bell_schedule';

export interface BellSchedule {
  periods: PeriodDef[];
}

/* ----------------------------------------------------------------------- */
/* Read / write the config doc                                              */
/* ----------------------------------------------------------------------- */

export interface BellScheduleState {
  periods: PeriodDef[];
  /** True once the underlying doc has resolved (loaded or confirmed absent). */
  loading: boolean;
  /** True when the school has saved its own schedule (vs. the default fallback). */
  isCustom: boolean;
  error?: Error;
}

/**
 * Live bell schedule for a school. Falls back to `DEFAULT_PERIODS` when no config
 * doc exists yet. Pass a falsy `schoolId` to stay idle (returns the default).
 */
export function useBellSchedule(schoolId?: string): BellScheduleState {
  const { data, loading, error } = useDocument<BellSchedule>(
    schoolId ? schoolSettingsRef(schoolId, BELL_SCHEDULE_DOC) : null,
  );
  const custom = Array.isArray(data?.periods) && data!.periods.length > 0;
  return {
    periods: custom ? sortPeriods(data!.periods) : DEFAULT_PERIODS,
    loading,
    isCustom: custom,
    error,
  };
}

/** Persist the school's bell schedule (full replace) + audit. */
export async function saveBellSchedule(
  schoolId: string,
  periods: PeriodDef[],
  actor: Actor,
): Promise<void> {
  await setDoc(
    schoolSettingsRef(schoolId, BELL_SCHEDULE_DOC),
    {
      periods: sortPeriods(periods).map(normalisePeriod),
      schoolId,
      lastModifiedAt: Date.now(),
      lastModifiedBy: actor.uid,
    },
    { merge: true },
  );
  void writeAuditEvent({
    action: 'settings.changed',
    schoolId,
    actor,
    targetType: 'bell_schedule',
    targetId: BELL_SCHEDULE_DOC,
    summary: `Bell schedule updated (${periods.filter((p) => !p.isBreak).length} periods)`,
  });
}

/* ----------------------------------------------------------------------- */
/* Period helpers                                                           */
/* ----------------------------------------------------------------------- */

/** Sort by start time so a saved/edited schedule always reads top-to-bottom. */
export function sortPeriods(periods: PeriodDef[]): PeriodDef[] {
  return periods.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function normalisePeriod(p: PeriodDef): PeriodDef {
  const out: PeriodDef = {
    no: p.no,
    label: p.label.trim() || (p.isBreak ? 'Break' : `Period ${p.no}`),
    startTime: p.startTime,
    endTime: p.endTime,
  };
  if (p.isBreak) out.isBreak = true;
  return out;
}

/** Teaching periods only (drops breaks/lunch), in schedule order. */
export function teachingPeriods(periods: PeriodDef[]): PeriodDef[] {
  return periods.filter((p) => !p.isBreak);
}

/** Resolve a period's label from its number, given a schedule. */
export function periodLabelOf(periods: PeriodDef[], no: number): string {
  return periods.find((p) => p.no === no && !p.isBreak)?.label ?? `Period ${no}`;
}

/**
 * Validate an edited schedule before saving. Returns a human message on the first
 * problem, or null when the schedule is sound.
 */
export function validateSchedule(periods: PeriodDef[]): string | null {
  if (periods.length === 0) return 'Add at least one period.';
  const teaching = teachingPeriods(periods);
  if (teaching.length === 0) return 'Add at least one teaching period (not a break).';
  for (const p of periods) {
    if (!p.label.trim()) return 'Every row needs a label.';
    if (!isHHMM(p.startTime) || !isHHMM(p.endTime)) return 'Times must be valid (HH:MM).';
    if (p.endTime <= p.startTime) return `"${p.label}" must end after it starts.`;
  }
  // Duplicate teaching period numbers would corrupt slot keys.
  const nums = teaching.map((p) => p.no);
  if (new Set(nums).size !== nums.length) return 'Two teaching periods share the same number.';
  return null;
}

function isHHMM(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Next free teaching-period number for a brand-new row. */
export function nextPeriodNo(periods: PeriodDef[]): number {
  const used = teachingPeriods(periods).map((p) => p.no);
  let n = 1;
  while (used.includes(n)) n += 1;
  return n;
}

/* ----------------------------------------------------------------------- */
/* Clash detection                                                          */
/* ----------------------------------------------------------------------- */

export type ClashKind = 'teacher' | 'room' | 'section';

export interface Clash {
  kind: ClashKind;
  /** The slot already occupying that day+period. */
  with: TimetableSlot;
}

/** Input for a proposed (about-to-save) timetable slot. */
export interface ProposedSlot {
  /** The slot id we are writing (so we never clash with ourselves). */
  id: string;
  sectionId: string;
  day: Weekday;
  periodNo: number;
  teacherUid?: string;
  roomId?: string;
}

/**
 * Detect clashes for a proposed slot against the full timetable. A clash is any
 * OTHER slot at the same day + period that shares the teacher, the room, or the
 * section. Returns one entry per distinct conflicting slot (deduped).
 */
export function detectClashes(proposed: ProposedSlot, all: TimetableSlot[]): Clash[] {
  const clashes: Clash[] = [];
  const seen = new Set<string>();
  for (const s of all) {
    if (s.id === proposed.id) continue;
    if (s.day !== proposed.day || s.periodNo !== proposed.periodNo) continue;
    const kinds: ClashKind[] = [];
    if (proposed.teacherUid && s.teacherUid === proposed.teacherUid) kinds.push('teacher');
    if (proposed.roomId && s.roomId === proposed.roomId) kinds.push('room');
    if (proposed.sectionId && s.sectionId === proposed.sectionId) kinds.push('section');
    for (const kind of kinds) {
      const key = `${kind}:${s.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      clashes.push({ kind, with: s });
    }
  }
  return clashes;
}

/** A clash, rendered as a plain sentence for the alert dialog. */
export function clashSentence(c: Clash): string {
  const where = `${c.with.sectionName ?? 'another section'}`;
  const periodLabel = `Period ${c.with.periodNo}`;
  switch (c.kind) {
    case 'teacher':
      return `Teacher ${c.with.teacherName ?? 'this teacher'} is already assigned to ${periodLabel} in ${where}.`;
    case 'room':
      return `Room ${c.with.roomName ?? 'this room'} is already booked for ${periodLabel} in ${where}.`;
    case 'section':
      return `${where} already has a class in ${periodLabel}${c.with.subjectName ? ` (${c.with.subjectName})` : ''}.`;
  }
}

/* ----------------------------------------------------------------------- */
/* Teaching roles + substitution suggestions                               */
/* ----------------------------------------------------------------------- */

/** Roles that legitimately stand in front of a class (eligible substitutes). */
const TEACHING_ROLES = new Set<RoleId>([
  'principal',
  'vp_academic',
  'academic_coordinator',
  'hod',
  'class_teacher',
  'subject_teacher',
  'substitute_teacher',
  'special_educator',
  'sports_teacher',
  'arts_teacher',
  'lab_assistant',
  'librarian',
]);

export interface TeacherLike {
  id: string;
  name?: string;
  roleId?: RoleId;
  status?: string;
}

/** Is this staff member eligible to teach / substitute? */
export function isTeachingStaff(s: TeacherLike): boolean {
  if (s.status && s.status !== 'active' && s.status !== 'on_leave') return false;
  // No role recorded → treat as a generic teacher (schools often leave it blank).
  return s.roleId ? TEACHING_ROLES.has(s.roleId) : true;
}

/** A slot left uncovered by an absent teacher on a given weekday. */
export interface AffectedSlot {
  slot: TimetableSlot;
}

/** All of an absent teacher's slots for a weekday, in period order. */
export function affectedSlotsFor(
  teacherUid: string,
  day: Weekday,
  all: TimetableSlot[],
): TimetableSlot[] {
  return all
    .filter((s) => s.day === day && s.teacherUid === teacherUid)
    .sort((a, b) => a.periodNo - b.periodNo);
}

export interface SubSuggestion {
  teacher: TeacherLike;
  /** How many slots this teacher already teaches that day (lower = better). */
  loadThatDay: number;
}

/**
 * Rank substitute candidates for a single (day, period) slot. A candidate is any
 * teaching staff member who is NOT the absentee and has NO slot at that exact
 * day+period. Ranked by fewest periods already taught that day (so we spread the
 * load), then alphabetically for a stable order.
 */
export function suggestSubstitutes(
  forSlot: { day: Weekday; periodNo: number },
  absentUid: string,
  staff: TeacherLike[],
  all: TimetableSlot[],
): SubSuggestion[] {
  // Day-level load per teacher (used both for the "busy at this period" check
  // and for ranking).
  const loadByTeacher = new Map<string, number>();
  const busyAtPeriod = new Set<string>();
  for (const s of all) {
    if (s.day !== forSlot.day || !s.teacherUid) continue;
    loadByTeacher.set(s.teacherUid, (loadByTeacher.get(s.teacherUid) ?? 0) + 1);
    if (s.periodNo === forSlot.periodNo) busyAtPeriod.add(s.teacherUid);
  }

  return staff
    .filter((t) => t.id !== absentUid && isTeachingStaff(t) && !busyAtPeriod.has(t.id))
    .map((t) => ({ teacher: t, loadThatDay: loadByTeacher.get(t.id) ?? 0 }))
    .sort(
      (a, b) =>
        a.loadThatDay - b.loadThatDay ||
        (a.teacher.name ?? '').localeCompare(b.teacher.name ?? ''),
    );
}

/* ----------------------------------------------------------------------- */
/* Substitution conflict check (substitute double-booked)                   */
/* ----------------------------------------------------------------------- */

/** A proposed substitution we are about to save (the minimal fields a clash needs). */
export interface ProposedSubstitution {
  /** When editing an existing sub, its id — so we never clash with ourselves. */
  id?: string;
  date: number;
  periodNo: number;
  sectionId: string;
  substituteTeacherUid?: string;
}

/**
 * Find an EXISTING substitution that would double-book the chosen substitute: same
 * date + same period, same substitute teacher, but a DIFFERENT class (section).
 * Returns the conflicting substitution, or `undefined` when the substitute is free.
 *
 * This is the gap the timetable check alone cannot cover — a teacher who is free in
 * the master timetable at that period may already have been pulled in to cover some
 * OTHER absent teacher's class in the same slot. Pure + side-effect free so it is
 * unit-tested and reused by both the manual "Add substitution" form and the
 * "Mark a teacher absent" flow.
 *
 * Booking the SAME substitute for the SAME class+period again is not a conflict
 * (it's an idempotent re-assignment / overwrite, not a clash).
 */
export function findSubstituteConflict(
  proposed: ProposedSubstitution,
  existing: readonly Substitution[],
): Substitution | undefined {
  if (!proposed.substituteTeacherUid) return undefined;
  return existing.find(
    (s) =>
      s.id !== proposed.id &&
      s.date === proposed.date &&
      s.periodNo === proposed.periodNo &&
      s.substituteTeacherUid === proposed.substituteTeacherUid &&
      s.sectionId !== proposed.sectionId,
  );
}

/** True when the chosen substitute is already booked elsewhere that date+period. */
export function isSubstituteDoubleBooked(
  proposed: ProposedSubstitution,
  existing: readonly Substitution[],
): boolean {
  return findSubstituteConflict(proposed, existing) !== undefined;
}
