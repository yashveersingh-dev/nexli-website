import { useFieldArray, useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/feedback';
import { Form, FormInput, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useRequisitions, useRequisition, createRequisition, updateRequisition, type Actor,
} from '@/features/finance/data';
import {
  requisitionSchema, itemsToRequisition, requisitionEstTotal, docNumber, type RequisitionValues,
} from './expenseSchema';
import { ExpenseFlow } from './ExpenseFlow';
import type { Requisition } from '@/types/finance';

const emptyItem = () => ({ name: '', qty: '1', unit: '', estCost: '' });

const emptyForm = (): RequisitionValues => ({
  title: '', department: '', justification: '', items: [emptyItem()],
});

/** Reverse of `itemsToRequisition` — a saved requisition → editable form values. */
const reqToValues = (req: Requisition): RequisitionValues => ({
  title: req.title,
  department: req.department ?? '',
  justification: req.justification ?? '',
  items: req.items.length
    ? req.items.map((it) => ({
        name: it.name,
        qty: String(it.qty ?? ''),
        unit: it.unit ?? '',
        estCost: it.estCost != null ? String(it.estCost) : '',
      }))
    : [emptyItem()],
});

export function RequisitionFormPage({ mode = 'new' }: { mode?: 'new' | 'edit' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { id = '' } = useParams();
  const { schoolId, uid, member } = useSession();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: requisitions } = useRequisitions(schoolId);
  const { data: existing, loading } = useRequisition(schoolId, mode === 'edit' ? id : undefined);

  const back = () => navigate('/expense');
  const backToDetail = () => navigate(mode === 'edit' && id ? `/expense/requisitions/${id}` : '/expense');

  // Raising a requisition is a *request* open to any active staff member; it
  // flows to Accounts/approvers. Intentionally not gated on canOperate.
  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;

  if (mode === 'edit') {
    if (loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={320} /></div>;
    if (!existing) {
      return <div className="nx-page"><EmptyState icon="file-text" title="Requisition not found" message="This requisition may have been removed." action={<Button variant="subtle" onClick={back}>Back</Button>} /></div>;
    }
  }

  return (
    <div className="nx-page">
      <Form<RequisitionValues>
        schema={requisitionSchema}
        defaultValues={mode === 'edit' && existing ? reqToValues(existing) : emptyForm()}
        onSubmit={async (values) => {
          try {
            const items = itemsToRequisition(values);
            const estTotal = items.reduce((s, it) => s + (it.estCost ?? 0) * it.qty, 0);
            if (mode === 'edit' && existing) {
              await updateRequisition(schoolId, existing.id, {
                title: values.title.trim(),
                department: values.department?.trim() || undefined,
                items,
                estTotal,
                justification: values.justification?.trim() || undefined,
              }, actor);
              toast.success('Requisition updated', 'Resubmit it for approval when ready.');
              navigate(`/expense/requisitions/${existing.id}`);
              return;
            }
            const payload: Omit<Requisition, 'id'> = {
              schoolId,
              reqNo: docNumber('REQ', requisitions.length),
              title: values.title.trim(),
              department: values.department?.trim() || undefined,
              items,
              estTotal,
              justification: values.justification?.trim() || undefined,
              status: 'draft',
              requestedByUid: actor.uid,
              requestedByName: actor.name,
            };
            const newId = await createRequisition(schoolId, payload, actor);
            toast.success('Requisition created', payload.title);
            navigate(`/expense/requisitions/${newId}`);
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <RequisitionBody mode={mode} onCancel={backToDetail} />
      </Form>
    </div>
  );
}

function RequisitionBody({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { control, watch, formState } = useFormContext<RequisitionValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const liveTotal = requisitionEstTotal((items ?? []).map((it) => ({ qty: it.qty, estCost: it.estCost })));
  const editing = mode === 'edit';

  return (
    <FormPage
      title={editing ? 'Edit requisition' : 'New requisition'}
      subtitle={editing
        ? 'Update what you need, then resubmit it for approval.'
        : 'List what you need and why. Submit for approval, then convert to a purchase order.'}
      breadcrumbs={[{ label: 'Requisitions', onClick: onCancel }, { label: editing ? 'Edit' : 'New' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={editing ? 'Save changes' : 'Create requisition'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      {!editing && <ExpenseFlow title="What happens next" />}

      <FormSection title="Details">
        <FormInput<RequisitionValues> name="title" label="Title" required placeholder="e.g. Science lab consumables" />
        <FormInput<RequisitionValues> name="department" label="Department" optional placeholder="e.g. Science" />
        <FormTextarea<RequisitionValues> name="justification" label="Justification" optional rows={2} placeholder="Why is this needed?" fieldClassName="nx-col-full" />
      </FormSection>

      <FormSection
        title="Items"
        description="Add each item with quantity, unit and an estimated unit cost."
        single
        aside={<Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append(emptyItem())}>Add item</Button>}
      >
        {fields.map((f, i) => (
          <div className="exp-itemrow exp-itemrow--req" key={f.id}>
            <FormInput<RequisitionValues> name={`items.${i}.name`} label={i === 0 ? 'Item' : undefined} placeholder="Item name" />
            <FormInput<RequisitionValues> name={`items.${i}.qty`} label={i === 0 ? 'Qty' : undefined} type="number" inputMode="numeric" placeholder="1" />
            <FormInput<RequisitionValues> name={`items.${i}.unit`} label={i === 0 ? 'Unit' : undefined} placeholder="pcs" />
            <FormInput<RequisitionValues> name={`items.${i}.estCost`} label={i === 0 ? 'Est. cost (₹)' : undefined} type="text" inputMode="decimal" placeholder="0" />
            <div className="fin-itemrow__rm">
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="sm" leftIcon="x" aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} />
              )}
            </div>
          </div>
        ))}
        <div className="fin-doc__total" style={{ fontSize: 15, marginTop: 14 }}>
          <span>Estimated total</span><span className="fin-amount">{formatINR(liveTotal)}</span>
        </div>
      </FormSection>
    </FormPage>
  );
}
