import type { PocsoStatus, GrievanceStatus, GrievancePriority } from '@/types/compliance';

/* ============================================================================
 * Safeguarding meta. Re-uses the compliance module's POCSO/grievance metadata
 * (badge variants + option lists) and adds workflow-only helpers.
 * ==========================================================================*/

export {
  POCSO_SEVERITY_META,
  POCSO_SEVERITY_OPTIONS,
  POCSO_STATUS_META,
  POCSO_STATUS_OPTIONS,
  GRIEVANCE_CATEGORY_OPTIONS,
  GRIEVANCE_STATUS_META,
  GRIEVANCE_STATUS_OPTIONS,
  GRIEVANCE_PRIORITY_META,
} from '@/features/compliance/meta';

/* ------------------------- POCSO committee workflow ----------------------- */

/** Allowed forward transitions for the committee workflow (linear, with branches). */
export const POCSO_NEXT: Record<PocsoStatus, PocsoStatus[]> = {
  reported: ['under_inquiry', 'closed'],
  under_inquiry: ['committee_review', 'closed'],
  committee_review: ['referred', 'action_taken', 'closed'],
  referred: ['action_taken', 'closed'],
  action_taken: ['closed'],
  closed: [],
};

/** Referral destinations (CWC / police / counselor / other). */
export const POCSO_REFERRAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'CWC', label: 'Child Welfare Committee (CWC)' },
  { value: 'Police / SJPU', label: 'Police / SJPU' },
  { value: 'Counselor', label: 'School counselor' },
  { value: 'District Child Protection Unit', label: 'District Child Protection Unit' },
  { value: 'Other', label: 'Other' },
];

/** Roles that may report a concern (free text fallback retained). */
export const POCSO_REPORTER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not specified' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Non-teaching staff' },
  { value: 'parent', label: 'Parent / guardian' },
  { value: 'student', label: 'Student' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'principal', label: 'Principal' },
  { value: 'other', label: 'Other' },
];

/* --------------------------- Grievance workflow --------------------------- */

export const GRIEVANCE_PRIORITY_OPTIONS: { value: GrievancePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

/** Allowed forward transitions for the grievance workflow. */
export const GRIEVANCE_NEXT: Record<GrievanceStatus, GrievanceStatus[]> = {
  open: ['acknowledged', 'closed'],
  acknowledged: ['under_review', 'closed'],
  under_review: ['resolved', 'escalated', 'closed'],
  escalated: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};
