/**
 * Demo helper: add an EMAIL/password Parent login (so the parent role can be
 * tested like the others, without phone-OTP). Linked to the same demo children as
 * the seeded phone parent. Idempotent (re-running just resets the password).
 *
 * Run from Web/:  GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/add-parent-login.mjs
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';
const EMAIL = process.env.PARENT_EMAIL || 'parent@nexlidemo.test';
const PASS = process.env.DEMO_PASS || 'NexliDemo@2026';
const CHILDREN = ['stu-001', 'stu-002'];

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

async function ensureEmailUser(email, password, name) {
  try {
    const u = await auth.createUser({ email, password, displayName: name, emailVerified: false });
    return u.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      const u = await auth.getUserByEmail(email);
      await auth.updateUser(u.uid, { password });
      return u.uid;
    }
    throw e;
  }
}

const uid = await ensureEmailUser(EMAIL, PASS, 'Demo Parent');
await db.doc(`schools/${SCHOOL_ID}/members/${uid}`).set(
  { uid, schoolId: SCHOOL_ID, roleId: 'parent', name: 'Demo Parent', email: EMAIL, status: 'active', childStudentIds: CHILDREN, createdAt: Date.now() },
  { merge: true },
);
await db.doc(`userIndex/${uid}`).set({ uid, schoolId: SCHOOL_ID, roleId: 'parent', status: 'active' }, { merge: true });
console.log(`✓ Parent email login ready: ${EMAIL} / ${PASS}  (children: ${CHILDREN.join(', ')})  uid=${uid}\n`);
process.exit(0);
