import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useRteClaims, createRteClaim, updateRteClaim } from '@/features/compliance/data';
import {
  rteClaimSchema,
  emptyRteClaim,
  claimToForm,
  formToClaim,
  type RteClaimValues,
} from './rteSchema';
import type { RteClaim } from '@/types/compliance';

/** Dedicated routed form for creating / editing a reimbursement claim. */
export function RteClaimFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: claims, loading } = useRteClaims(mode === 'edit' ? schoolId : undefined);
  const existing = claims.find((c) => c.id === id);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !loading && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="wallet" title="Claim not found" action={<Button variant="subtle" onClick={() => navigate('/rte')}>Back</Button>} />
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? claimToForm(existing) : emptyRteClaim();

  return (
    <div className="nx-page">
      <Form<RteClaimValues>
        schema={rteClaimSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const base = formToClaim(values);
            if (mode === 'new') {
              await createRteClaim(
                schoolId,
                { ...base, schoolId, status: 'draft' } as Omit<RteClaim, 'id'>,
                actor,
              );
              toast.success('Claim created', `${base.academicYear} · ${formatINR(base.amountClaimed)}`);
            } else {
              await updateRteClaim(schoolId, id, base, actor);
              toast.success('Claim updated', base.academicYear);
            }
            navigate('/rte');
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <Body mode={mode} onCancel={() => navigate('/rte')} />
      </Form>
    </div>
  );
}

function Body({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { formState, control } = useFormContext<RteClaimValues>();
  const [count, rate] = useWatch({ control, name: ['studentCount', 'perStudentAmount'] });
  const n = Number(count);
  const r = Number(rate);
  const computed = Number.isFinite(n) && Number.isFinite(r) && count !== '' && rate !== '' ? n * r : null;

  return (
    <FormPage
      title={mode === 'new' ? 'New reimbursement claim' : 'Edit claim'}
      subtitle="State reimbursement for RTE-admitted students (25% quota)."
      breadcrumbs={[{ label: 'RTE', onClick: onCancel }, { label: mode === 'new' ? 'New claim' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Create claim' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Claim period">
        <FormInput<RteClaimValues> name="academicYear" label="Academic year" required placeholder="2026-27" />
        <FormInput<RteClaimValues> name="period" label="Period" placeholder="e.g. Term 1 / Q1 / Full year" />
        <FormInput<RteClaimValues> name="referenceNo" label="Reference no." placeholder="Govt. claim ref" />
      </FormSection>

      <FormSection title="Amount">
        <FormInput<RteClaimValues> name="studentCount" label="Number of students" required type="number" inputMode="numeric" placeholder="e.g. 42" />
        <FormInput<RteClaimValues> name="perStudentAmount" label="Per-student rate (₹)" required type="number" inputMode="numeric" placeholder="e.g. 18000" />
        <div className="nx-col-full">
          <div className="rte-compute" role="status" aria-live="polite">
            <span className="rte-compute__label">Amount claimed (students × rate)</span>
            <span className="rte-compute__value">{computed != null ? formatINR(computed) : '—'}</span>
          </div>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <div className="nx-col-full">
          <FormTextarea<RteClaimValues> name="notes" label="Notes" rows={2} placeholder="Submission remarks, supporting docs…" />
        </div>
      </FormSection>
    </FormPage>
  );
}
