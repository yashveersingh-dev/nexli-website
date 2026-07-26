import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormDate, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades, useSections, useSubjects } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { createAssessment } from '@/features/daily/data';
import { ASSESSMENT_TYPE_OPTIONS } from '@/features/daily/meta';
import type { Assessment, AssessmentType } from '@/types/daily';
import { assessmentSchema, emptyAssessmentForm, type AssessmentFormValues } from './assessmentSchema';
import './gradebook.css';

export function AssessmentFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: subjects } = useSubjects(schoolId);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="file-text" title="No school context" /></div>;

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name;

  return (
    <div className="nx-page">
      <Form<AssessmentFormValues>
        schema={assessmentSchema}
        defaultValues={emptyAssessmentForm()}
        onSubmit={async (values) => {
          try {
            const section = sections.find((s) => s.id === values.sectionId);
            const subject = subjects.find((s) => s.id === values.subjectId);
            const payload: Omit<Assessment, 'id'> = {
              schoolId,
              name: values.name.trim(),
              type: values.type as AssessmentType,
              sectionId: values.sectionId,
              sectionName: section ? `${gradeName(section.gradeId) ?? ''} ${section.name}`.trim() : undefined,
              subjectId: values.subjectId || undefined,
              subjectName: subject?.name,
              maxMarks: Number(values.maxMarks),
              date: values.date ? new Date(values.date).getTime() : undefined,
              published: false,
            };
            const newId = await createAssessment(schoolId, payload, actor);
            toast.success('Assessment created', payload.name);
            navigate(`/gradebook/${newId}`);
          } catch {
            toast.error('Could not create', 'Please try again.');
          }
        }}
      >
        <AssessmentFormBody onCancel={() => navigate('/gradebook')} />
      </Form>
    </div>
  );
}

function AssessmentFormBody({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { watch, formState } = useFormContext<AssessmentFormValues>();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: subjects } = useSubjects(schoolId);

  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name;
  const sectionId = watch('sectionId');
  const section = sections.find((s) => s.id === sectionId);
  // A scoped teacher may only create assessments for their own section(s).
  const { isBroad, sectionIds } = useScopedSectionIds('gradebook', 'gradebook.read', sections);
  const assignableSections = isBroad || !sectionIds ? sections : sections.filter((s) => sectionIds.has(s.id));

  const sectionOptions = assignableSections.map((s) => ({ value: s.id, label: `${gradeName(s.gradeId) ?? ''} ${s.name}`.trim() }));
  const subjectOptions = [
    { value: '', label: 'No subject' },
    ...subjects
      .filter((sub) => !section || !sub.gradeIds?.length || sub.gradeIds.includes(section.gradeId))
      .map((sub) => ({ value: sub.id, label: sub.name })),
  ];

  return (
    <FormPage
      title="New assessment"
      subtitle="Create a class test, assignment or project to record marks against."
      breadcrumbs={[{ label: 'Gradebook', onClick: () => navigate('/gradebook') }, { label: 'New' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Create assessment"
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Details" description="What is being assessed and out of how many marks.">
        <FormInput<AssessmentFormValues> name="name" label="Name" required placeholder="e.g. Unit Test 1 — Algebra" />
        <FormSelect<AssessmentFormValues> name="type" label="Type" required options={ASSESSMENT_TYPE_OPTIONS} />
        <FormSelect<AssessmentFormValues> name="sectionId" label="Class / Section" required placeholder="Select a section" options={sectionOptions} />
        <FormSelect<AssessmentFormValues> name="subjectId" label="Subject" options={subjectOptions} />
        <FormInput<AssessmentFormValues> name="maxMarks" label="Maximum marks" required type="number" inputMode="numeric" min={1} placeholder="100" />
        <FormDate<AssessmentFormValues> name="date" label="Date" />
      </FormSection>
    </FormPage>
  );
}
