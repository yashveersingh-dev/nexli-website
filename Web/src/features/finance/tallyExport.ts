import type { FeePayment, Expense, PayrollRun } from '@/types/finance';

/**
 * Tally XML export (P2-02) — Spark-native, NO new deps. Builds a Tally-importable
 * `<ENVELOPE>` of accounting vouchers as a string and downloads it as `.xml`, the
 * same client-side Blob pattern used elsewhere (see events/exportRegistrations).
 *
 * Import path in Tally: Gateway of Tally → Import Data → Vouchers → pick the file.
 * Voucher mapping:
 *   • Fee payments  → Receipt vouchers (debit bank/cash, credit fee income).
 *   • Expenses      → Payment vouchers (debit expense ledger, credit bank/cash).
 *   • Payroll runs  → Payment vouchers (debit Salaries, credit bank/cash) — one
 *                     voucher per run for the NET disbursed (statutory splits are
 *                     in the challan export, P2-03).
 *
 * Ledger names are CONFIGURABLE placeholders (a school maps them to its own chart
 * of accounts). They must already exist in the company, or Tally will report
 * "Ledger not found" on import — documented for the user in the UI note.
 */

/** Ledger names a school can override to match its Tally chart of accounts. */
export interface TallyLedgers {
  /** Bank/cash ledger money is received into / paid out of. */
  bank: string;
  /** Income ledger fee receipts are credited to. */
  feeIncome: string;
  /** Expense ledger that procurement/expense payments are debited to. */
  expense: string;
  /** Salaries/wages ledger payroll is debited to. */
  salaries: string;
}

export const DEFAULT_TALLY_LEDGERS: TallyLedgers = {
  bank: 'Bank Account',
  feeIncome: 'Fee Income',
  expense: 'General Expenses',
  salaries: 'Salaries',
};

/** XML-escape a value for safe interpolation into element text / attributes. */
function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Tally date format is `YYYYMMDD`. */
function tallyDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Round to 2 dp and render as a plain decimal string (Tally amount format). */
function amt(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * One double-entry voucher. In Tally a Receipt debits bank (negative AMOUNT) and
 * credits the income ledger (positive); a Payment is the mirror. We model that
 * with the two ledger lines + signs the voucher type expects.
 */
interface VoucherLine {
  ledger: string;
  /** Positive = credit, negative = debit, in Tally's AMOUNT sign convention. */
  amount: number;
}

function buildVoucher(o: {
  type: 'Receipt' | 'Payment';
  dateMs: number;
  voucherNo: string;
  narration: string;
  lines: VoucherLine[];
}): string {
  const date = tallyDate(o.dateMs);
  const entries = o.lines
    .map(
      (l) => `        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(l.ledger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${l.amount < 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${amt(l.amount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`,
    )
    .join('\n');
  return `      <VOUCHER VCHTYPE="${esc(o.type)}" ACTION="Create">
        <DATE>${date}</DATE>
        <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
        <VOUCHERTYPENAME>${esc(o.type)}</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${esc(o.voucherNo)}</VOUCHERNUMBER>
        <NARRATION>${esc(o.narration)}</NARRATION>
${entries}
      </VOUCHER>`;
}

/** Wrap voucher fragments in the Tally import envelope. */
function envelope(vouchers: string[]): string {
  const messages = vouchers.map((v) => `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n${v}\n    </TALLYMESSAGE>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
${messages}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/* ------------------------------- Builders --------------------------------- */

/** Fee payments → Receipt vouchers (debit bank, credit fee income). */
export function buildFeePaymentsTallyXml(payments: FeePayment[], ledgers: TallyLedgers = DEFAULT_TALLY_LEDGERS): string {
  const vouchers = payments
    .filter((p) => (p.amount ?? 0) > 0 && p.status !== 'bounced' && p.status !== 'refunded')
    .map((p) =>
      buildVoucher({
        type: 'Receipt',
        dateMs: p.paidAt,
        voucherNo: p.receiptNo,
        narration: `Fee receipt ${p.receiptNo} — ${p.studentName}${p.invoiceTitle ? ` (${p.invoiceTitle})` : ''}`,
        lines: [
          { ledger: ledgers.bank, amount: -p.amount },
          { ledger: ledgers.feeIncome, amount: p.amount },
        ],
      }),
    );
  return envelope(vouchers);
}

/** Expenses → Payment vouchers (debit expense ledger, credit bank). */
export function buildExpensesTallyXml(expenses: Expense[], ledgers: TallyLedgers = DEFAULT_TALLY_LEDGERS): string {
  const vouchers = expenses
    .filter((e) => (e.amount ?? 0) > 0 && e.status !== 'rejected')
    .map((e) =>
      buildVoucher({
        type: 'Payment',
        dateMs: e.date,
        voucherNo: e.expenseNo,
        narration: `${e.description}${e.vendorName ? ` — ${e.vendorName}` : ''}`,
        lines: [
          { ledger: ledgers.expense, amount: -e.amount },
          { ledger: ledgers.bank, amount: e.amount },
        ],
      }),
    );
  return envelope(vouchers);
}

/** Payroll runs → one Payment voucher each for the net disbursed. */
export function buildPayrollTallyXml(runs: PayrollRun[], ledgers: TallyLedgers = DEFAULT_TALLY_LEDGERS): string {
  const vouchers = runs
    .filter((r) => (r.totalNet ?? 0) > 0)
    .map((r) =>
      buildVoucher({
        type: 'Payment',
        dateMs: r.paidAt ?? r.finalizedAt ?? Date.now(),
        voucherNo: `PAY-${r.id}`,
        narration: `Payroll ${r.label} — ${r.staffCount} staff (net)`,
        lines: [
          { ledger: ledgers.salaries, amount: -r.totalNet },
          { ledger: ledgers.bank, amount: r.totalNet },
        ],
      }),
    );
  return envelope(vouchers);
}

/* ------------------------------- Download --------------------------------- */

/** Trigger a browser download of an XML string as `<stem>.xml`. */
export function downloadXml(stem: string, xml: string): void {
  const safe = stem.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tally-export';
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
