import { z } from 'zod';
import type { Student } from '@/types/sis';

export const guardianSchema = z.object({
  relation: z.string().min(1, 'Select relation'),
  name: z.string().min(1, 'Name required'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  isPrimary: z.boolean().optional(),
});

export const studentSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().optional().or(z.literal('')),
  gender: z.string().min(1, 'Select gender'),
  dob: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  photoUrl: z.string().nullable().optional(),

  admissionNo: z.string().min(1, 'Admission number required'),
  rollNo: z.string().optional().or(z.literal('')),
  gradeId: z.string().optional().or(z.literal('')),
  sectionId: z.string().optional().or(z.literal('')),
  house: z.string().optional().or(z.literal('')),
  academicYear: z.string().optional().or(z.literal('')),
  admissionType: z.string().optional().or(z.literal('')),
  admissionDate: z.string().optional().or(z.literal('')),
  status: z.string().min(1),

  category: z.string().optional().or(z.literal('')),
  rteQuota: z.boolean().optional(),
  religion: z.string().optional().or(z.literal('')),
  motherTongue: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  aadhaarLast4: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), 'Enter last 4 digits only'),
  apaarId: z.string().optional().or(z.literal('')),
  penId: z.string().optional().or(z.literal('')),

  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{6}$/.test(v), 'Pincode must be 6 digits'),

  guardians: z.array(guardianSchema).min(1, 'Add at least one guardian'),
});

export type StudentFormValues = z.infer<typeof studentSchema>;

/** Empty form defaults (one blank primary guardian). */
export function emptyStudentForm(admissionNo: string, academicYear?: string): StudentFormValues {
  return {
    firstName: '', lastName: '', gender: '', dob: '', bloodGroup: '', photoUrl: null,
    admissionNo, rollNo: '', gradeId: '', sectionId: '', house: '', academicYear: academicYear ?? '',
    admissionType: 'regular', admissionDate: new Date().toISOString().slice(0, 10), status: 'active',
    category: 'general', rteQuota: false, religion: '', motherTongue: '', nationality: 'Indian',
    aadhaarLast4: '', apaarId: '', penId: '',
    address: '', city: '', state: '', pincode: '',
    guardians: [{ relation: 'father', name: '', phone: '', email: '', occupation: '', isPrimary: true }],
  };
}

/** Map an existing Student doc into form values. */
export function studentToForm(s: Student): StudentFormValues {
  return {
    firstName: s.firstName ?? '', lastName: s.lastName ?? '', gender: s.gender ?? '',
    dob: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '',
    bloodGroup: s.bloodGroup ?? '', photoUrl: s.photoUrl ?? null,
    admissionNo: s.admissionNo ?? '', rollNo: s.rollNo ?? '', gradeId: s.gradeId ?? '', sectionId: s.sectionId ?? '',
    house: s.house ?? '', academicYear: s.academicYear ?? '', admissionType: s.admissionType ?? 'regular',
    admissionDate: s.admissionDate ? new Date(s.admissionDate).toISOString().slice(0, 10) : '',
    status: s.status ?? 'active', category: s.category ?? 'general', rteQuota: !!s.rteQuota,
    religion: s.religion ?? '', motherTongue: s.motherTongue ?? '', nationality: s.nationality ?? 'Indian',
    aadhaarLast4: s.aadhaarLast4 ?? '', apaarId: s.apaarId ?? '', penId: s.penId ?? '',
    address: s.address ?? '', city: s.city ?? '', state: s.state ?? '', pincode: s.pincode ?? '',
    guardians: s.guardians?.length
      ? s.guardians.map((g) => ({ relation: g.relation, name: g.name, phone: g.phone ?? '', email: g.email ?? '', occupation: g.occupation ?? '', isPrimary: g.isPrimary }))
      : [{ relation: 'father', name: '', phone: '', email: '', occupation: '', isPrimary: true }],
  };
}

/** Map form values into a Student payload (parses dates, builds fullName). */
export function formToStudent(v: StudentFormValues): Omit<Student, 'id' | 'schoolId'> {
  const fullName = [v.firstName, v.lastName].filter(Boolean).join(' ').trim();
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName || undefined,
    fullName,
    gender: v.gender as Student['gender'],
    dob: v.dob ? new Date(v.dob).getTime() : undefined,
    bloodGroup: (v.bloodGroup || undefined) as Student['bloodGroup'],
    photoUrl: v.photoUrl || undefined,
    admissionNo: v.admissionNo.trim(),
    rollNo: v.rollNo || undefined,
    gradeId: v.gradeId || undefined,
    sectionId: v.sectionId || undefined,
    house: v.house || undefined,
    academicYear: v.academicYear || undefined,
    status: v.status as Student['status'],
    admissionType: (v.admissionType || undefined) as Student['admissionType'],
    admissionDate: v.admissionDate ? new Date(v.admissionDate).getTime() : undefined,
    category: (v.category || undefined) as Student['category'],
    rteQuota: v.rteQuota,
    religion: v.religion || undefined,
    motherTongue: v.motherTongue || undefined,
    nationality: v.nationality || undefined,
    aadhaarLast4: v.aadhaarLast4 || undefined,
    apaarId: v.apaarId || undefined,
    penId: v.penId || undefined,
    address: v.address || undefined,
    city: v.city || undefined,
    state: v.state || undefined,
    pincode: v.pincode || undefined,
    guardians: v.guardians.map((g) => ({
      relation: g.relation as never,
      name: g.name.trim(),
      phone: g.phone || undefined,
      email: g.email || undefined,
      occupation: g.occupation || undefined,
      isPrimary: g.isPrimary,
    })),
  };
}

/** Age in years from a dob (ms). */
export function ageFromDob(dob?: number): number | null {
  if (!dob) return null;
  const diff = Date.now() - dob;
  return Math.floor(diff / (365.25 * 86400000));
}
