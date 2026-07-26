import { z } from 'zod';
import type { RteApplication, RteClaim } from '@/types/compliance';

/* ============================================================================
 * RTE Quota & Reimbursement — RHF/Zod schemas.
 * String-based (input === output) to satisfy the kit `Form<T>`: no `z.coerce`
 * or `.default()`. Numeric fields stay as `z.string()` and are `Number()`-coerced
 * at submit; defaults flow through `defaultValues`. (Mirrors complianceSchema.ts.)
 * ==========================================================================*/

const optionalAmount = (msg: string) =>
  z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), msg);

const requiredCount = (msg: string) =>
  z.string().refine((v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0, msg);

const requiredAmount = (msg: string) =>
  z.string().refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, msg);

/* ------------------------------ Application ------------------------------- */

export const rteApplicationSchema = z.object({
  applicantName: z.string().trim().min(2, 'Applicant name required'),
  guardianName: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[+\d][\d\s-]{6,15}$/.test(v), 'Enter a valid phone'),
  gradeApplied: z.string().trim().optional(),
  gradeId: z.string().optional(),
  category: z.enum(['ews', 'dg']),
  annualIncome: optionalAmount('Enter a valid amount'),
  academicYear: z.string().trim().optional(),
  applicationNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type RteApplicationValues = z.infer<typeof rteApplicationSchema>;

const defaultAcademicYear = (): string => {
  const now = new Date();
  // Indian academic year starts ~April; before April belongs to the prior cycle.
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

export const emptyRteApplication = (): RteApplicationValues => ({
  applicantName: '',
  guardianName: '',
  phone: '',
  gradeApplied: '',
  gradeId: '',
  category: 'ews',
  annualIncome: '',
  academicYear: defaultAcademicYear(),
  applicationNo: '',
  notes: '',
});

export function applicationToForm(a: RteApplication): RteApplicationValues {
  return {
    applicantName: a.applicantName,
    guardianName: a.guardianName ?? '',
    phone: a.phone ?? '',
    gradeApplied: a.gradeApplied ?? '',
    gradeId: a.gradeId ?? '',
    category: a.category ?? 'ews',
    annualIncome: a.annualIncome != null ? String(a.annualIncome) : '',
    academicYear: a.academicYear ?? '',
    applicationNo: a.applicationNo ?? '',
    notes: a.notes ?? '',
  };
}

export function formToApplication(
  v: RteApplicationValues,
): Omit<RteApplication, 'id' | 'schoolId' | 'stage'> {
  return {
    applicantName: v.applicantName.trim(),
    guardianName: v.guardianName?.trim() || undefined,
    phone: v.phone?.trim() || undefined,
    gradeApplied: v.gradeApplied?.trim() || undefined,
    gradeId: v.gradeId || undefined,
    category: v.category,
    annualIncome: v.annualIncome ? Number(v.annualIncome) : undefined,
    academicYear: v.academicYear?.trim() || undefined,
    applicationNo: v.applicationNo?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}

/* -------------------------------- Claim ----------------------------------- */

export const rteClaimSchema = z.object({
  academicYear: z.string().trim().min(2, 'Academic year required'),
  period: z.string().trim().optional(),
  studentCount: requiredCount('Enter the number of students'),
  perStudentAmount: requiredAmount('Enter the per-student rate'),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type RteClaimValues = z.infer<typeof rteClaimSchema>;

export const emptyRteClaim = (): RteClaimValues => ({
  academicYear: defaultAcademicYear(),
  period: '',
  studentCount: '',
  perStudentAmount: '',
  referenceNo: '',
  notes: '',
});

export function claimToForm(c: RteClaim): RteClaimValues {
  return {
    academicYear: c.academicYear,
    period: c.period ?? '',
    studentCount: c.studentCount != null ? String(c.studentCount) : '',
    perStudentAmount: c.perStudentAmount != null ? String(c.perStudentAmount) : '',
    referenceNo: c.referenceNo ?? '',
    notes: c.notes ?? '',
  };
}

export function formToClaim(
  v: RteClaimValues,
): Omit<RteClaim, 'id' | 'schoolId' | 'status' | 'amountReceived' | 'receivedDate'> {
  const studentCount = Number(v.studentCount);
  const perStudentAmount = Number(v.perStudentAmount);
  return {
    academicYear: v.academicYear.trim(),
    period: v.period?.trim() || undefined,
    studentCount,
    perStudentAmount,
    amountClaimed: studentCount * perStudentAmount,
    referenceNo: v.referenceNo?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}
