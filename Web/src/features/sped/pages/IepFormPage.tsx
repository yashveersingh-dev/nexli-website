import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  FormDate,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useIepPlan, createIepPlan, updateIepPlan } from '@/features/analytics/data';
import { IEP_GOAL_AREAS, IEP_GOAL_STATUS_META, IEP_STATUS_META } from '@/features/analytics/meta';
import { ConfidentialNote } from '../components/Confidential';
import { ChipListField } from '../components/ChipListField';
import {
  iepPlanSchema,
  emptyIepForm,
  emptyGoal,
  iepToForm,
  formToIep,
  type IepPlanValues,
} from '../iepSchema';
import type { IepPlan } from '@/types/special';
import '../sped.css';

const AREA_OPTIONS = IEP_GOAL_AREAS.map((a) => ({ value: a, label: a }));
const GOAL_STATUS_OPTIONS = (Object.keys(IEP_GOAL_STATUS_META) as IepPlanValues['goals'][number]['status'][]).map(
  (v) => ({ value: v, label: IEP_GOAL_STATUS_META[v].label }),
);
const PLAN_STATUS_OPTIONS = (Object.keys(IEP_STATUS_META) as IepPlanValues['status'][]).map((v) => ({
  value: v,
  label: IEP_STATUS_META[v].label,
}));

/** Dedicated page to create or edit an IEP plan (special educators only). */
export function IepFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('iep.write');
  const { data: existing, loading } = useIepPlan(
    mode === 'edit' ? schoolId : undefined,
    mode === 'edit' ? id : undefined,
  );
  const { data: students } = useStudents(schoolId);

  const back = () => navigate(mode === 'edit' ? `/sped/${id}` : '/sped');

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  if (!canWrite) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="Only special educators can create or edit IEP plans."
            action={
              <Button variant="subtle" onClick={() => navigate('/sped')}>
                Back
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }
  if (mode === 'edit' && loading) {
    return (
      <div className="nx-page">
        <Skeleton height={360} />
      </div>
    );
  }
  if (mode === 'edit' && !existing) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="file-text"
          title="Plan not found"
          action={
            <Button variant="subtle" onClick={() => navigate('/sped')}>
              Back
            </Button>
          }
        />
      </div>
    );
  }

  const defaults = mode === 'edit' && existing ? iepToForm(existing) : emptyIepForm();
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <ConfidentialNote />
      <Form<IepPlanValues>
        schema={iepPlanSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const student = students.find((s) => s.id === values.studentId);
            // On edit, carry each goal's append-only progressLog forward (and
            // append an entry for any status changed via the form).
            const base =
              mode === 'edit' && existing
                ? formToIep(values, existing.goals, actor)
                : formToIep(values);
            if (mode === 'new') {
              const payload: Omit<IepPlan, 'id'> = {
                ...base,
                schoolId,
                studentName: student?.fullName ?? 'Student',
                gradeName: student?.gradeName,
              };
              const newId = await createIepPlan(schoolId, payload, actor);
              toast.success('IEP plan created', payload.studentName);
              navigate(`/sped/${newId}`);
            } else {
              const patch: Partial<IepPlan> = {
                ...base,
                studentName: student?.fullName ?? existing?.studentName ?? 'Student',
                gradeName: student?.gradeName ?? existing?.gradeName,
              };
              await updateIepPlan(schoolId, id, patch, actor);
              toast.success('IEP plan updated', patch.studentName);
              navigate(`/sped/${id}`);
            }
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <Body mode={mode} students={students} onCancel={back} />
      </Form>
    </div>
  );
}

