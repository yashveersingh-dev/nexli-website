import { addDoc, deleteDoc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';
import { isReviewer } from '@/lib/ownership';
import type { RoleId } from '@/types/roles';

/**
 * Counselling (student welfare) data layer.
 *
 * Confidential case notes live in the tenant-scoped `counseling` collection, which
 * the Firestore rules lock to counsellors, the special educator and principal-
 * equivalents (Phase A). This is NOT child-protection (POCSO) — that is the
 * separate, more-restricted Safeguarding module.
 */
export interface Actor {
  uid: string;
  name?: string;
}

export type CounselingType = 'wellbeing' | 'academic' | 'behavioural' | 'career' | 'family' | 'other';

export interface CounselingSession {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  /** Session date (epoch ms). */
  date: number;
  type: CounselingType;
  /** Confidential session notes. */
  summary: string;
  followUpRequired?: boolean;
  followUpDate?: number;
  /** UID of the owning counsellor — the basis for per-counsellor confidentiality scoping. */
  counselorUid?: string;
  counselorName?: string;
  createdAt?: number;
  createdBy?: string;
  lastModifiedAt?: number;
}

/**
 * Counselling oversight = leadership/principal-equivalents. A counsellor who is
 * NOT oversight sees only their OWN sessions (confidentiality between counsellors
 * in a multi-counsellor school); oversight sees all. Mirrors the `counseling`
 * module reviewers in `@/lib/ownership` (LEADERSHIP_ROLES). The Firestore rules
 * pass mirrors this server-side on `counselorUid`.
 */
export function isCounselingOversight(role?: RoleId, secondaryRole?: RoleId): boolean {
  return isReviewer(role, 'counseling') || (!!secondaryRole && isReviewer(secondaryRole, 'counseling'));
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/**
 * Counselling sessions, newest first.
 *
 * When `ownerUid` is supplied the query is scoped to sessions owned by that
 * counsellor (`where('counselorUid','==', ownerUid)`) — used for non-oversight
 * counsellors so they never read peers' confidential notes. Pass `undefined`
 * (oversight/leadership) for the unfiltered school-wide view.
 */
export function useCounselingSessions(schoolId?: string, ownerUid?: string) {
  return useCollection<CounselingSession>(
    schoolId
      ? ownerUid
        ? query(tenantCol(schoolId, 'counseling'), where('counselorUid', '==', ownerUid), orderBy('date', 'desc'))
        : query(tenantCol(schoolId, 'counseling'), orderBy('date', 'desc'))
      : null,
    [schoolId, ownerUid],
  );
}

export async function createCounselingSession(
  schoolId: string,
  data: Omit<CounselingSession, 'id'>,
  actor: Actor,
): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, 'counseling'), {
    ...stripUndefined(data),
    schoolId,
    counselorUid: actor.uid,
    counselorName: actor.name,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateCounselingSession(
  schoolId: string,
  id: string,
  patch: Partial<Omit<CounselingSession, 'id' | 'schoolId' | 'createdAt' | 'createdBy'>>,
): Promise<void> {
  return updateDoc(tenantDoc(schoolId, 'counseling', id), { ...stripUndefined(patch), lastModifiedAt: Date.now() });
}

export function deleteCounselingSession(schoolId: string, id: string): Promise<void> {
  return deleteDoc(tenantDoc(schoolId, 'counseling', id));
}

export { useStudents } from '@/features/school/data';
