import { z } from 'zod';
import type { Plan } from '@/types/models';

/**
 * Zod schema for creating/editing a plan tier (spec §12.4). String-based to
 * satisfy the kit `Form<T>` (`ZodType<T>`, input === output) — no `z.coerce` /
 * `.default()` (those diverge the in/out types AND coerce a blank field to 0,
 * losing the "unset" meaning). Numerics stay strings; blank = unset; coerced to
 * numbers at submit (`valuesToPlan`). Defaults come from `planToValues`.
 */
const nonNegOptional = z
  .string()
  .refine((s) => s === '' || (Number.isFinite(Number(s)) && Number(s) >= 0), 'Must be 0 or more');

export const planSchema = z.object({
  name: z.string().min(2, 'Enter a plan name'),
  order: z.string().refine((s) => Number.isFinite(Number(s)) && Number(s) >= 0, 'Must be 0 or more'),
  priceMonthly: nonNegOptional,
  priceAnnual: nonNegOptional,
  studentLimit: nonNegOptional,
  staffLimit: nonNegOptional,
  trialDays: nonNegOptional,
  description: z.string().optional(),
  highlighted: z.boolean(),
  active: z.boolean(),
});

export type PlanValues = z.infer<typeof planSchema>;

/** Parse an optional numeric string → number | undefined (blank = unset). */
const numOrUndef = (s?: string): number | undefined =>
  s != null && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : undefined;

/** URL-/id-safe slug from a plan name (+ short suffix to avoid collisions). */
export function planSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'plan';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/** Map form values + id into a full Plan record (drops empty optionals). */
export function valuesToPlan(id: string, v: PlanValues): Plan {
  return {
    id,
    name: v.name.trim(),
    order: numOrUndef(v.order) ?? 0,
    studentLimit: numOrUndef(v.studentLimit),
    staffLimit: numOrUndef(v.staffLimit),
    priceMonthly: numOrUndef(v.priceMonthly),
    priceAnnual: numOrUndef(v.priceAnnual),
    trialDays: numOrUndef(v.trialDays),
    description: v.description?.trim() || undefined,
    highlighted: v.highlighted,
    active: v.active,
  };
}

/** Numeric → form string ('' when unset). */
const numStr = (n?: number): string => (n != null ? String(n) : '');

/** Sensible defaults for the create form / fallback for missing fields. */
export function planToValues(plan?: Plan | null): PlanValues {
  return {
    name: plan?.name ?? '',
    order: plan ? numStr(plan.order) : '1',
    priceMonthly: numStr(plan?.priceMonthly),
    priceAnnual: numStr(plan?.priceAnnual),
    studentLimit: numStr(plan?.studentLimit),
    staffLimit: numStr(plan?.staffLimit),
    trialDays: numStr(plan?.trialDays),
    description: plan?.description ?? '',
    highlighted: plan?.highlighted ?? false,
    active: plan?.active ?? true,
  };
}
