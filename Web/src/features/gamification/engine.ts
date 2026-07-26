import type { AttendanceDay, BookCirculation, HomeworkSubmission } from '@/types/daily';
import type {
  BadgeDef,
  BadgeStatus,
  GamificationStats,
  LevelInfo,
  PointBook,
  Recognition,
} from '@/types/gamification';
import {
  BADGES,
  LEADERSHIP_TITLES,
  LEVEL_CURVE,
  LEVEL_NAMES,
  POINT_RULES,
  RECOGNITION_BLURB,
} from './catalogue';

/**
 * Pure gamification engine — no Firestore, no React, fully deterministic.
 *
 * The whole game in Phase 1 is COMPUTED from existing records on each render:
 *   • attendance_days  → discipline points + attendance streak + %.
 *   • homework_submissions → diligence points + on-time homework streak.
 *   • book_circulation → reading points + reading-day count.
 *   • students.tags    → leadership recognition + character points.
 *
 * Honest by construction: zero source rows ⇒ zero points ⇒ `hasActivity === false`.
 */

const PRESENT = new Set(['present', 'late', 'half_day']);

const emptyPoints = (): PointBook => ({
  discipline: 0,
  diligence: 0,
  reading: 0,
  participation: 0,
  character: 0,
});

/* --------------------------- Attendance --------------------------- */

/**
 * Attendance stats for one student from the section attendance_days docs.
 * Holidays are skipped (never break a streak). The streak is counted backwards
 * from the most recent recorded day: an absence breaks it.
 */
export function computeAttendance(days: AttendanceDay[], studentId: string): {
  present: number;
  total: number;
  pct: number;
  currentStreak: number;
  bestStreak: number;
} {
  // Only the days that recorded a mark for this student, oldest → newest.
  const marks: { date: string; present: boolean }[] = [];
  let present = 0;
  let total = 0;
  for (const d of days) {
    const st = d.entries?.[studentId];
    if (!st || st === 'holiday') continue; // holiday / not recorded → ignore (freeze)
    total++;
    const isPresent = PRESENT.has(st);
    if (isPresent) present += st === 'half_day' ? 0.5 : 1;
    // Approved leave counts in the % denominator (parity with rankings) but must
    // FREEZE the streak — an excused absence shouldn't break a present-day run.
    if (st === 'leave') continue;
    marks.push({ date: d.date, present: isPresent });
  }
  marks.sort((a, b) => a.date.localeCompare(b.date));

  let best = 0;
  let run = 0;
  for (const m of marks) {
    if (m.present) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  // Current streak = trailing run of present days at the end of the timeline.
  let current = 0;
  for (let i = marks.length - 1; i >= 0; i--) {
    if (marks[i].present) current++;
    else break;
  }

  return { present, total, pct: total ? Math.round((present / total) * 100) : 0, currentStreak: current, bestStreak: best };
}

/* --------------------------- Homework --------------------------- */

/** An on-time submission is one that was submitted/graded and not flagged late/missing. */
function isOnTime(s: HomeworkSubmission): boolean {
  return s.status === 'submitted' || s.status === 'graded';
}
function isCounted(s: HomeworkSubmission): boolean {
  // A real submission attempt (on-time or late); 'assigned'/'missing' don't count.
  return s.status === 'submitted' || s.status === 'graded' || s.status === 'late';
}

/**
 * Homework stats for one student. Streak is over counted submissions ordered by
 * submission time: a late submission breaks the on-time streak.
 */
export function computeHomework(subs: HomeworkSubmission[], studentId: string): {
  onTime: number;
  total: number;
  currentStreak: number;
  bestStreak: number;
} {
  const mine = subs
    .filter((s) => s.studentId === studentId && isCounted(s))
    .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));

  let onTime = 0;
  let best = 0;
  let run = 0;
  for (const s of mine) {
    if (isOnTime(s)) {
      onTime++;
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let i = mine.length - 1; i >= 0; i--) {
    if (isOnTime(mine[i])) current++;
    else break;
  }
  return { onTime, total: mine.length, currentStreak: current, bestStreak: best };
}

