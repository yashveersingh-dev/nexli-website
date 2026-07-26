import type { TenantRecord } from '@/types/models';

/* ============================================================================
 * DPDP operational registers owned by the consent module:
 *  - erasure_requests      (DPDP right to erasure)
 *  - breach_notifications  (personal-data-breach handling, 72h)
 * Both are self-contained tabs within Privacy & Consent.
 * ==========================================================================*/

/* ----------------------------- Erasure ----------------------------------- */

export type ErasureStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface ErasureRequest extends TenantRecord {
  /** Student/data-principal the request concerns (id only — no name stored here is required). */
  studentId?: string;
  /** Generic subject id when the principal is not a student (e.g. staff). */
  subjectId?: string;
  /** Optional display label for the subject (kept minimal). */
  subjectLabel?: string;
  subjectType?: 'student' | 'parent' | 'staff' | 'other';
  requestedBy?: string;
  requestedByName?: string;
  requestedAt: number;
  status: ErasureStatus;
  reason?: string;
  /** Reviewer decision metadata. */
  decidedAt?: number;
  decidedByName?: string;
  decisionNote?: string;
  completedAt?: number;
}

export const ERASURE_STATUS_META: Record<
  ErasureStatus,
  { label: string; variant: 'info' | 'success' | 'danger' | 'warning' | 'muted' }
> = {
  requested: { label: 'Requested', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  rejected: { label: 'Rejected', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
};

/** Allowed forward transitions for the erasure workflow. */
export const ERASURE_NEXT: Record<ErasureStatus, ErasureStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['completed', 'rejected'],
  rejected: [],
  completed: [],
};

export const ERASURE_SUBJECT_OPTIONS: { value: NonNullable<ErasureRequest['subjectType']>; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent / guardian' },
  { value: 'staff', label: 'Staff' },
  { value: 'other', label: 'Other' },
];

/* ------------------------------ Breach ------------------------------------ */

export type BreachStatus = 'detected' | 'investigating' | 'notified' | 'contained' | 'closed';

export interface BreachNotification extends TenantRecord {
  detectedAt: number;
  description: string;
  affectedCount?: number;
  /** Data categories involved (free-text chips). */
  categories?: string[];
  status: BreachStatus;
  /** detectedAt + 72h — DPDP breach-notification target. */
  deadline?: number;
  notifiedBoardAt?: number;
  notifiedPrincipalsAt?: number;
  notes?: string;
}

export const BREACH_STATUS_META: Record<
  BreachStatus,
  { label: string; variant: 'info' | 'success' | 'danger' | 'warning' | 'muted' }
> = {
  detected: { label: 'Detected', variant: 'danger' },
  investigating: { label: 'Investigating', variant: 'warning' },
  notified: { label: 'Notified', variant: 'info' },
  contained: { label: 'Contained', variant: 'info' },
  closed: { label: 'Closed', variant: 'success' },
};

export const BREACH_NEXT: Record<BreachStatus, BreachStatus[]> = {
  detected: ['investigating', 'notified', 'closed'],
  investigating: ['notified', 'contained', 'closed'],
  notified: ['contained', 'closed'],
  contained: ['closed'],
  closed: [],
};

export const BREACH_REPORTING_WINDOW_MS = 72 * 60 * 60 * 1000; // 72h
