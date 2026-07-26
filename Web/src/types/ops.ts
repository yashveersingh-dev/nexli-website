import type { TenantRecord } from './models';

/* ============================================================================
 * Operations & Safety (P6) — transport, hostel, medical, visitor & gate,
 * canteen, asset & facility. Tenant-scoped. Medical/immunization live in the
 * rules-restricted `medical` / `immunization` collections.
 * ==========================================================================*/

/* ------------------------------ Transport --------------------------------- */

export type VehicleStatus = 'active' | 'maintenance' | 'inactive';
export type VehicleType = 'bus' | 'van' | 'mini_bus' | 'car' | 'other';

export interface Vehicle extends TenantRecord {
  regNo: string;
  type: VehicleType;
  model?: string;
  capacity: number;
  driverName?: string;
  driverPhone?: string;
  conductorName?: string;
  conductorPhone?: string;
  status: VehicleStatus;
  gpsDeviceId?: string;
  fitnessExpiry?: number;
  insuranceExpiry?: number;
  pucExpiry?: number;
  permitExpiry?: number;
}

export interface RouteStop {
  name: string;
  time?: string; // "07:15"
  lat?: number;
  lng?: number;
  order: number;
}

export type RouteStatus = 'active' | 'inactive';

export interface TransportRoute extends TenantRecord {
  name: string;
  code?: string;
  shift?: 'morning' | 'afternoon' | 'both';
  vehicleId?: string;
  vehicleRegNo?: string;
  driverName?: string;
  stops: RouteStop[];
  monthlyFee?: number;
  status: RouteStatus;
}

export interface TransportMember extends TenantRecord {
  studentId: string;
  studentName: string;
  gradeName?: string;
  routeId: string;
  routeName?: string;
  stopName?: string;
  pickup?: boolean;
  drop?: boolean;
}

export type BusTrip = 'morning' | 'evening';
export type BoardStatus = 'boarded' | 'absent' | 'alighted';

export interface BusAttendance extends TenantRecord {
  routeId: string;
  routeName?: string;
  date: string; // yyyy-mm-dd
  trip: BusTrip;
  entries: Record<string, BoardStatus>; // studentId → status
  boardedCount?: number;
  total?: number;
  markedByUid?: string;
  markedByName?: string;
  markedAt?: number;
}

export type SosType = 'breakdown' | 'accident' | 'medical' | 'security' | 'other';
export type SosStatus = 'active' | 'acknowledged' | 'resolved';

export interface SosAlert extends TenantRecord {
  vehicleId?: string;
  vehicleRegNo?: string;
  routeId?: string;
  routeName?: string;
  type: SosType;
  message?: string;
  lat?: number;
  lng?: number;
  raisedByUid?: string;
  raisedByName?: string;
  raisedAt: number;
  status: SosStatus;
  acknowledgedByName?: string;
  resolvedAt?: number;
  resolutionNote?: string;
}

/** Live last-known position; doc id = vehicleId. */
export interface VehiclePosition extends TenantRecord {
  vehicleId: string;
  routeId?: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updatedAt: number;
}

/* ----------------------- Route disruption (SOP §7d) ----------------------- */
/* Driver/conductor-absent & route-disruption handling. Owned by the Transport
 * Manager (`useOwnership('transport').canOperate`), reviewed by VP-Admin. Spark
 * plan: parent notification is recorded in-app only (see `notifyTransport`). */

export type DisruptionCause = 'driver_absent' | 'vehicle_breakdown' | 'other';
/** `pending` until handled; then how it was resolved for the day. */
export type DisruptionResolution = 'pending' | 'backup' | 'merged' | 'cancelled';
export type DisruptionStatus = 'open' | 'resolved';

export interface TransportDisruption extends TenantRecord {
  date: string; // yyyy-mm-dd
  routeId: string;
  routeName?: string;
  cause: DisruptionCause;
  resolution: DisruptionResolution;
  /** Set when resolution = 'backup'. */
  backupDriverName?: string;
  /** Set when resolution = 'merged'. */
  mergedIntoRouteId?: string;
  mergedIntoRouteName?: string;
  /** Free-text note (capacity caveat for merges, cancellation reason, etc.). */
  note?: string;
  /** Checklist flag: affected students held in a supervised area until pickup. */
  studentsSupervised?: boolean;
  /** When parents were last notified in-app, and how many records were written. */
  parentsNotifiedAt?: number;
  parentsNotifiedCount?: number;
  status: DisruptionStatus;
  handledByUid?: string;
  handledByName?: string;
  reportedByName?: string;
  reportedAt?: number;
  resolvedAt?: number;
}

