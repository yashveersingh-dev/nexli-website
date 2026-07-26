import { z } from 'zod';
import dayjs from 'dayjs';
import type { PocsoCase, Grievance } from '@/types/compliance';

/* ============================================================================
 * Safeguarding (POCSO + Grievance) form schemas.
 * String-based (input === output) to satisfy the kit `Form<T>` (`ZodType<T>`):
 * no `z.coerce` / `.default()`. Defaults come from `defaultValues`.
 * Mirrors `complianceSchema.ts`.
 * ==========================================================================*/

/* -------------------------------- POCSO ----------------------------------- */

export const pocsoCaseSchema = z.object({
  natureOfConcern: z.string().trim().min(3, 'Describe the nature of concern'),
  severity: z.enum(['low', 'moderate', 'high', 'critical']),
  summary: z.string().trim().min(10, 'Add a brief factual summary'),
  involvesStudentId: z.string().trim().optional(),
  reportedByRole: z.string().trim().optional(),
});

export type PocsoCaseValues = z.infer<typeof pocsoCaseSchema>;

export const emptyPocsoCase = (): PocsoCaseValues => ({
  natureOfConcern: '', severity: 'moderate', summary: '', involvesStudentId: '', reportedByRole: '',
});

/** Map form values → the new-case payload (caseNo/status/confidential set by caller). */
export function formToPocsoCase(v: PocsoCaseValues): Pick<PocsoCase, 'natureOfConcern' | 'severity' | 'summary' | 'involvesStudentId' | 'reportedByRole'> {
  return {
    natureOfConcern: v.natureOfConcern.trim(),
    severity: v.severity,
    summary: v.summary.trim(),
    // Store the id only — never a name.
    involvesStudentId: v.involvesStudentId?.trim() || undefined,
    reportedByRole: v.reportedByRole?.trim() || undefined,
  };
}

/* ------------------------------ Grievance --------------------------------- */

export const grievanceSchema = z
  .object({
    category: z.enum(['academic', 'administrative', 'financial', 'staff_conduct', 'facilities', 'safety', 'data_privacy', 'other']),
    subject: z.string().trim().min(3, 'Add a subject'),
    description: z.string().trim().min(10, 'Describe the grievance'),
    priority: z.enum(['low', 'medium', 'high']),
    anonymous: z.boolean(),
    raisedByName: z.string().trim().optional(),
    contact: z.string().trim().optional(),
    against: z.string().trim().optional(),
  })
  .refine((v) => v.anonymous || (v.raisedByName?.trim().length ?? 0) > 0, {
    message: 'Add a name or mark the grievance anonymous',
    path: ['raisedByName'],
  });

export type GrievanceValues = z.infer<typeof grievanceSchema>;

export const emptyGrievance = (): GrievanceValues => ({
  category: 'academic', subject: '', description: '', priority: 'medium',
  anonymous: false, raisedByName: '', contact: '', against: '',
});

/** Map form values → the new-grievance payload (refNo/status/timestamps set by caller). */
export function formToGrievance(v: GrievanceValues): Pick<Grievance, 'category' | 'subject' | 'description' | 'priority' | 'anonymous' | 'raisedByName' | 'contact' | 'against'> {
  const anon = v.anonymous;
  return {
    category: v.category,
    subject: v.subject.trim(),
    description: v.description.trim(),
    priority: v.priority,
    anonymous: anon || undefined,
    raisedByName: anon ? undefined : v.raisedByName?.trim() || undefined,
    contact: anon ? undefined : v.contact?.trim() || undefined,
    against: v.against?.trim() || undefined,
  };
}

/* ----------------------------- Number helpers ----------------------------- */

/** Human-readable case/ref number, e.g. PC-2026-0007. Free-tier: not strictly unique. */
export function safeguardingNumber(prefix: 'PC' | 'GR', count: number, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

const DAY = 86400000;

/** Default grievance SLA: 7 days from now. */
export function grievanceDueAt(from = Date.now()): number {
  return from + 7 * DAY;
}

/** A grievance is overdue when past its due date and not yet resolved/closed. */
export function isGrievanceOverdue(g: Grievance): boolean {
  if (!g.dueAt) return false;
  if (g.status === 'resolved' || g.status === 'closed') return false;
  return g.dueAt < Date.now();
}

/* ---------------------- POCSO s.19 mandatory reporting -------------------- */

/**
 * POCSO Act s.19 requires a person who apprehends an offence to report it without
 * delay; we operationalise this as a 24-hour clock from when the concern was
 * logged. A case is "reporting overdue" once that window passes and the matter has
 * not yet been recorded as reported to the authorities.
 */
export const POCSO_REPORTING_WINDOW_MS = DAY; // 24h

/** Derive the reporting deadline for a case (falls back to reportedAt + 24h for legacy rows). */
export function pocsoReportingDeadline(c: Pick<PocsoCase, 'reportingDeadline' | 'reportedAt'>): number {
  return c.reportingDeadline ?? c.reportedAt + POCSO_REPORTING_WINDOW_MS;
}

/** True once the case has been recorded as reported to the authorities. */
export function isPocsoReported(c: Pick<PocsoCase, 'reportedToAuthoritiesAt'>): boolean {
  return typeof c.reportedToAuthoritiesAt === 'number';
}

/** True when the 24-hour reporting window has elapsed and the case is not yet reported. */
export function isPocsoReportingOverdue(
  c: Pick<PocsoCase, 'reportingDeadline' | 'reportedAt' | 'reportedToAuthoritiesAt'>,
  now: number = Date.now(),
): boolean {
  if (isPocsoReported(c)) return false;
  return pocsoReportingDeadline(c) < now;
}

/**
 * Human countdown to (or overdue-by from) the reporting deadline, e.g.
 * "18h 42m left" / "Overdue by 3h 5m". Returns `null` once reported.
 */
export function pocsoReportingCountdown(
  c: Pick<PocsoCase, 'reportingDeadline' | 'reportedAt' | 'reportedToAuthoritiesAt'>,
  now: number = Date.now(),
): { text: string; overdue: boolean } | null {
  if (isPocsoReported(c)) return null;
  const deadline = pocsoReportingDeadline(c);
  const overdue = deadline < now;
  const diffMs = Math.abs(deadline - now);
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { text: overdue ? `Overdue by ${parts}` : `${parts} left`, overdue };
}

/** Absolute deadline label, e.g. "19 Jun 2026, 4:30 PM". */
export function pocsoDeadlineLabel(c: Pick<PocsoCase, 'reportingDeadline' | 'reportedAt'>): string {
  return dayjs(pocsoReportingDeadline(c)).format('D MMM YYYY, h:mm A');
}
