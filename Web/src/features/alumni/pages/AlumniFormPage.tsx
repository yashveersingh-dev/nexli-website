import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  FormToggle,
  FormFileUpload,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useAlumnus, createAlumnus, updateAlumnus } from '@/features/analytics/data';
import { MentorAreasField } from '../components/MentorAreasField';
import { INDUSTRY_OPTIONS } from '../meta';
import {
  alumniSchema,
  emptyAlumniForm,
  alumnusToForm,
  formToAlumnus,
  type AlumniFormValues,
} from '../alumniSchema';

export function AlumniFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate } = useOwnership('alumni');
  const { data: existing, loading } = useAlumnus(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  // Defense-in-depth: the /alumni/* subtree is gated on `alumni.read`, which the
  // alumni audience (and read-only reviewers) also hold — so guard the add/edit
  // form against non-operators reaching it by direct URL. The Alumni Office
  // operates; everyone else is read-only. Firestore rules remain authoritative.
  if (!canOperate) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="lock"
          title="Read-only access"
          message="Alumni profiles are maintained by the Alumni Office. You can browse the directory, mentorship board and insights."
          action={<Button variant="subtle" onClick={() => navigate('/alumni')}>Back to alumni</Button>}
        />
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
          icon="users"
          title="Alumnus not found"
          action={<Button variant="subtle" onClick={() => navigate('/alumni')}>Back to alumni</Button>}
        />
      </div>
    );
  }

  const defaults: AlumniFormValues = mode === 'edit' && existing ? alumnusToForm(existing) : emptyAlumniForm();
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <Form<AlumniFormValues>
        schema={alumniSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const payload = formToAlumnus(values);
            if (mode === 'new') {
              await createAlumnus(schoolId, { ...payload, schoolId }, actor);
              toast.success('Alumnus added', payload.name);
            } else {
              await updateAlumnus(schoolId, id, payload, actor);
              toast.success('Alumnus updated', payload.name);
            }
            navigate('/alumni');
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <AlumniFormBody mode={mode} onCancel={() => navigate('/alumni')} />
      </Form>
    </div>
  );
}

function AlumniFormBody({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const navigate = useNavigate();
  const { watch, formState } = useFormContext<AlumniFormValues>();
  const willingToMentor = watch('willingToMentor');

  return (
    <FormPage
      title={mode === 'new' ? 'Add alumnus' : 'Edit alumnus'}
      subtitle={mode === 'new' ? 'Add a former student to the alumni network.' : 'Update this alumni record.'}
      breadcrumbs={[{ label: 'Alumni', onClick: () => navigate('/alumni') }, { label: mode === 'new' ? 'New' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Add alumnus' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Identity" description="Who they are and which batch they belong to.">
        <FormFileUpload<AlumniFormValues> name="photoUrl" label="Photo" kind="avatar" />
        <FormInput<AlumniFormValues> name="name" label="Full name" required placeholder="Full name" />
        <FormInput<AlumniFormValues> name="batchYear" label="Batch year" placeholder="e.g. 2018" inputMode="numeric" maxLength={4} hint="Passing-out year (4 digits)." />
        <FormInput<AlumniFormValues> name="gradeLeft" label="Grade left after" placeholder="e.g. Grade 12" />
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
          <FormToggle<AlumniFormValues> name="verified" aria-label="Verified profile" />
          <span style={{ marginLeft: 10, fontSize: 13.5, color: 'var(--text)' }}>Verified profile</span>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <FormInput<AlumniFormValues> name="email" label="Email" placeholder="name@example.com" inputMode="email" />
        <FormInput<AlumniFormValues> name="phone" label="Phone" placeholder="+91…" inputMode="tel" />
        <FormRow>
          <FormInput<AlumniFormValues> name="linkedin" label="LinkedIn" placeholder="https://linkedin.com/in/…" inputMode="url" />
        </FormRow>
      </FormSection>

      <FormSection title="Career" description="What they do now.">
        <FormInput<AlumniFormValues> name="currentRole" label="Current role" placeholder="e.g. Software Engineer" />
        <FormInput<AlumniFormValues> name="organisation" label="Organisation" placeholder="e.g. Infosys" />
        <FormSelect<AlumniFormValues> name="industry" label="Industry" placeholder="Select industry" options={INDUSTRY_OPTIONS} />
        <FormInput<AlumniFormValues> name="higherEducation" label="Higher education" placeholder="e.g. B.Tech, IIT Delhi" />
        <FormInput<AlumniFormValues> name="city" label="City" placeholder="e.g. Bengaluru" />
        <FormInput<AlumniFormValues> name="country" label="Country" placeholder="e.g. India" />
      </FormSection>

      <FormSection title="Mentorship" description="Opt this alumnus in to mentor current students." single>
        <FormToggle<AlumniFormValues>
          name="willingToMentor"
          label="Willing to mentor current students"
          description="When on, they appear on the mentorship board grouped by focus area."
        />
        {willingToMentor && <MentorAreasField<AlumniFormValues> name="mentorAreas" />}
      </FormSection>

      <FormSection title="More">
        <FormRow>
          <FormTextarea<AlumniFormValues> name="achievements" label="Achievements" placeholder="Awards, recognitions, notable milestones…" autoResize />
        </FormRow>
        <FormRow>
          <FormTextarea<AlumniFormValues> name="notes" label="Notes" placeholder="Internal notes (not shown to the alumnus)…" autoResize />
        </FormRow>
      </FormSection>
    </FormPage>
  );
}
