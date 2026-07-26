/**
 * NEXLI — Firestore security-rules tests (Phase A · Danger 1).
 *
 * Verifies the tightened rules against every role group: each role can do its job
 * AND cannot read/write data it shouldn't, plus the "must NOT break" cases the user
 * called out (Super Admin onboarding, a class teacher saving attendance, a parent
 * seeing their own child's fees).
 *
 * Run via:  firebase emulators:exec --only firestore "node test/rules.test.mjs"
 * (JAVA_HOME must point at a JRE 11+. The emulator loads firestore.rules itself;
 *  we also load the same file here so the test env enforces the real rules.)
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs,
} from 'firebase/firestore';

const S1 = 's1';            // main test school
const S2 = 's2';            // a different tenant (isolation tests)

let pass = 0, fail = 0;
const failures = [];

async function ok(label, promise) {
  try { await assertSucceeds(promise); pass++; }
  catch (e) { fail++; failures.push(`ALLOW expected but DENIED: ${label} — ${e.message ?? e}`); }
}
async function no(label, promise) {
  try { await assertFails(promise); pass++; }
  catch (e) { fail++; failures.push(`DENY expected but ALLOWED: ${label} — ${e.message ?? e}`); }
}

// ---- doc helpers (operate on a given context's firestore) ----
const sdoc = (db, ...p) => doc(db, 'schools', S1, ...p);
const readDoc = (db, ...p) => getDoc(sdoc(db, ...p));
const writeDoc = (db, path, data) => setDoc(sdoc(db, ...path), data);
// scoped list query: schools/S1/<col> where field == val
const listWhere = (db, col, field, val) =>
  getDocs(query(collection(db, 'schools', S1, col), where(field, '==', val)));
const listAll = (db, col) => getDocs(collection(db, 'schools', S1, col));

const testEnv = await initializeTestEnvironment({
  projectId: 'nexli-rules-test',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

// ----------------------------- seed -----------------------------
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const member = (sid, uid, roleId, extra = {}) =>
    setDoc(doc(db, 'schools', sid, 'members', uid), { uid, schoolId: sid, roleId, status: 'active', ...extra });
  const index = (uid, fields) => setDoc(doc(db, 'userIndex', uid), { uid, ...fields });

  // platform super admin
  await index('superadmin', { roleId: 'super_admin', isSuperAdmin: true });

  // s1 members (+ userIndex)
  const roles = [
    'principal', 'class_teacher', 'subject_teacher', 'accounts_clerk', 'chief_accountant',
    'hr_manager', 'bus_driver', 'nurse', 'special_educator', 'dpo', 'counselor', 'cpo',
    'posh_committee', 'icc_member', 'sports_teacher',
    // Phase-A follow-up roles for the certificate/exam/career access checks:
    'hod', 'vp_admin', 'registrar', 'guidance_counselor',
  ];
  for (const r of roles) {
    await member(S1, r, r);
    await index(r, { roleId: r, schoolId: S1, status: 'active' });
  }
  // a SECOND counsellor (per-counsellor confidentiality scoping tests)
  await member(S1, 'counselor2', 'counselor');
  await index('counselor2', { roleId: 'counselor', schoolId: S1, status: 'active' });

  // family
  await member(S1, 'parentP1', 'parent', { childStudentIds: ['stu1'] });
  await index('parentP1', { roleId: 'parent', schoolId: S1, status: 'active' });
  await member(S1, 'parentP2', 'parent', { childStudentIds: ['stu2'] });
  await index('parentP2', { roleId: 'parent', schoolId: S1, status: 'active' });
  await member(S1, 'studentS1', 'student', { studentId: 'stu1' });
  await index('studentS1', { roleId: 'student', schoolId: S1, status: 'active' });

  // a member of another tenant
  await member(S2, 'outsider', 'principal');
  await index('outsider', { roleId: 'principal', schoolId: S2, status: 'active' });

  // sample data in s1
  const set = (col, id, data) => setDoc(doc(db, 'schools', S1, col, id), { schoolId: S1, ...data });
  await set('students', 'stu1', { fullName: 'Aarav' });
  await set('students', 'stu2', { fullName: 'Bina' });
  await set('fee_invoices', 'inv1', { studentId: 'stu1', netAmount: 1000 });
  await set('fee_invoices', 'inv2', { studentId: 'stu2', netAmount: 1000 });
  await set('fee_payments', 'pay1', { studentId: 'stu1', amount: 500 });
  await set('fee_refunds', 'rf1', { studentId: 'stu1', amount: 200, refundNo: 'RF-2026-0001' });
  await set('finance_counters', 'receipt', { value: 1 });
  await set('payroll_runs', 'r1', { label: 'Jun' });
  await set('payslips', 'ps1', { staffId: 'stf1', net: 50000 });
  await set('salary_structures', 'stf1', { staffName: 'T', gross: 60000 });
  await set('staff', 'stf1', { name: 'Teacher One', pan: 'XXXXX1234X' });
  await set('consent_records', 'cr1', { studentId: 'stu1' });
  await set('iep_plans', 'iep1', { studentId: 'stu1' });
  await set('therapy_logs', 'tl1', { studentId: 'stu1' });
  await set('attendance_days', 'ad1', { sectionId: 'sec1', entries: { stu1: 'present' } });
  await set('assessment_results', 'as1', { entries: { stu1: 90 } });
  await set('exam_results', 'ex1', { examId: 'e1', studentId: 'stu1' });
  await set('hpc_cards', 'hc1', { studentId: 'stu1' });
  await set('pocso', 'pc1', { caseNo: 'PC-1' });
  await set('grievances', 'gr1', { refNo: 'GR-1' });
  await set('medical', 'md1', { studentId: 'stu1' });
  await set('counseling', 'co1', { studentId: 'stu1' });
  await set('circulars', 'c1', { audience: 'whole_school', title: 'Notice' });   // default collection
  await set('finance_settings', 'main', { bankName: 'Demo Bank' });              // default collection
  await set('certificates', 'crt1', { studentId: 'stu1', serialNo: 'BON-2026-0001', type: 'bonafide' });
  await set('certificate_counters', 'bonafide', { value: 1 });
  await set('questionPapers', 'qp1', { title: 'Term 1 Maths', subjectId: 'sub-math' });
  await set('questionBank', 'qb1', { stem: 'What is 2+2?', subjectId: 'sub-math', marks: 1 });
  await set('reportCards', 'rc_pub', { studentId: 'stu1', published: true, term: 'term1' });
  await set('reportCards', 'rc_draft', { studentId: 'stu1', published: false, term: 'term2' });
  await set('portfolio', 'pf1', { studentId: 'stu1', title: 'Science fair', status: 'submitted' });
  await set('careerAssessments', 'ca1', { studentId: 'stu1', status: 'completed' });
  await set('consent_purposes', 'cp1', { name: 'Photography consent', required: false });

  // --- Pre-launch security pass fixtures ---
  // extra members used only by the new tests
  await member(S1, 'security_guard', 'security_guard');
  await index('security_guard', { roleId: 'security_guard', schoolId: S1, status: 'active' });
  await member(S1, 'it_admin', 'it_admin');
  await index('it_admin', { roleId: 'it_admin', schoolId: S1, status: 'active' });
  await member(S1, 'front_desk', 'front_desk');
  await index('front_desk', { roleId: 'front_desk', schoolId: S1, status: 'active' });

  // direct messaging: a thread between the principal and the class_teacher; the
  // counselor is NOT a participant (used for the POCSO-escalation leak test).
  await set('conversations', 'principal__class_teacher', {
    participantUids: ['class_teacher', 'principal'],
    kind: 'escalation', lastMessage: 'safeguarding case', lastAt: 1,
  });
  await set('messages', 'm1', {
    conversationId: 'principal__class_teacher', senderUid: 'principal', text: 'POCSO escalation note',
  });

  // finance / procurement / governance / rte / visitor fixtures
  await set('vendors', 'v1', { name: 'Acme Books', bankAccount: 'XXXX' });
  await set('purchase_orders', 'po1', { vendorId: 'v1', total: 5000 });
  await set('fee_structures', 'fs1', { grade: 'I', amount: 1000 });
  // (finance_settings/main is already seeded above; parents may read it.)
  await set('expense_settings', 'main', { approverUid: 'principal' });
  await set('smc_members', 'sm1', { name: 'Parent Rep' });
  await set('compliance_items', 'ci1', { title: 'Fire NOC' });
  await set('udise_profile', 'main', { udiseCode: '0000' });
  await set('rte_applications', 'rte1', { applicantName: 'Child A' });
  await set('visitors', 'vis1', { name: 'Courier', phone: '9000000000' });
  await set('visitor_blacklist', 'bl1', { name: 'Banned Person' });
  await set('delegations', 'dl1', { delegateUid: 'class_teacher', moduleKey: 'library', active: true });
  // Legal-pass collections
  await set('pocso_counters', 'main', { value: 1 });
  await set('erasure_requests', 'er1', { studentId: 'stu1', status: 'pending' });
  await set('breach_notifications', 'bn1', { summary: 'Test breach' });

  // --- This-session fixtures (board results / leave / PTM / counseling stamp / paid invoice / substitutions) ---
  // board result for stu1 (parentP1's child); exam staff manage, family reads own.
  await set('board_results', 'br1', { studentId: 'stu1', board: 'CBSE', percentage: 88 });
  // a student leave request for stu1 filed by parentP1.
  await set('student_leave_requests', 'slr1', {
    studentId: 'stu1', requestedByUid: 'parentP1', status: 'pending', reason: 'Fever',
  });
  // PTM meeting + its booking bookkeeping subdocs + a booking owned by parentP1.
  await set('ptm_meetings', 'ptm1', {
    title: 'Term 1 PTM', date: 1, slots: [{ id: 'slotA', time: '10:00', capacity: 2 }], createdByUid: 'class_teacher',
  });
  await setDoc(doc(db, 'schools', S1, 'ptm_meetings', 'ptm1', 'slot_counters', 'slotA'), { count: 1, slotId: 'slotA', schoolId: S1 });
  await setDoc(doc(db, 'schools', S1, 'ptm_meetings', 'ptm1', 'booked_students', 'stu1'), { status: 'booked', slotId: 'slotA', schoolId: S1 });
  await set('ptm_bookings', 'pb1', {
    meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP1', status: 'booked',
  });
  // a counseling note STAMPED with counselorUid:'counselor' (legacy co1 above has none).
  await set('counseling', 'co_stamped', { studentId: 'stu1', counselorUid: 'counselor', summary: 'private' });
  // a PAID invoice (paidAmount > 0) — used by the cancel/overpay invariant tests.
  await set('fee_invoices', 'inv_paid', { studentId: 'stu1', netAmount: 1000, paidAmount: 1000, status: 'paid' });
  // a timetable substitution (member read; academic-staff write).
  await set('substitutions', 'sub1', { date: 1, periodNo: 2, sectionId: 'sec1', substituteTeacherUid: 'subject_teacher' });
});

// contexts
const as = (uid) => testEnv.authenticatedContext(uid).firestore();
const unauth = testEnv.unauthenticatedContext().firestore();

// ============================ TESTS ============================

// --- Tenant isolation: outsider (school s2) can't touch s1 ---
{
  const db = as('outsider');
  await no('tenant: outsider read s1 student', readDoc(db, 'students', 'stu1'));
  await no('tenant: outsider read s1 invoice', readDoc(db, 'fee_invoices', 'inv1'));
  await no('tenant: outsider read s1 circular', readDoc(db, 'circulars', 'c1'));
  await no('tenant: outsider write s1 student', writeDoc(db, ['students', 'stu1'], { fullName: 'hacked' }));
}

// --- Unauthenticated: nothing ---
await no('anon read student', readDoc(unauth, 'students', 'stu1'));
await no('anon read circular', readDoc(unauth, 'circulars', 'c1'));

// --- Super Admin: onboarding must still work ---
{
  const db = as('superadmin');
  await ok('superadmin create school', setDoc(doc(db, 'schools', 'newSchool'), { name: 'New School' }));
  await ok('superadmin create member (provision)', setDoc(doc(db, 'schools', S1, 'members', 'newuser'), { uid: 'newuser', schoolId: S1, roleId: 'class_teacher', status: 'active' }));
  await ok('superadmin create userIndex', setDoc(doc(db, 'userIndex', 'newuser'), { uid: 'newuser', schoolId: S1, roleId: 'class_teacher' }));
  await ok('superadmin read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await ok('superadmin read pocso', readDoc(db, 'pocso', 'pc1'));
}

// --- Principal (school admin): onboarding + broad access ---
{
  const db = as('principal');
  await ok('principal provision member', setDoc(doc(db, 'schools', S1, 'members', 'prov1'), { uid: 'prov1', schoolId: S1, roleId: 'subject_teacher', status: 'active' }));
  await ok('principal create userIndex for member', setDoc(doc(db, 'userIndex', 'prov1'), { uid: 'prov1', schoolId: S1, roleId: 'subject_teacher' }));
  await ok('principal read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await ok('principal read salary', readDoc(db, 'salary_structures', 'stf1'));
  await ok('principal read pocso', readDoc(db, 'pocso', 'pc1'));
  await ok('principal read student', readDoc(db, 'students', 'stu1'));
  await ok('principal read all fees', listAll(db, 'fee_invoices'));
}

// --- Class teacher: can save attendance/marks, read students; NOT payroll/pocso ---
{
  const db = as('class_teacher');
  await ok('class_teacher SAVE attendance (must not break)', writeDoc(db, ['attendance_days', 'ad1'], { sectionId: 'sec1', entries: { stu1: 'present', stu2: 'absent' } }));
  await ok('class_teacher save assessment marks', writeDoc(db, ['assessment_results', 'as1'], { entries: { stu1: 88 } }));
  await ok('class_teacher save exam result', writeDoc(db, ['exam_results', 'ex1'], { examId: 'e1', studentId: 'stu1', marks: 70 }));
  await ok('class_teacher read students', readDoc(db, 'students', 'stu1'));
  await no('class_teacher read certificates (NOT an authorized issuer)', readDoc(db, 'certificates', 'crt1'));
  await no('class_teacher write certificate (NOT an authorized issuer)', writeDoc(db, ['certificates', 'crt9'], { studentId: 'stu1', serialNo: 'BON-2026-0009', type: 'bonafide' }));
  await ok('class_teacher read question paper (academic)', readDoc(db, 'questionPapers', 'qp1'));
  await ok('class_teacher write question (academic)', writeDoc(db, ['questionBank', 'qb9'], { stem: 'x?', subjectId: 'sub-math', marks: 1 }));
  await ok('class_teacher read report card (academic)', readDoc(db, 'reportCards', 'rc_pub'));
  await ok('class_teacher read portfolio (staff)', readDoc(db, 'portfolio', 'pf1'));
  await ok('class_teacher verify portfolio (staff)', writeDoc(db, ['portfolio', 'pf1'], { studentId: 'stu1', title: 'Science fair', status: 'verified' }));
  await no('class_teacher read career attempt (NOT counselling staff)', readDoc(db, 'careerAssessments', 'ca1'));
  await ok('class_teacher read attendance', readDoc(db, 'attendance_days', 'ad1'));
  await no('class_teacher read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await no('class_teacher read salary', readDoc(db, 'salary_structures', 'stf1'));
  await no('class_teacher read all fee invoices', listAll(db, 'fee_invoices'));
  await no('class_teacher read pocso', readDoc(db, 'pocso', 'pc1'));
  await no('class_teacher read consent', readDoc(db, 'consent_records', 'cr1'));
}

// --- Subject teacher: marks write ok ---
{
  const db = as('subject_teacher');
  await ok('subject_teacher save marks', writeDoc(db, ['assessment_results', 'as1'], { entries: { stu1: 77 } }));
}

// --- Sports teacher: HPC co-scholastic write (decision 3) + academic write ---
{
  const db = as('sports_teacher');
  await ok('sports_teacher write HPC card', writeDoc(db, ['hpc_cards', 'hc1'], { studentId: 'stu1', coScholastic: { sports: 'A' } }));
  await no('sports_teacher read payroll', readDoc(db, 'payroll_runs', 'r1'));
}

// --- Bus driver (staff, non-academic): cannot write academic/marks, cannot read finance ---
{
  const db = as('bus_driver');
  await no('bus_driver write attendance', writeDoc(db, ['attendance_days', 'ad1'], { entries: { stu1: 'absent' } }));
  await no('bus_driver write marks', writeDoc(db, ['assessment_results', 'as1'], { entries: { stu1: 0 } }));
  await no('bus_driver read all fee invoices', listAll(db, 'fee_invoices'));
  await no('bus_driver read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await no('bus_driver read pocso', readDoc(db, 'pocso', 'pc1'));
  await no('bus_driver read question paper (non-academic staff)', readDoc(db, 'questionPapers', 'qp1'));
  await no('bus_driver read report card (non-academic staff)', readDoc(db, 'reportCards', 'rc_pub'));
}

// --- Accounts clerk (fees staff): fees yes, payroll no ---
{
  const db = as('accounts_clerk');
  await ok('accounts_clerk read all invoices', listAll(db, 'fee_invoices'));
  await ok('accounts_clerk read payment', readDoc(db, 'fee_payments', 'pay1'));
  await ok('accounts_clerk read refund', readDoc(db, 'fee_refunds', 'rf1'));
  await ok('accounts_clerk write refund', writeDoc(db, ['fee_refunds', 'rf2'], { studentId: 'stu1', amount: 50, refundNo: 'RF-2026-0002' }));
  await ok('accounts_clerk write invoice', writeDoc(db, ['fee_invoices', 'inv3'], { studentId: 'stu1', netAmount: 200 }));
  await ok('accounts_clerk read receipt counter', readDoc(db, 'finance_counters', 'receipt'));
  await no('accounts_clerk read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await no('accounts_clerk read salary', readDoc(db, 'salary_structures', 'stf1'));
}

// --- HR manager (payroll staff): payroll + staff yes ---
{
  const db = as('hr_manager');
  await ok('hr_manager read payroll run', readDoc(db, 'payroll_runs', 'r1'));
  await ok('hr_manager read payslip', readDoc(db, 'payslips', 'ps1'));
  await ok('hr_manager write salary structure', writeDoc(db, ['salary_structures', 'stf1'], { gross: 61000 }));
  await ok('hr_manager write staff record', writeDoc(db, ['staff', 'stf1'], { name: 'Teacher One', pan: 'YYYYY5678Y' }));
  await no('hr_manager read pocso', readDoc(db, 'pocso', 'pc1'));
}

// --- Chief accountant: both fees and payroll ---
{
  const db = as('chief_accountant');
  await ok('chief_accountant read invoices', listAll(db, 'fee_invoices'));
  await ok('chief_accountant read payroll', readDoc(db, 'payroll_runs', 'r1'));
}

// --- DPO: consent yes, grievances yes, pocso NO ---
{
  const db = as('dpo');
  await ok('dpo read consent', readDoc(db, 'consent_records', 'cr1'));
  await ok('dpo write consent', writeDoc(db, ['consent_records', 'cr2'], { studentId: 'stu2' }));
  await ok('dpo read grievance', readDoc(db, 'grievances', 'gr1'));
  await no('dpo read pocso', readDoc(db, 'pocso', 'pc1'));
  await no('dpo read payroll', readDoc(db, 'payroll_runs', 'r1'));
}

// --- Special educator: IEP/therapy yes; payroll no ---
{
  const db = as('special_educator');
  await ok('sped read iep', readDoc(db, 'iep_plans', 'iep1'));
  await ok('sped write therapy log', writeDoc(db, ['therapy_logs', 'tl2'], { studentId: 'stu1', note: 'x' }));
  await no('sped read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await no('sped read pocso', readDoc(db, 'pocso', 'pc1'));
}

// --- Nurse: medical yes; iep no (nurse is not sped); payroll no ---
{
  const db = as('nurse');
  await ok('nurse read medical', readDoc(db, 'medical', 'md1'));
  await no('nurse read iep', readDoc(db, 'iep_plans', 'iep1'));
  await no('nurse read payroll', readDoc(db, 'payroll_runs', 'r1'));
}

// --- Counselor: counseling yes; pocso NO ---
{
  const db = as('counselor');
  await ok('counselor read counseling', readDoc(db, 'counseling', 'co1'));
  await no('counselor read pocso', readDoc(db, 'pocso', 'pc1'));
}

// --- CPO: pocso + grievances yes ---
{
  const db = as('cpo');
  await ok('cpo read pocso', readDoc(db, 'pocso', 'pc1'));
  await ok('cpo write pocso', writeDoc(db, ['pocso', 'pc2'], { caseNo: 'PC-2' }));
  await ok('cpo read grievance', readDoc(db, 'grievances', 'gr1'));
}

// --- POSH committee (decision 1): grievances yes, POCSO NO ---
{
  const db = as('posh_committee');
  await ok('posh read grievance', readDoc(db, 'grievances', 'gr1'));
  await ok('posh write grievance', writeDoc(db, ['grievances', 'gr2'], { refNo: 'GR-2' }));
  await no('posh read pocso', readDoc(db, 'pocso', 'pc1'));
  await no('posh write pocso', writeDoc(db, ['pocso', 'pcX'], { caseNo: 'X' }));
}

// --- ICC member (decision 2): grievances yes, POCSO NO ---
{
  const db = as('icc_member');
  await ok('icc read grievance', readDoc(db, 'grievances', 'gr1'));
  await ok('icc write grievance', writeDoc(db, ['grievances', 'gr3'], { refNo: 'GR-3' }));
  await no('icc read pocso', readDoc(db, 'pocso', 'pc1'));
}

// --- Parent P1: own child only ---
{
  const db = as('parentP1');
  await ok('parentP1 read own child student', readDoc(db, 'students', 'stu1'));
  await ok('parentP1 read own child invoices (scoped query)', listWhere(db, 'fee_invoices', 'studentId', 'stu1'));
  await ok('parentP1 read own child payments (scoped query)', listWhere(db, 'fee_payments', 'studentId', 'stu1'));
  await ok('parentP1 read own child refunds (scoped query)', listWhere(db, 'fee_refunds', 'studentId', 'stu1'));
  await ok('parentP1 read finance_settings (how-to-pay)', readDoc(db, 'finance_settings', 'main'));
  await ok('parentP1 read circular', readDoc(db, 'circulars', 'c1'));
  // cross-family / sensitive denials
  await no('parentP1 read OTHER child student', readDoc(db, 'students', 'stu2'));
  await no('parentP1 read OTHER child refund (scoped query)', listWhere(db, 'fee_refunds', 'studentId', 'stu2'));
  await no('parentP1 read OTHER child invoice', readDoc(db, 'fee_invoices', 'inv2'));
  await no('parentP1 read ALL invoices (unscoped)', listAll(db, 'fee_invoices'));
  await no('parentP1 read ALL students (unscoped)', listAll(db, 'students'));
  await no('parentP1 read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await no('parentP1 read salary', readDoc(db, 'salary_structures', 'stf1'));
  await no('parentP1 read staff PII', readDoc(db, 'staff', 'stf1'));
  await no('parentP1 read certificates', readDoc(db, 'certificates', 'crt1'));
  await no('parentP1 read question paper', readDoc(db, 'questionPapers', 'qp1'));
  await ok('parentP1 read own PUBLISHED report card (scoped)', getDocs(query(collection(db, 'schools', S1, 'reportCards'), where('studentId', '==', 'stu1'), where('published', '==', true))));
  await no('parentP1 read unpublished report card', readDoc(db, 'reportCards', 'rc_draft'));
  await ok('parentP1 read own child portfolio (scoped)', listWhere(db, 'portfolio', 'studentId', 'stu1'));
  await ok('parentP1 read own child career attempt (scoped)', listWhere(db, 'careerAssessments', 'studentId', 'stu1'));
  await no('parentP1 read pocso', readDoc(db, 'pocso', 'pc1'));
  await no('parentP1 read medical', readDoc(db, 'medical', 'md1'));
  await no('parentP1 read iep', readDoc(db, 'iep_plans', 'iep1'));
  await no('parentP1 write own child student', writeDoc(db, ['students', 'stu1'], { fullName: 'x' }));
}

// --- Student S1: own record only ---
{
  const db = as('studentS1');
  await ok('studentS1 read own student doc', readDoc(db, 'students', 'stu1'));
  await ok('studentS1 read own invoices (scoped)', listWhere(db, 'fee_invoices', 'studentId', 'stu1'));
  await ok('studentS1 read circular', readDoc(db, 'circulars', 'c1'));
  await no('studentS1 read other student', readDoc(db, 'students', 'stu2'));
  await no('studentS1 read other invoice', readDoc(db, 'fee_invoices', 'inv2'));
  await no('studentS1 read payroll', readDoc(db, 'payroll_runs', 'r1'));
  await no('studentS1 read certificates', readDoc(db, 'certificates', 'crt1'));
  await no('studentS1 read question paper (must never reach students)', readDoc(db, 'questionPapers', 'qp1'));
  await ok('studentS1 read own portfolio (scoped)', listWhere(db, 'portfolio', 'studentId', 'stu1'));
  await ok('studentS1 create own portfolio entry', writeDoc(db, ['portfolio', 'pf_new'], { studentId: 'stu1', title: 'Debate', status: 'submitted' }));
  await no('studentS1 cannot self-verify portfolio', writeDoc(db, ['portfolio', 'pf_cheat'], { studentId: 'stu1', title: 'X', status: 'verified' }));
  await ok('studentS1 read own career attempt (scoped)', listWhere(db, 'careerAssessments', 'studentId', 'stu1'));
  await ok('studentS1 create own career attempt', writeDoc(db, ['careerAssessments', 'ca_new'], { studentId: 'stu1', status: 'completed' }));
  await no('studentS1 read pocso', readDoc(db, 'pocso', 'pc1'));
}

// --- Certificate issuer allowlist (leadership / academic+admin leadership / office) ---
{
  // Previously LOCKED OUT by the students.write gate — must now be allowed.
  const hod = as('hod');
  await ok('hod read certificate (issuer)', readDoc(hod, 'certificates', 'crt1'));
  await ok('hod write certificate (issuer)', writeDoc(hod, ['certificates', 'crt_hod'], { studentId: 'stu1', serialNo: 'BON-2026-1001', type: 'bonafide' }));
  await ok('hod write certificate_counter (issuer)', writeDoc(hod, ['certificate_counters', 'bonafide'], { value: 2 }));
  const vpa = as('vp_admin');
  await ok('vp_admin read certificate (issuer)', readDoc(vpa, 'certificates', 'crt1'));
  await ok('vp_admin write certificate (issuer)', writeDoc(vpa, ['certificates', 'crt_vpa'], { studentId: 'stu1', serialNo: 'BON-2026-1002', type: 'bonafide' }));
  await ok('registrar write certificate (issuer)', writeDoc(as('registrar'), ['certificates', 'crt_reg'], { studentId: 'stu1', serialNo: 'TC-2026-0001', type: 'transfer' }));
  // Staff who are NOT certificate issuers must now be DENIED (over-permission closed).
  await no('accounts_clerk read certificate (not issuer)', readDoc(as('accounts_clerk'), 'certificates', 'crt1'));
  await no('nurse read certificate (not issuer)', readDoc(as('nurse'), 'certificates', 'crt1'));
  await no('bus_driver write certificate (not issuer)', writeDoc(as('bus_driver'), ['certificates', 'crtX'], { studentId: 'stu1', serialNo: 'X', type: 'bonafide' }));
  await no('nurse write certificate_counter (not issuer)', writeDoc(as('nurse'), ['certificate_counters', 'bonafide'], { value: 99 }));
}

// --- Question papers/bank/blueprints: exam staff only (tightened from isAcademicStaff) ---
{
  await ok('subject_teacher read question paper (exam staff)', readDoc(as('subject_teacher'), 'questionPapers', 'qp1'));
  await ok('hod write question bank (exam staff)', writeDoc(as('hod'), ['questionBank', 'qb_hod'], { stem: 'y?', subjectId: 'sub-math', marks: 2 }));
  // sports/arts/special-ed were swept in by isAcademicStaff before — answer keys must NOT reach them.
  await no('sports_teacher read question paper (not exam staff)', readDoc(as('sports_teacher'), 'questionPapers', 'qp1'));
  await no('sports_teacher read question bank (not exam staff)', readDoc(as('sports_teacher'), 'questionBank', 'qb1'));
  await no('special_educator read question paper (not exam staff)', readDoc(as('special_educator'), 'questionPapers', 'qp1'));
}

// --- Career assessments: counselling staff review; student owns own; others denied ---
{
  const cou = as('counselor');
  await ok('counselor read career attempt (counselling staff)', readDoc(cou, 'careerAssessments', 'ca1'));
  await ok('counselor review (update) career attempt', writeDoc(cou, ['careerAssessments', 'ca1'], { studentId: 'stu1', status: 'reviewed' }));
  await ok('guidance_counselor read career attempt', readDoc(as('guidance_counselor'), 'careerAssessments', 'ca1'));
  // non-counselling staff must NOT read every student's aptitude profile (tightened from isStaff)
  await no('nurse read career attempt (not counselling staff)', readDoc(as('nurse'), 'careerAssessments', 'ca1'));
  await no('accounts_clerk read career attempt (not counselling staff)', readDoc(as('accounts_clerk'), 'careerAssessments', 'ca1'));
  await no('studentS1 cannot update own career attempt (review is staff-only)', writeDoc(as('studentS1'), ['careerAssessments', 'ca1'], { studentId: 'stu1', status: 'reviewed' }));
}

// --- Consent PURPOSES catalogue: any active member reads; only consent staff writes ---
{
  await ok('class_teacher read consent purpose (active member)', readDoc(as('class_teacher'), 'consent_purposes', 'cp1'));
  await ok('parentP1 read consent purpose (needed to respond)', readDoc(as('parentP1'), 'consent_purposes', 'cp1'));
  await ok('dpo write consent purpose (consent staff)', writeDoc(as('dpo'), ['consent_purposes', 'cp2'], { name: 'Field trip consent' }));
  await no('bus_driver write consent purpose (not consent staff)', writeDoc(as('bus_driver'), ['consent_purposes', 'cpX'], { name: 'x' }));
  await no('class_teacher write consent purpose (not consent staff)', writeDoc(as('class_teacher'), ['consent_purposes', 'cpY'], { name: 'y' }));
}

// ============================================================
// PRE-LAUNCH SECURITY PASS — new assertions
// ============================================================

// --- P0.1 member self-update must NOT allow privilege escalation ---
{
  const db = as('class_teacher');
  const meRef = doc(db, 'schools', S1, 'members', 'class_teacher');
  // allowed: editing a benign profile field (name/phone) keeping role/status/school
  // and all privilege fields unchanged (absent → stays absent).
  await ok('member self-edit own name (benign)',
    setDoc(meRef, { uid: 'class_teacher', schoolId: S1, roleId: 'class_teacher', status: 'active', name: 'New Name' }));
  // BLOCKED: self-granting grantedPermissions → full escalation.
  await no('member CANNOT self-grant grantedPermissions',
    setDoc(meRef, { uid: 'class_teacher', schoolId: S1, roleId: 'class_teacher', status: 'active', grantedPermissions: ['*'] }));
  // BLOCKED: self-assigning a second (privileged) role.
  await no('member CANNOT self-add secondaryRoleId',
    setDoc(meRef, { uid: 'class_teacher', schoolId: S1, roleId: 'class_teacher', status: 'active', secondaryRoleId: 'principal' }));
  // BLOCKED: self-promotion to super admin via a member field.
  await no('member CANNOT self-set isSuperAdmin',
    setDoc(meRef, { uid: 'class_teacher', schoolId: S1, roleId: 'class_teacher', status: 'active', isSuperAdmin: true }));
  // BLOCKED: changing own role (existing guard, re-asserted).
  await no('member CANNOT change own roleId',
    setDoc(meRef, { uid: 'class_teacher', schoolId: S1, roleId: 'principal', status: 'active' }));
  // Admin CAN grant grantedPermissions to a member (legitimate path still works).
  await ok('principal CAN grant grantedPermissions to a member',
    setDoc(doc(as('principal'), 'schools', S1, 'members', 'class_teacher'),
      { uid: 'class_teacher', schoolId: S1, roleId: 'class_teacher', status: 'active', grantedPermissions: ['fees.read'] }));
}

// --- P0.3 cross-tenant userIndex hijack must be blocked ---
{
  // seed an existing index owned by S1 (done in seed for the named roles). The S2
  // principal must NOT be able to move/hijack an S1 user into S2.
  const s2admin = as('outsider'); // principal of S2
  await no('outsider CANNOT rewrite S1 user index into S2',
    setDoc(doc(s2admin, 'userIndex', 'class_teacher'), { uid: 'class_teacher', schoolId: S2, roleId: 'principal' }));
  // S1 admin cannot change a user's tenant either (schoolId immutable on update).
  await no('S1 admin CANNOT change a userIndex tenant',
    setDoc(doc(as('principal'), 'userIndex', 'class_teacher'), { uid: 'class_teacher', schoolId: S2, roleId: 'class_teacher' }));
  // S1 admin cannot mint a super admin via userIndex.
  await no('S1 admin CANNOT mint super admin via userIndex (create)',
    setDoc(doc(as('principal'), 'userIndex', 'brandnew'), { uid: 'brandnew', schoolId: S1, roleId: 'class_teacher', isSuperAdmin: true }));
  // S1 admin CAN still provision a new in-tenant user (must not break onboarding).
  await ok('S1 admin CAN create a new in-tenant userIndex',
    setDoc(doc(as('principal'), 'userIndex', 'fresh1'), { uid: 'fresh1', schoolId: S1, roleId: 'subject_teacher' }));
}

// --- P0.2 conversations/messages: participants only ---
{
  // participant (principal) reads the thread + message; non-participant (counselor) cannot.
  await ok('participant reads own conversation', readDoc(as('principal'), 'conversations', 'principal__class_teacher'));
  await ok('participant reads message in own thread',
    getDocs(query(collection(as('class_teacher'), 'schools', S1, 'messages'), where('conversationId', '==', 'principal__class_teacher'))));
  await no('non-participant CANNOT read conversation (POCSO leak)', readDoc(as('counselor'), 'conversations', 'principal__class_teacher'));
  await no('non-participant CANNOT read message in foreign thread',
    getDocs(query(collection(as('counselor'), 'schools', S1, 'messages'), where('conversationId', '==', 'principal__class_teacher'))));
  // a message create must carry senderUid == requester AND requester must be a participant.
  await ok('participant sends message (senderUid == self)',
    setDoc(doc(as('principal'), 'schools', S1, 'messages', 'm_ok'),
      { conversationId: 'principal__class_teacher', senderUid: 'principal', text: 'hi' }));
  await no('cannot spoof senderUid on message create',
    setDoc(doc(as('principal'), 'schools', S1, 'messages', 'm_spoof'),
      { conversationId: 'principal__class_teacher', senderUid: 'class_teacher', text: 'spoofed' }));
  await no('non-participant CANNOT post into a thread',
    setDoc(doc(as('counselor'), 'schools', S1, 'messages', 'm_intrude'),
      { conversationId: 'principal__class_teacher', senderUid: 'counselor', text: 'intrude' }));
  // starting a brand-new conversation: author must be a participant.
  await ok('member creates own new conversation',
    setDoc(doc(as('counselor'), 'schools', S1, 'conversations', 'counselor__principal'),
      { participantUids: ['counselor', 'principal'], kind: 'direct', lastMessage: '', lastAt: 2 }));
  await no('cannot create a conversation you are not in',
    setDoc(doc(as('counselor'), 'schools', S1, 'conversations', 'principal__hr_manager'),
      { participantUids: ['hr_manager', 'principal'], kind: 'direct', lastMessage: '', lastAt: 2 }));
}

// --- P1.4 finance / procurement / governance / rte / visitor / legal collections ---
{
  // finance/procurement
  await ok('chief_accountant reads vendor', readDoc(as('chief_accountant'), 'vendors', 'v1'));
  await ok('accounts_clerk reads fee_structures', readDoc(as('accounts_clerk'), 'fee_structures', 'fs1'));
  await no('bus_driver CANNOT read vendor (cost data)', readDoc(as('bus_driver'), 'vendors', 'v1'));
  await no('class_teacher CANNOT read purchase order', readDoc(as('class_teacher'), 'purchase_orders', 'po1'));
  await no('parentP1 CANNOT read expense_settings', readDoc(as('parentP1'), 'expense_settings', 'main'));
  // finance_settings stays parent-readable (how-to-pay) — re-assert it didn't regress.
  await ok('parentP1 reads finance_settings (how-to-pay)', readDoc(as('parentP1'), 'finance_settings', 'main'));
  await no('parentP1 CANNOT write finance_settings', writeDoc(as('parentP1'), ['finance_settings', 'main'], { bankName: 'Hacked' }));

  // governance / statutory
  await ok('principal reads smc_members', readDoc(as('principal'), 'smc_members', 'sm1'));
  await ok('it_admin reads compliance_items (governance)', readDoc(as('it_admin'), 'compliance_items', 'ci1'));
  await no('class_teacher CANNOT read compliance_items', readDoc(as('class_teacher'), 'compliance_items', 'ci1'));
  await no('bus_driver CANNOT write udise_profile', writeDoc(as('bus_driver'), ['udise_profile', 'main'], { udiseCode: 'x' }));

  // rte (admissions)
  await ok('registrar reads rte_applications', readDoc(as('registrar'), 'rte_applications', 'rte1'));
  await no('nurse CANNOT read rte_applications', readDoc(as('nurse'), 'rte_applications', 'rte1'));

  // visitor / gate
  await ok('security_guard reads visitors', readDoc(as('security_guard'), 'visitors', 'vis1'));
  await ok('front_desk reads visitor_blacklist', readDoc(as('front_desk'), 'visitor_blacklist', 'bl1'));
  await no('class_teacher CANNOT read visitor blacklist', readDoc(as('class_teacher'), 'visitor_blacklist', 'bl1'));
  await no('bus_driver CANNOT read visitors PII', readDoc(as('bus_driver'), 'visitors', 'vis1'));

  // delegations — staff read, only admin writes
  await ok('class_teacher reads delegations (own grants)', readDoc(as('class_teacher'), 'delegations', 'dl1'));
  await ok('principal writes a delegation', writeDoc(as('principal'), ['delegations', 'dl2'], { delegateUid: 'nurse', moduleKey: 'medical', active: true }));
  await no('class_teacher CANNOT write a delegation', writeDoc(as('class_teacher'), ['delegations', 'dl3'], { delegateUid: 'class_teacher', moduleKey: 'fees', active: true }));

  // legal-pass collections
  await ok('cpo reads pocso_counters', readDoc(as('cpo'), 'pocso_counters', 'main'));
  await no('counselor CANNOT read pocso_counters', readDoc(as('counselor'), 'pocso_counters', 'main'));
  await ok('dpo reads erasure_requests', readDoc(as('dpo'), 'erasure_requests', 'er1'));
  await no('bus_driver CANNOT read erasure_requests', readDoc(as('bus_driver'), 'erasure_requests', 'er1'));
  await ok('it_admin reads breach_notifications', readDoc(as('it_admin'), 'breach_notifications', 'bn1'));
  await no('class_teacher CANNOT read breach_notifications', readDoc(as('class_teacher'), 'breach_notifications', 'bn1'));
}

// ============================================================
// THIS SESSION — new collections + tightenings
// ============================================================

// --- board_results: exam staff manage; family reads own; others denied ---
{
  await ok('subject_teacher reads board_result (exam staff)', readDoc(as('subject_teacher'), 'board_results', 'br1'));
  await ok('hod writes board_result (exam staff)', writeDoc(as('hod'), ['board_results', 'br2'], { studentId: 'stu2', board: 'CBSE', percentage: 70 }));
  await ok('parentP1 reads OWN child board_result (scoped)', listWhere(as('parentP1'), 'board_results', 'studentId', 'stu1'));
  await ok('parentP1 reads OWN child board_result br1 (direct)', readDoc(as('parentP1'), 'board_results', 'br1'));
  await no('parentP2 reads OTHER child board_result (stu1)', readDoc(as('parentP2'), 'board_results', 'br1'));
  await no('parentP1 CANNOT write board_result', writeDoc(as('parentP1'), ['board_results', 'brX'], { studentId: 'stu1', percentage: 100 }));
  await no('sports_teacher CANNOT read board_result (not exam staff)', readDoc(as('sports_teacher'), 'board_results', 'br1'));
  await no('bus_driver CANNOT read board_result', readDoc(as('bus_driver'), 'board_results', 'br1'));
}

// --- student_leave_requests: parent files own child; staff decide ---
{
  // parent CAN create a pending request for their OWN child.
  await ok('parentP1 creates leave for own child (pending)',
    writeDoc(as('parentP1'), ['student_leave_requests', 'slr_p1'], { studentId: 'stu1', requestedByUid: 'parentP1', status: 'pending', reason: 'Trip' }));
  // a non-pending create by a parent is rejected (parents can only file pending).
  await no('parentP1 CANNOT create pre-approved leave for own child',
    writeDoc(as('parentP1'), ['student_leave_requests', 'slr_cheat'], { studentId: 'stu1', requestedByUid: 'parentP1', status: 'approved', reason: 'x' }));
  // a DIFFERENT parent cannot file for someone else's child.
  await no('parentP2 CANNOT create leave for another child (stu1)',
    writeDoc(as('parentP2'), ['student_leave_requests', 'slr_p2'], { studentId: 'stu1', requestedByUid: 'parentP2', status: 'pending', reason: 'x' }));
  // parent reads own child's requests (scoped); cannot list all.
  await ok('parentP1 reads own child leave (scoped)', listWhere(as('parentP1'), 'student_leave_requests', 'studentId', 'stu1'));
  await no('parentP2 reads OTHER child leave (stu1)', readDoc(as('parentP2'), 'student_leave_requests', 'slr1'));
  // parent CANNOT approve/decide (update) or delete — staff-only.
  await no('parentP1 CANNOT approve own child leave',
    writeDoc(as('parentP1'), ['student_leave_requests', 'slr1'], { studentId: 'stu1', requestedByUid: 'parentP1', status: 'approved', reason: 'Fever' }));
  // staff read all + decide.
  await ok('class_teacher reads any leave request', readDoc(as('class_teacher'), 'student_leave_requests', 'slr1'));
  await ok('class_teacher approves a leave request',
    writeDoc(as('class_teacher'), ['student_leave_requests', 'slr1'], { studentId: 'stu1', requestedByUid: 'parentP1', status: 'approved', reason: 'Fever' }));
  // FIELD-PIN (defense-in-depth): even staff correcting a decision may NOT rewrite
  // WHICH child the request is for, or WHO filed it.
  await no('staff CANNOT change leave studentId on update',
    writeDoc(as('class_teacher'), ['student_leave_requests', 'slr1'], { studentId: 'stu2', requestedByUid: 'parentP1', status: 'approved', reason: 'Fever' }));
  await no('staff CANNOT change leave requestedByUid on update',
    writeDoc(as('class_teacher'), ['student_leave_requests', 'slr1'], { studentId: 'stu1', requestedByUid: 'parentP2', status: 'approved', reason: 'Fever' }));
}

// --- ptm_meetings (+ booking subdocs): meetings member-visible; staff create; parent books ---
{
  await ok('parentP1 reads ptm meeting (active member)', readDoc(as('parentP1'), 'ptm_meetings', 'ptm1'));
  await ok('class_teacher creates ptm meeting (staff)',
    writeDoc(as('class_teacher'), ['ptm_meetings', 'ptm_new'], { title: 'PTM 2', date: 2, slots: [], createdByUid: 'class_teacher' }));
  await no('parentP1 CANNOT create a ptm meeting (staff-only)',
    writeDoc(as('parentP1'), ['ptm_meetings', 'ptm_cheat'], { title: 'fake', date: 2, slots: [], createdByUid: 'parentP1' }));
  // booking bookkeeping subdocs: any active member (parent) may write the counter + guard.
  await ok('parentP1 reads slot_counter (live availability)',
    getDoc(doc(as('parentP1'), 'schools', S1, 'ptm_meetings', 'ptm1', 'slot_counters', 'slotA')));
  await ok('parentP1 writes slot_counter (booking txn)',
    setDoc(doc(as('parentP1'), 'schools', S1, 'ptm_meetings', 'ptm1', 'slot_counters', 'slotA'), { count: 2, slotId: 'slotA', schoolId: S1 }));
  await ok('parentP1 writes booked_students guard (booking txn)',
    setDoc(doc(as('parentP1'), 'schools', S1, 'ptm_meetings', 'ptm1', 'booked_students', 'stu1'), { status: 'booked', slotId: 'slotA', schoolId: S1 }));
  // an outsider (other tenant) cannot touch the booking subdocs.
  await no('outsider CANNOT write slot_counter',
    setDoc(doc(as('outsider'), 'schools', S1, 'ptm_meetings', 'ptm1', 'slot_counters', 'slotA'), { count: 9, slotId: 'slotA', schoolId: S1 }));
}

// --- ptm_bookings: parent owns own; different parent denied; staff roster ---
{
  // parent CAN create a booking for their OWN child stamped with their own uid.
  await ok('parentP1 creates own booking',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb_p1'], { meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP1', status: 'booked' }));
  // cannot spoof parentUid (book under someone else's uid).
  await no('parentP1 CANNOT create booking spoofing parentUid',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb_spoof'], { meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP2', status: 'booked' }));
  // a DIFFERENT parent cannot book for a child that isn't theirs.
  await no('parentP2 CANNOT book for another child (stu1)',
    writeDoc(as('parentP2'), ['ptm_bookings', 'pb_p2'], { meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP2', status: 'booked' }));
  // parent reads OWN booking; a different parent cannot read it.
  await ok('parentP1 reads own booking', readDoc(as('parentP1'), 'ptm_bookings', 'pb1'));
  await no('parentP2 CANNOT read another parent booking', readDoc(as('parentP2'), 'ptm_bookings', 'pb1'));
  // parent cancels (updates) own booking; cannot delete.
  await ok('parentP1 cancels own booking (update)',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb1'], { meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP1', status: 'cancelled' }));
  // FIELD-PIN: a parent updating their OWN booking may flip status but may NOT
  // rewrite the immutable identity/ownership fields.
  // (a) cannot move the booking to ANOTHER child (steal a roster row).
  await no('parentP1 CANNOT change booking studentId (move to another child)',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb1'], { meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu2', parentUid: 'parentP1', status: 'booked' }));
  // (b) cannot change which meeting the booking belongs to.
  await no('parentP1 CANNOT change booking meetingId',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb1'], { meetingId: 'ptm_other', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP1', status: 'booked' }));
  // (c) cannot grab a different slot (steal another seat).
  await no('parentP1 CANNOT change booking slotId (steal another slot)',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb1'], { meetingId: 'ptm1', slotId: 'slotB', studentId: 'stu1', parentUid: 'parentP1', status: 'booked' }));
  // (d) cannot reassign ownership (dump the booking on / steal it from another parent).
  await no('parentP1 CANNOT change booking parentUid (reassign ownership)',
    writeDoc(as('parentP1'), ['ptm_bookings', 'pb1'], { meetingId: 'ptm1', slotId: 'slotA', studentId: 'stu1', parentUid: 'parentP2', status: 'booked' }));
  // staff read the roster.
  await ok('class_teacher reads booking roster', readDoc(as('class_teacher'), 'ptm_bookings', 'pb1'));
  // staff update path stays UNCONSTRAINED — the desk may fix/move a booking row.
  await ok('class_teacher CAN re-key a booking (staff roster fix)',
    writeDoc(as('class_teacher'), ['ptm_bookings', 'pb1'], { meetingId: 'ptm1', slotId: 'slotB', studentId: 'stu2', parentUid: 'parentP2', status: 'booked' }));
}

// --- counseling per-counsellor confidentiality scoping ---
{
  // legacy co1 (no counselorUid) stays readable by ANY counsellor (must not break).
  await ok('counselor reads counseling co1', readDoc(as('counselor'), 'counseling', 'co1'));
  await ok('counselor2 reads LEGACY counseling co1 (no counselorUid)', readDoc(as('counselor2'), 'counseling', 'co1'));
  // a STAMPED doc is visible to its owning counsellor + oversight, but NOT to a peer.
  await ok('owning counselor reads own stamped doc', readDoc(as('counselor'), 'counseling', 'co_stamped'));
  await no('counselor2 CANNOT read peer-owned stamped doc', readDoc(as('counselor2'), 'counseling', 'co_stamped'));
  await ok('principal (oversight) reads any stamped counseling doc', readDoc(as('principal'), 'counseling', 'co_stamped'));
  await ok('vp_admin (oversight) reads any stamped counseling doc', readDoc(as('vp_admin'), 'counseling', 'co_stamped'));
  // a counsellor may create a doc stamped with their OWN uid, but not one stamped to a peer.
  await ok('counselor2 creates own stamped counseling doc',
    writeDoc(as('counselor2'), ['counseling', 'co_c2'], { studentId: 'stu1', counselorUid: 'counselor2', summary: 'x' }));
  await no('counselor2 CANNOT create doc stamped to another counsellor',
    writeDoc(as('counselor2'), ['counseling', 'co_forge'], { studentId: 'stu1', counselorUid: 'counselor', summary: 'x' }));
  // a non-counsellor (nurse) still cannot read counseling at all.
  await no('nurse CANNOT read counseling', readDoc(as('nurse'), 'counseling', 'co1'));
}

// --- fee_invoices write-invariants (defense-in-depth) ---
{
  // cancelling a PAID invoice (paidAmount > 0) is denied.
  await no('cancel a PAID invoice is denied',
    writeDoc(as('accounts_clerk'), ['fee_invoices', 'inv_paid'], { studentId: 'stu1', netAmount: 1000, paidAmount: 1000, status: 'cancelled' }));
  // cancelling an UNPAID invoice is fine (inv1 has no paidAmount → 0).
  await ok('cancel an UNPAID invoice is allowed',
    writeDoc(as('accounts_clerk'), ['fee_invoices', 'inv1'], { studentId: 'stu1', netAmount: 1000, status: 'cancelled' }));
  // overpay (paidAmount > netAmount) is denied.
  await no('overpay (paidAmount > netAmount) is denied',
    writeDoc(as('accounts_clerk'), ['fee_invoices', 'inv2'], { studentId: 'stu2', netAmount: 1000, paidAmount: 1500 }));
  // a normal payment posting (paidAmount <= netAmount, not cancelling) still works.
  await ok('normal payment update (paidAmount <= netAmount) allowed',
    writeDoc(as('accounts_clerk'), ['fee_invoices', 'inv_paid'], { studentId: 'stu1', netAmount: 1000, paidAmount: 800, status: 'partial' }));
  // create is unconstrained beyond the role gate (re-assert it didn't regress).
  await ok('accounts_clerk creates invoice (role gate only)',
    writeDoc(as('accounts_clerk'), ['fee_invoices', 'inv_new'], { studentId: 'stu1', netAmount: 500 }));
}

// --- substitutions: member read; academic staff write (tightened from wildcard) ---
{
  await ok('class_teacher reads substitution (member)', readDoc(as('class_teacher'), 'substitutions', 'sub1'));
  await ok('studentS1 reads substitution (member)', readDoc(as('studentS1'), 'substitutions', 'sub1'));
  await ok('academic_coordinator… class_teacher writes substitution (academic staff)',
    writeDoc(as('class_teacher'), ['substitutions', 'sub2'], { date: 1, periodNo: 3, sectionId: 'sec1', substituteTeacherUid: 'subject_teacher' }));
  // a non-academic staff (bus_driver) can no longer write cover.
  await no('bus_driver CANNOT write substitution (not academic staff)',
    writeDoc(as('bus_driver'), ['substitutions', 'subX'], { date: 1, periodNo: 4, sectionId: 'sec1', substituteTeacherUid: 'x' }));
}

// ----------------------------- report -----------------------------
await testEnv.cleanup();
console.log(`\n──────── RULES TEST RESULTS ────────`);
console.log(`PASS: ${pass}   FAIL: ${fail}`);
if (failures.length) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
} else {
  console.log(`✓ all rules assertions held`);
  process.exit(0);
}
