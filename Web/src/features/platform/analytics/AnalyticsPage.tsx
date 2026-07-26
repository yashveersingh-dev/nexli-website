import { useMemo } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Donut, DonutLegend } from '@/components/charts';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { formatNumber, formatPercent, formatINR } from '@/lib/format';
import { useSchools, usePlans, effectiveSubscriptionStatus, effectiveMonthlyPrice } from '@/features/platform/data';
import { SUBSCRIPTION_STATUS_META, BOARD_OPTIONS, SCHOOL_TYPE_OPTIONS } from '@/features/platform/meta';
import type { BoardType, SchoolType, SubscriptionStatus } from '@/types/models';

/** Board palette — distinct, accessible accents (status uses SUBSCRIPTION_STATUS_META). */
const BOARD_COLOR: Record<BoardType, string> = {
  CBSE: '#C6A55C',
  ICSE: '#60a5fa',
  State: '#22C55E',
  IB: '#A78BFA',
  Cambridge: '#F59E0B',
  NIOS: '#F472B6',
};

const STATUS_ORDER: SubscriptionStatus[] = ['active', 'trial', 'paused', 'suspended', 'expired', 'terminated'];

/**
 * Platform Analytics (spec §12.5) — aggregate, anonymized platform metrics
 * derived from the school registry. No individual student/staff PII is ever read;
 * only denormalized counts stored on each school document.
 */
