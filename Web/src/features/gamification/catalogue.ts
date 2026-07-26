import type { BadgeDef, BadgeTier, PointCurrency } from '@/types/gamification';
import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';

/**
 * Static, data-driven gamification catalogue for Phase 1.
 *
 * Everything is deterministic and offline: point rules, the level curve and the
 * badge catalogue live here as plain data so the "how points are earned" and
 * "how to earn this badge" copy on the dashboard is always exactly what the
 * engine computes — no black box, parent-trustable.
 */

/* ----------------------------- Point rules ----------------------------- */
/**
 * Points awarded per real recorded behaviour. Tuned conservatively so a student
 * with real activity sees a believable total, and one with none sees zero.
 */
export const POINT_RULES = {
  attendancePresent: 5, // each present/late/half day
  homeworkOnTime: 10, // each on-time submission
  homeworkLate: 3, // each late submission (still counts a little)
  libraryIssue: 4, // each book issued (reading habit)
  attendanceStreakBonus: 2, // per day of the CURRENT attendance streak
  homeworkStreakBonus: 2, // per submission of the CURRENT homework streak
  leadershipRecognition: 50, // a standing honour (Prefect/Captain…) is character points
} as const;

/* ----------------------------- Level curve ----------------------------- */
/**
 * Cumulative XP required to REACH each level (index 0 = level 1 at 0 XP). A
 * gentle early curve so the first couple of levels feel reachable, then it
 * widens. `LEVEL_NAMES` is parallel to the thresholds.
 */
export const LEVEL_CURVE: readonly number[] = [0, 50, 120, 220, 360, 560, 820, 1160, 1600, 2200];
export const LEVEL_NAMES: readonly string[] = [
  'Scholar I',
  'Scholar II',
  'Scholar III',
  'Achiever I',
  'Achiever II',
  'Achiever III',
  'Champion I',
  'Champion II',
  'Champion III',
  'Legend',
];

/* ----------------------------- Currency meta ----------------------------- */
export const CURRENCY_META: Record<PointCurrency, { label: string; icon: IconName; how: string }> = {
  discipline: { label: 'Discipline', icon: 'clock', how: `Show up: +${POINT_RULES.attendancePresent} for each day present (plus a streak bonus).` },
  diligence: { label: 'Diligence', icon: 'check', how: `Submit on time: +${POINT_RULES.homeworkOnTime} on-time, +${POINT_RULES.homeworkLate} if late.` },
  reading: { label: 'Reading', icon: 'book', how: `Read more: +${POINT_RULES.libraryIssue} for each book you borrow from the library.` },
  participation: { label: 'Participation', icon: 'calendar', how: 'Join school events and competitions (recorded as you take part).' },
  character: { label: 'Character', icon: 'award', how: 'Earned through leadership roles and recognitions awarded by your school.' },
};

/** Tier → Badge variant (visual colour of an earned badge). */
export const TIER_VARIANT: Record<BadgeTier, BadgeVariant> = {
  bronze: 'warning',
  silver: 'muted',
  gold: 'success',
  platinum: 'info',
};

export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/* ----------------------------- Badge catalogue ----------------------------- */
/**
 * The full badge catalogue. Each badge has a machine-checkable `criterion` the
 * engine evaluates against computed stats, and human `howToEarn` copy shown on
 * locked (greyed) badges so students know exactly what to do next.
 */
