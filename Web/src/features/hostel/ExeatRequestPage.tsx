import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormTextarea, FormDate, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useHostelAllocations, createExeat } from '@/features/ops/data';
import { EXEAT_TYPE_OPTIONS } from '@/features/ops/meta';
import type { ExeatPass } from '@/types/ops';
import { exeatSchema, emptyExeat, defaultExpectedReturn, type ExeatValues } from './hostelSchema';

/** Dedicated routed page to raise an exeat (leave) pass request. */
export function ExeatRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate, ownerLabel } = useOwnership('hostel');
  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: students } = useStudents(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);
  const back = () => navigate('/hostel');

  if (!canOperate) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="eye"
            title="Review mode"
            message={`Exeat passes are managed by ${ownerLabel}. You can review the exeat log and boarder records.`}
            action={<Button variant="subtle" onClick={back}>Back to hostel</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Form<ExeatValues>
        schema={exeatSchema}
        defaultValues={emptyExeat(defaultExpectedReturn())}
        onSubmit={async (values) => {
          if (!schoolId) return;
          const student = students.find((s) => s.id === values.studentId);
          const alloc = allocations.find((a) => a.studentId === values.studentId && a.active !== false);
          try {
            const payload: Omit<ExeatPass, 'id'> = {
              schoolId,
              studentId: values.studentId,
              studentName: student?.fullName ?? 'Student',
              blockName: alloc?.blockName,
              type: values.type,
              reason: values.reason.trim(),
              destination: values.destination?.trim() || undefined,
              guardianName: values.guardianName?.trim() || undefined,
              guardianPhone: values.guardianPhone.trim() || undefined,
              expectedReturn: values.expectedReturn ? new Date(values.expectedReturn).getTime() : undefined,
              status: 'requested',
            };
            await createExeat(schoolId, payload, actor);
            toast.success('Exeat requested', payload.studentName);
            back();
          } catch {
            toast.error('Could not submit', 'Please try again.');
          }
        }}
      >
        <ExeatBody onCancel={back} />
      </Form>
    </div>
  );
}

function ExeatBody({ onCancel }: { onCancel: () => void }) {
  const { schoolId } = useSession();
  const { formState } = useFormContext<ExeatValues>();
  const { data: students } = useStudents(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);

  // Only boarders (allocated students) can request an exeat.
  const boarders = useMemo(() => {
    const ids = new Set(allocations.filter((a) => a.active !== false).map((a) => a.studentId));
    return students.filter((s) => ids.has(s.id)).sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }, [students, allocations]);

  return (
    <FormPage
      title="Request exeat pass"
      subtitle="Raise a leave / day-out request for a boarder. It goes to the warden for approval."
      breadcrumbs={[{ label: 'Hostel', onClick: onCancel }, { label: 'Exeat request' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Submit request"
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Boarder & leave">
        <FormSelect<ExeatValues> name="studentId" label="Student" required placeholder={boarders.length ? 'Select a boarder' : 'No boarders allocated'}
          options={boarders.map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` }))} />
        <FormSelect<ExeatValues> name="type" label="Type" required options={EXEAT_TYPE_OPTIONS} />
        <FormInput<ExeatValues> name="destination" label="Destination" placeholder="Where they are going" />
        <FormDate<ExeatValues> name="expectedReturn" label="Expected return" required mode="datetime-local" />
      </FormSection>

      <FormSection title="Reason" single>
        <FormTextarea<ExeatValues> name="reason" label="Reason" required rows={2} placeholder="Purpose of the leave" />
      </FormSection>

      <FormSection title="Guardian" description="Who is collecting / responsible during the leave.">
        <FormInput<ExeatValues> name="guardianName" label="Guardian name" placeholder="Parent / guardian" />
        <FormInput<ExeatValues> name="guardianPhone" label="Guardian phone" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" />
      </FormSection>
    </FormPage>
  );
}
