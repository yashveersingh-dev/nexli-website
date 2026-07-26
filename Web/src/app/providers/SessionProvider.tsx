import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { signOutAndClearLocalData } from '@/lib/auth';
import { globalFlagsRef, memberRef, schoolFlagsRef, schoolRef, userIndexRef } from '@/lib/db';
import { DEFAULT_FLAGS, resolveFlags, type FeatureFlagKey, type FlagMap } from '@/lib/featureFlags';
import { hasPermission, permissionListGrants, type Permission } from '@/lib/rbac';
import { fetchSessionPermissions, type ResolvedPerms } from '@/lib/roles/data';
import { isOperator as ownIsOperator, isReviewer as ownIsReviewer, isApprover as ownIsApprover, moduleOwnerLabel as ownLabel } from '@/lib/ownership';
import { subscribeActiveDelegations } from '@/lib/delegation';
import { writeAuditEvent, type AuditAction, type AuditEventInput } from '@/lib/audit';
import type { RoleId } from '@/types/roles';
import type { Member, School, UserIndex } from '@/types/models';

export type SessionStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'no_profile';

interface SessionState {
  status: SessionStatus;
  firebaseUser: User | null;
  uid?: string;
  isSuperAdmin: boolean;
  schoolId?: string;
  role?: RoleId;
  /** Optional second role held simultaneously (multi-role staffing — e.g. VP + Teacher,
   *  Class Teacher + HOD). Permissions/ownership are the UNION of both roles. */
  secondaryRole?: RoleId;
  member: Member | null;
  school: School | null;
  flags: FlagMap;
  /** Module keys this user currently operates via an active temporary delegation. */
  delegatedModules: string[];
  /** Effective permission keys resolved from the data-driven role definitions
   *  (Firestore override ◀ bundled catalogue), or '*' for full access. */
  permissions?: ResolvedPerms;
}

