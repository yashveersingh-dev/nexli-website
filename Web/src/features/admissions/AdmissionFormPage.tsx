import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { EmptyState } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormTextarea,
  FormSelect,
  FormDate,
  FormCheckbox,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { createAdmission, useGrades } from '@/features/school/data';
import { GENDER_OPTIONS, CATEGORY_OPTIONS } from '@/features/school/meta';
import { admissionSchema, emptyAdmissionForm, formToAdmission, type AdmissionFormValues } from './admissionSchema';
import '@/features/school/school.css';

export function AdmissionFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const { data: grades } = useGrades(schoolId);

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="info" title="No school context" />
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <Form<AdmissionFormValues>
        schema={admissionSchema}
        defaultValues={emptyAdmissionForm()}
        onSubmit={async (values) => {
          try {
            const gradeName = grades.find((g) => g.id === values.gradeAppliedId)?.name;
            const payload = formToAdmission(values, {
              gradeAppliedName: gradeName,
              academicYear: school?.currentAcademicYear,
            });
            const newId = await createAdmission(schoolId, { ...payload, schoolId }, actor);
            toast.success('Application created', payload.applicantName);
            navigate(`/admissions/${newId}`);
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <AdmissionFormBody onCancel={() => navigate('/admissions')} />
      </Form>
    </div>
  );
}

function AdmissionFormBody({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { formState } = useFormContext<AdmissionFormValues>();
  const { data: grades } = useGrades(schoolId);
  const gradeOptions = grades.map((g) => ({ value: g.id, label: g.name }));

  return (
    <FormPage
      title="New application"
      subtitle="Register an enquiry into the admissions pipeline."
      breadcrumbs={[{ label: 'Admissions', onClick: () => navigate('/admissions') }, { label: 'New' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Create application"
      submitIcon="check-circle"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Applicant" description="Details of the prospective student.">
        <FormInput<AdmissionFormValues> name="applicantName" label="Applicant name" required placeholder="Full name" />
        <FormSelect<AdmissionFormValues> name="gender" label="Gender" placeholder="Select" options={GENDER_OPTIONS} />
        <FormDate<AdmissionFormValues> name="dob" label="Date of birth" />
        <FormSelect<AdmissionFormValues> name="gradeAppliedId" label="Grade applied for" placeholder="Select grade" options={gradeOptions} />
        <FormSelect<AdmissionFormValues> name="category" label="Category" placeholder="Select" options={CATEGORY_OPTIONS} />
        <FormInput<AdmissionFormValues> name="source" label="Enquiry source" placeholder="Walk-in, referral, website…" />
      </FormSection>

      <FormSection title="Guardian" description="Primary contact for this application.">
        <FormInput<AdmissionFormValues> name="guardianName" label="Guardian name" placeholder="Parent / guardian" />
        <FormInput<AdmissionFormValues> name="guardianPhone" label="Mobile" inputMode="numeric" />
        <FormInput<AdmissionFormValues> name="guardianEmail" label="Email" />
      </FormSection>

      <FormSection title="Other details">
        <FormRow>
          <FormCheckbox<AdmissionFormValues> name="rteApplication" label="RTE application (25% EWS / DG quota)" />
        </FormRow>
        <FormRow>
          <FormTextarea<AdmissionFormValues> name="notes" label="Notes" rows={3} placeholder="Any context about this enquiry…" />
        </FormRow>
      </FormSection>
    </FormPage>
  );
}
