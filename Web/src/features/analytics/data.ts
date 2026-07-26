import {
  addDoc, deleteDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
  limit as fsLimit, type QueryConstraint,
} from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type { HpcCard, IepPlan, TherapyLog } from '@/types/special';
import type { SchoolEvent, EventRegistration, Alumnus } from '@/types/community';

/**
 * Shared P8 data layer for the NEW collections (HPC, IEP, therapy, events,
 * registrations, alumni). Analytics/report modules read existing tenant
 * collections directly (daily/finance/school layers) — no new schema there.
 */
export interface Actor { uid: string; name?: string }

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

export async function createIn<T extends object>(schoolId: string, sub: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), { ...stripUndefined(data), schoolId, createdAt: Date.now(), createdBy: actor.uid, serverCreatedAt: serverTimestamp(), version: 1 });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: ref.id, summary: audit.summary });
  return ref.id;
}
export async function setIn<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await setDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function updateIn<T extends object>(schoolId: string, sub: string, id: string, patch: Partial<T>, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(patch), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

/* ============================ NEP HPC ============================ */
export function useHpcCards(schoolId?: string, studentId?: string) {
  return useCollection<HpcCard>(schoolId ? (studentId ? query(tenantCol(schoolId, 'hpc_cards'), where('studentId', '==', studentId)) : tenantCol(schoolId, 'hpc_cards')) : null, [schoolId, studentId]);
}
export function useHpcCard(schoolId?: string, id?: string) {
  return useDocument<HpcCard>(schoolId && id ? tenantDoc(schoolId, 'hpc_cards', id) : null);
}
export const hpcCardId = (studentId: string, year: string, term: string) => `${studentId}_${year}_${term}`;
export const saveHpcCard = (s: string, id: string, d: Omit<HpcCard, 'id'>, a: Actor) => setIn(s, 'hpc_cards', id, d, a, { action: 'hpc.saved', targetType: 'hpc_card', summary: `${d.studentName} · ${d.term}` });
export const deleteHpcCard = (s: string, id: string, a: Actor) => removeIn(s, 'hpc_cards', id, a, { action: 'hpc.deleted', targetType: 'hpc_card' });

/* ----- HPC approval workflow. State machine + `published` consistency lives in
 * `features/hpc/hpcWorkflow.ts`; these are the audited persistence primitives. ----- */
/** Author submits a draft/returned card for leadership approval. */
export const submitHpcCard = (s: string, id: string, patch: Partial<HpcCard>, a: Actor) =>
  updateIn(s, 'hpc_cards', id, patch, a, { action: 'hpc.submitted', targetType: 'hpc_card', summary: patch.studentName });
/** Approver approves (publishes) or returns a submitted card. */
export const reviewHpcCard = (s: string, id: string, patch: Partial<HpcCard>, a: Actor, approved: boolean) =>
  updateIn(s, 'hpc_cards', id, patch, a, { action: approved ? 'hpc.approved' : 'hpc.returned', targetType: 'hpc_card', summary: patch.studentName });

/* ======================= Special Education / IEP ======================= */
export function useIepPlans(schoolId?: string) {
  return useCollection<IepPlan>(schoolId ? tenantCol(schoolId, 'iep_plans') : null, [schoolId]);
}
export function useIepPlan(schoolId?: string, id?: string) {
  return useDocument<IepPlan>(schoolId && id ? tenantDoc(schoolId, 'iep_plans', id) : null);
}
export const createIepPlan = (s: string, d: Omit<IepPlan, 'id'>, a: Actor) => createIn(s, 'iep_plans', d, a, { action: 'iep.created', targetType: 'iep_plan', summary: d.studentName });
export const updateIepPlan = (s: string, id: string, p: Partial<IepPlan>, a: Actor) => updateIn(s, 'iep_plans', id, p, a, { action: 'iep.updated', targetType: 'iep_plan' });
export const deleteIepPlan = (s: string, id: string, a: Actor) => removeIn(s, 'iep_plans', id, a, { action: 'iep.deleted', targetType: 'iep_plan' });

export function useTherapyLogs(schoolId?: string, studentId?: string) {
  return useCollection<TherapyLog>(schoolId ? (studentId ? query(tenantCol(schoolId, 'therapy_logs'), where('studentId', '==', studentId)) : tenantCol(schoolId, 'therapy_logs')) : null, [schoolId, studentId]);
}
export const createTherapyLog = (s: string, d: Omit<TherapyLog, 'id'>, a: Actor) => createIn(s, 'therapy_logs', d, a, { action: 'therapy.logged', targetType: 'therapy_log', summary: `${d.studentName} · ${d.type}` });
export const updateTherapyLog = (s: string, id: string, p: Partial<TherapyLog>, a: Actor) => updateIn(s, 'therapy_logs', id, p, a);
export const deleteTherapyLog = (s: string, id: string, a: Actor) => removeIn(s, 'therapy_logs', id, a, { action: 'therapy.deleted', targetType: 'therapy_log' });

/* ============================ Events ============================ */
export function useEvents(schoolId?: string) {
  return useCollection<SchoolEvent>(schoolId ? tenantCol(schoolId, 'events') : null, [schoolId]);
}
export function useEvent(schoolId?: string, id?: string) {
  return useDocument<SchoolEvent>(schoolId && id ? tenantDoc(schoolId, 'events', id) : null);
}
export const createEvent = (s: string, d: Omit<SchoolEvent, 'id'>, a: Actor) => createIn(s, 'events', d, a, { action: 'event.created', targetType: 'event', summary: d.title });
export const updateEvent = (s: string, id: string, p: Partial<SchoolEvent>, a: Actor) => updateIn(s, 'events', id, p, a, { action: 'event.updated', targetType: 'event' });
export const deleteEvent = (s: string, id: string, a: Actor) => removeIn(s, 'events', id, a, { action: 'event.deleted', targetType: 'event' });

/* ----- Event approval workflow. State machine + `published`(=approved) consistency
 * lives in `features/events/eventWorkflow.ts`; these are the audited primitives. ----- */
/** Owner/teacher raises an event for Principal/VP approval. */
export const requestEvent = (s: string, id: string, p: Partial<SchoolEvent>, a: Actor) =>
  updateIn(s, 'events', id, p, a, { action: 'event.requested', targetType: 'event', summary: p.title });
/** Principal/VP approves (publishes) or rejects a requested event. */
export const approveEvent = (s: string, id: string, p: Partial<SchoolEvent>, a: Actor) =>
  updateIn(s, 'events', id, p, a, { action: 'event.approved', targetType: 'event', summary: p.title });
export const rejectEvent = (s: string, id: string, p: Partial<SchoolEvent>, a: Actor) =>
  updateIn(s, 'events', id, p, a, { action: 'event.rejected', targetType: 'event', summary: p.title });

export function useEventRegistrations(schoolId?: string, eventId?: string) {
  return useCollection<EventRegistration>(schoolId ? (eventId ? query(tenantCol(schoolId, 'event_registrations'), where('eventId', '==', eventId)) : tenantCol(schoolId, 'event_registrations')) : null, [schoolId, eventId]);
}
export const createRegistration = (s: string, d: Omit<EventRegistration, 'id'>, a: Actor) => createIn(s, 'event_registrations', d, a, { action: 'event.registered', targetType: 'event_registration', summary: d.participantName });
export const updateRegistration = (s: string, id: string, p: Partial<EventRegistration>, a: Actor) => updateIn(s, 'event_registrations', id, p, a);
export const deleteRegistration = (s: string, id: string, a: Actor) => removeIn(s, 'event_registrations', id, a);

/* ============================ Alumni ============================ */
export function useAlumni(schoolId?: string) {
  return useCollection<Alumnus>(schoolId ? tenantCol(schoolId, 'alumni') : null, [schoolId]);
}
export function useAlumnus(schoolId?: string, id?: string) {
  return useDocument<Alumnus>(schoolId && id ? tenantDoc(schoolId, 'alumni', id) : null);
}
export const createAlumnus = (s: string, d: Omit<Alumnus, 'id'>, a: Actor) => createIn(s, 'alumni', d, a, { action: 'alumni.added', targetType: 'alumnus', summary: d.name });
export const updateAlumnus = (s: string, id: string, p: Partial<Alumnus>, a: Actor) => updateIn(s, 'alumni', id, p, a, { action: 'alumni.updated', targetType: 'alumnus' });
export const deleteAlumnus = (s: string, id: string, a: Actor) => removeIn(s, 'alumni', id, a, { action: 'alumni.deleted', targetType: 'alumnus' });

/* ---------------- one-shot ---------------- */
export async function p8QueryOnce<T>(schoolId: string, sub: string, ...c: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(tenantCol(schoolId, sub), ...c, fsLimit(2000)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}
export { where, orderBy };
