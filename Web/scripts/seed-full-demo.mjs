/**
 * NEXLI — FULL DEMO SEED. Fills the demo school (nexli-demo) with a realistic,
 * complete roster: 1 extra test Super Admin, 300 staff (every role), 15 grades ×
 * 3 sections = 45 classes, 300 students, 300 linked parents, student leadership
 * positions, and ~30 alumni. Then writes ../NEXLI_TEST_PLAN.md.
 *
 * Idempotent (auth users reused by email; Firestore docs use fixed ids), resilient
 * (per-account retry, continues on error). Run from Web/:
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/seed-full-demo.mjs
 *
 * Never touches the real owner Super Admin (yashveersr4@gmail.com).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';
const SCHOOL_NAME = 'Nexli Demo International School';
const PASSWORD = process.env.DEMO_PASS || 'NexliDemo@2026';
const DOMAIN = 'nexlidemo.test';
const OWNER_EMAIL = 'yashveersr4@gmail.com';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const sref = (sub, id) => db.doc(`schools/${SCHOOL_ID}/${sub}/${id}`);
const now = Date.now();
const DAY = 86400000;
const AY = (() => { const y = new Date().getFullYear(); const s = new Date().getMonth() >= 3 ? y : y - 1; return `${s}-${(s + 1).toString().slice(-2)}`; })();
const AY_START = AY.slice(0, 4);

/* ----------------------------- name pools ----------------------------- */
const MALE = ['Aarav','Vivaan','Aditya','Arjun','Reyansh','Krishna','Ishaan','Shaurya','Atharv','Aryan','Kabir','Ayaan','Dhruv','Rudra','Veer','Aarush','Kayaan','Devansh','Rohan','Samar','Laksh','Yuvraj','Advik','Karthik','Nikhil','Rishabh','Siddharth','Aman','Harsh','Kunal','Manav','Naman','Parth','Raghav','Sahil','Tanish','Uday','Varun','Yash','Ansh','Daksh','Gaurav','Hardik','Nirvaan','Ranbir'];
const FEMALE = ['Aadhya','Ananya','Diya','Saanvi','Ishita','Myra','Aanya','Pari','Anika','Navya','Kiara','Aarohi','Riya','Sara','Tara','Zara','Avni','Anvi','Siya','Inaya','Meher','Nitya','Prisha','Aaradhya','Mahira','Kavya','Shanaya','Trisha','Vanya','Ira','Naira','Mishka','Aleena','Bhavya','Charvi','Drishti','Esha','Gauri','Jhanvi','Khushi','Lavanya','Nandini','Reet','Sia','Tanvi'];
const LAST = ['Sharma','Verma','Gupta','Iyer','Nair','Reddy','Rao','Patel','Singh','Khan','Mehta','Joshi','Das','Kulkarni','Banerjee','Chopra','Pillai','Bose','Shah','Menon','Agarwal','Bhat','Chauhan','Desai','Ghosh','Jain','Kapoor','Malhotra','Nanda','Pandey','Rana','Sinha','Trivedi','Yadav','Mishra','Saxena','Naidu','Bajaj','Chawla','Dube'];

let emailSeq = 0;
let phoneSeq = 0;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
function makeEmail(first, last) { emailSeq += 1; return `${slug(first)}.${slug(last)}${emailSeq}@${DOMAIN}`; }
function makePhone() { phoneSeq += 1; return `+9198${String(70000000 + phoneSeq).padStart(8, '0')}`; }
function pick(arr, i) { return arr[i % arr.length]; }
function nameFor(gender, i) {
  const first = gender === 'female' ? pick(FEMALE, i) : pick(MALE, i * 3 + 1);
  const last = pick(LAST, i * 7 + 3);
  return { first, last, full: `${first} ${last}` };
}

