import { z } from 'zod';
import type { ClinicVisit, VisitOutcome } from '@/types/ops';

/**
 * String-based clinic-visit schema (input === output) so it satisfies the kit
 * `Form<T>`. Numeric fields stay strings here and are `Number()`-coerced at
 * submit; no `z.coerce` / `.default()` (those break the ZodType<T> contract).
 */
export const visitSchema = z.object({
  studentId: z.string().trim().min(1, 'Select a student'),
  date: z.string().trim().min(1, 'Date required'),
  complaint: z.string().trim().min(2, 'Describe the complaint'),
  temperature: z
    .string()
    .trim()
    .refine((v) => v === '' || (Number(v) >= 30 && Number(v) <= 45), 'Enter a temperature in °C (30–45)'),
  diagnosis: z.string().trim().optional(),
  treatment: z.string().trim().optional(),
  medicineGiven: z.string().trim().optional(),
  outcome: z.enum(['treated', 'observation', 'sent_home', 'referred', 'hospital']),
  parentNotified: z.boolean(),
  followUp: z.string().trim().optional(),
});

export type VisitValues = z.infer<typeof visitSchema>;

const today = () => new Date().toISOString().slice(0, 10);

export const emptyVisit: VisitValues = {
  studentId: '',
  date: today(),
  complaint: '',
  temperature: '',
  diagnosis: '',
  treatment: '',
  medicineGiven: '',
  outcome: 'treated',
  parentNotified: false,
  followUp: '',
};

/** Map form values into a ClinicVisit payload (sans id/audit fields). */
export function formToVisit(
  v: VisitValues,
  ctx: { studentName: string; gradeName?: string; attendedByName?: string },
): Omit<ClinicVisit, 'id'> {
  return {
    kind: 'visit',
    schoolId: '', // stamped by the data layer
    studentId: v.studentId,
    studentName: ctx.studentName,
    gradeName: ctx.gradeName || undefined,
    date: v.date ? new Date(v.date).getTime() : Date.now(),
    complaint: v.complaint.trim(),
    temperature: v.temperature ? Number(v.temperature) : undefined,
    diagnosis: v.diagnosis?.trim() || undefined,
    treatment: v.treatment?.trim() || undefined,
    medicineGiven: v.medicineGiven?.trim() || undefined,
    outcome: v.outcome as VisitOutcome,
    parentNotified: v.parentNotified,
    followUp: v.followUp?.trim() || undefined,
    attendedByName: ctx.attendedByName,
  };
}
