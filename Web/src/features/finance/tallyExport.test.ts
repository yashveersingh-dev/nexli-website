import { describe, it, expect } from 'vitest';
import {
  buildFeePaymentsTallyXml,
  buildExpensesTallyXml,
  buildPayrollTallyXml,
  DEFAULT_TALLY_LEDGERS,
} from './tallyExport';
import type { FeePayment, Expense, PayrollRun } from '@/types/finance';

/**
 * Tally XML voucher-builder tests (P2-02). Assert the import-envelope shape, the
 * double-entry sign convention (debit = negative AMOUNT, ISDEEMEDPOSITIVE=Yes),
 * XML-escaping of free-text names, and the status/amount filters.
 *
 * Dates: build epoch-ms via `new Date(local Y, M, D)` so `tallyDate` (which reads
 * local Y/M/D) is timezone-stable in CI regardless of the runner's TZ.
 */

// 15 June 2026 (local) → tallyDate must render "20260615".
const JUNE_15_2026 = new Date(2026, 5, 15).getTime();

function feePayment(over: Partial<FeePayment> & Pick<FeePayment, 'receiptNo' | 'studentName' | 'amount'>): FeePayment {
  return {
    id: over.id ?? 'pay1',
    schoolId: 'sch1',
    receiptNo: over.receiptNo,
    studentId: 'stu1',
    studentName: over.studentName,
    amount: over.amount,
    method: over.method ?? 'cash',
    paidAt: over.paidAt ?? JUNE_15_2026,
    status: over.status ?? 'cleared',
    invoiceTitle: over.invoiceTitle,
  };
}