/* ----------------------------- role catalogue ----------------------------- */
const ONE_EACH = [
  ['Chairman','chairman'],['Trustee','trustee'],['Director / CEO','director'],['Regional Director','regional_director'],
  ['Cluster Director','cluster_director'],['Head of School (HoS)','head_of_school'],['Principal','principal'],
  ['Headmaster','headmaster'],['Headmistress','headmistress'],['Academic Director','academic_director'],
  ['Vice Principal (Academic)','vp_academic'],['Vice Principal (Admin)','vp_admin'],['Administrator','administrator'],
  ['School Manager','school_manager'],['Administrative Manager','admin_manager'],['Administrative Officer','admin_officer'],
  ['Dean of Students','dean_of_students'],['Registrar','registrar'],
];
const THREE_EACH = [
  ['Academic Coordinator (Senior)','academic_coordinator'],['Academic Coordinator (Junior)','academic_coordinator_junior'],
  ['Academic Coordinator (Associate / Assistant)','academic_coordinator_associate'],['Head of Department','hod'],
  ['Exam Controller','exam_controller'],['Finance Manager','finance_manager'],['Bursar','bursar'],['Chief Accountant','chief_accountant'],
  ['HR Director','hr_director'],['HR Manager','hr_manager'],['HR Executive','hr_executive'],['HR Assistant','hr_assistant'],
  ['Payroll Specialist','payroll_specialist'],['Recruitment Coordinator','recruitment_coordinator'],['IT Manager','it_manager'],
  ['IT Administrator','it_admin'],['Transport Manager','transport_manager'],['Estate / Facility Manager','estate_manager'],
  ['Facilities Manager','facilities_manager'],['Admissions Officer','admissions_officer'],['Public Relations Executive','pr_executive'],
  ['Senior Accountant','accountant_senior'],['School Accountant','school_accountant'],['Junior Accountant','accountant_junior'],
  ['Accounts Clerk','accounts_clerk'],['Accounts Assistant','accounts_assistant'],['Billing Executive','billing_executive'],
  ['Cashier','cashier'],['Hostel Accountant','hostel_accountant'],['Data Protection Officer','dpo'],['Consent Officer','consent_officer'],
  ['Designated Child Protection Officer (DCPO)','cpo'],['Alternate Child Protection Officer','alternate_cpo'],
  ['School Counselor','counselor'],['Guidance Counselor','guidance_counselor'],['Wellness Teacher','wellness_teacher'],
  ['POSH / POCSO Committee Member','posh_committee'],['Internal Complaints Committee (ICC) Member','icc_member'],
  ['School Board Representative','board_representative'],['School Doctor','doctor'],['Nurse Practitioner','nurse_practitioner'],
  ['Regular School Nurse','nurse'],['Residential School Nurse','nurse_residential'],['Special Education School Nurse','nurse_sped'],
  ['Pediatric School Nurse','nurse_pediatric'],['Community Health Nurse','nurse_community'],['Visiting School Nurse','nurse_visiting'],
  ['Class Teacher','class_teacher'],['Subject Teacher','subject_teacher'],['Substitute Teacher','substitute_teacher'],
  ['Special Educator','special_educator'],['Sports Teacher / PET','sports_teacher'],['Arts / Music Teacher','arts_teacher'],
  ['Activity Coordinator','activity_coordinator'],['Club Coordinator','club_coordinator'],['Lab Assistant','lab_assistant'],
  ['Head Librarian','librarian'],['Senior Secondary Librarian','librarian_senior_secondary'],['High School Librarian','librarian_high'],
  ['Middle School Librarian','librarian_middle'],['Primary School Librarian','librarian_primary'],['Teacher Librarian','teacher_librarian'],
  ['Digital Media Librarian','digital_media_librarian'],['Assistant Librarian','assistant_librarian'],['Library Attendant','library_attendant'],
  ['Chief Warden','chief_warden'],['Senior Warden','senior_warden'],['Hostel Superintendent','hostel_superintendent'],['Provost','provost'],
  ['Residential Warden','residential_warden'],['Day Boarding Warden','day_warden'],['Assistant Warden','assistant_warden'],
  ['Hostel Warden','hostel_warden'],['Night Warden','night_warden'],['Matron','matron'],['Housemaster','house_master'],
  ['Housemistress','housemistress'],['Mess Manager','mess_manager'],['Caretaker','caretaker'],['Hostel Committee Member','hostel_committee'],
  ['Security Supervisor','security_supervisor'],['Security Officer','security_officer'],['Security Guard','security_guard'],
  ['CCTV Administrator','cctv_admin'],['Visitor Management Officer','visitor_officer'],['Housekeeping Staff','housekeeping'],
  ['Bus Conductor','bus_conductor'],['Bus Driver','bus_driver'],['Canteen Manager','canteen_manager'],['Canteen Staff','canteen_staff'],
  ['Front Desk','front_desk'],['Main Receptionist','main_receptionist'],['Admissions Receptionist','admissions_receptionist'],
  ['Office Assistant','office_assistant'],
];
const FEMALE_ROLES = new Set(['headmistress', 'housemistress', 'matron']);
const MALE_ROLES = new Set(['headmaster', 'house_master']);
function deptFor(roleId) {
  const r = roleId;
  if (/hr_|payroll|recruit/.test(r)) return 'Human Resources';
  if (/account|fees|bursar|finance|billing|cashier/.test(r)) return 'Finance';
  if (/it_|cctv/.test(r)) return 'IT';
  if (/librar/.test(r)) return 'Library';
  if (/nurse|doctor/.test(r)) return 'Medical';
  if (/warden|hostel|matron|provost|house_master|housemistress|caretaker|mess/.test(r)) return 'Hostel';
  if (/security|guard/.test(r)) return 'Security';
  if (/transport|bus/.test(r)) return 'Transport';
  if (/canteen/.test(r)) return 'Canteen';
  if (/counselor|counsel|wellness|cpo|posh|icc|dpo|consent/.test(r)) return 'Student Welfare';
  if (/teacher|coordinator|hod|exam|educator|sports|arts|lab|activity|club/.test(r)) return 'Academics';
  return 'Administration';
}

