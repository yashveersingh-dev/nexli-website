import { useFieldArray, useFormContext } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState, InfoCard } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormDate, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useVendors, usePurchaseOrders, createPurchaseOrder, updateRequisition, type Actor } from '@/features/finance/data';
import {
  purchaseOrderSchema, itemsToPO, poTotals, lineAmount, docNumber, type PurchaseOrderValues,
} from './expenseSchema';
import type { PurchaseOrder, Requisition } from '@/types/finance';

const emptyItem = () => ({ name: '', qty: '1', unit: '', rate: '' });

const emptyForm = (): PurchaseOrderValues => ({
  vendorId: '', expectedDate: '', taxPercent: '', note: '', items: [emptyItem()],
});

/** Build prefill values from an approved requisition (passed via router state). */
function fromRequisition(req: Requisition): PurchaseOrderValues {
  return {
    vendorId: '', expectedDate: '', taxPercent: '', note: `From requisition ${req.reqNo}`,
    items: req.items.length
      ? req.items.map((it) => ({ name: it.name, qty: String(it.qty), unit: it.unit ?? '', rate: it.estCost != null ? String(it.estCost) : '' }))
      : [emptyItem()],
  };
}

export function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: vendors } = useVendors(schoolId);
  const { data: orders } = usePurchaseOrders(schoolId);

  const requisition = (location.state as { requisition?: Requisition } | null)?.requisition;
  const back = () => navigate('/expense');

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return <div className="nx-page"><EmptyState icon="lock" title="Not allowed" message="Purchase orders are issued by Accounts. To request a purchase, raise a requisition instead." action={<Button variant="subtle" onClick={back}>Back</Button>} /></div>;
  }

  const activeVendors = vendors.filter((v) => v.active !== false);
  const vendorOptions = activeVendors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((v) => ({ value: v.id, label: v.name }));
  const vendorName = (vid: string) => vendors.find((v) => v.id === vid)?.name;

  const defaults = requisition ? fromRequisition(requisition) : emptyForm();

  return (
    <div className="nx-page">
      <Form<PurchaseOrderValues>
        schema={purchaseOrderSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const items = itemsToPO(values);
            const { subtotal, taxPercent, taxAmount, total } = poTotals(
              values.items.map((it) => ({ qty: it.qty, rate: it.rate })), values.taxPercent,
            );
            const payload: Omit<PurchaseOrder, 'id'> = {
              schoolId,
              poNo: docNumber('PO', orders.length),
              requisitionId: requisition?.id,
              vendorId: values.vendorId,
              vendorName: vendorName(values.vendorId),
              items,
              subtotal,
              taxPercent: taxPercent || undefined,
              taxAmount: taxAmount || undefined,
              total,
              status: 'issued',
              orderedDate: Date.now(),
              expectedDate: values.expectedDate ? new Date(`${values.expectedDate}T00:00:00`).getTime() : undefined,
              note: values.note?.trim() || undefined,
            };
            const newId = await createPurchaseOrder(schoolId, payload, actor);
            // Mark the source requisition as ordered (link maintained both ways).
            if (requisition) await updateRequisition(schoolId, requisition.id, { status: 'ordered' }, actor);
            toast.success('Purchase order issued', payload.poNo);
            navigate(`/expense/po/${newId}`);
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <POBody vendorOptions={vendorOptions} hasVendors={activeVendors.length > 0} requisition={requisition} onCancel={back} />
      </Form>
    </div>
  );
}

function POBody({ vendorOptions, hasVendors, requisition, onCancel }: {
  vendorOptions: { value: string; label: string }[]; hasVendors: boolean; requisition?: Requisition; onCancel: () => void;
}) {
  const { control, watch, formState } = useFormContext<PurchaseOrderValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const taxPercent = watch('taxPercent');
  const totals = poTotals((items ?? []).map((it) => ({ qty: it.qty, rate: it.rate })), taxPercent);

  return (
    <FormPage
      title="New purchase order"
      subtitle="Order goods from a vendor. Amounts compute from quantity × rate, plus optional tax."
      breadcrumbs={[{ label: 'Purchase orders', onClick: onCancel }, { label: 'New' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Issue purchase order"
      submitIcon="check"
      submitDisabled={!hasVendors}
      submitting={formState.isSubmitting}
    >
      {requisition && (
        <InfoCard icon="file-text" title={`Prefilled from ${requisition.reqNo}`}>
          Items copied from “{requisition.title}”. Pick the vendor and adjust rates, then issue.
        </InfoCard>
      )}

      <FormSection title="Vendor &amp; delivery" description={hasVendors ? undefined : 'No active vendors — add one on the Vendors tab first.'}>
        {hasVendors ? (
          <FormSelect<PurchaseOrderValues> name="vendorId" label="Vendor" required placeholder="Select a vendor" options={vendorOptions} />
        ) : (
          <div className="nx-col-full"><InfoCard icon="building" title="Add a vendor first">Create a vendor on the Vendors tab, then return here to raise the PO.</InfoCard></div>
        )}
        <FormDate<PurchaseOrderValues> name="expectedDate" label="Expected delivery" optional />
      </FormSection>

      <FormSection
        title="Items"
        description="Each line: name, quantity, unit and rate. Amount = qty × rate."
        single
        aside={<Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append(emptyItem())}>Add item</Button>}
      >
        {fields.map((f, i) => {
          const amt = lineAmount(items?.[i]?.qty ?? '', items?.[i]?.rate ?? '');
          return (
            <div className="exp-itemrow exp-itemrow--po" key={f.id}>
              <FormInput<PurchaseOrderValues> name={`items.${i}.name`} label={i === 0 ? 'Item' : undefined} placeholder="Item name" />
              <FormInput<PurchaseOrderValues> name={`items.${i}.qty`} label={i === 0 ? 'Qty' : undefined} type="number" inputMode="numeric" placeholder="1" />
              <FormInput<PurchaseOrderValues> name={`items.${i}.unit`} label={i === 0 ? 'Unit' : undefined} placeholder="pcs" />
              <FormInput<PurchaseOrderValues> name={`items.${i}.rate`} label={i === 0 ? 'Rate (₹)' : undefined} type="text" inputMode="decimal" placeholder="0" />
              <div className="exp-itemrow__amt" aria-label="Line amount">{formatINR(amt)}</div>
              <div className="fin-itemrow__rm">
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" leftIcon="x" aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} />
                )}
              </div>
            </div>
          );
        })}
      </FormSection>

      <FormSection title="Tax &amp; notes">
        <FormInput<PurchaseOrderValues> name="taxPercent" label="Tax (GST %)" optional type="number" inputMode="decimal" placeholder="0" />
        <FormTextarea<PurchaseOrderValues> name="note" label="Note" optional rows={2} placeholder="Delivery instructions, terms…" fieldClassName="nx-col-full" />
        <div className="nx-col-full">
          <div className="fin-summary" style={{ marginBottom: 0 }}>
            <div className="fin-summary__card"><div className="fin-summary__label">Subtotal</div><div className="fin-summary__value">{formatINR(totals.subtotal)}</div></div>
            <div className="fin-summary__card"><div className="fin-summary__label">Tax ({totals.taxPercent || 0}%)</div><div className="fin-summary__value">{formatINR(totals.taxAmount)}</div></div>
            <div className="fin-summary__card"><div className="fin-summary__label">Total</div><div className="fin-summary__value" style={{ color: 'var(--gold, var(--accent))' }}>{formatINR(totals.total)}</div></div>
          </div>
        </div>
      </FormSection>
    </FormPage>
  );
}
