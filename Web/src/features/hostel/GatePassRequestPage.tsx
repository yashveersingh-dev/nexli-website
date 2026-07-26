import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState, InfoCard } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormTextarea, FormDate, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useHostelAllocations } from '@/features/ops/data';
import { createGatePass, type Actor } from './data';
import { GATEPASS_TYPE_OPTIONS, gatepassNeedsChief } from './meta';
import type { GatePass } from '@/types/ops';
import { gatePassSchema, emptyGatePass, defaultExpectedReturn, type GatePassValues } from './hostelSchema';

/** Routed page to raise a gate pass / leave request on behalf of a boarder. */
export function GatePassRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate, ownerLabel } = useOwnership('hostel');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: students } = useStudents(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);
  const back = () => navigate('/hostel');

  if (!canOperate) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState icon="eye" title="Review mode"
            message={`Gate passes are managed by ${ownerLabel}. You can review the gate-pass log and boarder records.`}
            action={<Button variant="subtle" onClick={back}>Back to hostel</Button>} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Form<GatePassValues>
        schema={gatePassSchema}
        defaultValues={emptyGatePass(defaultExpectedReturn())}
        onSubmit={async (values) => {
          if (!schoolId) return;
          const student = students.find((s) => s.id === values.studentId);
          const alloc = allocations.find((a) => a.studentId === values.studentId && a.active !== false);
          try {
            const payload: Omit<GatePass, 'id'> = {
              schoolId,
              studentId: values.studentId,
              studentName: student?.fullName ?? 'Student',
              gradeName: student?.gradeName,
              blockId: alloc?.blockId,
              blockName: alloc?.blockName,
              type: values.type,
              reason: values.reason.trim(),
              destination: values.destination?.trim() || undefined,
              guardianName: values.guardianName?.trim() || undefined,
              guardianPhone: values.guardianPhone.trim() || undefined,
              needsChiefApproval: gatepassNeedsChief(values.type),
              expectedReturn: values.expectedReturn ? new Date(values.expectedReturn).getTime() : undefined,
              status: 'requested',
              requestedByName: member?.name,
            };
            await createGatePass(schoolId, payload, actor);
            toast.success('Gate pass raised', payload.studentName);
            back();
          } catch {
            toast.error('Could not submit', 'Please try again.');
          }
        }}
      >
        <GatePassBody onCancel={back} />
      </Form>
    </div>
  );
}

function GatePassBody({ onCancel }: { onCancel: () => void }) {
  const { schoolId } = useSession();
  const { formState, control } = useFormContext<GatePassValues>();
  const { data: students } = useStudents(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);
  const type = useWatch({ control, name: 'type' });

  // Only boarders (allocated students) can be issued a gate pass.
  const boarders = useMemo(() => {
    const ids = new Set(allocations.filter((a) => a.active !== false).map((a) => a.studentId));
    return students.filter((s) => ids.has(s.id)).sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }, [students, allocations]);

  return (
    <FormPage
      title="Raise gate pass"
      subtitle="Apply for a boarder's outing / leave. Warden approves first; overnight & home visits also need the chief warden's sign-off."
      breadcrumbs={[{ label: 'Hostel', onClick: onCancel }, { label: 'New gate pass' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Submit request"
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Boarder & outing">
        <FormSelect<GatePassValues> name="studentId" label="Boarder" required placeholder={boarders.length ? 'Select a boarder' : 'No boarders allocated'}
          options={boarders.map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` }))} />
        <FormSelect<GatePassValues> name="type" label="Type" required options={GATEPASS_TYPE_OPTIONS} />
        <FormInput<GatePassValues> name="destination" label="Destination" placeholder="Where they are going" />
        <FormDate<GatePassValues> name="expectedReturn" label="Expected return" required mode="datetime-local" />
      </FormSection>

      {type && gatepassNeedsChief(type) && (
        <InfoCard icon="shield-check" title="Needs chief warden approval">
          {type === 'overnight' ? 'Overnight' : 'Home visit'} passes are extended leave — after the block warden signs off, the chief warden gives the final approval.
        </InfoCard>
      )}

      <FormSection title="Reason" single>
        <FormTextarea<GatePassValues> name="reason" label="Reason" required rows={2} placeholder="Purpose of the outing / leave" />
      </FormSection>

      <FormSection title="Guardian" description="Who is collecting / responsible during the leave.">
        <FormInput<GatePassValues> name="guardianName" label="Guardian name" placeholder="Parent / guardian" />
        <FormInput<GatePassValues> name="guardianPhone" label="Guardian phone" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" />
      </FormSection>
    </FormPage>
  );
}
