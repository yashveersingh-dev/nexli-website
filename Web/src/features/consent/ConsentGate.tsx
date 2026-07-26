import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useSession } from '@/app/providers/SessionProvider';
import { useConsentStatus, type ConsentStatus } from './useConsentStatus';
import { decideConsentGate, consentRecordHref } from './gateDecision';

/**
 * DPDP consent gate component.
 *
 * Wrap an action/section that legally requires consent. While consent is missing
 * (or could not be verified), it renders a non-blocking warning by default; pass
 * `block` to render the fallback INSTEAD of the children (hard gate).
 *
 *   <ConsentGate studentId={id}>...sensitive action...</ConsentGate>          // warns above
 *   <ConsentGate studentId={id} block>...action requiring consent...</ConsentGate> // hard gate
 *
 * Enforcement call sites are documented in NOTES (the data agent wires these into
 * admission/student creation, which this module does not own).
 */
export interface ConsentGateProps {
  studentId?: string;
  /** Hard gate: hide children until consent is satisfied. Default false (warn only). */
  block?: boolean;
  /** Suppress the warning while loading (default true). */
  hideWhileLoading?: boolean;
  children?: ReactNode;
  /** Custom renderer for the missing-consent state. */
  renderMissing?: (status: ConsentStatus) => ReactNode;
}

export function ConsentGate({
  studentId,
  block = false,
  hideWhileLoading = true,
  children,
  renderMissing,
}: ConsentGateProps) {
  const status = useConsentStatus(studentId);

  if (status.loading && hideWhileLoading) {
    // Don't flash a warning before data resolves; for a hard gate, withhold children.
    return block ? null : <>{children}</>;
  }

  if (status.ok) return <>{children}</>;

  const warning = renderMissing ? (
    <>{renderMissing(status)}</>
  ) : (
    <ConsentWarning status={status} />
  );

  return block ? warning : (
    <>
      {warning}
      {children}
    </>
  );
}

/**
 * Prominent HARD-GATE banner for a consent-dependent action (admission
 * finalization, enabling a student record for processing, etc.).
 *
 * Unlike {@link ConsentWarning} (passive flag), this is the actionable surface
 * shown when an action is being blocked: it lists the missing purposes and offers
 * a NON-DEAD-END path to resolve them —
 *  - if the viewer can write consent (`consent.write`, i.e. DPO / consent officer /
 *    leadership) it deep-links straight into the per-student record flow;
 *  - otherwise it names who to contact (the Data Protection Officer / consent desk),
 *    because the registrar/admissions roles that hit this gate cannot record consent
 *    themselves.
 *
 * When consent could not be VERIFIED (the viewer lacks `consent.read`), it renders a
 * neutral "confirm with the DPO" notice rather than a lockout — see
 * {@link decideConsentGate}.
 */
export function ConsentRequiredBanner({ studentId }: { studentId?: string }) {
  const { can } = useSession();
  const status = useConsentStatus(studentId);
  const decision = decideConsentGate(status);
  const canRecord = can('consent.write');

  if (decision.kind === 'loading' || decision.kind === 'ok') return null;

  if (decision.kind === 'unverified') {
    return (
      <div className="cns-gate cns-gate--block" role="status">
        <Icon name="shield-check" size={18} aria-hidden="true" />
        <div className="cns-gate__body">
          <strong>Consent could not be verified.</strong> You don't have access to consent records. Before
          processing this student's data, confirm with the <strong>Data Protection Officer</strong> that the
          required guardian consent is on record.
        </div>
      </div>
    );
  }

  // kind === 'missing' — enforceable block.
  const forPurposes = decision.missingNames.length
    ? `: ${decision.missingNames.join(', ')}`
    : ' the required purposes';
  return (
    <div className="cns-gate cns-gate--block" role="alert">
      <Icon name="lock" size={18} aria-hidden="true" />
      <div className="cns-gate__body">
        <strong>Guardian consent required.</strong> This action is blocked until verifiable parental consent is
        recorded for{forPurposes}.{' '}
        {canRecord && studentId ? (
          <Link className="cns-gate__cta" to={consentRecordHref(studentId)}>
            <Icon name="shield-check" size={14} aria-hidden="true" /> Record consent
          </Link>
        ) : (
          <span className="cns-gate__hint">
            Contact the <strong>Data Protection Officer</strong> or consent desk to record it.
          </span>
        )}
      </div>
    </div>
  );
}

/** Default warning surface for missing/unverified consent. */
export function ConsentWarning({ status }: { status: ConsentStatus }) {
  const names = status.missing.map((p) => p.name);
  return (
    <div className="cns-gate" role="alert">
      <Icon name="alert-triangle" size={16} aria-hidden="true" />
      <span>
        {status.error ? (
          <>
            <strong>Consent could not be verified.</strong> You may not have access to consent records, or they
            failed to load. Proceed only if consent is confirmed by other means.
          </>
        ) : names.length ? (
          <>
            <strong>Consent required.</strong> Missing or not granted for:{' '}
            <strong>{names.join(', ')}</strong>. Record the guardian's consent in Privacy &amp; Consent before
            processing this student's data for these purposes.
            {status.withdrawn.length > 0 && (
              <> Note: consent was <strong>withdrawn</strong> for {status.withdrawn.map((p) => p.name).join(', ')}.</>
            )}
          </>
        ) : (
          <>
            <strong>Consent required.</strong> Required consent is not yet recorded for this student.
          </>
        )}
      </span>
    </div>
  );
}
