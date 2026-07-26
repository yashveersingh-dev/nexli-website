import {
  addDoc,
  deleteDoc,
  deleteField,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit as fsLimit,
  runTransaction,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  globalFlagsRef,
  planRef,
  plansCol,
  platformActivityCol,
  platformAnnouncementsCol,
  platformAuditCol,
  platformSettingsRef,
  schoolFlagsRef,
  schoolRef,
  schoolsCol,
  subscriptionRef,
  useCollection,
  useDocument,
} from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { provisionStaffMember, setMemberStatus, type ProvisionResult } from '@/lib/provisioning';
import { sendStaffPasswordReset } from '@/lib/auth';
import type { FlagMap } from '@/lib/featureFlags';
import type {
  Plan,
  PlatformActivity,
  PlatformActivityType,
  PlatformAnnouncement,
  PlatformSettings,
  School,
  SubscriptionAction,
  SubscriptionStatus,
} from '@/types/models';

/**
 * Platform (Super Admin) data layer. All reads/writes for schools, subscriptions,
 * plans, announcements, settings and the activity feed live here. Super Admin is
 * the only audience that touches these collections (enforced by Firestore rules).
 * The Super Admin never reads individual school records — only configuration and
 * aggregate counts stored on the school document itself.
 */

interface Actor {
  uid: string;
  name?: string;
}

/* ---------------- Schools ---------------- */

export function useSchools() {
  return useCollection<School>(schoolsCol(), []);
}

export function useSchool(id: string | undefined) {
  return useDocument<School>(id ? schoolRef(id) : null);
}

export async function getSchool(id: string): Promise<School | null> {
  const snap = await getDoc(schoolRef(id));
  return snap.exists() ? ({ id, ...(snap.data() as object) } as School) : null;
}

/** Create a school document (used by the onboarding wizard). */
export async function createSchool(id: string, data: Omit<School, 'id'>, actor: Actor): Promise<void> {
  await setDoc(schoolRef(id), {
    ...stripUndefined(data),
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
  });
  await logActivity({ type: 'school.registered', schoolId: id, schoolName: data.name, summary: `School "${data.name}" registered`, }, actor);
  void writeAuditEvent({ action: 'school.created', actor, targetType: 'school', targetId: id, summary: data.name });
}