/* ----------------------------- academic structure ----------------------------- */
const GRADE_DEFS = [
  ['Nursery', 'nursery', 3], ['LKG', 'lkg', 4], ['UKG', 'ukg', 5],
  ['Class 1', '1', 6], ['Class 2', '2', 7], ['Class 3', '3', 8], ['Class 4', '4', 9], ['Class 5', '5', 10],
  ['Class 6', '6', 11], ['Class 7', '7', 12], ['Class 8', '8', 13], ['Class 9', '9', 14], ['Class 10', '10', 15],
  ['Class 11', '11', 16], ['Class 12', '12', 17],
];
const HOUSES = [
  { id: 'house-red', name: 'Red', color: '#EF4444' },
  { id: 'house-blue', name: 'Blue', color: '#3B82F6' },
  { id: 'house-green', name: 'Green', color: '#22C55E' },
  { id: 'house-yellow', name: 'Yellow', color: '#EAB308' },
  { id: 'house-orange', name: 'Orange', color: '#F97316' },
];
const SUBJECTS = [
  ['sub-eng', 'English'], ['sub-math', 'Mathematics'], ['sub-sci', 'Science'], ['sub-sst', 'Social Studies'],
  ['sub-hin', 'Hindi'], ['sub-cs', 'Computer Science'], ['sub-evs', 'EVS'], ['sub-art', 'Art & Craft'],
];