export function AnalyticsPage() {
  const { data: schools, loading } = useSchools();
  const { data: plans } = usePlans();

  // Estimated recurring revenue from plan assignments (active subscriptions only).
  const revenue = useMemo(() => {
    // Join schools → plans on the stable planId (with a legacy name fallback), so
    // renaming a plan never silently drops a school from MRR.
    let mrr = 0;
    let paying = 0;
    for (const s of schools) {
      if (effectiveSubscriptionStatus(s) !== 'active') continue;
      const monthly = effectiveMonthlyPrice(s, plans);
      if (monthly && monthly > 0) { mrr += monthly; paying += 1; }
    }
    return { mrr: Math.round(mrr), arr: Math.round(mrr * 12), paying };
  }, [schools, plans]);

  const agg = useMemo(() => {
    const totalSchools = schools.length;
    let totalStudents = 0;
    let totalStaff = 0;
    let onboardSum = 0;
    let onboardCount = 0;

    const byBoard = new Map<BoardType, number>();
    const byType = new Map<SchoolType, number>();
    const byStatus = new Map<SubscriptionStatus, number>();
    const byState = new Map<string, number>();
    const funnel = { early: 0, mid: 0, late: 0 }; // <25 / 25–75 / >75

    for (const s of schools) {
      totalStudents += s.studentCount ?? 0;
      totalStaff += s.staffCount ?? 0;
      if (typeof s.onboardingPct === 'number') {
        onboardSum += s.onboardingPct;
        onboardCount += 1;
        if (s.onboardingPct < 25) funnel.early += 1;
        else if (s.onboardingPct <= 75) funnel.mid += 1;
        else funnel.late += 1;
      }
      if (s.board) byBoard.set(s.board, (byBoard.get(s.board) ?? 0) + 1);
      if (s.type) byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
      const st = effectiveSubscriptionStatus(s);
      byStatus.set(st, (byStatus.get(st) ?? 0) + 1);
      if (s.state) byState.set(s.state, (byState.get(s.state) ?? 0) + 1);
    }

    const topStates = [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const avgOnboarding = onboardCount ? onboardSum / onboardCount : 0;

    return {
      totalSchools,
      totalStudents,
      totalStaff,
      avgOnboarding,
      byBoard,
      byType,
      byStatus,
      topStates,
      funnel,
      onboardCount,
    };
  }, [schools]);

  if (loading) return <AnalyticsSkeleton />;

  if (agg.totalSchools === 0) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Platform Analytics</h1>
            <p className="nx-page__sub">Aggregate insights across every school on NEXLI.</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            icon="bar-chart"
            title="No analytics yet"
            message="Welcome to NEXLI. Platform metrics — schools, students, geographic reach and onboarding progress — appear automatically as schools are onboarded."
          />
        </Panel>
      </div>
    );
  }

  const total = agg.totalSchools;

  const boardItems = BOARD_OPTIONS
    .map((b) => ({ value: b.value, label: b.label, count: agg.byBoard.get(b.value) ?? 0, color: BOARD_COLOR[b.value] }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const statusSegments = STATUS_ORDER
    .filter((k) => (agg.byStatus.get(k) ?? 0) > 0)
    .map((k) => ({ value: agg.byStatus.get(k) ?? 0, color: SUBSCRIPTION_STATUS_META[k].dot }));

  const typeItems = SCHOOL_TYPE_OPTIONS
    .map((t) => ({ label: t.label, count: agg.byType.get(t.value) ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxState = agg.topStates[0]?.[1] ?? 1;
  const maxBoard = boardItems[0]?.count ?? 1;
  const maxType = typeItems[0]?.count ?? 1;

  const funnelRows = [
    { key: 'late', label: 'Onboarded', sub: 'Over 75% complete', count: agg.funnel.late, color: 'var(--success)' },
    { key: 'mid', label: 'In progress', sub: '25–75% complete', count: agg.funnel.mid, color: 'var(--gold)' },
    { key: 'early', label: 'Getting started', sub: 'Under 25% complete', count: agg.funnel.early, color: 'var(--info)' },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Platform Analytics</h1>
          <p className="nx-page__sub">
            Aggregate, anonymized insights across {total} school{total === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="kpi-grid">
        <KPICard icon="school" label="Total schools" count={total} format="us" />
        <KPICard icon="users" label="Total students" count={agg.totalStudents} format="us" />
        <KPICard icon="briefcase" label="Total staff" count={agg.totalStaff} format="us" />
        <KPICard
          icon="trending-up"
          label="Avg onboarding"
          count={agg.avgOnboarding}
          format="percent"
          decimals={0}
          suffix="%"
          sub={agg.onboardCount ? `${agg.onboardCount} school${agg.onboardCount === 1 ? '' : 's'} tracked` : 'Awaiting data'}
        />
      </div>

      {/* Estimated recurring revenue (from active plan assignments) */}
      <div className="kpi-grid">
        <KPICard icon="wallet" label="Est. MRR" count={revenue.mrr} format="inrCompact" sub={`${revenue.paying} paying school${revenue.paying === 1 ? '' : 's'}`} />
        <KPICard icon="trending-up" label="Est. ARR" count={revenue.arr} format="inrCompact" sub="MRR × 12" />
        <KPICard icon="credit-card" label="Avg revenue / school" count={revenue.paying ? Math.round(revenue.mrr / revenue.paying) : 0} format="inrCompact" sub="per month" />
        <KPICard icon="school" label="Paying / total" count={revenue.paying} format="us" sub={`of ${total} schools`} />
      </div>

      {/* Board + status distribution */}
      <div className="grid g-2">
        <Panel title="Schools by board" sub={`${boardItems.length} board${boardItems.length === 1 ? '' : 's'}`}>
          {boardItems.length === 0 ? (
            <EmptyState icon="book" title="No board data" message="Board appears once schools record their affiliation." />
          ) : (
            <div className="ana-bars">
              {boardItems.map((b) => (
                <RankRow key={b.value} label={b.label} count={b.count} total={total} max={maxBoard} color={b.color} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Schools by status" sub="subscription lifecycle">
          <div className="donut-wrap">
            <Donut
              segments={statusSegments.length ? statusSegments : [{ value: 1, color: 'var(--border-2)' }]}
              centerValue={String(total)}
              centerLabel="Schools"
            />
            <DonutLegend
              items={STATUS_ORDER
                .filter((k) => (agg.byStatus.get(k) ?? 0) > 0)
                .map((k) => ({
                  label: SUBSCRIPTION_STATUS_META[k].label,
                  value: String(agg.byStatus.get(k) ?? 0),
                  color: SUBSCRIPTION_STATUS_META[k].dot,
                }))}
            />
          </div>
        </Panel>
      </div>

      {/* Geography + type */}
      <div className="grid g-2">
        <Panel title="Geographic distribution" sub="top states by school count">
          {agg.topStates.length === 0 ? (
            <EmptyState icon="map-pin" title="No location data" message="State distribution appears as schools record their location." />
          ) : (
            <div className="ana-bars">
              {agg.topStates.map(([state, count]) => (
                <RankRow key={state} label={state} count={count} total={total} max={maxState} color="var(--gold)" />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Schools by type" sub="campus model">
          {typeItems.length === 0 ? (
            <EmptyState icon="building" title="No type data" message="Campus model appears once schools record their type." />
          ) : (
            <div className="ana-bars">
              {typeItems.map((t) => (
                <RankRow key={t.label} label={t.label} count={t.count} total={total} max={maxType} color="#60a5fa" />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Onboarding funnel */}
      <Panel title="Onboarding funnel" sub="setup progress across schools">
        {agg.onboardCount === 0 ? (
          <EmptyState
            icon="trending-up"
            title="No onboarding data yet"
            message="Progress is tracked as schools complete their setup checklist."
          />
        ) : (
          <div className="ana-funnel">
            {funnelRows.map((r) => (
              <div className="ana-funnel__cell" key={r.key}>
                <div className="ana-funnel__count" style={{ color: r.color }}>{formatNumber(r.count)}</div>
                <div className="ana-funnel__label">{r.label}</div>
                <div className="ana-funnel__sub">{r.sub}</div>
                <div className="ana-funnel__bar" aria-hidden="true">
                  <span style={{ width: `${pct(r.count, agg.onboardCount)}%`, background: r.color }} />
                </div>
                <div className="ana-funnel__pct">{pct(r.count, agg.onboardCount)}% of tracked</div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Honest limits — richer reporting needs event metrics */}
      <div className="grid g-2">
        <InfoCard icon="trending-up" title="Revenue analytics">
          MRR / ARR above are <strong>estimated from active plan assignments</strong> ({formatINR(revenue.mrr)}/mo).
          Precise billed revenue, churn and expansion need an invoiced billing event stream (Blaze / Cloud Functions),
          which isn't captured yet. Subscription status and plan mix are fully live.
        </InfoCard>
        <InfoCard icon="activity" title="Engagement & adoption">
          DAU / MAU, session depth and feature-adoption breakdowns activate with usage analytics. They require an
          event pipeline per school; today's view uses aggregate registry counts only.
        </InfoCard>
      </div>

      <p className="ana-foot">
        All figures are aggregate and anonymized — NEXLI never surfaces individual student or staff records in
        platform analytics (spec §12.5). Coverage: {agg.onboardCount}/{total} school
        {total === 1 ? '' : 's'} reporting onboarding progress · {formatPercent(pct(agg.onboardCount, total))} tracked.
      </p>
    </div>
  );
}

function RankRow({
  label,
  count,
  total,
  max,
  color,
}: {
  label: string;
  count: number;
  total: number;
  max: number;
  color: string;
}) {
  return (
    <div className="ana-rank">
      <div className="ana-rank__head">
        <span className="ana-rank__label">{label}</span>
        <span className="ana-rank__val">
          {formatNumber(count)}
          <span className="ana-rank__pct"> · {pct(count, total)}%</span>
        </span>
      </div>
      <div className="ana-rank__track" aria-hidden="true">
        <span style={{ width: `${Math.max((count / max) * 100, 4)}%`, background: color }} />
      </div>
    </div>
  );
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function AnalyticsSkeleton() {
  return (
    <div className="nx-page">
      <Skeleton width="45%" height={24} />
      <div className="kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={92} radius={14} />
        ))}
      </div>
      <div className="grid g-2">
        <Skeleton height={240} radius={14} />
        <Skeleton height={240} radius={14} />
      </div>
      <div className="grid g-2">
        <Skeleton height={220} radius={14} />
        <Skeleton height={220} radius={14} />
      </div>
    </div>
  );
}
