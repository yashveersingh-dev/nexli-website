import type { TenantRecord } from './models';

/* ============================ Student Information System ============================ */

export type Gender = 'male' | 'female' | 'other';
export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated' | 'left';
export type SocialCategory = 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'other';
export type AdmissionType = 'regular' | 'rte' | 'transfer' | 'mid_term';
export type GuardianRelation = 'father' | 'mother' | 'guardian' | 'grandparent' | 'sibling' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

/** A parent/guardian linked to a student. Primary guardian may have a parent login (uid). */
export interface Guardian {
  relation: GuardianRelation;
  name: string;
  phone?: string;
  email?: string;
  occupation?: string;
  qualification?: string;
  annualIncome?: number;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  /** Linked parent Auth account (phone-OTP), set when the parent is provisioned. */
  uid?: string;
}

/**
 * A student record (tenant-scoped: /schools/{id}/students/{id}). Holds identity,
 * enrollment, category and guardian data. Medical/counseling/POCSO data lives in
 * separate restricted collections — never here.
 */
export interface Student extends TenantRecord {
  admissionNo: string;
  rollNo?: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  gender: Gender;
  dob?: number;
  bloodGroup?: BloodGroup;
  photoUrl?: string;

  // Enrollment
  gradeId?: string;
  gradeName?: string;
  sectionId?: string;
  sectionName?: string;
  house?: string;
  academicYear?: string;
  status: StudentStatus;
  admissionDate?: number;
  admissionType?: AdmissionType;

  // Category / govt ids (store masked where sensitive)
  category?: SocialCategory;
  rteQuota?: boolean;
  religion?: string;
  motherTongue?: string;
  nationality?: string;
  aadhaarLast4?: string;
  apaarId?: string;
  penId?: string;

  // Contact
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  guardians?: Guardian[];

  // Logistics
  transportRouteId?: string;
  transportStop?: string;
  isHosteller?: boolean;
  blockId?: string;

  // History
  previousSchool?: string;
  tcNumber?: string;
  siblingStudentIds?: string[];
  specialNeeds?: boolean;
  tags?: string[];
}

/* ============================ Admissions & enrollment ============================ */

export type AdmissionStage =
  | 'enquiry'
  | 'application'
  | 'document_verification'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'admitted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn';

export interface AdmissionDocumentItem {
  label: string;
  received?: boolean;
}

/** An admission application moving through the enrollment pipeline. */
export interface Admission extends TenantRecord {
  applicantName: string;
  gender?: Gender;
  dob?: number;
  gradeAppliedId?: string;
  gradeAppliedName?: string;
  academicYear?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  source?: string;
  stage: AdmissionStage;
  appliedDate?: number;
  assessmentScore?: number;
  interviewNotes?: string;
  rteApplication?: boolean;
  category?: SocialCategory;
  documents?: AdmissionDocumentItem[];
  notes?: string;
  /** Set when the application is admitted and converted to a Student. */
  convertedStudentId?: string;
}

export const ADMISSION_STAGES: AdmissionStage[] = [
  'enquiry',
  'application',
  'document_verification',
  'assessment',
  'interview',
  'offer',
  'admitted',
];

/* ============================ Transfer Certificate ============================ */

export type TCStatus = 'requested' | 'clearance_pending' | 'approved' | 'issued' | 'rejected';

export interface TCClearanceItem {
  department: string;
  cleared?: boolean;
  note?: string;
}

/** A transfer / leaving certificate request + clearance workflow. */
export interface TransferCertificate extends TenantRecord {
  studentId: string;
  studentName: string;
  admissionNo?: string;
  gradeName?: string;
  reason?: string;
  status: TCStatus;
  requestedDate?: number;
  issuedDate?: number;
  tcNumber?: string;
  clearances?: TCClearanceItem[];
  remarks?: string;

  /* -------------------- CBSE Appendix-V particulars --------------------------
   * Standard fields for the CBSE Affiliation Bye-Laws "Appendix-V" Transfer
   * Certificate. All optional so the lightweight request flow is unaffected; the
   * detail page lets staff fill them before issue, and the printable layout reads
   * them. Several fall back to the linked Student record when blank.
   *
   * IMPORTANT (LEGAL REVIEW): the exact field labels, order and wording MUST be
   * verified against the LATEST CBSE Affiliation Bye-Laws before relying on this
   * for an official document — CBSE periodically revises Appendix-V. Treat the
   * labels below as a working draft, not a certified template.
   * ------------------------------------------------------------------------- */
  /** Father's / guardian's name. */
  fatherName?: string;
  /** Mother's name. */
  motherName?: string;
  nationality?: string;
  /** Social category as printed (e.g. General / SC / ST / OBC). */
  category?: string;
  /** Whether the candidate belongs to SC / ST / OBC (CBSE asks this explicitly). */
  isScStObc?: boolean;
  /** Date of birth in figures (epoch-ms); the words form is derived for print. */
  dob?: number;
  /** Date of birth in words, as entered/verified (overrides the derived words). */
  dobInWords?: string;
  /** Class in which the student was last studying (in figures + words). */
  classLastStudied?: string;
  /** Class to which the student was promoted/eligible (e.g. "IX"). */
  classPromotedTo?: string;
  /** Whether the student has paid all school dues. */
  duesPaid?: boolean;
  /** Whether any fee concession was availed; describe in `feeConcessionDetail`. */
  feeConcession?: boolean;
  feeConcessionDetail?: string;
  /** Total number of working days in the session. */
  workingDaysTotal?: number;
  /** Number of working days the student was present. */
  workingDaysPresent?: number;
  /** Whether the student is an NCC cadet / Boy Scout / Girl Guide etc. */
  nccScoutGuide?: boolean;
  /** Games played / extra-curricular activities in which the student took part. */
  gamesActivities?: string;
  /** General conduct (e.g. Good / Satisfactory). */
  generalConduct?: string;
  /** Date the application for the TC was made (epoch-ms). */
  applicationDate?: number;
  /** Date the TC was issued (epoch-ms) — mirrors `issuedDate`; kept for the form. */
  certificateIssueDate?: number;
  /** Date on which the student last attended / left the school (epoch-ms). */
  dateOfLeaving?: number;
  /** Any other remarks for the certificate body. */
  otherRemarks?: string;
}
