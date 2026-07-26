import { query, where } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import {
  createIn, setIn, updateIn, removeIn, type Actor,
} from '@/features/daily/data';
import type { Student } from '@/types/sis';
import type { AttendanceDay, Exam, ExamPaper, ExamResult } from '@/types/daily';
import type { ReportCard, ReportCardScheme } from '@/types/reportcard';
import { SEED_SCHEMES } from './schemes';
import {
  autoFillSubjects, computeAttendance, computeRanks, computeResult, computeTotals,
} from './compute';

/**
 * Report-card data layer. Two NEW tenant collections (`reportCards`,
 * `reportCardSchemes`) reached via `tenantCol`/`tenantDoc` + the audited write
 * primitives shared from `features/daily/data` (createIn/setIn/updateIn). Reads
 * of marks/attendance reuse the existing daily collections — nothing new there.
 */

export type { Actor };

const CARDS = 'reportCards';
const SCHEMES = 'reportCardSchemes';

/* ------------------------------ Cards ------------------------------ */

/** Stable, idempotent card id per student/year/term so re-generation upserts. */
export const reportCardId = (studentId: string, year: string, term: string) => `${studentId}_${year}_${term}`;

export function useReportCards(schoolId?: string, studentId?: string) {
  return useCollection<ReportCard>(
    schoolId
      ? studentId
        ? query(tenantCol(schoolId, CARDS), where('studentId', '==', studentId))
        : tenantCol(schoolId, CARDS)
      : null,
    [schoolId, studentId],
  );
}

export function useReportCard(schoolId?: string, id?: string) {
  return useDocument<ReportCard>(schoolId && id ? tenantDoc(schoolId, CARDS, id) : null);
}

/** Parent/student own-record query: only this student's PUBLISHED cards. */
export function usePublishedReportCards(schoolId?: string, studentId?: string) {
  return useCollection<ReportCard>(
    schoolId && studentId
      ? query(tenantCol(schoolId, CARDS), where('studentId', '==', studentId), where('published', '==', true))
      : null,
    [schoolId, studentId],
  );
}

export const saveReportCard = (s: string, id: string, d: Omit<ReportCard, 'id'>, a: Actor) =>
  setIn(s, CARDS, id, d, a, { action: 'reportcard.saved', targetType: 'report_card', summary: `${d.studentName} · ${d.termLabel ?? d.term}` });

/** Author-side full update (re-saving an edited/recomputed card). */
export const updateReportCard = (s: string, id: string, patch: Partial<ReportCard>, a: Actor) =>
  updateIn(s, CARDS, id, patch, a, { action: 'reportcard.saved', targetType: 'report_card', summary: patch.studentName });

export const deleteReportCard = (s: string, id: string, a: Actor) =>
  removeIn(s, CARDS, id, a, { action: 'reportcard.deleted', targetType: 'report_card' });

/** Author submits a draft/returned card for leadership approval. */
export const submitReportCard = (s: string, id: string, patch: Partial<ReportCard>, a: Actor) =>
  updateIn(s, CARDS, id, patch, a, { action: 'reportcard.submitted', targetType: 'report_card', summary: patch.studentName });

/** Approver approves (publishes) or returns a submitted card. */
export const reviewReportCard = (s: string, id: string, patch: Partial<ReportCard>, a: Actor, approved: boolean) =>
  updateIn(s, CARDS, id, patch, a, {
    action: approved ? 'reportcard.approved' : 'reportcard.returned',
    targetType: 'report_card',
    summary: patch.studentName,
  });

/* ------------------------------ Schemes ------------------------------ */

export function useSchemes(schoolId?: string) {
  return useCollection<ReportCardScheme>(schoolId ? tenantCol(schoolId, SCHEMES) : null, [schoolId]);
}

export function useScheme(schoolId?: string, id?: string) {
  return useDocument<ReportCardScheme>(schoolId && id ? tenantDoc(schoolId, SCHEMES, id) : null);
}

export const createScheme = (s: string, d: Omit<ReportCardScheme, 'id'>, a: Actor) =>
  createIn(s, SCHEMES, d, a, { action: 'reportcard.scheme_created', targetType: 'report_card_scheme', summary: d.name });

export const setScheme = (s: string, id: string, d: Omit<ReportCardScheme, 'id'>, a: Actor) =>
  setIn(s, SCHEMES, id, d, a, { action: 'reportcard.scheme_created', targetType: 'report_card_scheme', summary: d.name });

export const updateScheme = (s: string, id: string, patch: Partial<ReportCardScheme>, a: Actor) =>
  updateIn(s, SCHEMES, id, patch, a, { action: 'reportcard.scheme_updated', targetType: 'report_card_scheme' });

