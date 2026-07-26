import { z } from 'zod';
import type { Alumnus } from '@/types/community';

/**
 * Alumni form schema. String-based (input === output) so it satisfies the
 * kit's `Form<T>` (`ZodType<T>`): no `z.coerce` / `.default()` — defaults are
 * supplied via `defaultValues`, booleans/arrays handled by RHF controllers.
 * Mirrors the StudentFormPage / feeSchema convention.
 */
export const alumniSchema = z.object({
  name: z.string().trim().min(1, 'Name required'),
  batchYear: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v.trim()), 'Enter a 4-digit year, e.g. 2018'),
  gradeLeft: z.string().optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  currentRole: z.string().optional().or(z.literal('')),
  organisation: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  higherEducation: z.string().optional().or(z.literal('')),
  achievements: z.string().optional().or(z.literal('')),
  linkedin: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), 'Enter a full URL (https://…)'),
  photoUrl: z.string().nullable().optional(),
  willingToMentor: z.boolean(),
  mentorAreas: z.array(z.string().trim().min(1)),
  verified: z.boolean(),
  notes: z.string().optional().or(z.literal('')),
});

export type AlumniFormValues = z.infer<typeof alumniSchema>;

/** Empty defaults for a new alumnus. */
export function emptyAlumniForm(): AlumniFormValues {
  return {
    name: '',
    batchYear: '',
    gradeLeft: '',
    email: '',
    phone: '',
    currentRole: '',
    organisation: '',
    city: '',
    country: 'India',
    industry: '',
    higherEducation: '',
    achievements: '',
    linkedin: '',
    photoUrl: null,
    willingToMentor: false,
    mentorAreas: [],
    verified: false,
    notes: '',
  };
}

/** Map an existing Alumnus doc into form values. */
export function alumnusToForm(a: Alumnus): AlumniFormValues {
  return {
    name: a.name ?? '',
    batchYear: a.batchYear ?? '',
    gradeLeft: a.gradeLeft ?? '',
    email: a.email ?? '',
    phone: a.phone ?? '',
    currentRole: a.currentRole ?? '',
    organisation: a.organisation ?? '',
    city: a.city ?? '',
    country: a.country ?? '',
    industry: a.industry ?? '',
    higherEducation: a.higherEducation ?? '',
    achievements: a.achievements ?? '',
    linkedin: a.linkedin ?? '',
    photoUrl: a.photoUrl ?? null,
    willingToMentor: !!a.willingToMentor,
    mentorAreas: a.mentorAreas ?? [],
    verified: !!a.verified,
    notes: a.notes ?? '',
  };
}

/** Map form values into an Alumnus payload (drops empties so Firestore stays clean). */
export function formToAlumnus(v: AlumniFormValues): Omit<Alumnus, 'id' | 'schoolId'> {
  const areas = v.mentorAreas.map((m) => m.trim()).filter(Boolean);
  return {
    name: v.name.trim(),
    batchYear: v.batchYear?.trim() || undefined,
    gradeLeft: v.gradeLeft || undefined,
    email: v.email?.trim() || undefined,
    phone: v.phone || undefined,
    currentRole: v.currentRole || undefined,
    organisation: v.organisation || undefined,
    city: v.city || undefined,
    country: v.country || undefined,
    industry: v.industry || undefined,
    higherEducation: v.higherEducation || undefined,
    achievements: v.achievements || undefined,
    linkedin: v.linkedin?.trim() || undefined,
    photoUrl: v.photoUrl || undefined,
    willingToMentor: v.willingToMentor,
    mentorAreas: v.willingToMentor && areas.length ? areas : undefined,
    verified: v.verified,
    notes: v.notes || undefined,
  };
}
