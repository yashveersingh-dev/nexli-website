#!/usr/bin/env node
/**
 * NEXLI — one-time bootstrap (run by the project owner).
 *
 * Seeds the first platform Super Admin, the first school tenant, and that
 * school's Principal account, using the Firebase Admin SDK (which bypasses
 * security rules — solving the chicken-and-egg of "only a super admin can create
 * a super admin").
 *
 * PREREQUISITES (owner machine):
 *   1) firebase-admin installed:           npm i -D firebase-admin
 *   2) Application Default Credentials, one of:
 *        gcloud auth application-default login        (then it uses ADC)
 *      OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   3) Email/Password sign-in enabled in Firebase console (Authentication).
 *
 * USAGE (from Web/):
 *   node scripts/bootstrap.mjs \
 *     --super-email you@org.com   --super-pass 'StrongPass#1' \
 *     --school-name "Sunrise International School" \
 *     --principal-email principal@sunrise.edu --principal-pass 'StrongPass#2'
 *
 * Re-running is safe: existing accounts are reused (not duplicated).
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const env = process.env[`NEXLI_${name.toUpperCase().replace(/-/g, '_')}`];
  return env ?? fallback;
}

const superEmail = arg('super-email');
const superPass = arg('super-pass');
const schoolName = arg('school-name', 'Demo School');
const schoolId = arg('school-id', slug(schoolName));
const principalEmail = arg('principal-email');
const principalPass = arg('principal-pass');
const board = arg('board', 'CBSE');
const academicYear = arg('year', currentAcademicYear());

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
function currentAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth(); // 0-based; Indian AY starts ~April
  const start = m >= 3 ? y : y - 1;
  return `${start}-${(start + 1).toString().slice(-2)}`;
}

if (!superEmail || !superPass) {
  console.error('\n✖ Missing --super-email / --super-pass. See the header of this file for usage.\n');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

/** Create an auth user, or reuse the existing one with that email. */
async function ensureUser(email, password, displayName) {
  try {
    const u = await auth.createUser({ email, password, displayName, emailVerified: false });
    console.log(`  ✓ created auth user  ${email}  (${u.uid})`);
    return u.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      const u = await auth.getUserByEmail(email);
      console.log(`  • reusing auth user  ${email}  (${u.uid})`);
      return u.uid;
    }
    throw e;
  }
}

async function main() {
  console.log(`\nNEXLI bootstrap → project "${PROJECT_ID}"\n`);

  // 1) Super Admin
  console.log('Super Admin');
  const superUid = await ensureUser(superEmail, superPass, 'Super Admin');
  await db.doc(`userIndex/${superUid}`).set(
    { uid: superUid, roleId: 'super_admin', isSuperAdmin: true, status: 'active' },
    { merge: true },
  );
  console.log('  ✓ userIndex set (super_admin)\n');

  // 2) First school tenant
  console.log(`School  "${schoolName}"  (id: ${schoolId})`);
  await db.doc(`schools/${schoolId}`).set(
    {
      name: schoolName,
      board,
      type: 'day',
      subscriptionStatus: 'active',
      currentAcademicYear: academicYear,
      onboardingPct: 10,
      createdAt: Date.now(),
      serverCreatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log('  ✓ school document created\n');

  // 3) Principal (school admin)
  if (principalEmail && principalPass) {
    console.log('Principal');
    const pUid = await ensureUser(principalEmail, principalPass, 'Principal');
    const member = {
      uid: pUid,
      schoolId,
      roleId: 'principal',
      name: 'Principal',
      email: principalEmail,
      status: 'active',
      createdAt: Date.now(),
      createdBy: superUid,
      serverCreatedAt: FieldValue.serverTimestamp(),
    };
    await db.doc(`schools/${schoolId}/members/${pUid}`).set(member, { merge: true });
    await db.doc(`userIndex/${pUid}`).set(
      { uid: pUid, schoolId, roleId: 'principal', status: 'active' },
      { merge: true },
    );
    console.log('  ✓ member + userIndex set (principal)\n');
  } else {
    console.log('Principal — skipped (no --principal-email/--principal-pass)\n');
  }

  console.log('✅ Bootstrap complete.\n');
  console.log('Next: deploy security rules →  firebase deploy --only firestore:rules,firestore:indexes');
  console.log('Then sign in at /login with the Super Admin or Principal credentials.\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('\n✖ Bootstrap failed:', e.message || e);
  console.error('  (Check ADC credentials and that Email/Password auth is enabled.)\n');
  process.exit(1);
});
