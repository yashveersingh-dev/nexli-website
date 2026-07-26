#!/usr/bin/env node
/**
 * NEXLI — DEMO SEED (testing). Run by the project owner with Admin credentials.
 *
 * Auto-provisions a fully populated test school so you can review every role
 * immediately — NO manual Firebase Auth / Firestore entry required. Creates:
 *   • Super Admin (platform)
 *   • A demo school tenant with realistic config
 *   • Staff logins for every important role (principal, admin, coordinator,
 *     class & subject teachers, accounts, HR, transport, hostel, librarian,
 *     nurse, CPO, IT admin)
 *   • A student login + a parent (phone-OTP) login linked to children
 *   • Demo data: grades/sections/subjects/houses/rooms, ~12 students, staff
 *     profiles, a fee structure + invoices + a receipt, an attendance day,
 *     circulars, an event, a transport route+vehicle, a hostel block+room, a
 *     library book, a homework + an assessment.
 *
 * PREREQUISITES (owner machine):
 *   1) firebase-admin installed (already in devDependencies).
 *   2) Admin credentials, one of:
 *        gcloud auth application-default login          (ADC), OR
 *        set GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json
 *   3) Firebase console → Authentication → enable Email/Password (+ Phone for
 *      the parent test login).
 *
 * USAGE (from Web/):
 *   node scripts/seed-demo.mjs --super-email you@org.com --super-pass 'StrongPass#1'
 *   # optional: --password 'NexliDemo@2026'  --school-id nexli-demo  --parent-phone +919999900001
 *
 * Re-running is safe & idempotent (auth users reused; docs merged on fixed ids).
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env[`NEXLI_${name.toUpperCase().replace(/-/g, '_')}`] ?? fallback;
}

const superEmail = arg('super-email');
const superPass = arg('super-pass');
const DEMO_PASS = arg('password', 'NexliDemo@2026');
const SCHOOL_ID = arg('school-id', 'nexli-demo');
const SCHOOL_NAME = arg('school-name', 'Nexli Demo International School');
const PARENT_PHONE = arg('parent-phone', '+919999900001');
const EMAIL_DOMAIN = arg('email-domain', 'nexlidemo.test');
const STUDENT_COUNT = Math.max(1, Number(arg('students', '100')) || 100);

if (!superEmail || !superPass) {
  console.error('\n✖ Missing --super-email / --super-pass. See the header of this file for usage.\n');
  process.exit(1);
}

function currentAcademicYear() {
  const y = new Date().getFullYear();
  const start = new Date().getMonth() >= 3 ? y : y - 1;
  return `${start}-${(start + 1).toString().slice(-2)}`;
}
const AY = currentAcademicYear();
const now = Date.now();
const DAY = 86400000;

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true }); // mirror the app's stripUndefined behaviour
const sref = (sub, id) => db.doc(`schools/${SCHOOL_ID}/${sub}/${id}`);

async function ensureEmailUser(email, password, displayName) {
  try {
    const u = await auth.createUser({ email, password, displayName, emailVerified: false });
    return u.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-exists') return (await auth.getUserByEmail(email)).uid;
    throw e;
  }
}
async function ensurePhoneUser(phoneNumber, displayName) {
  try {
    const u = await auth.createUser({ phoneNumber, displayName });
    return u.uid;
  } catch (e) {
    if (e.code === 'auth/phone-number-already-exists') return (await auth.getUserByPhoneNumber(phoneNumber)).uid;
    throw e;
  }
}

/* ----------------------------- role catalogue ----------------------------- */
// label is informational; roleId must match src/types/roles.ts / lib/rbac.ts.
const STAFF = [
  { key: 'principal',   roleId: 'principal',            name: 'Asha Menon',      designation: 'Principal',            dept: 'Leadership' },
  { key: 'admin',       roleId: 'vp_admin',             name: 'Rohit Sharma',    designation: 'VP — Administration',  dept: 'Administration' },
  { key: 'coordinator', roleId: 'academic_coordinator', name: 'Neha Kulkarni',   designation: 'Academic Coordinator', dept: 'Academics' },
  { key: 'teacher',     roleId: 'class_teacher',        name: 'Priya Nair',      designation: 'Class Teacher — 6A',   dept: 'Academics' },
  { key: 'subteacher',  roleId: 'subject_teacher',      name: 'Arjun Rao',       designation: 'Mathematics Teacher',  dept: 'Academics' },
  { key: 'accounts',    roleId: 'chief_accountant',     name: 'Sunita Iyer',     designation: 'Chief Accountant',     dept: 'Finance' },
  { key: 'hr',          roleId: 'hr_manager',           name: 'Imran Khan',      designation: 'HR Manager',           dept: 'Human Resources' },
  { key: 'transport',   roleId: 'transport_manager',    name: 'Vikram Singh',    designation: 'Transport Manager',    dept: 'Transport' },
  { key: 'hostel',      roleId: 'chief_warden',         name: 'Lakshmi Reddy',   designation: 'Chief Warden',         dept: 'Hostel' },
  { key: 'librarian',   roleId: 'librarian',            name: 'Deepa Joshi',     designation: 'Librarian',            dept: 'Library' },
  { key: 'nurse',       roleId: 'nurse',                name: 'Sister Mary',     designation: 'School Nurse',         dept: 'Medical' },
  { key: 'cpo',         roleId: 'cpo',                  name: 'Ananya Das',      designation: 'Child Protection Officer', dept: 'Safeguarding' },
  { key: 'itadmin',     roleId: 'it_admin',             name: 'Karan Mehta',     designation: 'IT Administrator',     dept: 'IT' },
];

