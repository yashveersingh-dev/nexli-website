import { z } from 'zod';
import { computePF, computeESI, computePT } from '@/features/finance/meta';
import type {
  SalaryStructure, SalaryComponentLine, Payslip, PayslipEarnings, PayslipDeductions,
} from '@/types/finance';

/**
 * Form schemas are string-based (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`); numbers are coerced at submit. Mirrors `feeSchema.ts`
 * — avoids `z.coerce`/`.default()` which diverge input/output types.
 */

/** A non-negative-number-as-string validator (empty string allowed → 0). */
const moneyStr = z
  .string()
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a valid amount');

const otherEarningSchema = z.object({
  name: z.string().trim().min(1, 'Name the component'),
  amount: moneyStr,
});

export const salaryStructureSchema = z.object({
  basic: moneyStr,
  hra: moneyStr,
  da: moneyStr,
  conveyance: moneyStr,
  specialAllowance: moneyStr,
  otherEarnings: z.array(otherEarningSchema),
  pfApplicable: z.boolean(),
  esiApplicable: z.boolean(),
  ptApplicable: z.boolean(),
  tdsMonthly: moneyStr,
});

export type SalaryStructureValues = z.infer<typeof salaryStructureSchema>;

export const emptySalaryForm = (): SalaryStructureValues => ({
  basic: '', hra: '', da: '', conveyance: '', specialAllowance: '',
  otherEarnings: [],
  pfApplicable: true, esiApplicable: false, ptApplicable: true,
  tdsMonthly: '',
});

export function structureToForm(s: SalaryStructure): SalaryStructureValues {
  return {
    basic: String(s.basic ?? 0),
    hra: String(s.hra ?? 0),
    da: String(s.da ?? 0),
    conveyance: String(s.conveyance ?? 0),
    specialAllowance: String(s.specialAllowance ?? 0),
    otherEarnings: (s.otherEarnings ?? []).map((o) => ({ name: o.name, amount: String(o.amount) })),
    pfApplicable: s.pfApplicable !== false,
    esiApplicable: !!s.esiApplicable,
    ptApplicable: s.ptApplicable !== false,
    tdsMonthly: s.tdsMonthly ? String(s.tdsMonthly) : '',
  };
}

const n = (v: string | number | undefined): number => Number(v) || 0;

/** Sum of all earning components for a set of form values. */
export function grossFromForm(v: SalaryStructureValues): number {
  return (
    n(v.basic) + n(v.hra) + n(v.da) + n(v.conveyance) + n(v.specialAllowance) +
    (v.otherEarnings ?? []).reduce((s, o) => s + n(o.amount), 0)
  );
}

/** Live statutory deduction preview from current form values. */
export function deductionsFromForm(v: SalaryStructureValues) {
  const basic = n(v.basic);
  const gross = grossFromForm(v);
  const pf = computePF(basic, v.pfApplicable);
  const esi = computeESI(gross, v.esiApplicable);
  const pt = computePT(gross, v.ptApplicable);
  const tds = n(v.tdsMonthly);
  const total = pf + esi + pt + tds;
  return { gross, pf, esi, pt, tds, total, net: Math.max(0, gross - total) };
}

/** Build the persisted SalaryStructure from form values + denormalized staff. */
export function formToStructure(
  v: SalaryStructureValues,
  meta: { schoolId: string; staffId: string; staffName?: string; designation?: string; department?: string },
): Omit<SalaryStructure, 'id'> {
  const otherEarnings: SalaryComponentLine[] = (v.otherEarnings ?? [])
    .filter((o) => o.name.trim() && n(o.amount) > 0)
    .map((o) => ({ name: o.name.trim(), amount: n(o.amount) }));
  const grossMonthly = grossFromForm(v);
  return {
    schoolId: meta.schoolId,
    staffId: meta.staffId,
    staffName: meta.staffName,
    designation: meta.designation,
    department: meta.department,
    basic: n(v.basic),
    hra: n(v.hra),
    da: n(v.da),
    conveyance: n(v.conveyance),
    specialAllowance: n(v.specialAllowance),
    otherEarnings: otherEarnings.length ? otherEarnings : undefined,
    grossMonthly,
    ctcAnnual: grossMonthly * 12,
    pfApplicable: v.pfApplicable,
    esiApplicable: v.esiApplicable,
    ptApplicable: v.ptApplicable,
    tdsMonthly: n(v.tdsMonthly) || undefined,
    active: true,
  };
}

