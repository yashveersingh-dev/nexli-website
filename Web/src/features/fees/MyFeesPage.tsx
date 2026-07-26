import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatINR, formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { useInvoices, usePayments, useFinanceSettings } from '@/features/finance/data';
import { INVOICE_STATUS_META, PAYMENT_METHOD_META } from '@/features/finance/meta';
import { studentDue } from './feeSchema';
import { PaymentInfoCard } from './PaymentInfoCard';

/** Parent/student fee view at /fees: dues, invoices, payment history, how-to-pay. */
export function MyFeesPage() {
  const { schoolId, role, member } = useSession();
  const { data: settings } = useFinanceSettings(schoolId);
  const isStudent = role === 'student';

  const childIds = useMemo<string[]>(
    () => (isStudent ? (member?.studentId ? [member.studentId] : []) : member?.childStudentIds ?? []),
    [isStudent, member],
  );
  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);

  if (sLoading) return <div className="nx-page"><Skeleton height={48} /><Skeleton height={220} /></div>;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Fees</h1>
          <p className="nx-page__sub">{isStudent ? 'Your fee dues, invoices and receipts.' : "Your children's fees and payments."}</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Panel><EmptyState icon="credit-card" title="No fee details yet" message="Fee details will appear here once your school links your account to a student." /></Panel>
      ) : (
        children.map((c) => (
          <ChildFees key={c.id} schoolId={schoolId} studentId={c.id} name={c.fullName} photoUrl={c.photoUrl}
            sub={[c.gradeName, c.sectionName].filter(Boolean).join(' · ')} showHeader={children.length > 1} />
        ))
      )}

      {children.length > 0 && <PaymentInfoCard settings={settings} />}
    </div>
  );
}

function ChildFees({ schoolId, studentId, name, photoUrl, sub, showHeader }: {
  schoolId?: string; studentId: string; name: string; photoUrl?: string; sub: string; showHeader: boolean;
}) {
  const { data: invoices, loading: iLoading } = useInvoices(schoolId, studentId);
  const { data: payments } = usePayments(schoolId, studentId);
  const totals = useMemo(() => studentDue(invoices), [invoices]);
  const sortedInv = useMemo(() => [...invoices].filter((i) => i.status !== 'cancelled').sort((a, b) => (b.issuedDate ?? 0) - (a.issuedDate ?? 0)), [invoices]);
  const sortedPay = useMemo(() => [...payments].sort((a, b) => b.paidAt - a.paidAt).slice(0, 6), [payments]);

  const body = (
    <>
      <div className="fin-summary">
        <div className="fin-summary__card"><div className="fin-summary__label">Outstanding</div><div className="fin-summary__value" style={{ color: totals.due > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatINR(totals.due)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Paid</div><div className="fin-summary__value">{formatINR(totals.paid)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Billed</div><div className="fin-summary__value fin-amount--muted">{formatINR(totals.billed)}</div></div>
      </div>

      {iLoading ? <Skeleton height={120} /> : (
        <>
          <h3 className="nx-subhead">Invoices</h3>
          {sortedInv.length === 0 ? (
            <EmptyState icon="file-text" title="No fees billed yet" message="Fee invoices will appear here when raised by the school." />
          ) : (
            <div className="fin-kv-list" style={{ gap: 8, marginBottom: 16 }}>
              {sortedInv.map((inv) => {
                const due = Math.max(0, inv.netAmount - inv.paidAmount);
                const overdue = inv.status !== 'paid' && inv.dueDate != null && Date.now() > inv.dueDate;
                return (
                  <div key={inv.id} className="fin-invrow">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="fin-invrow__title">{inv.title}</div>
                      <div className="fin-invrow__meta">{formatINR(inv.netAmount)}{inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant={overdue ? 'danger' : INVOICE_STATUS_META[inv.status].variant}>{overdue ? 'Overdue' : INVOICE_STATUS_META[inv.status].label}</Badge>
                      {due > 0 && <div className="fin-amount fin-amount--due" style={{ fontSize: 13, marginTop: 3 }}>{formatINR(due)} due</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sortedPay.length > 0 && (
            <>
              <h3 className="nx-subhead">Recent receipts</h3>
              <div className="fin-kv-list" style={{ gap: 0 }}>
                {sortedPay.map((p) => (
                  <Link key={p.id} to={`/fees/receipt/${p.id}`} className="nx-noticerow">
                    <span className="nx-noticerow__icon is-normal"><Icon name={PAYMENT_METHOD_META[p.method]?.icon ?? 'wallet'} size={15} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="nx-noticerow__title">{p.receiptNo}</div>
                      <div className="nx-noticerow__time">{formatDate(p.paidAt)} · {PAYMENT_METHOD_META[p.method]?.label}</div>
                    </div>
                    <span className="fin-amount fin-amount--paid">{formatINR(p.amount)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );

  if (!showHeader) return <Panel>{body}</Panel>;
  return (
    <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={name} src={photoUrl} size={26} /><span>{name}</span></span>} sub={sub}>
      {body}
    </Panel>
  );
}
