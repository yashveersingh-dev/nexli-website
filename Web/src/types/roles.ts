/**
 * NEXLI role directory.
 *
 * Roles are now DATA-DRIVEN (see src/lib/roles/*). `RoleId` is intentionally a
 * loose string so a Super Admin can add NEW roles/levels as data (Firestore)
 * WITHOUT a code change; the built-in roles live in the role catalogue and the
 * `ROLES` directory below is derived from it.
 */
import { ROLE_CATALOG } from '@/lib/roles/catalog';
import type { RoleGroupId } from '@/lib/roles/types';

export type RoleId = string;

/** Legacy permission-tier / cluster taxonomy — retained for reference only
 *  (gating is driven by the catalogue's permission matrices, not these). */
export type PermissionTier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';
export type RoleCluster =
  | 'platform' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface RoleMeta {
  id: string;
  label: string;
  group?: RoleGroupId;
  level?: string;
}

/** Built-in role directory (id → label/group/level), derived from the catalogue. */
export const ROLES: Record<string, RoleMeta> = Object.fromEntries(
  ROLE_CATALOG.map((d) => [d.id, { id: d.id, label: d.label, group: d.group, level: d.level }]),
);

/**
 * Roles permitted to manage (reset/change) other users' passwords. Leadership,
 * senior admin/office, HR leadership and IT — the roles a school trusts with
 * account recovery. (Data-driven role edits don't change this list; it's a
 * sensitive capability kept in code.)
 */
export const PASSWORD_MANAGER_ROLES: RoleId[] = [
  'super_admin',
  'principal', 'head_of_school', 'headmaster', 'headmistress',
  'director', 'regional_director', 'cluster_director',
  'vp_admin', 'vp_academic', 'academic_director',
  'academic_coordinator', 'hod',
  'administrator', 'admin_officer', 'school_manager', 'admin_manager', 'registrar',
  'hr_director', 'hr_manager', 'it_manager', 'it_admin',
];
