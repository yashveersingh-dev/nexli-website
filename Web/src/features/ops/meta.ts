import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  VehicleStatus, VehicleType, BoardStatus, SosType, SosStatus, RouteStatus,
  RollcallStatus, ExeatType, ExeatStatus, HostelType,
  VisitOutcome, VisitorStatus, VisitorPurpose, IdType,
  MealType, AssetCategory, AssetStatus, FacilityType, MaintenancePriority, MaintenanceStatus,
} from '@/types/ops';

/* ------------------------------ Transport --------------------------------- */
export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  maintenance: { label: 'In maintenance', variant: 'warning' },
  inactive: { label: 'Inactive', variant: 'muted' },
};
export const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'bus', label: 'Bus' }, { value: 'mini_bus', label: 'Mini bus' }, { value: 'van', label: 'Van' },
  { value: 'car', label: 'Car' }, { value: 'other', label: 'Other' },
];
export const ROUTE_STATUS_META: Record<RouteStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'muted' },
};
export const BOARD_STATUS_META: Record<BoardStatus, { label: string; short: string; variant: BadgeVariant; color: string }> = {
  boarded: { label: 'Boarded', short: 'B', variant: 'success', color: 'var(--success)' },
  absent: { label: 'Absent', short: 'A', variant: 'danger', color: 'var(--danger)' },
  alighted: { label: 'Alighted', short: 'D', variant: 'info', color: 'var(--info)' },
};
export const SOS_TYPE_META: Record<SosType, { label: string; icon: IconName }> = {
  breakdown: { label: 'Breakdown', icon: 'bus' },
  accident: { label: 'Accident', icon: 'alert-triangle' },
  medical: { label: 'Medical', icon: 'heart-pulse' },
  security: { label: 'Security', icon: 'shield' },
  other: { label: 'Other', icon: 'alert-triangle' },
};
export const SOS_STATUS_META: Record<SosStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'danger' },
  acknowledged: { label: 'Acknowledged', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
};

