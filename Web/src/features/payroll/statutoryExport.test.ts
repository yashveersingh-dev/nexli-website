import { describe, it, expect } from 'vitest';
import {
  STATUTORY_CSV_HEADERS,
  statutoryTotal,
  sumStatutory,
  buildStatutoryCsv,
} from './statutoryExport';
import type { Payslip } from '@/types/finance';

/**
 * Statutory challan CSV builder tests (P2-03). Assert column order, per-row math,
 * sorting, totals, and CSV quoting of names containing commas.
 */

function payslip(over: Partial<Payslip> & Pick<Payslip, 'staffName'>): Payslip {
  return {
    id: over.id ?? `slip-${over.staffName}`,
    schoolId: 'sch1',
    runId: 'run1',
    month: 6,
    year: 2026,
    label: 'June 2026',
    staffId: over.staffId ?? 'stf1',
    staffName: over.staffName,
    designation: over.designation,
    earnings: over.earnings ?? { basic: 0, hra: 0, da: 0, conveyance: 0, special: 0, other: 0 },
    deductions: over.deductions ?? { pf: 0, esi: 0, pt: 0, tds: 0, lop: 0, other: 0 },
    grossEarnings: over.grossEarnings ?? 0,
    totalDeductions: over.totalDeductions ?? 0,
    netPay: over.netPay ?? 0,
    status: 'generated',
  };
}

const zoya = payslip({
  staffName: 'Zoya', designation: 'Teacher',
  grossEarnings: 21000,
  deductions: { pf: 1800, esi: 158, pt: 200, tds: 0, lop: 0, other: 0 },
  netPay: 18842,
});

const amir = payslip({
  staffName: 'Amir, Jr', designation: 'Clerk',
  grossEarnings: 15000,
  deductions: { pf: 1800, esi: 113, pt: 200, tds: 500, lop: 0, other: 0 },
  netPay: 12387,
});

describe('statutoryTotal', () => {
  it('sums PF + ESI + PT + TDS only (excludes LOP/other)', () => {
    expect(statutoryTotal(zoya)).toBe(1800 + 158 + 200 + 0); // 2158
    expect(statutoryTotal(amir)).toBe(1800 + 113 + 200 + 500); // 2613
  });
});

describe('sumStatutory', () => {
  it('totals each statutory column across payslips', () => {
    const t = sumStatutory([zoya, amir]);
    expect(t.gross).toBe(36000);
    expect(t.pf).toBe(3600);
    expect(t.esi).toBe(271);
    expect(t.pt).toBe(400);
    expect(t.tds).toBe(500);
    expect(t.total).toBe(2158 + 2613); // 4771
    expect(t.net).toBe(18842 + 12387); // 31229
  });
  it('empty input yields all zeros', () => {
    expect(sumStatutory([])).toEqual({ gross: 0, pf: 0, esi: 0, pt: 0, tds: 0, total: 0, net: 0 });
  });
});

describe('buildStatutoryCsv', () => {
  const csv = buildStatutoryCsv([zoya, amir]);
  const lines = csv.split('\r\n');

  it('uses CRLF line endings', () => {
    expect(csv.includes('\r\n')).toBe(true);
  });

  it('first line is the documented header row in order', () => {
    expect(lines[0]).toBe(STATUTORY_CSV_HEADERS.join(','));
    expect(STATUTORY_CSV_HEADERS).toEqual([
      'Employee', 'Designation', 'Gross', 'PF (EPF)', 'ESI', 'PT', 'TDS', 'Total statutory', 'Net pay',
    ]);
  });

  it('rows are sorted by staff name (Amir before Zoya)', () => {
    // Amir, Jr sorts before Zoya — its name contains a comma so it must be quoted.
    expect(lines[1]).toBe('"Amir, Jr",Clerk,15000,1800,113,200,500,2613,12387');
    expect(lines[2]).toBe('Zoya,Teacher,21000,1800,158,200,0,2158,18842');
  });

  it('has exactly header + one row per payslip', () => {
    expect(lines).toHaveLength(3);
  });

  it('quotes a field containing a comma (CSV injection / column-split safety)', () => {
    expect(lines[1].startsWith('"Amir, Jr"')).toBe(true);
  });

  it('renders a blank designation as an empty cell', () => {
    const noDesig = buildStatutoryCsv([payslip({ staffName: 'Bob', grossEarnings: 5000 })]);
    const row = noDesig.split('\r\n')[1];
    expect(row).toBe('Bob,,5000,0,0,0,0,0,0');
  });
});
