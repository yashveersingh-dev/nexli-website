import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { tenantCol, tenantDoc } from '@/lib/db';

/**
 * Thin tenant CRUD helpers for the family-portal feature collections
 * (student leave requests, PTM bookings). Mirrors the conventions in
 * `features/school/data.ts` — every doc carries `schoolId`, create/modify
 * stamps and a `version` — but is self-contained to this owned area.
 */

export interface Actor {
  uid: string;
  name?: string;
}

/** Firestore rejects `undefined` fields — drop them. */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/** Generic tenant create (auto-id). Returns the new doc id. */
export async function createIn<T extends object>(
  schoolId: string,
  sub: string,
  data: T,
  actor: Actor,
): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), {
    ...stripUndefined(data),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  });
  return ref.id;
}

/** Generic tenant patch. */
export async function updateIn<T extends object>(
  schoolId: string,
  sub: string,
  id: string,
  patch: Partial<T>,
  actor: Actor,
): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), {
    ...stripUndefined(patch),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
}
