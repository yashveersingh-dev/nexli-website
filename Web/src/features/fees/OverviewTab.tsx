import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel, PanelAction } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { formatINR, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useOpenInvoices, usePaymentsSince, useRecentPayments } from '@/features/finance/data';
import { PAYMENT_METHOD_META } from '@/features/finance/meta';
import { studentDue } from './feeSchema';

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();

export function OverviewTab() {
  const { schoolId } = useSession();
  // SCOPED reads (Spark-tier): only open-balance invoices feed Outstanding/Defaulters
  // (paid/cancelled contribute 0, so totals are unchanged); payments are scoped to
  // this month for the collected KPIs; the recent list is a bounded top-N query.
  const monthStart = useMemo(() => startOfMonth(), []);
  const { data: invoices, loading: iLoading, error: iError } = useOpenInvoices(schoolId);
  const { data: monthPayments, loading: pLoading, error: pError } = usePaymentsSince(schoolId, monthStart);
  const { data: recent, loading: rLoading } = useRecentPayments(schoolId, 6);

  const kpis = useMemo(() => {
    const today = startOfDay();
    let collectedToday = 0, collectedMonth = 0;
    for (const p of monthPayments) {
      if (p.status === 'bounced' || p.status === 'refunded') continue;
      if (p.paidAt >= today) collectedToday += p.amount;
      collectedMonth += p.amount; // already scoped to >= monthStart
    }
    const byStudent = new Map<string, { netAmount: number; paidAmount: number; status: string }[]>();
    for (const inv of invoices) {
      const arr = byStudent.get(inv.studentId) ?? [];
      arr.push(inv);
      byStudent.set(inv.studentId, arr);
    }
    let outstanding = 0, defaulters = 0;
    for (const [, invs] of byStudent) {
      const { due } = studentDue(invs);
      outstanding += due;
      if (due > 0) defaulters++;
    }
    return { collectedToday, collectedMonth, outstanding, defaulters };
  }, [monthPayments, invoices]);

  if (iLoading || pLoading || rLoading) return <Skeleton height={320} />;
  if (iError || pError) {
    return <EmptyState icon="alert-triangle" title="Couldn't load collection data" message="There was a problem fetching invoices or payments. Please try again." />;
  }

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="wallet" label="Collected today" count={kpis.collectedToday} format="inr" />
        <KPICard icon="trending-up" label="This month" count={kpis.collectedMonth} format="inr" />
        <KPICard icon="credit-card" label="Outstanding" count={kpis.outstanding} format="inr" subColor="var(--warning)" />
        <KPICard icon="alert-triangle" label="Defaulters" count={kpis.defaulters} format="us" sub={kpis.defaulters ? 'students with dues' : 'all clear'} subColor={kpis.defaulters ? 'var(--danger)' : 'var(--success)'} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <InfoCard icon="file-text" title="How collection works">
          Open a student from the Student ledger and choose Collect payment. Recording a payment auto-generates a numbered receipt and updates that invoice's paid, due and status.
        </InfoCard>
      </div>

      <Panel title="Recent payments" headerRight={<PanelAction><Link to="/fees" style={{ color: 'inherit' }}>Payments tab</Link></PanelAction>}>
        {recent.length === 0 ? (
          <EmptyState icon="wallet" title="No payments yet" message="Recorded fee payments will appear here." />
        ) : (
          <div className="fin-kv-list" style={{ gap: 0 }}>
            {recent.map((p) => {
              const m = PAYMENT_METHOD_META[p.method];
              return (
                <Link key={p.id} to={`/fees/receipt/${p.id}`} className="nx-noticerow">
                  <span className="nx-noticerow__icon is-normal"><Icon name={m?.icon ?? 'wallet'} size={15} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="nx-noticerow__title">{p.studentName}</div>
                    <div className="nx-noticerow__time">{p.receiptNo} · {formatRelative(p.paidAt)}</div>
                  </div>
                  <span className="fin-amount fin-amount--paid">{formatINR(p.amount)}</span>
                  {p.status !== 'cleared' && <Badge variant={p.status === 'bounced' ? 'danger' : 'muted'}>{p.status}</Badge>}
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