/* --------------------------- Library --------------------------- */

/** Reading stats: issues this student made + distinct days with a library activity. */
export function computeReading(circ: BookCirculation[], studentId: string): { issues: number; readingDays: number } {
  const mine = circ.filter((c) => c.borrowerId === studentId && c.borrowerType !== 'staff');
  const days = new Set<string>();
  for (const c of mine) {
    if (c.issuedDate) days.add(new Date(c.issuedDate).toISOString().slice(0, 10));
  }
  return { issues: mine.length, readingDays: days.size };
}

/* --------------------------- Leadership --------------------------- */

/** Leadership tags the student holds, in catalogue order. */
export function leadershipTitles(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  return LEADERSHIP_TITLES.filter((t) => tags.includes(t));
}

export function recognitions(tags: string[] | undefined): Recognition[] {
  return leadershipTitles(tags).map((title) => ({
    title,
    blurb: RECOGNITION_BLURB[title] ?? 'A leadership role recognised by the school.',
    icon: 'crown',
  }));
}

/* --------------------------- Full stats --------------------------- */

export interface ComputeInput {
  attendance: AttendanceDay[];
  submissions: HomeworkSubmission[];
  circulation: BookCirculation[];
  tags?: string[];
}

/** Roll everything up into the engine's `GamificationStats` + point book. */
export function computeStats(input: ComputeInput, studentId: string): GamificationStats {
  const att = computeAttendance(input.attendance, studentId);
  const hw = computeHomework(input.submissions, studentId);
  const read = computeReading(input.circulation, studentId);
  const hasLeadership = leadershipTitles(input.tags).length > 0;

  const points = emptyPoints();
  points.discipline = att.present * POINT_RULES.attendancePresent + att.currentStreak * POINT_RULES.attendanceStreakBonus;
  points.diligence =
    hw.onTime * POINT_RULES.homeworkOnTime +
    (hw.total - hw.onTime) * POINT_RULES.homeworkLate +
    hw.currentStreak * POINT_RULES.homeworkStreakBonus;
  points.reading = read.issues * POINT_RULES.libraryIssue;
  points.character = hasLeadership ? POINT_RULES.leadershipRecognition : 0;
  // participation stays 0 in Phase 1 (event data not wired here) — honest empty.

  const totalXp = Math.round(
    points.discipline + points.diligence + points.reading + points.participation + points.character,
  );

  const hasActivity = att.total > 0 || hw.total > 0 || read.issues > 0 || hasLeadership;

  return {
    points: {
      discipline: Math.round(points.discipline),
      diligence: Math.round(points.diligence),
      reading: Math.round(points.reading),
      participation: Math.round(points.participation),
      character: Math.round(points.character),
    },
    totalXp,
    attendanceStreak: att.currentStreak,
    attendanceStreakBest: att.bestStreak,
    homeworkStreak: hw.currentStreak,
    homeworkStreakBest: hw.bestStreak,
    readingDays: read.readingDays,
    attendancePct: att.pct,
    attendanceDays: att.total,
    homeworkOnTime: hw.onTime,
    homeworkTotal: hw.total,
    libraryIssues: read.issues,
    hasActivity,
  };
}

/* --------------------------- Level --------------------------- */

/** Resolve level + progress to next from total XP against the curve. */
export function computeLevel(totalXp: number): LevelInfo {
  const curve = LEVEL_CURVE;
  // Highest threshold the XP has reached → that level (1-based).
  let idx = 0;
  for (let i = 0; i < curve.length; i++) {
    if (totalXp >= curve[i]) idx = i;
    else break;
  }
  const isMax = idx >= curve.length - 1;
  const levelStart = curve[idx];
  const levelName = LEVEL_NAMES[idx] ?? `Level ${idx + 1}`;

  if (isMax) {
    return {
      level: idx + 1,
      levelName,
      xpInLevel: totalXp - levelStart,
      xpForLevel: Infinity,
      xpToNext: 0,
      progress: 1,
      isMax: true,
    };
  }
  const nextStart = curve[idx + 1];
  const span = nextStart - levelStart;
  const xpInLevel = totalXp - levelStart;
  return {
    level: idx + 1,
    levelName,
    xpInLevel,
    xpForLevel: span,
    xpToNext: Math.max(0, nextStart - totalXp),
    progress: span > 0 ? Math.min(1, xpInLevel / span) : 0,
    isMax: false,
  };
}

