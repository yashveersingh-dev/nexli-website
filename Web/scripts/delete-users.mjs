/**
 * STEP 1 — remove all NON-super-admin user accounts + their identity records.
 * Dry-run by default (lists keep vs delete). Pass --apply to actually delete.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/delete-users.mjs          # dry run
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/delete-users.mjs --apply  # execute
 *
 * Keeps EVERY super admin (userIndex.isSuperAdmin === true OR roleId === 'super_admin'),
 * and ALWAYS keeps the emails in KEEP_EMAILS no matter what. Deletes only:
 *   - the Firebase Auth user
 *   - userIndex/{uid}
 *   - schools/<id>/members/<uid>   (the login/membership record)
 * It does NOT touch students, fees, classes, staff employment profiles, etc.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const APPLY = process.argv.includes('--apply');
const KEEP_EMAILS = ['yashveersr4@gmail.com']; // never delete, no matter what

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

// 1) Super-admin uids from userIndex.
const superUids = new Set();
const idx = await db.collection('userIndex').get();
idx.forEach((d) => { const x = d.data(); if (x.isSuperAdmin === true || x.roleId === 'super_admin') superUids.add(d.id); });

// 2) Walk every Auth user and classify.
const keep = [];
const del = [];
let pageToken;
do {
  const res = await auth.listUsers(1000, pageToken);
  for (const u of res.users) {
    const email = (u.email || '').toLowerCase();
    const isSuper = superUids.has(u.uid) || (email && KEEP_EMAILS.includes(email));
    (isSuper ? keep : del).push({ uid: u.uid, who: u.email || u.phoneNumber || '(no email)' });
  }
  pageToken = res.pageToken;
} while (pageToken);

// 3) SAFETY: hard-stop if any KEEP_EMAILS account would be deleted, or if nothing is kept.
const delEmails = new Set(del.map((d) => (d.who || '').toLowerCase()));
for (const e of KEEP_EMAILS) {
  if (delEmails.has(e)) { console.error(`✖ ABORT: protected account ${e} is in the delete list.`); process.exit(1); }
}
if (keep.length === 0) { console.error('✖ ABORT: no accounts classified as keep — refusing to wipe everyone.'); process.exit(1); }

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — keep ${keep.length}, delete ${del.length}\n`);
console.log('KEEP (super admins / protected):');
keep.forEach((k) => console.log(`  ✓ ${k.who}  ${k.uid}`));
console.log('\nDELETE (everyone else):');
del.forEach((d) => console.log(`  ✗ ${d.who}  ${d.uid}`));

if (!APPLY) { console.log('\n(dry run — nothing deleted. Re-run with --apply to execute.)\n'); process.exit(0); }

// 4) Apply: delete membership docs, userIndex, then the auth user.
const schoolRefs = await db.collection('schools').listDocuments();
let done = 0;
for (const d of del) {
  for (const s of schoolRefs) await s.collection('members').doc(d.uid).delete().catch(() => {});
  await db.collection('userIndex').doc(d.uid).delete().catch(() => {});
  await auth.deleteUser(d.uid).catch((e) => console.warn(`  ! auth delete failed for ${d.who}: ${e.code || e.message}`));
  done += 1;
}
console.log(`\n✅ Deleted ${done} users (auth + userIndex + members). Kept ${keep.length} super admin(s).\n`);
process.exit(0);
