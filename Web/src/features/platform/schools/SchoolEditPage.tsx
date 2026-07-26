import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/feedback';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/Button';
import {
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useSchool, updateSchool } from '@/features/platform/data';
import { BOARD_OPTIONS, SCHOOL_TYPE_OPTIONS, INDIAN_STATES } from '@/features/platform/meta';
import { schoolEditSchema, type SchoolEditValues } from './schoolSchema';
import type { BoardType, SchoolType } from '@/types/models';

/** Edit a school's core details (spec §12.3 — Super Admin can edit any school). */
export function SchoolEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: school, loading } = useSchool(id);

  if (loading) return <div className="nx-page"><Panel><Skeleton height={320} /></Panel></div>;
  if (!school) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="school"
          title="School not found"
          action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/schools')}>Back to schools</Button>}
        />
      </div>
    );
  }

  const defaults: SchoolEditValues = {
    name: school.name ?? '',
    board: school.board ?? 'CBSE',
    type: school.type ?? 'day',
    city: school.city ?? '',
    state: school.state ?? '',
    pincode: school.pincode ?? '',
    phone: school.phone ?? '',
    email: school.email ?? '',
    website: school.website ?? '',
    currentAcademicYear: school.currentAcademicYear ?? '',
    notes: school.notes ?? '',
  };

  return (
    <div className="nx-page">
      <Form<SchoolEditValues>
        schema={schoolEditSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            await updateSchool(
              id,
              {
                ...values,
                board: values.board as BoardType,
                type: values.type as SchoolType,
                email: values.email || undefined,
              },
              { uid: uid ?? 'unknown', name: member?.name },
            );
            toast.success('School updated', school.name);
            navigate(`/schools/${id}`);
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        {({ formState }) => (
          <FormPage
            title={`Edit ${school.name}`}
            subtitle="Update the school's profile and classification."
            breadcrumbs={[{ label: 'Schools', onClick: () => navigate('/schools') }, { label: school.name, onClick: () => navigate(`/schools/${id}`) }, { label: 'Edit' }]}
            onBack={() => navigate(`/schools/${id}`)}
            onCancel={() => navigate(`/schools/${id}`)}
            submitLabel="Save changes"
            submitIcon="check"
            submitting={formState.isSubmitting}
          >
            <FormSection title="Basic details">
              <FormRow>
                <FormInput<SchoolEditValues> name="name" label="School name" required placeholder="e.g. Sunrise International School" />
              </FormRow>
              <FormInput<SchoolEditValues> name="city" label="City" placeholder="City" />
              <FormSelect<SchoolEditValues> name="state" label="State" placeholder="Select state" options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} />
              <FormInput<SchoolEditValues> name="pincode" label="Pincode" placeholder="6-digit" inputMode="numeric" maxLength={6} />
              <FormInput<SchoolEditValues> name="currentAcademicYear" label="Academic year" placeholder="e.g. 2026-27" />
              <FormInput<SchoolEditValues> name="phone" label="Phone" placeholder="Office number" />
              <FormInput<SchoolEditValues> name="email" label="Email" placeholder="office@school.edu" />
              <FormRow>
                <FormInput<SchoolEditValues> name="website" label="Website" placeholder="https://" />
              </FormRow>
            </FormSection>

            <FormSection title="Classification">
              <FormSelect<SchoolEditValues> name="board" label="Board" required options={BOARD_OPTIONS} />
              <FormSelect<SchoolEditValues> name="type" label="School type" required options={SCHOOL_TYPE_OPTIONS} />
            </FormSection>

            <FormSection title="Internal" single>
              <FormRow>
                <FormTextarea<SchoolEditValues> name="notes" label="Super Admin notes" optional placeholder="Private notes about this school…" />
              </FormRow>
            </FormSection>
          </FormPage>
        )}
      </Form>
    </div>
  );
}
