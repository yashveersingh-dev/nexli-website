import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useBlacklist, createVisitor } from '@/features/ops/data';
import { VISITOR_PURPOSE_OPTIONS, ID_TYPE_OPTIONS } from '@/features/ops/meta';
import type { VisitorLog, BlacklistEntry } from '@/types/ops';
import { visitorSchema, emptyVisitor, generatePassNo, generateOtp, type VisitorValues } from './visitorSchema';

/**
 * Find an ACTIVE blacklist entry matching this visitor by phone (exact) or name
 * (case-insensitive, ≥2 chars). Shared by the live banner (disable submit) and the
 * submit-time guard (hard block) so the two can never disagree.
 */
function findBlacklistMatch(
  blacklist: BlacklistEntry[],
  name: string | undefined,
  phone: string | undefined,
): BlacklistEntry | null {
  const n = (name ?? '').trim().toLowerCase();
  const p = (phone ?? '').trim();
  if (n.length < 2 && !p) return null;
  return (
    blacklist.find(
      (b) => b.active !== false && ((p && b.phone === p) || (n.length >= 2 && b.name.toLowerCase() === n)),
    ) ?? null
  );
}

export function VisitorCheckInPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate, ownerLabel } = useOwnership('visitor');
  const { data: blacklist } = useBlacklist(schoolId);
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  if (!canOperate) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="eye"
            title="Review mode"
            message={`Visitor check-in is handled by ${ownerLabel}. You can review the gate register and visitor log.`}
            action={<Button variant="subtle" onClick={() => navigate('/visitor')}>Back to gate</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Form<VisitorValues>
        schema={visitorSchema}
        defaultValues={emptyVisitor}
        onSubmit={async (values) => {
          if (!schoolId) return;
          // HARD BLOCK: a blacklisted visitor must never be checked in. The live
          // banner already disables the button; this is the defense-in-depth guard
          // so no edge path (programmatic submit, stale state) can bypass it.
          if (findBlacklistMatch(blacklist, values.name, values.phone)) {
            toast.error('Check-in blocked', 'This visitor is on the security blacklist. Contact security before allowing entry.');
            return;
          }
          try {
            const payload: Omit<VisitorLog, 'id'> = {
              schoolId,
              name: values.name.trim(),
              phone: values.phone.trim() || undefined,
              purpose: values.purpose,
              whomToMeet: values.whomToMeet?.trim() || undefined,
              company: values.company?.trim() || undefined,
              partySize: values.partySize ? Number(values.partySize) : 1,
              idType: values.idType,
              idLast4: values.idLast4?.trim() || undefined,
              vehicleNo: values.vehicleNo?.trim().toUpperCase() || undefined,
              notes: values.notes?.trim() || undefined,
              passNo: generatePassNo(),
              otp: generateOtp(),
              inAt: Date.now(),
              status: 'in',
              gateName: member?.name,
            };
            const id = await createVisitor(schoolId, payload, actor);
            toast.success('Visitor checked in', payload.name);
            navigate(`/visitor/${id}`);
          } catch {
            toast.error('Could not check in', 'Please try again.');
          }
        }}
      >
        <CheckInBody onCancel={() => navigate('/visitor')} />
      </Form>
    </div>
  );
}

function CheckInBody({ onCancel }: { onCancel: () => void }) {
  const { schoolId } = useSession();
  const { watch, formState } = useFormContext<VisitorValues>();
  const { data: blacklist } = useBlacklist(schoolId);

  const name = watch('name');
  const phone = watch('phone');
  const match = useMemo(() => findBlacklistMatch(blacklist, name, phone), [blacklist, name, phone]);

  return (
    <FormPage
      title="Visitor check-in"
      subtitle="Register a visitor and issue a gate pass with a verification OTP."
      breadcrumbs={[{ label: 'Visitor & Gate', onClick: onCancel }, { label: 'Check-in' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel="Check in & issue pass"
      submitIcon="check"
      submitting={formState.isSubmitting}
      // HARD BLOCK: cannot check in a blacklisted visitor (also guarded at submit).
      submitDisabled={!!match}
    >
      {match && (
        <div className="ops-sos" role="alert" style={{ marginBottom: 4 }}>
          <span className="ops-sos__icon"><Icon name="alert-triangle" size={20} /></span>
          <div>
            <div className="ops-sos__title">Check-in blocked — visitor is blacklisted</div>
            <div className="ops-sos__meta">A visitor matching {match.phone ? 'this phone' : 'this name'} is on the security blacklist{match.reason ? ` — ${match.reason}` : ''}. Entry is not permitted; contact security to proceed.</div>
          </div>
        </div>
      )}

      <FormSection title="Visitor">
        <FormInput<VisitorValues> name="name" label="Full name" required placeholder="Visitor name" />
        <FormInput<VisitorValues> name="phone" label="Mobile" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" />
        <FormSelect<VisitorValues> name="purpose" label="Purpose" required options={VISITOR_PURPOSE_OPTIONS} />
        <FormInput<VisitorValues> name="whomToMeet" label="Whom to meet" placeholder="Staff / student name" />
        <FormInput<VisitorValues> name="company" label="Company / organisation" />
        <FormInput<VisitorValues> name="partySize" label="No. of people" type="number" inputMode="numeric" />
      </FormSection>

      <FormSection title="Identity & vehicle" description="Record ID only as last-4 digits (privacy by design).">
        <FormSelect<VisitorValues> name="idType" label="ID type" placeholder="Select" options={ID_TYPE_OPTIONS} />
        <FormInput<VisitorValues> name="idLast4" label="ID (last 4)" inputMode="numeric" maxLength={4} />
        <FormInput<VisitorValues> name="vehicleNo" label="Vehicle no." placeholder="e.g. DL01AB1234" />
      </FormSection>

      <FormSection title="Notes" single>
        <FormTextarea<VisitorValues> name="notes" label="Notes" rows={2} placeholder="Any remark for the gate log" />
      </FormSection>
    </FormPage>
  );
}
