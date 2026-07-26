import { resultStatusFor, type ResultStatus } from '@/features/examinations/examSchema';
import type { AttendanceDay, Exam, ExamPaper, ExamResult } from '@/types/daily';
import type {
  ReportCard,
  ReportCardAttendance,
  ReportCardComponentMark,
  ReportCardScheme,
  ReportCardSubject,
  ReportCardTotals,
} from '@/types/reportcard';

/**
 * Report-card computation. Pure functions: given a scheme + a student's recorded
 * marks + attendance, derive component totals, per-subject %/grade/pass, overall
 * totals/CGPA, result status (pass/fail/compartment) and (separately) class rank.
 *
 * Marks are AUTO-FILLED from the existing examinations data without re-entry:
 *   • `exam_papers` give each exam's subjects + max marks,
 *   • `exam_results` give each student's marks per paper (keyed by paper doc id).
 * The scheme's components are mapped onto matched exams heuristically (component
 * label/id ~ exam name). When no marks are recorded, the card computes honest
 * zeros and the UI shows a clear "no marks recorded" state.
 */

/** A grading scheme reduced to just what the scoring math needs. */
type ScoringScheme = Pick<ReportCardScheme, 'gradeBands' | 'passPercent' | 'components'>;

/**
 * Find the grade band for a percentage. Picks the HIGHEST band whose `minPct` the
 * score reaches (bands sorted desc), so fractional scores in a boundary gap (e.g.
 * 90.5% between an 81–90 and a 91–100 band) grade correctly instead of falling
 * through to the lowest/failing band. `maxPct` is intentionally not used here.
 */
function bandFor(gradeBands: ReportCardScheme['gradeBands'], pct: number) {
  const p = Math.max(0, Math.min(100, pct));
  const sorted = [...gradeBands].sort((a, b) => b.minPct - a.minPct);
  return sorted.find((b) => p >= b.minPct) ?? sorted[sorted.length - 1];
}

/** Map a percentage (0–100) to the scheme's grade band label. */
export function gradeFor(scheme: Pick<ReportCardScheme, 'gradeBands'>, pct: number): string {
  return bandFor(scheme.gradeBands, pct)?.grade ?? '—';
}

