import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useIepPlans } from '@/features/analytics/data';
import { IEP_STATUS_META } from '@/features/analytics/meta';
import { isReviewDue, goalsAchieved } from './iepSchema';
import type { IepPlan } from '@/types/special';

const STATUS_OPTIONS = (Object.keys(IEP_STATUS_META) as IepPlan['status'][]).map((v) => ({
  value: v,
  label: IEP_STATUS_META[v].label,
}));

/** IEP plans register — one row per plan with status + a review-due flag. */
export function IepPlansTab() {
  const navigate = useNavigate();
  const { schoolId, can } = useSession();
  const canWrite = can('iep.write');
  const { data: plans, loading, error } = useIepPlans(schoolId);

  const [status, setStatus] = useState('');
  const [view, setView] = useState('active'); // active | all | closed

  const kpis = useMemo(() => {
    let active = 0,
      reviewDue = 0,
      closed = 0;
    for (const p of plans) {
      if (p.status === 'closed') closed++;
      else active++;
      if (isReviewDue(p) || p.status === 'review_due') reviewDue++;
    }
    return { total: plans.length, active, reviewDue, closed };
  }, [plans]);

  const rows = useMemo(() => {
    return plans
      .filter((p) => (status ? p.status === status : true))
      .filter((p) =>
        view === 'closed' ? p.status === 'closed' : view === 'active' ? p.status !== 'closed' : true,
      )
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [plans, status, view]);

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="file-text" label="Total plans" count={kpis.total} format="us" />
        <KPICard
          icon="users"
          label="Active"
          count={kpis.active}
          format="us"
          subColor={kpis.active ? 'var(--success)' : undefined}
        />
        <KPICard
          icon="clock"
          label="Review due"
          count={kpis.reviewDue}
          format="us"
          subColor={kpis.reviewDue ? 'var(--warning)' : undefined}
          sub={kpis.reviewDue ? 'needs review' : undefined}
        />
        <KPICard icon="check-circle" label="Closed" count={kpis.closed} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select
          value={view}
          onChange={(e) => setView(e.target.value)}
          aria-label="View"
          options={[
            { value: 'active', label: 'Active plans' },
            { value: 'closed', label: 'Closed' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
        />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/sped/new')}>
            New IEP plan
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load plans" message="Please try again." />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="file-text"
            title={view === 'closed' ? 'No closed plans' : 'No IEP plans yet'}
            message={
              canWrite
                ? 'Create an Individualised Education Plan for a child with special needs.'
                : 'IEP plans will appear here.'
            }
            action={
              canWrite && view !== 'closed' ? (
                <Button variant="gold" leftIcon="plus" onClick={() => navigate('/sped/new')}>
                  New IEP plan
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="fin-kv-list" style={{ gap: 10 }}>
          {rows.map((p) => (
            <IepRow key={p.id} plan={p} onOpen={() => navigate(`/sped/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function IepRow({ plan, onOpen }: { plan: IepPlan; onOpen: () => void }) {
  const reviewDue = isReviewDue(plan) || plan.status === 'review_due';
  const st = IEP_STATUS_META[reviewDue && plan.status !== 'closed' ? 'review_due' : plan.status];
  const total = plan.goals?.length ?? 0;
  const done = goalsAchieved(plan.goals);
  return (
    <button type="button" className="sped-row" onClick={onOpen} aria-label={`Open IEP plan for ${plan.studentName}`}>
      <div className="sped-row__main">
        <div className="sped-row__no">
          <Icon name="user" size={13} aria-hidden="true" /> {plan.studentName}
        </div>
        <div className="sped-row__meta">
          {plan.gradeName && (
            <>
              <span>{plan.gradeName}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          {plan.disability && (
            <>
              <span>{plan.disability}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>
            {done}/{total} goals achieved
          </span>
          {plan.reviewDate && (
            <>
              <span aria-hidden="true">·</span>
              <span>Review {formatDate(plan.reviewDate)}</span>
            </>
          )}
          {reviewDue && plan.status !== 'closed' && (
            <span className="sped-flag">
              <Icon name="clock" size={11} aria-hidden="true" /> Review due
            </span>
          )}
        </div>
      </div>
      <div className="sped-row__badges">
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>
    </button>
  );
}
