import { addDoc, serverTimestamp } from 'firebase/firestore';
import type { RoleId } from '@/types/roles';
import { platformAuditCol, tenantAuditCol } from './db';

/**
 * Platform-wide audit logging (day one). Writes immutable, append-only events to
 * a tenant-scoped `audit_log` (or the platform log for Super Admin actions).
 * Designed to expand: add new actions + richer `details` without schema changes.
 * Security rules make these create-only (no update/delete) — to be deployed.
 */
export type AuditAction =
  | 'user.created'
  | 'user.edited'
  | 'user.suspended'
  | 'user.password_reset'
  | 'role.changed'
  | 'student.created'
  | 'student.edited'
  | 'student.deleted'
  | 'student.imported'
  | 'fee.updated'
  | 'fee.payment_recorded'
  | 'fee.refund_recorded'
  | 'attendance.modified'
  | 'grade.published'
  | 'settings.changed'
  | 'feature_flag.changed'
  | 'announcement.sent'
  | 'consent.changed'
  | 'tc.issued'
  | 'login'
  | 'logout'
  | 'school.created'
  | 'school.edited'
  | 'subscription.changed'
  | 'impersonation.start'
  | 'impersonation.end'
  // open-ended for future expansion
  | (string & {});

export interface AuditActor {
  uid: string;
  name?: string;
  role?: RoleId;
}

export interface AuditEventInput {
  action: AuditAction;
  /** Omit for platform-level (Super Admin) events. */
  schoolId?: string;
  actor: AuditActor;
  targetType?: string;
  targetId?: string;
  summary?: string;
  details?: Record<string, unknown>;
}

/** Fire-and-forget audit write. Never throws (auditing must not break UX). */
export async function writeAuditEvent(e: AuditEventInput): Promise<void> {
  try {
    const col = e.schoolId ? tenantAuditCol(e.schoolId) : platformAuditCol();
    await addDoc(col, {
      action: e.action,
      actorUid: e.actor.uid,
      actorName: e.actor.name ?? null,
      actorRole: e.actor.role ?? null,
      schoolId: e.schoolId ?? null,
      targetType: e.targetType ?? null,
      targetId: e.targetId ?? null,
      summary: e.summary ?? null,
      details: e.details ?? null,
      ts: Date.now(),
      serverTs: serverTimestamp(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[NEXLI audit] failed to write', e.action, err);
  }
}
