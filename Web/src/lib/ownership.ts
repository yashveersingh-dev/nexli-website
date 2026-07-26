import type { RoleId } from '@/types/roles';

/**
 * Operational ownership model — "who really does this in a school".
 *
 * RBAC (`rbac.ts`) answers *can this role touch the data* (rules boundary).
 * This answers *should this role OWN the day-to-day workflow* (operational
 * realism). Leadership holds `*` in RBAC, so without this they'd see every
 * operate action everywhere. Owners operate; reviewers oversee; approvers sign off.
 *
 * Owner/reviewer/approver lists are kept in sync with the data-driven role
 * catalogue (src/lib/roles/catalog.ts): when a school adds a role via the Roles
 * admin UI it inherits access through its permissions; to make a NEW role a daily
 * *operator* of a modelled module, add its id to that module's `owners` here (or
 * leave a module unmodelled — then anyone with the permission may operate it).
 */
export interface ModuleOwnership {
  owners: RoleId[];
  secondary?: RoleId[];
  reviewers: RoleId[];
  approvers?: RoleId[];
  ownerLabel: string;
}

/** Leadership = reviewers/approvers everywhere; never the daily operator. */
export const LEADERSHIP_ROLES: RoleId[] = [
  'principal', 'vp_admin', 'vp_academic', 'director', 'regional_director', 'cluster_director',
  'head_of_school', 'headmaster', 'headmistress', 'academic_director',
  'chairman', 'trustee', 'board_representative',
];

export const SCHEDULE_CONFIG_NOTE = 'schedule.configure';

