import { useMemo } from 'react';
import { tenantCol, useCollection } from '@/lib/db';
import type { ExamPaper, ExamResult } from '@/types/daily';

/**
 * Rankings data layer. Two deliberately SEPARATE engines (marks vs attendance)
 * that never mix: a merit ranking on normalised exam percentage, and an
 * attendance ranking on present-day percentage. Both read existing tenant data;
 * nothing new is written.
 */

/** All exam papers for the school (gives each paper's max marks for recompute). */
function useAllExamPapers(schoolId?: string) {
  return useCollection<ExamPaper>(schoolId ? tenantCol(schoolId, 'exam_papers') : null, [schoolId]);
}

/**
 * Recompute a result's percentage from its raw `marks` + the live paper max marks,
 * rather than trusting the stored `percentage`. If an examiner corrected a mark on
 * the paper/result without re-saving the whole results grid (or the stored field
 * was written by an older computation), the persisted `percentage` can be stale and
 * silently skew the merit ranking. We treat `marks` (keyed by paper doc id) as the
 * source of truth and divide only by the max of papers the student actually sat —
 * mirroring `examinations/ResultsTab.computeRow`. Falls back to the stored value
 * when no matching paper max is available (e.g. a paper was deleted).
 */
function recomputeResult(r: ExamResult, maxByPaper: Map<string, number>): { percentage: number; total: number } {
  let total = 0;
  let max = 0;
  let matched = 0;
  for (const [paperId, raw] of Object.entries(r.marks ?? {})) {
    if (raw == null || Number.isNaN(raw)) continue;
    const pm = maxByPaper.get(paperId);
    if (pm == null) continue; // unknown paper — can't trust its weight; skip
    total += raw;
    max += pm;
    matched++;
  }
  if (matched === 0 || max <= 0) {
    // No paper-max data to recompute from — fall back to the persisted values.
    return { percentage: r.percentage ?? 0, total: r.total ?? 0 };
  }
  return { percentage: Math.round((total / max) * 1000) / 10, total };
}

/**
 * Every exam result for the school (across all exams), with `percentage`/`total`
 * RECOMPUTED from source marks where possible (see `recomputeResult`). Consumers
 * (rankings) get trustworthy percentages without trusting a possibly-stale field.
 */
export function useAllExamResults(schoolId?: string) {
  const results = useCollection<ExamResult>(schoolId ? tenantCol(schoolId, 'exam_results') : null, [schoolId]);
  const papers = useAllExamPapers(schoolId);

  const data = useMemo(() => {
    const maxByPaper = new Map<string, number>();
    for (const p of papers.data) if (p.maxMarks != null) maxByPaper.set(p.id, p.maxMarks);
    // While papers are still loading, leave results untouched (stored values) so the
    // list isn't briefly zeroed; recompute once paper max marks are available.
    if (papers.loading || maxByPaper.size === 0) return results.data;
    return results.data.map((r) => {
      const { percentage, total } = recomputeResult(r, maxByPaper);
      return { ...r, percentage, total };
    });
  }, [results.data, papers.data, papers.loading]);

  return { ...results, data };
}

export { useStudents, useGrades, useSections } from '@/features/school/data';
export { useExams, useAllAttendance } from '@/features/daily/data';
