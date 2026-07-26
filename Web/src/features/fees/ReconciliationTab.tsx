import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Select } from '@/components/form';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { formatINR, formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { usePaymentsBetween, useOpenInvoices, reconcileSummary, outstandingTotal } from '@/features/finance/data';
import { PAYMENT_METHOD_META } from '@/features/finance/meta';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Build the last `n` month periods (newest first) as { value 'YYYY-MM', label, from, to }. */
function recentMonths(n: number): { value: string; label: string; from: number; to: number }[] {
  const out: { value: string; label: string; from: number; to: number }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const from = new Date(y, m, 1).getTime();
    const to = new Date(y, m + 1, 1).getTime();
    out.push({ value: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${MONTHS[m]} ${y}`, from, to });
    d.setMonth(m - 1);
  }
  return out;
}

/**
 * Reconciliation summary (collected vs outstanding, matched vs unmatched receipts)
 * for a selected month. Reads are SCOPED — payments to the chosen month's window
 * and invoices to open balances only — so nothing here introduces an unbounded
 * full-collection read. "Matched" = receipts booked against an invoice; "unmatched"
 * = general/advance receipts that still need allocating.
 */
export function ReconciliationTab() {
  const { schoolId } = useSession();
  const periods = useMemo(() => recentMonths(12), []);
  const [periodValue, setPeriodValue] = useState(periods[0]?.value ?? '');
  const period = periods.find((p) => p.value === periodValue) ?? periods[0];

  const { data: payments, loading: pLoading, error: pError } = usePaymentsBetween(schoolId, period?.from, period?.to);
  const { data: openInvoices, loading: iLoading } = useOpenInvoices(schoolId);

  const summary = useMemo(() => reconcileSummary(payments), [payments]);
  const outstanding = useMemo(() => outstandingTotal(openInvoices), [openInvoices]);

  const unmatched = useMemo(
    () => payments.filter((p) => p.status === 'cleared' && !p.invoiceId).sort((a, b) => b.paidAt - a.paidAt),
    [payments],
  );

  if (pError) {
    return <EmptyState icon="alert-triangle" title="Couldn't load reconciliation data" message="There was a problem fetching payments. Please try again." />;
  }

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select value={periodValue} onChange={(e) => setPeriodValue(e.target.value)} aria-label="Reconciliation period"
          options={periods.map((p) => ({ value: p.value, label: p.label }))} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {period ? `${formatDate(period.from)} – ${formatDate(period.to - 1)}` : ''}
        </span>
      </div>

      {pLoading || iLoading ? (
        <Skeleton height={280} />
      ) : (
        <>
          <div className="kpi-grid">
            <KPICard icon="wallet" label="Collected (period)" count={summary.collected} format="inr" sub={`${summary.receipts} receipts`} />
            <KPICard icon="check-circle" label="Matched to invoices" count={summary.matched} format="inr" sub={`${summary.matchedCount} receipts`} subColor="var(--success)" />
            <KPICard icon="help-circle" label="Unmatched" count={summary.unmatched} format="inr" sub={`${summary.unmatchedCount} to allocate`} subColor={summary.unmatchedCount ? 'var(--warning)' : undefined} />
            <KPICard icon="credit-card" label="Outstanding (now)" count={outstanding} format="inr" subColor="var(--warning)" sub="across open invoices" />
          </div>

          {(summary.pendingCount > 0 || summary.bouncedCount > 0) && (
            <div className="kpi-grid" style={{ marginTop: 12 }}>
              <KPICard icon="clock" label="Pending / in clearing" count={summary.pending} format="inr" sub={`${summary.pendingCount} receipts`} subColor="var(--warning)" />
              <KPICard icon="alert-triangle" label="Bounced" count={summary.bounced} format="inr" sub={`${summary.bouncedCount} receipts`} subColor={summary.bouncedCount ? 'var(--danger)' : undefined} />
            </div>
          )}

          <div style={{ margin: '16px 0' }}>
            <InfoCard icon="info" title="How reconciliation works">
              Collected counts cleared receipts in the selected month. <strong>Matched</strong> receipts are booked
              against a specific invoice; <strong>unmatched</strong> ones are general/advance payments that still
              need allocating to an invoice. Outstanding is the live balance across all open invoices.
            </InfoCard>
          </div>

          <Panel title="Unmatched receipts" sub={unmatched.length ? `${unmatched.length} in period` : undefined}>
            {unmatched.length === 0 ? (
              <EmptyState icon="check-circle" title="Everything is matched"
                message="Every cleared receipt this month is booked against an invoice. Nothing to allocate." />
            ) : (
              <div className="fin-kv-list" style={{ gap: 0 }}>
                {unmatched.map((p) => (
                  <Link key={p.id} to={`/fees/receipt/${p.id}`} className="nx-noticerow">
                    <span className="nx-noticerow__icon is-normal"><Icon name={PAYMENT_METHOD_META[p.method]?.icon ?? 'wallet'} size={15} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="nx-noticerow__title">{p.studentName}</div>
                      <div className="nx-noticerow__time">{p.receiptNo} · {formatDate(p.paidAt)} · {PAYMENT_METHOD_META[p.method]?.label}</div>
                    </div>
                    <Badge variant="warning">Unallocated</Badge>
                    <span className="fin-amount fin-amount--paid">{formatINR(p.amount)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