export const MODULE_OWNERSHIP: Record<string, ModuleOwnership> = {
  // --- Academics & daily drivers ---
  attendance: { owners: ['class_teacher'], secondary: ['substitute_teacher', 'subject_teacher'], reviewers: ['principal', 'vp_academic', 'vp_admin', 'academic_coordinator', 'academic_coordinator_junior', 'academic_director', 'dean_of_students', 'director'], ownerLabel: 'Class Teachers' },
  staff_attendance: { owners: ['hr_manager', 'hr_director', 'hr_executive', 'hr_assistant'], secondary: ['front_desk', 'main_receptionist', 'security_guard', 'security_supervisor'], reviewers: ['principal', 'vp_admin', 'school_manager'], ownerLabel: 'HR / Reception' },
  homework: { owners: ['class_teacher', 'subject_teacher'], secondary: ['hod'], reviewers: ['principal', 'vp_academic', 'academic_coordinator', 'hod', 'academic_director', 'director'], ownerLabel: 'Subject Teachers' },
  gradebook: { owners: ['subject_teacher', 'class_teacher'], secondary: ['hod'], reviewers: ['principal', 'vp_academic', 'academic_coordinator', 'hod', 'exam_controller', 'academic_director'], ownerLabel: 'Teachers' },
  examinations: { owners: ['vp_academic', 'academic_coordinator', 'hod', 'exam_controller'], reviewers: ['principal', 'director', 'headmaster'], approvers: ['principal', 'vp_academic', 'exam_controller'], ownerLabel: 'Exam Controller' },
  hpc: { owners: ['class_teacher', 'subject_teacher', 'academic_coordinator', 'hod'], reviewers: ['principal', 'vp_academic', 'academic_director'], approvers: ['principal', 'vp_academic'], ownerLabel: 'Teachers / Coordinator' },
  qpaper: { owners: ['subject_teacher', 'class_teacher', 'hod', 'exam_controller', 'academic_coordinator', 'academic_coordinator_junior'], secondary: ['vp_academic', 'academic_director'], reviewers: ['principal'], ownerLabel: 'Teachers / Exam Controller' },
  academics: { owners: ['academic_coordinator', 'academic_coordinator_junior', 'vp_academic', 'academic_director'], secondary: ['hod'], reviewers: ['principal', 'director', 'headmaster'], ownerLabel: 'Academic Coordinator' },
  library: { owners: ['librarian', 'librarian_senior_secondary', 'librarian_high', 'librarian_middle', 'librarian_primary', 'teacher_librarian', 'digital_media_librarian', 'assistant_librarian', 'library_attendant'], secondary: ['lab_assistant'], reviewers: ['principal', 'vp_admin', 'director'], ownerLabel: 'Librarian' },

  // --- SIS / admissions ---
  students: { owners: ['academic_coordinator', 'academic_coordinator_junior', 'front_desk', 'vp_academic', 'registrar', 'admissions_officer', 'dean_of_students'], reviewers: ['principal', 'director', 'headmaster'], ownerLabel: 'Admissions / Coordination' },
  admissions: { owners: ['front_desk', 'academic_coordinator', 'admissions_officer', 'admissions_receptionist', 'registrar', 'main_receptionist'], reviewers: ['principal', 'vp_academic'], approvers: ['principal'], ownerLabel: 'Admissions Desk' },

  // --- Finance ---
  fees: { owners: ['chief_accountant', 'accounts_clerk', 'accounts_assistant', 'finance_manager', 'bursar', 'accountant_senior', 'accountant_junior', 'school_accountant', 'billing_executive', 'cashier', 'hostel_accountant'], reviewers: ['principal', 'vp_admin', 'school_manager'], ownerLabel: 'Accounts' },
  expense: { owners: ['chief_accountant', 'accounts_clerk', 'finance_manager', 'bursar', 'accountant_senior', 'school_accountant', 'hostel_accountant'], secondary: ['vp_admin', 'estate_manager', 'facilities_manager'], reviewers: ['principal'], approvers: ['vp_admin', 'principal', 'finance_manager'], ownerLabel: 'Accounts' },
  payroll: { owners: ['hr_manager', 'hr_director', 'chief_accountant', 'finance_manager', 'payroll_specialist'], reviewers: ['principal', 'vp_admin'], approvers: ['principal', 'vp_admin'], ownerLabel: 'HR / Accounts' },

  // --- HR ---
  hr: { owners: ['hr_manager', 'hr_assistant', 'hr_director', 'hr_executive', 'recruitment_coordinator', 'school_manager', 'admin_manager', 'administrator'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Human Resources' },

  // --- Operations & safety ---
  transport: { owners: ['transport_manager'], secondary: ['bus_conductor', 'bus_driver'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Transport Manager' },
  hostel: { owners: ['chief_warden', 'hostel_warden', 'senior_warden', 'residential_warden', 'day_warden', 'assistant_warden', 'hostel_superintendent', 'provost', 'house_master', 'housemistress'], secondary: ['night_warden', 'matron', 'caretaker'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Wardens' },
  medical: { owners: ['nurse', 'doctor', 'nurse_residential', 'nurse_sped', 'nurse_pediatric', 'nurse_practitioner', 'nurse_community', 'nurse_visiting'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'School Nurse / Medical Staff' },
  visitor: { owners: ['security_guard', 'security_supervisor', 'security_officer', 'front_desk', 'visitor_officer', 'main_receptionist', 'admissions_receptionist'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Security / Reception' },
  canteen: { owners: ['canteen_manager', 'canteen_staff', 'mess_manager'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Canteen Manager' },
  facility: { owners: ['estate_manager', 'facilities_manager'], secondary: ['housekeeping', 'caretaker', 'chief_accountant'], reviewers: ['principal', 'vp_admin'], approvers: ['vp_admin', 'principal'], ownerLabel: 'Facilities / Estate' },
  safeguarding: { owners: ['cpo', 'alternate_cpo'], reviewers: ['principal', 'vp_admin', 'dean_of_students'], ownerLabel: 'Child Protection Officer' },

  // --- Engagement ---
  events: { owners: ['academic_coordinator', 'sports_teacher', 'arts_teacher', 'hod', 'activity_coordinator', 'club_coordinator', 'pr_executive', 'dean_of_students', 'wellness_teacher'], reviewers: ['principal', 'vp_admin'], approvers: ['principal', 'vp_admin'], ownerLabel: 'Activity Coordinators' },
  alumni: { owners: ['front_desk', 'academic_coordinator', 'pr_executive'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Alumni Office' },

  // --- Compliance & governance ---
  compliance: { owners: ['vp_admin', 'it_admin', 'registrar', 'admin_officer'], reviewers: ['principal', 'director'], ownerLabel: 'Compliance Officer' },
  udise: { owners: ['academic_coordinator', 'it_admin', 'vp_admin', 'registrar'], reviewers: ['principal'], ownerLabel: 'MIS / Coordination' },
  rte: { owners: ['front_desk', 'academic_coordinator', 'chief_accountant', 'admissions_officer', 'registrar'], reviewers: ['principal', 'vp_admin'], approvers: ['principal'], ownerLabel: 'Admissions / Accounts' },
  consent: { owners: ['dpo', 'consent_officer'], reviewers: ['principal', 'vp_admin'], ownerLabel: 'Data Protection Officer' },
  sped: { owners: ['special_educator', 'nurse_sped'], reviewers: ['principal', 'vp_academic'], ownerLabel: 'Special Educator' },
  smc: { owners: ['principal', 'vp_admin'], reviewers: ['director'], ownerLabel: 'Principal / SMC Secretary' },
};

function inSet(role: RoleId | undefined, roles: RoleId[] | undefined): boolean {
  return !!role && !!roles && roles.includes(role);
}

/** Is this role a daily OPERATOR of the module (owner or deputy)? */
export function isOperator(role: RoleId | undefined, moduleKey: string): boolean {
  const m = MODULE_OWNERSHIP[moduleKey];
  if (!m) return true; // unmodelled module → don't restrict
  return inSet(role, m.owners) || inSet(role, m.secondary);
}

/** Is this role an oversight REVIEWER (leadership or explicit reviewer)? */
export function isReviewer(role: RoleId | undefined, moduleKey: string): boolean {
  const m = MODULE_OWNERSHIP[moduleKey];
  return inSet(role, LEADERSHIP_ROLES) || inSet(role, m?.reviewers);
}

/** Is this role an APPROVER for the module's workflow items? */
export function isApprover(role: RoleId | undefined, moduleKey: string): boolean {
  const m = MODULE_OWNERSHIP[moduleKey];
  if (!m?.approvers) return false;
  return inSet(role, m.approvers);
}

export function moduleOwnerLabel(moduleKey: string): string {
  return MODULE_OWNERSHIP[moduleKey]?.ownerLabel ?? 'the assigned staff';
}

/** Display names for modules that can be temporarily delegated (operate access). */
export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  attendance: 'Student Attendance',
  staff_attendance: 'Staff Attendance',
  homework: 'Homework',
  gradebook: 'Class Assessments',
  examinations: 'Examinations',
  hpc: 'Holistic Progress Card',
  qpaper: 'Question Papers',
  academics: 'Academics',
  library: 'Library',
  students: 'Students',
  admissions: 'Admissions',
  fees: 'Fees & Finance',
  expense: 'Expense & Procurement',
  payroll: 'Payroll',
  hr: 'Human Resources',
  transport: 'Transport',
  hostel: 'Hostel',
  medical: 'Medical',
  safeguarding: 'Child Protection',
  visitor: 'Visitor & Gate',
  canteen: 'Canteen',
  facility: 'Assets & Facility',
  events: 'Events & Activities',
  alumni: 'Alumni',
  compliance: 'Compliance',
  udise: 'UDISE+ Reporting',
  rte: 'RTE Quota',
  consent: 'Privacy & Consent',
  sped: 'Special Education',
  smc: 'SMC Portal',
};

export function moduleDisplayName(moduleKey: string): string {
  return MODULE_DISPLAY_NAMES[moduleKey] ?? moduleKey;
}

/**
 * The modules a substitute can be temporarily delegated, sorted by display name.
 * (Who may *grant* a delegation is gated by the `delegation.manage` permission.)
 */
export const DELEGATABLE_MODULES: { key: string; label: string; ownerLabel: string }[] = Object.keys(
  MODULE_OWNERSHIP,
)
  .map((key) => ({ key, label: moduleDisplayName(key), ownerLabel: MODULE_OWNERSHIP[key].ownerLabel }))
  .sort((a, b) => a.label.localeCompare(b.label));
