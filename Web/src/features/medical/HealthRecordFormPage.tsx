import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  FormPage,
  FormSection,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useMedicalRecord, createMedicalRecord, updateMedicalRecord } from '@/features/ops/data';
import { BLOOD_GROUPS } from '@/features/ops/meta';
import { useStudents, useGrades } from '@/features/school/data';
import { ChipListField } from './ChipListField';
import { recordSchema, emptyRecord, recordToForm, formToRecord, type RecordValues } from './recordSchema';
import './medical.css';

export function HealthRecordFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const { data: existing, loading } = useMedicalRecord(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);
  const { data: students } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const [defaults, setDefaults] = useState<RecordValues | null>(mode === 'new' ? emptyRecord : null);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const canWrite = useOwnership('medical').canOperate;
  const back = () => navigate('/medical');

  useEffect(() => {
    if (mode === 'edit' && existing) setDefaults(recordToForm(existing));
  }, [mode, existing]);

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
          message="You can view health records but not edit them."
          action={<Button variant="subtle" onClick={back}>Back to clinic</Button>}
        />
      </div>
    );
  }
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Record not found" action={<Button variant="subtle" onClick={back}>Back to clinic</Button>} />
      </div>
    );
  }
  if (!defaults) return <div className="nx-page"><Skeleton height={360} /></div>;

  return (
    <div className="nx-page">
      <Form<RecordValues>
        schema={recordSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          if (!schoolId) return;
          const student = students.find((s) => s.id === values.studentId);
          const studentName = mode === 'edit' ? existing?.studentName ?? student?.fullName : student?.fullName;
          if (!studentName) {
            toast.error('Select a student', 'Choose the student this record is for.');
            return;
          }
          const gradeName = grades.find((g) => g.id === student?.gradeId)?.name ?? existing?.gradeName;
          try {
            const payload = formToRecord(values, { studentName, gradeName });
            if (mode === 'new') {
              await createMedicalRecord(schoolId, { ...payload, schoolId }, actor);
              toast.success('Health record saved', studentName);
            } else {
              // `formToRecord` seeds a placeholder `schoolId: ''`; drop it so an
              // edit never overwrites the record's real tenant id (updateIn does
              // not re-stamp schoolId the way createIn does).
              const { schoolId: _omit, ...patch } = payload;
              void _omit;
              await updateMedicalRecord(schoolId, id, patch, actor);
              toast.success('Health record updated', studentName);
            }
            navigate('/medical');
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <RecordFormBody mode={mode} lockedStudentName={mode === 'edit' ? existing?.studentName : undefined} onCancel={back} />
      </Form>
    </div>
  );
}

function RecordFormBody({
  mode,
  lockedStudentName,
  onCancel,
}: {
  mode: 'new' | 'edit';
  lockedStudentName?: string;
  onCancel: () => void;
}) {
  const { schoolId } = useSession();
  const { formState } = useFormContext<RecordValues>();
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

  return (
    <FormPage
      title={mode === 'new' ? 'New health record' : 'Edit health record'}
      subtitle={
        mode === 'new'
          ? "Create a student's medical profile — allergies, conditions and emergency contacts."
          : lockedStudentName
            ? `Update the health record for ${lockedStudentName}.`
            : 'Update the health record.'
      }
      breadcrumbs={[{ label: 'Medical & Clinic', onClick: onCancel }, { label: mode === 'new' ? 'New record' : 'Edit record' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Save record' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <div className="med-confidential" role="note">
        <Icon name="lock" size={13} />
        <span>Confidential — sensitive health data, clinic staff only.</span>
      </div>

      <FormSection title="Student & vitals">
        {mode === 'edit' && lockedStudentName ? (
          <div className="nx-col-full">
            <div className="med-locked-student">
              <Icon name="user" size={16} />
              <span>{lockedStudentName}</span>
            </div>
          </div>
        ) : (
          <div className="nx-col-full">
            <FormSelect<RecordValues>
              name="studentId"
              label="Student"
              required
              placeholder={studentOptions.length ? 'Select student' : 'No students found'}
              options={studentOptions}
            />
          </div>
        )}
        <FormSelect<RecordValues>
          name="bloodGroup"
          label="Blood group"
          placeholder="Select"
          options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
        />
        <FormInput<RecordValues> name="heightCm" label="Height (cm)" inputMode="decimal" placeholder="e.g. 140" />
        <FormInput<RecordValues> name="weightKg" label="Weight (kg)" inputMode="decimal" placeholder="e.g. 35" />
      </FormSection>

      <FormSection
        title="Allergies, conditions & medications"
        description="Type and press Enter or comma to add each item."
        single
      >
        <ChipListField<RecordValues> name="allergies" label="Allergies" placeholder="e.g. Peanuts, Penicillin" />
        <ChipListField<RecordValues> name="conditions" label="Chronic conditions" placeholder="e.g. Asthma, Diabetes" />
        <ChipListField<RecordValues> name="medications" label="Regular medications" placeholder="e.g. Salbutamol inhaler" />
      </FormSection>

      <FormSection title="Emergency contact & care">
        <FormInput<RecordValues> name="emergencyContactName" label="Emergency contact name" placeholder="Parent / guardian" />
        <FormInput<RecordValues>
          name="emergencyContactPhone"
          label="Emergency contact mobile"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit mobile"
        />
        <FormInput<RecordValues> name="doctorName" label="Family doctor" placeholder="Dr. name / clinic" />
        <FormInput<RecordValues> name="insuranceNo" label="Insurance no." />
      </FormSection>

      <FormSection title="Individual Health Plan (IHP)" description="For CWSN / chronic conditions needing ongoing support." single>
        <FormTextarea<RecordValues>
          name="healthPlan"
          label="Health plan"
          rows={3}
          placeholder="Care plan, triggers, medication schedule, what to do in an emergency…"
        />
        <FormTextarea<RecordValues> name="notes" label="Other notes" rows={2} />
      </FormSection>
    </FormPage>
  );
}
