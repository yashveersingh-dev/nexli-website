import { z } from 'zod';
import type { MedicalRecord } from '@/types/ops';

/**
 * String-based health-record schema (input === output) for the kit `Form<T>`.
 * height/weight stay strings (`Number()`-coerced at submit); the
 * allergies/conditions/medications chip lists are `z.array(z.string())`,
 * managed via a chip field (comma-or-enter to add) like the student arrays.
 */
export const recordSchema = z.object({
  studentId: z.string().trim().min(1, 'Select a student'),
  bloodGroup: z.string().trim().optional(),
  heightCm: z
    .string()
    .trim()
    .refine((v) => v === '' || (Number(v) > 0 && Number(v) <= 260), 'Enter height in cm'),
  weightKg: z
    .string()
    .trim()
    .refine((v) => v === '' || (Number(v) > 0 && Number(v) <= 300), 'Enter weight in kg'),
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  medications: z.array(z.string()),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{10}$/.test(v), 'Enter a 10-digit mobile'),
  doctorName: z.string().trim().optional(),
  insuranceNo: z.string().trim().optional(),
  healthPlan: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type RecordValues = z.infer<typeof recordSchema>;

export const emptyRecord: RecordValues = {
  studentId: '',
  bloodGroup: '',
  heightCm: '',
  weightKg: '',
  allergies: [],
  conditions: [],
  medications: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  doctorName: '',
  insuranceNo: '',
  healthPlan: '',
  notes: '',
};

/** Map an existing record into form values. */
export function recordToForm(r: MedicalRecord): RecordValues {
  return {
    studentId: r.studentId ?? '',
    bloodGroup: r.bloodGroup ?? '',
    heightCm: r.heightCm != null ? String(r.heightCm) : '',
    weightKg: r.weightKg != null ? String(r.weightKg) : '',
    allergies: r.allergies ?? [],
    conditions: r.conditions ?? [],
    medications: r.medications ?? [],
    emergencyContactName: r.emergencyContactName ?? '',
    emergencyContactPhone: r.emergencyContactPhone ?? '',
    doctorName: r.doctorName ?? '',
    insuranceNo: r.insuranceNo ?? '',
    healthPlan: r.healthPlan ?? '',
    notes: r.notes ?? '',
  };
}

/** Map form values into a MedicalRecord payload (sans id/audit fields). */
export function formToRecord(
  v: RecordValues,
  ctx: { studentName: string; gradeName?: string },
): Omit<MedicalRecord, 'id'> {
  return {
    kind: 'record',
    schoolId: '', // stamped by the data layer
    studentId: v.studentId,
    studentName: ctx.studentName,
    gradeName: ctx.gradeName || undefined,
    bloodGroup: v.bloodGroup || undefined,
    heightCm: v.heightCm ? Number(v.heightCm) : undefined,
    weightKg: v.weightKg ? Number(v.weightKg) : undefined,
    allergies: v.allergies.length ? v.allergies : undefined,
    conditions: v.conditions.length ? v.conditions : undefined,
    medications: v.medications.length ? v.medications : undefined,
    emergencyContactName: v.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: v.emergencyContactPhone?.trim() || undefined,
    doctorName: v.doctorName?.trim() || undefined,
    insuranceNo: v.insuranceNo?.trim() || undefined,
    healthPlan: v.healthPlan?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}
