/**
 * Privacy & Consent (DPDP) data layer. Consent purposes + records live under the
 * shared Compliance & Governance (P7) data layer — this module re-exports the
 * relevant readers/writers so the consent feature keeps a clean local import
 * surface without duplicating the Firestore plumbing.
 *
 * Consent decisions are personal data under the DPDP Act: `consent_records` is
 * restricted server-side to consent/data-protection staff + leadership
 * (firestore.rules `isConsentStaff`). This client mirrors that via the
 * `consent.read` / `consent.write` gates for BOTH records and the purpose
 * catalogue. NOTE: `consent_purposes` is not yet in the restricted set
 * server-side (any active member can read it, any staff can write) — see the
 * cross-cutting escalation to harden it to `isConsentStaff`.
 */
export {
  useConsentPurposes,
  createConsentPurpose,
  updateConsentPurpose,
  deleteConsentPurpose,
  useConsentRecords,
  upsertConsentRecord,
  createConsentRecord,
  type Actor,
} from '@/features/compliance/data';

export { useStudents } from '@/features/school/data';
