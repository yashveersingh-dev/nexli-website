/* ============================ Digital Skills Passport / e-Portfolio ============================ */

/**
 * A cumulative achievement record in a student's e-portfolio (Phase 1).
 *
 * Tenant-scoped: /schools/{schoolId}/portfolio/{id} — one doc per achievement,
 * keyed to a student via `studentId`. Students write their own entries (status
 * 'submitted'); verifier staff flip them to 'verified' with their name + date.
 *
 * Evidence in Phase 1 is a pasted URL only — rich photo/file upload needs Firebase
 * Storage (Spark-tier limited) and is deferred to a later phase.
 */
export type AchievementCategory =
  | 'academic'
  | 'sports'
  | 'arts'
  | 'co-curricular'
  | 'volunteering'
  | 'internship'
  | 'award'
  | 'other';

export type AchievementStatus = 'submitted' | 'verified' | 'rejected';

export interface AchievementVerification {
  /** Verifier's display name, shown on the "Verified by …" badge. */
  verifierName: string;
  /** Verifier's auth uid (trust/audit). */
  verifierUid: string;
  /** Epoch ms the entry was verified. */
  verifiedAt: number;
  /** Optional verifier note (e.g. rejection reason or endorsement). */
  note?: string;
}

export interface PortfolioEntry {
  id: string;
  schoolId: string;
  /** The owning student's record id (own-record scope key). */
  studentId: string;
  /** Denormalised for staff queue display (no extra read needed). */
  studentName?: string;
  studentClass?: string;

  category: AchievementCategory;
  title: string;
  description?: string;
  /** Achievement date (epoch ms). */
  date: number;
  /** Issuing / hosting organisation (e.g. "State Athletics Assn."). */
  organisation?: string;
  /** Free-form skill tags (e.g. "public speaking", "python"). */
  skills?: string[];
  /**
   * A pasted evidence URL (certificate/photo/portfolio link). Phase 1 stores the
   * link only; uploading the file itself is deferred until Storage is available.
   */
  evidenceUrl?: string;

  status: AchievementStatus;
  verification?: AchievementVerification;

  createdAt?: number;
  createdBy?: string;
  lastModifiedAt?: number;
}

/** A computed summary of a portfolio's achievements (counts + skill frequencies). */
export interface SkillsSummary {
  total: number;
  verified: number;
  /** Number of distinct skill tags across all entries. */
  distinctSkills: number;
  /** Achievement counts per category (only non-zero categories listed downstream). */
  byCategory: Record<AchievementCategory, number>;
  /** Skill tag → number of achievements carrying it, highest first. */
  skillTags: Array<{ skill: string; count: number }>;
}
