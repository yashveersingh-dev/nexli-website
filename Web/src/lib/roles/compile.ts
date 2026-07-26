import type { PermissionMatrix, RoleAction, RoleDefinition } from './types';
import { APP_MODULES } from './modules';

const LEGACY_BY_KEY: Record<string, string> = Object.fromEntries(APP_MODULES.map((m) => [m.key, m.legacy]));

/** action → legacy suffix(es) appended to a module's `legacy` prefix. */
function legacySuffixes(action: RoleAction): string[] {
  switch (action) {
    case 'view':
      return ['read'];
    case 'create':
      return ['create', 'write'];
    case 'edit':
      return ['edit', 'write'];
    case 'approve':
      return ['approve'];
    case 'export':
      return ['export'];
    case 'delete':
      return ['delete'];
    case 'manage':
      return ['manage', 'read', 'write'];
    default:
      return [];
  }
}

/**
 * Extra concrete permission keys the existing app checks that don't follow the
 * plain `${legacy}.${suffix}` shape (e.g. "send a circular", manage users/roles).
 */
const EXTRA: Record<string, Partial<Record<RoleAction, string[]>>> = {
  communication: {
    create: ['announcements.send', 'announcements.class', 'communication.parent', 'communication.teacher'],
    edit: ['announcements.send'],
    manage: ['announcements.send'],
  },
  users: {
    manage: ['users.manage', 'user.manage', 'roles.manage', 'user.password.manage'],
  },
  settings: { manage: ['settings.manage'] },
  audit: { view: ['audit.read'] },
  consent: { view: ['privacy.read'], create: ['privacy.write'], edit: ['privacy.write'], manage: ['privacy.write'] },
  childprotection: { view: ['students.read.safety'] },
  counseling: { view: ['students.read.behavior'], create: ['counseling.write'], edit: ['counseling.write'] },
  delegation: { manage: ['delegation.manage'] },
};

/** Compile a module→actions matrix into the flat permission keys the app gates on. */
export function compileMatrix(matrix: PermissionMatrix): string[] {
  const out = new Set<string>();
  for (const [key, actions] of Object.entries(matrix)) {
    const legacy = LEGACY_BY_KEY[key] ?? key;
    for (const a of actions) {
      out.add(`${key}.${a}`); // new-style key (e.g. fees.approve, students.view)
      for (const suf of legacySuffixes(a)) out.add(`${legacy}.${suf}`);
      for (const extra of EXTRA[key]?.[a] ?? []) out.add(extra);
    }
  }
  return [...out];
}

/** Compile a role definition into the permission set the session resolves against. */
export function compileRole(def: Pick<RoleDefinition, 'permissions' | 'wildcard' | 'raw'>): '*' | string[] {
  if (def.wildcard) return '*';
  return [...new Set([...compileMatrix(def.permissions), ...(def.raw ?? [])])];
}
