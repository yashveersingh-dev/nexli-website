import { z } from 'zod';

/** Form values for creating / editing an exam term. */
export const examSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    academicYear: z.string().optional(),
    gradeIds: z.array(z.string()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    published: z.boolean().optional(),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    { message: 'End date cannot be before the start date', path: ['endDate'] },
  );

export type ExamFormValues = z.infer<typeof examSchema>;

export const emptyExamForm = (academicYear = ''): ExamFormValues => ({
  name: '',
  academicYear,
  gradeIds: [],
  startDate: '',
  endDate: '',
  published: false,
});

/** Simple Indian letter-grade scale from a percentage (0..100). */
export function letterGrade(pct: number): string {
  if (pct >= 90) return 'A1';
  if (pct >= 80) return 'A2';
  if (pct >= 70) return 'B1';
  if (pct >= 60) return 'B2';
  if (pct >= 50) return 'C1';
  if (pct >= 40) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

/** Pass threshold (Indian D grade ≈ 33%). */
export const PASS_PERCENT = 33;

export type ResultStatus = 'pass' | 'fail' | 'compartment';

/**
 * Derive a per-student outcome across all papers.
 * - pass: every subject meets its pass mark AND overall ≥ PASS_PERCENT.
 * - compartment: 1–2 subjects below their pass mark AND overall ≥ PASS_PERCENT.
 * - fail: 3+ subjects failed, OR overall < PASS_PERCENT regardless of subject count.
 */
export function resultStatusFor(failedSubjects: number, overallPct: number): ResultStatus {
  if (overallPct < PASS_PERCENT) return 'fail';
  if (failedSubjects === 0) return 'pass';
  if (failedSubjects <= 2) return 'compartment';
  return 'fail';
}

export const RESULT_STATUS_META: Record<ResultStatus, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  pass: { label: 'Pass', variant: 'success' },
  fail: { label: 'Fail', variant: 'danger' },
  compartment: { label: 'Compartment', variant: 'warning' },
};