export const deleteScheme = (s: string, id: string, a: Actor) =>
  removeIn(s, SCHEMES, id, a, { action: 'reportcard.scheme_deleted', targetType: 'report_card_scheme' });

/**
 * Seed the three bundled schemes into the tenant if they are missing. Idempotent:
 * uses the stable seed ids, so re-running only fills gaps. Returns the count seeded.
 */
export async function seedSchemes(schoolId: string, existing: ReportCardScheme[], actor: Actor): Promise<number> {
  const have = new Set(existing.map((s) => s.id));
  let seeded = 0;
  for (const scheme of SEED_SCHEMES) {
    if (have.has(scheme.id)) continue;
    const { id, ...rest } = scheme;
    await setScheme(schoolId, id, { ...rest, schoolId }, actor);
    seeded += 1;
  }
  return seeded;
}

/* --------------------------- Batch generation --------------------------- */

export interface GenerateInput {
  scheme: ReportCardScheme;
  term: string;
  /** In-scope students (caller filters by section/grade + active). */
  students: Student[];
  /** Exams considered in scope for this term. */
  exams: Exam[];
  /** Exam papers for the in-scope exams. */
  papers: ExamPaper[];
  /** All exam results for the in-scope exams (across students). */
  results: ExamResult[];
  /** Attendance days for the section over the term. */
  attendance: AttendanceDay[];
  academicYear: string;
}

/**
 * Build (in memory, no writes) the auto-filled draft cards for a batch of
 * students. Used by the generate flow to preview before committing.
 */
export function buildBatch(input: GenerateInput): Omit<ReportCard, 'id'>[] {
  const { scheme, term, students, exams, papers, results, attendance, academicYear } = input;
  const termLabel = scheme.terms.find((t) => t.id === term)?.label ?? term;

  const cards: Omit<ReportCard, 'id'>[] = students.map((student) => {
    const subjects = autoFillSubjects({ scheme, exams, papers, results, attendance, studentId: student.id });
    const totals = computeTotals(scheme, subjects);
    const att = computeAttendance(attendance, student.id);
    const result = computeResult(subjects, totals.percentage);
    return {
      schoolId: scheme.schoolId,
      studentId: student.id,
      studentName: student.fullName,
      gradeName: student.gradeName,
      sectionId: student.sectionId,
      sectionName: student.sectionName,
      rollNo: student.rollNo,
      admissionNo: student.admissionNo,
      academicYear,
      term,
      termLabel,
      schemeId: scheme.id,
      schemeName: scheme.name,
      subjects,
      coScholastic: (scheme.coScholasticAreas ?? []).map((area) => ({ area, grade: '' })),
      attendance: att.total > 0 ? att : undefined,
      totals,
      result,
      approvalStatus: 'draft',
      published: false,
    };
  });

  // Assign class rank over the freshly built batch (showRank schemes only).
  if (scheme.showRank) {
    const ranks = computeRanks(cards.map((c, i) => ({ id: String(i), totals: c.totals })));
    cards.forEach((c, i) => {
      const r = ranks.get(String(i));
      if (r) {
        c.rank = r.rank;
        c.classSize = r.classSize;
      }
    });
  }
  return cards;
}

export interface GenerateResult {
  created: number;
  skipped: number;
}

/**
 * Generate draft report cards for a batch. Idempotent: an existing card for the
 * same student/year/term is skipped (never overwrites teacher edits). Sequential
 * writes keep the free-tier load gentle.
 */
export async function generateReportCards(
  schoolId: string,
  input: GenerateInput,
  existing: ReportCard[],
  actor: Actor,
): Promise<GenerateResult> {
  const batch = buildBatch({ ...input, scheme: { ...input.scheme, schoolId } });
  const have = new Set(existing.map((c) => reportCardId(c.studentId, c.academicYear, c.term)));
  let created = 0;
  let skipped = 0;
  for (const card of batch) {
    const id = reportCardId(card.studentId, card.academicYear, card.term);
    if (have.has(id)) { skipped += 1; continue; }
    await saveReportCard(schoolId, id, card, actor);
    created += 1;
  }
  return { created, skipped };
}

/* ------------------------------ Marks sources (re-exports) ------------------------------ */
export { useStudents, useGrades, useSections, useSubjects } from '@/features/school/data';
export { useExams, useExamPapers, useAllAttendance } from '@/features/daily/data';

/** All exam results for the school (across exams) — aggregated client-side. */
export function useAllExamResults(schoolId?: string) {
  return useCollection<ExamResult>(schoolId ? tenantCol(schoolId, 'exam_results') : null, [schoolId]);
}

/** All exam papers for the school (across exams). */
export function useAllExamPapers(schoolId?: string) {
  return useCollection<ExamPaper>(schoolId ? tenantCol(schoolId, 'exam_papers') : null, [schoolId]);
}