describe('envelope structure (shared by all builders)', () => {
  const xml = buildFeePaymentsTallyXml([feePayment({ receiptNo: 'RC-1', studentName: 'Anil', amount: 5000 })]);

  it('declares the XML prolog and Tally import envelope', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<ENVELOPE>');
    expect(xml).toContain('</ENVELOPE>');
    expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    expect(xml).toContain('<REPORTNAME>Vouchers</REPORTNAME>');
    expect(xml).toContain('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
  });

  it('is well-formed in the sense that every opened tag we emit is closed', () => {
    // Cheap structural balance check on the tags this builder produces.
    for (const tag of ['ENVELOPE', 'HEADER', 'BODY', 'IMPORTDATA', 'VOUCHER']) {
      const open = (xml.match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;
      const close = (xml.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
      expect(open).toBe(close);
    }
  });
});

describe('buildFeePaymentsTallyXml', () => {
  it('emits a Receipt voucher with bank debited and fee income credited', () => {
    const xml = buildFeePaymentsTallyXml([
      feePayment({ receiptNo: 'RC-100', studentName: 'Anil', amount: 5000, invoiceTitle: 'Term 1' }),
    ]);
    expect(xml).toContain('<VOUCHER VCHTYPE="Receipt" ACTION="Create">');
    expect(xml).toContain('<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>');
    expect(xml).toContain('<VOUCHERNUMBER>RC-100</VOUCHERNUMBER>');
    expect(xml).toContain('<DATE>20260615</DATE>');
    // Bank line: debit → negative amount → ISDEEMEDPOSITIVE Yes.
    expect(xml).toContain(`<LEDGERNAME>${DEFAULT_TALLY_LEDGERS.bank}</LEDGERNAME>`);
    expect(xml).toContain('<AMOUNT>-5000.00</AMOUNT>');
    // Fee income line: credit → positive amount → ISDEEMEDPOSITIVE No.
    expect(xml).toContain(`<LEDGERNAME>${DEFAULT_TALLY_LEDGERS.feeIncome}</LEDGERNAME>`);
    expect(xml).toContain('<AMOUNT>5000.00</AMOUNT>');
    expect(xml).toContain('<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>');
    expect(xml).toContain('<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>');
  });

  it('XML-escapes special characters in student / invoice names', () => {
    const xml = buildFeePaymentsTallyXml([
      feePayment({ receiptNo: 'RC<2>', studentName: 'Tom & "Jerry" <Co>', amount: 1200 }),
    ]);
    expect(xml).toContain('Tom &amp; &quot;Jerry&quot; &lt;Co&gt;');
    expect(xml).toContain('<VOUCHERNUMBER>RC&lt;2&gt;</VOUCHERNUMBER>');
    // The raw, unescaped ampersand must never appear in output.
    expect(xml).not.toContain('Tom & ');
  });

  it('rounds amounts to 2 decimal places', () => {
    const xml = buildFeePaymentsTallyXml([feePayment({ receiptNo: 'RC-3', studentName: 'X', amount: 1234.5 })]);
    expect(xml).toContain('<AMOUNT>1234.50</AMOUNT>');
    expect(xml).toContain('<AMOUNT>-1234.50</AMOUNT>');
  });

  it('skips bounced, refunded and zero-amount payments', () => {
    const xml = buildFeePaymentsTallyXml([
      feePayment({ receiptNo: 'OK', studentName: 'Keep', amount: 100 }),
      feePayment({ receiptNo: 'B', studentName: 'Bounced', amount: 100, status: 'bounced' }),
      feePayment({ receiptNo: 'R', studentName: 'Refunded', amount: 100, status: 'refunded' }),
      feePayment({ receiptNo: 'Z', studentName: 'Zero', amount: 0 }),
    ]);
    expect(xml).toContain('<VOUCHERNUMBER>OK</VOUCHERNUMBER>');
    expect(xml).not.toContain('Bounced');
    expect(xml).not.toContain('Refunded');
    expect(xml).not.toContain('Zero');
    expect((xml.match(/<VOUCHER /g) ?? []).length).toBe(1);
  });

  it('produces a valid empty envelope when there are no vouchers', () => {
    const xml = buildFeePaymentsTallyXml([]);
    expect(xml).toContain('<ENVELOPE>');
    expect((xml.match(/<VOUCHER /g) ?? []).length).toBe(0);
  });
});

describe('buildExpensesTallyXml', () => {
  it('emits a Payment voucher (expense debited, bank credited) and skips rejected', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', schoolId: 'sch1', expenseNo: 'EXP-1', category: 'utilities',
        description: 'Electricity', vendorName: 'PowerCo & Sons', amount: 3000,
        date: JUNE_15_2026, status: 'paid',
      },
      {
        id: 'e2', schoolId: 'sch1', expenseNo: 'EXP-2', category: 'misc',
        description: 'Rejected one', amount: 999, date: JUNE_15_2026, status: 'rejected',
      },
    ];
    const xml = buildExpensesTallyXml(expenses);
    expect(xml).toContain('<VOUCHER VCHTYPE="Payment" ACTION="Create">');
    expect(xml).toContain('<VOUCHERNUMBER>EXP-1</VOUCHERNUMBER>');
    expect(xml).toContain('Electricity — PowerCo &amp; Sons');
    expect(xml).toContain(`<LEDGERNAME>${DEFAULT_TALLY_LEDGERS.expense}</LEDGERNAME>`);
    expect(xml).toContain('<AMOUNT>-3000.00</AMOUNT>'); // expense debited
    expect(xml).toContain('<AMOUNT>3000.00</AMOUNT>'); // bank credited
    expect(xml).not.toContain('Rejected one');
    expect((xml.match(/<VOUCHER /g) ?? []).length).toBe(1);
  });
});

describe('buildPayrollTallyXml', () => {
  it('emits one Payment voucher per run for the net disbursed and skips zero-net runs', () => {
    const runs: PayrollRun[] = [
      {
        id: 'r1', schoolId: 'sch1', month: 6, year: 2026, label: 'June 2026',
        status: 'paid', staffCount: 12, totalGross: 500000, totalDeductions: 80000,
        totalNet: 420000, paidAt: JUNE_15_2026,
      },
      {
        id: 'r0', schoolId: 'sch1', month: 5, year: 2026, label: 'May 2026',
        status: 'draft', staffCount: 0, totalGross: 0, totalDeductions: 0, totalNet: 0,
      },
    ];
    const xml = buildPayrollTallyXml(runs);
    expect(xml).toContain('<VOUCHERNUMBER>PAY-r1</VOUCHERNUMBER>');
    expect(xml).toContain('Payroll June 2026 — 12 staff (net)');
    expect(xml).toContain(`<LEDGERNAME>${DEFAULT_TALLY_LEDGERS.salaries}</LEDGERNAME>`);
    expect(xml).toContain('<AMOUNT>-420000.00</AMOUNT>'); // salaries debited
    expect(xml).toContain('<AMOUNT>420000.00</AMOUNT>'); // bank credited
    expect((xml.match(/<VOUCHER /g) ?? []).length).toBe(1);
  });
});
