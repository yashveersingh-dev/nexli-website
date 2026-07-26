import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InfoCard, Skeleton } from '@/components/feedback';
import {
  Form, FormInput, FormTextarea, FormSelect, FormToggle,
  FormPage, FormSection, FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useGrades } from '@/features/school/data';
import { useEvent, createEvent, updateEvent } from '@/features/analytics/data';
import { EVENT_TYPE_OPTIONS, EVENT_AUDIENCE_OPTIONS, EVENT_STATUS_META } from '@/features/analytics/meta';
import type { SchoolEvent } from '@/types/community';
import { eventSchema, type EventValues } from './eventSchema';
import { requestPatch } from './eventWorkflow';
import { deriveStatus, fromDateInput, toDateInput, toDateTimeLocal } from './util';

const STATUS_OPTIONS = (Object.keys(EVENT_STATUS_META) as (keyof typeof EVENT_STATUS_META)[]).map((s) => ({
  value: s,
  label: EVENT_STATUS_META[s].label,
}));

const DEFAULTS: EventValues = {
  title: '',
  type: 'academic',
  description: '',
  startDate: '',
  endDate: '',
  allDay: false,
  venue: '',
  audience: 'whole_school',
  gradeId: '',
  organiser: '',
  registrationRequired: false,
  capacity: '',
  fee: '',
  status: 'upcoming',
};

