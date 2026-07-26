import type { TenantRecord } from './models';

/* ============================================================================
 * Compliance & Governance (P7) — compliance calendar + vault, UDISE+, RTE,
 * POCSO & grievance (restricted), DPDP consent, SMC portal.
 * POCSO → restricted `pocso` collection; grievances → restricted `grievances`.
 * ==========================================================================*/

/* ---------------------- Compliance calendar + vault ----------------------- */

export type ComplianceCategory =
  | 'statutory' | 'affiliation' | 'safety' | 'financial' | 'tax' | 'labour'
  | 'academic' | 'infrastructure' | 'data_privacy' | 'other';

export type ComplianceFrequency = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
export type ComplianceStatus = 'pending' | 'in_progress' | 'filed' | 'overdue' | 'na';

export interface ComplianceItem extends TenantRecord {
  title: string;
  category: ComplianceCategory;
  authority?: string; // CBSE, EPFO, Income Tax, Fire dept…
  description?: string;
  dueDate: number;
  frequency: ComplianceFrequency;
  status: ComplianceStatus;
  assignedToUid?: string;
  assignedToName?: string;
  completedDate?: number;
  reminderDays?: number;
  documentId?: string;
  notes?: string;
}

export type DocumentCategory =
  | 'license' | 'affiliation' | 'noc' | 'certificate' | 'registration'
  | 'insurance' | 'audit' | 'policy' | 'other';

export interface ComplianceDocument extends TenantRecord {
  title: string;
  category: DocumentCategory;
  authority?: string;
  refNo?: string;
  fileUrl?: string;
  issuedDate?: number;
  expiryDate?: number;
  notes?: string;
}

/* ------------------------------- UDISE+ ----------------------------------- */

/** One-doc school UDISE profile (id 'main'); the report aggregates SIS live. */
export interface UdiseProfile {
  udiseCode?: string;
  schoolCategory?: string;
  management?: string;
  affiliationBoard?: string;
  yearEstablished?: string;
  classrooms?: number;
  functionalToilets?: number;
  drinkingWater?: boolean;
  electricity?: boolean;
  library?: boolean;
  computerLab?: boolean;
  playground?: boolean;
  ramp?: boolean;
  boundaryWall?: boolean;
  midDayMeal?: boolean;
  lastSyncedAt?: number;
  notes?: string;
}

/* -------------------------- RTE quota & claims ---------------------------- */

export type RteStage = 'applied' | 'lottery' | 'allotted' | 'admitted' | 'rejected' | 'withdrawn';

export interface RteApplication extends TenantRecord {
  applicantName: string;
  studentId?: string; // set once admitted
  guardianName?: string;
  phone?: string;
  gradeApplied?: string;
  gradeId?: string;
  category?: 'ews' | 'dg'; // economically weaker / disadvantaged group
  annualIncome?: number;
  academicYear?: string;
  applicationNo?: string;
  lotteryRank?: number;
  stage: RteStage;
  appliedDate?: number;
  decidedDate?: number;
  documents?: string[];
  notes?: string;
}

export type ClaimStatus = 'draft' | 'submitted' | 'approved' | 'received' | 'rejected';

export interface RteClaim extends TenantRecord {
  academicYear: string;
  period?: string; // "Term 1", "Q1"
  studentCount: number;
  perStudentAmount: number;
  amountClaimed: number;
  amountReceived?: number;
  status: ClaimStatus;
  submittedDate?: number;
  receivedDate?: number;
  referenceNo?: string;
  notes?: string;
}

/* -------------------- POCSO (restricted `pocso`) -------------------------- */

export type PocsoSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type PocsoStatus = 'reported' | 'under_inquiry' | 'committee_review' | 'referred' | 'action_taken' | 'closed';

export interface PocsoCase extends TenantRecord {
  caseNo: string;
  reportedAt: number;
  natureOfConcern: string;
  severity: PocsoSeverity;
  status: PocsoStatus;
  /** Sensitive — minimise identifiers; restricted to CPO + principal. */
  involvesStudentId?: string;
  reportedByRole?: string;
  summary: string;
  committeeNotes?: string;
  actionTaken?: string;
  referredTo?: string; // CWC, police, counselor…
  closedAt?: number;
  confidential: true;
}

/* ----------------- Grievance (restricted `grievances`) -------------------- */

export type GrievanceCategory = 'academic' | 'administrative' | 'financial' | 'staff_conduct' | 'facilities' | 'safety' | 'data_privacy' | 'other';
export type GrievanceStatus = 'open' | 'acknowledged' | 'under_review' | 'resolved' | 'escalated' | 'closed';
export type GrievancePriority = 'low' | 'medium' | 'high';

export interface Grievance extends TenantRecord {
  refNo: string;
  category: GrievanceCategory;
  subject: string;
  description: string;
  raisedByName?: string;
  raisedByRole?: string;
  contact?: string;
  against?: string;
  anonymous?: boolean;
  priority: GrievancePriority;
  status: GrievanceStatus;
  assignedToName?: string;
  resolution?: string;
  raisedAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  dueAt?: number;
}

/* ----------------------- Consent / DPDP ----------------------------------- */

export interface ConsentPurpose extends TenantRecord {
  name: string;
  description?: string;
  /** Whether this purpose is mandatory for enrolment. */
  required?: boolean;
  dataCategories?: string[];
  active?: boolean;
}

export type ConsentState = 'granted' | 'denied' | 'withdrawn' | 'pending';

export interface ConsentRecord extends TenantRecord {
  purposeId: string;
  purposeName?: string;
  studentId?: string;
  studentName?: string;
  guardianName?: string;
  state: ConsentState;
  channel?: 'app' | 'paper' | 'verbal';
  grantedAt?: number;
  withdrawnAt?: number;
  recordedByName?: string;
  notes?: string;
}

/* ------------------------------- SMC -------------------------------------- */

export type SmcRole = 'parent' | 'teacher' | 'headmaster' | 'community' | 'local_authority' | 'sponsor';

export interface SmcMember extends TenantRecord {
  name: string;
  role: SmcRole;
  phone?: string;
  designation?: string;
  isChairperson?: boolean;
  termFrom?: number;
  termTo?: number;
  active?: boolean;
}

export type SmcMeetingStatus = 'scheduled' | 'held' | 'cancelled';

export interface SmcMeeting extends TenantRecord {
  title: string;
  date: number;
  venue?: string;
  agenda?: string;
  minutes?: string;
  attendees?: string[];
  decisions?: string;
  status: SmcMeetingStatus;
}

export interface SmcBudgetItem extends TenantRecord {
  head: string;
  category?: string;
  financialYear: string;
  allocated: number;
  spent?: number;
  source?: string; // SMDP, state grant, donation…
  notes?: string;
}