/* --------------------------- Badges --------------------------- */

/** Progress (0–1) of a single badge against the computed stats. */
function badgeProgress(def: BadgeDef, stats: GamificationStats): { progress: number; label?: string } {
  const ratio = (have: number, need: number): number => (need <= 0 ? 1 : Math.min(1, have / need));
  const c = def.criterion;
  switch (c.kind) {
    case 'attendanceStreak':
      return { progress: ratio(stats.attendanceStreak, c.threshold), label: `${stats.attendanceStreak} / ${c.threshold} days` };
    case 'homeworkStreak':
      return { progress: ratio(stats.homeworkStreak, c.threshold), label: `${stats.homeworkStreak} / ${c.threshold} in a row` };
    case 'homeworkOnTime':
      return { progress: ratio(stats.homeworkOnTime, c.threshold), label: `${stats.homeworkOnTime} / ${c.threshold}` };
    case 'readingDays':
      return { progress: ratio(stats.readingDays, c.threshold), label: `${stats.readingDays} / ${c.threshold} days` };
    case 'libraryIssues':
      return { progress: ratio(stats.libraryIssues, c.threshold), label: `${stats.libraryIssues} / ${c.threshold} books` };
    case 'totalXp':
      return { progress: ratio(stats.totalXp, c.threshold), label: `${stats.totalXp} / ${c.threshold} XP` };
    case 'attendancePct': {
      // Locked until the minimum sample of days is reached, then by percentage.
      if (stats.attendanceDays < c.minDays) {
        return { progress: ratio(stats.attendanceDays, c.minDays), label: `${stats.attendanceDays} / ${c.minDays} days recorded` };
      }
      return { progress: ratio(stats.attendancePct, c.threshold), label: `${stats.attendancePct}% / ${c.threshold}%` };
    }
    case 'leadership':
      return { progress: 0, label: 'Awarded by your school' };
  }
}

/** True when a badge's criterion is satisfied (used for the earned/locked split). */
export function isBadgeEarned(def: BadgeDef, stats: GamificationStats, hasLeadership: boolean): boolean {
  const c = def.criterion;
  switch (c.kind) {
    case 'attendanceStreak':
      return stats.attendanceStreak >= c.threshold;
    case 'homeworkStreak':
      return stats.homeworkStreak >= c.threshold;
    case 'homeworkOnTime':
      return stats.homeworkOnTime >= c.threshold;
    case 'readingDays':
      return stats.readingDays >= c.threshold;
    case 'libraryIssues':
      return stats.libraryIssues >= c.threshold;
    case 'totalXp':
      return stats.totalXp >= c.threshold;
    case 'attendancePct':
      return stats.attendanceDays >= c.minDays && stats.attendancePct >= c.threshold;
    case 'leadership':
      return hasLeadership;
  }
}

/**
 * Evaluate the whole catalogue → per-badge earned/locked + progress. Earned
 * badges sort first; within a group they sort by category then order.
 */
export function evaluateBadges(stats: GamificationStats, hasLeadership: boolean): BadgeStatus[] {
  const statuses = BADGES.map<BadgeStatus>((def) => {
    const earned = isBadgeEarned(def, stats, hasLeadership);
    const { progress, label } = badgeProgress(def, stats);
    return { def, earned, progress: earned ? 1 : progress, progressLabel: earned ? undefined : label };
  });
  return statuses.sort(
    (a, b) =>
      Number(b.earned) - Number(a.earned) ||
      a.def.category.localeCompare(b.def.category) ||
      a.def.order - b.def.order,
  );
}
