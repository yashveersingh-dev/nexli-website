import { describe, it, expect } from 'vitest';
import {
  computePayslip,
  grossFromStructure,
  perDayRate,
  daysInMonth,
  isStructureActive,
} from './salarySchema';
import type { SalaryStructure } from '@/types/finance';

/**
 * HEADLINE FINANCIAL-CORRECTNESS TESTS.
 *
 * `computePayslip` must:
 *   • reduce GROSS earnings by the Loss-of-Pay (LOP) amount, and
 *   • recompute ESI and PT on the *earned* (post-LOP) gross — NOT the full gross —
 *     while PF stays on basic.
 *
 * These lock the audit's flagged risk: if ESI/PT were assessed on the full
 * contractual gross, an employee with LOP would be over/under-deducted.
 *
 * Expected values are hand-computed from `features/finance/meta.ts`:
 *   PF  = round(min(basic, 15000) * 0.12)
 *   ESI = gross <= 21000 ? ceil(gross * 0.0075) : 0
 *   PT  = gross <= 7500 ? 0 : gross <= 10000 ? 175 : 200
 */

/** Build a SalaryStructure fixture (id omitted — computePayslip takes a structure). */
function structure(partial: Partial<SalaryStructure> & Pick<SalaryStructure, 'basic'>): SalaryStructure {
  const basic = partial.basic;
  const hra = partial.hra ?? 0;
  const da = partial.da ?? 0;
  const conveyance = partial.conveyance ?? 0;
  const specialAllowance = partial.specialAllowance ?? 0;
  const otherEarnings = partial.otherEarnings;
  const other = (otherEarnings ?? []).reduce((s, o) => s + o.amount, 0);
  const grossMonthly = partial.grossMonthly ?? basic + hra + da + conveyance + specialAllowance + other;
  return {
    id: 'struct-1',
    schoolId: 'sch1',
    staffId: 'stf1',
    staffName: 'Test Staff',
    designation: 'Teacher',
    basic,
    hra,
    da,
    conveyance,
    specialAllowance,
    otherEarnings,
    grossMonthly,
    ctcAnnual: grossMonthly * 12,
    pfApplicable: partial.pfApplicable ?? true,
    esiApplicable: partial.esiApplicable ?? false,
    ptApplicable: partial.ptApplicable ?? true,
    tdsMonthly: partial.tdsMonthly,
    active: partial.active,
  };
}

const ctx = (over: Partial<{ lopDays: number; month: number; year: number }> = {}) => ({
  runId: 'run1',
  month: over.month ?? 6, // June
  year: over.year ?? 2026,
  label: 'June 2026',
  lopDays: over.lopDays,
});

describe('daysInMonth / perDayRate', () => {
  it('returns calendar days for the month (June = 30)', () => {
    expect(daysInMonth(2026, 6)).toBe(30);
  });
  it('handles February in a leap year (2024 = 29)', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });
  it('handles February in a non-leap year (2026 = 28)', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });
  it('per-day rate is gross / days, 0 when days <= 0', () => {
    expect(perDayRate(30000, 30)).toBe(1000);
    expect(perDayRate(30000, 0)).toBe(0);
  });
});

describe('computePayslip — no LOP', () => {
  const s = structure({
    basic: 15000, hra: 4000, da: 1000, conveyance: 800, specialAllowance: 200,
    pfApplicable: true, esiApplicable: true, ptApplicable: true,
  });
  // gross = 21000 (exactly the ESI ceiling).
  const slip = computePayslip(s, ctx());

  it('gross earnings equal the contractual gross', () => {
    expect(slip.grossEarnings).toBe(21000);
  });
  it('PF is 12% of basic, capped at the 15000 wage ceiling', () => {
    expect(slip.deductions.pf).toBe(1800); // round(15000 * 0.12)
  });
  it('ESI is ceil(0.75% of gross) at the 21000 ceiling', () => {
    expect(slip.deductions.esi).toBe(158); // ceil(21000 * 0.0075) = ceil(157.5)
  });
  it('PT uses the >10000 slab', () => {
    expect(slip.deductions.pt).toBe(200);
  });
  it('no LOP → lop deduction 0 and all days paid', () => {
    expect(slip.deductions.lop).toBe(0);
    expect(slip.lopDays).toBe(0);
    expect(slip.paidDays).toBe(30);
  });
  it('total deductions and net pay reconcile', () => {
    expect(slip.totalDeductions).toBe(1800 + 158 + 200 + 0 + 0 + 0); // 2158
    expect(slip.netPay).toBe(21000 - 2158); // 18842
  });
  it('earnings breakdown is carried through from the structure', () => {
    expect(slip.earnings).toEqual({ basic: 15000, hra: 4000, da: 1000, conveyance: 800, special: 200, other: 0 });
  });
});