const GRADES = [
  { id: 'grade-6', name: 'Grade 6', order: 6 },
  { id: 'grade-7', name: 'Grade 7', order: 7 },
];
const SECTIONS = [
  { id: 'sec-6a', gradeId: 'grade-6', gradeName: 'Grade 6', name: 'A' },
  { id: 'sec-6b', gradeId: 'grade-6', gradeName: 'Grade 6', name: 'B' },
  { id: 'sec-7a', gradeId: 'grade-7', gradeName: 'Grade 7', name: 'A' },
  { id: 'sec-7b', gradeId: 'grade-7', gradeName: 'Grade 7', name: 'B' },
];
const SUBJECTS = [
  { id: 'sub-eng', name: 'English', type: 'core' }, { id: 'sub-math', name: 'Mathematics', type: 'core' },
  { id: 'sub-sci', name: 'Science', type: 'core' }, { id: 'sub-sst', name: 'Social Studies', type: 'core' },
  { id: 'sub-hin', name: 'Hindi', type: 'language' }, { id: 'sub-cs', name: 'Computer Science', type: 'elective' },
];
const HOUSES = [
  { id: 'house-red', name: 'Ruby', color: '#EF4444', points: 120 },
  { id: 'house-blue', name: 'Sapphire', color: '#3B82F6', points: 95 },
  { id: 'house-green', name: 'Emerald', color: '#22C55E', points: 110 },
  { id: 'house-gold', name: 'Topaz', color: '#C6A55C', points: 88 },
];
const ROOMS = [
  { id: 'room-101', name: 'Room 101', type: 'classroom', capacity: 40 },
  { id: 'room-lab', name: 'Science Lab', type: 'lab', capacity: 30 },
];

const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Aditya', 'Saanvi', 'Reyansh', 'Ishita', 'Kabir', 'Myra', 'Arnav', 'Aadhya', 'Ayaan', 'Pari', 'Vihaan', 'Anika', 'Shaurya', 'Navya', 'Atharv', 'Kiara', 'Krishna', 'Aarohi', 'Ishaan', 'Riya', 'Rudra', 'Sara', 'Dhruv', 'Aanya', 'Yuvraj', 'Mahira', 'Advik', 'Tara', 'Kayaan', 'Zara', 'Reyaan', 'Avni', 'Veer', 'Anvi', 'Aryan', 'Siya', 'Kabeer', 'Inaya', 'Devansh', 'Meher', 'Rohan', 'Nitya', 'Samar', 'Prisha', 'Laksh', 'Aaradhya'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Khan', 'Mehta', 'Joshi', 'Rao', 'Das', 'Kulkarni', 'Banerjee', 'Chopra', 'Verma', 'Pillai', 'Bose', 'Shah', 'Menon'];
const SOCIAL = ['general', 'obc', 'sc', 'st', 'general', 'general', 'obc'];

