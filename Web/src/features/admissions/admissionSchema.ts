import { z } from 'zod';
import type { Admission, Student } from '@/types/sis';

/** Default document checklist seeded onto a new application. */
export const DEFAULT_ADMISSION_DOCS: { label: string }[] = [
  { label: 'Birth certificate' },
  { label: 'Previous report card / marksheet' },
  { label: 'Transfer certificate (TC)' },
  { label: 'Aadhaar card' },
  { label: 'Passport-size photographs' },
  { label: 'Address proof' },
];

export const admissionSchema = z.object({
  applicantName: z.string().min(1, 'Applicant name required'),
  gender: z.string().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  gradeAppliedId: z.string().optional().or(z.literal('')),
  guardianName: z.string().optional().or(z.literal('')),
  guardianPhone: z.string().optional().or(z.literal('')),
  guardianEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  rteApplication: z.boolean().optional(),
  notes: z.string().optional().or(z.literal('')),
});

export type AdmissionFormValues = z.infer<typeof admissionSchema>;

/** Empty new-application defaults. */
export function emptyAdmissionForm(): AdmissionFormValues {
  return {
    applicantName: '',
    gender: '',
    dob: '',
    gradeAppliedId: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    source: '',
    category: '',
    rteApplication: false,
    notes: '',
  };
}

/** Map a new-application form into an Admission create payload (enquiry stage). */
export function formToAdmission(
  v: AdmissionFormValues,
  opts: { gradeAppliedName?: string; academicYear?: string },
): Omit<Admission, 'id' | 'schoolId'> {
  return {
    applicantName: v.applicantName.trim(),
    gender: (v.gender || undefined) as Admission['gender'],
    dob: v.dob ? new Date(v.dob).getTime() : undefined,
    gradeAppliedId: v.gradeAppliedId || undefined,
    gradeAppliedName: opts.gradeAppliedName,
    academicYear: opts.academicYear,
    guardianName: v.guardianName || undefined,
    guardianPhone: v.guardianPhone || undefined,
    guardianEmail: v.guardianEmail || undefined,
    source: v.source || undefined,
    category: (v.category || undefined) as Admission['category'],
    rteApplication: v.rteApplication,
    stage: 'enquiry',
    appliedDate: Date.now(),
    documents: DEFAULT_ADMISSION_DOCS.map((d) => ({ label: d.label, received: false })),
    notes: v.notes || undefined,
  };
}

/**
 * Build a Student payload from an admitted application. firstName is the first
 * token of the applicant name; the rest becomes lastName.
 */
export function admissionToStudent(
  a: Admission,
  opts: { admissionNo: string; gradeName?: string; academicYear?: string },
): Omit<Student, 'id' | 'schoolId'> {
  const parts = a.applicantName.trim().split(/\s+/);
  const firstName = parts[0] ?? a.applicantName.trim();
  const lastName = parts.slice(1).join(' ') || undefined;
  return {
    firstName,
    lastName,
    fullName: a.applicantName.trim(),
    gender: (a.gender ?? 'other') as Student['gender'],
    dob: a.dob,
    admissionNo: opts.admissionNo,
    gradeId: a.gradeAppliedId,
    gradeName: opts.gradeName ?? a.gradeAppliedName,
    academicYear: a.academicYear ?? opts.academicYear,
    status: 'active',
    admissionDate: Date.now(),
    admissionType: a.rteApplication ? 'rte' : 'regular',
    category: a.category,
    rteQuota: a.rteApplication,
    guardians: a.guardianName
      ? [
          {
            relation: 'guardian',
            name: a.guardianName,
            phone: a.guardianPhone || undefined,
            email: a.guardianEmail || undefined,
            isPrimary: true,
          },
        ]
      : [],
  };
}

/** Age in years from a dob (ms). */
export function ageFromDob(dob?: number): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - dob) / (365.25 * 86400000));
}
