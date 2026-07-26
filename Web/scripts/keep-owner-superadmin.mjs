/**
 * STEP 1 — keep ONLY the owner Super Admin (yashveersr4@gmail.com); remove every
 * other Super Admin (auth + userIndex + any membership). Dry-run by default.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/keep-owner-superadmin.mjs          # dry run
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/keep-owner-superadmin.mjs --apply  # execute
 *
 * A "Super Admin" = a userIndex doc with isSuperAdmin === true OR roleId === 'super_admin'.
 * KEEP_EMAIL is never touched, and the script hard-aborts if it would be deleted.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const APPLY = process.argv.includes('--apply');
const KEEP_EMAIL = 'yashveersr4@gmail.com';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

// 1) Super-admin uids from userIndex.
const superUids = new Set();
const idx = await db.collection('userIndex').get();
idx.forEach((d) => { const x = d.data(); if (x.isSuperAdmin === true || x.roleId === 'super_admin') superUids.add(d.id); });

// 2) The protected owner uid (by email).
let keepUid = null;
try { keepUid = (await auth.getUserByEmail(KEEP_EMAIL)).uid; } catch { /* may not exist */ }

const keep = [];
const del = [];
for (const uid of superUids) {
  const u = await auth.getUser(uid).catch(() => null);
  const email = (u?.email || '').toLowerCase();
  if (uid === keepUid || email === KEEP_EMAIL) keep.push({ uid, who: u?.email || uid });
  else del.push({ uid, who: u?.email || u?.phoneNumber || uid });
}

// 3) SAFETY.
if (del.some((d) => d.uid === keepUid)) { console.error(`✖ ABORT: owner uid is in the delete list.`); process.exit(1); }
if (del.some((d) => (d.who || '').toLowerCase() === KEEP_EMAIL)) { console.error(`✖ ABORT: ${KEEP_EMAIL} is in the delete list.`); process.exit(1); }
if (keep.length === 0) { console.error('✖ ABORT: owner Super Admin not found among super admins — refusing to delete all.'); process.exit(1); }

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — Super Admins: keep ${keep.length}, delete ${del.length}\n`);
keep.forEach((k) => console.log(`  ✓ KEEP  ${k.who}  ${k.uid}`));
del.forEach((d) => console.log(`  ✗ DELETE ${d.who}  ${d.uid}`));

if (!APPLY) { console.log('\n(dry run — nothing deleted. Re-run with --apply.)\n'); process.exit(0); }

const schoolRefs = await db.collection('schools').listDocuments();
for (const d of del) {
  for (const s of schoolRefs) await s.collection('members').doc(d.uid).delete().catch(() => {});
  await db.collection('userIndex').doc(d.uid).delete().catch(() => {});
  await auth.deleteUser(d.uid).catch((e) => console.warn(`  ! auth delete failed for ${d.who}: ${e.code || e.message}`));
}
console.log(`\n✅ Removed ${del.length} other Super Admin(s). Kept ${keep.length} (${KEEP_EMAIL}).\n`);
process.exit(0);
