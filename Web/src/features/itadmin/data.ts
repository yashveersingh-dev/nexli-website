import {
  addDoc, deleteDoc, serverTimestamp, setDoc, updateDoc,
  orderBy, query, limit as fsLimit,
} from 'firebase/firestore';
import { tenantCol, tenantDoc, tenantAuditCol, useCollection } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type { ItAsset, ItTicket, ItBackup, ItIntegration } from './types';

/**
 * IT Administration data layer. Tenant-scoped collections under
 * `schools/{schoolId}/…`. Same mutation shape as the shared ops layer
 * (`createIn`/`updateIn`/`removeIn`) so audit + stamping stay consistent.
 *
 * Least-privilege: this layer only touches IT system collections. It never reads
 * students, gradebook, fees or payroll — IT administers the system, not the data.
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
async function setInDoc<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await setDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
async function updateIn<T extends object>(schoolId: string, sub: string, id: string, patch: Partial<T>, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(patch), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

/* ============================ IT assets (devices) ============================ */
export function useItAssets(schoolId?: string) {
  return useCollection<ItAsset>(schoolId ? tenantCol(schoolId, 'it_assets') : null, [schoolId]);
}
export const createItAsset = (s: string, d: Omit<ItAsset, 'id'>, a: Actor) =>
  createIn(s, 'it_assets', d, a, { action: 'it_asset.created', targetType: 'it_asset', summary: d.name });
export const updateItAsset = (s: string, id: string, p: Partial<ItAsset>, a: Actor) =>
  updateIn(s, 'it_assets', id, p, a, { action: 'it_asset.updated', targetType: 'it_asset' });
export const deleteItAsset = (s: string, id: string, a: Actor) =>
  removeIn(s, 'it_assets', id, a, { action: 'it_asset.deleted', targetType: 'it_asset' });

/* ============================ Support tickets ============================ */
export function useItTickets(schoolId?: string) {
  return useCollection<ItTicket>(schoolId ? tenantCol(schoolId, 'it_tickets') : null, [schoolId]);
}
export const createItTicket = (s: string, d: Omit<ItTicket, 'id'>, a: Actor) =>
  createIn(s, 'it_tickets', d, a, { action: 'it_ticket.raised', targetType: 'it_ticket', summary: d.title });
export const updateItTicket = (s: string, id: string, p: Partial<ItTicket>, a: Actor) =>
  updateIn(s, 'it_tickets', id, p, a, { action: 'it_ticket.updated', targetType: 'it_ticket' });
export const deleteItTicket = (s: string, id: string, a: Actor) =>
  removeIn(s, 'it_tickets', id, a, { action: 'it_ticket.deleted', targetType: 'it_ticket' });

/* ============================ Backup log ============================ */
export function useItBackups(schoolId?: string) {
  return useCollection<ItBackup>(schoolId ? tenantCol(schoolId, 'it_backups') : null, [schoolId]);
}
export const recordItBackup = (s: string, d: Omit<ItBackup, 'id'>, a: Actor) =>
  createIn(s, 'it_backups', d, a, { action: 'it_backup.recorded', targetType: 'it_backup', summary: d.scope });
export const deleteItBackup = (s: string, id: string, a: Actor) =>
  removeIn(s, 'it_backups', id, a, { action: 'it_backup.deleted', targetType: 'it_backup' });

/* ============================ Integration registry ============================ */
export function useItIntegrations(schoolId?: string) {
  return useCollection<ItIntegration>(schoolId ? tenantCol(schoolId, 'it_integrations') : null, [schoolId]);
}
export const saveItIntegration = (s: string, id: string, d: Omit<ItIntegration, 'id'>, a: Actor) =>
  setInDoc(s, 'it_integrations', id, d, a, { action: 'it_integration.saved', targetType: 'it_integration', summary: d.name });
export const updateItIntegration = (s: string, id: string, p: Partial<ItIntegration>, a: Actor) =>
  updateIn(s, 'it_integrations', id, p, a, { action: 'it_integration.updated', targetType: 'it_integration' });
export const deleteItIntegration = (s: string, id: string, a: Actor) =>
  removeIn(s, 'it_integrations', id, a, { action: 'it_integration.deleted', targetType: 'it_integration' });

/* ============================ Audit (read-only) ============================ */
export interface TenantAuditEntry {
  id: string;
  action: string;
  actorUid?: string;
  actorName?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  ts: number;
}

/** Recent tenant audit events, newest first. Backed by `audit.read` permission. */
export function useTenantAudit(schoolId?: string, max = 200) {
  return useCollection<TenantAuditEntry>(
    schoolId ? query(tenantAuditCol(schoolId), orderBy('ts', 'desc'), fsLimit(max)) : null,
    [schoolId, max],
  );
}

/* ---------------------------------- helpers -------------------------------- */

/** Sequential, human-readable ticket number e.g. IT-2026-0042. */
export function nextTicketNo(existing: { ticketNo?: string }[], now = new Date()): string {
  const year = now.getFullYear();
  const prefix = `IT-${year}-`;
  let max = 0;
  for (const t of existing) {
    if (t.ticketNo?.startsWith(prefix)) {
      const n = Number(t.ticketNo.slice(prefix.length));
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}