/* ------------------------------- Hostel ----------------------------------- */
export const HOSTEL_TYPE_OPTIONS: { value: HostelType; label: string }[] = [
  { value: 'boys', label: 'Boys' }, { value: 'girls', label: 'Girls' }, { value: 'mixed', label: 'Mixed' },
];
export const ROLLCALL_STATUS_META: Record<RollcallStatus, { label: string; short: string; variant: BadgeVariant; color: string }> = {
  present: { label: 'Present', short: 'P', variant: 'success', color: 'var(--success)' },
  absent: { label: 'Absent', short: 'A', variant: 'danger', color: 'var(--danger)' },
  leave: { label: 'On leave', short: 'L', variant: 'info', color: 'var(--info)' },
  infirmary: { label: 'Infirmary', short: 'I', variant: 'warning', color: 'var(--warning)' },
};
export const EXEAT_TYPE_OPTIONS: { value: ExeatType; label: string }[] = [
  { value: 'day_out', label: 'Day out' }, { value: 'overnight', label: 'Overnight' },
  { value: 'home', label: 'Home visit' }, { value: 'medical', label: 'Medical' },
];
export const EXEAT_STATUS_META: Record<ExeatStatus, { label: string; variant: BadgeVariant }> = {
  requested: { label: 'Requested', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  out: { label: 'Out', variant: 'warning' },
  returned: { label: 'Returned', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'danger' },
};

/* ------------------------------- Medical ---------------------------------- */
export const VISIT_OUTCOME_OPTIONS: { value: VisitOutcome; label: string }[] = [
  { value: 'treated', label: 'Treated & resumed' }, { value: 'observation', label: 'Under observation' },
  { value: 'sent_home', label: 'Sent home' }, { value: 'referred', label: 'Referred' }, { value: 'hospital', label: 'Hospitalised' },
];
export const VISIT_OUTCOME_META: Record<VisitOutcome, { label: string; variant: BadgeVariant }> = {
  treated: { label: 'Treated', variant: 'success' },
  observation: { label: 'Observation', variant: 'warning' },
  sent_home: { label: 'Sent home', variant: 'info' },
  referred: { label: 'Referred', variant: 'warning' },
  hospital: { label: 'Hospitalised', variant: 'danger' },
};
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/* ---------------------------- Visitor & gate ------------------------------ */
export const VISITOR_STATUS_META: Record<VisitorStatus, { label: string; variant: BadgeVariant }> = {
  expected: { label: 'Expected', variant: 'info' },
  in: { label: 'On premises', variant: 'success' },
  out: { label: 'Checked out', variant: 'muted' },
  denied: { label: 'Denied', variant: 'danger' },
};
export const VISITOR_PURPOSE_OPTIONS: { value: VisitorPurpose; label: string }[] = [
  { value: 'parent_meeting', label: 'Parent / guardian meeting' }, { value: 'admission', label: 'Admission enquiry' },
  { value: 'vendor', label: 'Vendor / supplier' }, { value: 'interview', label: 'Interview' },
  { value: 'official', label: 'Official / inspection' }, { value: 'maintenance', label: 'Maintenance' },
  { value: 'delivery', label: 'Delivery' }, { value: 'other', label: 'Other' },
];
export const ID_TYPE_OPTIONS: { value: IdType; label: string }[] = [
  { value: 'aadhaar', label: 'Aadhaar' }, { value: 'pan', label: 'PAN' },
  { value: 'driving_license', label: 'Driving licence' }, { value: 'voter_id', label: 'Voter ID' }, { value: 'other', label: 'Other' },
];

/* ------------------------------- Canteen ---------------------------------- */
export const MEAL_TYPE_META: Record<MealType, { label: string; icon: IconName }> = {
  breakfast: { label: 'Breakfast', icon: 'utensils' },
  morning_snack: { label: 'Morning snack', icon: 'utensils' },
  lunch: { label: 'Lunch', icon: 'utensils' },
  evening_snack: { label: 'Evening snack', icon: 'utensils' },
  dinner: { label: 'Dinner', icon: 'utensils' },
};
export const MEAL_TYPE_OPTIONS = (Object.keys(MEAL_TYPE_META) as MealType[]).map((v) => ({ value: v, label: MEAL_TYPE_META[v].label }));

/* ---------------------------- Asset & facility ---------------------------- */
export const ASSET_CATEGORY_META: Record<AssetCategory, { label: string; icon: IconName }> = {
  furniture: { label: 'Furniture', icon: 'box' },
  it: { label: 'IT equipment', icon: 'server' },
  lab: { label: 'Lab', icon: 'flask' },
  sports: { label: 'Sports', icon: 'award' },
  av: { label: 'AV / media', icon: 'image' },
  kitchen: { label: 'Kitchen', icon: 'utensils' },
  vehicle: { label: 'Vehicle', icon: 'bus' },
  electrical: { label: 'Electrical', icon: 'wifi' },
  other: { label: 'Other', icon: 'box' },
};
export const ASSET_CATEGORY_OPTIONS = (Object.keys(ASSET_CATEGORY_META) as AssetCategory[]).map((v) => ({ value: v, label: ASSET_CATEGORY_META[v].label }));
export const ASSET_STATUS_META: Record<AssetStatus, { label: string; variant: BadgeVariant }> = {
  in_use: { label: 'In use', variant: 'success' },
  in_store: { label: 'In store', variant: 'info' },
  maintenance: { label: 'Maintenance', variant: 'warning' },
  retired: { label: 'Retired', variant: 'muted' },
  lost: { label: 'Lost', variant: 'danger' },
  damaged: { label: 'Damaged', variant: 'danger' },
};
export const FACILITY_TYPE_OPTIONS: { value: FacilityType; label: string }[] = [
  { value: 'classroom', label: 'Classroom' }, { value: 'lab', label: 'Laboratory' }, { value: 'library', label: 'Library' },
  { value: 'sports', label: 'Sports' }, { value: 'auditorium', label: 'Auditorium' }, { value: 'office', label: 'Office' },
  { value: 'washroom', label: 'Washroom' }, { value: 'ground', label: 'Ground' }, { value: 'other', label: 'Other' },
];
export const MAINTENANCE_PRIORITY_META: Record<MaintenancePriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'muted' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};
export const MAINTENANCE_STATUS_META: Record<MaintenanceStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'danger' },
  assigned: { label: 'Assigned', variant: 'info' },
  in_progress: { label: 'In progress', variant: 'warning' },
  done: { label: 'Resolved', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'muted' },
};
