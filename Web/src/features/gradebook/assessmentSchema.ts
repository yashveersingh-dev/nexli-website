import { z } from 'zod';
import type { AssessmentType } from '@/types/daily';

/**
 * Form values for creating a new assessment. String-based (input === output) so
 * it satisfies the kit's `Form<T>` (`ZodType<T>`); `maxMarks` is validated as a
 * positive number but coerced at submit. No `z.coerce`/`.default()` (they diverge
 * the input/output types). See `features/fees/feeSchema.ts`.
 */
export const assessmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.string().min(1, 'Pick a type'),
  sectionId: z.string().min(1, 'Pick a section'),
  subjectId: z.string().optional(),
  maxMarks: z
    .string()
    .min(1, 'Enter a number')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, 'Must be greater than 0'),
  date: z.string().optional(),
});

export type AssessmentFormValues = z.infer<typeof assessmentSchema>;

export const emptyAssessmentForm = (sectionId = ''): AssessmentFormValues => ({
  name: '',
  type: 'class_test',
  sectionId,
  subjectId: '',
  maxMarks: '100',
  date: new Date().toISOString().slice(0, 10),
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

export type { AssessmentType };