describe('computePayslip — LOP reduces gross AND re-bases ESI/PT on earned gross', () => {
  // Full gross = 22000 (ABOVE the 21000 ESI ceiling → ESI would be 0 with no LOP).
  const s = structure({
    basic: 15000, hra: 4000, da: 1500, conveyance: 1000, specialAllowance: 500,
    pfApplicable: true, esiApplicable: true, ptApplicable: true,
  });

  it('without LOP, ESI is 0 because full gross 22000 > 21000 ceiling', () => {
    const noLop = computePayslip(s, ctx());
    expect(noLop.grossEarnings).toBe(22000);
    expect(noLop.deductions.esi).toBe(0);
  });

  it('with 3 LOP days the EARNED gross drops below the ceiling and ESI now applies', () => {
    const slip = computePayslip(s, ctx({ lopDays: 3 })); // June, 30 days
    // perDayRate = 22000/30 = 733.33..., * 3 = 2200 (rounded).
    expect(slip.deductions.lop).toBe(2200);
    // earnedGross = 22000 - 2200 = 19800 (<= 21000) → ESI applies on earned gross.
    expect(slip.deductions.esi).toBe(149); // ceil(19800 * 0.0075) = ceil(148.5)
    // PT also assessed on earned gross (19800 > 10000) → 200.
    expect(slip.deductions.pt).toBe(200);
    // PF unaffected by LOP — still on full basic.
    expect(slip.deductions.pf).toBe(1800);
    // Net + paid days.
    expect(slip.totalDeductions).toBe(1800 + 149 + 200 + 0 + 2200 + 0); // 4349
    expect(slip.netPay).toBe(22000 - 4349); // 17651
    expect(slip.paidDays).toBe(27);
    expect(slip.lopDays).toBe(3);
  });

  it('REGRESSION: ESI on earned gross (149) differs from ESI on full gross (0) — the bug this guards', () => {
    const slip = computePayslip(s, ctx({ lopDays: 3 }));
    // If the code had (incorrectly) used the full 22000 gross, ESI would be 0.
    expect(slip.deductions.esi).not.toBe(0);
    expect(slip.deductions.esi).toBe(149);
  });
});

describe('computePayslip — edge cases', () => {
  it('PF caps on the 15000 ceiling even when basic is higher', () => {
    const s = structure({ basic: 20000, hra: 5000, pfApplicable: true, esiApplicable: false, ptApplicable: false });
    const slip = computePayslip(s, ctx());
    expect(slip.deductions.pf).toBe(1800); // round(min(20000,15000) * 0.12)
  });

  it('lopDays is clamped to the days in the month (cannot exceed them)', () => {
    const s = structure({ basic: 10000, hra: 5000, esiApplicable: false, ptApplicable: false, pfApplicable: false });
    const slip = computePayslip(s, ctx({ lopDays: 99 }));
    expect(slip.lopDays).toBe(30); // clamped to June's 30 days
    expect(slip.paidDays).toBe(0);
    // Full gross forfeited → lop == gross, net 0.
    expect(slip.deductions.lop).toBe(15000);
    expect(slip.netPay).toBe(0);
  });

  it('negative lopDays is treated as 0', () => {
    const s = structure({ basic: 10000, pfApplicable: false, esiApplicable: false, ptApplicable: false });
    const slip = computePayslip(s, ctx({ lopDays: -5 }));
    expect(slip.deductions.lop).toBe(0);
    expect(slip.lopDays).toBe(0);
  });

  it('disabled statutory flags zero out PF/ESI/PT', () => {
    const s = structure({ basic: 15000, hra: 4000, pfApplicable: false, esiApplicable: false, ptApplicable: false });
    const slip = computePayslip(s, ctx());
    expect(slip.deductions.pf).toBe(0);
    expect(slip.deductions.esi).toBe(0);
    expect(slip.deductions.pt).toBe(0);
  });
});

describe('grossFromStructure / isStructureActive', () => {
  it('sums all earning components including otherEarnings', () => {
    const s = structure({
      basic: 10000, hra: 2000, da: 500, conveyance: 300, specialAllowance: 200,
      otherEarnings: [{ name: 'Bonus', amount: 1000 }, { name: 'Stipend', amount: 500 }],
    });
    expect(grossFromStructure(s)).toBe(10000 + 2000 + 500 + 300 + 200 + 1500); // 14500
  });
  it('a structure with positive gross and not explicitly inactive is active', () => {
    expect(isStructureActive(structure({ basic: 10000 }))).toBe(true);
  });
  it('a zero-gross structure is inactive', () => {
    expect(isStructureActive(structure({ basic: 0 }))).toBe(false);
  });
  it('an explicitly inactive structure is inactive even with gross', () => {
    expect(isStructureActive(structure({ basic: 10000, active: false }))).toBe(false);
  });
});
