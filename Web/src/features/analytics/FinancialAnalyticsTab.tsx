import { useMemo } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { LineChart } from '@/components/charts';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatINR, formatINRCompact } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useInvoices, usePayments } from '@/features/finance/data';
import { AiInsightsPanel } from './AiInsightsPanel';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function FinancialAnalyticsTab() {
  const { schoolId } = useSession();
  const { data: invoices, loading: iLoading, error: iError } = useInvoices(schoolId);
  const { data: payments, loading: pLoading, error: pError } = usePayments(schoolId);

  const a = useMemo(() => {
    let billed = 0, collected = 0, outstanding = 0;
    const ageing = { current: 0, d30: 0, d60: 0, d90: 0 };
    const now = Date.now();
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      billed += inv.netAmount ?? 0;
      collected += inv.paidAmount ?? 0;
      const due = Math.max(0, (inv.netAmount ?? 0) - (inv.paidAmount ?? 0));
      outstanding += due;
      if (due > 0) {
        const overdueDays = inv.dueDate ? Math.floor((now - inv.dueDate) / 86400000) : 0;
        if (overdueDays <= 0) ageing.current += due;
        else if (overdueDays <= 30) ageing.d30 += due;
        else if (overdueDays <= 60) ageing.d60 += due;
        else ageing.d90 += due;
      }
    }
    const efficiency = billed > 0 ? Math.round((collected / billed) * 100) : null;

    // last 6 months collection from payments
    const trail: { label: string; total: number }[] = [];
    const base = new Date();
    for (let k = 5; k >= 0; k--) {
      const d = new Date(base.getFullYear(), base.getMonth() - k, 1);
      trail.push({ label: MONTHS[d.getMonth()], total: 0 });
    }
    const idxOf = (ts: number) => {
      const d = new Date(ts);
      const diff = (base.getFullYear() - d.getFullYear()) * 12 + (base.getMonth() - d.getMonth());
      return 5 - diff;
    };
    for (const p of payments) {
      if (p.status === 'bounced' || p.status === 'refunded') continue;
      const i = idxOf(p.paidAt);
      if (i >= 0 && i < 6) trail[i].total += p.amount;
    }
    return { billed, collected, outstanding, efficiency, ageing, trail };
  }, [invoices, payments]);

  if (iLoading || pLoading) return <Skeleton height={320} />;

  if (iError || pError) {
    return <Panel><EmptyState icon="alert-triangle" title="Could not load finance data" message="We could not reach the fee records. Please try again." /></Panel>;
  }

  if (invoices.length === 0 && payments.length === 0) {
    return <Panel><EmptyState icon="credit-card" title="No finance data yet" message="Fee analytics appear once invoices are raised and payments recorded." /></Panel>;
  }

  const ageMax = Math.max(a.ageing.current, a.ageing.d30, a.ageing.d60, a.ageing.d90, 1);
  const ageRows = [
    { label: 'Not due', val: a.ageing.current, color: 'var(--success)' },
    { label: '1–30 days', val: a.ageing.d30, color: 'var(--warning)' },
    { label: '31–60 days', val: a.ageing.d60, color: 'var(--warning)' },
    { label: '61+ days', val: a.ageing.d90, color: 'var(--danger)' },
  ];

  return (
    <div className="an-tab">
      <div className="kpi-grid">
        <KPICard icon="credit-card" label="Billed" count={a.billed} format="inrCompact" />
        <KPICard icon="wallet" label="Collected" count={a.collected} format="inrCompact" subColor="var(--success)" />
        <KPICard icon="bar-chart" label="Collection rate" count={a.efficiency ?? 0} format="percent" suffix="%" subColor={a.efficiency != null && a.efficiency < 70 ? 'var(--warning)' : 'var(--gold)'} sub={a.efficiency == null ? 'no billing yet' : undefined} />
        <KPICard icon="alert-triangle" label="Outstanding" count={a.outstanding} format="inrCompact" subColor={a.outstanding ? 'var(--danger)' : 'var(--success)'} />
      </div>

      <div className="an-grid">
        <Panel title="Collection trend" sub="Last 6 months">
          {a.trail.every((t) => t.total === 0) ? (
            <EmptyState icon="bar-chart" title="No payments yet" />
          ) : (
            <LineChart points={a.trail.map((t) => t.total)} xLabels={a.trail.map((t) => t.label)} height={200} />
          )}
        </Panel>

        <Panel title="Outstanding ageing">
          {a.outstanding === 0 ? (
            <EmptyState icon="check-circle" title="Nothing outstanding" message="All raised fees are fully collected." />
          ) : (
            <div className="an-dist">
              {ageRows.map((r) => (
                <div className="an-dist__row" key={r.label}>
                  <span>{r.label}</span>
                  <span className="an-dist__bar"><span className="an-dist__fill" style={{ width: `${(r.val / ageMax) * 100}%`, background: r.color }} /></span>
                  <span className="an-dist__val">{formatINRCompact(r.val)}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total outstanding: <strong>{formatINR(a.outstanding)}</strong></div>
            </div>
          )}
        </Panel>
      </div>

      <AiInsightsPanel title="AI financial insights" insights={[
        { icon: 'trending-down', title: 'Default prediction', body: 'Flags families likely to default 30 days before the due date from payment history.' },
        { icon: 'wallet', title: 'Collection forecast', body: 'Projects end-of-term collection and cash position from enrolment and trends.' },
        { icon: 'alert-triangle', title: 'Expense anomalies', body: 'Detects unusual expense patterns or vendor invoices vs historical norms.' },
      ]} />
    </div>
  );
}
