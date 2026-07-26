import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  Form, FormInput, FormSelect, FormDate, FormFileUpload, FormPage, FormSection, FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { INDIAN_STATES } from '@/features/platform/meta';
import { useStaff, useStaffMember, createStaff, updateStaff } from '@/features/school/data';
import { EMPLOYMENT_TYPE_OPTIONS, STAFF_STATUS_META, DEPARTMENTS } from '@/features/school/meta';
import { GENDER_OPTIONS, BLOOD_GROUPS } from '@/features/school/meta';
import { staffSchema, emptyStaffForm, staffToForm, formToStaff, type StaffFormValues } from './staffSchema';
import '@/features/school/school.css';

const STATUS_OPTIONS = Object.entries(STAFF_STATUS_META).map(([value, m]) => ({ value, label: m.label }));
const DEPT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));

export function StaffFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: staff } = useStaff(schoolId);
  const { data: existing, loading } = useStaffMember(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);

  const defaults = useMemo<StaffFormValues | null>(() => {
    if (mode === 'edit') return existing ? staffToForm(existing) : null;
    return emptyStaffForm(`EMP-${String(staff.length + 1).padStart(4, '0')}`);
  }, [mode, existing, staff.length]);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) return <div className="nx-page"><EmptyState icon="briefcase" title="Staff member not found" action={<Button variant="subtle" onClick={() => navigate('/hr')}>Back</Button>} /></div>;
  if (!defaults) return <div className="nx-page"><Skeleton height={360} /></div>;

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <Form<StaffFormValues>
        schema={staffSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const payload = formToStaff(values);
            if (mode === 'new') {
              const newId = await createStaff(schoolId, { ...payload, schoolId }, actor);
              toast.success('Staff added', payload.name);
              navigate(`/hr/${newId}`);
            } else {
              await updateStaff(schoolId, id, payload, actor);
              toast.success('Staff updated', payload.name);
              navigate(`/hr/${id}`);
            }
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <StaffFormBody mode={mode} onCancel={() => navigate(mode === 'edit' ? `/hr/${id}` : '/hr')} />
      </Form>
    </div>
  );
}

function StaffFormBody({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const navigate = useNavigate();
  const { control, formState } = useFormContext<StaffFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'qualifications' });

  return (
    <FormPage
      title={mode === 'new' ? 'Add staff' : 'Edit staff'}
      subtitle={mode === 'new' ? 'Create a staff/employee record.' : 'Update the staff record.'}
      breadcrumbs={[{ label: 'HR', onClick: () => navigate('/hr') }, { label: mode === 'new' ? 'New' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Add staff' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Identity">
        <FormFileUpload<StaffFormValues> name="photoUrl" label="Photo" kind="avatar" />
        <FormInput<StaffFormValues> name="name" label="Full name" required />
        <FormInput<StaffFormValues> name="employeeId" label="Employee ID" required />
        <FormSelect<StaffFormValues> name="gender" label="Gender" placeholder="Select" options={GENDER_OPTIONS} />
        <FormDate<StaffFormValues> name="dob" label="Date of birth" />
        <FormSelect<StaffFormValues> name="bloodGroup" label="Blood group" placeholder="Select" options={BLOOD_GROUPS} />
      </FormSection>

      <FormSection title="Employment">
        <FormInput<StaffFormValues> name="designation" label="Designation" placeholder="e.g. PGT Mathematics" />
        <FormSelect<StaffFormValues> name="department" label="Department" placeholder="Select" options={DEPT_OPTIONS} />
        <FormSelect<StaffFormValues> name="employmentType" label="Employment type" options={EMPLOYMENT_TYPE_OPTIONS} />
        <FormSelect<StaffFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
        <FormDate<StaffFormValues> name="joiningDate" label="Joining date" />
        <FormInput<StaffFormValues> name="experienceYears" label="Experience (years)" inputMode="numeric" />
      </FormSection>

      <FormSection title="Contact">
        <FormInput<StaffFormValues> name="phone" label="Mobile" inputMode="numeric" />
        <FormInput<StaffFormValues> name="email" label="Email" />
        <FormRow><FormInput<StaffFormValues> name="address" label="Address" /></FormRow>
        <FormInput<StaffFormValues> name="city" label="City" />
        <FormSelect<StaffFormValues> name="state" label="State" placeholder="Select state" options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} />
        <FormInput<StaffFormValues> name="pincode" label="Pincode" inputMode="numeric" maxLength={6} />
        <FormInput<StaffFormValues> name="emergencyContactName" label="Emergency contact" />
        <FormInput<StaffFormValues> name="emergencyContactPhone" label="Emergency phone" inputMode="numeric" />
      </FormSection>

      <FormSection title="Statutory (masked)">
        <FormInput<StaffFormValues> name="aadhaarLast4" label="Aadhaar (last 4)" maxLength={4} inputMode="numeric" />
        <FormInput<StaffFormValues> name="panMasked" label="PAN" />
        <FormInput<StaffFormValues> name="uanNumber" label="UAN" />
      </FormSection>

      <FormSection
        title="Qualifications"
        single
        aside={<Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append({ degree: '', institution: '', year: '', specialization: '' })}>Add</Button>}
      >
        {fields.map((f, i) => (
          <div className="nx-guardian" key={f.id}>
            <div className="nx-guardian__head">
              <span className="nx-guardian__title">Qualification {i + 1}</span>
              {fields.length > 1 && (
                <button type="button" className="nx-guardian__remove" onClick={() => remove(i)} aria-label={`Remove qualification ${i + 1}`}><Icon name="x" size={14} /> Remove</button>
              )}
            </div>
            <div className="nx-section__grid">
              <FormInput<StaffFormValues> name={`qualifications.${i}.degree`} label="Degree" required placeholder="e.g. B.Ed, M.Sc" />
              <FormInput<StaffFormValues> name={`qualifications.${i}.institution`} label="Institution" />
              <FormInput<StaffFormValues> name={`qualifications.${i}.year`} label="Year" inputMode="numeric" />
              <FormInput<StaffFormValues> name={`qualifications.${i}.specialization`} label="Specialization" />
            </div>
          </div>
        ))}
      </FormSection>
    </FormPage>
  );
}
