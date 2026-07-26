import type { TenantRecord } from './models';

/* ============================================================================
 * P8 — NEP Holistic Progress Card + Special Education / IEP.
 * ==========================================================================*/

/* ------------------------------ NEP HPC ----------------------------------- */

export type HpcTerm = 'term1' | 'term2' | 'annual';

/**
 * Approval lifecycle. Teachers/coordinators author (`draft`) and `submit` for
 * approval; a Principal/VP `approve` (which publishes) or `return` (with a note,
 * back to the author). `published` stays consistent with `approved`.
 */
export type HpcApprovalStatus = 'draft' | 'submitted' | 'approved' | 'returned';

/** One axis of the holistic radar (e.g. Cognitive, Socio-emotional, Physical). */
export interface HpcDomainRating {
  domain: string;
  rating: number; // 1–5
  descriptor?: string;
}

export interface HpcSubjectLine {
  subject: string;
  grade?: string;
  remark?: string;
}

/** NEP 2020 Holistic Progress Card — per student, per term. */
export interface HpcCard extends TenantRecord {
  studentId: string;
  studentName: string;
  gradeName?: string;
  sectionName?: string;
  academicYear: string;
  term: HpcTerm;
  domains: HpcDomainRating[]; // radar
  scholastic: HpcSubjectLine[];
  coScholastic?: HpcSubjectLine[];
  attendancePct?: number;
  strengths?: string;
  areasToImprove?: string;
  teacherRemark?: string;
  selfReflection?: string;
  peerFeedback?: string;
  /** Stays consistent with `approvalStatus === 'approved'`. Visible to parent/student only when true. */
  published?: boolean;

  /* ----- Approval workflow ----- */
  approvalStatus?: HpcApprovalStatus;
  submittedByName?: string;
  submittedAt?: number;
  approvedByName?: string;
  approvedAt?: number;
  /** Reviewer's note — required on Return, optional on Approve. */
  approvalNote?: string;
}

/* ------------------------- Special Education / IEP ------------------------ */

export type IepGoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'revised';

export interface IepGoal {
  area: string; // e.g. Communication, Motor, Academic, Behaviour
  goal: string;
  strategy?: string;
  status: IepGoalStatus;
  targetDate?: number;
}

export type IepStatus = 'draft' | 'active' | 'review_due' | 'closed';

export interface IepPlan extends TenantRecord {
  studentId: string;
  studentName: string;
  gradeName?: string;
  disability?: string;
  diagnosis?: string;
  strengths?: string;
  needs?: string;
  accommodations?: string[];
  goals: IepGoal[];
  startDate?: number;
  reviewDate?: number;
  teamMembers?: string[];
  status: IepStatus;
}

export type TherapyType = 'speech' | 'occupational' | 'physiotherapy' | 'behavioural' | 'counseling' | 'remedial';
export type TherapyProgress = 'poor' | 'fair' | 'good' | 'excellent';

export interface TherapyLog extends TenantRecord {
  studentId: string;
  studentName: string;
  iepPlanId?: string;
  type: TherapyType;
  date: number;
  therapist?: string;
  focus?: string;
  notes?: string;
  progress?: TherapyProgress;
  durationMins?: number;
}
