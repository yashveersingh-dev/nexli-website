import type { PermissionMatrix, RoleAction, RoleDefinition, RoleGroupId, RoleGroupMeta } from './types';

/* ============================================================================
 * NEXLI role catalogue — the bundled DEFAULT seed for the data-driven role
 * system. Every role below is written to Firestore (`roleDefinitions/{id}`) so a
 * Super Admin can edit it, add new roles/levels, or tweak permissions WITHOUT a
 * code change. Grouped, multi-level, and scoped to "only what the role needs".
 * ==========================================================================*/

export const ROLE_GROUPS: RoleGroupMeta[] = [
  { id: 'platform', label: 'Platform', order: 0 },
  { id: 'leadership', label: 'Leadership', order: 1 },
  { id: 'academic', label: 'Academic & Teaching', order: 2 },
  { id: 'administration', label: 'Administrative & Office', order: 3 },
  { id: 'finance', label: 'Finance & Accounts', order: 4 },
  { id: 'management', label: 'Management & HR', order: 5 },
  { id: 'hostel', label: 'Hostel & Residential', order: 6 },
  { id: 'library', label: 'Library', order: 7 },
  { id: 'healthcare', label: 'Healthcare', order: 8 },
  { id: 'welfare', label: 'Student Welfare & Protection', order: 9 },
  { id: 'security', label: 'Security & Facilities', order: 10 },
  { id: 'transport', label: 'Transport', order: 11 },
  { id: 'canteen', label: 'Canteen', order: 12 },
  { id: 'family', label: 'Family & Students', order: 13 },
];

/* ----------------------------- action shortcuts ---------------------------- */
const V: RoleAction[] = ['view'];
const VX: RoleAction[] = ['view', 'export'];
const VC: RoleAction[] = ['view', 'create'];
const VCE: RoleAction[] = ['view', 'create', 'edit'];
const VCEX: RoleAction[] = ['view', 'create', 'edit', 'export'];
const APPR: RoleAction[] = ['view', 'approve', 'export'];
const MANAGE: RoleAction[] = ['view', 'create', 'edit', 'approve', 'export', 'delete', 'manage'];

let SEQ = 0;
function r(
  id: string,
  label: string,
  group: RoleGroupId,
  permissions: PermissionMatrix,
  opts: { level?: string; raw?: string[]; wildcard?: boolean; description?: string } = {},
): RoleDefinition {
  return { id, label, group, order: SEQ++, permissions, builtIn: true, active: true, ...opts };
}

/** Read-only governance oversight (chairman/trustee/board) — see, export, never edit.
 *  Deliberately EXCLUDES direct HR + Payroll: governance gets only aggregate
 *  finance (fees/expense view) + the Reports module, never the staff directory or
 *  individual salary/payslip records (2026-06-17 decision; report items #4 / H4). */
const OVERSIGHT: PermissionMatrix = {
  students: VX, attendance: VX, academics: V, exams: VX, gradebook: V, hpc: V,
  fees: VX, expense: VX, reports: VX, compliance: VX,
  hostel: V, transport: V, communication: V, events: V, audit: V,
};

/** Academic leadership (VP-Academic, Academic Director, Headmaster). */
const ACADEMIC_LEAD: PermissionMatrix = {
  students: VCEX, certificates: VCE, admissions: VCE, attendance: MANAGE, academics: MANAGE, gradebook: MANAGE,
  homework: MANAGE, exams: MANAGE, hpc: MANAGE, library: V, sped: V, counseling: V,
  communication: MANAGE, events: MANAGE, reports: VX, compliance: V, hr: V, users: MANAGE,
  delegation: MANAGE,
};

/** Administrative leadership (VP-Admin, Administrator, School/Admin Manager). */
const ADMIN_LEAD: PermissionMatrix = {
  students: V, certificates: VCE, fees: APPR, expense: MANAGE, payroll: APPR, hr: MANAGE, transport: MANAGE,
  hostel: MANAGE, facility: MANAGE, canteen: V, visitors: MANAGE, compliance: MANAGE,
  consent: V, reports: VX, communication: MANAGE, events: V, users: MANAGE, settings: MANAGE,
  audit: V, delegation: MANAGE,
};