export const BADGES: readonly BadgeDef[] = [
  // --- Attendance ---
  {
    id: 'attend_streak_5',
    label: 'On a Roll',
    description: 'Five school days present in a row.',
    icon: 'clock',
    category: 'attendance',
    tier: 'bronze',
    howToEarn: 'Be present 5 school days in a row.',
    criterion: { kind: 'attendanceStreak', threshold: 5 },
    order: 1,
  },
  {
    id: 'attend_streak_15',
    label: 'Steady Scholar',
    description: 'Fifteen-day attendance streak.',
    icon: 'clock',
    category: 'attendance',
    tier: 'silver',
    howToEarn: 'Keep your attendance streak going for 15 school days.',
    criterion: { kind: 'attendanceStreak', threshold: 15 },
    order: 2,
  },
  {
    id: 'attend_streak_30',
    label: 'Never Miss',
    description: 'A thirty-day attendance streak.',
    icon: 'trophy',
    category: 'attendance',
    tier: 'gold',
    howToEarn: 'Reach a 30 school-day attendance streak.',
    criterion: { kind: 'attendanceStreak', threshold: 30 },
    order: 3,
  },
  {
    id: 'attend_pct_95',
    label: 'Always Here',
    description: '95% attendance across the year.',
    icon: 'calendar',
    category: 'attendance',
    tier: 'platinum',
    howToEarn: 'Keep your attendance at 95% or higher (over 20+ recorded days).',
    criterion: { kind: 'attendancePct', threshold: 95, minDays: 20 },
    order: 4,
  },

  // --- Homework ---
  {
    id: 'hw_first',
    label: 'First Steps',
    description: 'Your first homework submitted on time.',
    icon: 'check',
    category: 'homework',
    tier: 'bronze',
    howToEarn: 'Submit one homework on time.',
    criterion: { kind: 'homeworkOnTime', threshold: 1 },
    order: 1,
  },
  {
    id: 'hw_streak_5',
    label: 'Consistent',
    description: 'Five on-time submissions in a row.',
    icon: 'check',
    category: 'homework',
    tier: 'silver',
    howToEarn: 'Submit 5 homeworks in a row, all on time.',
    criterion: { kind: 'homeworkStreak', threshold: 5 },
    order: 2,
  },
  {
    id: 'hw_streak_15',
    label: 'Dependable',
    description: 'Fifteen on-time submissions in a row.',
    icon: 'trophy',
    category: 'homework',
    tier: 'gold',
    howToEarn: 'Reach a 15 on-time homework streak.',
    criterion: { kind: 'homeworkStreak', threshold: 15 },
    order: 3,
  },

  // --- Reading ---
  {
    id: 'read_first',
    label: 'Bookworm',
    description: 'Borrowed your first library book.',
    icon: 'book',
    category: 'reading',
    tier: 'bronze',
    howToEarn: 'Borrow one book from the library.',
    criterion: { kind: 'libraryIssues', threshold: 1 },
    order: 1,
  },
  {
    id: 'read_5',
    label: 'Avid Reader',
    description: 'Borrowed five library books.',
    icon: 'book',
    category: 'reading',
    tier: 'silver',
    howToEarn: 'Borrow 5 books from the library.',
    criterion: { kind: 'libraryIssues', threshold: 5 },
    order: 2,
  },
  {
    id: 'read_15',
    label: 'Library Legend',
    description: 'Borrowed fifteen library books.',
    icon: 'trophy',
    category: 'reading',
    tier: 'gold',
    howToEarn: 'Borrow 15 books from the library.',
    criterion: { kind: 'libraryIssues', threshold: 15 },
    order: 3,
  },

  // --- Milestone (XP) ---
  {
    id: 'xp_100',
    label: 'Getting Started',
    description: 'Earned 100 XP.',
    icon: 'award',
    category: 'milestone',
    tier: 'bronze',
    howToEarn: 'Earn 100 total points from attendance, homework and reading.',
    criterion: { kind: 'totalXp', threshold: 100 },
    order: 1,
  },
  {
    id: 'xp_500',
    label: 'High Achiever',
    description: 'Earned 500 XP.',
    icon: 'award',
    category: 'milestone',
    tier: 'gold',
    howToEarn: 'Earn 500 total points.',
    criterion: { kind: 'totalXp', threshold: 500 },
    order: 2,
  },

  // --- Recognition ---
  {
    id: 'leadership',
    label: 'Leader',
    description: 'Holds a leadership role at school.',
    icon: 'crown',
    category: 'recognition',
    tier: 'platinum',
    howToEarn: 'Awarded by your school for a leadership role (Prefect, Captain, Head…).',
    criterion: { kind: 'leadership' },
    order: 1,
  },
];

/* ----------------------------- Recognition titles ----------------------------- */
/**
 * Leadership positions stored as `students.tags` (kept in sync with
 * AppLayout.LEADERSHIP_TITLES). Surfaced as honour cards on the dashboard.
 */
export const LEADERSHIP_TITLES: readonly string[] = [
  'Head Boy',
  'Head Girl',
  'Sports Captain',
  'House Captain',
  'Vice House Captain',
  'Prefect',
];

/** Short blurb per recognised title (falls back to a generic line). */
export const RECOGNITION_BLURB: Record<string, string> = {
  'Head Boy': 'Senior student leader representing the school.',
  'Head Girl': 'Senior student leader representing the school.',
  'Sports Captain': 'Leads the school in sport and fitness.',
  'House Captain': 'Leads their house in events and points.',
  'Vice House Captain': 'Supports the house captain in leading their house.',
  Prefect: 'Trusted to help run the school and set an example.',
};
