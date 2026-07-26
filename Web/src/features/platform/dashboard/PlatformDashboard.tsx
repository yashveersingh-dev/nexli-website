import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel, PanelAction } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Donut, DonutLegend } from '@/components/charts';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useSchools, useActivityFeed, sweepExpiredSubscriptions, effectiveSubscriptionStatus } from '@/features/platform/data';
import { SUBSCRIPTION_STATUS_META } from '@/features/platform/meta';
import type { School, SubscriptionStatus } from '@/types/models';
import '@/features/platform/platform.css';
import './dashboard.css';

const DAY = 86400000;
const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  active: '#22C55E',
  trial: '#60a5fa',
  paused: '#F59E0B',
  suspended: '#EF4444',
  expired: '#fb923c',
  terminated: '#A8A29E',
};

/** Super Admin command center (spec §12.2) — platform health in one glance. */
export function PlatformDashboard() {
  const navigate = useNavigate();
  const { uid, member } = useSession();
  const { data: schools, loading } = useSchools();
  const { data: activity, loading: actLoading } = useActivityFeed(7);

  // Free-tier billing sweep: persist `expired` for any lapsed school, once per visit.
  const swept = useRef(false);
  useEffect(() => {
    if (swept.current || loading || schools.length === 0) return;
    swept.current = true;
    void sweepExpiredSubscriptions(schools, { uid: uid ?? 'unknown', name: member?.name });
  }, [loading, schools, uid, member]);

  const stats = useMemo(() => {
    const by: Record<string, number> = { active: 0, trial: 0, paused: 0, suspended: 0, expired: 0, terminated: 0 };
    for (const s of schools) { const k = effectiveSubscriptionStatus(s); by[k] = (by[k] ?? 0) + 1; }
    const now = Date.now();
    const renewalsDue = schools
      .filter((s) => s.renewalDate && s.renewalDate - now < 30 * DAY && s.renewalDate >= now && s.subscriptionStatus !== 'terminated')
      .sort((a, b) => (a.renewalDate ?? 0) - (b.renewalDate ?? 0));
    const overdue = schools.filter((s) => effectiveSubscriptionStatus(s) === 'expired');
    const suspended = schools.filter((s) => s.subscriptionStatus === 'suspended');
    const softDelete = schools.filter((s) => s.deletedAt);
    return { by, renewalsDue, overdue, suspended, softDelete };
  }, [schools]);

  if (loading) return <DashboardSkeleton />;

  const total = schools.length;
  const donutSegments = (['active', 'trial', 'paused', 'suspended', 'expired', 'terminated'] as SubscriptionStatus[])
    .filter((k) => stats.by[k] > 0)
    .map((k) => ({ value: stats.by[k], color: STATUS_COLOR[k] }));

  if (total === 0) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Platform Command Center</h1>
            <p className="nx-page__sub">Welcome to NEXLI. Onboard your first school to get started.</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            icon="school"
            title="No schools on the platform yet"
            message="Add your first school to bring it onto NEXLI. You can manage its subscription, modules and settings from here."
            action={<Button variant="gold" leftIcon="plus" onClick={() => navigate('/schools/new')}>Add your first school</Button>}
          />
        </Panel>
      </div>
    );
  }

  const alertCount = stats.overdue.length + stats.suspended.length + stats.softDelete.length;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Platform Command Center</h1>
          <p className="nx-page__sub">
            <span className="nx-statusdot" /> All systems operational · {total} school{total === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="gold" leftIcon="plus" onClick={() => navigate('/schools/new')}>Add school</Button>
      </div>

      {/* Health KPIs */}
      <div className="kpi-grid kpi-grid--5">
        <KPICard icon="school" label="Total schools" count={total} format="us" />
        <KPICard icon="check-circle" label="Active" count={stats.by.active} format="us" subColor="var(--success)" sub={`${pct(stats.by.active, total)}% of platform`} />
        <KPICard icon="clock" label="Trial" count={stats.by.trial} format="us" subColor="var(--info)" />
        <KPICard icon="alert-triangle" label="Paused" count={stats.by.paused} format="us" subColor="var(--warning)" />
        <KPICard icon="shield" label="Suspended" count={stats.by.suspended} format="us" subColor="var(--danger)" />
      </div>

      {/* Alerts + subscription health */}
      <div className="grid g-2">
        <Panel
          title="Needs attention"
          headerRight={alertCount > 0 ? <Badge variant="danger">{alertCount}</Badge> : <Badge variant="success">Clear</Badge>}
        >
          {alertCount === 0 ? (
            <EmptyState icon="check-circle" title="Nothing needs attention" message="No overdue renewals, suspensions or pending deletions." />
          ) : (
            <div className="nx-alertlist">
              {stats.overdue.map((s) => (
                <AlertRow key={`o-${s.id}`} school={s} tone="danger" icon="credit-card" label="Renewal overdue" detail={s.renewalDate ? `Due ${formatDate(s.renewalDate)}` : ''} onClick={() => navigate(`/schools/${s.id}`)} />
              ))}
              {stats.suspended.map((s) => (
                <AlertRow key={`s-${s.id}`} school={s} tone="danger" icon="shield" label="Suspended" detail="Login blocked" onClick={() => navigate(`/schools/${s.id}`)} />
              ))}
              {stats.softDelete.map((s) => (
                <AlertRow key={`d-${s.id}`} school={s} tone="warning" icon="alert-triangle" label="Pending deletion" detail={s.deletedAt ? `Since ${formatDate(s.deletedAt)}` : ''} onClick={() => navigate(`/schools/${s.id}`)} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Subscription health" headerRight={<PanelAction onClick={() => navigate('/subscriptions')}>Details</PanelAction>}>
          <div className="donut-wrap">
            <Donut segments={donutSegments.length ? donutSegments : [{ value: 1, color: 'var(--border-2)' }]} centerValue={String(total)} centerLabel="Schools" />
            <DonutLegend
              items={(['active', 'trial', 'paused', 'suspended', 'terminated'] as SubscriptionStatus[])
                .filter((k) => stats.by[k] > 0)
                .map((k) => ({ label: SUBSCRIPTION_STATUS_META[k].label, value: String(stats.by[k]), color: STATUS_COLOR[k] }))}
            />
          </div>
        </Panel>
      </div>

      {/* Renewals + activity */}
      <div className="grid g-2">
        <Panel title="Renewals due" sub="next 30 days" headerRight={<PanelAction onClick={() => navigate('/subscriptions')}>All</PanelAction>}>
          {stats.renewalsDue.length === 0 ? (
            <EmptyState icon="calendar" title="No renewals due" message="No subscriptions renew in the next 30 days." />
          ) : (
            <div className="nx-renewlist">
              {stats.renewalsDue.slice(0, 6).map((s) => (
                <Link to={`/schools/${s.id}`} key={s.id} className="nx-renewrow">
                  <Avatar name={s.name} src={s.logoUrl} size={32} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="nx-renewrow__name">{s.name}</div>
                    <div className="nx-renewrow__plan">{s.plan ?? 'Unassigned'}</div>
                  </div>
                  <div className="nx-renewrow__date">{s.renewalDate ? formatDate(s.renewalDate) : '—'}</div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent activity" headerRight={<PanelAction onClick={() => navigate('/activities')}>View all</PanelAction>}>
          {actLoading ? (
            <Skeleton height={120} />
          ) : activity.length === 0 ? (
            <EmptyState icon="activity" title="No activity yet" message="Platform events will appear here as schools are onboarded and managed." />
          ) : (
            <div className="nx-timeline">
              {activity.map((a) => (
                <div className="nx-timeline__item" key={a.id}>
                  <span className="nx-timeline__dot" />
                  <div>
                    <div className="nx-timeline__title">{a.summary}</div>
                    <div className="nx-timeline__time">{formatRelative(a.ts)}{a.actorName ? ` · ${a.actorName}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <InfoCard icon="server" title="System health">
        Live uptime, Firebase usage and error-rate monitoring activate when platform metrics are wired (Blaze /
        Cloud Functions). Until then, school + subscription health above is fully live.
      </InfoCard>
    </div>
  );
}

function AlertRow({
  school,
  tone,
  icon,
  label,
  detail,
  onClick,
}: {
  school: School;
  tone: 'danger' | 'warning';
  icon: 'credit-card' | 'shield' | 'alert-triangle';
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="nx-alertrow" onClick={onClick}>
      <span className={`nx-alertrow__icon is-${tone}`}><Icon name={icon} size={15} /></span>
      <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <div className="nx-alertrow__name">{school.name}</div>
        <div className="nx-alertrow__detail">{label}{detail ? ` · ${detail}` : ''}</div>
      </div>
      <Icon name="chevron-right" size={15} className="nx-alertrow__chev" />
    </button>
  );
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function DashboardSkeleton() {
  return (
    <div className="nx-page">
      <Skeleton width="45%" height={24} />
      <div className="kpi-grid kpi-grid--5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={92} radius={14} />)}
      </div>
      <div className="grid g-2">
        <Skeleton height={240} radius={14} />
        <Skeleton height={240} radius={14} />
      </div>
    </div>
  );
}
