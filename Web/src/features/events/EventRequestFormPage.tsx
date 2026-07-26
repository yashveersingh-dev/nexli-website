import { useNavigate } from 'react-router-dom';
import { InfoCard } from '@/components/feedback';
import {
  Form, FormInput, FormTextarea, FormSelect,
  FormPage, FormSection, FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { createEvent } from '@/features/analytics/data';
import { EVENT_TYPE_OPTIONS } from '@/features/analytics/meta';
import type { SchoolEvent } from '@/types/community';
import { eventRequestSchema, type EventRequestValues } from './eventRequestSchema';
import { canRequestEvent, requestPatch } from './eventWorkflow';
import { fromDateInput } from './util';

const DEFAULTS: EventRequestValues = {
  title: '',
  type: 'academic',
  proposedDate: '',
  venue: '',
  description: '',
  rationale: '',
};

/**
 * Lighter "Request an event" page for teaching roles that don't own the events
 * module. Creates a `SchoolEvent` flagged `isTeacherRequest` and `requested`, so
 * it lands in the Principal/VP pending-approval queue alongside owner events.
 */
export function EventRequestFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, role, member } = useSession();
  const { canOperate } = useOwnership('events');
  const canRequest = canRequestEvent(role, canOperate);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  if (!canRequest) {
    return (
      <div className="nx-page">
        <InfoCard icon="info" title="Requesting isn’t needed for your role">
          {canOperate
            ? 'You can create events directly — use “New event” on the events page.'
            : 'Event requests are raised by teachers. Browse the events calendar from the events page.'}
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Form<EventRequestValues>
        schema={eventRequestSchema}
        defaultValues={DEFAULTS}
        onSubmit={async (values) => {
          if (!schoolId) return;
          const start = fromDateInput(values.proposedDate);
          if (start == null) {
            toast.error('Add a proposed date', 'Pick when you would like the event to take place.');
            return;
          }
          try {
            const payload: Omit<SchoolEvent, 'id' | 'schoolId'> = {
              title: values.title.trim(),
              type: values.type,
              description: values.description.trim() || undefined,
              startDate: start,
              allDay: true,
              venue: values.venue.trim() || undefined,
              audience: 'whole_school',
              status: 'upcoming',
              rationale: values.rationale.trim(),
              ...requestPatch(member?.name, true),
            };
            const newId = await createEvent(schoolId, payload as Omit<SchoolEvent, 'id'>, actor);
            toast.success('Request sent', `“${payload.title}” is now with a Principal or VP for review.`);
            navigate(`/events/${newId}`);
          } catch {
            toast.error('Could not send request', 'It will sync when you are back online.');
          }
        }}
      >
        {({ formState }) => (
          <FormPage
            title="Request an event"
            subtitle="Propose an activity for leadership to review. Once a Principal or VP approves it, it becomes a published event."
            breadcrumbs={[
              { label: 'Events', onClick: () => navigate('/events') },
              { label: 'Request' },
            ]}
            onBack={() => navigate('/events')}
            onCancel={() => navigate('/events')}
            submitLabel="Send request"
            submitIcon="send"
            submitting={formState.isSubmitting}
          >
            <FormSection title="What are you proposing?">
              <FormRow>
                <FormInput<EventRequestValues> name="title" label="Event title" required placeholder="e.g. Class 6 Science Quiz" />
              </FormRow>
              <FormSelect<EventRequestValues> name="type" label="Type" required options={EVENT_TYPE_OPTIONS} />
              <FormInput<EventRequestValues> name="proposedDate" type="date" label="Proposed date" required />
              <FormInput<EventRequestValues> name="venue" label="Venue" optional placeholder="e.g. Activity hall" />
              <FormRow>
                <FormTextarea<EventRequestValues> name="description" label="Description" optional rows={4} placeholder="What would happen at this event?" />
              </FormRow>
            </FormSection>

            <FormSection title="Why this event?">
              <FormRow>
                <FormTextarea<EventRequestValues>
                  name="rationale"
                  label="Rationale"
                  required
                  rows={4}
                  hint="Help leadership decide — the learning goal, who benefits, and any resources needed."
                  placeholder="e.g. Reinforces the term’s science topics and builds confidence for the district quiz."
                />
              </FormRow>
              <FormRow>
                <InfoCard icon="info" title="What happens next">
                  Your request goes to a Principal or Vice Principal. If approved, it is published as an event; if not, you’ll see their note here.
                </InfoCard>
              </FormRow>
            </FormSection>
          </FormPage>
        )}
      </Form>
    </div>
  );
}
