import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import {
  Form,
  FormInput,
  FormTextarea,
  FormToggle,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { usePlans, upsertPlan } from '@/features/platform/data';
import { planSchema, type PlanValues, planSlug, planToValues, valuesToPlan } from './planSchema';

/** Create or edit a plan tier (spec §12.4). Dedicated routed FormPage. */
export function PlanEditPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: plans, loading } = usePlans();

  const editing = mode === 'edit';
  const plan = editing ? plans.find((p) => p.id === id) : null;

  if (editing && loading) {
    return (
      <div className="nx-page">
        <Panel>
          <Skeleton height={320} />
        </Panel>
      </div>
    );
  }

  if (editing && !plan) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="credit-card"
          title="Plan not found"
          message="This plan may have been removed."
          action={
            <Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/plans')}>
              Back to plans
            </Button>
          }
        />
      </div>
    );
  }

  const defaults: PlanValues = planToValues(plan);

  return (
    <div className="nx-page">
      <Form<PlanValues>
        schema={planSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const planId = editing ? id : planSlug(values.name);
            await upsertPlan(valuesToPlan(planId, values), { uid: uid ?? 'unknown', name: member?.name });
            toast.success(editing ? 'Plan updated' : 'Plan created', values.name);
            navigate('/plans');
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        {({ formState }) => (
          <FormPage
            title={editing ? `Edit ${plan!.name}` : 'New plan'}
            subtitle={
              editing
                ? "Update this tier's price and size limits. All features are included on every plan."
                : 'Define a pricing tier (price + size limits). All features are included on every plan — plans never gate features.'
            }
            breadcrumbs={[
              { label: 'Plans', onClick: () => navigate('/plans') },
              { label: editing ? plan!.name : 'New plan' },
            ]}
            onBack={() => navigate('/plans')}
            onCancel={() => navigate('/plans')}
            submitLabel={editing ? 'Save changes' : 'Create plan'}
            submitIcon="check"
            submitting={formState.isSubmitting}
          >
            <FormSection title="Tier" description="Name and display order across the pricing grid.">
              <FormInput<PlanValues>
                name="name"
                label="Plan name"
                required
                placeholder="e.g. Growth"
              />
              <FormInput<PlanValues>
                name="order"
                label="Display order"
                required
                type="number"
                inputMode="numeric"
                min={0}
                hint="Lower numbers appear first."
              />
              <FormRow>
                <FormTextarea<PlanValues>
                  name="description"
                  label="Short description"
                  optional
                  placeholder="One line shown under the plan name…"
                  rows={2}
                />
              </FormRow>
            </FormSection>

            <FormSection title="Pricing" description="Leave blank for custom / contact-us pricing.">
              <FormInput<PlanValues>
                name="priceMonthly"
                label="Price / month"
                optional
                type="number"
                inputMode="numeric"
                min={0}
                prefix="₹"
                placeholder="0"
              />
              <FormInput<PlanValues>
                name="priceAnnual"
                label="Price / year"
                optional
                type="number"
                inputMode="numeric"
                min={0}
                prefix="₹"
                placeholder="0"
              />
              <FormInput<PlanValues>
                name="trialDays"
                label="Trial days"
                optional
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
              />
            </FormSection>

            <FormSection title="Limits" description="Set 0 for unlimited (e.g. Enterprise).">
              <FormInput<PlanValues>
                name="studentLimit"
                label="Student limit"
                optional
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
              />
              <FormInput<PlanValues>
                name="staffLimit"
                label="Staff limit"
                optional
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
              />
            </FormSection>

            <FormSection title="Visibility" single>
              <FormToggle<PlanValues>
                name="highlighted"
                label="Highlight as recommended"
                description="Gold-accents this tier in the pricing grid (use for one plan)."
              />
              <FormToggle<PlanValues>
                name="active"
                label="Active"
                description="Inactive plans stay visible to you but are dimmed."
              />
            </FormSection>
          </FormPage>
        )}
      </Form>
    </div>
  );
}
