import { useMemo } from 'react';
import { getDoc, setDoc } from 'firebase/firestore';
import { roleDefRef, roleDefsCol, schoolRoleDefRef, useCollection } from '@/lib/db';
import { ROLE_BY_ID, ROLE_CATALOG } from './catalog';
import { compileRole } from './compile';
import type { RoleDefinition } from './types';

/**
 * Firestore-backed resolution of the data-driven role system.
 *
 * The bundled `ROLE_CATALOG` is the DEFAULT; the live source of truth is
 * Firestore, so a Super Admin can edit a role, add a level, or create a brand-new
 * role with NO code change. Resolution for a given role id is:
 *   school override  ◀  global override  ◀  bundled catalogue default
 */
export type ResolvedPerms = '*' | string[];

/** Resolve ONE role's effective permission keys. */
export async function fetchRolePermissions(schoolId: string | undefined, roleId: string): Promise<ResolvedPerms> {
  if (!roleId) return [];
  if (roleId === 'super_admin') return '*';
  try {
    if (schoolId) {
      const s = await getDoc(schoolRoleDefRef(schoolId, roleId));
      if (s.exists()) return compileRole(s.data() as RoleDefinition);
    }
    const g = await getDoc(roleDefRef(roleId));
    if (g.exists()) return compileRole(g.data() as RoleDefinition);
  } catch {
    /* offline / denied → fall through to the bundled default */
  }
  const def = ROLE_BY_ID[roleId];
  return def ? compileRole(def) : [];
}

export function combinePerms(a: ResolvedPerms, b: ResolvedPerms): ResolvedPerms {
  if (a === '*' || b === '*') return '*';
  return [...new Set([...a, ...b])];
}

/** Resolve the full session permission set (primary + optional secondary role). */
export async function fetchSessionPermissions(
  schoolId: string | undefined,
  roleId: string,
  secondaryRoleId?: string,
): Promise<ResolvedPerms> {
  const primary = await fetchRolePermissions(schoolId, roleId);
  if (!secondaryRoleId) return primary;
  return combinePerms(primary, await fetchRolePermissions(schoolId, secondaryRoleId));
}

/**
 * Live, merged role list for the admin UI: the bundled catalogue overlaid with
 * any Firestore overrides + brand-new roles created by a Super Admin.
 */
export function useRoleCatalog(): { roles: RoleDefinition[]; loading: boolean } {
  const { data, loading } = useCollection<RoleDefinition>(roleDefsCol(), []);
  const roles = useMemo(() => {
    const byId = new Map<string, RoleDefinition>(ROLE_CATALOG.map((d) => [d.id, d]));
    for (const d of data) byId.set(d.id, { ...byId.get(d.id), ...d });
    return [...byId.values()]
      .filter((d) => d.active !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [data]);
  return { roles, loading };
}

/** Persist a role definition (edit an existing role, or create a new one). Global scope. */
export async function saveRoleDefinition(def: RoleDefinition): Promise<void> {
  await setDoc(roleDefRef(def.id), { ...def, builtIn: def.builtIn ?? false, active: def.active ?? true }, { merge: true });
}