interface SessionActions {
  can: (perm: Permission) => boolean;
  hasFlag: (key: FeatureFlagKey) => boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface SessionContextValue extends SessionState, SessionActions {}

const initial: SessionState = {
  status: 'loading',
  firebaseUser: null,
  isSuperAdmin: false,
  member: null,
  school: null,
  flags: DEFAULT_FLAGS,
  delegatedModules: [],
};

/* -------------------------------------------------------------------------
   INTERNAL CONTEXT SPLIT.
   The session used to live in one ~12-field context, so EVERY change (incl.
   the delegation listener firing on a 60s interval, or a flag refresh) gave
   the whole object a new identity and re-rendered every consumer.

   We now keep the single source-of-truth `state` + atomic update logic (so
   behaviour is byte-for-byte the same), but expose it through four narrow,
   independently-memoised contexts:
     • IdentityContext  — auth/role/member/permissions (who you are)
     • SchoolContext    — tenant doc + feature flags (where you are)
     • DelegationContext— live temporary-access module keys (churns most)
     • ActionsContext   — can/hasFlag/reload/logout (stable callables)

   The PUBLIC surface is unchanged: `useSession()` still returns the full
   merged shape, and `useCan`/`useFlag`/`useOwnership`/`useAudit` keep the
   exact same signatures + return values. The win is that those narrow hooks
   now subscribe only to the slice they read, so e.g. a delegation tick no
   longer re-renders a component that only calls `useFlag(...)`. Components
   that call `useSession()` still see every field (and re-render on any
   change), preserving compatibility for the ~250 external consumers.
   ------------------------------------------------------------------------- */

type IdentitySlice = Pick<
  SessionState,
  'status' | 'firebaseUser' | 'uid' | 'isSuperAdmin' | 'role' | 'secondaryRole' | 'member' | 'permissions'
>;
type SchoolSlice = Pick<SessionState, 'schoolId' | 'school' | 'flags'>;
type DelegationSlice = Pick<SessionState, 'delegatedModules'>;

const IdentityContext = createContext<IdentitySlice | null>(null);
const SchoolContext = createContext<SchoolSlice | null>(null);
const DelegationContext = createContext<DelegationSlice | null>(null);
const ActionsContext = createContext<SessionActions | null>(null);

/** Resolve a signed-in user → tenant + role + flags via the /userIndex lookup. */
async function loadProfile(user: User): Promise<Partial<SessionState>> {
  const idxSnap = await getDoc(userIndexRef(user.uid));
  if (!idxSnap.exists()) {
    return { status: 'no_profile', firebaseUser: user, uid: user.uid };
  }
  const idx = idxSnap.data() as UserIndex;

  if (idx.isSuperAdmin || idx.roleId === 'super_admin') {
    const globalFlags = (await getDoc(globalFlagsRef())).data() as Partial<FlagMap> | undefined;
    return {
      status: 'authenticated',
      firebaseUser: user,
      uid: user.uid,
      isSuperAdmin: true,
      role: 'super_admin',
      flags: resolveFlags(globalFlags, null),
      permissions: '*',
    };
  }

  const schoolId = idx.schoolId;
  if (!schoolId) return { status: 'no_profile', firebaseUser: user, uid: user.uid };

  const [memberSnap, schoolSnap, globalSnap, schoolFlagSnap] = await Promise.all([
    getDoc(memberRef(schoolId, user.uid)),
    getDoc(schoolRef(schoolId)),
    getDoc(globalFlagsRef()),
    getDoc(schoolFlagsRef(schoolId)),
  ]);

  const member = memberSnap.exists() ? ({ ...(memberSnap.data() as Member), uid: user.uid }) : null;
  const school = schoolSnap.exists() ? ({ id: schoolId, ...(schoolSnap.data() as object) } as School) : null;
  const flags = resolveFlags(
    globalSnap.data() as Partial<FlagMap> | undefined,
    schoolFlagSnap.data() as Partial<FlagMap> | undefined,
  );
  // Resolve permissions from the data-driven role definitions (Firestore override
  // ◀ bundled catalogue) for the primary + optional secondary role.
  const permissions = await fetchSessionPermissions(schoolId, idx.roleId, member?.secondaryRoleId);

  return {
    status: 'authenticated',
    firebaseUser: user,
    uid: user.uid,
    isSuperAdmin: false,
    schoolId,
    role: idx.roleId,
    secondaryRole: member?.secondaryRoleId,
    member,
    school,
    flags,
    permissions,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(initial);
  // Incremented on every auth-state change so an in-flight loadProfile can detect
  // that a newer auth event has superseded it and discard its stale result.
  const seqRef = useRef(0);

  const applyUser = useCallback(async (user: User | null) => {
    const seq = ++seqRef.current;
    if (!user) {
      setState({ ...initial, status: 'unauthenticated' });
      return;
    }
    setState((s) => ({ ...s, status: 'loading', firebaseUser: user, uid: user.uid }));
    try {
      const next = await loadProfile(user);
      // Discard if a newer auth event (logout or re-login) has already fired.
      if (seqRef.current !== seq) return;
      setState({ ...initial, ...next } as SessionState);
    } catch (err) {
      if (seqRef.current !== seq) return;
      // eslint-disable-next-line no-console
      console.error('[NEXLI session] failed to load profile', err);
      setState({ ...initial, status: 'no_profile', firebaseUser: user, uid: user.uid });
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, applyUser), [applyUser]);

  // Live-subscribe to the user's active temporary delegations (decision: leadership
  // can grant substitutes temporary operate access). Feeds `useOwnership`.
  useEffect(() => {
    if (state.status !== 'authenticated' || state.isSuperAdmin || !state.schoolId || !state.uid) {
      return;
    }
    const unsub = subscribeActiveDelegations(state.schoolId, state.uid, (moduleKeys) => {
      setState((s) => ({ ...s, delegatedModules: moduleKeys }));
    });
    return unsub;
  }, [state.status, state.isSuperAdmin, state.schoolId, state.uid]);

  // `can` reads the live state via a ref so its identity stays stable across
  // renders (the ActionsContext never needs a new value just because state
  // changed), while still evaluating against the latest session.
  const stateRef = useRef(state);
  stateRef.current = state;

  const can = useCallback((perm: Permission) => {
    const s = stateRef.current;
    if (s.isSuperAdmin) return true;
    const granted = s.member?.grantedPermissions ?? [];
    const perms = s.permissions;
    // Primary path: the data-driven permission set resolved for this session
    // (already the union of primary + secondary role, Firestore ◀ catalogue).
    if (perms === '*') return true;
    if (perms) return permissionListGrants([...perms, ...granted], perm);
    // Fallback (permissions not resolved yet): bundled role defaults.
    if (!s.role) return false;
    if (hasPermission(s.role, perm, granted)) return true;
    return !!s.secondaryRole && hasPermission(s.secondaryRole, perm, granted);
  }, []);

  const hasFlag = useCallback((key: FeatureFlagKey) => stateRef.current.flags[key] ?? false, []);

  const reload = useCallback(async () => {
    if (auth.currentUser) await applyUser(auth.currentUser);
  }, [applyUser]);

  const logout = useCallback(async () => {
    const s = stateRef.current;
    if (s.uid) {
      // Await so the logout audit event is persisted before the hard reload below.
      await writeAuditEvent({
        action: 'logout',
        schoolId: s.schoolId,
        actor: { uid: s.uid, name: s.member?.name, role: s.role },
      }).catch(() => {});
    }
    // Clears the Firestore IndexedDB cache (student PII / fees / medical) then reloads.
    await signOutAndClearLocalData();
  }, []);

  // Stable for the lifetime of the provider — all four callables have constant
  // identity, so nothing re-renders merely because an action reference "changed".
  const actions = useMemo<SessionActions>(
    () => ({ can, hasFlag, reload, logout }),
    [can, hasFlag, reload, logout],
  );

  const identity = useMemo<IdentitySlice>(
    () => ({
      status: state.status,
      firebaseUser: state.firebaseUser,
      uid: state.uid,
      isSuperAdmin: state.isSuperAdmin,
      role: state.role,
      secondaryRole: state.secondaryRole,
      member: state.member,
      permissions: state.permissions,
    }),
    [
      state.status,
      state.firebaseUser,
      state.uid,
      state.isSuperAdmin,
      state.role,
      state.secondaryRole,
      state.member,
      state.permissions,
    ],
  );

  const school = useMemo<SchoolSlice>(
    () => ({ schoolId: state.schoolId, school: state.school, flags: state.flags }),
    [state.schoolId, state.school, state.flags],
  );

  const delegation = useMemo<DelegationSlice>(
    () => ({ delegatedModules: state.delegatedModules }),
    [state.delegatedModules],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <IdentityContext.Provider value={identity}>
        <SchoolContext.Provider value={school}>
          <DelegationContext.Provider value={delegation}>{children}</DelegationContext.Provider>
        </SchoolContext.Provider>
      </IdentityContext.Provider>
    </ActionsContext.Provider>
  );
}

/* ---- internal slice accessors (throw outside the provider) ---- */
function useIdentity(): IdentitySlice {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
function useSchool(): SchoolSlice {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
function useDelegation(): DelegationSlice {
  const ctx = useContext(DelegationContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
function useSessionActions(): SessionActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}

/**
 * Full session — the public, unchanged surface. Composes all four internal slices
 * into the same merged object every existing consumer expects. (Subscribes to all
 * slices, so it re-renders on any session change, exactly as before.)
 */
export function useSession(): SessionContextValue {
  const identity = useIdentity();
  const school = useSchool();
  const delegation = useDelegation();
  const actions = useSessionActions();
  return useMemo<SessionContextValue>(
    () => ({ ...identity, ...school, ...delegation, ...actions }),
    [identity, school, delegation, actions],
  );
}

// `useCan` / `useFlag` now read only the slices they need (identity / school
// flags) via the stable actions, so they re-render far less than a full
// `useSession()` — same signatures, same return values.
export const useCan = (perm: Permission): boolean => {
  // Depend on identity so the result re-evaluates when role/permissions change;
  // `can` itself is stable and reads the latest state internally.
  useIdentity();
  return useSessionActions().can(perm);
};
export const useFlag = (key: FeatureFlagKey): boolean => {
  // Depend on the flags slice so a flag refresh re-runs this.
  useSchool();
  return useSessionActions().hasFlag(key);
};

/**
 * Operational ownership for a module (realism layer over RBAC). Gate the primary
 * *operate* affordances on `canOperate`; show a review-mode note when `isReviewer`
 * (leadership oversees, the owning role operates). `isApprover` gates sign-offs.
 *
 * `canOperate` is true for the module's owner/deputy roles, the Super Admin, OR a
 * user holding an active temporary delegation for this module (`isDelegated`).
 */
export function useOwnership(moduleKey: string): {
  canOperate: boolean;
  isReviewer: boolean;
  isApprover: boolean;
  isDelegated: boolean;
  ownerLabel: string;
} {
  const { role, secondaryRole, isSuperAdmin } = useIdentity();
  const { delegatedModules } = useDelegation();
  const isDelegated = delegatedModules.includes(moduleKey);
  // Multi-role: operate/review/approve if EITHER role qualifies.
  const sec = secondaryRole;
  return {
    canOperate:
      isSuperAdmin || ownIsOperator(role, moduleKey) || (!!sec && ownIsOperator(sec, moduleKey)) || isDelegated,
    isReviewer: ownIsReviewer(role, moduleKey) || (!!sec && ownIsReviewer(sec, moduleKey)),
    isApprover:
      isSuperAdmin || ownIsApprover(role, moduleKey) || (!!sec && ownIsApprover(sec, moduleKey)),
    isDelegated,
    ownerLabel: ownLabel(moduleKey),
  };
}

/** Returns a session-bound audit logger: `log('student.edited', { targetId })`. */
export function useAudit() {
  const { uid, role, member } = useIdentity();
  const { schoolId } = useSchool();
  return useCallback(
    (action: AuditAction, opts?: Omit<AuditEventInput, 'action' | 'actor' | 'schoolId'>) =>
      writeAuditEvent({
        action,
        schoolId,
        actor: { uid: uid ?? 'unknown', name: member?.name, role },
        ...opts,
      }),
    [uid, schoolId, member, role],
  );
}