export const ROLE_CATALOG: RoleDefinition[] = [
  /* ----------------------------- platform ----------------------------- */
  r('super_admin', 'Super Admin', 'platform', {}, { wildcard: true, description: 'Platform owner — full access across all schools.' }),

  /* ----------------------------- leadership ----------------------------- */
  r('chairman', 'Chairman', 'leadership', OVERSIGHT, { description: 'Board chair — read-only oversight.' }),
  r('trustee', 'Trustee', 'leadership', OVERSIGHT, { description: 'Trust board member — read-only oversight.' }),
  r('director', 'Director / CEO', 'leadership', {}, { wildcard: true }),
  r('regional_director', 'Regional Director', 'leadership', {}, { wildcard: true }),
  r('cluster_director', 'Cluster Director', 'leadership', {}, { wildcard: true }),
  r('head_of_school', 'Head of School (HoS)', 'leadership', {}, { wildcard: true }),
  r('principal', 'Principal', 'leadership', {}, { wildcard: true }),
  r('headmaster', 'Headmaster', 'leadership', {}, { wildcard: true }),
  r('headmistress', 'Headmistress', 'leadership', {}, { wildcard: true }),
  r('academic_director', 'Academic Director', 'leadership', { ...ACADEMIC_LEAD, settings: V, reports: MANAGE }),
  r('vp_academic', 'Vice Principal (Academic)', 'leadership', ACADEMIC_LEAD),
  r('vp_admin', 'Vice Principal (Admin)', 'leadership', ADMIN_LEAD),

  /* --------------------------- academic & teaching --------------------------- */
  r('academic_coordinator', 'Academic Coordinator (Senior)', 'academic', {
    students: VCEX, certificates: VCE, admissions: VCE, attendance: MANAGE, academics: MANAGE, gradebook: V,
    homework: V, exams: MANAGE, hpc: VCE, reports: VX, hr: V, communication: VCE, events: VCE,
    compliance: V, users: MANAGE, delegation: MANAGE, alumni: VCE,
  }, { level: 'Senior' }),
  r('academic_coordinator_junior', 'Academic Coordinator (Junior)', 'academic', {
    students: VCE, certificates: VCE, admissions: VCE, attendance: VCEX, academics: VCE, gradebook: V,
    exams: VCE, hpc: VCE, reports: V, communication: VCE, events: VCE,
  }, { level: 'Junior' }),
  r('academic_coordinator_associate', 'Academic Coordinator (Associate / Assistant)', 'academic', {
    students: V, certificates: VCE, attendance: VCE, academics: V, exams: V, hpc: V, homework: V, communication: VC, events: V,
  }, { level: 'Associate / Assistant' }),
  r('hod', 'Head of Department', 'academic', {
    students: V, certificates: VCE, gradebook: MANAGE, homework: V, exams: VCE, hpc: VCE, academics: VCE, reports: V, users: V,
  }),
  r('exam_controller', 'Exam Controller', 'academic', {
    students: V, exams: MANAGE, gradebook: VX, hpc: VX, academics: V, reports: VX, communication: VCE,
  }),
  r('class_teacher', 'Class Teacher', 'academic', {}, {
    raw: [
      'students.read.section', 'students.write.section', 'students.write', 'attendance.read.section', 'attendance.write.section',
      'gradebook.read.section', 'reportcard.write.section', 'homework.read', 'homework.write',
      'communication.parent', 'announcements.class', 'hpc.read', 'exams.read',
    ],
    description: 'Owns one section: that section’s students, attendance, marks & parent comms. May add/import students.',
  }),
  r('subject_teacher', 'Subject Teacher', 'academic', {}, {
    raw: [
      'students.read.section', 'students.write', 'attendance.write.period', 'gradebook.read.subject', 'gradebook.write.subject',
      'homework.read', 'homework.write', 'lessonplans.read', 'lessonplans.write', 'exams.read',
    ],
    description: 'Teaches subject(s): their classes’ marks, homework & period attendance. May add/import students.',
  }),
  r('substitute_teacher', 'Substitute Teacher', 'academic', {}, {
    raw: ['attendance.write.period', 'lessonplans.read', 'homework.read'],
  }),
  r('special_educator', 'Special Educator', 'academic', { sped: MANAGE }, {
    raw: ['iep.read', 'iep.write', 'students.read.cwsn'],
    description: 'Special-education plans (IEP) for children with special needs.',
  }),
  r('lab_assistant', 'Lab Assistant', 'academic', { academics: V }, { raw: ['lab.read', 'lab.write'] }),
  // Co-scholastic (sports/arts/activities) markers on the Holistic Progress Card:
  // they record (create+edit) the co-scholastic side; academic subject marks stay
  // with the subject teachers (decision 2026-06-17). UI exposes only the HPC
  // co-scholastic section to them; scholastic marks remain subject-teacher gated.
  r('sports_teacher', 'Sports Teacher / PET', 'academic', { students: V, attendance: VCE, events: VCE, hpc: VCE }),
  r('arts_teacher', 'Arts / Music Teacher', 'academic', { students: V, attendance: VCE, events: VCE, hpc: VCE }),
  r('activity_coordinator', 'Activity Coordinator', 'academic', { events: MANAGE, students: V, communication: VCE }),
  r('club_coordinator', 'Club Coordinator', 'academic', { events: VCE, students: V, communication: VC }),

  /* --------------------------- administrative & office --------------------------- */
  r('administrator', 'Administrator', 'administration', ADMIN_LEAD),
  r('admin_officer', 'Administrative Officer', 'administration', {
    students: V, certificates: VCE, admissions: VCE, fees: V, hr: V, transport: V, hostel: V, facility: V, visitors: VCE,
    compliance: VCE, communication: VCE, reports: V, settings: V,
  }),
  r('dean_of_students', 'Dean of Students', 'administration', {
    students: VCEX, certificates: VCE, attendance: VX, events: MANAGE, communication: MANAGE, reports: V,
  }),
  r('registrar', 'Registrar', 'administration', {
    students: MANAGE, certificates: VCE, admissions: MANAGE, academics: VCE, exams: VX, compliance: VCE, reports: VX,
    communication: VCE,
  }),
  r('admissions_officer', 'Admissions Officer', 'administration', {
    admissions: MANAGE, certificates: VCE, students: VCE, fees: V, communication: VCE, reports: V,
  }),
  r('front_desk', 'Front Desk', 'administration', {
    visitors: VCE, certificates: VCE, admissions: VC, students: V, communication: VC, alumni: VCE,
  }),
  r('office_assistant', 'Office Assistant', 'administration', {
    students: V, certificates: VCE, visitors: VCE, communication: VC, events: V,
  }),

  /* ------------------------------- finance ------------------------------- */
  r('finance_manager', 'Finance Manager', 'finance', {
    fees: MANAGE, expense: MANAGE, payroll: MANAGE, reports: VX, students: V, hr: V, compliance: V,
  }),
  r('bursar', 'Bursar', 'finance', { fees: MANAGE, expense: MANAGE, payroll: APPR, reports: VX, students: V }),
  r('chief_accountant', 'Chief Accountant', 'finance', { fees: MANAGE, expense: MANAGE, payroll: VCEX, reports: VX, students: V }),
  r('accountant_senior', 'Senior Accountant', 'finance', { fees: VCEX, expense: VCEX, payroll: VX, students: V }, { level: 'Senior' }),
  r('school_accountant', 'School Accountant', 'finance', { fees: VCEX, expense: VCEX, students: V }),
  r('accountant_junior', 'Junior Accountant', 'finance', { fees: VCE, expense: VCE, students: V }, { level: 'Junior' }),
  r('accounts_clerk', 'Accounts Clerk', 'finance', { fees: VCE, expense: V }),
  r('accounts_assistant', 'Accounts Assistant', 'finance', { fees: VCE, expense: V }, { level: 'Assistant' }),
  r('billing_executive', 'Billing Executive', 'finance', { fees: VCEX, students: V }),
  r('cashier', 'Cashier', 'finance', { fees: VC, students: V }),
  r('hostel_accountant', 'Hostel Accountant', 'finance', { fees: VCE, expense: VCE, hostel: V }),

  /* ----------------------------- management & HR ----------------------------- */
  r('school_manager', 'School Manager', 'management', ADMIN_LEAD),
  r('admin_manager', 'Administrative Manager', 'management', ADMIN_LEAD),
  r('hr_director', 'HR Director', 'management', { hr: MANAGE, payroll: MANAGE, reports: VX, users: MANAGE, students: V }, { level: 'Director' }),
  r('hr_manager', 'HR Manager', 'management', { hr: MANAGE, payroll: VCEX, reports: V, users: MANAGE, students: V, delegation: MANAGE }),
  r('hr_executive', 'HR Executive', 'management', { hr: VCE, payroll: V, students: V }, { level: 'Executive' }),
  r('hr_assistant', 'HR Assistant', 'management', { hr: VCE }, { level: 'Assistant' }),
  r('payroll_specialist', 'Payroll Specialist', 'management', { payroll: MANAGE, hr: V }),
  r('recruitment_coordinator', 'Recruitment Coordinator', 'management', { hr: VCE }),
  r('it_manager', 'IT Manager', 'management', { settings: MANAGE, users: MANAGE, audit: V, reports: V, compliance: V }, { level: 'Manager' }),
  r('it_admin', 'IT Administrator', 'management', { settings: MANAGE, users: MANAGE, audit: V }, {
    raw: ['import.run', 'delegation.manage'],
  }),
  r('main_receptionist', 'Main Receptionist', 'management', { visitors: VCE, certificates: VCE, communication: VC, students: V, admissions: VC }),
  r('admissions_receptionist', 'Admissions Receptionist', 'management', { admissions: VCE, certificates: VCE, visitors: VCE, students: V }),
  r('pr_executive', 'Public Relations Executive', 'management', { communication: MANAGE, events: VCE, reports: V, alumni: VCE }),

  /* --------------------------- hostel & residential --------------------------- */
  r('chief_warden', 'Chief Warden', 'hostel', { hostel: MANAGE, students: V }),
  r('senior_warden', 'Senior Warden', 'hostel', { hostel: MANAGE, students: V }, { level: 'Senior' }),
  r('hostel_superintendent', 'Hostel Superintendent', 'hostel', { hostel: MANAGE, students: V, facility: V }),
  r('provost', 'Provost', 'hostel', { hostel: MANAGE, students: V }),
  r('residential_warden', 'Residential Warden', 'hostel', { hostel: VCEX, students: V }),
  r('day_warden', 'Day Boarding Warden', 'hostel', { hostel: VCEX, students: V }),
  r('assistant_warden', 'Assistant Warden', 'hostel', { hostel: VCE, students: V }, { level: 'Assistant' }),
  r('hostel_warden', 'Hostel Warden', 'hostel', { hostel: VCEX, students: V }),
  r('night_warden', 'Night Warden', 'hostel', { hostel: VCE }, { raw: ['hostel.rollcall.night', 'sos.trigger'] }),
  r('matron', 'Matron', 'hostel', { hostel: VCE, students: V }),
  r('house_master', 'Housemaster', 'hostel', { hostel: VCE, students: V, events: V }),
  r('housemistress', 'Housemistress', 'hostel', { hostel: VCE, students: V, events: V }),
  r('caretaker', 'Caretaker', 'hostel', { hostel: V, facility: VCE }),
  r('mess_manager', 'Mess Manager', 'hostel', { canteen: MANAGE, hostel: V }),
  r('hostel_committee', 'Hostel Committee Member', 'hostel', { hostel: VX, students: V }),

  /* ------------------------------- library ------------------------------- */
  r('librarian', 'Librarian (Head)', 'library', { library: MANAGE, students: V }),
  r('librarian_senior_secondary', 'Senior Secondary Librarian', 'library', { library: MANAGE, students: V }, { level: 'Sr. Secondary' }),
  r('librarian_high', 'High School Librarian', 'library', { library: MANAGE, students: V }, { level: 'High School' }),
  r('librarian_middle', 'Middle School Librarian', 'library', { library: VCEX, students: V }, { level: 'Middle School' }),
  r('librarian_primary', 'Primary School Librarian', 'library', { library: VCEX, students: V }, { level: 'Primary' }),
  r('teacher_librarian', 'Teacher Librarian', 'library', { library: MANAGE, gradebook: V, students: V }),
  r('digital_media_librarian', 'Digital Media Librarian', 'library', { library: MANAGE }),
  r('assistant_librarian', 'Assistant Librarian', 'library', { library: VCE }, { level: 'Assistant' }),
  r('library_attendant', 'Library Attendant', 'library', { library: VC }),

  /* ------------------------------ healthcare ------------------------------ */
  r('nurse', 'Regular School Nurse', 'healthcare', { health: MANAGE, students: V }),
  r('nurse_residential', 'Residential School Nurse', 'healthcare', { health: MANAGE, students: V, hostel: V }),
  r('nurse_sped', 'Special Education School Nurse', 'healthcare', { health: MANAGE, students: V, sped: V }),
  r('nurse_pediatric', 'Pediatric School Nurse', 'healthcare', { health: MANAGE, students: V }),
  r('nurse_practitioner', 'Nurse Practitioner', 'healthcare', { health: MANAGE, students: V }),
  r('nurse_community', 'Community Health Nurse', 'healthcare', { health: VCEX, students: V }),
  r('nurse_visiting', 'Visiting School Nurse', 'healthcare', { health: VCE, students: V }),
  r('doctor', 'School Doctor', 'healthcare', { health: MANAGE, students: V }),

  /* -------------------- student welfare & protection -------------------- */
  r('cpo', 'Designated Child Protection Officer (DCPO)', 'welfare', { childprotection: MANAGE, counseling: V, students: V, compliance: V }),
  r('alternate_cpo', 'Alternate Child Protection Officer', 'welfare', { childprotection: VCE, students: V }),
  r('counselor', 'School Counselor', 'welfare', { counseling: MANAGE, students: V, attendance: V }),
  r('guidance_counselor', 'Guidance Counselor', 'welfare', { counseling: VCE, students: V }),
  r('wellness_teacher', 'Wellness Teacher', 'welfare', { students: V, events: VCE }),
  // POSH / POCSO Committee + ICC handle the grievance/complaints + compliance side
  // ONLY. They do NOT get individual child-protection (POCSO) case records — those
  // stay limited to the CPO, Alternate CPO and Principal (decision 2026-06-17).
  // Grievances access is granted via explicit `grievances.*` keys (not `pocso.*`).
  r('posh_committee', 'POSH / POCSO Committee Member', 'welfare', { compliance: V }, {
    raw: ['grievances.read', 'grievances.write'],
  }),
  r('icc_member', 'Internal Complaints Committee (ICC) Member', 'welfare', { compliance: V }, {
    raw: ['grievances.read', 'grievances.write'],
  }),
  r('board_representative', 'School Board Representative', 'welfare', OVERSIGHT),
  r('dpo', 'Data Protection Officer', 'welfare', { consent: MANAGE, audit: V, compliance: V }, {
    // DPO handles the grievance/redressal side (rules already grant `grievances`);
    // grant the matching client keys so the Safeguarding → Grievances tab is reachable.
    raw: ['grievances.read', 'grievances.write'],
  }),
  r('consent_officer', 'Consent Officer', 'welfare', { consent: VCE }),

  /* -------------------------- security & facilities -------------------------- */
  r('security_supervisor', 'Security Supervisor', 'security', { security: MANAGE, visitors: MANAGE }),
  r('security_officer', 'Security Officer', 'security', { security: VCE, visitors: VCE }),
  r('security_guard', 'Security Guard', 'security', { visitors: VCE }),
  r('cctv_admin', 'CCTV Administrator', 'security', { security: VX }, { raw: ['cctv.read'] }),
  r('visitor_officer', 'Visitor Management Officer', 'security', { visitors: MANAGE }),
  r('estate_manager', 'Estate / Facility Manager', 'security', { facility: MANAGE, expense: V }),
  r('facilities_manager', 'Facilities Manager', 'security', { facility: MANAGE, expense: V }),
  r('housekeeping', 'Housekeeping Staff', 'security', { facility: V }, { raw: ['tasks.log'] }),

  /* ------------------------------- transport ------------------------------- */
  r('transport_manager', 'Transport Manager', 'transport', { transport: MANAGE, students: V }, { raw: ['gps.read'] }),
  r('bus_conductor', 'Bus Conductor', 'transport', { transport: VCE }, { raw: ['transport.attendance', 'sos.trigger'] }),
  r('bus_driver', 'Bus Driver', 'transport', { transport: V }, { raw: ['transport.route.read'] }),

  /* -------------------------------- canteen -------------------------------- */
  r('canteen_manager', 'Canteen Manager', 'canteen', { canteen: MANAGE }),
  r('canteen_staff', 'Canteen Staff', 'canteen', { canteen: V }),

  /* ---------------------------- family & students ---------------------------- */
  r('parent', 'Parent / Guardian', 'family', {}, {
    raw: ['child.read', 'fees.pay', 'consent.respond', 'ptm.book', 'servicerequest.create', 'communication.teacher'],
  }),
  r('student', 'Student', 'family', {}, { raw: ['self.read', 'homework.submit', 'library.request'] }),
  r('prefect', 'Prefect / Head Student', 'family', {}, { raw: ['self.read', 'homework.submit', 'library.request'], level: 'Student leader' }),
  r('house_captain', 'House / Sports Captain', 'family', {}, { raw: ['self.read', 'homework.submit', 'library.request'], level: 'Student leader' }),
  r('alumni', 'Alumni', 'family', {}, { raw: ['alumni.read', 'alumni.profile'] }),
];

/** Quick lookup by id. */
export const ROLE_BY_ID: Record<string, RoleDefinition> = Object.fromEntries(
  ROLE_CATALOG.map((d) => [d.id, d]),
);

export const GROUP_LABEL: Record<RoleGroupId, string> = Object.fromEntries(
  ROLE_GROUPS.map((g) => [g.id, g.label]),
) as Record<RoleGroupId, string>;
