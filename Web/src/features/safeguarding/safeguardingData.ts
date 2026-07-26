import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { updatePocsoCase, type Actor } from '@/features/compliance/data';
import { POCSO_REPORTING_WINDOW_MS } from './safeguardingSchema';
import type { PocsoCase } from '@/types/compliance';

/**
 * Safeguarding (POCSO) write helpers that need atomicity or extra fields beyond
 * the shared compliance data layer.
 *
 * Case numbers MUST be unique even under concurrency (two CPOs opening a case at
 * the same moment), so the human-readable `caseNo` is allocated via an ATOMIC
 * per-year counter transaction on `pocso_counters` (doc id = year), mirroring the
 * `finance_counters` (receipts) and `certificate_counters` (serials) pattern.
 * Firestore rules for `pocso_counters` are added by the security workstream.
 */

/* ---------------------------------------------------------------------------
 * POCSO s.19 mandatory-reporting fields. These are POCSO-specific and live with
 * the safeguarding feature; we augment the shared `PocsoCase` shape here (rather
 * than editing the shared type) so the rest of the codebase is untouched.
 * ------------------------------------------------------------------------- */
declare module '@/types/compliance' {
  interface PocsoCase {
    /** createdAt + 24h — POCSO s.19 mandatory-reporting deadline (epoch ms). */
    reportingDeadline?: number;
    /** When the matter was actually reported to the authorities (SJPU/CWC/police). */
    reportedToAuthoritiesAt?: number;
    /** Free-text destination the report was made to (e.g. "Police / SJPU"). */
    reportedToAuthority?: string;
  }
}

const pad = (n: number, w = 4) => String(n).padStart(w, '0');

export interface NewPocsoCase {
  natureOfConcern: string;
  severity: PocsoCase['severity'];
  summary: string;
  involvesStudentId?: string;
  reportedByRole?: string;
}

/**
 * Allocate the next case number atomically and create the confidential case file.
 * Returns the new doc id and the allocated `caseNo`.
 */
export async function createPocsoCaseAtomic(
  schoolId: string,
  input: NewPocsoCase,
  actor: Actor,
): Promise<{ id: string; caseNo: string }> {
  const year = new Date().getFullYear();
  const counterRef = tenantDoc(schoolId, 'pocso_counters', String(year));
  const caseRef = doc(collection(db, `schools/${schoolId}/pocso`));
  const reportedAt = Date.now();
  const reportingDeadline = reportedAt + POCSO_REPORTING_WINDOW_MS;

  const caseNo = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = ((snap.data()?.value as number | undefined) ?? 0) + 1;
    const no = `PC-${year}-${pad(next)}`;
    tx.set(counterRef, { value: next, schoolId }, { merge: true });
    tx.set(caseRef, {
      caseNo: no,
      natureOfConcern: input.natureOfConcern,
      severity: input.severity,
      summary: input.summary,
      involvesStudentId: input.involvesStudentId ?? null,
      reportedByRole: input.reportedByRole ?? null,
      status: 'reported',
      confidential: true,
      reportedAt,
      reportingDeadline,
      schoolId,
      createdAt: reportedAt,
      createdBy: actor.uid,
      serverCreatedAt: serverTimestamp(),
      version: 1,
    });
    return no;
  });

  void writeAuditEvent({
    action: 'pocso.case_created',
    schoolId,
    actor,
    targetType: 'pocso_case',
    targetId: caseRef.id,
    summary: caseNo,
  });

  return { id: caseRef.id, caseNo };
}

/** Record that a case was reported to the authorities (POCSO s.19 compliance). */
export async function markPocsoReported(
  schoolId: string,
  caseId: string,
  reportedToAuthority: string,
  actor: Actor,
  reportedAt: number = Date.now(),
): Promise<void> {
  await updatePocsoCase(
    schoolId,
    caseId,
    { reportedToAuthoritiesAt: reportedAt, reportedToAuthority: reportedToAuthority || undefined },
    actor,
  );
  void writeAuditEvent({
    action: 'pocso.reported_to_authorities',
    schoolId,
    actor,
    targetType: 'pocso_case',
    targetId: caseId,
    summary: reportedToAuthority,
  });
}
