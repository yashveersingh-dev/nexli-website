import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormTextarea, FormDate, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useComplianceItems, createComplianceItem, updateComplianceItem } from './data';
import { COMPLIANCE_CATEGORY_OPTIONS, COMPLIANCE_FREQUENCY_OPTIONS } from './meta';
import { complianceItemSchema, emptyComplianceItem, itemToForm, formToItem, type ComplianceItemValues } from './complianceSchema';
import type { ComplianceItem } from '@/types/compliance';

export function ComplianceItemFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: items, loading } = useComplianceItems(mode === 'edit' ? schoolId : undefined);
  const existing = items.find((i) => i.id === id);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !loading && !existing) {
    return <div className="nx-page"><EmptyState icon="shield-check" title="Item not found" action={<Button variant="subtle" onClick={() => navigate('/compliance')}>Back</Button>} /></div>;
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? itemToForm(existing) : emptyComplianceItem();

  return (
    <div className="nx-page">
      <Form<ComplianceItemValues>
        schema={complianceItemSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const base = formToItem(values);
            if (mode === 'new') {
              await createComplianceItem(schoolId, { ...base, schoolId, status: 'pending' } as Omit<ComplianceItem, 'id'>, actor);
              toast.success('Deadline added', base.title);
            } else {
              await updateComplianceItem(schoolId, id, base, actor);
              toast.success('Deadline updated', base.title);
            }
            navigate('/compliance');
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <Body mode={mode} onCancel={() => navigate('/compliance')} />
      </Form>
    </div>
  );
}

function Body({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { formState } = useFormContext<ComplianceItemValues>();
  return (
    <FormPage
      title={mode === 'new' ? 'New compliance deadline' : 'Edit deadline'}
      subtitle="Track a statutory / regulatory obligation with a due date and reminder."
      breadcrumbs={[{ label: 'Compliance', onClick: onCancel }, { label: mode === 'new' ? 'New' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Add deadline' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Obligation">
        <FormInput<ComplianceItemValues> name="title" label="Title" required placeholder="e.g. EPF monthly return" />
        <FormSelect<ComplianceItemValues> name="category" label="Category" required options={COMPLIANCE_CATEGORY_OPTIONS} />
        <FormInput<ComplianceItemValues> name="authority" label="Authority" placeholder="EPFO, CBSE, Fire dept…" />
        <FormSelect<ComplianceItemValues> name="frequency" label="Frequency" required options={COMPLIANCE_FREQUENCY_OPTIONS} />
        <FormDate<ComplianceItemValues> name="dueDate" label="Due date" required />
        <FormInput<ComplianceItemValues> name="reminderDays" label="Remind (days before)" type="number" inputMode="numeric" />
      </FormSection>

      <FormSection title="Ownership & notes">
        <FormInput<ComplianceItemValues> name="assignedToName" label="Owner" placeholder="Responsible staff" />
        <div className="nx-col-full">
          <FormTextarea<ComplianceItemValues> name="description" label="Description" rows={2} placeholder="What needs to be filed / done" />
        </div>
        <div className="nx-col-full">
          <FormTextarea<ComplianceItemValues> name="notes" label="Notes" rows={2} />
        </div>
      </FormSection>
    </FormPage>
  );
}
