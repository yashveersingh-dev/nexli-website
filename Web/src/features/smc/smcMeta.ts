import type { IconName } from '@/components/Icon';
import type { SmcMember, SmcRole } from '@/types/compliance';

/* ============================================================================
 * SMC module-local presentation helpers (the shared compliance/meta.ts already
 * exports SMC_ROLE_OPTIONS + SMC_MEETING_STATUS_META — we only add what's
 * specific to this module here).
 * ==========================================================================*/

/** Icon + display order for each SMC role (drives the grouped roster). */
export const SMC_ROLE_META: Record<SmcRole, { label: string; icon: IconName; order: number }> = {
  headmaster: { label: 'Head teacher', icon: 'briefcase', order: 0 },
  parent: { label: 'Parent members', icon: 'users', order: 1 },
  teacher: { label: 'Teacher members', icon: 'user', order: 2 },
  community: { label: 'Community members', icon: 'users', order: 3 },
  local_authority: { label: 'Local authority', icon: 'briefcase', order: 4 },
  sponsor: { label: 'Sponsors', icon: 'user', order: 5 },
};

/**
 * Statutory composition check (RTE 2009, §21): the SMC must have ≥75% parents/
 * guardians, with proportionate representation of disadvantaged groups, and
 * (per the model rules) ≥50% women. We can only verify what the roster captures
 * — parents and women aren't separately flagged — so we surface the parent
 * share as a directional compliance hint, not a hard gate.
 *
 * Roles parent + community count toward the "parent/guardian" bench; the rest
 * (head teacher, teacher, local authority, sponsor) are the institutional side.
 */
/** RTE 2009 §21(b): at least three-fourths of SMC members must be parents/guardians. */
export const RTE_PARENT_SHARE = 0.75;

export interface SmcComposition {
  total: number;
  parents: number;
  parentPct: number;
  /** RTE §21(b) expects parents/guardians to be ≥75% of the committee. */
  parentMajorityMet: boolean;
  hasChairperson: boolean;
}

export function computeComposition(members: SmcMember[]): SmcComposition {
  const active = members.filter((m) => m.active !== false);
  const total = active.length;
  // Only true parent/guardian members count toward the §21(b) three-fourths
  // requirement. Community/local-authority/teacher/head seats are the
  // institutional side and do NOT count as parent representation.
  const parents = active.filter((m) => m.role === 'parent').length;
  const parentPct = total ? Math.round((parents / total) * 100) : 0;
  return {
    total,
    parents,
    parentPct,
    parentMajorityMet: total > 0 && parents / total >= RTE_PARENT_SHARE,
    hasChairperson: active.some((m) => m.isChairperson),
  };
}
