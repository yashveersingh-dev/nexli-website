import { orderBy, query } from 'firebase/firestore';
import { tenantCol, useCollection } from '@/lib/db';
import { createIn, updateIn, type Actor } from '@/features/compliance/data';
import type { ErasureRequest, BreachNotification } from './registerTypes';

/**
 * Data layer for the DPDP operational registers owned by the consent module.
 * Uses the shared generic writers (audit-aware) on the EXACT collections
 * `erasure_requests` and `breach_notifications`. Both are restricted server-side
 * to consent staff + leadership (firestore.rules — added by the security
 * workstream alongside `consent_records`).
 */

/* --------------------------- Erasure requests ---------------------------- */
export function useErasureRequests(schoolId?: string) {
  return useCollection<ErasureRequest>(
    schoolId ? query(tenantCol(schoolId, 'erasure_requests'), orderBy('requestedAt', 'desc')) : null,
    [schoolId],
  );
}
export const createErasureRequest = (s: string, d: Omit<ErasureRequest, 'id'>, a: Actor) =>
  createIn(s, 'erasure_requests', d, a, {
    action: 'erasure.requested',
    targetType: 'erasure_request',
    summary: d.subjectLabel ?? d.studentId ?? d.subjectId,
  });
export const updateErasureRequest = (s: string, id: string, p: Partial<ErasureRequest>, a: Actor) =>
  updateIn(s, 'erasure_requests', id, p, a, { action: 'erasure.updated', targetType: 'erasure_request' });

/* ------------------------ Breach notifications --------------------------- */
export function useBreachNotifications(schoolId?: string) {
  return useCollection<BreachNotification>(
    schoolId ? query(tenantCol(schoolId, 'breach_notifications'), orderBy('detectedAt', 'desc')) : null,
    [schoolId],
  );
}
export const createBreachNotification = (s: string, d: Omit<BreachNotification, 'id'>, a: Actor) =>
  createIn(s, 'breach_notifications', d, a, {
    action: 'breach.logged',
    targetType: 'breach_notification',
    summary: d.description,
  });
export const updateBreachNotification = (s: string, id: string, p: Partial<BreachNotification>, a: Actor) =>
  updateIn(s, 'breach_notifications', id, p, a, { action: 'breach.updated', targetType: 'breach_notification' });