/** In-app parent notification record (the Spark-plan notification seam target). */
export type TransportNotificationChannel = 'in_app';
export type TransportNotificationStatus = 'notified';

export interface TransportNotification extends TenantRecord {
  disruptionId: string;
  routeId: string;
  routeName?: string;
  date: string; // yyyy-mm-dd
  channel: TransportNotificationChannel;
  /** Human-readable resolution message shown to / sent to parents. */
  message: string;
  audience: string; // e.g. "Parents on Route 3"
  recipientCount?: number;
  status: TransportNotificationStatus;
  sentByName?: string;
  sentAt: number;
}

/* ------------------------------- Hostel ----------------------------------- */

export type HostelType = 'boys' | 'girls' | 'mixed';

export interface HostelBlock extends TenantRecord {
  name: string;
  type: HostelType;
  wardenName?: string;
  wardenPhone?: string;
  floors?: number;
  capacity?: number;
}

export interface HostelRoom extends TenantRecord {
  blockId: string;
  blockName?: string;
  number: string;
  floor?: number;
  capacity: number;
  occupied?: number;
}

export interface HostelAllocation extends TenantRecord {
  studentId: string;
  studentName: string;
  gradeName?: string;
  blockId: string;
  blockName?: string;
  roomId: string;
  roomNumber?: string;
  bedNo?: string;
  fromDate?: number;
  active?: boolean;
}

export type RollcallSession = 'morning' | 'evening' | 'night';
export type RollcallStatus = 'present' | 'absent' | 'leave' | 'infirmary';

export interface HostelRollcall extends TenantRecord {
  blockId: string;
  blockName?: string;
  date: string;
  session: RollcallSession;
  entries: Record<string, RollcallStatus>;
  presentCount?: number;
  total?: number;
  takenByName?: string;
  takenAt?: number;
}

export type ExeatType = 'day_out' | 'overnight' | 'home' | 'medical';
export type ExeatStatus = 'requested' | 'approved' | 'rejected' | 'out' | 'returned' | 'overdue';

export interface ExeatPass extends TenantRecord {
  studentId: string;
  studentName: string;
  blockName?: string;
  type: ExeatType;
  reason?: string;
  destination?: string;
  guardianName?: string;
  guardianPhone?: string;
  outAt?: number;
  expectedReturn?: number;
  returnedAt?: number;
  status: ExeatStatus;
  approvedByName?: string;
}

/* ----------------- Gate pass / leave (boarding outing) -------------------- */
/* Richer two-level outing workflow layered ON the existing allocation/exeat
 * features. Lives in its own `hostel_gatepass` collection (block-scoped). The
 * warden gives the 1st-level sign-off; overnight/extended passes also need the
 * chief warden's final approval. Gate staff mark check-out / check-in. */

export type GatePassType = 'day_out' | 'overnight' | 'home' | 'medical' | 'market' | 'sports';
/** requested → warden_approved → approved | rejected → out → returned.
 *  `overdue` is derived client-side (never persisted) for display only. */
export type GatePassStatus =
  | 'requested' | 'warden_approved' | 'approved' | 'rejected' | 'out' | 'returned' | 'overdue';

export interface GatePass extends TenantRecord {
  studentId: string;
  studentName: string;
  gradeName?: string;
  blockId?: string;
  blockName?: string;
  type: GatePassType;
  reason?: string;
  destination?: string;
  guardianName?: string;
  guardianPhone?: string;
  /** True when the type is overnight/home or spans more than one calendar day —
   *  these escalate to the chief warden for the final sign-off. */
  needsChiefApproval?: boolean;
  expectedReturn?: number;
  status: GatePassStatus;
  requestedByName?: string;
  /** 1st-level (block warden) sign-off. */
  wardenApprovedByName?: string;
  wardenApprovedAt?: number;
  /** Final (chief warden) sign-off — only for escalated passes. */
  chiefApprovedByName?: string;
  chiefApprovedAt?: number;
  rejectedByName?: string;
  rejectionReason?: string;
  /** Gate-side check-out / check-in marks. */
  checkedOutByName?: string;
  outAt?: number;
  checkedInByName?: string;
  returnedAt?: number;
  /** How many times a parent was notified in-app (notify seam). */
  notifiedCount?: number;
  lastNotifiedAt?: number;
}