/** Dedicated create/edit page for a school event. */
export function EventFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('events').canOperate;
  const { data: grades } = useGrades(schoolId);
  const { data: event, loading } = useEvent(schoolId, id);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name;

  const defaults = useMemo<EventValues>(() => {
    if (!isEdit || !event) return DEFAULTS;
    const toInput = event.allDay ? toDateInput : toDateTimeLocal;
    return {
      title: event.title ?? '',
      type: event.type ?? 'academic',
      description: event.description ?? '',
      startDate: toInput(event.startDate),
      endDate: toInput(event.endDate),
      allDay: !!event.allDay,
      venue: event.venue ?? '',
      audience: event.audience ?? 'whole_school',
      gradeId: event.gradeId ?? '',
      organiser: event.organiser ?? '',
      registrationRequired: !!event.registrationRequired,
      capacity: event.capacity != null ? String(event.capacity) : '',
      fee: event.fee != null ? String(event.fee) : '',
      status: event.status ?? 'upcoming',
    };
  }, [isEdit, event]);

  if (!canWrite) {
    return (
      <div className="nx-page">
        <InfoCard icon="lock" title="Review access">
          Events are scheduled by the activity coordinators. As a reviewer you can browse the calendar and event details, and approve from there.
        </InfoCard>
      </div>
    );
  }

  if (isEdit && loading) {
    return (
      <div className="nx-page">
        <Skeleton height={56} />
        <Skeleton height={320} />
      </div>
    );
  }

  if (isEdit && !event) {
    return (
      <div className="nx-page">
        <InfoCard icon="alert-triangle" title="Event not found">
          This event may have been removed. Go back to the events list.
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Form<EventValues>
        schema={eventSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          if (!schoolId) return;
          const start = fromDateInput(values.startDate);
          if (start == null) {
            toast.error('Add a start date', 'Pick when the event starts.');
            return;
          }
          const end = fromDateInput(values.endDate);
          try {
            const payload: Omit<SchoolEvent, 'id' | 'schoolId'> = {
              title: values.title.trim(),
              type: values.type,
              description: values.description.trim() || undefined,
              startDate: start,
              endDate: end,
              allDay: values.allDay || undefined,
              venue: values.venue.trim() || undefined,
              audience: values.audience,
              gradeId: values.audience === 'grade' ? values.gradeId || undefined : undefined,
              organiser: values.organiser.trim() || undefined,
              registrationRequired: values.registrationRequired || undefined,
              capacity: values.registrationRequired && values.capacity.trim() ? Number(values.capacity) : undefined,
              fee: values.fee.trim() ? Number(values.fee) : undefined,
              status: values.status,
            };
            if (isEdit && id) {
              // Preserve the existing approval state on edit (never auto-publish here).
              await updateEvent(schoolId, id, payload, actor);
              toast.success('Event updated', payload.title);
              navigate(`/events/${id}`);
            } else {
              // New events are NOT auto-published — they go to Principal/VP for approval.
              const newId = await createEvent(
                schoolId,
                { ...payload, ...requestPatch(member?.name) } as Omit<SchoolEvent, 'id'>,
                actor,
              );
              toast.success('Sent for approval', `“${payload.title}” will be published once a Principal or VP approves it.`);
              navigate(`/events/${newId}`);
            }
          } catch {
            toast.error('Could not save event', 'It will sync when you are back online.');
          }
        }}
      >
        {({ watch, setValue, formState }) => {
          const audience = watch('audience');
          const allDay = watch('allDay');
          const registrationRequired = watch('registrationRequired');
          const startDate = watch('startDate');
          const endDate = watch('endDate');
          const dateType = allDay ? 'date' : 'datetime-local';

          const suggested = (() => {
            const s = fromDateInput(startDate);
            if (s == null) return null;
            return deriveStatus(s, fromDateInput(endDate), allDay);
          })();

          return (
            <FormPage
              title={isEdit ? 'Edit event' : 'New event'}
              subtitle="Schedule an activity for your school community."
              breadcrumbs={[
                { label: 'Events', onClick: () => navigate('/events') },
                { label: isEdit ? 'Edit' : 'New' },
              ]}
              onBack={() => navigate(isEdit && id ? `/events/${id}` : '/events')}
              onCancel={() => navigate(isEdit && id ? `/events/${id}` : '/events')}
              submitLabel={isEdit ? 'Save changes' : 'Create event'}
              submitIcon="check"
              submitting={formState.isSubmitting}
            >
              <FormSection title="Details">
                <FormRow>
                  <FormInput<EventValues> name="title" label="Event title" required placeholder="e.g. Annual Sports Day" />
                </FormRow>
                <FormSelect<EventValues> name="type" label="Type" required options={EVENT_TYPE_OPTIONS} />
                <FormInput<EventValues> name="venue" label="Venue" optional placeholder="e.g. Main ground" />
                <FormRow>
                  <FormTextarea<EventValues> name="description" label="Description" optional rows={4} placeholder="What is this event about?" />
                </FormRow>
              </FormSection>

              <FormSection title="Schedule">
                <FormRow>
                  <FormToggle<EventValues>
                    name="allDay"
                    label="All-day event"
                    description="Hide the time and treat this as a full-day activity."
                  />
                </FormRow>
                <FormInput<EventValues> key={`start-${dateType}`} name="startDate" type={dateType} label="Starts" required />
                <FormInput<EventValues> key={`end-${dateType}`} name="endDate" type={dateType} label="Ends" optional />
                <FormRow>
                  <FormSelect<EventValues>
                    name="status"
                    label="Status"
                    required
                    options={STATUS_OPTIONS}
                    labelAction={
                      suggested && watch('status') !== suggested && watch('status') !== 'cancelled' ? (
                        <button
                          type="button"
                          className="nx-link-btn"
                          onClick={() => setValue('status', suggested, { shouldDirty: true, shouldValidate: true })}
                        >
                          Use suggested: {EVENT_STATUS_META[suggested].label}
                        </button>
                      ) : undefined
                    }
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Audience">
                <FormSelect<EventValues> name="audience" label="Who is this for?" required options={EVENT_AUDIENCE_OPTIONS} />
                {audience === 'grade' && (
                  <FormSelect<EventValues>
                    name="gradeId"
                    label="Grade"
                    required
                    placeholder="Select a grade"
                    options={grades.map((g) => ({ value: g.id, label: g.name }))}
                  />
                )}
                <FormInput<EventValues> name="organiser" label="Organiser" optional placeholder={member?.name ? `e.g. ${member.name}` : 'e.g. Sports Department'} />
              </FormSection>

              <FormSection title="Registration">
                <FormRow>
                  <FormToggle<EventValues>
                    name="registrationRequired"
                    label="Registration required"
                    description="Track participants, capacity and attendance for this event."
                  />
                </FormRow>
                {registrationRequired && (
                  <>
                    <FormInput<EventValues> name="capacity" type="number" inputMode="numeric" min={0} label="Capacity" optional hint="Leave blank for unlimited. Extra sign-ups go to a waitlist." placeholder="e.g. 200" />
                    <FormInput<EventValues> name="fee" type="number" inputMode="numeric" min={0} label="Fee (₹)" optional placeholder="0" prefix="₹" />
                  </>
                )}
                {!registrationRequired && (
                  <FormRow>
                    <FormInput<EventValues> name="fee" type="number" inputMode="numeric" min={0} label="Fee (₹)" optional placeholder="0" prefix="₹" />
                  </FormRow>
                )}
                {audience === 'grade' && grades.length > 0 && (
                  <FormRow>
                    <InfoCard icon="info" title="Targeted to a grade">
                      This event is scoped to {gradeName(watch('gradeId')) ?? 'the selected grade'}.
                    </InfoCard>
                  </FormRow>
                )}
              </FormSection>
            </FormPage>
          );
        }}
      </Form>
    </div>
  );
}
