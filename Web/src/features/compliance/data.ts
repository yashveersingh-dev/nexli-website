import {
  addDoc, deleteDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
  limit as fsLimit, type QueryConstraint,
} from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type {
  ComplianceItem, ComplianceDocument, UdiseProfile,
  RteApplication, RteClaim, PocsoCase, Grievance,
  ConsentPurpose, ConsentRecord, SmcMember, SmcMeeting, SmcBudgetItem,
} from '@/types/compliance';

/**
 * Shared Compliance & Governance (P7) data layer. Tenant-scoped via `db.ts`.
 * POCSO → restricted `pocso` collection, grievances → restricted `grievances`
 * (both already guarded in firestore.rules to CPO/DPO/principal).
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

/* ====================== Compliance calendar + vault ====================== */
export function useComplianceItems(schoolId?: string) {
  return useCollection<ComplianceItem>(schoolId ? tenantCol(schoolId, 'compliance_items') : null, [schoolId]);
}
export const createComplianceItem = (s: string, d: Omit<ComplianceItem, 'id'>, a: Actor) => createIn(s, 'compliance_items', d, a, { action: 'compliance.item_created', targetType: 'compliance_item', summary: d.title });
export const updateComplianceItem = (s: string, id: string, p: Partial<ComplianceItem>, a: Actor) => updateIn(s, 'compliance_items', id, p, a, { action: 'compliance.item_updated', targetType: 'compliance_item' });
export const deleteComplianceItem = (s: string, id: string, a: Actor) => removeIn(s, 'compliance_items', id, a, { action: 'compliance.item_deleted', targetType: 'compliance_item' });

export function useComplianceDocuments(schoolId?: string) {
  return useCollection<ComplianceDocument>(schoolId ? tenantCol(schoolId, 'compliance_documents') : null, [schoolId]);
}
export const createComplianceDocument = (s: string, d: Omit<ComplianceDocument, 'id'>, a: Actor) => createIn(s, 'compliance_documents', d, a, { action: 'compliance.doc_added', targetType: 'compliance_document', summary: d.title });
export const updateComplianceDocument = (s: string, id: string, p: Partial<ComplianceDocument>, a: Actor) => updateIn(s, 'compliance_documents', id, p, a);
export const deleteComplianceDocument = (s: string, id: string, a: Actor) => removeIn(s, 'compliance_documents', id, a, { action: 'compliance.doc_deleted', targetType: 'compliance_document' });

/* ============================== UDISE+ ================================== */
export function useUdiseProfile(schoolId?: string) {
  return useDocument<UdiseProfile & { id: string }>(schoolId ? tenantDoc(schoolId, 'udise_profile', 'main') : null);
}
export const saveUdiseProfile = (s: string, d: UdiseProfile, a: Actor) => setIn(s, 'udise_profile', 'main', d, a, { action: 'udise.profile_saved', targetType: 'udise_profile' });

/* ========================= RTE quota & claims ========================== */
export function useRteApplications(schoolId?: string) {
  return useCollection<RteApplication>(schoolId ? tenantCol(schoolId, 'rte_applications') : null, [schoolId]);
}
export const createRteApplication = (s: string, d: Omit<RteApplication, 'id'>, a: Actor) => createIn(s, 'rte_applications', d, a, { action: 'rte.application_created', targetType: 'rte_application', summary: d.applicantName });
export const updateRteApplication = (s: string, id: string, p: Partial<RteApplication>, a: Actor) => updateIn(s, 'rte_applications', id, p, a, { action: 'rte.application_updated', targetType: 'rte_application' });
export const deleteRteApplication = (s: string, id: string, a: Actor) => removeIn(s, 'rte_applications', id, a, { action: 'rte.application_deleted', targetType: 'rte_application' });

export function useRteClaims(schoolId?: string) {
  return useCollection<RteClaim>(schoolId ? tenantCol(schoolId, 'rte_claims') : null, [schoolId]);
}
export const createRteClaim = (s: string, d: Omit<RteClaim, 'id'>, a: Actor) => createIn(s, 'rte_claims', d, a, { action: 'rte.claim_created', targetType: 'rte_claim', summary: d.academicYear });
export const updateRteClaim = (s: string, id: string, p: Partial<RteClaim>, a: Actor) => updateIn(s, 'rte_claims', id, p, a, { action: 'rte.claim_updated', targetType: 'rte_claim' });
export const deleteRteClaim = (s: string, id: string, a: Actor) => removeIn(s, 'rte_claims', id, a, { action: 'rte.claim_deleted', targetType: 'rte_claim' });

/* ===================== POCSO (restricted `pocso`) ====================== */
export function usePocsoCases(schoolId?: string) {
  return useCollection<PocsoCase>(schoolId ? tenantCol(schoolId, 'pocso') : null, [schoolId]);
}
export function usePocsoCase(schoolId?: string, id?: string) {
  return useDocument<PocsoCase>(schoolId && id ? tenantDoc(schoolId, 'pocso', id) : null);
}
export const createPocsoCase = (s: string, d: Omit<PocsoCase, 'id'>, a: Actor) => createIn(s, 'pocso', d, a, { action: 'pocso.case_created', targetType: 'pocso_case', summary: d.caseNo });
export const updatePocsoCase = (s: string, id: string, p: Partial<PocsoCase>, a: Actor) => updateIn(s, 'pocso', id, p, a, { action: 'pocso.case_updated', targetType: 'pocso_case' });

