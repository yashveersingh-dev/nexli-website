import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/Button';
import {
  Field,
  Form,
  FormToggle,
  FormInput,
  FormSelect,
  FormTextarea,
  FormPage,
  FormSection,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrievances, createGrievance } from '@/features/compliance/data';
import { ConfidentialBanner } from '../components/Confidential';
import { GRIEVANCE_CATEGORY_OPTIONS, GRIEVANCE_PRIORITY_OPTIONS } from '../meta';
import {
  grievanceSchema,
  emptyGrievance,
  formToGrievance,
  safeguardingNumber,
  grievanceDueAt,
  type GrievanceValues,
} from '../safeguardingSchema';
import type { Grievance } from '@/types/compliance';

/** Dedicated page to raise a grievance (starts the redressal workflow). */
export function GrievanceFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, role, can } = useSession();
  const { data: grievances } = useGrievances(schoolId);

  const back = () => navigate('/safeguarding');

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  if (!can('pocso.write') && !can('grievances.write')) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="You do not have permission to raise a grievance here."
            action={
              <Button variant="subtle" onClick={back}>
                Back
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <ConfidentialBanner />
      <Form<GrievanceValues>
        schema={grievanceSchema}
        defaultValues={emptyGrievance()}
        onSubmit={async (values) => {
          try {
            const base = formToGrievance(values);
            const refNo = safeguardingNumber('GR', grievances.length);
            const now = Date.now();
            const payload: Omit<Grievance, 'id'> = {
              ...base,
              schoolId,
              refNo,
              status: 'open',
              raisedAt: now,
              dueAt: grievanceDueAt(now),
              raisedByRole: role || undefined,
            };
            const id = await createGrievance(schoolId, payload, actor);
            toast.success('Grievance logged', refNo);
            navigate(`/safeguarding/grievances/${id}`);
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <Body onCancel={back} />
      </Form>
    </div>
  );
}

function Body({ onCancel }: { onCancel: () => void }) {
  const { formState, watch } = useFormContext<GrievanceValues>();
  const anonymous = watch('anonymous');
  return (
    <FormPage
      title="Raise a grievance"
      subtitle="Log a complaint to start the redressal workflow (7-day SLA)."
      breadcrumbs={[{ label: 'Safeguarding', onClick: onCancel }, { label: 'New grievance' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Log grievance"
      submitIcon="message"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Complaint">
        <FormSelect<GrievanceValues> name="category" label="Category" required options={GRIEVANCE_CATEGORY_OPTIONS} />
        <FormSelect<GrievanceValues> name="priority" label="Priority" required options={GRIEVANCE_PRIORITY_OPTIONS} />
        <div className="nx-col-full">
          <FormInput<GrievanceValues> name="subject" label="Subject" required placeholder="Short summary of the issue" />
        </div>
        <div className="nx-col-full">
          <FormTextarea<GrievanceValues>
            name="description"
            label="Description"
            required
            rows={4}
            placeholder="Describe the grievance with relevant facts and dates."
          />
        </div>
        <div className="nx-col-full">
          <FormInput<GrievanceValues> name="against" label="Against (optional)" placeholder="Person / department concerned" />
        </div>
      </FormSection>

      <FormSection title="Complainant">
        <div className="nx-col-full">
          <Field label="Anonymous" hint="Hide the complainant's identity from the case record.">
            <FormToggle<GrievanceValues> name="anonymous" label="Raise this grievance anonymously" />
          </Field>
        </div>
        {!anonymous && (
          <>
            <FormInput<GrievanceValues> name="raisedByName" label="Name" placeholder="Complainant's name" />
            <FormInput<GrievanceValues> name="contact" label="Contact" placeholder="Phone or email (optional)" />
          </>
        )}
      </FormSection>
    </FormPage>
  );
}
