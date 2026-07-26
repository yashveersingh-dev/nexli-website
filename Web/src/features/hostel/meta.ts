import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  GatePassType, GatePassStatus, DietPreference, MessMealType,
  HostelIncidentKind, HostelIncidentSeverity, HostelIncidentStatus,
} from '@/types/ops';

/* ----------------------------- Gate pass ---------------------------------- */
export const GATEPASS_TYPE_META: Record<GatePassType, { label: string; needsChief: boolean }> = {
  day_out: { label: 'Day out', needsChief: false },
  market: { label: 'Market / town', needsChief: false },
  sports: { label: 'Sports / event', needsChief: false },
  medical: { label: 'Medical', needsChief: false },
  overnight: { label: 'Overnight', needsChief: true },
  home: { label: 'Home visit', needsChief: true },
};
export const GATEPASS_TYPE_OPTIONS = (Object.keys(GATEPASS_TYPE_META) as GatePassType[])
  .map((v) => ({ value: v, label: GATEPASS_TYPE_META[v].label }));

/** Does this type escalate to the chief warden for the final sign-off? */
export const gatepassNeedsChief = (type: GatePassType) => GATEPASS_TYPE_META[type].needsChief;

export const GATEPASS_STATUS_META: Record<GatePassStatus, { label: string; variant: BadgeVariant }> = {
  requested: { label: 'Requested', variant: 'info' },
  warden_approved: { label: 'Warden approved', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  out: { label: 'Out', variant: 'warning' },
  returned: { label: 'Returned', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'danger' },
};

export const GATEPASS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All passes' },
  { value: 'requested', label: 'Awaiting warden' },
  { value: 'warden_approved', label: 'Awaiting chief' },
  { value: 'approved', label: 'Approved' },
  { value: 'out', label: 'Out' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
];

/* ------------------------------- Dietary ---------------------------------- */
export const DIET_PREFERENCE_META: Record<DietPreference, { label: string; variant: BadgeVariant }> = {
  veg: { label: 'Vegetarian', variant: 'success' },
  non_veg: { label: 'Non-veg', variant: 'muted' },
  jain: { label: 'Jain', variant: 'warning' },
  vegan: { label: 'Vegan', variant: 'success' },
  eggetarian: { label: 'Eggetarian', variant: 'info' },
};
export const DIET_PREFERENCE_OPTIONS = (Object.keys(DIET_PREFERENCE_META) as DietPreference[])
  .map((v) => ({ value: v, label: DIET_PREFERENCE_META[v].label }));

export const MESS_MEAL_META: Record<MessMealType, { label: string }> = {
  breakfast: { label: 'Breakfast' },
  lunch: { label: 'Lunch' },
  snacks: { label: 'Snacks' },
  dinner: { label: 'Dinner' },
};
export const MESS_MEALS: MessMealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

/* ------------------------------- Incident --------------------------------- */
export const INCIDENT_KIND_META: Record<HostelIncidentKind, { label: string; icon: IconName }> = {
  discipline: { label: 'Discipline', icon: 'alert-triangle' },
  health: { label: 'Sick bay / health', icon: 'heart-pulse' },
  damage: { label: 'Damage', icon: 'box' },
  bullying: { label: 'Bullying', icon: 'shield' },
  safety: { label: 'Safety', icon: 'shield-check' },
  other: { label: 'Other', icon: 'info' },
};
export const INCIDENT_KIND_OPTIONS = (Object.keys(INCIDENT_KIND_META) as HostelIncidentKind[])
  .map((v) => ({ value: v, label: INCIDENT_KIND_META[v].label }));

export const INCIDENT_SEVERITY_META: Record<HostelIncidentSeverity, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'muted' },
  medium: { label: 'Medium', variant: 'warning' },
  high: { label: 'High', variant: 'danger' },
};
export const INCIDENT_SEVERITY_OPTIONS = (Object.keys(INCIDENT_SEVERITY_META) as HostelIncidentSeverity[])
  .map((v) => ({ value: v, label: INCIDENT_SEVERITY_META[v].label }));

export const INCIDENT_STATUS_META: Record<HostelIncidentStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'danger' },
  escalated: { label: 'Escalated', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
};
