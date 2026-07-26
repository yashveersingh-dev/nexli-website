#!/usr/bin/env node
/**
 * NEXLI — ACADEMIC DEMO SEED (additive). Populates the EXISTING demo school with
 * realistic attendance + one published Term-1 exam (marks across subjects per grade)
 * + published report cards + fees, so Rankings / Report Cards / dashboards show real
 * numbers. Idempotent (fixed doc ids + deterministic PRNG → re-runs overwrite with
 * identical values). ADD-ONLY: never touches members, students, staff, userIndex,
 * the Super Admin, or any account/login. Uses BulkWriter (auto-batched + throttled).
 *
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/seed-academic-demo.mjs
 *       (add  --dry-run  to compute + print the plan without writing)
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
const SCHOOL_ID = process.env.NEXLI_SCHOOL_ID || 'nexli-demo';
const DRY = process.argv.includes('--dry-run');
const SCHOOL_DAYS = 30; // attendance window (school days, Sundays skipped)
const now = Date.now();
const DAY = 86400000;

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

/* --------------------------- deterministic PRNG --------------------------- */
function h32(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = (seed) => mulberry32(h32(String(seed)))();      // single deterministic draw
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* --------------------------- CBSE 9-point scheme (mirrors features/reportcard/schemes.ts) --------------------------- */
const CBSE_BANDS = [
  { grade: 'A1', minPct: 91, point: 10 }, { grade: 'A2', minPct: 81, point: 9 },
  { grade: 'B1', minPct: 71, point: 8 }, { grade: 'B2', minPct: 61, point: 7 },
  { grade: 'C1', minPct: 51, point: 6 }, { grade: 'C2', minPct: 41, point: 5 },
  { grade: 'D', minPct: 33, point: 4 }, { grade: 'E', minPct: 0, point: 0 },
];
function bandFor(pct) { const p = clamp(pct, 0, 100); return [...CBSE_BANDS].sort((a, b) => b.minPct - a.minPct).find((b) => p >= b.minPct) ?? CBSE_BANDS[CBSE_BANDS.length - 1]; }
const SCHEME_ID = 'seed-cbse-9point';
const COMPONENTS = [
  { id: 'pt', label: 'Periodic Test', max: 10 }, { id: 'notebook', label: 'Notebook', max: 5 },
  { id: 'enrichment', label: 'Subject Enrichment', max: 5 }, { id: 'term', label: 'Term Exam', max: 80 },
];
const PASS_PERCENT = 33;
function resultStatusFor(failed, overallPct) { if (failed === 0) return overallPct >= PASS_PERCENT ? 'pass' : 'fail'; if (failed <= 2) return 'compartment'; return 'fail'; }
const CO_SCHOLASTIC = ['Work Education', 'Art Education', 'Health & Physical Education', 'Discipline'];

/* --------------------------- subjects per grade tier --------------------------- */
const TIER_SUBJECTS = {
  pre: ['sub-eng', 'sub-math', 'sub-evs', 'sub-art'],
  primary: ['sub-eng', 'sub-math', 'sub-evs', 'sub-hin', 'sub-art'],
  secondary: ['sub-eng', 'sub-math', 'sub-sci', 'sub-sst', 'sub-hin', 'sub-cs'],
};
function tierOf(order) { return order <= 2 ? 'pre' : order <= 7 ? 'primary' : 'secondary'; }
function feeFor(order) { return order <= 2 ? 52000 : order <= 7 ? 65000 : order <= 10 ? 77000 : order <= 12 ? 88000 : 100000; }

async function main() {
  console.log(`\nNEXLI academic seed → project "${PROJECT_ID}", school "${SCHOOL_ID}"${DRY ? '  [DRY RUN]' : ''}\n`);

  const schoolDoc = (await db.doc(`schools/${SCHOOL_ID}`).get()).data();
  if (!schoolDoc) { console.error(`✖ School "${SCHOOL_ID}" not found.`); process.exit(1); }
  const AY = schoolDoc.currentAcademicYear || '2026-27';

  const grades = (await db.collection(`schools/${SCHOOL_ID}/grades`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const subjects = (await db.collection(`schools/${SCHOOL_ID}/subjects`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const students = (await db.collection(`schools/${SCHOOL_ID}/students`).get()).docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.status === 'active');
  const gradeById = Object.fromEntries(grades.map((g) => [g.id, g]));
  const subjName = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  console.log(`Loaded ${grades.length} grades, ${subjects.length} subjects, ${students.length} active students. AY=${AY}`);

  const bw = db.bulkWriter();
  let writes = 0;
  const set = (col, id, data) => { if (!DRY) bw.set(db.doc(`schools/${SCHOOL_ID}/${col}/${id}`), { schoolId: SCHOOL_ID, ...data }); writes++; };

  /* ---------------- 1) ATTENDANCE (45 sections × 30 school days) ---------------- */
  const dates = [];
  for (let off = 1; dates.length < SCHOOL_DAYS && off < 70; off++) {
    const d = new Date(now - off * DAY);
    if (d.getDay() === 0) continue; // skip Sundays
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  dates.reverse();
  const bySection = {};
  for (const s of students) (bySection[s.sectionId] ??= []).push(s);
  const attTally = {}; // studentId -> { present, total }
  let attDocs = 0;
  for (const [sectionId, roster] of Object.entries(bySection)) {
    const sec = roster[0];
    for (const date of dates) {
      const entries = {}; let present = 0, absent = 0;
      for (const st of roster) {
        const prop = 0.78 + rand(st.id + 'att') * 0.21; // 0.78–0.99 personal rate
        const r = rand(st.id + 'att' + date);
        let status;
        if (r < prop) { const r2 = rand(st.id + date + 's'); status = r2 < 0.90 ? 'present' : r2 < 0.97 ? 'late' : 'half_day'; }
        else { status = rand(st.id + date + 'a') < 0.7 ? 'absent' : 'leave'; }
        entries[st.id] = status;
        const t = attTally[st.id] ??= { present: 0, total: 0 };
        t.total += 1;
        if (status === 'present' || status === 'late') { present += 1; t.present += 1; }
        else if (status === 'half_day') { present += 1; t.present += 0.5; }
        else absent += 1;
      }
      set('attendance_days', `${sectionId}_${date}`, {
        id: `${sectionId}_${date}`, date, sectionId, sectionName: sec.sectionName, gradeName: sec.gradeName,
        entries, presentCount: present, absentCount: absent, total: roster.length,
        markedByName: 'Class Teacher', markedAt: now - (dates.length - dates.indexOf(date)) * DAY, createdAt: now,
      });
      attDocs++;
    }
  }
  console.log(`  • attendance_days: ${attDocs} docs (${dates.length} school days × ${Object.keys(bySection).length} sections)`);

  /* ---------------- 2) EXAM + PAPERS ---------------- */
  const EXAM_ID = 'exam-term1';
  set('exams', EXAM_ID, {
    id: EXAM_ID, name: 'Term 1 Examination', academicYear: AY, gradeIds: grades.map((g) => g.id),
    startDate: now - 25 * DAY, endDate: now - 18 * DAY, published: true, createdBy: 'academic-seed', createdAt: now,
  });
  let paperDocs = 0;
  for (const g of grades) {
    for (const subjId of TIER_SUBJECTS[tierOf(g.order)]) {
      set('exam_papers', `paper-term1-${g.id}-${subjId}`, {
        id: `paper-term1-${g.id}-${subjId}`, examId: EXAM_ID, gradeId: g.id, gradeName: g.name,
        subjectId: subjId, subjectName: subjName[subjId] ?? subjId, maxMarks: 100, passMarks: 33,
        date: now - 22 * DAY, createdAt: now,
      });
      paperDocs++;
    }
  }
  console.log(`  • exams: 1 (Term 1, published) · exam_papers: ${paperDocs}`);

  /* ---------------- 3) EXAM RESULTS (per student) + collect marks ---------------- */
  const marksByStudent = {}; // studentId -> { subjId: mark }
  let resultDocs = 0;
  for (const st of students) {
    const g = gradeById[st.gradeId]; if (!g) continue;
    const subjs = TIER_SUBJECTS[tierOf(g.order)];
    const base = 42 + rand(st.id + 'abil') * 54; // 42–96 ability
    const marks = {}; let total = 0;
    for (const subjId of subjs) {
      const m = clamp(Math.round(base + (rand(st.id + subjId) * 30 - 15)), 9, 100); // ±15, floor 9
      marks[subjId] = m; total += m;
    }
    marksByStudent[st.id] = marks;
    const maxTotal = subjs.length * 100;
    const percentage = Math.round((total / maxTotal) * 100);
    const failed = subjs.filter((s) => marks[s] < 33).length;
    set('exam_results', `res-term1-${st.id}`, {
      id: `res-term1-${st.id}`, examId: EXAM_ID, studentId: st.id, studentName: st.fullName,
      sectionId: st.sectionId, gradeName: st.gradeName, marks, total, percentage,
      resultStatus: resultStatusFor(failed, percentage), createdAt: now,
    });
    resultDocs++;
  }
  console.log(`  • exam_results: ${resultDocs}`);

  /* ---------------- 4) REPORT CARDS (published) — per section, ranked within class ---------------- */
  let cardDocs = 0;
  for (const [sectionId, roster] of Object.entries(bySection)) {
    const built = roster.map((st) => {
      const g = gradeById[st.gradeId];
      const subjs = TIER_SUBJECTS[tierOf(g?.order ?? 8)];
      const marks = marksByStudent[st.id] ?? {};
      const subjects = subjs.map((subjId) => {
        const raw = marks[subjId] ?? 0;
        const components = COMPONENTS.map((c) => ({ componentId: c.id, label: c.label, max: c.max, marks: round1(Math.min(1, raw / 100) * c.max) }));
        const tot = round1(components.reduce((s, c) => s + c.marks, 0));
        const pct = round1((tot / 100) * 100);
        return { subjectName: subjName[subjId] ?? subjId, components, total: tot, max: 100, percentage: pct, grade: bandFor(pct).grade, passMark: Math.ceil(PASS_PERCENT / 100 * 100), passed: tot >= 33 };
      });
      const obtained = round1(subjects.reduce((s, x) => s + x.total, 0));
      const max = subjects.reduce((s, x) => s + x.max, 0);
      const percentage = max > 0 ? round1((obtained / max) * 100) : 0;
      const points = subjects.map((x) => bandFor(x.percentage).point).filter((p) => p != null);
      const cgpa = points.length ? round1(points.reduce((a, b) => a + b, 0) / points.length) : undefined;
      const failed = subjects.filter((x) => !x.passed).length;
      const att = attTally[st.id] ? { present: Math.round(attTally[st.id].present), total: attTally[st.id].total, pct: attTally[st.id].total ? Math.round((attTally[st.id].present / attTally[st.id].total) * 100) : 0 } : undefined;
      return {
        st, subjects, totals: { obtained, max, percentage, cgpa }, attendance: att,
        result: resultStatusFor(failed, percentage),
      };
    });
    // class rank within section (highest % = 1, ties share)
    const ranked = [...built].filter((c) => c.totals.max > 0).sort((a, b) => b.totals.percentage - a.totals.percentage);
    const rankByStu = {}; let lastPct = NaN, lastRank = 0;
    ranked.forEach((c, i) => { const rk = c.totals.percentage === lastPct ? lastRank : i + 1; lastPct = c.totals.percentage; lastRank = rk; rankByStu[c.st.id] = rk; });
    for (const c of built) {
      const st = c.st;
      set('reportCards', `${st.id}_${AY}_term1`, {
        id: `${st.id}_${AY}_term1`, studentId: st.id, studentName: st.fullName, gradeName: st.gradeName,
        sectionId: st.sectionId, sectionName: st.sectionName, rollNo: st.rollNo, admissionNo: st.admissionNo,
        academicYear: AY, term: 'term1', termLabel: 'Term 1', schemeId: SCHEME_ID, schemeName: 'CBSE 9-Point (Term)',
        subjects: c.subjects, coScholastic: CO_SCHOLASTIC.map((area, i) => ({ area, grade: ['A', 'A', 'B', 'A'][i % 4] })),
        attendance: c.attendance, totals: c.totals, rank: rankByStu[st.id], classSize: ranked.length, result: c.result,
        approvalStatus: 'approved', published: true, submittedByName: 'Class Teacher', submittedAt: now - 3 * DAY,
        approvedByName: 'Asha Menon', approvedAt: now - DAY, createdAt: now,
      });
      cardDocs++;
    }
  }
  console.log(`  • reportCards: ${cardDocs} (published, ranked within section)`);

  /* ---------------- 5) FEES (heads, structures, invoices, payments) ---------------- */
  const HEADS = [
    { id: 'fh-tuition', name: 'Tuition Fee', category: 'tuition' },
    { id: 'fh-transport', name: 'Transport Fee', category: 'transport' },
    { id: 'fh-activity', name: 'Activity & Lab Fee', category: 'activity' },
  ];
  for (const h of HEADS) set('fee_heads', h.id, { id: h.id, name: h.name, category: h.category, active: true, createdAt: now });
  // one structure per fee tier
  const TIERS = [{ id: 'fs-pre', max: 2 }, { id: 'fs-primary', max: 7 }, { id: 'fs-middle', max: 10 }, { id: 'fs-high', max: 12 }, { id: 'fs-senior', max: 14 }];
  const tierStructId = (order) => (TIERS.find((t) => order <= t.max) ?? TIERS[TIERS.length - 1]).id;
  for (const t of TIERS) {
    const orderRep = t.max; const total = feeFor(orderRep);
    const tuition = Math.round(total * 0.78), transport = Math.round(total * 0.14), activity = total - tuition - transport;
    const items = [
      { headId: 'fh-tuition', headName: 'Tuition Fee', category: 'tuition', amount: tuition, frequency: 'annual' },
      { headId: 'fh-transport', headName: 'Transport Fee', category: 'transport', amount: transport, frequency: 'annual' },
      { headId: 'fh-activity', headName: 'Activity & Lab Fee', category: 'activity', amount: activity, frequency: 'annual' },
    ];
    set('fee_structures', t.id, { id: t.id, name: `Annual Fees — ${t.id.replace('fs-', '')}`, academicYear: AY, items, total, active: true, createdAt: now });
  }
  let invDocs = 0, payDocs = 0, receiptN = 0, outstanding = 0, billed = 0, collected = 0;
  const counts = { paid: 0, partial: 0, unpaid: 0 };
  for (let i = 0; i < students.length; i++) {
    const st = students[i]; const g = gradeById[st.gradeId]; if (!g) continue;
    const net = feeFor(g.order);
    const tuition = Math.round(net * 0.78), transport = Math.round(net * 0.14), activity = net - tuition - transport;
    const lines = [
      { headId: 'fh-tuition', headName: 'Tuition Fee', category: 'tuition', amount: tuition },
      { headId: 'fh-transport', headName: 'Transport Fee', category: 'transport', amount: transport },
      { headId: 'fh-activity', headName: 'Activity & Lab Fee', category: 'activity', amount: activity },
    ];
    const bucket = i % 20;
    let paid, status;
    if (bucket <= 8) { paid = net; status = 'paid'; counts.paid++; }
    else if (bucket <= 14) { paid = Math.round((net * (0.4 + rand(st.id + 'pay') * 0.3)) / 500) * 500; status = 'partial'; counts.partial++; }
    else { paid = 0; status = 'unpaid'; counts.unpaid++; }
    const due = net - paid;
    billed += net; outstanding += due; collected += paid;
    set('fee_invoices', `inv-term-${st.id}`, {
      id: `inv-term-${st.id}`, studentId: st.id, studentName: st.fullName, admissionNo: st.admissionNo,
      gradeId: st.gradeId, gradeName: st.gradeName, sectionName: st.sectionName, academicYear: AY, structureId: tierStructId(g.order),
      title: `Annual Fees · ${AY}`, lines, grossAmount: net, concessionAmount: 0, netAmount: net, paidAmount: paid, dueAmount: due,
      status, issuedDate: now - 40 * DAY, dueDate: now + 20 * DAY, createdAt: now,
    });
    invDocs++;
    if (paid > 0) {
      receiptN++;
      const method = ['upi', 'cash', 'cheque', 'card', 'netbanking'][i % 5];
      set('fee_payments', `pay-term-${st.id}`, {
        id: `pay-term-${st.id}`, receiptNo: `RC-${AY.slice(0, 4)}-${String(receiptN).padStart(4, '0')}`,
        studentId: st.id, studentName: st.fullName, admissionNo: st.admissionNo, invoiceId: `inv-term-${st.id}`,
        invoiceTitle: `Annual Fees · ${AY}`, amount: paid, method, reference: `${method.toUpperCase()}-${st.id}`,
        paidAt: now - (5 + (i % 25)) * DAY, status: 'cleared', recordedByName: 'Accounts', createdAt: now,
      });
      payDocs++;
    }
  }
  set('finance_counters', 'receipt', { value: receiptN, schoolId: SCHOOL_ID });
  set('finance_settings', 'main', { receiptPrefix: 'RC', upiId: 'nexlidemo@upi', payeeName: schoolDoc.name, bankName: 'HDFC Bank', accountNo: '50100123456789', ifsc: 'HDFC0001234' });
  console.log(`  • fee_heads: ${HEADS.length} · fee_structures: ${TIERS.length} · fee_invoices: ${invDocs} (paid ${counts.paid}/partial ${counts.partial}/unpaid ${counts.unpaid}) · fee_payments: ${payDocs}`);
  console.log(`    billed ₹${billed.toLocaleString('en-IN')} · collected ₹${collected.toLocaleString('en-IN')} · OUTSTANDING ₹${outstanding.toLocaleString('en-IN')}`);

  if (!DRY) { await bw.close(); }
  console.log(`\n${DRY ? 'WOULD WRITE' : 'WROTE'} ~${writes} documents total.`);
  console.log('✅ Academic demo seed complete.\n');
  process.exit(0);
}
main().catch((e) => { console.error('\n✖ Seed failed:', e); process.exit(1); });
