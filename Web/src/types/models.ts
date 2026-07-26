import type { RoleId } from './roles';

/* ============================ Tenancy ============================ */
export type SubscriptionStatus = 'trial' | 'active' | 'paused' | 'suspended' | 'expired' | 'terminated';
export type BoardType = 'CBSE' | 'ICSE' | 'State' | 'IB' | 'Cambridge' | 'NIOS';
export type SchoolType = 'day' | 'boarding' | 'day_cum_boarding' | 'chain_branch' | 'government';
export type SchoolSizeTier = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';

/** A tenant. ALL school data lives under /schools/{id} and is isolated by id. */
export interface School {
  id: string;
  name: string;
  board: BoardType;
  type: SchoolType;
  sizeTier?: SchoolSizeTier;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverUrl?: string;
  subscriptionStatus: SubscriptionStatus;
  /** Stable plan identifier (Plan.id) — the canonical link to the plan catalogue.
   *  Survives plan renames; revenue/limit joins resolve by this first. */
  planId?: string;
  /** Plan display name (denormalized for tables); kept in sync with planId. */
  plan?: string;
  /** Founding / negotiated price override (whole INR). When set, billing & revenue
   *  use this INSTEAD of the size-band/plan price. Matches the school's billingCycle
   *  (set the monthly or the annual figure, or both). */
  customPriceMonthly?: number;
  customPriceAnnual?: number;
  billingCycle?: 'monthly' | 'annual';
  renewalDate?: number;
  trialEndsAt?: number;
  currentAcademicYear?: string;
  onboardingPct?: number;
  notes?: string;
  /** School Admin (primary contact) provisioned at onboarding. */
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminUid?: string;
  /** Aggregate counts (denormalized; never individual records). */
  studentCount?: number;
  staffCount?: number;
  /** Feature flags enabled for this school (mirrors settings/feature_flags). */
  modulesEnabled?: string[];
  /** 30-day soft-delete: set on Terminate; purged after retention window. */
  deletedAt?: number;
  createdAt?: number;
  createdBy?: string;
  lastActiveAt?: number;
}

/* ============================ Identity ============================ */
export type MemberStatus = 'active' | 'suspended' | 'invited';

/** A user within a school tenant (staff/student/parent). Source of role + scope. */
export interface Member {
  uid: string;
  schoolId: string;
  roleId: RoleId;
  secondaryRoleId?: RoleId;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  status: MemberStatus;
  /** Scope constraints (T5 role-scoped write). */
  sectionIds?: string[];
  subjectIds?: string[];
  departmentId?: string;
  segment?: string;
  blockId?: string;
  routeId?: string;
  /** For parents: the student ids they guard. */
  childStudentIds?: string[];
  /** For student accounts: the linked student record id. */
  studentId?: string;
  /** Extra explicitly-granted permission keys (added to role defaults). */
  grantedPermissions?: string[];
  createdAt?: number;
  createdBy?: string;
}

/**
 * Lightweight lookup doc at /userIndex/{uid}: resolves a signed-in user to their
 * tenant + role in one read (school_admin/staff/student/parent), or marks a
 * platform Super Admin (no schoolId).
 */
export interface UserIndex {
  uid: string;
  schoolId?: string;
  roleId: RoleId;
  isSuperAdmin?: boolean;
  status?: MemberStatus;
}

/* ============================ Academic structure ============================ */
export interface AcademicYear {
  id: string;
  schoolId: string;
  label: string; // e.g. 2025-2026
  startDate?: number;
  endDate?: number;
  isCurrent?: boolean;
}

export interface Grade {
  id: string;
  schoolId: string;
  name: string; // "Class 6", "KG"
  order: number;
}

export interface Section {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string; // "A", "Rose"
  classTeacherUid?: string;
}

/* ============================ Platform (Super Admin) ============================ */

/** A subscription plan/tier (Starter / Growth / Professional / Enterprise). */
export interface Plan {
  id: string;
  name: string;
  order: number;
  studentLimit?: number;
  staffLimit?: number;
  priceMonthly?: number;
  priceAnnual?: number;
  trialDays?: number;
  description?: string;
  active?: boolean;
  highlighted?: boolean;
}

/** A school's subscription record (billing + lifecycle), platform-scoped. */
export interface Subscription {
  id: string; // = schoolId
  schoolId: string;
  schoolName?: string;
  planId?: string;
  planName?: string;
  status: SubscriptionStatus;
  billingCycle?: 'monthly' | 'annual';
  amount?: number;
  startDate?: number;
  renewalDate?: number;
  trialEndsAt?: number;
  lastReason?: string;
  updatedAt?: number;
}

export type SubscriptionAction = 'activate' | 'pause' | 'suspend' | 'resume' | 'expire' | 'renew' | 'terminate';

/**
 * Nexli's own GST seller/legal-entity details for subscription tax invoices.
 * Editable by Super Admin (platform_settings/global → gstSeller); the invoice
 * builder falls back to a source placeholder when unset. Shape mirrors the
 * `SellerDetails` consumed by `features/platform/subscriptions/gst.ts`.
 */
export interface GstSellerSettings {
  legalName?: string;
  tradeName?: string;
  gstin?: string;
  stateName?: string;
  /** 2-digit GST state code (first two digits of the GSTIN). */
  stateCode?: string;
  addressLines?: string[];
  email?: string;
  phone?: string;
  /** SAC for the supply (e.g. 998314 for IT services). */
  sac?: string;
  pan?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
}

/** Global platform configuration (single doc: platform_settings/global). */
export interface PlatformSettings {
  platformName?: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  academicYearStartMonth?: number; // 1-12
  defaultSections?: string[];
  imagekitEndpoint?: string;
  imagekitPublicKey?: string;
  maintenanceMode?: boolean;
  /** Nexli's GST seller details for subscription invoices (super-admin editable). */
  gstSeller?: GstSellerSettings;
  updatedAt?: number;
  updatedBy?: string;
}

export type AnnouncementType = 'maintenance' | 'feature' | 'policy' | 'billing' | 'emergency';
export type AnnouncementAudience = 'all' | 'plan' | 'state' | 'board' | 'schools';

/** A platform-wide announcement from Super Admin to School Admins. */
export interface PlatformAnnouncement {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  /** Targeting values (plan id, state, board, or school ids) by audience. */
  targetPlan?: string;
  targetState?: string;
  targetBoard?: BoardType;
  targetSchoolIds?: string[];
  channels?: string[]; // ['in_app','email','sms']
  sentAt?: number;
  sentBy?: string;
  sentByName?: string;
  active?: boolean;
}

export type PlatformActivityType =
  | 'school.registered'
  | 'school.updated'
  | 'subscription.changed'
  | 'import.completed'
  | 'settings.changed'
  | 'announcement.sent'
  | 'impersonation';

/** A platform activity-feed event (denormalized for the dashboard feed). */
export interface PlatformActivity {
  id: string;
  type: PlatformActivityType;
  schoolId?: string;
  schoolName?: string;
  summary: string;
  ts: number;
  actorUid?: string;
  actorName?: string;
}

/** A Super Admin support impersonation session (audited, time-boxed). */
export interface ImpersonationSession {
  id: string;
  schoolId: string;
  schoolName?: string;
  reason: string;
  startedAt: number;
  expiresAt: number;
  endedAt?: number;
  actorUid: string;
  actorName?: string;
}

/** Base fields shared by all tenant-scoped records (versioning + audit lineage). */
export interface TenantRecord {
  id: string;
  schoolId: string;
  createdAt?: number;
  createdBy?: string;
  lastModifiedAt?: number;
  lastModifiedBy?: string;
  version?: number;
}
