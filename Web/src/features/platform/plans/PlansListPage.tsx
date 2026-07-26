import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Panel } from '@/components/Panel';
import { ConfirmModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatINR, formatNumber } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { usePlans, upsertPlan, deletePlan } from '@/features/platform/data';
import { DEFAULT_PLAN_TEMPLATES } from '@/features/platform/meta';
import type { Plan } from '@/types/models';

/** Plans & Pricing (spec §12.4) — premium pricing cards with manage actions. */
export function PlansListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: plans, loading, error } = usePlans();

  const [toDelete, setToDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      for (const t of DEFAULT_PLAN_TEMPLATES) {
        const plan: Plan = {
          id: t.id,
          name: t.name,
          order: t.order,
          studentLimit: t.studentLimit,
          staffLimit: t.staffLimit,
          priceMonthly: t.priceMonthly,
          priceAnnual: t.priceAnnual,
          trialDays: t.trialDays,
          highlighted: 'highlighted' in t ? t.highlighted : false,
          active: true,
        };
        await upsertPlan(plan, actor);
      }
      toast.success('Default tiers added', 'Starter, Growth, Professional and Enterprise.');
    } catch {
      toast.error('Could not seed tiers', 'Please try again.');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePlan(toDelete.id, actor);
      toast.success('Plan deleted', toDelete.name);
      setToDelete(null);
    } catch {
      toast.error('Could not delete', 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const head = (
    <div className="nx-page__head">
      <div>
        <h1 className="nx-page__title">Plans &amp; Pricing</h1>
        <p className="nx-page__sub">
          {loading ? 'Loading…' : `${plans.length} pricing tier${plans.length === 1 ? '' : 's'}`}
        </p>
      </div>
      {plans.length > 0 && (
        <Button variant="gold" leftIcon="plus" onClick={() => navigate('/plans/new')}>
          New plan
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="nx-page">
        {head}
        <div className="nx-plans-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <Panel key={i}>
              <Skeleton height={260} />
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nx-page">
        {head}
        <EmptyState icon="alert-triangle" title="Could not load plans" message="Please refresh and try again." />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="nx-page">
        {head}
        <EmptyState
          icon="credit-card"
          title="No plans yet"
          message="Seed the four standard NEXLI tiers to get started, or build your own from scratch."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="gold" leftIcon="sparkles" loading={seeding} onClick={() => void handleSeed()}>
                Seed default tiers
              </Button>
              <Button variant="subtle" leftIcon="plus" onClick={() => navigate('/plans/new')}>
                New plan
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="nx-page">
      {head}

      <div className="nx-plans-grid">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => navigate(`/plans/${plan.id}/edit`)}
            onDelete={() => setToDelete(plan)}
          />
        ))}
      </div>

      <ConfirmModal
        open={toDelete !== null}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={handleDelete}
        tone="danger"
        title={`Delete ${toDelete?.name ?? 'plan'}?`}
        message="Schools already on this plan keep their current configuration. This only removes the tier from the catalogue."
        confirmLabel="Delete plan"
        loading={deleting}
      />
    </div>
  );
}

function priceLabel(value: number | undefined): { amount: string; free: boolean } {
  if (value === undefined) return { amount: '—', free: false };
  if (value === 0) return { amount: 'Custom', free: true };
  return { amount: formatINR(value), free: false };
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const monthly = priceLabel(plan.priceMonthly);

  return (
    <article
      className={`nx-plan${plan.highlighted ? ' is-highlighted' : ''}${plan.active === false ? ' is-inactive' : ''}`}
    >
      {plan.highlighted && (
        <span className="nx-plan__ribbon">
          <Icon name="crown" size={11} strokeWidth={2.4} />
          Recommended
        </span>
      )}

      <div className="nx-plan__head">
        <span className="nx-plan__name">{plan.name}</span>
        {plan.active === false && <span className="badge badge--muted">Inactive</span>}
      </div>
      <p className="nx-plan__desc">{plan.description ?? ' '}</p>

      <div className="nx-plan__price">
        {monthly.free ? (
          <span className="nx-plan__free">Custom pricing</span>
        ) : (
          <>
            <span className="nx-plan__amount">{monthly.amount}</span>
            <span className="nx-plan__per">/ month</span>
          </>
        )}
      </div>
      {!monthly.free && plan.priceAnnual !== undefined && plan.priceAnnual > 0 && (
        <div className="nx-plan__annual">{formatINR(plan.priceAnnual)} billed annually</div>
      )}

      <div className="nx-plan__limits">
        <div className="nx-plan__limit">
          <span className="nx-plan__limit-val">
            {plan.studentLimit ? formatNumber(plan.studentLimit) : 'Unlimited'}
          </span>
          <span className="nx-plan__limit-k">Students</span>
        </div>
        <div className="nx-plan__limit">
          <span className="nx-plan__limit-val">
            {plan.staffLimit ? formatNumber(plan.staffLimit) : 'Unlimited'}
          </span>
          <span className="nx-plan__limit-k">Staff</span>
        </div>
        <div className="nx-plan__limit">
          <span className="nx-plan__limit-val">{plan.trialDays ? `${plan.trialDays}d` : 'None'}</span>
          <span className="nx-plan__limit-k">Trial</span>
        </div>
      </div>

      <div className="nx-plan__modules">
        <span className="nx-plan__module">
          <Icon name="check" size={14} strokeWidth={2.6} />
          All features included
        </span>
      </div>

      <div className="nx-plan__foot">
        <Button variant="subtle" leftIcon="edit" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="ghost"
          leftIcon="minus-circle"
          onClick={onDelete}
          aria-label={`Delete ${plan.name}`}
        >
          Delete
        </Button>
      </div>
    </article>
  );
}
