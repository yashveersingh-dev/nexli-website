import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { Field } from '@/components/form';
import { Form, FormInput, FormDate, FormToggle, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades } from '@/features/school/data';
import { useExams, createExam, updateExam } from '@/features/daily/data';
import type { Exam } from '@/types/daily';
import { examSchema, emptyExamForm, type ExamFormValues } from './examSchema';
import './examinations.css';

export function ExamFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school, can } = useSession();
  const canWrite = can('exams.write');
  const { data: exams, loading } = useExams(schoolId);

  const editing = id ? exams.find((e) => e.id === id) : undefined;
  const isEdit = !!id;

  if (!schoolId) return <div className="nx-page"><EmptyState icon="file-text" title="No school context" /></div>;
  if (!canWrite) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="You can't edit exams" message="Ask an administrator for examination access." action={<Button variant="subtle" onClick={() => navigate('/examinations')}>Back to exams</Button>} />
      </div>
    );
  }
  if (isEdit && loading) return <div className="nx-page"><Skeleton height={120} /><div style={{ height: 12 }} /><Skeleton height={320} /></div>;
  if (isEdit && !editing) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Exam not found" action={<Button variant="subtle" onClick={() => navigate('/examinations')}>Back to exams</Button>} />
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const defaults: ExamFormValues = editing
    ? {
        name: editing.name,
        academicYear: editing.academicYear ?? '',
        gradeIds: editing.gradeIds ?? [],
        startDate: editing.startDate ? new Date(editing.startDate).toISOString().slice(0, 10) : '',
        endDate: editing.endDate ? new Date(editing.endDate).toISOString().slice(0, 10) : '',
        published: !!editing.published,
      }
    : emptyExamForm(school?.currentAcademicYear ?? '');

  return (
    <div className="nx-page">
      <Form<ExamFormValues>
        schema={examSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const payload: Omit<Exam, 'id'> = {
              schoolId,
              name: values.name.trim(),
              academicYear: values.academicYear?.trim() || undefined,
              gradeIds: values.gradeIds && values.gradeIds.length ? values.gradeIds : undefined,
              startDate: values.startDate ? new Date(values.startDate).getTime() : undefined,
              endDate: values.endDate ? new Date(values.endDate).getTime() : undefined,
              published: !!values.published,
            };
            if (editing) {
              await updateExam(schoolId, editing.id, payload, actor);
              toast.success('Exam updated', payload.name);
              navigate(`/examinations/${editing.id}`);
            } else {
              const newId = await createExam(schoolId, payload, actor);
              toast.success('Exam created', payload.name);
              navigate(`/examinations/${newId}`);
            }
          } catch {
            toast.error('Could not save', 'It will sync when you are back online.');
          }
        }}
      >
        <ExamFormBody isEdit={isEdit} onCancel={() => navigate(isEdit && editing ? `/examinations/${editing.id}` : '/examinations')} />
      </Form>
    </div>
  );
}

function ExamFormBody({ isEdit, onCancel }: { isEdit: boolean; onCancel: () => void }) {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { data: grades } = useGrades(schoolId);
  const { watch, setValue, formState } = useFormContext<ExamFormValues>();

  const selected = watch('gradeIds') ?? [];
  const sortedGrades = useMemo(() => grades.slice().sort((a, b) => a.order - b.order), [grades]);

  const toggleGrade = (gid: string) => {
    const next = selected.includes(gid) ? selected.filter((g) => g !== gid) : [...selected, gid];
    setValue('gradeIds', next, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <FormPage
      title={isEdit ? 'Edit exam' : 'New exam'}
      subtitle="An exam term groups subject papers (the datesheet) and per-student results."
      breadcrumbs={[{ label: 'Examinations', onClick: () => navigate('/examinations') }, { label: isEdit ? 'Edit' : 'New' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save changes' : 'Create exam'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Details" description="Name the term and set its academic year.">
        <FormInput<ExamFormValues> name="name" label="Name" required placeholder="e.g. Term 1, Half Yearly, Annual" />
        <FormInput<ExamFormValues> name="academicYear" label="Academic year" optional placeholder="2025–2026" />
      </FormSection>

      <FormSection title="Schedule" description="When the exam term runs (used on the datesheet).">
        <FormDate<ExamFormValues> name="startDate" label="Start date" optional />
        <FormDate<ExamFormValues> name="endDate" label="End date" optional />
      </FormSection>

      <FormSection title="Grades" description="Which grades sit this exam." single>
        {sortedGrades.length === 0 ? (
          <EmptyState icon="award" title="No grades yet" message="Add grades in Academics before scheduling an exam." />
        ) : (
          <Field label="Applicable grades" optional hint={selected.length ? `${selected.length} selected` : 'Tap to select one or more grades'}>
            <div className="nx-chipset" role="group" aria-label="Applicable grades">
              {sortedGrades.map((g) => {
                const on = selected.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`nx-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleGrade(g.id)}
                  >
                    {on && <Icon name="check" size={14} className="nx-chip__check" />}
                    {g.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </FormSection>

      <FormSection title="Visibility" description="Published exams are visible to parents and students." single>
        <FormToggle<ExamFormValues>
          name="published"
          label="Published"
          description="Datesheet and released results become visible to families."
        />
        {!isEdit && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}><Badge variant="muted">Tip</Badge> You can publish later from the exam detail once results are ready.</p>}
      </FormSection>
    </FormPage>
  );
}