/* ------------------------- Hostel notification log ------------------------ */
/* In-app "Notify parent" log. The actual send is a future seam (`notifyHostel`)
 * — on Spark there is no SMS/Cloud Function, so we record the intent + payload
 * so it can be dispatched later. */

export type HostelNotifyChannel = 'in_app' | 'sms' | 'whatsapp' | 'call';
export type HostelNotifyKind = 'gatepass_overdue' | 'gatepass_out' | 'gatepass_returned' | 'rollcall_absent' | 'incident' | 'general';

export interface HostelNotification extends TenantRecord {
  kind: HostelNotifyKind;
  studentId?: string;
  studentName?: string;
  blockId?: string;
  blockName?: string;
  /** Free-text resolution/alert message recorded for the parent/guardian. */
  message: string;
  guardianName?: string;
  guardianPhone?: string;
  channel: HostelNotifyChannel;
  /** Source record (e.g. the gate pass id) for traceability. */
  refType?: string;
  refId?: string;
  sentByName?: string;
  sentAt: number;
}

/* ----------------------------- Mess / dietary ----------------------------- */
/* Lightweight per-resident dietary flags surfaced on a mess dashboard, plus a
 * dated daily mess menu. Diet doc id = studentId for one-profile-per-boarder. */

export type DietPreference = 'veg' | 'non_veg' | 'jain' | 'vegan' | 'eggetarian';

export interface DietProfile extends TenantRecord {
  studentId: string;
  studentName: string;
  blockId?: string;
  blockName?: string;
  preference: DietPreference;
  noOnionGarlic?: boolean;
  allergies?: string;
  notes?: string;
  updatedByName?: string;
}

export type MessMealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface MessMenu extends TenantRecord {
  date: string; // yyyy-mm-dd
  meals: { type: MessMealType; items: string; veg?: boolean }[];
  notes?: string;
  setByName?: string;
}

/* ------------------------- Incident / sick-bay log ------------------------ */
/* Minimal discipline-incident + sick-bay/health note. Health notes can be
 * escalated to the nurse (a flag the medical module can pick up). */

export type HostelIncidentKind = 'discipline' | 'health' | 'damage' | 'bullying' | 'safety' | 'other';
export type HostelIncidentSeverity = 'low' | 'medium' | 'high';
export type HostelIncidentStatus = 'open' | 'escalated' | 'resolved';

export interface HostelIncident extends TenantRecord {
  kind: HostelIncidentKind;
  studentId?: string;
  studentName?: string;
  blockId?: string;
  blockName?: string;
  severity: HostelIncidentSeverity;
  title: string;
  description?: string;
  occurredAt?: number;
  status: HostelIncidentStatus;
  /** Health notes can be flagged to the school nurse (medical owns the case). */
  escalatedToNurse?: boolean;
  reportedByName?: string;
  actionTaken?: string;
  resolvedAt?: number;
}

/* --------------------- Medical & clinic (RESTRICTED) ----------------------- */
/* Stored in the rules-restricted `medical` collection (kind discriminator) and
 * `immunization`. Only nurse/doctor/principal/vp_admin (+ super admin) access. */

export type MedicalKind = 'record' | 'visit';

export interface MedicalRecord extends TenantRecord {
  kind: 'record';
  studentId: string;
  studentName: string;
  gradeName?: string;
  bloodGroup?: string;
  heightCm?: number;
  weightKg?: number;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  disabilities?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  doctorName?: string;
  insuranceNo?: string;
  notes?: string;
  /** Individual Health Plan for CWSN / chronic conditions. */
  healthPlan?: string;
}

export type VisitOutcome = 'treated' | 'referred' | 'sent_home' | 'observation' | 'hospital';

