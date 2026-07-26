import type { Payslip, PayrollRun } from '@/types/finance';

/**
 * EPF / ESI / TDS / PT challan-style export (P2-03) — Spark-native, NO new deps.
 * Produces (a) a CSV of per-employee statutory deductions for a payroll run, and
 * (b) a print-friendly summary (the same `window.print()` model used for receipts
 * and certificates). Intended as a working sheet for preparing the monthly EPFO /
 * ESIC / TDS challans — it is NOT a government file format, which varies and needs
 * UANs/IP numbers a school configures per staff (noted in the UI).
 */

/** Escape one CSV cell (quote-wrap on comma / quote / newline). */
function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toCsv(headers: readonly string[], rows: string[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return lines.join('\r\n');
}

const num = (n: number) => String(Math.round((n + Number.EPSILON) * 100) / 100);

export const STATUTORY_CSV_HEADERS = [
  'Employee', 'Designation', 'Gross', 'PF (EPF)', 'ESI', 'PT', 'TDS', 'Total statutory', 'Net pay',
] as const;

/** Sum of the statutory deduction lines (excludes LOP/other). */
export function statutoryTotal(p: Payslip): number {
  const d = p.deductions;
  return (d.pf ?? 0) + (d.esi ?? 0) + (d.pt ?? 0) + (d.tds ?? 0);
}

export interface StatutoryTotals { gross: number; pf: number; esi: number; pt: number; tds: number; total: number; net: number }

export function sumStatutory(slips: Payslip[]): StatutoryTotals {
  return slips.reduce<StatutoryTotals>(
    (acc, p) => ({
      gross: acc.gross + (p.grossEarnings ?? 0),
      pf: acc.pf + (p.deductions.pf ?? 0),
      esi: acc.esi + (p.deductions.esi ?? 0),
      pt: acc.pt + (p.deductions.pt ?? 0),
      tds: acc.tds + (p.deductions.tds ?? 0),
      total: acc.total + statutoryTotal(p),
      net: acc.net + (p.netPay ?? 0),
    }),
    { gross: 0, pf: 0, esi: 0, pt: 0, tds: 0, total: 0, net: 0 },
  );
}

function sorted(slips: Payslip[]): Payslip[] {
  return slips.slice().sort((a, b) => a.staffName.localeCompare(b.staffName));
}

/** Build the statutory-deductions CSV for a run's payslips. */
export function buildStatutoryCsv(slips: Payslip[]): string {
  const rows = sorted(slips).map((p) => [
    p.staffName,
    p.designation ?? '',
    num(p.grossEarnings ?? 0),
    num(p.deductions.pf ?? 0),
    num(p.deductions.esi ?? 0),
    num(p.deductions.pt ?? 0),
    num(p.deductions.tds ?? 0),
    num(statutoryTotal(p)),
    num(p.netPay ?? 0),
  ]);
  return toCsv(STATUTORY_CSV_HEADERS, rows);
}

/** Download the statutory CSV (UTF-8 BOM so Excel renders names correctly). */
export function downloadStatutoryCsv(run: Pick<PayrollRun, 'label' | 'id'>, slips: Payslip[]): void {
  const csv = buildStatutoryCsv(slips);
  const stem = `statutory-${(run.label || run.id).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()}`;
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${stem}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inr = (n: number) => `₹${(Math.round(n) || 0).toLocaleString('en-IN')}`;

/**
 * Build a self-contained, print-ready HTML challan summary for a run: a
 * per-employee statutory table + totals (PF / ESI / PT / TDS), with a Print
 * button. Self-contained so it can be opened in a popup and printed / saved as PDF.
 */
export function buildStatutoryHtml(opts: { schoolName: string; run: Pick<PayrollRun, 'label'>; slips: Payslip[] }): string {
  const list = sorted(opts.slips);
  const t = sumStatutory(list);
  const rows = list
    .map(
      (p) => `<tr>
        <td>${esc(p.staffName)}</td>
        <td>${esc(p.designation ?? '—')}</td>
        <td class="num">${inr(p.grossEarnings ?? 0)}</td>
        <td class="num">${inr(p.deductions.pf ?? 0)}</td>
        <td class="num">${inr(p.deductions.esi ?? 0)}</td>
        <td class="num">${inr(p.deductions.pt ?? 0)}</td>
        <td class="num">${inr(p.deductions.tds ?? 0)}</td>
        <td class="num">${inr(statutoryTotal(p))}</td>
      </tr>`,
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Statutory deductions — ${esc(opts.run.label)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #14110c; margin: 0; padding: 22px; background: #f4f1ea; }
  .wrap { max-width: 1040px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 28px 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #6b6354; font-size: 13px; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 7px 9px; border: 1px solid #e2ddd2; text-align: left; }
  th { background: #f0ece2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; background: #faf8f2; }
  .note { font-size: 11.5px; color: #6b6354; margin-top: 14px; }
  .print-btn { display: block; margin: 18px auto 0; padding: 10px 22px; font-size: 14px; background: #C6A55C; color: #1a1206; border: 0; border-radius: 8px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .wrap { border: 0; } .print-btn { display: none; } }
</style></head>
<body>
  <div class="wrap">
    <h1>${esc(opts.schoolName)}</h1>
    <p class="sub">Statutory deductions — ${esc(opts.run.label)} · ${list.length} employees</p>
    <table>
      <thead>
        <tr>
          <th>Employee</th><th>Designation</th>
          <th class="num">Gross</th><th class="num">PF (EPF)</th><th class="num">ESI</th>
          <th class="num">PT</th><th class="num">TDS</th><th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
${rows || '<tr><td colspan="8" style="text-align:center;color:#6b6354">No payslips</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">Totals</td>
          <td class="num">${inr(t.gross)}</td>
          <td class="num">${inr(t.pf)}</td>
          <td class="num">${inr(t.esi)}</td>
          <td class="num">${inr(t.pt)}</td>
          <td class="num">${inr(t.tds)}</td>
          <td class="num">${inr(t.total)}</td>
        </tr>
      </tfoot>
    </table>
    <p class="note">
      Working sheet for EPFO / ESIC / TDS challan preparation. Government ECR / challan
      files require employee UAN, ESIC IP numbers and employer codes configured per
      establishment — add those before filing.
    </p>
  </div>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

/** Open the statutory summary in a print window. Returns false if popup-blocked. */
export function printStatutorySummary(opts: { schoolName: string; run: Pick<PayrollRun, 'label'>; slips: Payslip[] }): boolean {
  const w = window.open('', '_blank', 'width=1100,height=800');
  if (!w) return false;
  w.document.open();
  w.document.write(buildStatutoryHtml(opts));
  w.document.close();
  w.focus();
  return true;
}
