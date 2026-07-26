import type { TenantRecord } from './models';
import type { ResultStatus } from '@/features/examinations/examSchema';

/* ============================================================================
 * Traditional marks Report Card (Phase 1). A standalone module alongside the
 * NEP HPC (`features/hpc`). Two NEW tenant-scoped collections:
 *   schools/{id}/reportCards        — one card per student per term
 *   schools/{id}/reportCardSchemes  — grading & component config per board/class
 *
 * Approval lifecycle mirrors the HPC state machine (draft → submitted →
 * approved/returned, published-on-approve). The shape deliberately reuses the
 * same field names (`approvalStatus`, `submittedByName`, …) so the reportcard
 * workflow helpers stay drop-in compatible with the HPC ones.
 * ==========================================================================*/

export type { ResultStatus };

/** Approval lifecycle (identical semantics to `HpcApprovalStatus`). */
export type ReportCardStatus = 'draft' | 'submitted' | 'approved' | 'returned';

/** One configurable assessment component within a subject (e.g. PT, Notebook, HY). */
export interface ReportCardComponentDef {
  id: string;
  label: string;
  max: number;
  /** Optional display weight (informational only in Phase 1). */
  weight?: number;
}

/** A grade band on the scheme's scale (e.g. A1 = 90–100, point 10). */
export interface ReportCardGradeBand {
  grade: string;
  minPct: number;
  maxPct: number;
  /** Grade point for CGPA-style schemes (optional). */
  point?: number;
  /** Human-readable label for direct-grade systems (e.g. "Outstanding"). */
  description?: string;
}

/**
 * The grading model a scheme uses:
 *  • `marks`        — numerical marks per component → computed % → grade (default).
 *  • `grade_abcd`   — A/B/C/D letter grades entered directly (no marks math).
 *  • `grade_a1b1`   — CBSE-style A1/A2/B1/B2/C1/C2/D direct grades.
 *  • `grade_custom` — user-defined grade symbols + labels.
 * Existing schemes with no value are treated as `marks`.
 */
export type ReportCardGradingSystem = 'marks' | 'grade_abcd' | 'grade_a1b1' | 'grade_custom';

/** A configurable term within a scheme. */
export interface ReportCardTerm {
  id: string;
  label: string;
}

/**
 * A grading & component configuration per board/class. Schools start from a
 * bundled seed scheme (CBSE 9-point, percentage, state-board) and can clone /
 * customise. Persisted under `reportCardSchemes`.
 */
export interface ReportCardScheme extends TenantRecord {
  name: string;
  board: 'CBSE' | 'ICSE' | 'State' | 'Other';
  /** Optional grade-id scoping (informational; the generate flow picks the class). */
  gradeIds?: string[];
  terms: ReportCardTerm[];
  components: ReportCardComponentDef[];
  gradeBands: ReportCardGradeBand[];
  /** Grading model. Absent = 'marks' (backwards-compatible default). */
  gradingSystem?: ReportCardGradingSystem;
  coScholasticAreas?: string[];
  /** Pass threshold as a percentage of the subject max. */
  passPercent: number;
  /** Whether to compute & print class rank. */
  showRank?: boolean;
}

/** One marks line within a subject for a single component. */
export interface ReportCardComponentMark {
  /** Matches a `ReportCardComponentDef.id`. */
  componentId: string;
  label: string;
  max: number;
  /** Obtained marks (null = not recorded). */
  marks: number | null;
}

/** A fully computed subject row on the report card. */
export interface ReportCardSubject {
  subjectName: string;
  components: ReportCardComponentMark[];
  /** Sum of obtained component marks. */
  total: number;
  /** Sum of component maxes (the subject's max). */
  max: number;
  percentage: number;
  grade: string;
  passMark: number;
  passed: boolean;
  remark?: string;
}

/** A co-scholastic / discipline grade line (separate scale). */
export interface ReportCardCoScholastic {
  area: string;
  grade: string;
}

export interface ReportCardAttendance {
  present: number;
  total: number;
  pct: number;
}

export interface ReportCardHealth {
  heightCm?: number;
  weightKg?: number;
}

/** Sport / physical-activity performance line. */
export interface ReportCardSport {
  activity: string;
  performance: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | '';
  remarks?: string;
}

/** Co-curricular activity participation line. */
export interface ReportCardActivity {
  activity: string;
  participation: 'excellent' | 'good' | 'satisfactory' | 'minimal' | '';
  remarks?: string;
}

export interface ReportCardTotals {
  obtained: number;
  max: number;
  percentage: number;
  /** Average grade point across subjects, when the scheme defines points. */
  cgpa?: number;
}

/** A traditional marks report card — per student, per term. */
export interface ReportCard extends TenantRecord {
  studentId: string;
  studentName: string;
  gradeName?: string;
  sectionId?: string;
  sectionName?: string;
  rollNo?: string;
  admissionNo?: string;
  academicYear: string;
  /** Matches a `ReportCardScheme.terms[].id`. */
  term: string;
  termLabel?: string;
  schemeId: string;
  schemeName?: string;

  subjects: ReportCardSubject[];
  coScholastic?: ReportCardCoScholastic[];
  attendance?: ReportCardAttendance;
  health?: ReportCardHealth;
  totals: ReportCardTotals;
  rank?: number;
  classSize?: number;
  result: ResultStatus;
  promotedTo?: string;

  /** Sports / games performance (optional). */
  sports?: ReportCardSport[];
  /** Co-curricular activity participation (optional). */
  activities?: ReportCardActivity[];
  /** Free-form achievement descriptions (prizes, certificates, milestones). */
  achievements?: string[];

  overallRemark?: string;
  classTeacherRemark?: string;
  principalRemark?: string;
  /** Overall coordinator/teacher remark (distinct from the holistic overallRemark). */
  remarks?: string;

  /** Stays consistent with `approvalStatus === 'approved'`. Parent/student see it only when true. */
  published?: boolean;

  /* ----- Approval workflow (mirrors HPC) ----- */
  approvalStatus?: ReportCardStatus;
  submittedByName?: string;
  submittedAt?: number;
  approvedByName?: string;
  approvedAt?: number;
  approvalNote?: string;
}
