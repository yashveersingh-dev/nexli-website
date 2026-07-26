/**
 * Data-driven role & permission model (spec §4–5, rebuilt).
 *
 * A role is DATA: it has a group, an optional level, and a permission MATRIX
 * (module → the actions allowed there). The bundled `ROLE_CATALOG` is only the
 * default seed; the live source of truth is Firestore (`roleDefinitions/{id}` +
 * optional per-school overrides), so a Super Admin can add/adjust roles, levels
 * and permissions WITHOUT a code change. See `compile.ts` for how a matrix turns
 * into the flat permission keys the app gates on.
 */

/** The action verbs a role can hold on a module (STEP 3 vocabulary). */
export const ROLE_ACTIONS = ['view', 'create', 'edit', 'approve', 'export', 'delete', 'manage'] as const;
export type RoleAction = (typeof ROLE_ACTIONS)[number];

/** Permission matrix: module key → the actions the role may perform there. */
export type PermissionMatrix = Record<string, RoleAction[]>;

/** Top-level groupings a role belongs to (for organisation + the admin UI). */
export type RoleGroupId =
  | 'platform'
  | 'leadership'
  | 'academic'
  | 'administration'
  | 'finance'
  | 'management'
  | 'hostel'
  | 'library'
  | 'healthcare'
  | 'welfare'
  | 'security'
  | 'transport'
  | 'canteen'
  | 'family';

export interface RoleGroupMeta {
  id: RoleGroupId;
  label: string;
  order: number;
  description?: string;
}

/** One role (or a graded level of a role) — the editable, data-driven unit. */
export interface RoleDefinition {
  id: string;
  label: string;
  group: RoleGroupId;
  /** Level label for graded variants, e.g. "Senior" / "Junior" / "Associate". */
  level?: string;
  /** Ordering hint within the group. */
  order: number;
  description?: string;
  /** Module → actions. The heart of the role; edited in the Roles admin UI. */
  permissions: PermissionMatrix;
  /** true → campus-wide wildcard (leadership). Compiles to '*' (all permissions). */
  wildcard?: boolean;
  /** Raw legacy permission keys for things the matrix can't express (e.g. the
   *  section/period scoping of teaching roles). Merged into the compiled set. */
  raw?: string[];
  /** Seeded by NEXLI (true) vs. created by a Super Admin (false/undefined). */
  builtIn?: boolean;
  active?: boolean;
}
