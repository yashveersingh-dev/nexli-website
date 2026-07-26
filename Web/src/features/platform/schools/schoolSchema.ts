import { z } from 'zod';
import type { FeatureFlagKey } from '@/lib/featureFlags';
import { DEFAULT_FLAGS } from '@/lib/featureFlags';

/** Zod schema for editing a school's core details (reused by the edit page). */
export const schoolEditSchema = z.object({
  name: z.string().min(2, 'Enter the school name'),
  board: z.string().min(1, 'Select a board'),
  type: z.string().min(1, 'Select a type'),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{6}$/.test(v), 'Pincode must be 6 digits'),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  website: z.string().optional(),
  currentAcademicYear: z.string().optional(),
  notes: z.string().optional(),
});

export type SchoolEditValues = z.infer<typeof schoolEditSchema>;

/** URL-/id-safe slug from a school name (+ short suffix to avoid collisions). */
export function schoolSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'school';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/** Standard Indian K-12 grade ladder used in onboarding's initial configuration. */
export const GRADE_LADDER: string[] = [
  'Pre-KG', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
];

/** The set of feature flags a school admin can toggle during onboarding. */
export const ONBOARDING_MODULE_KEYS: FeatureFlagKey[] = [
  'transport', 'hostel', 'library', 'medical', 'canteen', 'alumni',
  'advanced_analytics', 'gps_tracking', 'smc',
];

/** Default module map for a new school (sensible free-tier defaults). */
export function defaultModuleMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const k of ONBOARDING_MODULE_KEYS) map[k] = DEFAULT_FLAGS[k];
  return map;
}

/** Compute the current Indian academic year label (e.g. 2026-27). */
export function currentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 3 ? y : y - 1; // AY starts ~April
  return `${start}-${(start + 1).toString().slice(-2)}`;
}
