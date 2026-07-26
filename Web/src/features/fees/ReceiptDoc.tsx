import { formatINR, formatDate } from '@/lib/format';
import { PAYMENT_METHOD_META } from '@/features/finance/meta';
import type { FeePayment } from '@/types/finance';

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

interface SchoolLike { name?: string; addressLine?: string; city?: string; state?: string; currentAcademicYear?: string }

/** Printable fee receipt. Add className `fin-print` on the wrapper to target print. */
export function ReceiptDoc({ payment, school, className }: { payment: FeePayment; school?: SchoolLike | null; className?: string }) {
  const method = PAYMENT_METHOD_META[payment.method]?.label ?? payment.method;
  return (
    <div className={`fin-doc ${className ?? ''}`}>
      <div className="fin-doc__head">
        <div>
          <div className="fin-doc__title">{school?.name ?? 'Fee Receipt'}</div>
          {(school?.addressLine || school?.city) && (
            <div className="fin-doc__no">{[school?.addressLine, school?.city, school?.state].filter(Boolean).join(', ')}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>FEE RECEIPT</div>
          <div className="fin-doc__no">{payment.receiptNo}</div>
          <div className="fin-doc__no">{formatDate(payment.paidAt)}</div>
        </div>
      </div>

      <div className="fin-kv-list" style={{ gap: 6 }}>
        <div className="nx-kv"><span className="nx-kv__k">Received from</span><span className="nx-kv__v">{payment.studentName}{payment.admissionNo ? ` (${payment.admissionNo})` : ''}</span></div>
        {payment.invoiceTitle && <div className="nx-kv"><span className="nx-kv__k">Towards</span><span className="nx-kv__v">{payment.invoiceTitle}</span></div>}
        <div className="nx-kv"><span className="nx-kv__k">Mode</span><span className="nx-kv__v">{method}{payment.reference ? ` · ${payment.reference}` : ''}</span></div>
        {payment.bankName && <div className="nx-kv"><span className="nx-kv__k">Bank</span><span className="nx-kv__v">{payment.bankName}</span></div>}
        {school?.currentAcademicYear && <div className="nx-kv"><span className="nx-kv__k">Academic year</span><span className="nx-kv__v">{school.currentAcademicYear}</span></div>}
      </div>

      <div className="fin-doc__total">
        <span>Amount received</span>
        <span className="fin-amount fin-amount--paid">{formatINR(payment.amount)}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{inWords(payment.amount)}</p>

      <div className="fin-doc__sign">
        {payment.recordedByName ? `Received by ${payment.recordedByName}` : 'Authorised signatory'}
      </div>
    </div>
  );
}
