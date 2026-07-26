import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormCheckbox, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useFeeHeads, useFeeStructure, createFeeStructure, updateFeeStructure } from '@/features/finance/data';
import { useGrades } from '@/features/school/data';
import { FEE_FREQUENCY_OPTIONS, STUDENT_FEE_CATEGORY_OPTIONS } from '@/features/finance/meta';
import { feeStructureSchema, structureTotal, itemsToStructure, type FeeStructureValues } from './feeSchema';
import type { FeeStructure } from '@/types/finance';

const emptyForm = (year?: string): FeeStructureValues => ({
  name: '', academicYear: year ?? String(new Date().getFullYear()), gradeId: '', studentCategory: 'general',
  items: [{ headId: '', headName: '', category: 'misc', amount: '', frequency: 'annual' }], active: true,
});

function toForm(s: FeeStructure): FeeStructureValues {
  return {
    name: s.name, academicYear: s.academicYear, gradeId: s.gradeId ?? '', studentCategory: s.studentCategory ?? 'general',
    items: s.items.length ? s.items.map((it) => ({ headId: it.headId, headName: it.headName, category: it.category, amount: String(it.amount), frequency: it.frequency })) : emptyForm().items,
    active: s.active !== false,
  };
}

export function FeeStructureFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const canWrite = useOwnership('fees').canOperate;
  const { data: existing, loading } = useFeeStructure(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);
  const { data: heads } = useFeeHeads(schoolId);
  const { data: grades } = useGrades(schoolId);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return <div className="nx-page"><EmptyState icon="lock" title="Not allowed" message="Fee structures are managed by Accounts. You can review them from the Fees overview." action={<Button variant="subtle" onClick={() => navigate('/fees')}>Back to fees</Button>} /></div>;
  }
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return <div className="nx-page"><EmptyState icon="credit-card" title="Structure not found" action={<Button variant="subtle" onClick={() => navigate('/fees')}>Back</Button>} /></div>;
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? toForm(existing) : emptyForm(school?.currentAcademicYear);
  const headName = (hid: string) => heads.find((h) => h.id === hid)?.name ?? '';
  const headCategory = (hid: string) => heads.find((h) => h.id === hid)?.category ?? 'misc';
  const gradeName = (gid: string) => grades.find((g) => g.id === gid)?.name;

  return (
    <div className="nx-page">
      <Form<FeeStructureValues>
        schema={feeStructureSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const items = itemsToStructure(values, headName, headCategory);
            const total = structureTotal(items);
            const payload: Omit<FeeStructure, 'id'> = {
              schoolId, name: values.name.trim(), academicYear: values.academicYear.trim(),
              gradeId: values.gradeId || undefined, gradeName: values.gradeId ? gradeName(values.gradeId) : undefined,
              studentCategory: values.studentCategory, items, total, active: values.active,
            };
            if (mode === 'new') { await createFeeStructure(schoolId, payload, actor); toast.success('Structure created', payload.name); }
            else { await updateFeeStructure(schoolId, id, payload, actor); toast.success('Structure updated', payload.name); }
            navigate('/fees');
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <StructureBody mode={mode} heads={heads} grades={grades} onCancel={() => navigate('/fees')} />
      </Form>
    </div>
  );
}

function StructureBody({ mode, heads, grades, onCancel }: {
  mode: 'new' | 'edit'; heads: ReturnType<typeof useFeeHeads>['data']; grades: ReturnType<typeof useGrades>['data']; onCancel: () => void;
}) {
  const { control, watch, formState } = useFormContext<FeeStructureValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const liveTotal = structureTotal((items ?? []).map((it) => ({ amount: Number(it.amount) || 0, frequency: it.frequency })));

  const headOptions = heads.map((h) => ({ value: h.id, label: h.name }));
  const gradeOptions = [{ value: '', label: 'All grades' }, ...grades.slice().sort((a, b) => a.order - b.order).map((g) => ({ value: g.id, label: g.name }))];

  return (
    <FormPage
      title={mode === 'new' ? 'New fee structure' : 'Edit fee structure'}
      subtitle="Bundle fee heads with amounts. Per-term/monthly heads are annualised in the total."
      breadcrumbs={[{ label: 'Fees', onClick: onCancel }, { label: mode === 'new' ? 'New structure' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Create structure' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Details">
        <FormInput<FeeStructureValues> name="name" label="Structure name" required placeholder="e.g. Grade 1 — General" />
        <FormInput<FeeStructureValues> name="academicYear" label="Academic year" required placeholder="2025-26" />
        <FormSelect<FeeStructureValues> name="gradeId" label="Applies to grade" options={gradeOptions} />
        <FormSelect<FeeStructureValues> name="studentCategory" label="Student category" options={STUDENT_FEE_CATEGORY_OPTIONS} />
      </FormSection>

      <FormSection
        title="Fee heads"
        description={heads.length === 0 ? 'No fee heads yet — add them from the Structures tab first.' : 'Add each component with its amount and frequency.'}
        single
        aside={<Button type="button" variant="subtle" size="sm" leftIcon="plus" disabled={heads.length === 0} onClick={() => append({ headId: '', headName: '', category: 'misc', amount: '', frequency: 'annual' })}>Add head</Button>}
      >
        {heads.length === 0 ? (
          <InfoCard icon="info" title="Add fee heads first">Define fee heads (Tuition, Transport, …) on the Structures tab, then build the structure here.</InfoCard>
        ) : (
          <>
            {fields.map((f, i) => (
              <div className="fin-itemrow" key={f.id}>
                <FormSelect<FeeStructureValues> name={`items.${i}.headId`} label={i === 0 ? 'Fee head' : undefined} placeholder="Select head" options={headOptions} />
                <FormInput<FeeStructureValues> name={`items.${i}.amount`} label={i === 0 ? 'Amount' : undefined} type="text" inputMode="decimal" placeholder="0" />
                <FormSelect<FeeStructureValues> name={`items.${i}.frequency`} label={i === 0 ? 'Frequency' : undefined} options={FEE_FREQUENCY_OPTIONS} />
                <div className="fin-itemrow__rm">
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" leftIcon="x" aria-label={`Remove head ${i + 1}`} onClick={() => remove(i)} />
                  )}
                </div>
              </div>
            ))}
            <div className="fin-doc__total" style={{ fontSize: 15, marginTop: 14 }}>
              <span>Annual total</span><span className="fin-amount">{formatINR(liveTotal)}</span>
            </div>
          </>
        )}
      </FormSection>

      <FormSection title="Status">
        <FormCheckbox<FeeStructureValues> name="active" label="Active (available when assigning fees)" />
      </FormSection>
    </FormPage>
  );
}
