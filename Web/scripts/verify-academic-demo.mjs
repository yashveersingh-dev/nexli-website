#!/usr/bin/env node
/** Read-back verification of the academic seed: counts, rankings, a sample report
 *  card, and dues consistency. Run: GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/verify-academic-demo.mjs */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';
initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();
const col = (n) => db.collection(`schools/${SCHOOL_ID}/${n}`);
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

async function main() {
  console.log(`\nVERIFY academic seed — school "${SCHOOL_ID}"\n`);
  for (const c of ['attendance_days', 'exams', 'exam_papers', 'exam_results', 'reportCards', 'fee_heads', 'fee_structures', 'fee_invoices', 'fee_payments']) {
    console.log(`  ${c.padEnd(16)} = ${(await col(c).count().get()).data().count}`);
  }
  const students = (await col('students').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const sById = Object.fromEntries(students.map((s) => [s.id, s]));
  const lbl = (id) => { const s = sById[id]; return s ? `${s.fullName} (${s.gradeName}-${s.sectionName})` : id; };

  /* MARKS RANKING (what RankingsHub computes: avg percentage per student) */
  const results = (await col('exam_results').get()).docs.map((d) => d.data());
  const mk = new Map();
  for (const r of results) { if (r.percentage == null) continue; const g = mk.get(r.studentId) ?? { sum: 0, n: 0, tot: 0 }; g.sum += r.percentage; g.n++; g.tot += r.total ?? 0; mk.set(r.studentId, g); }
  const marksRank = [...mk.entries()].map(([id, g]) => ({ id, pct: Math.round(g.sum / g.n) })).sort((a, b) => b.pct - a.pct || a.id.localeCompare(b.id));
  console.log('\n  MARKS RANKING (school-wide, normalised %): top 8');
  marksRank.slice(0, 8).forEach((r, i) => console.log(`    #${i + 1}  ${r.pct}%  ${lbl(r.id)}`));
  // fair-cross-class proof: best pre-primary vs a senior with lower %
  const pre = marksRank.find((r) => /Nursery|LKG|UKG/.test(sById[r.id]?.gradeName || ''));
  const sen = [...marksRank].reverse().find((r) => /Class (9|10|11|12)/.test(sById[r.id]?.gradeName || ''));
  if (pre && sen) console.log(`    cross-class: ${lbl(pre.id)} ${pre.pct}%  ranks ABOVE  ${lbl(sen.id)} ${sen.pct}%  → ${pre.pct > sen.pct ? 'fair ✓' : 'check'}`);

  /* ATTENDANCE RANKING */
  const att = (await col('attendance_days').get()).docs.map((d) => d.data());
  const at = new Map();
  for (const d of att) for (const [sid, st] of Object.entries(d.entries || {})) { if (st === 'holiday') continue; const g = at.get(sid) ?? { p: 0, t: 0 }; g.t++; if (st === 'present' || st === 'late') g.p += 1; else if (st === 'half_day') g.p += 0.5; at.set(sid, g); }
  const attRank = [...at.entries()].map(([id, g]) => ({ id, pct: Math.round((g.p / g.t) * 100), days: g.t })).sort((a, b) => b.pct - a.pct);
  console.log('\n  ATTENDANCE RANKING: top 5 + bottom 3 (of ' + attRank.length + ' students, ' + (attRank[0]?.days ?? 0) + ' recorded days)');
  attRank.slice(0, 5).forEach((r, i) => console.log(`    #${i + 1}  ${r.pct}%  ${lbl(r.id)}`));
  attRank.slice(-3).forEach((r) => console.log(`    …    ${r.pct}%  ${lbl(r.id)}`));

  /* SAMPLE REPORT CARD */
  const card = (await col('reportCards').where('result', '==', 'pass').limit(1).get()).docs[0]?.data();
  if (card) {
    console.log(`\n  SAMPLE REPORT CARD: ${card.studentName} (${card.gradeName}-${card.sectionName}) · ${card.termLabel} ${card.academicYear}`);
    console.log(`    overall ${card.totals.percentage}%  CGPA ${card.totals.cgpa}  result=${card.result}  rank ${card.rank}/${card.classSize}  attendance ${card.attendance?.pct}%  published=${card.published}`);
    console.log('    subjects: ' + card.subjects.map((s) => `${s.subjectName} ${s.percentage}% ${s.grade}`).join(' · '));
  }

  /* DUES CONSISTENCY (the formula all 3 screens now use: net - paid) */
  const invs = (await col('fee_invoices').get()).docs.map((d) => d.data());
  let outstanding = 0, billed = 0, paid = 0; const byStatus = {};
  for (const i of invs) { if (i.status === 'cancelled') continue; billed += i.netAmount || 0; paid += i.paidAmount || 0; outstanding += Math.max(0, (i.netAmount || 0) - (i.paidAmount || 0)); byStatus[i.status] = (byStatus[i.status] || 0) + 1; }
  const payTotal = (await col('fee_payments').get()).docs.reduce((s, d) => s + (d.data().amount || 0), 0);
  console.log('\n  DUES (net − paid, as dashboard + finance + student profile all now compute):');
  console.log(`    billed ${inr(billed)} · collected(invoices) ${inr(paid)} · payments-sum ${inr(payTotal)} · OUTSTANDING ${inr(outstanding)}`);
  console.log(`    invoice status: ${JSON.stringify(byStatus)}  (payments match collected: ${Math.abs(payTotal - paid) < 1 ? 'yes ✓' : 'NO'})`);
  const s1 = invs.find((i) => i.status === 'partial');
  if (s1) console.log(`    sample partial: ${lbl(s1.studentId)} net ${inr(s1.netAmount)} paid ${inr(s1.paidAmount)} due ${inr(s1.dueAmount)} (net−paid=${inr(s1.netAmount - s1.paidAmount)})`);

  console.log('\n✅ Verification complete.\n');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
