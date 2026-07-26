#!/usr/bin/env node
/** Read-only verification of the demo seed: counts Auth users + key Firestore
 *  collections so you can confirm everything was created. Writes nothing. */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

async function countAuth() {
  let total = 0, email = 0, phone = 0, superAdmins = 0, pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) { total++; if (u.email) email++; if (u.phoneNumber) phone++; if (u.customClaims?.super_admin) superAdmins++; }
    pageToken = res.pageToken;
  } while (pageToken);
  return { total, email, phone };
}

async function size(path) {
  const snap = await db.collection(path).get();
  return snap.size;
}

const COLLECTIONS = [
  'members', 'students', 'staff', 'grades', 'sections', 'subjects', 'houses', 'rooms',
  'fee_heads', 'fee_structures', 'fee_invoices', 'fee_payments', 'attendance_days',
  'circulars', 'events', 'library_books', 'homework', 'assessments',
  'vehicles', 'transport_routes', 'hostel_blocks', 'hostel_rooms', 'hostel_allocations',
];

const a = await countAuth();
console.log('\n=== Firebase Auth ===');
console.log(`  users total: ${a.total}   (email: ${a.email}, phone: ${a.phone})`);

console.log('\n=== Firestore: platform ===');
const uidx = await size('userIndex');
console.log(`  userIndex docs: ${uidx}`);

const schoolDoc = await db.doc(`schools/${SCHOOL_ID}`).get();
console.log('\n=== Firestore: school ' + SCHOOL_ID + ' ===');
if (!schoolDoc.exists) { console.log('  ✖ school doc MISSING'); }
else {
  const s = schoolDoc.data();
  console.log(`  name: ${s.name}`);
  console.log(`  subscriptionStatus: ${s.subscriptionStatus}   plan: ${s.plan}   AY: ${s.currentAcademicYear}`);
  console.log(`  studentCount(stored): ${s.studentCount}   staffCount(stored): ${s.staffCount}   adminUid: ${s.adminUid ? 'set' : 'MISSING'}`);
}

console.log('\n=== Firestore: tenant subcollections ===');
for (const c of COLLECTIONS) {
  const n = await size(`schools/${SCHOOL_ID}/${c}`);
  console.log(`  ${c.padEnd(22)} ${n}`);
}

// Spot-check linkage
const studentsByStatus = await db.collection(`schools/${SCHOOL_ID}/students`).where('status', '==', 'active').get();
console.log(`\n  active students: ${studentsByStatus.size}`);
const parentMembers = await db.collection(`schools/${SCHOOL_ID}/members`).where('roleId', '==', 'parent').get();
console.log(`  parent members: ${parentMembers.size}` + (parentMembers.size ? ` (children: ${JSON.stringify(parentMembers.docs[0].data().childStudentIds)})` : ''));
const studentMembers = await db.collection(`schools/${SCHOOL_ID}/members`).where('roleId', '==', 'student').get();
console.log(`  student members: ${studentMembers.size}` + (studentMembers.size ? ` (studentId: ${studentMembers.docs[0].data().studentId})` : ''));

console.log('\n✅ Verification read complete.\n');
process.exit(0);
