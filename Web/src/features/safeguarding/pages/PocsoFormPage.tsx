import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/Button';
import { Form, FormSelect, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { ConfidentialBanner } from '../components/Confidential';
import { createPocsoCaseAtomic } from '../safeguardingData';
import { POCSO_SEVERITY_OPTIONS, POCSO_REPORTER_ROLE_OPTIONS } from '../meta';
import {
  pocsoCaseSchema,
  emptyPocsoCase,
  formToPocsoCase,
  type PocsoCaseValues,
} from '../safeguardingSchema';

/** Dedicated page to report a new POCSO concern (CPO + principal only). */
export function PocsoFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, role, can } = useSession();
  const { data: students } = useStudents(schoolId);

  const back = () => navigate('/safeguarding');

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  if (!can('pocso.write')) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="Only the Child Protection Officer can report a case."
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

  // Student picker: label by name, but we only ever store the id.
  const studentOptions = useMemo(
    () => [
      { value: '', label: 'Not linked to a student' },
      ...students
        .filter((s) => s.status === 'active')
        .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
    ],
    [students],
  );

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <ConfidentialBanner />
      <Form<PocsoCaseValues>
        schema={pocsoCaseSchema}
        defaultValues={emptyPocsoCase()}
        onSubmit={async (values) => {
          try {
            const base = formToPocsoCase(values);
            // Atomic per-year counter => the human-readable caseNo is unique even
            // if two CPOs open a case simultaneously (was a client-count collision).
            const { id, caseNo } = await createPocsoCaseAtomic(
              schoolId,
              { ...base, reportedByRole: base.reportedByRole || role || undefined },
              actor,
            );
            toast.success('Case opened', caseNo);
            navigate(`/safeguarding/pocso/${id}`);
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <Body onCancel={back} studentOptions={studentOptions} />
      </Form>
    </div>
  );
}

function Body({
  onCancel,
  studentOptions,
}: {
  onCancel: () => void;
  studentOptions: { value: string; label: string }[];
}) {
  const { formState } = useFormContext<PocsoCaseValues>();
  return (
    <FormPage
      title="Report a child-protection concern"
      subtitle="Record minimal factual details. Keep identifiers to the essential minimum."
      breadcrumbs={[{ label: 'Safeguarding', onClick: onCancel }, { label: 'New case' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Open case"
      submitIcon="shield"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Concern">
        <FormTextarea<PocsoCaseValues>
          name="natureOfConcern"
          label="Nature of concern"
          required
          rows={2}
          placeholder="e.g. inappropriate physical contact reported by a teacher"
        />
        <FormSelect<PocsoCaseValues> name="severity" label="Severity" required options={POCSO_SEVERITY_OPTIONS} />
        <FormSelect<PocsoCaseValues>
          name="reportedByRole"
          label="Reported by (role)"
          options={POCSO_REPORTER_ROLE_OPTIONS}
        />
        <FormSelect<PocsoCaseValues>
          name="involvesStudentId"
          label="Linked student (optional)"
          hint="Stored as an internal reference only — no name is saved with the case."
          options={studentOptions}
        />
      </FormSection>

      <FormSection title="Summary" single>
        <FormTextarea<PocsoCaseValues>
          name="summary"
          label="Factual summary"
          required
          rows={5}
          placeholder="What happened, when, and who was informed. Avoid speculation; state only the facts."
        />
      </FormSection>
    </FormPage>
  );
}
