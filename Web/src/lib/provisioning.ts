import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { deleteField, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
import { memberRef, userIndexRef } from './db';
import type { Member, MemberStatus, UserIndex } from '@/types/models';
import type { RoleId } from '@/types/roles';

/**
 * Free-tier user provisioning (no Cloud Functions / Admin SDK).
 *
 * Creating a Firebase Auth user via the primary SDK would sign the new user in and
 * log the admin out. To avoid that, we spin up a **secondary, throwaway Firebase
 * app instance**, create the account there, then immediately sign it out and
 * dispose the app. The admin's primary session is never touched. The profile docs
 * (member + userIndex) are written through the PRIMARY db with the admin's
 * credentials, which the security rules authorize.
 *
 * (When Blaze is enabled, this moves server-side to an Admin-SDK Cloud Function
 * with custom claims — the call sites stay the same.)
 */

export interface ProvisionStaffInput {
  schoolId: string;
  name: string;
  email: string;
  /** Initial password (admin-set). Use `generateTempPassword()` if not supplied. */
  password: string;
  roleId: RoleId;
  phone?: string;
  status?: MemberStatus;
  /** Scope constraints for role-scoped (T5) roles. */
  sectionIds?: string[];
  subjectIds?: string[];
  departmentId?: string;
  blockId?: string;
  routeId?: string;
  grantedPermissions?: string[];
  /** uid of the admin performing the action (for audit lineage). */
  createdBy: string;
}

export interface ProvisionResult {
  uid: string;
  email: string;
  password: string;
}

/** Cryptographically-random temporary password (admin can share; user keeps it). */
export function generateTempPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  // Guarantee at least one of each class for password policies.
  const pick = (set: string, n: number) => set[n % set.length];
  const chars = [pick(upper, arr[0]), pick(lower, arr[1]), pick(digits, arr[2])];
  for (let i = 3; i < length; i++) chars.push(pick(all, arr[i]));
  // Cryptographically uniform Fisher-Yates shuffle using a fresh entropy buffer.
  // The previous `sort(() => 0.5 - Math.random())` produced a biased distribution
  // (V8's sort is not uniformly random), causing the mandatory upper/lower/digit
  // characters to cluster near the start of the password.
  const shuffleBuf = new Uint32Array(length);
  crypto.getRandomValues(shuffleBuf);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Create a staff/auth account on a secondary app and write its profile docs.
 * Throws on failure (caller surfaces a toast). Returns the uid + credentials so
 * the admin can hand them to the user.
 */
export async function provisionStaffMember(input: ProvisionStaffInput): Promise<ProvisionResult> {
  // Unique app name even if two admins provision in the same millisecond. The old
  // `nexli-provision-${Date.now()}` collided on concurrent calls, and reusing a live
  // app name throws ("Firebase App named '…' already exists").
  const secondaryName = `nexli-provision-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email.trim(), input.password);
    const uid = cred.user.uid;

    // The Auth account must exist before we can write its member/userIndex docs
    // (they key on the uid) — Auth and Firestore cannot share one transaction here
    // (no Admin SDK on the free tier). So if the Firestore write fails, best-effort
    // DELETE the just-created Auth user to avoid orphaning a login with no profile
    // (which would otherwise surface as a NoAccess account forever). The user is
    // still signed in on the secondary app at this point, so `cred.user.delete()`
    // is permitted. RESIDUAL RISK: if this cleanup delete itself fails (offline mid-
    // call), the Auth account is orphaned; re-provisioning the same email will then
    // report "email already in use" and an admin must remove it from the console.
    try {
      await writeMemberDocs(uid, input);
    } catch (err) {
      try {
        await cred.user.delete();
      } catch {
        /* cleanup failed — orphaned Auth account; see residual-risk note above */
      }
      throw err;
    }

    return { uid, email: input.email.trim(), password: input.password };
  } finally {
    // Always tear down the secondary session/app, even on error.
    // Both signOut and deleteApp are fire-and-forget here — a failure to clean up
    // the throwaway app should not shadow the real provisioning error or create a
    // false failure when the member docs were already written successfully.
    try {
      await signOut(secondaryAuth);
    } catch {
      /* ignore */
    }
    try {
      await deleteApp(secondaryApp);
    } catch {
      /* ignore — app may already be in a torn-down state */
    }
  }
}

/**
 * Write the member (tenant) + userIndex (lookup) docs for an existing uid. Used
 * after provisioning, and when linking a phone-OTP parent on first login.
 */
export async function writeMemberDocs(uid: string, input: Omit<ProvisionStaffInput, 'password'>): Promise<void> {
  const member: Member = {
    uid,
    schoolId: input.schoolId,
    roleId: input.roleId,
    name: input.name.trim(),
    email: input.email?.trim(),
    phone: input.phone,
    status: input.status ?? 'active',
    sectionIds: input.sectionIds,
    subjectIds: input.subjectIds,
    departmentId: input.departmentId,
    blockId: input.blockId,
    routeId: input.routeId,
    grantedPermissions: input.grantedPermissions,
    createdBy: input.createdBy,
    createdAt: Date.now(),
  };
  const index: UserIndex = {
    uid,
    schoolId: input.schoolId,
    roleId: input.roleId,
    status: member.status,
  };

  const batch = writeBatch(db);
  batch.set(memberRef(input.schoolId, uid), { ...stripUndefined(member), serverCreatedAt: serverTimestamp() });
  batch.set(userIndexRef(uid), stripUndefined(index));
  await batch.commit();
}

/** Update a member's status (suspend/reactivate) + mirror to the userIndex. */
export async function setMemberStatus(schoolId: string, uid: string, status: MemberStatus): Promise<void> {
  await Promise.all([
    setDoc(memberRef(schoolId, uid), { status, lastModifiedAt: Date.now() }, { merge: true }),
    setDoc(userIndexRef(uid), { status }, { merge: true }),
  ]);
}

/**
 * Assign or clear a member's SECONDARY role (multi-role staffing — e.g. Class
 * Teacher + HOD). Permissions become the union of primary + secondary (see
 * `useSession().can` / `useOwnership`). Governed by leadership (Principal/VP/
 * Director). Passing `null` removes the secondary role via `deleteField()` so the
 * attribute is truly cleared (not left stale). Primary role / userIndex unchanged.
 */
export async function setMemberSecondaryRole(
  schoolId: string,
  uid: string,
  secondaryRoleId: RoleId | null,
): Promise<void> {
  await setDoc(
    memberRef(schoolId, uid),
    { secondaryRoleId: secondaryRoleId ?? deleteField(), lastModifiedAt: Date.now() },
    { merge: true },
  );
}

/** Firestore rejects `undefined` fields — drop them. */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}
