import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import { Form, FormInput, FormToggle, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useSalaryStructure, saveSalaryStructure, type Actor } from '@/features/finance/data';
import { useStaffMember } from '@/features/school/data';
import {
  salaryStructureSchema, emptySalaryForm, structureToForm, formToStructure,
  deductionsFromForm, type SalaryStructureValues,
} from './salarySchema';

/** Dedicated page to set/edit a single staff member's salary structure. */
export function SalaryStructureFormPage() {
  const { staffId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const { canOperate: canWrite, isReviewer } = useOwnership('payroll');
  // Leadership/reviewers (and anyone with payroll.read) may VIEW a structure read-only;
  // only operators may create/edit. Save is hidden and fields disabled in view mode.
  const canView = canWrite || isReviewer || can('payroll.read');

  const { data: staff, loading: staffLoading } = useStaffMember(schoolId, staffId);
  const { data: existing, loading: structLoading } = useSalaryStructure(schoolId, staffId);

  const back = () => navigate('/payroll');

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (staffLoading || structLoading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={360} style={{ marginTop: 12 }} /></div>;
  if (!staff) {
    return <div className="nx-page"><EmptyState icon="users" title="Staff member not found" message="They may have been removed." action={<Button variant="subtle" onClick={back}>Back to payroll</Button>} /></div>;
  }
  if (!canView) {
    return <div className="nx-page"><EmptyState icon="lock" title="Not allowed" message="You don't have permission to view salary structures." action={<Button variant="subtle" onClick={back}>Back</Button>} /></div>;
  }

  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = existing ? structureToForm(existing) : emptySalaryForm();

  return (
    <div className="nx-page">
      <Form<SalaryStructureValues>
        schema={salaryStructureSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const payload = formToStructure(values, {
              schoolId, staffId,
              staffName: staff.name,
              designation: staff.designation,
              department: staff.department,
            });
            await saveSalaryStructure(schoolId, staffId, payload, actor);
            toast.success('Salary structure saved', staff.name);
            back();
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <StructureBody
          mode={existing ? 'edit' : 'new'}
          readOnly={!canWrite}
          staffName={staff.name}
          designation={staff.designation}
          department={staff.department}
          onCancel={back}
        />
      </Form>
    </div>
  );
}

function StructureBody({ mode, readOnly, staffName, designation, department, onCancel }: {
  mode: 'new' | 'edit'; readOnly: boolean; staffName: string; designation?: string; department?: string; onCancel: () => void;
}) {
  const { control, formState } = useFormContext<SalaryStructureValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'otherEarnings' });
  const values = useWatch({ control }) as SalaryStructureValues;
  const d = deductionsFromForm(values);

  const subtitle = [designation, department].filter(Boolean).join(' · ') || 'Staff member';
  const title = readOnly ? `Salary — ${staffName}` : `${mode === 'new' ? 'Set' : 'Edit'} salary — ${staffName}`;
  const crumb = readOnly ? 'View salary' : mode === 'new' ? 'Set salary' : 'Edit salary';

  return (
    <FormPage
      title={title}
      subtitle={subtitle}
      breadcrumbs={[{ label: 'Payroll', onClick: onCancel }, { label: crumb }]}
      onBack={onCancel}
      onCancel={onCancel}
      cancelLabel={readOnly ? 'Back' : 'Cancel'}
      submitLabel={mode === 'new' ? 'Save structure' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
      hideActions={readOnly}
    >
      <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minInlineSize: 'auto' }}>
      <FormSection title="Earnings" description="Monthly components. Gross and annual CTC update live below.">
        <FormInput<SalaryStructureValues> name="basic" label="Basic" type="text" inputMode="decimal" placeholder="0" />
        <FormInput<SalaryStructureValues> name="hra" label="HRA" type="text" inputMode="decimal" placeholder="0" />
        <FormInput<SalaryStructureValues> name="da" label="Dearness allowance (DA)" type="text" inputMode="decimal" placeholder="0" />
        <FormInput<SalaryStructureValues> name="conveyance" label="Conveyance" type="text" inputMode="decimal" placeholder="0" />
        <FormInput<SalaryStructureValues> name="specialAllowance" label="Special allowance" type="text" inputMode="decimal" placeholder="0" />
      </FormSection>

      <FormSection
        title="Other earnings"
        description="Optional extra allowances (e.g. medical, transport)."
        single
        aside={<Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append({ name: '', amount: '' })}>Add component</Button>}
      >
        {fields.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No additional components. Add one if needed.</p>
        ) : (
          fields.map((f, i) => (
            <div className="pay-earnrow" key={f.id}>
              <FormInput<SalaryStructureValues> name={`otherEarnings.${i}.name`} label={i === 0 ? 'Component' : undefined} placeholder="e.g. Medical allowance" />
              <FormInput<SalaryStructureValues> name={`otherEarnings.${i}.amount`} label={i === 0 ? 'Amount' : undefined} type="text" inputMode="decimal" placeholder="0" />
              <div className="pay-earnrow__rm">
                <Button type="button" variant="ghost" size="sm" leftIcon="x" aria-label={`Remove component ${i + 1}`} onClick={() => remove(i)} />
              </div>
            </div>
          ))
        )}
      </FormSection>

      <FormSection title="Statutory deductions" description="India defaults — toggle per staff. PT also varies by state.">
        <FormToggle<SalaryStructureValues> name="pfApplicable" label="Provident Fund (PF) — 12% of basic" />
        <FormToggle<SalaryStructureValues> name="esiApplicable" label="ESI — 0.75% of gross (gross ≤ ₹21,000)" />
        <FormToggle<SalaryStructureValues> name="ptApplicable" label="Professional Tax (PT)" />
        <FormInput<SalaryStructureValues> name="tdsMonthly" label="Monthly TDS (optional)" type="text" inputMode="decimal" placeholder="0" optional />
      </FormSection>

      <FormSection title="Summary" single>
        <InfoCard icon="info" title="Statutory note">
          PF, ESI and PT are computed from India defaults and are editable per staff. Professional Tax in particular varies by state — treat the figure as a sensible default, not a mandate.
        </InfoCard>
        <div className="pay-preview" style={{ marginTop: 12 }}>
          <div className="pay-preview__row"><span>Gross (monthly)</span><span className="fin-amount">{formatINR(d.gross)}</span></div>
          <div className="pay-preview__row"><span>PF</span><span className="fin-amount fin-amount--muted">− {formatINR(d.pf)}</span></div>
          <div className="pay-preview__row"><span>ESI</span><span className="fin-amount fin-amount--muted">− {formatINR(d.esi)}</span></div>
          <div className="pay-preview__row"><span>Professional Tax</span><span className="fin-amount fin-amount--muted">− {formatINR(d.pt)}</span></div>
          <div className="pay-preview__row"><span>TDS</span><span className="fin-amount fin-amount--muted">− {formatINR(d.tds)}</span></div>
          <div className="pay-preview__total"><span>Net (monthly)</span><span className="fin-amount fin-amount--paid">{formatINR(d.net)}</span></div>
          <div className="pay-preview__row" style={{ marginTop: 8 }}>
            <span>Annual CTC</span>
            <Badge variant="info">{formatINR(d.gross * 12)}</Badge>
          </div>
        </div>
      </FormSection>
      </fieldset>
    </FormPage>
  );
}
