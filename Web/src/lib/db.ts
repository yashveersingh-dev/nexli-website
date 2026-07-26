import { useEffect, useState, type DependencyList } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Tenant-scoped Firestore access. EVERY school record lives under
 * `schools/{schoolId}/…`, so isolation is structural: there is no API here that
 * reads school data without a schoolId. Security rules enforce the same boundary
 * server-side (a bug in app code can never cross tenants).
 *
 * Platform collections (Super Admin only): schools, subscriptions, plans,
 * platform_settings, platform_announcements, platform_audit_log, feature_flags,
 * and the top-level userIndex (auth resolution).
 */

/* ---------- Platform refs ---------- */
export const schoolRef = (schoolId: string) => doc(db, 'schools', schoolId);
export const schoolsCol = () => collection(db, 'schools');
export const subscriptionsCol = () => collection(db, 'subscriptions');
export const subscriptionRef = (id: string) => doc(db, 'subscriptions', id);
export const plansCol = () => collection(db, 'plans');
export const planRef = (id: string) => doc(db, 'plans', id);
export const platformSettingsRef = () => doc(db, 'platform_settings', 'global');
export const platformAnnouncementsCol = () => collection(db, 'platform_announcements');
export const platformAnnouncementRef = (id: string) => doc(db, 'platform_announcements', id);
export const platformActivityCol = () => collection(db, 'platform_activity');
export const impersonationCol = () => collection(db, 'impersonation_sessions');
export const platformAuditCol = () => collection(db, 'platform_audit_log');
export const globalFlagsRef = () => doc(db, 'feature_flags', 'global');
export const userIndexRef = (uid: string) => doc(db, 'userIndex', uid);

/* ---------- Tenant-scoped refs ---------- */
export const tenantCol = (schoolId: string, sub: string): CollectionReference =>
  collection(db, 'schools', schoolId, sub);
export const tenantDoc = (schoolId: string, sub: string, id: string): DocumentReference =>
  doc(db, 'schools', schoolId, sub, id);
export const memberRef = (schoolId: string, uid: string) => tenantDoc(schoolId, 'members', uid);
export const schoolFlagsRef = (schoolId: string) => tenantDoc(schoolId, 'settings', 'feature_flags');
export const schoolSettingsRef = (schoolId: string, name: string) => tenantDoc(schoolId, 'settings', name);
export const tenantAuditCol = (schoolId: string) => tenantCol(schoolId, 'audit_log');

/* ---------- Role definitions (data-driven RBAC) ----------
 * Global defaults live at /roleDefinitions/{roleId}; a school may override a role
 * (or add its own) at /schools/{id}/roleDefinitions/{roleId}. Resolution order is
 * school override ◀ global ◀ bundled catalogue (see lib/roles). */
export const roleDefsCol = () => collection(db, 'roleDefinitions');
export const roleDefRef = (id: string) => doc(db, 'roleDefinitions', id);
export const schoolRoleDefsCol = (schoolId: string) => tenantCol(schoolId, 'roleDefinitions');
export const schoolRoleDefRef = (schoolId: string, id: string) => tenantDoc(schoolId, 'roleDefinitions', id);

/* ---------- Snapshot → typed object ---------- */
function withId<T>(snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...(snap.data() as object) } as T;
}

/* ---------- Real-time hooks ---------- */
export interface DocState<T> {
  data: T | null;
  loading: boolean;
  error?: Error;
}

/** Subscribe to a single document (null ref → idle). */
export function useDocument<T>(ref: DocumentReference | null): DocState<T> {
  const [state, setState] = useState<DocState<T>>({ data: null, loading: !!ref });
  const path = ref?.path ?? null;
  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? withId<T>(snap) : null, loading: false }),
      (err) => setState({ data: null, loading: false, error: err }),
    );
    return unsub;
    // Resubscribe only when the document path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return state;
}

export interface ListState<T> {
  data: T[];
  loading: boolean;
  error?: Error;
}

/**
 * Subscribe to a collection/query (null → idle). Pass `deps` so the listener
 * re-subscribes when inputs (e.g. schoolId, filters) change.
 *
 * `deps` is the listener's subscription key: the live `onSnapshot` is torn down
 * and rebuilt only when `deps` changes. A common pitfall is passing a value that
 * is fresh every render (e.g. an inline-built array, or `[...ids]`) — that
 * thrashes the subscription each render; or, conversely, OMITTING an input that
 * the query actually depends on, which leaves a STALE listener bound to old
 * filters. The fix is to pass primitives (ids/flags) and a stable key for arrays
 * (e.g. `ids.join(',')`), exactly as the call sites here already do.
 *
 * `queryKey` (optional, fully backwards-compatible — omit for unchanged
 * behaviour): pass a single string/number and the listener keys off THAT stable
 * value instead of `deps`. Useful when the query is rebuilt inline (so `deps`
 * would otherwise have to enumerate every input): derive one stable key
 * (e.g. ```${schoolId}|${sectionId}|${ids.join(',')}```) and the subscription
 * tracks it precisely, avoiding both per-render thrash and stale listeners.
 */
export function useCollection<T>(
  q: Query<DocumentData> | CollectionReference<DocumentData> | null,
  deps: DependencyList = [],
  queryKey?: string | number,
): ListState<T> {
  const [state, setState] = useState<ListState<T>>({ data: [], loading: !!q });
  // When an explicit queryKey is supplied it is the sole subscription key;
  // otherwise fall back to the caller-supplied `deps` (default, unchanged).
  const effectDeps: DependencyList = queryKey !== undefined ? [queryKey] : deps;
  useEffect(() => {
    if (!q) {
      setState({ data: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => withId<T>(d)), loading: false }),
      (err) => setState({ data: [], loading: false, error: err }),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, effectDeps);
  return state;
}

/**
 * Subscribe to a SPECIFIC set of tenant docs by id (one live listener per id).
 *
 * Used for own-record scoping: a parent/student reads only their own student
 * record(s) instead of the whole collection (which the tightened security rules
 * forbid). Each listener is a single-document `get`, so it satisfies the
 * per-document "own record" rule directly — there is no list query for the rules
 * engine to statically validate. `!schoolId` or an empty id list → idle (`[]`).
 * Results preserve the input id order; missing/forbidden ids are simply omitted.
 */
export function useTenantDocsByIds<T>(
  schoolId: string | undefined,
  sub: string,
  ids: readonly string[] | undefined,
): ListState<T> {
  const key = ids ? ids.join(',') : '';
  const [state, setState] = useState<ListState<T>>({ data: [], loading: !!(schoolId && ids && ids.length) });
  useEffect(() => {
    if (!schoolId || !ids || ids.length === 0) {
      setState({ data: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const order = [...ids];
    const map = new Map<string, T>();
    const emit = () => setState({ data: order.map((i) => map.get(i)).filter(Boolean) as T[], loading: false });
    const unsubs = order.map((id) =>
      onSnapshot(
        doc(db, 'schools', schoolId, sub, id),
        (snap) => { if (snap.exists()) map.set(id, withId<T>(snap)); else map.delete(id); emit(); },
        () => { map.delete(id); emit(); },
      ),
    );
    return () => unsubs.forEach((u) => u());
    // Re-subscribe when the school or the exact id set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, sub, key]);
  return state;
}
