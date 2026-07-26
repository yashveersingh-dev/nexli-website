import { useMemo } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useConsentPurposes, useConsentRecords } from './data';
import type { ConsentPurpose, ConsentRecord } from '@/types/compliance';

/**
 * DPDP consent gate primitive.
 *
 * Computes, for one student, whether every *required & active* consent purpose has
 * a current GRANTED record (i.e. none missing, denied, withdrawn or merely pending).
 * This turns the otherwise-passive consent register into something enforceable at
 * call sites (admission, enabling a service, etc.) without those call sites needing
 * to know the consent data model.
 *
 * NOTE on access: `consent_records` is restricted server-side to consent staff +
 * leadership. A caller without that access will get an `error`; the hook surfaces it
 * via `error` and reports `ok: false` (fail-closed) so a gate can show a neutral
 * "consent could not be verified" message rather than silently allowing. The purpose
 * CATALOGUE is readable by any active member, so `requiredPurposes` is always available.
 */
export interface ConsentStatus {
  loading: boolean;
  error?: Error;
  /** True when there are no required purposes, or all required purposes are granted. */
  ok: boolean;
  /** Required & active purposes that are not currently granted for this student. */
  missing: ConsentPurpose[];
  /** Required purposes whose latest record is explicitly `withdrawn`. */
  withdrawn: ConsentPurpose[];
  /** All required & active purposes (for messaging / linking). */
  requiredPurposes: ConsentPurpose[];
}

export function useConsentStatus(studentId?: string): ConsentStatus {
  const { schoolId } = useSession();
  const { data: purposes, loading: loadingPurposes } = useConsentPurposes(schoolId);
  // No per-student server query exists; read the records collection (consent staff
  // scope) and filter client-side. `studentId` undefined => idle (records = []).
  const { data: records, loading: loadingRecords, error } = useConsentRecords(
    studentId ? schoolId : undefined,
  );

  return useMemo<ConsentStatus>(() => {
    const requiredPurposes = purposes.filter((p) => p.required && p.active !== false);
    const loading = loadingPurposes || loadingRecords;

    if (!studentId) {
      return { loading, error, ok: false, missing: requiredPurposes, withdrawn: [], requiredPurposes };
    }

    // Latest record per purpose for this student.
    const byPurpose = new Map<string, ConsentRecord>();
    for (const r of records) {
      if (r.studentId !== studentId || !r.purposeId) continue;
      byPurpose.set(r.purposeId, r);
    }

    const missing: ConsentPurpose[] = [];
    const withdrawn: ConsentPurpose[] = [];
    for (const p of requiredPurposes) {
      const rec = byPurpose.get(p.id);
      if (!rec || rec.state !== 'granted') {
        missing.push(p);
        if (rec?.state === 'withdrawn') withdrawn.push(p);
      }
    }

    // Fail-closed on error (e.g. permission denied): treat as not-ok but don't crash.
    const ok = !error && missing.length === 0;
    return { loading, error, ok, missing, withdrawn, requiredPurposes };
  }, [purposes, records, loadingPurposes, loadingRecords, error, studentId]);
}

/**
 * Imperative guard for submit handlers. Pass the status from `useConsentStatus`;
 * returns `{ ok, reason }`. Throws nothing (callers decide whether to block). Use
 * inside an `onSubmit` to short-circuit when required consent is absent.
 *
 *   const status = useConsentStatus(studentId);
 *   const check = assertConsent(status);
 *   if (!check.ok) { toast.error('Consent required', check.reason); return; }
 */
export function assertConsent(status: ConsentStatus): { ok: boolean; reason?: string } {
  if (status.loading) return { ok: false, reason: 'Consent status is still loading.' };
  if (status.error) return { ok: false, reason: 'Consent records could not be verified.' };
  if (status.missing.length) {
    return { ok: false, reason: `Missing consent for: ${status.missing.map((p) => p.name).join(', ')}.` };
  }
  return { ok: true };
}
