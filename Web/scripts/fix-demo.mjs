/**
 * One-off demo data cleanup + normalisation. Idempotent — safe to re-run.
 * Run from Web/:
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/fix-demo.mjs
 *
 * What it does (demo/fake data only):
 *  - Replaces keyboard-mash / "QA test" junk with realistic demo content
 *    (a circular, an event, two expenses, a hostel block, two delegations,
 *     a medical complaint, an admission applicant, a staff name, a test message).
 *  - Makes the fee payee name match the school name.
 *  - Marks the demo student present so parent/student attendance reads sensibly.
 *  - Creates a separate demo Super Admin login (superadmin@nexlidemo.test).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';
const DEMO_PASS = process.env.DEMO_PASS || 'NexliDemo@2026';
const SUPER_EMAIL = process.env.SUPER_EMAIL || 'superadmin@nexlidemo.test';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const root = db.doc(`schools/${SCHOOL_ID}`);
const col = (c) => root.collection(c);
const log = [];
const set = async (c, id, patch, note) => {
  await col(c).doc(id).set(patch, { merge: true });
  log.push(`  ✓ ${c}/${id} — ${note}`);
};
const REALISTIC_MSG = 'Hi, could you please share the updated Grade 6 timetable before Friday? Thanks.';
const looksJunk = (s) => {
  const t = String(s || '').toLowerCase();
  return t.includes('qa test') || t.includes('test ') || /qwerty|asdf|zxcv|poiuy|oiuhg|(.)\1{3,}/.test(t);
};

async function main() {
  // 1) Circulars (notices shown on dashboards)
  await set('circulars', 'p4DJYHJAHRbOYDDYsM93', {
    title: 'Library Week Celebrations',
    body: 'The school library will host reading sessions, storytelling and a book fair all next week. Students are encouraged to take part and discover new authors.',
    category: 'event',
  }, 'replaced gibberish circular ("gtgtrgrtt")');
  await set('circulars', 'LT3CThMoz2Ab3vILHgJS', {
    title: 'Parent–Teacher Meeting — Term 1',
    body: 'Term 1 parent–teacher meetings will be held this Saturday from 9:00 AM to 1:00 PM. Please check your child’s allotted slot on the noticeboard.',
    category: 'academic',
  }, 'replaced QA-test circular');

  // 2) Delegations
  await set('delegations', '5henvUNlDh1LWBEi9Tr6', { reason: 'Covering Grade 6 classes during examination invigilation duty.' }, 'real delegation reason');
  await set('delegations', 'HWhjl2969ItPmc24oi6i', { reason: 'Acting class teacher for 6A while the regular teacher is on leave.' }, 'real delegation reason');

  // 3) Event — replace gibberish + publish (so it counts as upcoming everywhere)
  await set('events', 'ppi5IBUyV4ijWO7F2iCe', {
    title: 'Science Exhibition',
    description: 'Students across all grades present working models and experiments. Parents are welcome to visit.',
    venue: 'School Auditorium',
    organiser: 'Science Department',
    approvalStatus: 'approved',
    status: 'upcoming',
  }, 'replaced gibberish event + published');

  // 4) Expenses (fixes the huge amount that broke the layout)
  await set('expenses', 'U9mnL8JcF5PVJE9k07CB', { description: 'Classroom whiteboards and marker pens', amount: 8500 }, 'fixed gibberish + huge amount');
  await set('expenses', 'kjdJIg5VP0EFr3V0K69M', { description: 'Stationery and printer supplies', amount: 5000 }, 'tidied test expense');

  // 5) Hostel block
  await set('hostel_blocks', 'RSvvtKeD8p8cTfmCsN29', { name: 'South Wing', wardenName: 'Ramesh Pillai' }, 'replaced gibberish hostel block');

  // 6) Staff junk name
  await set('staff', 'RUoEDKcKCAXQF3jmw8ep', { name: 'Kavita Menon', designation: 'Subject Teacher — Science', department: 'Academics' }, 'renamed QA staff');

  // 7) Admission applicant junk name
  await set('admissions', 'JzSo56nfFzhNdnpJQaqG', { applicantName: 'Aarush Verma' }, 'renamed QA applicant');

  // 8) Medical complaint gibberish
  await set('medical', 'yAMqGx8relA8LzIgLGpO', { complaint: 'Mild fever and headache since morning' }, 'fixed gibberish complaint');

  // 9) Messages + conversation previews: replace QA-test / gibberish text
  for (const m of (await col('messages').get()).docs) {
    if (looksJunk(m.data().text)) { await m.ref.set({ text: REALISTIC_MSG }, { merge: true }); log.push(`  ✓ messages/${m.id} — replaced test message`); }
  }
  for (const c of (await col('conversations').get()).docs) {
    const d = c.data();
    const patch = {};
    for (const k of ['lastMessageText', 'lastMessagePreview', 'lastText', 'preview', 'lastMessage']) {
      if (typeof d[k] === 'string' && looksJunk(d[k])) patch[k] = REALISTIC_MSG;
    }
    if (Object.keys(patch).length) { await c.ref.set(patch, { merge: true }); log.push(`  ✓ conversations/${c.id} — tidied preview`); }
  }

  // 10) Fee payee name = school name (consistency)
  const school = (await root.get()).data() || {};
  if (school.name) await set('finance_settings', 'main', { payeeName: school.name }, `payeeName = "${school.name}"`);

  // 11) Demo student attendance: mark stu-001 & stu-002 present; recompute counts from entries.
  for (const day of (await col('attendance_days').get()).docs) {
    const data = day.data();
    const entries = { ...(data.entries || {}) };
    let touched = false;
    for (const sid of ['stu-001', 'stu-002']) if (sid in entries && entries[sid] !== 'present') { entries[sid] = 'present'; touched = true; }
    const vals = Object.values(entries);
    await day.ref.set({
      entries,
      presentCount: vals.filter((s) => s === 'present').length,
      absentCount: vals.filter((s) => s === 'absent').length,
      total: vals.length,
    }, { merge: true });
    if (touched) log.push(`  ✓ attendance_days/${day.id} — demo student(s) marked present`);
  }

  // 12) Demo Super Admin login (separate from the owner's personal account)
  let superUid;
  try {
    superUid = (await auth.createUser({ email: SUPER_EMAIL, password: DEMO_PASS, displayName: 'Demo Super Admin', emailVerified: false })).uid;
  } catch (e) {
    if (e.code === 'auth/email-already-exists') { superUid = (await auth.getUserByEmail(SUPER_EMAIL)).uid; await auth.updateUser(superUid, { password: DEMO_PASS }); }
    else throw e;
  }
  await db.doc(`userIndex/${superUid}`).set({ uid: superUid, roleId: 'super_admin', isSuperAdmin: true, status: 'active' }, { merge: true });
  log.push(`  ✓ Super Admin login ready: ${SUPER_EMAIL} / ${DEMO_PASS}`);

  console.log('\nDEMO FIX COMPLETE\n' + log.join('\n') + '\n');
  process.exit(0);
}

main().catch((e) => { console.error('\n✖ fix failed:', e.message || e, '\n'); process.exit(1); });
