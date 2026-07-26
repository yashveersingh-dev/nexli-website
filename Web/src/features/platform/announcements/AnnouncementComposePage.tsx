import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { Icon } from '@/components/Icon';
import { InfoCard } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormTextarea,
  FormSelect,
  FormRadioGroup,
  FormPage,
  FormSection,
  FormRow,
  Field,
  Input,
  Checkbox,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { sendAnnouncement, usePlans, useSchools } from '@/features/platform/data';
import { ANNOUNCEMENT_TYPE_META, INDIAN_STATES, BOARD_OPTIONS } from '@/features/platform/meta';
import type { AnnouncementType, BoardType } from '@/types/models';
import { announcementSchema, type AnnouncementValues } from './announcementSchema';

const TYPE_OPTIONS = (Object.keys(ANNOUNCEMENT_TYPE_META) as AnnouncementType[]).map((t) => ({
  value: t,
  label: ANNOUNCEMENT_TYPE_META[t].label,
}));

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All schools' },
  { value: 'plan', label: 'By plan' },
  { value: 'state', label: 'By state' },
  { value: 'board', label: 'By board' },
  { value: 'schools', label: 'Specific schools' },
];

const CHANNELS = [
  { key: 'in_app', label: 'In-app', description: 'Banner shown to School Admins on next login.' },
  { key: 'email', label: 'Email', description: 'Provisioned later (paid integration).' },
  { key: 'sms', label: 'SMS', description: 'Provisioned later (paid integration).' },
];

const DEFAULTS: AnnouncementValues = {
  type: 'feature',
  title: '',
  body: '',
  audience: 'all',
  targetPlan: '',
  targetState: '',
  targetBoard: '',
  targetSchoolIds: [],
  channels: ['in_app'],
};

/** Compose & send a platform-wide announcement (spec §12.6). */
export function AnnouncementComposePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: plans } = usePlans();
  const { data: schools } = useSchools();

  return (
    <div className="nx-page">
      <Form<AnnouncementValues>
        schema={announcementSchema}
        defaultValues={DEFAULTS}
        onSubmit={async (values) => {
          try {
            await sendAnnouncement(
              {
                type: values.type,
                title: values.title.trim(),
                body: values.body.trim(),
                audience: values.audience,
                targetPlan: values.audience === 'plan' ? values.targetPlan || undefined : undefined,
                targetState: values.audience === 'state' ? values.targetState || undefined : undefined,
                targetBoard: values.audience === 'board' ? (values.targetBoard as BoardType) || undefined : undefined,
                targetSchoolIds: values.audience === 'schools' ? values.targetSchoolIds : undefined,
                channels: values.channels,
              },
              { uid: uid ?? 'unknown', name: member?.name },
            );
            toast.success('Announcement sent', values.title.trim());
            navigate('/announcements');
          } catch {
            toast.error('Could not send', 'Please try again.');
          }
        }}
      >
        {({ watch, formState, control }) => {
          const audience = watch('audience');
          return (
            <FormPage
              title="New announcement"
              subtitle="Send a platform-wide message to School Admins."
              breadcrumbs={[
                { label: 'Announcements', onClick: () => navigate('/announcements') },
                { label: 'New' },
              ]}
              onBack={() => navigate('/announcements')}
              onCancel={() => navigate('/announcements')}
              submitLabel="Send announcement"
              submitIcon="send"
              submitting={formState.isSubmitting}
            >
              <FormSection title="Message">
                <FormRow>
                  <FormRadioGroup<AnnouncementValues>
                    name="type"
                    label="Type"
                    required
                    options={TYPE_OPTIONS}
                    variant="inline"
                  />
                </FormRow>
                <FormRow>
                  <FormInput<AnnouncementValues>
                    name="title"
                    label="Title"
                    required
                    placeholder="e.g. Scheduled maintenance this Sunday"
                  />
                </FormRow>
                <FormRow>
                  <FormTextarea<AnnouncementValues>
                    name="body"
                    label="Message"
                    required
                    rows={5}
                    placeholder="What do School Admins need to know?"
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Audience">
                <FormSelect<AnnouncementValues>
                  name="audience"
                  label="Who should see this?"
                  required
                  options={AUDIENCE_OPTIONS}
                />

                {audience === 'plan' && (
                  <FormSelect<AnnouncementValues>
                    name="targetPlan"
                    label="Plan"
                    required
                    placeholder="Select a plan"
                    options={plans.map((p) => ({ value: p.name, label: p.name }))}
                  />
                )}
                {audience === 'state' && (
                  <FormSelect<AnnouncementValues>
                    name="targetState"
                    label="State"
                    required
                    placeholder="Select a state"
                    options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  />
                )}
                {audience === 'board' && (
                  <FormSelect<AnnouncementValues>
                    name="targetBoard"
                    label="Board"
                    required
                    placeholder="Select a board"
                    options={BOARD_OPTIONS}
                  />
                )}
                {audience === 'schools' && (
                  <FormRow>
                    <Controller
                      control={control}
                      name="targetSchoolIds"
                      render={({ field, fieldState }) => (
                        <SchoolChecklist
                          value={field.value ?? []}
                          onChange={field.onChange}
                          options={schools.map((s) => ({ id: s.id, name: s.name }))}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </FormRow>
                )}
              </FormSection>

              <FormSection title="Delivery">
                <FormRow>
                  <Controller
                    control={control}
                    name="channels"
                    render={({ field, fieldState }) => (
                      <Field label="Channels" error={fieldState.error?.message}>
                        <div className="nx-annchannels">
                          {CHANNELS.map((c) => {
                            const checked = (field.value ?? []).includes(c.key);
                            const isInApp = c.key === 'in_app';
                            return (
                              <Checkbox
                                key={c.key}
                                label={c.label}
                                description={c.description}
                                checked={checked}
                                disabled={!isInApp}
                                onChange={(on) => {
                                  const set = new Set(field.value ?? []);
                                  if (on) set.add(c.key);
                                  else set.delete(c.key);
                                  field.onChange([...set]);
                                }}
                              />
                            );
                          })}
                        </div>
                      </Field>
                    )}
                  />
                </FormRow>

                <FormRow>
                  <InfoCard icon="info" title="Only in-app delivery is active right now">
                    Announcements appear as an in-app banner to School Admins. Email and SMS are
                    feature-flagged paid integrations that will be provisioned later.
                  </InfoCard>
                </FormRow>
              </FormSection>
            </FormPage>
          );
        }}
      </Form>
    </div>
  );
}

/** Multi-select checklist of schools (searchable, chip-summary). */
function SchoolChecklist({
  value,
  onChange,
  options,
  error,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  options: { id: string; name: string }[];
  error?: string;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.name.toLowerCase().includes(needle)) : options;
  }, [q, options]);

  const toggle = (id: string) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange([...set]);
  };

  return (
    <Field
      label="Schools"
      required
      error={error}
      hint={value.length > 0 ? `${value.length} selected` : 'Pick the schools that should receive this.'}
    >
      <div className="nx-annchecklist">
        <div className="nx-annchecklist__search">
          <Input
            leftIcon="search"
            placeholder="Search schools…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search schools"
          />
        </div>
        <div className="nx-annchecklist__list" role="group" aria-label="Select schools">
          {filtered.length === 0 ? (
            <div className="nx-annchecklist__empty">
              <Icon name="school" size={16} aria-hidden="true" />
              No schools match “{q}”.
            </div>
          ) : (
            filtered.map((o) => (
              <Checkbox
                key={o.id}
                label={o.name}
                checked={value.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="nx-annchecklist__item"
              />
            ))
          )}
        </div>
      </div>
    </Field>
  );
}
