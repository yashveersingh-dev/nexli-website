import type { ConsentStatus } from './useConsentStatus';

/**
 * PURE decision logic for the DPDP consent hard-gate. Kept free of React/Firestore
 * so it can be unit-tested and reused across call sites (admission finalization,
 * student-edit save, enabling a service…).
 *
 * The gate distinguishes three blocking situations:
 *  - `loading`     — status not yet resolved; callers should hold (no decision).
 *  - `missing`     — consent records ARE readable and a required purpose is not
 *                    granted. This is an ENFORCEABLE block: the action must wait
 *                    for consent to be recorded.
 *  - `unverified`  — consent records could not be read (e.g. the actor lacks
 *                    `consent.read`, fail-closed in {@link useConsentStatus}). The
 *                    actor is NOT the consent enforcer and must not be trapped in a
 *                    lockout loop, so this is surfaced as a neutral "confirm with the
 *                    DPO" notice. `hardBlock` is therefore false for this kind.
 */
export type ConsentGateKind = 'ok' | 'loading' | 'missing' | 'unverified';

export interface ConsentGateDecision {
  kind: ConsentGateKind;
  /** True when required consent is confirmed granted (action may proceed freely). */
  ok: boolean;
  /**
   * True only when the action must be HARD-BLOCKED in the UI (disable the control).
   * Reserved for the `missing` kind: a verifiable gap the actor (or the consent desk)
   * can close. `unverified` does NOT hard-block — it advises instead, to avoid locking
   * out staff who legitimately cannot read consent records.
   */
  hardBlock: boolean;
  /** Names of required purposes still needing consent (for messaging). Empty unless `missing`. */
  missingNames: string[];
}

/**
 * Decide whether a consent-dependent action may proceed.
 *
 * @param status   Result of `useConsentStatus(studentId)`.
 */
export function decideConsentGate(status: ConsentStatus): ConsentGateDecision {
  if (status.loading) {
    return { kind: 'loading', ok: false, hardBlock: false, missingNames: [] };
  }
  if (status.ok) {
    return { kind: 'ok', ok: true, hardBlock: false, missingNames: [] };
  }
  if (status.error) {
    // Fail-closed but DON'T trap: the actor can't read records, so they can't be the
    // one to resolve it. Advise rather than disable.
    return { kind: 'unverified', ok: false, hardBlock: false, missingNames: [] };
  }
  // Records readable, required purpose(s) not granted → enforceable hard block.
  return {
    kind: 'missing',
    ok: false,
    hardBlock: true,
    missingNames: status.missing.map((p) => p.name),
  };
}

/**
 * Deep-link into the Privacy & Consent hub, pre-targeting the records tab for one
 * student so the "Record consent" CTA is never a dead end. Consumed by
 * `ConsentHub` (selects the tab) and `RecordsTab` (pre-opens the record modal).
 */
export function consentRecordHref(studentId: string): string {
  return `/consent?tab=records&student=${encodeURIComponent(studentId)}`;
}
