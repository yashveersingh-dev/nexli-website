import { z } from 'zod';
import type { TherapyLog, TherapyType, TherapyProgress } from '@/types/special';

/* ============================================================================
 * Therapy log form schema (used inside the "Add session" modal).
 * String-based (input === output): `durationMins` is a string, coerced to a
 * number at submit; `date` is a native ISO string. No `z.coerce` / `.default()`.
 * ==========================================================================*/

const therapyTypes = ['speech', 'occupational', 'physiotherapy', 'behavioural', 'counseling', 'remedial'] as const;
const therapyProgress = ['poor', 'fair', 'good', 'excellent'] as const;

export const therapyLogSchema = z.object({
  studentId: z.string().trim().min(1, 'Select a student'),
  type: z.enum(therapyTypes),
  date: z.string().trim().min(1, 'Pick a date'),
  therapist: z.string().trim().optional(),
  focus: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  progress: z.enum(therapyProgress),
  durationMins: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{1,3}$/.test(v) && Number(v) > 0 && Number(v) <= 480), 'Enter 1–480 minutes'),
});

export type TherapyLogValues = z.infer<typeof therapyLogSchema>;

/** Today as yyyy-mm-dd for the default session date. */
function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export const emptyTherapyLog = (): TherapyLogValues => ({
  studentId: '',
  type: 'speech',
  date: todayInput(),
  therapist: '',
  focus: '',
  notes: '',
  progress: 'good',
  durationMins: '',
});

/**
 * Map form values → the therapy-log payload. `studentName` is resolved by the
 * caller; `schoolId` is stamped by the writer.
 */
export function formToTherapyLog(
  v: TherapyLogValues,
): Omit<TherapyLog, 'id' | 'schoolId' | 'studentName'> {
  const mins = v.durationMins.trim();
  const ms = new Date(`${v.date.trim()}T12:00:00`).getTime();
  return {
    studentId: v.studentId,
    type: v.type as TherapyType,
    date: Number.isNaN(ms) ? Date.now() : ms,
    therapist: v.therapist?.trim() || undefined,
    focus: v.focus?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
    progress: v.progress as TherapyProgress,
    durationMins: mins ? Number(mins) : undefined,
  };
}