/** Grade point for a percentage, when the scheme defines points. */
export function pointFor(scheme: Pick<ReportCardScheme, 'gradeBands'>, pct: number): number | undefined {
  return bandFor(scheme.gradeBands, pct)?.point;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Build the blank (zeroed) component set for a subject from the scheme. */
export function blankComponents(scheme: ReportCardScheme): ReportCardComponentMark[] {
  return scheme.components.map((c) => ({ componentId: c.id, label: c.label, max: c.max, marks: null }));
}

/** Recompute a single subject row from its component marks. */
export function computeSubject(
  scheme: ScoringScheme,
  subjectName: string,
  components: ReportCardComponentMark[],
  remark?: string,
): ReportCardSubject {
  const max = components.reduce((sum, c) => sum + (c.max || 0), 0);
  const total = components.reduce((sum, c) => sum + (c.marks ?? 0), 0);
  const percentage = max > 0 ? round1((total / max) * 100) : 0;
  const passMark = Math.ceil((scheme.passPercent / 100) * max);
  return {
    subjectName,
    components,
    total: round1(total),
    max,
    percentage,
    grade: gradeFor(scheme, percentage),
    passMark,
    passed: max > 0 ? total >= passMark : true,
    remark,
  };
}

/** Roll a set of subject rows up into overall totals + CGPA. */
export function computeTotals(scheme: ReportCardScheme, subjects: ReportCardSubject[]): ReportCardTotals {
  const obtained = subjects.reduce((s, sub) => s + sub.total, 0);
  const max = subjects.reduce((s, sub) => s + sub.max, 0);
  const percentage = max > 0 ? round1((obtained / max) * 100) : 0;
  const points = subjects.map((sub) => pointFor(scheme, sub.percentage)).filter((p): p is number => p != null);
  const cgpa = points.length ? round1(points.reduce((a, b) => a + b, 0) / points.length) : undefined;
  return { obtained: round1(obtained), max, percentage, cgpa };
}

/** Overall result status from per-subject pass flags + overall %. */
export function computeResult(subjects: ReportCardSubject[], overallPct: number): ResultStatus {
  const graded = subjects.filter((s) => s.max > 0);
  const failed = graded.filter((s) => !s.passed).length;
  return resultStatusFor(failed, overallPct);
}

/* ------------------------- Auto-fill from exam data ------------------------- */

/**
 * Heuristically match a scheme component to one of the term's exams. We match a
 * component to the exam whose name best contains the component label/id (e.g.
 * component "Term Exam" → exam "Term 1"; "Half-Yearly" → "Half Yearly"). Falls
 * back to the single available exam when only one exists for the term.
 */
function matchExamForComponent(label: string, exams: Exam[]): Exam | undefined {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  const scored = exams
    .map((e) => {
      const name = (e.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let score = 0;
      if (name && key && (name.includes(key) || key.includes(name))) score = Math.min(name.length, key.length);
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);
  if (scored[0]?.score) return scored[0].e;
  return exams.length === 1 ? exams[0] : undefined;
}

export interface AutoFillSources {
  scheme: ReportCardScheme;
  /** Exams considered in scope for this term (already filtered by caller). */
  exams: Exam[];
  /** All exam papers for the in-scope exams (gives subject + max per exam). */
  papers: ExamPaper[];
  /** This student's exam results across the in-scope exams. */
  results: ExamResult[];
  /** Attendance days for the student's section over the term (caller-filtered). */
  attendance: AttendanceDay[];
  studentId: string;
}

/**
 * Auto-fill a student's subjects from the in-scope exams. For each subject seen
 * across the term's exam papers we build one row whose component marks come from
 * the exam matched to each scheme component (scaled to the component max).
 * Returns subjects with computed totals/grade/pass.
 */
export function autoFillSubjects(src: AutoFillSources): ReportCardSubject[] {
  const { scheme, exams, papers, results } = src;
  const resultByExam = new Map<string, ExamResult>();
  for (const r of results) if (r.studentId === src.studentId) resultByExam.set(r.examId, r);

  // Index papers: examId → (subjectName → { paperId, max }) and collect the subject universe.
  // `exam_results.marks` is keyed by the PAPER's Firestore doc id (see examinations
  // ResultsTab: `clean[p.id] = v`), NOT by subjectId — so we carry the paper id here.
  const papersByExam = new Map<string, Map<string, { paperId: string; max: number; name: string }>>();
  const subjectNames = new Set<string>();
  for (const p of papers) {
    const name = p.subjectName?.trim();
    if (!name) continue;
    subjectNames.add(name);
    const m = papersByExam.get(p.examId) ?? new Map();
    m.set(name, { paperId: p.id, max: p.maxMarks ?? 0, name });
    papersByExam.set(p.examId, m);
  }

  // Pre-match each scheme component to an exam once.
  const componentExam = new Map<string, Exam | undefined>();
  for (const c of scheme.components) componentExam.set(c.id, matchExamForComponent(c.label, exams));

  const subjects: ReportCardSubject[] = [];
  for (const subjectName of [...subjectNames].sort((a, b) => a.localeCompare(b))) {
    const components: ReportCardComponentMark[] = scheme.components.map((c) => {
      const exam = componentExam.get(c.id);
      let marks: number | null = null;
      if (exam) {
        const paper = papersByExam.get(exam.id)?.get(subjectName);
        const result = resultByExam.get(exam.id);
        // Marks are stored keyed by the paper's doc id, not the subjectId.
        const raw = paper ? result?.marks?.[paper.paperId] : undefined;
        if (raw != null && paper && paper.max > 0) {
          // Scale the exam's raw marks into the component's max.
          marks = Math.round(Math.min(1, raw / paper.max) * c.max * 10) / 10;
        }
      }
      return { componentId: c.id, label: c.label, max: c.max, marks };
    });
    subjects.push(computeSubject(scheme, subjectName, components));
  }
  return subjects;
}

/** Present-day attendance percentage for a student over the supplied days. */
export function computeAttendance(days: AttendanceDay[], studentId: string): ReportCardAttendance {
  let present = 0;
  let total = 0;
  for (const d of days) {
    const st = d.entries?.[studentId];
    if (!st || st === 'holiday') continue;
    total += 1;
    if (st === 'present' || st === 'late') present += 1;
    else if (st === 'half_day') present += 0.5;
  }
  const pct = total ? Math.round((present / total) * 100) : 0;
  return { present: Math.round(present), total, pct };
}

/**
 * Assign class ranks over a set of cards (highest % = rank 1). Ties share a rank.
 * Returns a Map cardId → { rank, classSize }. Cards with no recorded marks
 * (max === 0) are excluded from ranking. Pure — does not mutate the inputs.
 */
export function computeRanks(cards: Pick<ReportCard, 'id' | 'totals'>[]): Map<string, { rank: number; classSize: number }> {
  const ranked = cards.filter((c) => c.totals.max > 0);
  const sorted = [...ranked].sort((a, b) => b.totals.percentage - a.totals.percentage);
  const out = new Map<string, { rank: number; classSize: number }>();
  let lastPct = Number.NaN;
  let lastRank = 0;
  sorted.forEach((c, i) => {
    const rank = c.totals.percentage === lastPct ? lastRank : i + 1;
    lastPct = c.totals.percentage;
    lastRank = rank;
    out.set(c.id, { rank, classSize: ranked.length });
  });
  return out;
}
