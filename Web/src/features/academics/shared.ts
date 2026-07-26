import { useMemo } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { isReviewer as ownIsReviewer } from '@/lib/ownership';
import { ROLE_PERMISSIONS } from '@/lib/rbac';
import type { Actor } from '@/features/school/data';
import type { RoleId } from '@/types/roles';
import type { Section } from '@/types/models';

/** Session-derived actor for academics writers ({ uid, name }). */
export function useActor(): Actor {
  const { uid, member } = useSession();
  return useMemo(() => ({ uid: uid ?? 'unknown', name: member?.name }), [uid, member?.name]);
}

/**
 * Section-level data scope for a staff member (mirrors `MarkAttendancePage`).
 *
 * RBAC's nav inference lets a SCOPED grant (e.g. `students.read.section`,
 * `gradebook.read.subject`) satisfy an UNSCOPED nav request — on the promise that
 * "the page itself further scopes the data". This hook is that scope: it returns
 * the set of section ids a non-broad staffer may legitimately see (the UNION of
 * `member.sectionIds` and any section where they are the class teacher).
 *
 * `isBroad` users (Super Admin, leadership/coordinator reviewers for the module,
 * or a holder of the module-wide read permission) are NOT scoped — they see all.
 * Returns `{ isBroad, sectionIds }`; when `isBroad`, `sectionIds` is `null`
 * (meaning "no restriction"), otherwise the allowed-section Set.
 *
 * Design (conservative — narrows ONLY the section-scoped teacher roles):
 * a user is SCOPED iff they actually hold the `${broadPermission}.section` grant
 * (e.g. `students.read.section`, `gradebook.read.subject`) and are NOT a
 * reviewer/leadership/Super-Admin. Everyone else — coordinators/VP (`students.read`),
 * front desk (`students.read.basic`), librarian/counselor, reviewers — stays BROAD,
 * so reception/library/oversight access is never regressed. Class teachers are also
 * scoped to any section where they are the assigned `classTeacherUid`.
 *
 * @param moduleKey ownership key used to decide reviewer/leadership status.
 * @param broadPermission base read permission (e.g. 'students.read'); the function
 *   looks for the `…​.section`/`…​.subject` scoped variant of it. Omit (`undefined`)
 *   when the module's permission is uniformly unscoped across roles (e.g. homework),
 *   where scoping is driven purely by class-teacher assignment + non-reviewer status.
 */
const SCOPE_SUFFIXES = ['.section', '.subject', '.period'] as const;

export function useScopedSectionIds(
  moduleKey: string,
  broadPermission: string | undefined,
  sections: Section[],
): { isBroad: boolean; sectionIds: Set<string> | null } {
  const { uid, member, role, secondaryRole, isSuperAdmin } = useSession();
  return useMemo(() => {
    const isReviewer =
      isSuperAdmin ||
      ownIsReviewer(role, moduleKey) ||
      (!!secondaryRole && ownIsReviewer(secondaryRole, moduleKey));
    if (isReviewer) return { isBroad: true, sectionIds: null };

    // Does this user hold a section/subject-scoped read grant for the module?
    const granted = member?.grantedPermissions ?? [];
    const holdsScopedGrant =
      !!broadPermission &&
      (SCOPE_SUFFIXES.some((suf) => granted.includes(`${broadPermission}${suf}`)) ||
        roleHasScoped(role, broadPermission) ||
        (!!secondaryRole && roleHasScoped(secondaryRole, broadPermission)));
    // A class teacher is scoped to the section(s) they own; a member with explicit
    // section assignments is scoped to those.
    const ownsAnySection = !!uid && sections.some((s) => s.classTeacherUid === uid);
    const hasSectionAssignment = (member?.sectionIds?.length ?? 0) > 0;
    // For uniformly-unscoped modules (broadPermission omitted, e.g. homework), a
    // non-reviewer who has any section signal is scoped to it.
    const scopedByAssignment = !broadPermission && (ownsAnySection || hasSectionAssignment);

    if (!holdsScopedGrant && !ownsAnySection && !scopedByAssignment) return { isBroad: true, sectionIds: null };

    const owned = new Set<string>(member?.sectionIds ?? []);
    for (const s of sections) if (uid && s.classTeacherUid === uid) owned.add(s.id);
    return { isBroad: false, sectionIds: owned };
  }, [moduleKey, broadPermission, sections, uid, member, role, secondaryRole, isSuperAdmin]);
}

/** Does a role hold the `.section`/`.subject`/`.period`-scoped variant of `permission`? */
function roleHasScoped(role: RoleId | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (perms === '*' || !Array.isArray(perms)) return false; // '*' = full access = broad
  // Scoped ONLY when they hold a scoped variant but NOT the unscoped grant.
  if (perms.includes(permission)) return false;
  return SCOPE_SUFFIXES.some((suf) => perms.includes(`${permission}${suf}`));
}

/** Build {value,label} options for a staff Select (id-based, with a leading blank). */
export function staffOptions(
  staff: { id: string; name?: string }[],
  blank = '— None —',
): { value: string; label: string }[] {
  return [
    { value: '', label: blank },
    ...staff
      .slice()
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      .map((s) => ({ value: s.id, label: s.name ?? 'Unnamed' })),
  ];
}

/** Resolve a staff display name from an id. */
export function staffName(staff: { id: string; name?: string }[], id?: string): string | undefined {
  if (!id) return undefined;
  return staff.find((s) => s.id === id)?.name;
}
