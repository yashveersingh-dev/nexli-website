import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormDate, FormCheckbox, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useExpenses, useVendors, createExpense, updateExpense, type Actor } from '@/features/finance/data';
import { EXPENSE_CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/features/finance/meta';
import { expenseSchema, docNumber, type ExpenseValues } from './expenseSchema';
import type { Expense } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): ExpenseValues => ({
  category: 'misc', description: '', vendorId: '', amount: '', date: today(),
  method: 'cash', reference: '', pettyCash: false, billUrl: '',
});

function toForm(e: Expense): ExpenseValues {
  return {
    category: e.category,
    description: e.description,
    vendorId: e.vendorId ?? '',
    amount: String(e.amount),
    date: new Date(e.date).toISOString().slice(0, 10),
    method: e.method ?? 'cash',
    reference: e.reference ?? '',
    pettyCash: e.pettyCash ?? false,
    billUrl: e.billUrl ?? '',
  };
}

export function ExpenseFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: expenses, loading } = useExpenses(schoolId);
  const { data: vendors } = useVendors(schoolId);
  const existing = mode === 'edit' ? expenses.find((e) => e.id === id) : undefined;

  const back = () => navigate('/expense');

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return <div className="nx-page"><EmptyState icon="lock" title="Not allowed" message="Expenses are recorded by Accounts. To request a purchase, raise a requisition instead." action={<Button variant="subtle" onClick={back}>Back</Button>} /></div>;
  }
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return <div className="nx-page"><EmptyState icon="wallet" title="Expense not found" action={<Button variant="subtle" onClick={back}>Back</Button>} /></div>;
  }

  const defaults = mode === 'edit' && existing ? toForm(existing) : emptyForm();
  const vendorOptions = [{ value: '', label: 'No vendor' }, ...vendors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((v) => ({ value: v.id, label: v.name }))];
  const vendorName = (vid: string) => vendors.find((v) => v.id === vid)?.name;

  return (
    <div className="nx-page">
      <Form<ExpenseValues>
        schema={expenseSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const date = new Date(`${values.date}T00:00:00`).getTime();
            const base = {
              schoolId,
              category: values.category,
              description: values.description.trim(),
              vendorId: values.vendorId || undefined,
              vendorName: values.vendorId ? vendorName(values.vendorId) : undefined,
              amount: Number(values.amount) || 0,
              date,
              method: values.method,
              reference: values.reference?.trim() || undefined,
              pettyCash: values.pettyCash,
              billUrl: values.billUrl?.trim() || undefined,
            };
            if (mode === 'new') {
              const payload: Omit<Expense, 'id'> = {
                ...base,
                expenseNo: docNumber('EXP', expenses.length, new Date(date).getFullYear()),
                status: 'recorded',
                recordedByUid: actor.uid,
                recordedByName: actor.name,
              };
              await createExpense(schoolId, payload, actor);
              toast.success('Expense recorded', base.description);
            } else {
              await updateExpense(schoolId, id, base, actor);
              toast.success('Expense updated', base.description);
            }
            back();
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <ExpenseBody mode={mode} vendorOptions={vendorOptions} onCancel={back} />
      </Form>
    </div>
  );
}

function ExpenseBody({ mode, vendorOptions, onCancel }: {
  mode: 'new' | 'edit'; vendorOptions: { value: string; label: string }[]; onCancel: () => void;
}) {
  const { formState } = useFormContext<ExpenseValues>();

  return (
    <FormPage
      title={mode === 'new' ? 'Record expense' : 'Edit expense'}
      subtitle="Capture a spend with its category, amount and payment details."
      breadcrumbs={[{ label: 'Expenses', onClick: onCancel }, { label: mode === 'new' ? 'New' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Record expense' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Details">
        <FormInput<ExpenseValues> name="description" label="Description" required placeholder="e.g. June electricity bill" fieldClassName="nx-col-full" />
        <FormSelect<ExpenseValues> name="category" label="Category" required options={EXPENSE_CATEGORY_OPTIONS} />
        <FormSelect<ExpenseValues> name="vendorId" label="Vendor" optional options={vendorOptions} />
        <FormInput<ExpenseValues> name="amount" label="Amount (₹)" required type="text" inputMode="decimal" placeholder="0" />
        <FormDate<ExpenseValues> name="date" label="Date" required max={today()} />
      </FormSection>

      <FormSection title="Payment">
        <FormSelect<ExpenseValues> name="method" label="Method" required options={PAYMENT_METHOD_OPTIONS} />
        <FormInput<ExpenseValues> name="reference" label="Reference / txn id" optional placeholder="Cheque no., UPI ref…" />
        <FormCheckbox<ExpenseValues> name="pettyCash" label="Paid from petty cash" fieldClassName="nx-col-full" />
      </FormSection>

      <FormSection title="Bill" description="Paste a link to the scanned bill / invoice (file upload coming soon).">
        <FormInput<ExpenseValues> name="billUrl" label="Bill URL" optional type="url" placeholder="https://…" fieldClassName="nx-col-full" />
      </FormSection>
    </FormPage>
  );
}