export interface ClinicVisit extends TenantRecord {
  kind: 'visit';
  studentId: string;
  studentName: string;
  gradeName?: string;
  date: number;
  complaint: string;
  temperature?: number;
  diagnosis?: string;
  treatment?: string;
  medicineGiven?: string;
  outcome: VisitOutcome;
  attendedByName?: string;
  parentNotified?: boolean;
  followUp?: string;
}

export interface Immunization extends TenantRecord {
  studentId: string;
  studentName: string;
  vaccine: string;
  doseLabel?: string;
  givenDate?: number;
  nextDueDate?: number;
  administeredBy?: string;
  status?: 'given' | 'due' | 'overdue';
}

/* ---------------------------- Visitor & gate ------------------------------ */

export type VisitorStatus = 'expected' | 'in' | 'out' | 'denied';
export type VisitorPurpose = 'parent_meeting' | 'admission' | 'vendor' | 'interview' | 'official' | 'maintenance' | 'delivery' | 'other';
export type IdType = 'aadhaar' | 'pan' | 'driving_license' | 'voter_id' | 'other';

export interface VisitorLog extends TenantRecord {
  name: string;
  phone?: string;
  purpose: VisitorPurpose;
  whomToMeet?: string;
  hostUid?: string;
  hostType?: 'staff' | 'student';
  company?: string;
  partySize?: number;
  idType?: IdType;
  idLast4?: string;
  vehicleNo?: string;
  photoUrl?: string;
  passNo?: string;
  inAt?: number;
  outAt?: number;
  status: VisitorStatus;
  otp?: string;
  approved?: boolean;
  gateName?: string;
  notes?: string;
}

export interface BlacklistEntry extends TenantRecord {
  name: string;
  phone?: string;
  idLast4?: string;
  reason: string;
  addedByName?: string;
  active?: boolean;
}

/* ---------------------------- Canteen & nutrition ------------------------- */

export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'evening_snack' | 'dinner';

export interface MealItem {
  name: string;
  veg?: boolean;
  calories?: number;
}

export interface CanteenMenu extends TenantRecord {
  /** A dated daily menu (yyyy-mm-dd) or a weekday template. */
  date?: string;
  weekday?: number; // 0–6 when used as a weekly template
  meals: { type: MealType; items: MealItem[] }[];
  notes?: string;
  published?: boolean;
}

export interface MealHeadcount extends TenantRecord {
  date: string;
  mealType: MealType;
  count: number;
  notes?: string;
  recordedByName?: string;
}

export interface CanteenFeedback extends TenantRecord {
  date: string;
  mealType?: MealType;
  rating: number; // 1–5
  comment?: string;
  byName?: string;
  byRole?: string;
}

export interface CanteenInspection extends TenantRecord {
  date: number;
  inspector?: string;
  fssaiCompliant?: boolean;
  hygieneScore?: number;
  findings?: string;
  actionTaken?: string;
}

/* ---------------------------- Asset & facility ---------------------------- */

export type AssetCategory = 'furniture' | 'it' | 'lab' | 'sports' | 'av' | 'kitchen' | 'vehicle' | 'electrical' | 'other';
export type AssetStatus = 'in_use' | 'in_store' | 'maintenance' | 'retired' | 'lost' | 'damaged';

export interface Asset extends TenantRecord {
  name: string;
  tag?: string;
  category: AssetCategory;
  location?: string;
  facilityId?: string;
  quantity?: number;
  purchaseDate?: number;
  cost?: number;
  vendorName?: string;
  warrantyExpiry?: number;
  status: AssetStatus;
  assignedTo?: string;
  notes?: string;
}

export type FacilityType = 'classroom' | 'lab' | 'library' | 'sports' | 'auditorium' | 'office' | 'washroom' | 'ground' | 'other';

export interface Facility extends TenantRecord {
  name: string;
  type: FacilityType;
  building?: string;
  floor?: string;
  capacity?: number;
  inCharge?: string;
  condition?: 'good' | 'fair' | 'poor';
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'done' | 'cancelled';

export interface MaintenanceRequest extends TenantRecord {
  ticketNo?: string;
  title: string;
  description?: string;
  assetId?: string;
  facilityId?: string;
  location?: string;
  category?: AssetCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reportedByUid?: string;
  reportedByName?: string;
  assignedTo?: string;
  reportedAt?: number;
  resolvedAt?: number;
  resolutionNote?: string;
  cost?: number;
}