/* ================= Grievance (restricted `grievances`) ================= */
export function useGrievances(schoolId?: string) {
  return useCollection<Grievance>(schoolId ? tenantCol(schoolId, 'grievances') : null, [schoolId]);
}
export function useGrievance(schoolId?: string, id?: string) {
  return useDocument<Grievance>(schoolId && id ? tenantDoc(schoolId, 'grievances', id) : null);
}
export const createGrievance = (s: string, d: Omit<Grievance, 'id'>, a: Actor) => createIn(s, 'grievances', d, a, { action: 'grievance.created', targetType: 'grievance', summary: d.subject });
export const updateGrievance = (s: string, id: string, p: Partial<Grievance>, a: Actor) => updateIn(s, 'grievances', id, p, a, { action: 'grievance.updated', targetType: 'grievance' });

/* ========================= Consent / DPDP ============================== */
export function useConsentPurposes(schoolId?: string) {
  return useCollection<ConsentPurpose>(schoolId ? tenantCol(schoolId, 'consent_purposes') : null, [schoolId]);
}
export const createConsentPurpose = (s: string, d: Omit<ConsentPurpose, 'id'>, a: Actor) => createIn(s, 'consent_purposes', d, a, { action: 'consent.purpose_created', targetType: 'consent_purpose', summary: d.name });
export const updateConsentPurpose = (s: string, id: string, p: Partial<ConsentPurpose>, a: Actor) => updateIn(s, 'consent_purposes', id, p, a);
export const deleteConsentPurpose = (s: string, id: string, a: Actor) => removeIn(s, 'consent_purposes', id, a, { action: 'consent.purpose_deleted', targetType: 'consent_purpose' });

export function useConsentRecords(schoolId?: string, purposeId?: string) {
  return useCollection<ConsentRecord>(schoolId ? (purposeId ? query(tenantCol(schoolId, 'consent_records'), where('purposeId', '==', purposeId)) : tenantCol(schoolId, 'consent_records')) : null, [schoolId, purposeId]);
}
export const upsertConsentRecord = (s: string, id: string, d: Omit<ConsentRecord, 'id'>, a: Actor) => setIn(s, 'consent_records', id, d, a, { action: 'consent.changed', targetType: 'consent_record', summary: d.purposeName });
export const createConsentRecord = (s: string, d: Omit<ConsentRecord, 'id'>, a: Actor) => createIn(s, 'consent_records', d, a, { action: 'consent.changed', targetType: 'consent_record', summary: d.purposeName });

/* ============================== SMC ==================================== */
export function useSmcMembers(schoolId?: string) {
  return useCollection<SmcMember>(schoolId ? tenantCol(schoolId, 'smc_members') : null, [schoolId]);
}
export const createSmcMember = (s: string, d: Omit<SmcMember, 'id'>, a: Actor) => createIn(s, 'smc_members', d, a, { action: 'smc.member_added', targetType: 'smc_member', summary: d.name });
export const updateSmcMember = (s: string, id: string, p: Partial<SmcMember>, a: Actor) => updateIn(s, 'smc_members', id, p, a);
export const deleteSmcMember = (s: string, id: string, a: Actor) => removeIn(s, 'smc_members', id, a, { action: 'smc.member_removed', targetType: 'smc_member' });

export function useSmcMeetings(schoolId?: string) {
  return useCollection<SmcMeeting>(schoolId ? tenantCol(schoolId, 'smc_meetings') : null, [schoolId]);
}
export function useSmcMeeting(schoolId?: string, id?: string) {
  return useDocument<SmcMeeting>(schoolId && id ? tenantDoc(schoolId, 'smc_meetings', id) : null);
}
export const createSmcMeeting = (s: string, d: Omit<SmcMeeting, 'id'>, a: Actor) => createIn(s, 'smc_meetings', d, a, { action: 'smc.meeting_created', targetType: 'smc_meeting', summary: d.title });
export const updateSmcMeeting = (s: string, id: string, p: Partial<SmcMeeting>, a: Actor) => updateIn(s, 'smc_meetings', id, p, a, { action: 'smc.meeting_updated', targetType: 'smc_meeting' });
export const deleteSmcMeeting = (s: string, id: string, a: Actor) => removeIn(s, 'smc_meetings', id, a, { action: 'smc.meeting_deleted', targetType: 'smc_meeting' });

export function useSmcBudget(schoolId?: string) {
  return useCollection<SmcBudgetItem>(schoolId ? tenantCol(schoolId, 'smc_budget') : null, [schoolId]);
}
export const createSmcBudgetItem = (s: string, d: Omit<SmcBudgetItem, 'id'>, a: Actor) => createIn(s, 'smc_budget', d, a, { action: 'smc.budget_added', targetType: 'smc_budget' });
export const updateSmcBudgetItem = (s: string, id: string, p: Partial<SmcBudgetItem>, a: Actor) => updateIn(s, 'smc_budget', id, p, a);
export const deleteSmcBudgetItem = (s: string, id: string, a: Actor) => removeIn(s, 'smc_budget', id, a, { action: 'smc.budget_deleted', targetType: 'smc_budget' });

/* ---------------- one-shot ---------------- */
export async function complianceQueryOnce<T>(schoolId: string, sub: string, ...c: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(tenantCol(schoolId, sub), ...c, fsLimit(2000)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}
export { where, orderBy };
