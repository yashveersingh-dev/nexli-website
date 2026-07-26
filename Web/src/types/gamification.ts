import type { IconName } from '@/components/Icon';

/**
 * Gamification domain types (Phase 1 — "buildable now").
 *
 * Everything here is COMPUTED client-side from data NEXLI already stores
 * (attendance_days, homework_submissions, book_circulation, students.tags,
 * houses). There is no source-of-truth gamification collection in Phase 1: the
 * engine derives points / level / streaks / badges live on each page mount, so
 * the dashboard is always honest about real activity and shows "start earning"
 * empty states where no source data exists.
 */

/** The five point currencies (NEP-aligned), kept separate so they stay explainable. */
export type PointCurrency = 'discipline' | 'diligence' | 'reading' | 'participation' | 'character';

/** Per-currency point totals. */
export type PointBook = Record<PointCurrency, number>;

/** What a badge measures — drives the icon, copy and grouping on the wall. */
export type BadgeCategory = 'attendance' | 'homework' | 'reading' | 'milestone' | 'recognition';

/** Tier colouring for a badge (cosmetic; maps to a Badge variant). */
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * The machine-checkable stats the engine produces and badge criteria are
 * evaluated against. Pure data — no Firestore, no React.
 */
export interface GamificationStats {
  /** Per-currency points. */
  points: PointBook;
  /** Sum of all currencies = total XP. */
  totalXp: number;
  /** Current consecutive-present attendance streak (days). */
  attendanceStreak: number;
  /** Longest attendance streak ever recorded (days). */
  attendanceStreakBest: number;
  /** Current consecutive on-time homework streak (submissions). */
  homeworkStreak: number;
  /** Longest on-time homework streak (submissions). */
  homeworkStreakBest: number;
  /** Number of distinct days with a library/reading activity (reading habit). */
  readingDays: number;
  /** Attendance present-day percentage (0–100). */
  attendancePct: number;
  /** Total attendance days on record (0 ⇒ no source data yet). */
  attendanceDays: number;
  /** On-time homework submissions counted. */
  homeworkOnTime: number;
  /** Total homework submissions counted (on-time + late). */
  homeworkTotal: number;
  /** Library issues counted. */
  libraryIssues: number;
  /** True when the student has no source activity at all (honest empty state). */
  hasActivity: boolean;
}

/** Resolved level from total XP against the level curve. */
export interface LevelInfo {
  /** 1-based level. */
  level: number;
  /** Friendly rank name, e.g. "Scholar II". */
  levelName: string;
  /** XP accumulated within the current level. */
  xpInLevel: number;
  /** XP needed to span the current level (Infinity at the cap). */
  xpForLevel: number;
  /** XP remaining to the next level (0 at the cap). */
  xpToNext: number;
  /** Progress through the current level, 0–1 (1 at the cap). */
  progress: number;
  /** True once the top level is reached. */
  isMax: boolean;
}

/** A criterion that auto-awards a badge from computed stats. */
export type BadgeCriterion =
  | { kind: 'attendanceStreak'; threshold: number }
  | { kind: 'homeworkStreak'; threshold: number }
  | { kind: 'homeworkOnTime'; threshold: number }
  | { kind: 'readingDays'; threshold: number }
  | { kind: 'libraryIssues'; threshold: number }
  | { kind: 'totalXp'; threshold: number }
  | { kind: 'attendancePct'; threshold: number; minDays: number }
  /** Awarded when the student holds a leadership tag (Prefect, Captain…). */
  | { kind: 'leadership' };

/** A catalogue badge definition (static, data-driven). */
export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  category: BadgeCategory;
  tier: BadgeTier;
  /** Human-readable "how to earn it" line shown on locked badges. */
  howToEarn: string;
  /** Machine rule the engine checks against the computed stats. */
  criterion: BadgeCriterion;
  /** Display order within a category. */
  order: number;
}

/** A badge plus whether the student has earned it (with progress for locked ones). */
export interface BadgeStatus {
  def: BadgeDef;
  earned: boolean;
  /** Progress toward the criterion, 0–1 (1 ⇒ earned). */
  progress: number;
  /** "3 / 7 days" style progress label for locked badges. */
  progressLabel?: string;
}

/** A surfaced leadership honour (from students.tags). */
export interface Recognition {
  title: string;
  /** Short explanation of the role. */
  blurb: string;
  icon: IconName;
}
