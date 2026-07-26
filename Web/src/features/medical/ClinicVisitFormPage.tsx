import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/Button';
import {
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  FormDate,
  FormToggle,
  FormPage,
  FormSection,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { createClinicVisit } from '@/features/ops/data';
import { VISIT_OUTCOME_OPTIONS } from '@/features/ops/meta';
import { useStudents, useGrades } from '@/features/school/data';
import { visitSchema, emptyVisit, formToVisit, type VisitValues } from './visitSchema';
import './medical.css';

export function ClinicVisitFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const { data: students } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const canWrite = useOwnership('medical').canOperate;

  const back = () => navigate('/medical');

  if (!can('medical.read')) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="Restricted" message="Medical records are limited to clinic staff." />
      </div>
    );
  }
  if (!canWrite) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="lock"
          title="Read-only access"
          message="You can view clinic records but not log new visits."
          action={<Button variant="subtle" onClick={back}>Back to clinic</Button>}
        />
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Form<VisitValues>
        schema={visitSchema}
        defaultValues={emptyVisit}
        onSubmit={async (values) => {
          if (!schoolId) return;
          const student = students.find((s) => s.id === values.studentId);
          if (!student) {
            toast.error('Select a student', 'Choose the student this visit is for.');
            return;
          }
          const gradeName = grades.find((g) => g.id === student.gradeId)?.name;
          try {
            const payload = formToVisit(values, {
              studentName: student.fullName,
              gradeName,
              attendedByName: member?.name,
            });
            await createClinicVisit(schoolId, { ...payload, schoolId }, actor);
            toast.success('Visit logged', student.fullName);
            navigate('/medical');
          } catch {
            toast.error('Could not log visit', 'Please try again.');
          }
        }}
      >
        <VisitFormBody onCancel={back} />
      </Form>
    </div>
  );
}

function VisitFormBody({ onCancel }: { onCancel: () => void }) {
  const { schoolId } = useSession();
  const { watch, formState } = useFormContext<VisitValues>();
  const { data: students } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);

  const studentOptions = useMemo(
    () =>
      [...students]
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((s) => {
          const grade = grades.find((g) => g.id === s.gradeId)?.name;
          return { value: s.id, label: grade ? `${s.fullName} · ${grade}` : s.fullName };
        }),
    [students, grades],
  );

  const outcome = watch('outcome');
  // Any outcome where the child leaves school care, or is referred on, needs the
  // parent/guardian informed before the visit is closed.
  const escalated = outcome === 'referred' || outcome === 'hospital' || outcome === 'sent_home';

  return (
    <FormPage
      title="Log clinic visit"
      subtitle="Record a student's visit to the clinic, treatment given and outcome."
      breadcrumbs={[{ label: 'Medical & Clinic', onClick: onCancel }, { label: 'Log visit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Log visit"
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <div className="med-confidential" role="note">
        <Icon name="lock" size={13} />
        <span>Confidential — clinic staff only. Recorded against the student's health file.</span>
      </div>

      <FormSection title="Visit">
        <FormSelect<VisitValues>
          name="studentId"
          label="Student"
          required
          placeholder={studentOptions.length ? 'Select student' : 'No students found'}
          options={studentOptions}
        />
        <FormDate<VisitValues> name="date" label="Date" required />
        <FormInput<VisitValues>
          name="temperature"
          label="Temperature (°C)"
          inputMode="decimal"
          placeholder="e.g. 37.5"
        />
        <div className="nx-col-full">
          <FormTextarea<VisitValues>
            name="complaint"
            label="Complaint / reason"
            required
            rows={2}
            placeholder="What did the student report?"
          />
        </div>
      </FormSection>

      <FormSection title="Assessment & treatment">
        <FormInput<VisitValues> name="diagnosis" label="Diagnosis / observation" placeholder="e.g. Mild fever" />
        <FormInput<VisitValues> name="medicineGiven" label="Medicine given" placeholder="e.g. Paracetamol 250mg" />
        <div className="nx-col-full">
          <FormTextarea<VisitValues> name="treatment" label="Treatment / care given" rows={2} />
        </div>
      </FormSection>

      <FormSection title="Outcome">
        <FormSelect<VisitValues> name="outcome" label="Outcome" required options={VISIT_OUTCOME_OPTIONS} />
        <div className="med-toggle-cell">
          <FormToggle<VisitValues> name="parentNotified" label="Parent / guardian notified" />
        </div>
        <div className="nx-col-full">
          <FormTextarea<VisitValues>
            name="followUp"
            label="Follow-up / advice"
            rows={2}
            placeholder="Rest advised, review tomorrow, etc."
          />
        </div>
        {escalated && (
          <div className="nx-col-full">
            <div className="med-alert" role="note">
              <Icon name="alert-triangle" size={16} />
              <span>
                {outcome === 'sent_home'
                  ? 'The student is leaving school care — confirm the parent/guardian is informed and the pickup is arranged before closing.'
                  : 'This is an escalated outcome — ensure the parent/guardian is informed and the referral is documented above.'}
              </span>
            </div>
          </div>
        )}
      </FormSection>
    </FormPage>
  );
}
