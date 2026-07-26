/**
 * Read-only scan of the demo tenant — dumps each subcollection's docs with their
 * human-visible text fields so we can spot keyboard-mash junk before fixing it.
 * Run from Web/:  GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/scan-demo.mjs
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const TEXT_KEYS = [
  'title', 'name', 'body', 'description', 'reason', 'wardenName', 'venue', 'organiser',
  'note', 'notes', 'remarks', 'message', 'subject', 'delegateName', 'toName', 'fromName',
  'personName', 'label', 'approvalStatus', 'status',
];
const short = (v) => (typeof v === 'string' && v.length > 70 ? v.slice(0, 70) + '…' : v);

const root = db.doc(`schools/${SCHOOL_ID}`);

const cols = await root.listCollections();
console.log(`Tenant ${SCHOOL_ID} — ${cols.length} subcollections\n`);

for (const col of cols) {
  const snap = await col.get();
  if (col.id === 'students') {
    const byStatus = {};
    snap.forEach((d) => { const s = d.data().status || 'unknown'; byStatus[s] = (byStatus[s] || 0) + 1; });
    console.log(`## students (${snap.size}) by status:`, JSON.stringify(byStatus));
    continue;
  }
  console.log(`## ${col.id} (${snap.size})`);
  let shown = 0;
  snap.forEach((d) => {
    if (shown >= 40) return;
    const data = d.data();
    const texts = {};
    for (const k of TEXT_KEYS) if (data[k] != null && data[k] !== '') texts[k] = short(data[k]);
    if (Object.keys(texts).length) { console.log(`   ${d.id}:`, JSON.stringify(texts)); shown += 1; }
  });
}

const sc = (await root.get()).data() || {};
console.log('\n## school:', JSON.stringify({ name: sc.name, studentCount: sc.studentCount, staffCount: sc.staffCount }));
const fset = (await root.collection('finance_settings').doc('main').get()).data();
console.log('## finance_settings.main:', JSON.stringify(fset));
process.exit(0);
