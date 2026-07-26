import { collection, doc, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';

/**
 * Certificate generator data layer. Issued certificates are an append-only
 * register under `certificates`; serial numbers are allocated ATOMICALLY via a
 * per-type counter transaction (same pattern as fee receipts) so two clerks
 * issuing at once never collide.
 */
export type CertificateType = 'bonafide' | 'character' | 'conduct' | 'leaving' | 'transfer' | 'custom';

export interface IssuedCertificate {
  id: string;
  schoolId: string;
  serialNo: string;
  type: CertificateType;
  /** Free-text certificate name (for `custom` types); the displayed title/label. */
  certName?: string;
  studentId: string;
  studentName: string;
  className?: string;
  admissionNo?: string;
  purpose?: string;
  issuedAt: number;
  issuedByUid?: string;
  issuedByName?: string;
}

export interface Actor {
  uid: string;
  name?: string;
}

const pad = (n: number, w = 4) => String(n).padStart(w, '0');
export const CERT_PREFIX: Record<CertificateType, string> = {
  bonafide: 'BON', character: 'CHR', conduct: 'CND', leaving: 'SLC', transfer: 'TC', custom: 'CERT',
};

export function useIssuedCertificates(schoolId?: string) {
  return useCollection<IssuedCertificate>(
    schoolId ? query(tenantCol(schoolId, 'certificates'), orderBy('issuedAt', 'desc')) : null,
    [schoolId],
  );
}

export interface IssueInput {
  type: CertificateType;
  certName?: string;
  studentId: string;
  studentName: string;
  className?: string;
  admissionNo?: string;
  purpose?: string;
}

/** Allocate the next serial atomically and append the certificate to the register. */
export async function issueCertificate(schoolId: string, input: IssueInput, actor: Actor): Promise<IssuedCertificate> {
  const counterRef = tenantDoc(schoolId, 'certificate_counters', input.type);
  const certRef = doc(collection(db, `schools/${schoolId}/certificates`));
  const year = new Date().getFullYear();
  const issuedAt = Date.now();

  const serialNo = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = ((snap.data()?.value as number | undefined) ?? 0) + 1;
    const sn = `${CERT_PREFIX[input.type]}-${year}-${pad(next)}`;
    tx.set(counterRef, { value: next, schoolId }, { merge: true });
    tx.set(certRef, {
      serialNo: sn,
      type: input.type,
      certName: input.certName ?? null,
      studentId: input.studentId,
      studentName: input.studentName,
      className: input.className ?? null,
      admissionNo: input.admissionNo ?? null,
      purpose: input.purpose ?? null,
      issuedAt,
      issuedByUid: actor.uid,
      issuedByName: actor.name ?? null,
      schoolId,
      serverCreatedAt: serverTimestamp(),
    });
    return sn;
  });

  return { id: certRef.id, schoolId, serialNo, issuedAt, issuedByUid: actor.uid, issuedByName: actor.name, ...input };
}

export { useStudents } from '@/features/school/data';
