import { addDoc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';
import type { CareerAssessment } from '@/types/career';

/**
 * Career assessment data layer.
 *
 * One doc per completed attempt lives in the tenant-scoped `careerAssessments`
 * collection, scoped by `studentId`. Following the established NEXLI pattern
 * (rankings / counselling), the whole collection is subscribed and own-record
 * scoping is applied client-side here; the Firestore rules enforce the real
 * server-side boundary (a student reads only their own docs; counsellor/staff
 * read the cohort) — wired separately by the platform.
 */

export interface Actor {
  uid: string;
  name?: string;
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/** All career assessment attempts for the school, newest first. */
export function useCareerAssessments(schoolId?: string) {
  return useCollection<CareerAssessment>(
    schoolId ? query(tenantCol(schoolId, 'careerAssessments'), orderBy('completedAt', 'desc')) : null,
    [schoolId],
  );
}

/** A single student's OWN attempts — scoped query so the student portal works
 *  under the own-record security rule (no whole-collection read). */
export function useMyCareerAssessments(schoolId?: string, studentId?: string) {
  return useCollection<CareerAssessment>(
    schoolId && studentId ? query(tenantCol(schoolId, 'careerAssessments'), where('studentId', '==', studentId)) : null,
    [schoolId, studentId],
  );
}

export async function createCareerAssessment(
  schoolId: string,
  data: Omit<CareerAssessment, 'id' | 'schoolId' | 'createdAt' | 'createdBy'>,
  actor: Actor,
): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, 'careerAssessments'), {
    ...stripUndefined(data),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Counsellor adds/updates a professional note and marks the attempt reviewed. */
export function reviewCareerAssessment(
  schoolId: string,
  id: string,
  note: string,
  actor: Actor,
): Promise<void> {
  return updateDoc(tenantDoc(schoolId, 'careerAssessments', id), {
    counsellorNote: note.trim(),
    status: 'reviewed',
    reviewedBy: actor.uid,
    reviewedByName: actor.name ?? null,
    reviewedAt: Date.now(),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
}

export { useStudents } from '@/features/school/data';
