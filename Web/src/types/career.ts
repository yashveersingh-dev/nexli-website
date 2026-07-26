/* ============================ Career Counselling & Aptitude ============================
 *
 * Phase 1: a 100%-OFFLINE aptitude/interest assessment + deterministic scoring engine.
 *
 * The assessment combines two transparent, well-known instruments:
 *   1. A RIASEC interest inventory (Holland codes — Realistic, Investigative, Artistic,
 *      Social, Enterprising, Conventional). Likert items, some reverse-keyed.
 *   2. A short multiple-intelligence / aptitude set (numerical, verbal, logical,
 *      spatial, social). A/B preference items.
 *
 * Scoring is pure and deterministic: identical answers always yield an identical
 * profile, stream recommendation and career-cluster ranking. No randomness, no AI.
 * The optional AI narrative is gated behind the existing AILockedOverlay — never faked.
 */

import type { TenantRecord } from './models';

/* ---------- RIASEC ---------- */

export type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
export const RIASEC_CODES: readonly RiasecCode[] = ['R', 'I', 'A', 'S', 'E', 'C'] as const;

/** Per-construct RIASEC scores (0–100, normalised). */
export type RiasecScores = Record<RiasecCode, number>;

/* ---------- Aptitude / Multiple-Intelligence ---------- */

export type AptitudeKey = 'numerical' | 'verbal' | 'logical' | 'spatial' | 'social';
export const APTITUDE_KEYS: readonly AptitudeKey[] = [
  'numerical',
  'verbal',
  'logical',
  'spatial',
  'social',
] as const;

/** Per-aptitude scores (0–100, normalised). */
export type AptitudeScores = Record<AptitudeKey, number>;

export type ScoreBand = 'high' | 'average' | 'low';

/* ---------- Streams & career clusters ---------- */

export type StreamKey = 'science' | 'commerce' | 'arts' | 'vocational';
export const STREAM_KEYS: readonly StreamKey[] = ['science', 'commerce', 'arts', 'vocational'] as const;

/** A weighted fit result for a single stream, with the drivers that produced it. */
export interface StreamFit {
  stream: StreamKey;
  /** Fit percentage 0–100. */
  fit: number;
  /** Human-readable explainability — the scores that drove this fit. */
  drivers: string[];
}

export type CareerClusterKey =
  | 'engineering_tech'
  | 'medical_life_sciences'
  | 'business_finance'
  | 'creative_media'
  | 'social_education'
  | 'skilled_trades';

/** A ranked career-cluster recommendation. */
export interface CareerMatch {
  cluster: CareerClusterKey;
  title: string;
  /** Match percentage 0–100. */
  fit: number;
  /** Why this cluster matched the profile. */
  why: string;
}

/* ---------- Item bank ---------- */

export type ItemSection = 'interest' | 'aptitude';
export type ItemFormat = 'likert' | 'ab';

/** One Likert option (1–5 scale). */
export interface LikertScale {
  value: number;
  label: string;
}

/** A single A/B (forced-choice) option, keyed to a construct. */
export interface AbOption {
  /** Stable option id stored in the answer map. */
  value: 'a' | 'b';
  label: string;
}

/**
 * A single assessment item. Likert items measure one RIASEC construct; A/B items
 * map each choice to an aptitude key. Reverse-keyed Likert items invert the score.
 */
export interface AssessmentItem {
  id: string;
  section: ItemSection;
  format: ItemFormat;
  prompt: string;
  /** RIASEC construct for `interest` Likert items. */
  riasec?: RiasecCode;
  /** Set true if a high Likert score should COUNT AGAINST the construct. */
  reverseKeyed?: boolean;
  /** For `ab` aptitude items: which aptitude each choice scores toward. */
  abMap?: { a: AptitudeKey; b: AptitudeKey };
}

/* ---------- Answers & computed profile ---------- */

/**
 * The raw answer map keyed by item id.
 *   • Likert items store a number 1–5.
 *   • A/B items store 'a' | 'b'.
 */
export type AnswerMap = Record<string, number | 'a' | 'b'>;

/** The full deterministic output of the scoring engine. */
export interface AssessmentProfile {
  riasec: RiasecScores;
  /** Top-3 RIASEC letters, highest first (the Holland code, e.g. "IRA"). */
  hollandCode: string;
  aptitude: AptitudeScores;
  streams: StreamFit[];
  careers: CareerMatch[];
  /** Consistency / effort warnings (e.g. straight-lining). Empty = clean. */
  flags: string[];
}

/* ---------- Persisted attempt ---------- */

export type AttemptStatus = 'completed' | 'reviewed';

/**
 * One student's completed attempt. Stored in the tenant-scoped `careerAssessments`
 * collection (one doc per attempt, scoped by `studentId`). The computed profile is
 * persisted so the report and counsellor review never re-run scoring unnecessarily —
 * though re-running `scoreAssessment(answers)` would yield the identical result.
 */
export interface CareerAssessment extends TenantRecord {
  studentId: string;
  studentName?: string;
  studentClass?: string;
  /** Snapshot of the bank version used, for reproducibility. */
  bankVersion: number;
  answers: AnswerMap;
  profile: AssessmentProfile;
  status: AttemptStatus;
  /** Counsellor's professional note (added on review). */
  counsellorNote?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: number;
  /** Epoch ms the attempt was submitted. */
  completedAt: number;
}
