import { useMemo } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useHostelBlocks } from '@/features/ops/data';
import type { HostelBlock } from '@/types/ops';

/** Roles that, when held, see every block (final authority / oversight). */
const SEES_ALL_ROLES = new Set(['chief_warden', 'principal', 'vp_admin', 'director', 'super_admin']);

export interface HostelScope {
  /** Blocks the current user is scoped to (their block, or all). */
  blocks: HostelBlock[];
  /** Block ids the current user is scoped to (empty set ⇒ unscoped / sees all). */
  blockIds: Set<string>;
  /** True for chief warden / leadership / super admin — no block restriction. */
  seesAll: boolean;
  /** True if this user is the chief warden (final approval authority). */
  isChiefWarden: boolean;
  loading: boolean;
}

/**
 * Block-scoping for the hostel module. The chief warden (final authority) and
 * leadership see every block; a block warden / night warden / matron is scoped
 * to their assigned block(s).
 *
 * Scope resolution (strongest first):
 *  1. `member.blockId` — the explicit id-based scope constraint on the member
 *     record (the robust signal; survives a warden being renamed or two wardens
 *     sharing a name). A warden assigned a block they can't see in the loaded set
 *     is still locked to that id (empty view) rather than silently widened.
 *  2. `block.wardenName` case-insensitive match — legacy fallback ONLY when no
 *     `member.blockId` is set, so existing single-field setups keep working.
 *  3. No id and no name match ⇒ fall back to all (an unconfigured warden never
 *     has everything hidden).
 */
export function useHostelScope(): HostelScope {
  const { schoolId, role, secondaryRole, isSuperAdmin, member } = useSession();
  const { data: blocks, loading } = useHostelBlocks(schoolId);

  return useMemo<HostelScope>(() => {
    const isChiefWarden = role === 'chief_warden' || secondaryRole === 'chief_warden';
    const seesAll = isSuperAdmin || isChiefWarden || (!!role && SEES_ALL_ROLES.has(role)) || (!!secondaryRole && SEES_ALL_ROLES.has(secondaryRole));
    if (seesAll) {
      return { blocks, blockIds: new Set(blocks.map((b) => b.id)), seesAll: true, isChiefWarden, loading };
    }
    // (1) Explicit id-based scope: a warden pinned to a block id is locked to it,
    // even if that block isn't in the current set (defends against a stale name).
    const scopedBlockId = member?.blockId;
    if (scopedBlockId) {
      const mine = blocks.filter((b) => b.id === scopedBlockId);
      return { blocks: mine, blockIds: new Set([scopedBlockId]), seesAll: false, isChiefWarden: false, loading };
    }
    // (2) Legacy fallback: match the recorded warden name (case-insensitive).
    const myName = (member?.name ?? '').trim().toLowerCase();
    const mine = myName ? blocks.filter((b) => (b.wardenName ?? '').trim().toLowerCase() === myName) : [];
    // (3) No id, no name match ⇒ unscoped (see all).
    const scoped = mine.length > 0 ? mine : blocks;
    return { blocks: scoped, blockIds: new Set(scoped.map((b) => b.id)), seesAll: mine.length === 0, isChiefWarden: false, loading };
  }, [blocks, role, secondaryRole, isSuperAdmin, member, loading]);
}