function students(count) {
  const out = [];
  const rollBySec = {};
  for (let i = 0; i < count; i++) {
    const sec = SECTIONS[i % SECTIONS.length];
    rollBySec[sec.id] = (rollBySec[sec.id] ?? 0) + 1;
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + 3) % LAST.length];
    const isEws = i % 17 === 0;
    out.push({
      id: `stu-${String(i + 1).padStart(3, '0')}`,
      admissionNo: `ADM-${AY.slice(0, 4)}-${String(i + 1).padStart(3, '0')}`,
      rollNo: String(rollBySec[sec.id]),
      firstName: first, lastName: last, fullName: `${first} ${last}`,
      gender: i % 2 ? 'female' : 'male',
      gradeId: sec.gradeId, gradeName: sec.gradeName, sectionId: sec.id, sectionName: sec.name,
      house: HOUSES[i % HOUSES.length].name, academicYear: AY, status: 'active',
      admissionDate: now - (150 + (i % 60)) * DAY, admissionType: isEws ? 'rte' : 'regular',
      category: isEws ? 'ews' : SOCIAL[i % SOCIAL.length], rteQuota: isEws,
      dob: now - (11 * 365 + (i % 700)) * DAY,
    });
  }
  return out;
}

async function main() {
  console.log(`\nNEXLI demo seed → project "${PROJECT_ID}", school "${SCHOOL_ID}"\n`);
  const created = [];

  /* 1) Super Admin (owner) */
  const superUid = await ensureEmailUser(superEmail, superPass, 'Super Admin');
  await db.doc(`userIndex/${superUid}`).set({ uid: superUid, roleId: 'super_admin', isSuperAdmin: true, status: 'active' }, { merge: true });
  console.log('✓ Super Admin');

  /* 2) Staff accounts + members + staff profiles */
  const uidByKey = {};
  for (let i = 0; i < STAFF.length; i++) {
    const s = STAFF[i];
    const email = `${s.key}@${EMAIL_DOMAIN}`;
    const uid = await ensureEmailUser(email, DEMO_PASS, s.name);
    uidByKey[s.key] = uid;
    await sref('members', uid).set({
      uid, schoolId: SCHOOL_ID, roleId: s.roleId, name: s.name, email, status: 'active',
      createdAt: now, createdBy: superUid, serverCreatedAt: FieldValue.serverTimestamp(),
      ...(s.key === 'teacher' ? { sectionIds: ['sec-6a'] } : {}),
    }, { merge: true });
    await db.doc(`userIndex/${uid}`).set({ uid, schoolId: SCHOOL_ID, roleId: s.roleId, status: 'active' }, { merge: true });
    await sref('staff', uid).set({
      id: uid, schoolId: SCHOOL_ID, uid, employeeId: `EMP${String(i + 1).padStart(3, '0')}`,
      name: s.name, roleId: s.roleId, designation: s.designation, department: s.dept,
      status: 'active', joiningDate: now - 400 * DAY, gender: i % 2 ? 'female' : 'male',
      createdAt: now, createdBy: superUid,
    }, { merge: true });
    created.push([s.designation, email, DEMO_PASS]);
  }
  console.log(`✓ ${STAFF.length} staff logins + profiles`);

  /* 3) School tenant (admin = principal) */
  await db.doc(`schools/${SCHOOL_ID}`).set({
    name: SCHOOL_NAME, board: 'CBSE', type: 'day_cum_boarding', sizeTier: 'medium',
    city: 'Pune', state: 'Maharashtra', pincode: '411001', phone: '+912012345678',
    email: `office@${EMAIL_DOMAIN}`, subscriptionStatus: 'active', plan: 'Growth', billingCycle: 'annual',
    renewalDate: now + 300 * DAY, currentAcademicYear: AY, onboardingPct: 100,
    adminName: 'Asha Menon', adminEmail: `principal@${EMAIL_DOMAIN}`, adminUid: uidByKey.principal,
    studentCount: STUDENT_COUNT, staffCount: STAFF.length,
    createdAt: now, serverCreatedAt: FieldValue.serverTimestamp(), lastActiveAt: now,
  }, { merge: true });
  console.log('✓ School tenant');

  /* 4) Academic structure */
  for (const g of GRADES) await sref('grades', g.id).set({ id: g.id, schoolId: SCHOOL_ID, ...g }, { merge: true });
  for (const s of SECTIONS) await sref('sections', s.id).set({ id: s.id, schoolId: SCHOOL_ID, gradeId: s.gradeId, name: s.name, classTeacherUid: s.id === 'sec-6a' ? uidByKey.teacher : undefined }, { merge: true });
  for (const s of SUBJECTS) await sref('subjects', s.id).set({ id: s.id, schoolId: SCHOOL_ID, name: s.name, type: s.type, isScholastic: true }, { merge: true });
  for (const h of HOUSES) await sref('houses', h.id).set({ id: h.id, schoolId: SCHOOL_ID, ...h }, { merge: true });
  for (const r of ROOMS) await sref('rooms', r.id).set({ id: r.id, schoolId: SCHOOL_ID, ...r }, { merge: true });
  console.log('✓ Grades, sections, subjects, houses, rooms');

  /* 5) Students (parallel, chunked) */
  const STUDENTS = students(STUDENT_COUNT);
  for (let i = 0; i < STUDENTS.length; i += 25) {
    await Promise.all(STUDENTS.slice(i, i + 25).map((st) => sref('students', st.id).set({ ...st, schoolId: SCHOOL_ID, createdAt: now, createdBy: superUid }, { merge: true })));
  }
  console.log(`✓ ${STUDENTS.length} students`);

  /* 6) Student login (linked to stu-001) */
  const studentEmail = `student@${EMAIL_DOMAIN}`;
  const studentUid = await ensureEmailUser(studentEmail, DEMO_PASS, STUDENTS[0].fullName);
  await sref('members', studentUid).set({ uid: studentUid, schoolId: SCHOOL_ID, roleId: 'student', name: STUDENTS[0].fullName, email: studentEmail, status: 'active', studentId: STUDENTS[0].id, createdAt: now, createdBy: superUid }, { merge: true });
  await db.doc(`userIndex/${studentUid}`).set({ uid: studentUid, schoolId: SCHOOL_ID, roleId: 'student', status: 'active' }, { merge: true });
  created.push(['Student', studentEmail, DEMO_PASS]);
  console.log('✓ Student login');

  /* 7) Parent (phone-OTP) linked to stu-001 + stu-002 */
  let parentNote = '';
  try {
    const parentUid = await ensurePhoneUser(PARENT_PHONE, 'Meera Sharma');
    await sref('members', parentUid).set({ uid: parentUid, schoolId: SCHOOL_ID, roleId: 'parent', name: 'Meera Sharma', phone: PARENT_PHONE, status: 'active', childStudentIds: [STUDENTS[0].id, STUDENTS[1].id], createdAt: now, createdBy: superUid }, { merge: true });
    await db.doc(`userIndex/${parentUid}`).set({ uid: parentUid, schoolId: SCHOOL_ID, roleId: 'parent', status: 'active' }, { merge: true });
    parentNote = `Parent phone ${PARENT_PHONE} (children: ${STUDENTS[0].fullName}, ${STUDENTS[1].fullName})`;
    console.log('✓ Parent (phone) login');
  } catch (e) {
    parentNote = `Parent NOT created (${e.code || e.message}). Enable Phone auth, then re-run.`;
    console.log('• Parent skipped:', e.code || e.message);
  }

  /* 8) Fees: heads + structure + invoices + one payment */
  await sref('fee_heads', 'fh-tuition').set({ id: 'fh-tuition', schoolId: SCHOOL_ID, name: 'Tuition Fee', category: 'tuition', active: true }, { merge: true });
  await sref('fee_heads', 'fh-transport').set({ id: 'fh-transport', schoolId: SCHOOL_ID, name: 'Transport Fee', category: 'transport', active: true }, { merge: true });
  const items = [
    { headId: 'fh-tuition', headName: 'Tuition Fee', category: 'tuition', amount: 45000, frequency: 'annual' },
    { headId: 'fh-transport', headName: 'Transport Fee', category: 'transport', amount: 12000, frequency: 'annual' },
  ];
  await sref('fee_structures', 'fs-g6').set({ id: 'fs-g6', schoolId: SCHOOL_ID, name: 'Grade 6 — General', academicYear: AY, gradeId: 'grade-6', gradeName: 'Grade 6', studentCategory: 'general', items, total: 57000, active: true, createdAt: now }, { merge: true });
  for (let i = 0; i < 4; i++) {
    const st = STUDENTS[i];
    const paid = i === 0 ? 57000 : i === 1 ? 25000 : 0;
    await sref('fee_invoices', `inv-${st.id}`).set({
      id: `inv-${st.id}`, schoolId: SCHOOL_ID, studentId: st.id, studentName: st.fullName, admissionNo: st.admissionNo,
      gradeId: st.gradeId, gradeName: st.gradeName, sectionName: st.sectionName, academicYear: AY, structureId: 'fs-g6',
      title: `Annual Fees · ${AY}`, lines: items.map(({ headId, headName, category, amount }) => ({ headId, headName, category, amount })),
      grossAmount: 57000, concessionAmount: 0, netAmount: 57000, paidAmount: paid, dueAmount: 57000 - paid,
      status: paid >= 57000 ? 'paid' : paid > 0 ? 'partial' : 'unpaid', issuedDate: now - 30 * DAY, dueDate: now + 15 * DAY, createdAt: now,
    }, { merge: true });
  }
  await sref('finance_counters', 'receipt').set({ value: 1, schoolId: SCHOOL_ID }, { merge: true });
  await sref('fee_payments', 'pay-001').set({
    id: 'pay-001', schoolId: SCHOOL_ID, receiptNo: `RC-${AY.slice(0, 4)}-0001`, studentId: STUDENTS[0].id, studentName: STUDENTS[0].fullName,
    admissionNo: STUDENTS[0].admissionNo, invoiceId: `inv-${STUDENTS[0].id}`, invoiceTitle: `Annual Fees · ${AY}`,
    amount: 57000, method: 'upi', reference: 'UPI-DEMO-12345', paidAt: now - 20 * DAY, status: 'cleared',
    recordedByUid: uidByKey.accounts, recordedByName: 'Sunita Iyer', createdAt: now,
  }, { merge: true });
  await sref('finance_settings', 'main').set({ receiptPrefix: 'RC', upiId: `nexlidemo@upi`, payeeName: SCHOOL_NAME, bankName: 'HDFC Bank', accountNo: '50100123456789', ifsc: 'HDFC0001234' }, { merge: true });
  console.log('✓ Fees (structure, invoices, receipt, settings)');

  /* 9) Attendance for 6A today */
  const today = new Date().toISOString().slice(0, 10);
  const roster6a = STUDENTS.filter((s) => s.sectionId === 'sec-6a');
  const entries = {}; roster6a.forEach((s, i) => (entries[s.id] = i === 0 ? 'absent' : 'present'));
  await sref('attendance_days', `sec-6a_${today}`).set({
    id: `sec-6a_${today}`, schoolId: SCHOOL_ID, date: today, sectionId: 'sec-6a', sectionName: 'A', gradeName: 'Grade 6',
    entries, presentCount: roster6a.length - 1, absentCount: 1, total: roster6a.length,
    markedByUid: uidByKey.teacher, markedByName: 'Priya Nair', markedAt: now, createdAt: now,
  }, { merge: true });
  console.log('✓ Attendance (6A today)');

  /* 10) Communication, events, library, homework, assessment */
  await sref('circulars', 'circ-001').set({ id: 'circ-001', schoolId: SCHOOL_ID, title: 'Annual Day — Save the Date', body: 'Our Annual Day will be held on the last Saturday of this month. All parents are cordially invited.', category: 'event', audience: 'whole_school', pinned: true, publishedAt: now - 2 * DAY, publishedByUid: uidByKey.principal, publishedByName: 'Asha Menon', createdAt: now }, { merge: true });
  await sref('circulars', 'circ-002').set({ id: 'circ-002', schoolId: SCHOOL_ID, title: 'Fee Reminder — Term 1', body: 'Kindly clear pending Term 1 fees before the due date to avoid late charges.', category: 'fee', audience: 'parents', publishedAt: now - 5 * DAY, publishedByUid: uidByKey.accounts, publishedByName: 'Sunita Iyer', createdAt: now }, { merge: true });
  await sref('events', 'evt-001').set({ id: 'evt-001', schoolId: SCHOOL_ID, title: 'Inter-House Sports Meet', type: 'sports', description: 'Annual athletics meet across all four houses.', startDate: now + 10 * DAY, venue: 'Main Ground', audience: 'whole_school', organiser: 'Sports Dept', registrationRequired: true, capacity: 200, status: 'upcoming', createdAt: now }, { merge: true });
  await sref('library_books', 'book-001').set({ id: 'book-001', schoolId: SCHOOL_ID, title: 'The Jungle Book', author: 'Rudyard Kipling', category: 'Fiction', copiesTotal: 5, copiesAvailable: 4, shelf: 'A-12', createdAt: now }, { merge: true });
  await sref('homework', 'hw-001').set({ id: 'hw-001', schoolId: SCHOOL_ID, title: 'Algebra Worksheet 3', description: 'Complete exercises 1–10 from chapter 4.', subjectId: 'sub-math', subjectName: 'Mathematics', sectionId: 'sec-6a', sectionName: 'A', assignedDate: now - DAY, dueDate: now + 2 * DAY, maxMarks: 20, assignedByUid: uidByKey.subteacher, assignedByName: 'Arjun Rao', createdAt: now }, { merge: true });
  await sref('assessments', 'ass-001').set({ id: 'ass-001', schoolId: SCHOOL_ID, name: 'Unit Test 1 — Mathematics', type: 'unit_test', subjectId: 'sub-math', subjectName: 'Mathematics', sectionId: 'sec-6a', sectionName: 'A', maxMarks: 25, date: now - 7 * DAY, published: false, createdAt: now }, { merge: true });
  console.log('✓ Communication, event, library, homework, assessment');

  /* 11) Transport + hostel */
  await sref('vehicles', 'veh-001').set({ id: 'veh-001', schoolId: SCHOOL_ID, regNo: 'MH12AB1234', type: 'bus', model: 'Tata Starbus', capacity: 40, driverName: 'Ramesh', driverPhone: '+919812345678', status: 'active', fitnessExpiry: now + 120 * DAY, insuranceExpiry: now + 200 * DAY, createdAt: now }, { merge: true });
  await sref('transport_routes', 'route-001').set({ id: 'route-001', schoolId: SCHOOL_ID, name: 'Route 1 — City Centre', code: 'R1', vehicleId: 'veh-001', vehicleRegNo: 'MH12AB1234', driverName: 'Ramesh', stops: [{ name: 'Camp', time: '07:15', order: 1 }, { name: 'Station', time: '07:30', order: 2 }, { name: 'School', time: '07:50', order: 3 }], monthlyFee: 1200, status: 'active', createdAt: now }, { merge: true });
  await sref('hostel_blocks', 'blk-001').set({ id: 'blk-001', schoolId: SCHOOL_ID, name: 'North Wing', type: 'boys', wardenName: 'Lakshmi Reddy', floors: 3, capacity: 60, createdAt: now }, { merge: true });
  await sref('hostel_rooms', 'hr-101').set({ id: 'hr-101', schoolId: SCHOOL_ID, blockId: 'blk-001', blockName: 'North Wing', number: '101', floor: 1, capacity: 4, occupied: 1, createdAt: now }, { merge: true });
  await sref('hostel_allocations', 'alloc-001').set({ id: 'alloc-001', schoolId: SCHOOL_ID, studentId: STUDENTS[2].id, studentName: STUDENTS[2].fullName, blockId: 'blk-001', blockName: 'North Wing', roomId: 'hr-101', roomNumber: '101', bedNo: '1', fromDate: now - 100 * DAY, active: true, createdAt: now }, { merge: true });
  console.log('✓ Transport + hostel demo data');

  /* ----------------------------- summary ----------------------------- */
  console.log('\n────────────────────────────────────────────────────────');
  console.log('✅ DEMO SEED COMPLETE');
  console.log('────────────────────────────────────────────────────────');
  console.log(`School: ${SCHOOL_NAME}  (id: ${SCHOOL_ID})  · AY ${AY}`);
  console.log(`\nSUPER ADMIN  →  ${superEmail}  /  (your password)`);
  console.log('\nSTAFF / STUDENT LOGINS  (sign in at /login):');
  for (const [label, email, pass] of created) console.log(`  ${label.padEnd(26)}  ${email.padEnd(28)}  ${pass}`);
  console.log(`\nPARENT (sign in at /login/parent):  ${parentNote}`);
  console.log('  → Add this number under Firebase Auth → Phone → "Test phone numbers" with a code (e.g. 123456) to log in without SMS.');
  console.log('\nNext: if not done, `npm run deploy:rules` so the app can read/write Firestore with the access boundary.\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('\n✖ Seed failed:', e.message || e);
  console.error('  (Check ADC credentials and that Email/Password (+ Phone) auth is enabled.)\n');
  process.exit(1);
});