/* ----------------------------- concurrency helper ----------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}
let created = 0;
let reused = 0;
let failed = 0;
async function ensureUser(email, displayName) {
  for (let attempt = 0; ; attempt++) {
    try {
      const u = await auth.createUser({ email, password: PASSWORD, displayName, emailVerified: false });
      created += 1;
      return u.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-exists') { reused += 1; return (await auth.getUserByEmail(email)).uid; }
      if ((e.code === 'auth/too-many-requests' || e.code === 'auth/internal-error') && attempt < 6) { await sleep(1500 * (attempt + 1)); continue; }
      failed += 1;
      console.warn(`  ! auth failed ${email}: ${e.code || e.message}`);
      return null;
    }
  }
}

/* ----------------------------- reset ----------------------------- */
async function clearCollection(sub) {
  const col = db.collection(`schools/${SCHOOL_ID}/${sub}`);
  while (true) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
async function reset() {
  const cols = [
    'students', 'grades', 'sections', 'houses', 'staff', 'members', 'subjects',
    'fee_invoices', 'fee_payments', 'fee_structures', 'fee_heads', 'finance_counters',
    'attendance_days', 'staff_attendance', 'hpc_cards', 'medical', 'immunization',
    'counseling', 'pocso', 'grievances', 'hostel_blocks', 'hostel_rooms', 'hostel_allocations',
    'hostel_rollcall', 'transport_routes', 'vehicles', 'library_books', 'book_circulation',
    'circulars', 'events', 'delegations', 'expenses', 'admissions', 'assessments',
    'assessment_results', 'exams', 'messages', 'conversations', 'homework', 'rooms',
  ];
  for (const c of cols) await clearCollection(c);
  // Remove non-super-admin userIndex docs (school members) — preserves the owner + any super admin.
  const idx = await db.collection('userIndex').get();
  const batch = db.batch();
  let n = 0;
  idx.forEach((d) => {
    const x = d.data();
    if (x.isSuperAdmin === true || x.roleId === 'super_admin') return;
    batch.delete(d.ref); n += 1;
  });
  if (n) await batch.commit();
  console.log(`✓ reset: cleared roster collections + ${n} stale userIndex docs`);
}

/* ----------------------------- build data ----------------------------- */
const manifest = { superAdmins: [], staff: [], students: [], parents: [], alumni: [] };

function staffList() {
  const list = [];
  let gi = 0;
  const add = (label, roleId, n) => {
    for (let k = 0; k < n; k++) {
      const gender = FEMALE_ROLES.has(roleId) ? 'female' : MALE_ROLES.has(roleId) ? 'male' : (gi % 2 ? 'female' : 'male');
      const nm = nameFor(gender, gi * 5 + k + 7);
      gi += 1;
      list.push({ label, roleId, gender, name: nm.full, first: nm.first, last: nm.last, suffix: n > 1 ? ` ${k + 1}` : '' });
    }
  };
  for (const [label, roleId] of ONE_EACH) add(label, roleId, 1);
  for (const [label, roleId] of THREE_EACH) add(label, roleId, 3);
  return list;
}

function buildStudents() {
  const grades = GRADE_DEFS.map(([name, short, ageLo], order) => ({ id: `grade-${short}`, name, short, ageLo, order }));
  const sections = [];
  for (const g of grades) for (const s of ['A', 'B', 'C']) sections.push({ id: `sec-${g.short}-${s.toLowerCase()}`, name: s, grade: g });
  // counts: first 30 sections → 7, last 15 → 6  (30*7 + 15*6 = 300)
  const students = [];
  let n = 0;
  sections.forEach((sec, si) => {
    const count = si < 30 ? 7 : 6;
    for (let r = 0; r < count; r++) {
      n += 1;
      const gender = (r % 2 === 0) ? 'male' : 'female';
      const nm = nameFor(gender, n * 2 + si);
      const ageLo = sec.grade.ageLo;
      const ageYears = ageLo + (r % 2 === 0 ? 0.4 : 0.7);
      const id = `stu-${String(n).padStart(4, '0')}`;
      const house = HOUSES[n % HOUSES.length].name;
      // guardian (becomes the linked parent)
      const pgender = gender === 'male' ? (n % 2 ? 'male' : 'female') : (n % 2 ? 'female' : 'male');
      const pfirst = pgender === 'female' ? pick(FEMALE, n * 4 + 11) : pick(MALE, n * 6 + 5);
      const guardian = { name: `${pfirst} ${nm.last}`, relation: pgender === 'female' ? 'mother' : 'father', gender: pgender };
      students.push({
        id, n, rollNo: String(r + 1), gender, first: nm.first, last: nm.last, full: nm.full,
        gradeId: sec.grade.id, gradeName: sec.grade.name, sectionId: sec.id, sectionName: sec.name,
        house, dob: now - Math.round(ageYears * 365.25 * DAY), admissionNo: `ADM-${AY_START}-${String(n).padStart(4, '0')}`,
        tags: [], guardian,
      });
    }
  });
  return { grades, sections, students };
}

function assignPositions(students) {
  const used = new Set();
  const bySection = new Map();
  const byHouse = new Map();
  for (const s of students) {
    (bySection.get(s.sectionId) ?? bySection.set(s.sectionId, []).get(s.sectionId)).push(s);
    (byHouse.get(s.house) ?? byHouse.set(s.house, []).get(s.house)).push(s);
  }
  const firstFree = (arr, gender) => arr.find((s) => s.gender === gender && !used.has(s.id));
  const tag = (s, t) => { if (s) { s.tags.push(t); used.add(s.id); } };

  // Class 12 sections → head students; Class 11 → sports captains.
  const c12 = students.filter((s) => s.gradeId === 'grade-12');
  const c11 = students.filter((s) => s.gradeId === 'grade-11');
  tag(c12.find((s) => s.gender === 'male'), 'Head Boy');
  tag(c12.find((s) => s.gender === 'female'), 'Head Girl');
  tag(c11.find((s) => s.gender === 'male' && !used.has(s.id)), 'Sports Captain');
  tag(c11.find((s) => s.gender === 'female' && !used.has(s.id)), 'Sports Captain');

  // Houses: 1 boy + 1 girl captain, 1 boy + 1 girl vice per house (5×4 = 20).
  for (const [, arr] of byHouse) {
    tag(firstFree(arr, 'male'), 'House Captain');
    tag(firstFree(arr, 'female'), 'House Captain');
    tag(firstFree(arr, 'male'), 'Vice House Captain');
    tag(firstFree(arr, 'female'), 'Vice House Captain');
  }

  // 2 prefects per class (1 boy, 1 girl) → up to 90.
  for (const [, arr] of bySection) {
    const b = arr.find((s) => s.gender === 'male' && !used.has(s.id)) ?? arr.find((s) => s.gender === 'male');
    const g = arr.find((s) => s.gender === 'female' && !used.has(s.id)) ?? arr.find((s) => s.gender === 'female');
    tag(b, 'Prefect');
    tag(g, 'Prefect');
  }
}

/* ----------------------------- main ----------------------------- */
async function main() {
  console.log(`\nNEXLI full demo seed → ${SCHOOL_ID} (AY ${AY})\n`);
  await reset();

  // School + academic structure
  await db.doc(`schools/${SCHOOL_ID}`).set({
    name: SCHOOL_NAME, board: 'CBSE', type: 'day_cum_boarding', sizeTier: 'medium', city: 'Pune', state: 'Maharashtra',
    pincode: '411001', phone: '+912012345678', email: `office@${DOMAIN}`, subscriptionStatus: 'active', plan: 'Growth',
    billingCycle: 'annual', renewalDate: now + 300 * DAY, currentAcademicYear: AY, onboardingPct: 100,
    studentCount: 300, staffCount: 300, lastActiveAt: now, serverCreatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const { grades, sections, students } = buildStudents();
  assignPositions(students);
  for (const g of grades) await sref('grades', g.id).set({ id: g.id, schoolId: SCHOOL_ID, name: g.name, order: g.order }, { merge: true });
  for (const s of sections) await sref('sections', s.id).set({ id: s.id, schoolId: SCHOOL_ID, gradeId: s.grade.id, name: s.name }, { merge: true });
  for (const h of HOUSES) await sref('houses', h.id).set({ id: h.id, schoolId: SCHOOL_ID, name: h.name, color: h.color, points: 0 }, { merge: true });
  for (const [id, name] of SUBJECTS) await sref('subjects', id).set({ id, schoolId: SCHOOL_ID, name, isScholastic: true }, { merge: true });
  await sref('finance_settings', 'main').set({ receiptPrefix: 'RC', upiId: `nexlidemo@upi`, payeeName: SCHOOL_NAME, bankName: 'HDFC Bank', accountNo: '50100123456789', ifsc: 'HDFC0001234' }, { merge: true });
  console.log(`✓ structure: ${grades.length} grades, ${sections.length} sections, ${HOUSES.length} houses`);

  // ---- jobs ----
  const jobs = [];

  // Test Super Admin
  jobs.push(async () => {
    const email = `testadmin@${DOMAIN}`;
    const phone = makePhone();
    const uid = await ensureUser(email, 'Test Super Admin');
    if (uid) await db.doc(`userIndex/${uid}`).set({ uid, roleId: 'super_admin', isSuperAdmin: true, status: 'active' }, { merge: true });
    manifest.superAdmins.push({ role: 'Super Admin (test)', name: 'Test Super Admin', email, phone });
  });

  // Staff
  const staff = staffList();
  staff.forEach((s, i) => {
    const email = makeEmail(s.first, s.last);
    const phone = makePhone();
    jobs.push(async () => {
      const uid = await ensureUser(email, s.name);
      manifest.staff.push({ role: `${s.label}${s.suffix}`, roleId: s.roleId, name: s.name, email, phone });
      if (!uid) return;
      await sref('members', uid).set({ uid, schoolId: SCHOOL_ID, roleId: s.roleId, name: s.name, email, phone, status: 'active', createdAt: now }, { merge: true });
      await db.doc(`userIndex/${uid}`).set({ uid, schoolId: SCHOOL_ID, roleId: s.roleId, status: 'active' }, { merge: true });
      await sref('staff', uid).set({
        id: uid, schoolId: SCHOOL_ID, uid, employeeId: `EMP${String(i + 1).padStart(3, '0')}`, name: s.name, roleId: s.roleId,
        designation: s.label, department: deptFor(s.roleId), status: 'active', gender: s.gender, email, phone,
        joiningDate: now - (200 + (i % 800)) * DAY, createdAt: now,
      }, { merge: true });
    });
  });

  // Students (record + login) + Parents (login, linked)
  for (const st of students) {
    const sEmail = makeEmail(st.first, st.last);
    const sPhone = makePhone();
    const pEmail = makeEmail(st.guardian.name.split(' ')[0], st.last);
    const pPhone = makePhone();
    st.guardian.phone = pPhone;
    st.guardian.email = pEmail;
    // student record (no auth needed)
    jobs.push(async () => {
      await sref('students', st.id).set({
        id: st.id, schoolId: SCHOOL_ID, admissionNo: st.admissionNo, rollNo: st.rollNo, firstName: st.first, lastName: st.last,
        fullName: st.full, gender: st.gender, gradeId: st.gradeId, gradeName: st.gradeName, sectionId: st.sectionId,
        sectionName: st.sectionName, house: st.house, academicYear: AY, status: 'active', admissionType: 'regular',
        category: 'general', dob: st.dob, admissionDate: now - (120 + (st.n % 200)) * DAY, tags: st.tags,
        guardians: [{ name: st.guardian.name, relation: st.guardian.relation, phone: pPhone, email: pEmail, isPrimary: true }],
        createdAt: now,
      }, { merge: true });
    });
    // student login
    jobs.push(async () => {
      const uid = await ensureUser(sEmail, st.full);
      manifest.students.push({ role: 'Student', name: st.full, klass: `${st.gradeName} ${st.sectionName}`, email: sEmail, phone: sPhone, positions: st.tags.join(', ') });
      if (!uid) return;
      await sref('members', uid).set({ uid, schoolId: SCHOOL_ID, roleId: 'student', name: st.full, email: sEmail, phone: sPhone, status: 'active', studentId: st.id, createdAt: now }, { merge: true });
      await db.doc(`userIndex/${uid}`).set({ uid, schoolId: SCHOOL_ID, roleId: 'student', status: 'active' }, { merge: true });
    });
    // parent login (linked to the student)
    jobs.push(async () => {
      const uid = await ensureUser(pEmail, st.guardian.name);
      manifest.parents.push({ role: 'Parent / Guardian', name: st.guardian.name, child: st.full, childClass: `${st.gradeName} ${st.sectionName}`, email: pEmail, phone: pPhone });
      if (!uid) return;
      await sref('members', uid).set({ uid, schoolId: SCHOOL_ID, roleId: 'parent', name: st.guardian.name, email: pEmail, phone: pPhone, status: 'active', childStudentIds: [st.id], createdAt: now }, { merge: true });
      await db.doc(`userIndex/${uid}`).set({ uid, schoolId: SCHOOL_ID, roleId: 'parent', status: 'active' }, { merge: true });
    });
  }

  // Alumni (30)
  const ALUMNI_COUNT = 30;
  for (let i = 0; i < ALUMNI_COUNT; i++) {
    const gender = i % 2 ? 'female' : 'male';
    const nm = nameFor(gender, i * 9 + 13);
    const email = makeEmail(nm.first, nm.last);
    const phone = makePhone();
    const gradYear = 2024 - (i % 7);
    jobs.push(async () => {
      const uid = await ensureUser(email, nm.full);
      manifest.alumni.push({ role: 'Alumni', name: nm.full, gradYear, email, phone });
      if (!uid) return;
      await sref('members', uid).set({ uid, schoolId: SCHOOL_ID, roleId: 'alumni', name: nm.full, email, phone, status: 'active', graduationYear: gradYear, createdAt: now }, { merge: true });
      await db.doc(`userIndex/${uid}`).set({ uid, schoolId: SCHOOL_ID, roleId: 'alumni', status: 'active' }, { merge: true });
    });
  }

  console.log(`Running ${jobs.length} jobs (auth + Firestore)…`);
  await mapLimit(jobs, 12, (job) => job());
  console.log(`✓ accounts: created ${created}, reused ${reused}, failed ${failed}`);

  writeTestPlan();
  console.log('\n✅ DONE.');
  console.log(`   Staff: ${manifest.staff.length} · Students: ${manifest.students.length} · Parents: ${manifest.parents.length} · Alumni: ${manifest.alumni.length} · Test Super Admin: ${manifest.superAdmins.length}`);
  console.log(`   Shared password: ${PASSWORD}`);
  console.log('   Test plan: ../NEXLI_TEST_PLAN.md\n');
  process.exit(0);
}

/* ----------------------------- test plan ----------------------------- */
function writeTestPlan() {
  const L = [];
  const p = (s = '') => L.push(s);
  p('# NEXLI — Demo Test Plan');
  p('');
  p(`_Generated ${new Date().toISOString().slice(0, 10)} for the demo school **${SCHOOL_NAME}** (tenant \`${SCHOOL_ID}\`)._`);
  p('');
  p('## 1. Shared password & how to start the app');
  p('');
  p(`- **Shared password for EVERY demo account below:** \`${PASSWORD}\``);
  p('- Your real owner Super Admin **yashveersr4@gmail.com** is untouched — keep using it as before.');
  p('- Start the app: open a terminal in the `Web` folder and run `npm run dev`, then open the printed URL (usually **http://localhost:5173/**).');
  p('- Sign in at the login screen with any email + the shared password above.');
  p('');
  p('## 2. Testing on a phone-size screen (Galaxy S20)');
  p('');
  p('1. Open the app in **Google Chrome**.');
  p('2. Press **F12** (opens DevTools).');
  p('3. Click the **device toolbar** icon (the little phone/tablet icon, top-left of DevTools) — or press **Ctrl+Shift+M**.');
  p('4. In the device dropdown at the top of the page, choose **"Galaxy S20"**.');
  p('5. Reload the page. You now see the mobile layout (bottom tab bar + drawer). Test the same steps as on desktop.');
  p('');
  p('## 3. Every account created');
  p('');
  p(`> All passwords are the shared password above (\`${PASSWORD}\`). Phone numbers are demo contact numbers.`);
  p('');
  p('### Test Super Admin');
  for (const a of manifest.superAdmins) p(`- **${a.role}** — ${a.name} · ${a.email} · ${a.phone}`);
  p('');
  p(`### Staff (${manifest.staff.length})`);
  for (const a of manifest.staff) p(`- **${a.role}** — ${a.name} · ${a.email} · ${a.phone}`);
  p('');
  p(`### Students (${manifest.students.length})`);
  for (const a of manifest.students) p(`- ${a.name} · ${a.klass}${a.positions ? ` · _${a.positions}_` : ''} · ${a.email} · ${a.phone}`);
  p('');
  p(`### Parents / Guardians (${manifest.parents.length})`);
  for (const a of manifest.parents) p(`- ${a.name} (parent of ${a.child}, ${a.childClass}) · ${a.email} · ${a.phone}`);
  p('');
  p(`### Alumni (${manifest.alumni.length})`);
  for (const a of manifest.alumni) p(`- ${a.name} (Class of ${a.gradYear}) · ${a.email} · ${a.phone}`);
  p('');
  p('## 4. Step-by-step testing order');
  p('');
  p('**Step 0 — Setup.** Start the app (section 1). Have this file open to copy emails. Optionally turn on the Galaxy S20 mobile view (section 2).');
  p('');
  p('**Step 1 — Test Super Admin.** Sign in as `testadmin@nexlidemo.test`. Check: the platform console loads (Schools, Subscriptions, Plans, Users & Roles, Roles & Permissions, Analytics). Open **Schools** → the demo school; open **Roles & Permissions** and confirm every role group is listed. Sign out.');
  p('');
  p('**Step 2 — Staff, role by role.** For each staff account in section 3, sign in and confirm the **menu and screens match the role**:');
  p('- Leadership (Principal / Head of School / VPs / Directors): should see most/all modules + dashboards.');
  p('- Academic (Coordinators / HOD / Exam Controller / Teachers): Students, Attendance, Academics, Assessments, Homework, Exams, Progress Cards.');
  p('- Finance (Finance Manager / Accountants / Cashier / Billing): Fees & Finance, Expense; should NOT see HR/Payroll unless allowed.');
  p('- HR / Management (HR roles / Payroll / IT / Managers): Human Resources, Payroll, Settings/Users (IT), as applicable.');
  p('- Welfare/Health (Counselor / DCPO / Nurses / Doctor): Medical / Child-protection / Counselling — confirm these are visible ONLY to these roles.');
  p('- Hostel / Library / Transport / Security / Canteen / Office: each should land on its own module.');
  p('- For each: open the Students list → a student → check the profile tabs load. Try one create/save in the role’s main module to confirm saving works. Sign out.');
  p('');
  p('**Step 3 — Students.** Sign in as a few students from different grades (e.g. one from Class 12, one from Class 1, one Nursery). Check: their dashboard, attendance, fees, timetable, progress card. A student should only see their own data.');
  p('');
  p('**Step 4 — Parents.** Sign in as a few parents. Check: they see ONLY their own child, with attendance, fees and notices for that child.');
  p('');
  p('**Step 5 — Positions.** Confirm the leadership titles show on the right students (Head Boy/Girl, House & Vice Captains, Sports Captains, class Prefects) — open those students’ profiles and check the **Tags** + **House**.');
  p('');
  p('## 5. Free-tier (Spark) daily limits — important');
  p('');
  p('On the free Firebase (Spark) plan there are **daily limits** on reads/writes and auth operations. Logging into and clicking through ~900 accounts in a single day can hit those limits, after which the app may show errors or fail to load data. If that happens:');
  p('- It is almost always the daily quota, **not** a bug.');
  p('- **Test in batches across several days** (e.g. staff one day, students another, parents another).');
  p('- Quotas reset daily (around midnight Pacific time). Try again the next day.');
  p('');
  writeFileSync(new URL('../../NEXLI_TEST_PLAN.md', import.meta.url), L.join('\n'), 'utf8');
}

main().catch((e) => { console.error('\n✖ seed failed:', e.stack || e.message || e, '\n'); process.exit(1); });