function Body({
  mode,
  students,
  onCancel,
}: {
  mode: 'new' | 'edit';
  students: { id: string; fullName: string; gradeName?: string; status: string }[];
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const { control, formState } = useFormContext<IepPlanValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'goals' });

  const studentOptions = useMemo(
    () =>
      students
        .filter((s) => s.status === 'active')
        .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
    [students],
  );

  return (
    <FormPage
      title={mode === 'new' ? 'New IEP plan' : 'Edit IEP plan'}
      subtitle={
        mode === 'new'
          ? 'Create an Individualised Education Plan for a child with special needs.'
          : 'Update the IEP plan.'
      }
      breadcrumbs={[
        { label: 'Special Education', onClick: () => navigate('/sped') },
        { label: mode === 'new' ? 'New plan' : 'Edit' },
      ]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Create plan' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Student & profile" description="The child and their support profile.">
        <FormSelect<IepPlanValues>
          name="studentId"
          label="Student"
          required
          placeholder="Select a student"
          options={studentOptions}
        />
        <FormSelect<IepPlanValues> name="status" label="Plan status" required options={PLAN_STATUS_OPTIONS} />
        <FormInput<IepPlanValues>
          name="disability"
          label="Disability"
          placeholder="e.g. Specific learning disability"
        />
        <FormInput<IepPlanValues> name="diagnosis" label="Diagnosis" placeholder="Clinical diagnosis (if any)" />
        <FormDate<IepPlanValues> name="startDate" label="Start date" />
        <FormDate<IepPlanValues> name="reviewDate" label="Next review date" />
      </FormSection>

      <FormSection title="Strengths & needs">
        <div className="nx-col-full">
          <FormTextarea<IepPlanValues>
            name="strengths"
            label="Strengths"
            rows={3}
            placeholder="What the student does well — interests, abilities, motivators."
          />
        </div>
        <div className="nx-col-full">
          <FormTextarea<IepPlanValues>
            name="needs"
            label="Needs"
            rows={3}
            placeholder="Areas where the student needs support."
          />
        </div>
        <div className="nx-col-full">
          <ChipListField<IepPlanValues>
            name="accommodations"
            label="Accommodations"
            hint="Press Enter or comma to add. e.g. extra time, scribe, seating at front."
            placeholder="Add an accommodation…"
          />
        </div>
      </FormSection>

      <FormSection
        title="Goals"
        description="At least one measurable goal. Track progress per goal."
        single
        aside={
          <Button
            type="button"
            variant="subtle"
            size="sm"
            leftIcon="plus"
            onClick={() => append(emptyGoal())}
          >
            Add goal
          </Button>
        }
      >
        {fields.map((f, i) => (
          <div className="sped-goal" key={f.id}>
            <div className="sped-goal__head">
              <span className="sped-goal__title">Goal {i + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  className="sped-goal__remove"
                  onClick={() => remove(i)}
                  aria-label={`Remove goal ${i + 1}`}
                >
                  <Icon name="minus-circle" size={14} /> Remove
                </button>
              )}
            </div>
            <div className="nx-section__grid">
              <FormSelect<IepPlanValues> name={`goals.${i}.area`} label="Area" required options={AREA_OPTIONS} />
              <FormSelect<IepPlanValues>
                name={`goals.${i}.status`}
                label="Status"
                required
                options={GOAL_STATUS_OPTIONS}
              />
              <FormRow>
                <FormInput<IepPlanValues>
                  name={`goals.${i}.goal`}
                  label="Goal"
                  required
                  placeholder="Measurable target, e.g. read 30 sight words by term end"
                />
              </FormRow>
              <FormRow>
                <FormTextarea<IepPlanValues>
                  name={`goals.${i}.strategy`}
                  label="Strategy"
                  rows={2}
                  placeholder="Approach / supports to reach this goal."
                />
              </FormRow>
              <FormDate<IepPlanValues> name={`goals.${i}.targetDate`} label="Target date" />
            </div>
          </div>
        ))}
      </FormSection>

      <FormSection title="Support team">
        <div className="nx-col-full">
          <ChipListField<IepPlanValues>
            name="teamMembers"
            label="Team members"
            hint="Press Enter or comma to add. e.g. special educator, class teacher, parent, therapist."
            placeholder="Add a team member…"
          />
        </div>
      </FormSection>
    </FormPage>
  );
}
