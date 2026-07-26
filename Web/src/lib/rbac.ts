import type { RoleId } from '@/types/roles';
import { PASSWORD_MANAGER_ROLES } from '@/types/roles';
import { ROLE_CATALOG } from '@/lib/roles/catalog';
import { compileRole } from '@/lib/roles/compile';

/**
 * RBAC for UI gating (show/hide + route guards). The AUTHORITATIVE boundary is
 * Firestore security rules; this client layer mirrors that intent so the UI never
 * offers an action a user can't perform.
 *
 * Permissions are DATA-DRIVEN: `ROLE_PERMISSIONS` below is COMPILED from the role
 * catalogue (src/lib/roles/catalog.ts) — the bundled default. At runtime the
 * session resolves a user's permissions from Firestore role definitions (which a
 * Super Admin can edit), falling back to these defaults. Permission keys are
 * `${module}.${action}` (+ optional `.scope`); `'*'` = all permissions.
 */
export type Permission = string;

const ALL = '*' as const;

/** Bundled DEFAULT permission set per built-in role, compiled from the catalogue. */
export const ROLE_PERMISSIONS: Record<string, '*' | readonly Permission[]> = Object.fromEntries(
  ROLE_CATALOG.map((d) => [d.id, compileRole(d)]),
);

/**
 * Does a permission LIST grant `permission`? Shared by the static role path and
 * the dynamic (Firestore-resolved) session path. Safe inferences:
 *  1. A broad `module.action` grant satisfies a scoped `module.action.scope` request.
 *  2. A scoped `module.action.scope` grant satisfies the unscoped `module.action`
 *     request (the page itself further scopes the data it shows).
 *  3. For a `module.read` request, any write grant on the same module implies read.
 */
export function permissionListGrants(list: readonly Permission[], permission: Permission): boolean {
  if (list.includes(permission)) return true;
  const parts = permission.split('.');
  const [mod, action] = parts;
  if (parts.length > 2 && list.includes(`${mod}.${action}`)) return true;
  if (parts.length === 2 && list.some((p) => p.startsWith(`${mod}.${action}.`))) return true;
  if (action === 'read' && list.some((p) => p === `${mod}.write` || p.startsWith(`${mod}.write.`))) return true;
  return false;
}

/** Does a role grant `permission`? Optionally include member-granted extras. */
export function hasPermission(role: RoleId, permission: Permission, extra: readonly Permission[] = []): boolean {
  const base = ROLE_PERMISSIONS[role];
  if (base === ALL) return true;
  return permissionListGrants([...(base ?? []), ...extra], permission);
}

/** Roles allowed to reset/change other users' passwords (per requirement). */
export function canManagePasswords(role: RoleId): boolean {
  return PASSWORD_MANAGER_ROLES.includes(role);
}

export function isPlatformRole(role: RoleId): boolean {
  return role === 'super_admin';
}
