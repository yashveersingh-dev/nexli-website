import { formatINR } from '@/lib/format';
import type { Payslip } from '@/types/finance';

/** Amount → Indian words (mirrors the receipt's inWords). */
function inWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number): string => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ' ' + a[x % 10] : ''}`);
  const three = (x: number): string => (x >= 100 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' + two(x % 100) : ''}` : two(x));
  let num = Math.floor(n);
  const parts: string[] = [];
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (num) parts.push(three(num));
  return parts.join(' ') + ' Rupees only';
}

interface SchoolLike { name?: string; city?: string; state?: string }

const earningRow = (label: string, value: number) => value > 0 ? { label, value } : null;

/** Printable salary slip. Add className `fin-print` on the wrapper to target print. */
export function PayslipDoc({ slip, school, className }: { slip: Payslip; school?: SchoolLike | null; className?: string }) {
  const e = slip.earnings;
  const d = slip.deductions;

  const earnings = [
    earningRow('Basic', e.basic),
    earningRow('HRA', e.hra),
    earningRow('DA', e.da),
    earningRow('Conveyance', e.conveyance),
    earningRow('Special allowance', e.special),
    earningRow('Other earnings', e.other),
  ].filter(Boolean) as { label: string; value: number }[];

  const deductions = [
    earningRow('Provident Fund (PF)', d.pf),
    earningRow('ESI', d.esi),
    earningRow('Professional Tax', d.pt),
    earningRow('TDS', d.tds),
    earningRow('Loss of Pay', d.lop),
    earningRow('Other deductions', d.other),
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div className={`fin-doc ${className ?? ''}`}>
      <div className="fin-doc__head">
        <div>
          <div className="fin-doc__title">{school?.name ?? 'Salary Slip'}</div>
          {(school?.city || school?.state) && (
            <div className="fin-doc__no">{[school?.city, school?.state].filter(Boolean).join(', ')}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>SALARY SLIP</div>
          <div className="fin-doc__no">{slip.label}</div>
        </div>
      </div>

      <div className="fin-kv-list" style={{ gap: 6 }}>
        <div className="nx-kv"><span className="nx-kv__k">Employee</span><span className="nx-kv__v">{slip.staffName}</span></div>
        {slip.designation && <div className="nx-kv"><span className="nx-kv__k">Designation</span><span className="nx-kv__v">{slip.designation}</span></div>}
        <div className="nx-kv"><span className="nx-kv__k">Pay period</span><span className="nx-kv__v">{slip.label}</span></div>
        {slip.paidDays != null && <div className="nx-kv"><span className="nx-kv__k">Paid days</span><span className="nx-kv__v">{slip.paidDays}{(slip.lopDays ?? 0) > 0 ? ` (LOP ${slip.lopDays})` : ''}</span></div>}
      </div>

      <div className="fin-pay-cols" style={{ marginTop: 16 }}>
        <div>
          <div className="pay-block__head">Earnings</div>
          {earnings.length === 0 ? (
            <div className="pay-block__row"><span>—</span><span className="fin-amount">{formatINR(0)}</span></div>
          ) : earnings.map((it) => (
            <div className="pay-block__row" key={it.label}><span>{it.label}</span><span className="fin-amount">{formatINR(it.value)}</span></div>
          ))}
          <div className="pay-block__sub"><span>Gross earnings</span><span className="fin-amount">{formatINR(slip.grossEarnings)}</span></div>
        </div>

        <div>
          <div className="pay-block__head">Deductions</div>
          {deductions.length === 0 ? (
            <div className="pay-block__row"><span>No deductions</span><span className="fin-amount">{formatINR(0)}</span></div>
          ) : deductions.map((it) => (
            <div className="pay-block__row" key={it.label}><span>{it.label}</span><span className="fin-amount">{formatINR(it.value)}</span></div>
          ))}
          <div className="pay-block__sub"><span>Total deductions</span><span className="fin-amount">{formatINR(slip.totalDeductions)}</span></div>
        </div>
      </div>

      <div className="pay-net">
        <span className="pay-net__label">Net pay</span>
        <span className="pay-net__value fin-amount--paid">{formatINR(slip.netPay)}</span>
        {inWords(slip.netPay) && <span className="pay-net__words">{inWords(slip.netPay)}</span>}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14 }}>
        This is a computer-generated salary slip. Statutory deductions (PF/ESI/PT) follow India defaults and may vary by state.
      </p>

      <div className="fin-doc__sign">Authorised signatory</div>
    </div>
  );
}
