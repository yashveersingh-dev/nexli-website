import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  ComplianceCategory, ComplianceFrequency, ComplianceStatus, DocumentCategory,
  RteStage, ClaimStatus, PocsoSeverity, PocsoStatus,
  GrievanceCategory, GrievanceStatus, GrievancePriority, ConsentState, SmcRole, SmcMeetingStatus,
} from '@/types/compliance';

/* ---------------------- Compliance calendar + vault ----------------------- */
export const COMPLIANCE_CATEGORY_META: Record<ComplianceCategory, { label: string; icon: IconName }> = {
  statutory: { label: 'Statutory', icon: 'shield-check' },
  affiliation: { label: 'Affiliation', icon: 'award' },
  safety: { label: 'Safety', icon: 'shield' },
  financial: { label: 'Financial', icon: 'wallet' },
  tax: { label: 'Tax', icon: 'file-text' },
  labour: { label: 'Labour', icon: 'users' },
  academic: { label: 'Academic', icon: 'book' },
  infrastructure: { label: 'Infrastructure', icon: 'building' },
  data_privacy: { label: 'Data privacy', icon: 'lock' },
  other: { label: 'Other', icon: 'clipboard' },
};
export const COMPLIANCE_CATEGORY_OPTIONS = (Object.keys(COMPLIANCE_CATEGORY_META) as ComplianceCategory[]).map((v) => ({ value: v, label: COMPLIANCE_CATEGORY_META[v].label }));

export const COMPLIANCE_FREQUENCY_OPTIONS: { value: ComplianceFrequency; label: string }[] = [
  { value: 'one_time', label: 'One-time' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' }, { value: 'annual', label: 'Annual' },
];

export const COMPLIANCE_STATUS_META: Record<ComplianceStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  in_progress: { label: 'In progress', variant: 'info' },
  filed: { label: 'Filed', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'danger' },
  na: { label: 'N/A', variant: 'muted' },
};

export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, { label: string; icon: IconName }> = {
  license: { label: 'Licence', icon: 'file-text' },
  affiliation: { label: 'Affiliation', icon: 'award' },
  noc: { label: 'NOC', icon: 'check-circle' },
  certificate: { label: 'Certificate', icon: 'award' },
  registration: { label: 'Registration', icon: 'file-text' },
  insurance: { label: 'Insurance', icon: 'shield' },
  audit: { label: 'Audit', icon: 'bar-chart' },
  policy: { label: 'Policy', icon: 'book' },
  other: { label: 'Other', icon: 'paperclip' },
};
export const DOCUMENT_CATEGORY_OPTIONS = (Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategory[]).map((v) => ({ value: v, label: DOCUMENT_CATEGORY_META[v].label }));

/* ------------------------------- RTE -------------------------------------- */
export const RTE_STAGE_META: Record<RteStage, { label: string; variant: BadgeVariant }> = {
  applied: { label: 'Applied', variant: 'info' },
  lottery: { label: 'In lottery', variant: 'warning' },
  allotted: { label: 'Allotted', variant: 'info' },
  admitted: { label: 'Admitted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  withdrawn: { label: 'Withdrawn', variant: 'muted' },
};
export const RTE_STAGE_OPTIONS = (Object.keys(RTE_STAGE_META) as RteStage[]).map((v) => ({ value: v, label: RTE_STAGE_META[v].label }));
export const RTE_CATEGORY_OPTIONS: { value: 'ews' | 'dg'; label: string }[] = [
  { value: 'ews', label: 'EWS (Economically Weaker)' }, { value: 'dg', label: 'DG (Disadvantaged Group)' },
];
export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'muted' },
  submitted: { label: 'Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'info' },
  received: { label: 'Received', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

/* ------------------------------- POCSO ------------------------------------ */
export const POCSO_SEVERITY_META: Record<PocsoSeverity, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'muted' },
  moderate: { label: 'Moderate', variant: 'warning' },
  high: { label: 'High', variant: 'danger' },
  critical: { label: 'Critical', variant: 'danger' },
};
export const POCSO_STATUS_META: Record<PocsoStatus, { label: string; variant: BadgeVariant }> = {
  reported: { label: 'Reported', variant: 'warning' },
  under_inquiry: { label: 'Under inquiry', variant: 'info' },
  committee_review: { label: 'Committee review', variant: 'info' },
  referred: { label: 'Referred', variant: 'warning' },
  action_taken: { label: 'Action taken', variant: 'success' },
  closed: { label: 'Closed', variant: 'muted' },
};
export const POCSO_STATUS_OPTIONS = (Object.keys(POCSO_STATUS_META) as PocsoStatus[]).map((v) => ({ value: v, label: POCSO_STATUS_META[v].label }));
export const POCSO_SEVERITY_OPTIONS = (Object.keys(POCSO_SEVERITY_META) as PocsoSeverity[]).map((v) => ({ value: v, label: POCSO_SEVERITY_META[v].label }));

/* ----------------------------- Grievance ---------------------------------- */
export const GRIEVANCE_CATEGORY_OPTIONS: { value: GrievanceCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' }, { value: 'administrative', label: 'Administrative' },
  { value: 'financial', label: 'Financial' }, { value: 'staff_conduct', label: 'Staff conduct' },
  { value: 'facilities', label: 'Facilities' }, { value: 'safety', label: 'Safety' },
  { value: 'data_privacy', label: 'Data privacy' }, { value: 'other', label: 'Other' },
];
export const GRIEVANCE_STATUS_META: Record<GrievanceStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'danger' },
  acknowledged: { label: 'Acknowledged', variant: 'warning' },
  under_review: { label: 'Under review', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
  escalated: { label: 'Escalated', variant: 'danger' },
  closed: { label: 'Closed', variant: 'muted' },
};
export const GRIEVANCE_STATUS_OPTIONS = (Object.keys(GRIEVANCE_STATUS_META) as GrievanceStatus[]).map((v) => ({ value: v, label: GRIEVANCE_STATUS_META[v].label }));
export const GRIEVANCE_PRIORITY_META: Record<GrievancePriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'muted' }, medium: { label: 'Medium', variant: 'info' }, high: { label: 'High', variant: 'danger' },
};

/* ------------------------------- Consent ---------------------------------- */
export const CONSENT_STATE_META: Record<ConsentState, { label: string; variant: BadgeVariant }> = {
  granted: { label: 'Granted', variant: 'success' },
  denied: { label: 'Denied', variant: 'danger' },
  withdrawn: { label: 'Withdrawn', variant: 'warning' },
  pending: { label: 'Pending', variant: 'muted' },
};

/* --------------------------------- SMC ------------------------------------ */
export const SMC_ROLE_OPTIONS: { value: SmcRole; label: string }[] = [
  { value: 'parent', label: 'Parent member' }, { value: 'teacher', label: 'Teacher member' },
  { value: 'headmaster', label: 'Head teacher' }, { value: 'community', label: 'Community member' },
  { value: 'local_authority', label: 'Local authority' }, { value: 'sponsor', label: 'Sponsor' },
];
export const SMC_MEETING_STATUS_META: Record<SmcMeetingStatus, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  held: { label: 'Held', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'muted' },
};

/** Days until a due date (negative = overdue). */
export function daysUntil(ts: number): number {
  return Math.ceil((ts - Date.now()) / 86400000);
}
