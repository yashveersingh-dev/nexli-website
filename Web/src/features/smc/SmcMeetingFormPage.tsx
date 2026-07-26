import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormTextarea, FormDate, FormPage, FormSection, FormRow } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useSmcMeeting, createSmcMeeting, updateSmcMeeting } from '@/features/compliance/data';
import { smcMeetingSchema, emptySmcMeeting, meetingToForm, formToMeeting, type SmcMeetingValues } from './smcSchema';
import type { SmcMeeting } from '@/types/compliance';

export function SmcMeetingFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: existing, loading } = useSmcMeeting(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !loading && !existing) {
    return <div className="nx-page"><EmptyState icon="calendar" title="Meeting not found" action={<Button variant="subtle" onClick={() => navigate('/smc')}>Back</Button>} /></div>;
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? meetingToForm(existing) : emptySmcMeeting();
  const backTo = mode === 'edit' ? `/smc/meetings/${id}` : '/smc';

  return (
    <div className="nx-page">
      <Form<SmcMeetingValues>
        schema={smcMeetingSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const base = formToMeeting(values);
            if (mode === 'new') {
              const newId = await createSmcMeeting(schoolId, { ...base, schoolId, status: 'scheduled' } as Omit<SmcMeeting, 'id'>, actor);
              toast.success('Meeting scheduled', base.title);
              navigate(`/smc/meetings/${newId}`);
            } else {
              await updateSmcMeeting(schoolId, id, base, actor);
              toast.success('Meeting updated', base.title);
              navigate(backTo);
            }
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <Body mode={mode} onCancel={() => navigate(backTo)} />
      </Form>
    </div>
  );
}

function Body({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { formState } = useFormContext<SmcMeetingValues>();
  return (
    <FormPage
      title={mode === 'new' ? 'Schedule SMC meeting' : 'Edit meeting'}
      subtitle="Set the agenda and details. Record minutes, decisions and attendance from the meeting page."
      breadcrumbs={[{ label: 'SMC', onClick: () => onCancel() }, { label: mode === 'new' ? 'New meeting' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Schedule meeting' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Meeting">
        <FormInput<SmcMeetingValues> name="title" label="Title" required placeholder="e.g. Quarterly SMC review" />
        <FormDate<SmcMeetingValues> name="date" label="Date" required />
        <FormInput<SmcMeetingValues> name="venue" label="Venue" placeholder="Principal's office, hall…" />
        <FormRow>
          <FormTextarea<SmcMeetingValues> name="agenda" label="Agenda" rows={4} placeholder="Items to be discussed (one per line)" />
        </FormRow>
      </FormSection>
    </FormPage>
  );
}
