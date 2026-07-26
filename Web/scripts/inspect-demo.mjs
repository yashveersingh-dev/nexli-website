#!/usr/bin/env node
/**
 * Read-only inspection of the live demo Firestore — so the academic-data seed
 * matches the ACTUAL demo school (grades/sections/subjects/students), not assumptions.
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/inspect-demo.mjs
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const COUNT_COLS = [
  'grades', 'sections', 'subjects', 'students', 'members', 'staff',
  'exams', 'exam_papers', 'exam_results', 'attendance_days',
  'assessments', 'assessment_results',
  'fee_heads', 'fee_structures', 'fee_invoices', 'fee_payments',
  'hpc_cards', 'reportCards', 'certificates',
];

async function safeCount(ref) {
  try { return (await ref.count().get()).data().count; }
  catch { try { return (await ref.get()).size; } catch (e) { return `(err ${e.code || e.message})`; } }
}

async function main() {
  const schools = await db.collection('schools').get();
  console.log(`SCHOOLS: ${schools.size}`);
  for (const sd of schools.docs) {
    const s = sd.data();
    const base = `schools/${sd.id}`;
    console.log(`\n========================================================`);
    console.log(`SCHOOL ${sd.id} :: "${s.name}"  studentCount=${s.studentCount}  AY=${s.currentAcademicYear}  board=${s.board}`);
    console.log(`========================================================`);
    for (const col of COUNT_COLS) {
      console.log(`  ${col.padEnd(20)} = ${await safeCount(db.collection(`${base}/${col}`))}`);
    }
    const grades = (await db.collection(`${base}/grades`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log('  GRADES:', grades.map((g) => `${g.id}~${g.name}(o${g.order})`).join(', ') || '(none)');
    const sections = (await db.collection(`${base}/sections`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`  SECTIONS (${sections.length}):`, sections.slice(0, 80).map((x) => `${x.id}[g=${x.gradeId};${x.name}]`).join(', ') || '(none)');
    const subjects = (await db.collection(`${base}/subjects`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`  SUBJECTS (${subjects.length}):`, subjects.map((x) => `${x.id}~${x.name}${x.isScholastic === false ? '(co)' : ''}`).join(', ') || '(none)');

    const studs = (await db.collection(`${base}/students`).limit(6).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log('  SAMPLE STUDENTS:');
    for (const st of studs) console.log(`    ${st.id} | ${st.fullName} | grade=${st.gradeId}(${st.gradeName}) sec=${st.sectionId}(${st.sectionName}) status=${st.status} roll=${st.rollNo}`);

    // status + grade distribution over up to 2000 students
    const all = (await db.collection(`${base}/students`).select('status', 'gradeId', 'sectionId').limit(2000).get()).docs.map((d) => d.data());
    const byStatus = {}; const byGrade = {}; const secSet = new Set();
    for (const st of all) { byStatus[st.status || '?'] = (byStatus[st.status || '?'] || 0) + 1; byGrade[st.gradeId || '?'] = (byGrade[st.gradeId || '?'] || 0) + 1; if (st.sectionId) secSet.add(st.sectionId); }
    console.log(`  STUDENT STATUS:`, JSON.stringify(byStatus));
    console.log(`  STUDENTS PER GRADE:`, JSON.stringify(byGrade));
    console.log(`  DISTINCT SECTIONS WITH STUDENTS: ${secSet.size}`);

    const exs = (await db.collection(`${base}/exams`).limit(4).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    if (exs.length) console.log('  SAMPLE EXAMS:', JSON.stringify(exs));
    const fstr = (await db.collection(`${base}/fee_structures`).limit(3).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    if (fstr.length) console.log('  SAMPLE FEE_STRUCTURES:', JSON.stringify(fstr).slice(0, 700));
    const finv = (await db.collection(`${base}/fee_invoices`).limit(2).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    if (finv.length) console.log('  SAMPLE FEE_INVOICES:', JSON.stringify(finv).slice(0, 700));
  }
  process.exit(0);
}
main().catch((e) => { console.error('inspect failed:', e); process.exit(1); });
