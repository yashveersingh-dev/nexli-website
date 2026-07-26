import { z } from 'zod';
import type { StaffProfile } from '@/types/hr';

export const qualificationSchema = z.object({
  degree: z.string().min(1, 'Degree required'),
  institution: z.string().optional().or(z.literal('')),
  year: z.string().optional().or(z.literal('')),
  specialization: z.string().optional().or(z.literal('')),
});

export const staffSchema = z.object({
  name: z.string().min(1, 'Name required'),
  employeeId: z.string().min(1, 'Employee ID required'),
  designation: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  employmentType: z.string().optional().or(z.literal('')),
  status: z.string().min(1),
  joiningDate: z.string().optional().or(z.literal('')),
  photoUrl: z.string().nullable().optional(),

  gender: z.string().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  maritalStatus: z.string().optional().or(z.literal('')),

  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().refine((v) => !v || /^\d{6}$/.test(v), 'Pincode must be 6 digits'),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),

  experienceYears: z.string().optional().or(z.literal('')),
  aadhaarLast4: z.string().optional().refine((v) => !v || /^\d{4}$/.test(v), 'Enter last 4 digits only'),
  panMasked: z.string().optional().or(z.literal('')),
  uanNumber: z.string().optional().or(z.literal('')),

  qualifications: z.array(qualificationSchema),
});

export type StaffFormValues = z.infer<typeof staffSchema>;

export function emptyStaffForm(employeeId: string): StaffFormValues {
  return {
    name: '', employeeId, designation: '', department: '', employmentType: 'permanent', status: 'active',
    joiningDate: new Date().toISOString().slice(0, 10), photoUrl: null,
    gender: '', dob: '', bloodGroup: '', maritalStatus: '',
    phone: '', email: '', address: '', city: '', state: '', pincode: '',
    emergencyContactName: '', emergencyContactPhone: '',
    experienceYears: '', aadhaarLast4: '', panMasked: '', uanNumber: '',
    qualifications: [{ degree: '', institution: '', year: '', specialization: '' }],
  };
}

export function staffToForm(s: StaffProfile): StaffFormValues {
  return {
    name: s.name ?? '', employeeId: s.employeeId ?? '', designation: s.designation ?? '', department: s.department ?? '',
    employmentType: s.employmentType ?? 'permanent', status: s.status ?? 'active',
    joiningDate: s.joiningDate ? new Date(s.joiningDate).toISOString().slice(0, 10) : '', photoUrl: s.photoUrl ?? null,
    gender: s.gender ?? '', dob: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '', bloodGroup: s.bloodGroup ?? '', maritalStatus: s.maritalStatus ?? '',
    phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', city: s.city ?? '', state: s.state ?? '', pincode: s.pincode ?? '',
    emergencyContactName: s.emergencyContactName ?? '', emergencyContactPhone: s.emergencyContactPhone ?? '',
    experienceYears: s.experienceYears != null ? String(s.experienceYears) : '', aadhaarLast4: s.aadhaarLast4 ?? '', panMasked: s.panMasked ?? '', uanNumber: s.uanNumber ?? '',
    qualifications: s.qualifications?.length
      ? s.qualifications.map((q) => ({ degree: q.degree, institution: q.institution ?? '', year: q.year != null ? String(q.year) : '', specialization: q.specialization ?? '' }))
      : [{ degree: '', institution: '', year: '', specialization: '' }],
  };
}

export function formToStaff(v: StaffFormValues): Omit<StaffProfile, 'id' | 'schoolId'> {
  return {
    name: v.name.trim(),
    employeeId: v.employeeId.trim(),
    designation: v.designation || undefined,
    department: v.department || undefined,
    employmentType: (v.employmentType || undefined) as StaffProfile['employmentType'],
    status: v.status as StaffProfile['status'],
    joiningDate: v.joiningDate ? new Date(v.joiningDate).getTime() : undefined,
    photoUrl: v.photoUrl || undefined,
    gender: (v.gender || undefined) as StaffProfile['gender'],
    dob: v.dob ? new Date(v.dob).getTime() : undefined,
    bloodGroup: (v.bloodGroup || undefined) as StaffProfile['bloodGroup'],
    maritalStatus: (v.maritalStatus || undefined) as StaffProfile['maritalStatus'],
    phone: v.phone || undefined,
    email: v.email || undefined,
    address: v.address || undefined,
    city: v.city || undefined,
    state: v.state || undefined,
    pincode: v.pincode || undefined,
    emergencyContactName: v.emergencyContactName || undefined,
    emergencyContactPhone: v.emergencyContactPhone || undefined,
    experienceYears: v.experienceYears ? Number(v.experienceYears) : undefined,
    aadhaarLast4: v.aadhaarLast4 || undefined,
    panMasked: v.panMasked || undefined,
    uanNumber: v.uanNumber || undefined,
    qualifications: v.qualifications
      .filter((q) => q.degree.trim())
      .map((q) => ({ degree: q.degree.trim(), institution: q.institution || undefined, year: q.year ? Number(q.year) : undefined, specialization: q.specialization || undefined })),
  };
}
