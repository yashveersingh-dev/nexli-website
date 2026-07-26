import {
  addDoc, deleteDoc, serverTimestamp, setDoc, updateDoc, where, query,
} from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type {
  GatePass, HostelNotification, DietProfile, MessMenu, HostelIncident,
} from '@/types/ops';

/**
 * Hostel boarding workflows data layer (gate pass / leave, mess & dietary,
 * incident / sick-bay, and the parent-notification log). Tenant-scoped under
 * `schools/{schoolId}/…`, layered ON the existing hostel allocation/block
 * collections owned by `@/features/ops/data` (blocks, rooms, allocations,
 * rollcall). Everything is block-scoped where the warden owns a block; the
 * chief warden sees all. `actor = { uid, name }`.
 */
export interface Actor { uid: string; name?: string }

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

async function createIn<T extends object>(schoolId: string, sub: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), { ...stripUndefined(data), schoolId, createdAt: Date.now(), createdBy: actor.uid, serverCreatedAt: serverTimestamp(), version: 1 });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: ref.id, summary: audit.summary });
  return ref.id;
}
async function updateIn<T extends object>(schoolId: string, sub: string, id: string, patch: Partial<T>, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(patch), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
async function setIn<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await setDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

/* ===================== Gate pass / leave (outing) ===================== */
export function useGatePasses(schoolId?: string) {
  return useCollection<GatePass>(schoolId ? tenantCol(schoolId, 'hostel_gatepass') : null, [schoolId]);
}
export const createGatePass = (s: string, d: Omit<GatePass, 'id'>, a: Actor) =>
  createIn(s, 'hostel_gatepass', d, a, { action: 'hostel.gatepass_requested', targetType: 'hostel_gatepass', summary: d.studentName });
export const updateGatePass = (s: string, id: string, p: Partial<GatePass>, a: Actor, summary?: string) =>
  updateIn(s, 'hostel_gatepass', id, p, a, { action: 'hostel.gatepass_updated', targetType: 'hostel_gatepass', summary });

/* ===================== Parent notification log (seam) ===================== */
export function useHostelNotifications(schoolId?: string) {
  return useCollection<HostelNotification>(schoolId ? tenantCol(schoolId, 'hostel_notifications') : null, [schoolId]);
}

/**
 * Parent-notification seam. On the Spark plan there is no SMS / Cloud Function,
 * so this records the intent + payload in an in-app log (`hostel_notifications`)
 * that a future dispatcher (SMS/WhatsApp) can consume. Returns the log id.
 *
 * When real channels land, swap the body to enqueue/send and keep this signature.
 */
export async function notifyHostel(
  schoolId: string,
  payload: Omit<HostelNotification, 'id' | 'schoolId' | 'status' | 'sentAt' | 'channel'> & { channel?: HostelNotification['channel'] },
  actor: Actor,
): Promise<string> {
  return createIn(schoolId, 'hostel_notifications', {
    ...payload,
    channel: payload.channel ?? 'in_app',
    sentByName: payload.sentByName ?? actor.name,
    sentAt: Date.now(),
  } as Omit<HostelNotification, 'id'>, actor, { action: 'hostel.parent_notified', targetType: 'hostel_notification', summary: payload.studentName ?? payload.message });
}

/* ===================== Mess / dietary ===================== */
export function useDietProfiles(schoolId?: string) {
  return useCollection<DietProfile>(schoolId ? tenantCol(schoolId, 'hostel_diet') : null, [schoolId]);
}
/** One diet profile per boarder — doc id = studentId. */
export const saveDietProfile = (s: string, d: Omit<DietProfile, 'id'>, a: Actor) =>
  setIn(s, 'hostel_diet', d.studentId, { ...d, updatedByName: a.name }, a, { action: 'hostel.diet_updated', targetType: 'hostel_diet', summary: d.studentName });
export const deleteDietProfile = (s: string, studentId: string, a: Actor) =>
  removeIn(s, 'hostel_diet', studentId, a, { action: 'hostel.diet_deleted', targetType: 'hostel_diet' });

export function useMessMenu(schoolId?: string, date?: string) {
  return useDocument<MessMenu>(schoolId && date ? tenantDoc(schoolId, 'hostel_mess', date) : null);
}
/** One menu per day — doc id = date (yyyy-mm-dd). */
export const saveMessMenu = (s: string, d: Omit<MessMenu, 'id'>, a: Actor) =>
  setIn(s, 'hostel_mess', d.date, { ...d, setByName: a.name }, a, { action: 'hostel.mess_menu_set', targetType: 'hostel_mess', summary: d.date });

/* ===================== Incident / sick-bay ===================== */
export function useHostelIncidents(schoolId?: string) {
  return useCollection<HostelIncident>(schoolId ? tenantCol(schoolId, 'hostel_incident') : null, [schoolId]);
}
export const createIncident = (s: string, d: Omit<HostelIncident, 'id'>, a: Actor) =>
  createIn(s, 'hostel_incident', d, a, { action: 'hostel.incident_logged', targetType: 'hostel_incident', summary: d.title });
export const updateIncident = (s: string, id: string, p: Partial<HostelIncident>, a: Actor) =>
  updateIn(s, 'hostel_incident', id, p, a, { action: 'hostel.incident_updated', targetType: 'hostel_incident' });

export { where, query };
