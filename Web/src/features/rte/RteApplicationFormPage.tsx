import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades } from '@/features/school/data';
import { useRteApplications, createRteApplication, updateRteApplication } from '@/features/compliance/data';
import { RTE_CATEGORY_OPTIONS } from '@/features/compliance/meta';
import {
  rteApplicationSchema,
  emptyRteApplication,
  applicationToForm,
  formToApplication,
  type RteApplicationValues,
} from './rteSchema';
import type { RteApplication } from '@/types/compliance';

/** Dedicated routed form for creating / editing an RTE/EWS application. */
export function RteApplicationFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: apps, loading } = useRteApplications(mode === 'edit' ? schoolId : undefined);
  const { data: grades } = useGrades(schoolId);
  const existing = apps.find((a) => a.id === id);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !loading && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="award" title="Application not found" action={<Button variant="subtle" onClick={() => navigate('/rte')}>Back</Button>} />
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? applicationToForm(existing) : emptyRteApplication();

  return (
    <div className="nx-page">
      <Form<RteApplicationValues>
        schema={rteApplicationSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const base = formToApplication(values);
            // If a grade was picked from the list, keep its display name in sync.
            const grade = base.gradeId ? grades.find((g) => g.id === base.gradeId) : undefined;
            const payload = grade ? { ...base, gradeApplied: grade.name } : base;
            if (mode === 'new') {
              await createRteApplication(
                schoolId,
                { ...payload, schoolId, stage: 'applied', appliedDate: Date.now() } as Omit<RteApplication, 'id'>,
                actor,
              );
              toast.success('Application added', base.applicantName);
            } else {
              await updateRteApplication(schoolId, id, payload, actor);
              toast.success('Application updated', base.applicantName);
            }
            navigate('/rte');
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <Body mode={mode} grades={grades} onCancel={() => navigate('/rte')} />
      </Form>
    </div>
  );
}

function Body({
  mode,
  grades,
  onCancel,
}: {
  mode: 'new' | 'edit';
  grades: { id: string; name: string }[];
  onCancel: () => void;
}) {
  const { formState } = useFormContext<RteApplicationValues>();
  const gradeOptions = useMemo(
    () => [{ value: '', label: 'Not linked' }, ...grades.map((g) => ({ value: g.id, label: g.name }))],
    [grades],
  );

  return (
    <FormPage
      title={mode === 'new' ? 'New RTE application' : 'Edit application'}
      subtitle="Capture an RTE / EWS admission applicant for the 25% quota."
      breadcrumbs={[{ label: 'RTE', onClick: onCancel }, { label: mode === 'new' ? 'New' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Add application' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Applicant">
        <FormInput<RteApplicationValues> name="applicantName" label="Applicant name" required placeholder="Child's full name" />
        <FormInput<RteApplicationValues> name="guardianName" label="Guardian" placeholder="Parent / guardian" />
        <FormInput<RteApplicationValues> name="phone" label="Phone" type="tel" inputMode="tel" placeholder="+91…" />
        <FormSelect<RteApplicationValues> name="category" label="Category" required options={RTE_CATEGORY_OPTIONS} />
      </FormSection>

      <FormSection title="Admission">
        <FormSelect<RteApplicationValues> name="gradeId" label="Grade (linked)" options={gradeOptions} />
        <FormInput<RteApplicationValues> name="gradeApplied" label="Grade applied (label)" placeholder="e.g. Class 1 / Pre-Primary" />
        <FormInput<RteApplicationValues> name="academicYear" label="Academic year" placeholder="2026-27" />
        <FormInput<RteApplicationValues> name="applicationNo" label="Application no." placeholder="Govt. portal ref" />
        <FormInput<RteApplicationValues> name="annualIncome" label="Annual family income (₹)" type="number" inputMode="numeric" placeholder="e.g. 100000" />
      </FormSection>

      <FormSection title="Notes">
        <div className="nx-col-full">
          <FormTextarea<RteApplicationValues> name="notes" label="Notes" rows={2} placeholder="Documents pending, remarks…" />
        </div>
      </FormSection>
    </FormPage>
  );
}