/* ---------------- Payslip computation (run generation + LOP recompute) ------- */

/** Per-day rate = gross / days-in-month (used for Loss-of-Pay deduction). */
export function perDayRate(grossMonthly: number, daysInMonth: number): number {
  if (daysInMonth <= 0) return 0;
  return grossMonthly / daysInMonth;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // month is 1–12
}

/**
 * Computes a payslip from a salary structure for a given run month, applying
 * `lopDays` Loss-of-Pay. Statutory deductions use India defaults from
 * `@/features/finance/meta`: PF on basic; ESI/PT on the *earned* (post-LOP) gross.
 * LOP means days not worked aren't earned, so ESI (0.75% of gross, ≤₹21k ceiling)
 * and the PT slab must be assessed on what was actually earned this month — using
 * the full contractual gross would under/over-deduct when there is LOP.
 */
export function computePayslip(
  s: SalaryStructure,
  ctx: { runId: string; month: number; year: number; label: string; lopDays?: number },
): Omit<Payslip, 'id'> {
  const other = (s.otherEarnings ?? []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const earnings: PayslipEarnings = {
    basic: s.basic ?? 0,
    hra: s.hra ?? 0,
    da: s.da ?? 0,
    conveyance: s.conveyance ?? 0,
    special: s.specialAllowance ?? 0,
    other,
  };
  const grossEarnings = s.grossMonthly ?? grossFromStructure(s);

  const dim = daysInMonth(ctx.year, ctx.month);
  const lopDays = Math.max(0, Math.min(ctx.lopDays ?? 0, dim));
  const lop = Math.round(perDayRate(grossEarnings, dim) * lopDays);
  // Earned gross = contractual gross minus the LOP-forfeited amount. ESI/PT are
  // assessed on this (not the full gross) so deductions track actual earnings.
  const earnedGross = Math.max(0, grossEarnings - lop);

  const deductions: PayslipDeductions = {
    pf: computePF(earnings.basic, s.pfApplicable),
    esi: computeESI(earnedGross, s.esiApplicable),
    pt: computePT(earnedGross, s.ptApplicable),
    tds: s.tdsMonthly ?? 0,
    lop,
    other: 0,
  };
  const totalDeductions = deductions.pf + deductions.esi + deductions.pt + deductions.tds + deductions.lop + deductions.other;
  const netPay = Math.max(0, grossEarnings - totalDeductions);

  return {
    schoolId: s.schoolId,
    runId: ctx.runId,
    month: ctx.month,
    year: ctx.year,
    label: ctx.label,
    staffId: s.staffId,
    staffName: s.staffName ?? s.staffId,
    designation: s.designation,
    earnings,
    deductions,
    grossEarnings,
    totalDeductions,
    netPay,
    paidDays: dim - lopDays,
    lopDays,
    status: 'generated',
  };
}

export function grossFromStructure(s: SalaryStructure): number {
  const other = (s.otherEarnings ?? []).reduce((sum, o) => sum + (o.amount || 0), 0);
  return (s.basic ?? 0) + (s.hra ?? 0) + (s.da ?? 0) + (s.conveyance ?? 0) + (s.specialAllowance ?? 0) + other;
}

/** A salary structure is "active" (eligible for runs) when it has a positive gross. */
export function isStructureActive(s: SalaryStructure): boolean {
  return s.active !== false && grossFromStructure(s) > 0;
}