export async function updateSchool(id: string, patch: Partial<School>, actor: Actor): Promise<void> {
  const clean = stripUndefined(patch);
  await updateDoc(schoolRef(id), { ...clean, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  // Audit details must not carry `undefined` (e.g. cleared optional fields) — Firestore
  // rejects undefined and the whole audit write would be silently dropped.
  void writeAuditEvent({ action: 'school.edited', actor, targetType: 'school', targetId: id, details: clean });
}

/* ---------------- School administrator lifecycle ---------------- */

/**
 * Provision (or re-provision) the School Admin (Principal) auth account and write
 * the linkage back onto the school document (`adminUid` + contact). Used from the
 * detail page when onboarding provisioning was skipped/failed, or to replace the
 * primary admin. Throws on auth failure (e.g. email already in use).
 */
export async function provisionSchoolAdmin(
  school: School,
  fields: { name: string; email: string; phone?: string; password: string },
  actor: Actor,
): Promise<ProvisionResult> {
  const res = await provisionStaffMember({
    schoolId: school.id,
    name: fields.name,
    email: fields.email,
    password: fields.password,
    roleId: 'principal',
    phone: fields.phone,
    createdBy: actor.uid,
  });
  await updateDoc(schoolRef(school.id), {
    adminName: fields.name,
    adminEmail: fields.email,
    adminPhone: fields.phone ?? null,
    adminUid: res.uid,
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
  await logActivity({ type: 'school.registered', schoolId: school.id, schoolName: school.name, summary: `${school.name}: admin account provisioned` }, actor);
  void writeAuditEvent({ action: 'user.created', actor, targetType: 'school', targetId: school.id, summary: `Admin provisioned — ${fields.email}` });
  return res;
}

/** Update the admin contact on the school record (no auth-account change). */
export async function saveSchoolAdminDetails(school: School, fields: { name: string; email: string; phone?: string }, actor: Actor): Promise<void> {
  await updateSchool(school.id, { adminName: fields.name, adminEmail: fields.email, adminPhone: fields.phone || undefined }, actor);
}

/** Send a password-reset email to the school admin. */
export async function resetSchoolAdminPassword(school: School, actor: Actor): Promise<void> {
  if (!school.adminEmail) throw new Error('No admin email on file');
  await sendStaffPasswordReset(school.adminEmail);
  void writeAuditEvent({ action: 'user.password_reset', actor, targetType: 'school', targetId: school.id, summary: `Reset sent to ${school.adminEmail}` });
}

/** Suspend or reactivate the school admin's login (mirrors member + userIndex). */
export async function setSchoolAdminStatus(school: School, status: 'active' | 'suspended', actor: Actor): Promise<void> {
  if (!school.adminUid) throw new Error('Admin account not provisioned');
  await setMemberStatus(school.id, school.adminUid, status);
  void writeAuditEvent({ action: status === 'suspended' ? 'user.suspended' : 'user.edited', actor, targetType: 'school', targetId: school.id, summary: `Admin login ${status}` });
}

/* ---------------- Subscription lifecycle ---------------- */

const ACTION_TO_STATUS: Record<SubscriptionAction, SubscriptionStatus> = {
  activate: 'active',
  pause: 'paused',
  suspend: 'suspended',
  resume: 'active',
  expire: 'expired',
  renew: 'active',
  terminate: 'terminated',
};

/** Next renewal date = one billing cycle from the later of now / current renewal. */
export function nextRenewalDate(from: number | undefined, cycle: 'monthly' | 'annual' | undefined): number {
  const base = new Date(Math.max(Date.now(), from ?? Date.now()));
  if (cycle === 'monthly') base.setMonth(base.getMonth() + 1);
  else base.setFullYear(base.getFullYear() + 1);
  return base.getTime();
}

/**
 * Effective status for display: a stored `active`/`trial` whose renewal/trial date
 * has passed is shown (and treated) as `expired`, even before an operator or the
 * scheduled sweep persists it. Terminal/explicit states are returned as-is.
 */
export function effectiveSubscriptionStatus(school: Pick<School, 'subscriptionStatus' | 'renewalDate' | 'trialEndsAt'>): SubscriptionStatus {
  const status = school.subscriptionStatus ?? 'trial';
  if (status === 'active' || status === 'trial') {
    const dueDate = status === 'trial' ? school.trialEndsAt : school.renewalDate;
    if (dueDate != null && dueDate < Date.now()) return 'expired';
  }
  return status;
}

/**
 * Free-tier replacement for a scheduled billing job: when the Super Admin opens
 * the console, persist `expired` status for any active/trial school whose
 * renewal/trial date has lapsed. Idempotent; only writes the ones that changed.
 * Returns the number swept.
 */
export async function sweepExpiredSubscriptions(schools: School[], actor: Actor): Promise<number> {
  const due = schools.filter(
    (s) => (s.subscriptionStatus === 'active' || s.subscriptionStatus === 'trial') && effectiveSubscriptionStatus(s) === 'expired',
  );
  let swept = 0;
  for (const s of due) {
    try {
      // Re-read inside a transaction so concurrent tabs/sweeps can't double-write
      // (and double-log) the same school: only the first sweep that still sees an
      // active/trial status performs the expire; others read 'expired' and skip.
      const changed = await runTransaction(db, async (tx) => {
        const snap = await tx.get(schoolRef(s.id));
        if (!snap.exists()) return false;
        const cur = snap.data() as School;
        if (cur.subscriptionStatus !== 'active' && cur.subscriptionStatus !== 'trial') return false;
        tx.update(schoolRef(s.id), { subscriptionStatus: 'expired', lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
        tx.set(subscriptionRef(s.id), { schoolId: s.id, schoolName: s.name, status: 'expired', updatedAt: Date.now(), lastReason: 'Auto-expired (term lapsed)' }, { merge: true });
        return true;
      });
      if (changed) {
        swept++;
        await logActivity({ type: 'subscription.changed', schoolId: s.id, schoolName: s.name, summary: `${s.name}: subscription expired (term lapsed)` }, actor);
        void writeAuditEvent({ action: 'subscription.changed', actor, targetType: 'school', targetId: s.id, summary: 'auto-expire — term lapsed', details: { action: 'expire', status: 'expired', auto: true } });
      }
    } catch {
      /* best-effort; will retry next sweep */
    }
  }
  return swept;
}

/** Apply a subscription lifecycle action (with mandatory reason → audit + feed). */
export async function applySubscriptionAction(
  school: School,
  action: SubscriptionAction,
  reason: string,
  actor: Actor,
): Promise<void> {
  const status = ACTION_TO_STATUS[action];
  const restoring = action === 'activate' || action === 'resume' || action === 'renew';

  // Build the typed patch (strip-undefined safe) separately from Firestore-only
  // field operations like deleteField(), which aren't part of the School type.
  const schoolPatch: Partial<School> = { subscriptionStatus: status };
  if (action === 'terminate') schoolPatch.deletedAt = Date.now();

  // When (re)activating into a billable state, make sure the term is in the future,
  // otherwise effectiveSubscriptionStatus() recomputes the school straight back to
  // `expired` and the action appears to do nothing. Renew always extends; activate/
  // resume extend only if the stored renewal date has already lapsed.
  const termLapsed = school.renewalDate != null && school.renewalDate < Date.now();
  if (action === 'renew' || (restoring && termLapsed)) {
    schoolPatch.renewalDate = nextRenewalDate(school.renewalDate, school.billingCycle);
  }

  // deletedAt must be REMOVED (not set undefined → stripped) when restoring access,
  // or a reactivated school stays stuck in the 30-day soft-delete window forever.
  const fsPatch: Record<string, unknown> = {
    ...stripUndefined(schoolPatch),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  };
  if (restoring) fsPatch.deletedAt = deleteField();

  await updateDoc(schoolRef(school.id), fsPatch);
  await setDoc(
    subscriptionRef(school.id),
    {
      schoolId: school.id,
      schoolName: school.name,
      status,
      planId: school.planId ?? null,
      planName: school.plan ?? null,
      renewalDate: schoolPatch.renewalDate ?? school.renewalDate ?? null,
      lastReason: reason,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  await logActivity(
    { type: 'subscription.changed', schoolId: school.id, schoolName: school.name, summary: `${school.name}: subscription ${action}${action.endsWith('e') ? 'd' : 'ed'}` },
    actor,
  );
  void writeAuditEvent({
    action: 'subscription.changed',
    actor,
    targetType: 'school',
    targetId: school.id,
    summary: `${action} — ${reason}`,
    details: { action, status, reason },
  });
}

/* ---------------- Plans ---------------- */

export function usePlans() {
  return useCollection<Plan>(query(plansCol(), orderBy('order', 'asc')), []);
}

export async function upsertPlan(plan: Plan, actor: Actor): Promise<void> {
  await setDoc(planRef(plan.id), { ...stripUndefined(plan), updatedAt: Date.now() }, { merge: true });
  void writeAuditEvent({ action: 'plan.updated', actor, targetType: 'plan', targetId: plan.id, summary: plan.name });
}

export async function deletePlan(id: string, actor: Actor): Promise<void> {
  await deleteDoc(planRef(id));
  void writeAuditEvent({ action: 'plan.deleted', actor, targetType: 'plan', targetId: id });
}

/**
 * Resolve the catalogue plan for a school. Joins on the stable `planId` first (so
 * renaming a plan never breaks revenue/limits), falling back to a case-insensitive
 * name match for legacy/seed schools written before `planId` existed. Returns
 * undefined when no plan is assigned or the plan no longer exists.
 */
export function resolveSchoolPlan(
  school: Pick<School, 'planId' | 'plan'>,
  plans: Plan[],
): Plan | undefined {
  if (school.planId) {
    const byId = plans.find((p) => p.id === school.planId);
    if (byId) return byId;
  }
  if (school.plan) {
    const name = school.plan.toLowerCase();
    return plans.find((p) => p.name.toLowerCase() === name);
  }
  return undefined;
}

/**
 * Effective monthly price for a school (whole INR), used for revenue/MRR display.
 * A per-school **custom / founding price** (if set) overrides the size band/plan;
 * otherwise falls back to the assigned plan's price (annual ÷ 12 when billed
 * annually). Returns null when no price is known.
 */
export function effectiveMonthlyPrice(
  school: Pick<School, 'customPriceMonthly' | 'customPriceAnnual' | 'billingCycle' | 'planId' | 'plan'>,
  plans: Plan[],
): number | null {
  const annual = school.billingCycle === 'annual';
  // Custom/founding override wins over the band/plan price.
  if (annual && school.customPriceAnnual != null && school.customPriceAnnual > 0) return school.customPriceAnnual / 12;
  if (school.customPriceMonthly != null && school.customPriceMonthly > 0) return school.customPriceMonthly;
  if (school.customPriceAnnual != null && school.customPriceAnnual > 0) return school.customPriceAnnual / 12;
  const plan = resolveSchoolPlan(school, plans);
  if (!plan) return null;
  if (annual && (plan.priceAnnual ?? 0) > 0) return (plan.priceAnnual as number) / 12;
  return plan.priceMonthly ?? null;
}

/**
 * Set (or clear) a school's custom/founding price override. Pass null for a field
 * to remove it. Audited. Used for the first founding schools and negotiated deals.
 */
export async function setSchoolCustomPrice(
  schoolId: string,
  monthly: number | null,
  annual: number | null,
  actor: Actor,
): Promise<void> {
  await updateDoc(schoolRef(schoolId), {
    customPriceMonthly: monthly == null ? deleteField() : monthly,
    customPriceAnnual: annual == null ? deleteField() : annual,
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
  void writeAuditEvent({
    action: 'school.edited',
    actor,
    targetType: 'school',
    targetId: schoolId,
    summary:
      monthly == null && annual == null
        ? 'Custom price cleared'
        : `Custom price set (₹${monthly ?? Math.round((annual ?? 0) / 12)}/mo)`,
  });
}

/* ---------------- Announcements ---------------- */

export function useAnnouncements() {
  return useCollection<PlatformAnnouncement>(query(platformAnnouncementsCol(), orderBy('sentAt', 'desc'), fsLimit(100)), []);
}

export async function sendAnnouncement(a: Omit<PlatformAnnouncement, 'id'>, actor: Actor): Promise<void> {
  await addDoc(platformAnnouncementsCol(), { ...stripUndefined(a), sentAt: Date.now(), sentBy: actor.uid, sentByName: actor.name ?? null, active: true });
  await logActivity({ type: 'announcement.sent', summary: `Announcement sent: ${a.title}` }, actor);
  void writeAuditEvent({ action: 'announcement.sent', actor, summary: a.title, details: { type: a.type, audience: a.audience } });
}

/* ---------------- Platform settings ---------------- */

export function usePlatformSettings() {
  return useDocument<PlatformSettings>(platformSettingsRef());
}

export async function savePlatformSettings(patch: Partial<PlatformSettings>, actor: Actor): Promise<void> {
  const clean = stripUndefined(patch);
  await setDoc(platformSettingsRef(), { ...clean, updatedAt: Date.now(), updatedBy: actor.uid }, { merge: true });
  // Strip undefined before auditing — otherwise a settings save that clears a field
  // would throw inside the audit write and the event would be silently lost.
  void writeAuditEvent({ action: 'settings.changed', actor, summary: 'Platform settings updated', details: clean });
}

/* ---------------- Activity feed ---------------- */

export function useActivityFeed(max = 50) {
  return useCollection<PlatformActivity>(query(platformActivityCol(), orderBy('ts', 'desc'), fsLimit(max)), [max]);
}

export async function logActivity(
  e: { type: PlatformActivityType; schoolId?: string; schoolName?: string; summary: string },
  actor: Actor,
): Promise<void> {
  try {
    await addDoc(platformActivityCol(), {
      type: e.type,
      schoolId: e.schoolId ?? null,
      schoolName: e.schoolName ?? null,
      summary: e.summary,
      ts: Date.now(),
      actorUid: actor.uid,
      actorName: actor.name ?? null,
    });
  } catch {
    /* feed is best-effort */
  }
}

/* ---------------- Feature flags (global + per-school) ---------------- */

export function useGlobalFlags() {
  return useDocument<Partial<FlagMap>>(globalFlagsRef());
}

export async function saveGlobalFlags(patch: Partial<FlagMap>, actor: Actor): Promise<void> {
  await setDoc(globalFlagsRef(), stripUndefined(patch), { merge: true });
  void writeAuditEvent({ action: 'feature_flag.changed', actor, summary: 'Global feature flags updated', details: patch });
}

export function useSchoolFlags(schoolId: string | undefined) {
  return useDocument<Partial<FlagMap>>(schoolId ? schoolFlagsRef(schoolId) : null);
}

export async function saveSchoolFlags(schoolId: string, patch: Partial<FlagMap>, actor: Actor): Promise<void> {
  await setDoc(schoolFlagsRef(schoolId), stripUndefined(patch), { merge: true });
  void writeAuditEvent({
    action: 'feature_flag.changed',
    actor,
    targetType: 'school',
    targetId: schoolId,
    summary: 'Per-school feature flags updated',
    details: patch,
  });
}

/* ---------------- Platform audit log ---------------- */

export interface PlatformAuditEntry {
  id: string;
  action: string;
  actorUid?: string;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  details?: Record<string, unknown>;
  ts: number;
}

export function usePlatformAudit(max = 100) {
  return useCollection<PlatformAuditEntry>(query(platformAuditCol(), orderBy('ts', 'desc'), fsLimit(max)), [max]);
}

/* ---------------- One-shot queries ---------------- */

/** Fetch schools matching constraints once (non-realtime), e.g. for exports. */
export async function querySchoolsOnce(...constraints: QueryConstraint[]): Promise<School[]> {
  const snap = await getDocs(query(schoolsCol(), ...constraints, fsLimit(500)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as School);
}

export { where, orderBy };

/* ---------------- utils ---------------- */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}
