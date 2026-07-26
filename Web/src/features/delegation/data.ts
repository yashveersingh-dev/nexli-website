import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { moduleDisplayName } from '@/lib/ownership';
import type { Delegation } from '@/lib/delegation';
import type { Member } from '@/types/models';

/**
 * Data layer for temporary operational delegations. Reads/writes
 * `schools/{schoolId}/delegations`. Each grant/revoke is audited (reason +
 * timestamp + actor), satisfying the owner's audit requirement. Enforcement is
 * UI-level for now (see `useOwnership`); DB rules follow in P9.
 */

const SUB = 'delegations';

export interface Actor {
  uid: string;
  name?: string;
}

/** All delegations for the school (active + historical), newest first. */
export function useDelegations(schoolId?: string) {
  return useCollection<Delegation>(schoolId ? tenantCol(schoolId, SUB) : null, [schoolId]);
}

/** School login accounts (members) — candidates to delegate to. Doc id = uid. */
export function useMembers(schoolId?: string) {
  return useCollection<Member & { id: string }>(schoolId ? tenantCol(schoolId, 'members') : null, [schoolId]);
}

export interface GrantDelegationInput {
  delegate: Pick<Member, 'uid' | 'name' | 'roleId'>;
  moduleKey: string;
  reason: string;
  fromAt: number;
  untilAt: number;
}

/** Grant a temporary operate delegation. Writes the doc + an audit entry. */
export async function grantDelegation(
  schoolId: string,
  input: GrantDelegationInput,
  by: Actor,
): Promise<string> {
  const moduleLabel = moduleDisplayName(input.moduleKey);
  const doc: Omit<Delegation, 'id'> = {
    schoolId,
    delegateUid: input.delegate.uid,
    delegateName: input.delegate.name,
    delegateRole: input.delegate.roleId,
    moduleKey: input.moduleKey,
    moduleLabel,
    reason: input.reason.trim(),
    fromAt: input.fromAt,
    untilAt: input.untilAt,
    grantedByUid: by.uid,
    grantedByName: by.name ?? 'Leadership',
    active: true,
    createdAt: Date.now(),
    createdBy: by.uid,
    version: 1,
  };
  const ref = await addDoc(tenantCol(schoolId, SUB), { ...doc, serverCreatedAt: serverTimestamp() });
  void writeAuditEvent({
    action: 'delegation.granted',
    schoolId,
    actor: by,
    targetType: 'delegation',
    targetId: ref.id,
    summary: `${input.delegate.name} granted "${moduleLabel}" until ${new Date(input.untilAt).toLocaleString('en-IN')}`,
    details: {
      delegateUid: input.delegate.uid,
      moduleKey: input.moduleKey,
      reason: input.reason.trim(),
      fromAt: input.fromAt,
      untilAt: input.untilAt,
    },
  });
  return ref.id;
}

/** Revoke a delegation early (kept in the log for audit). */
export async function revokeDelegation(
  schoolId: string,
  delegation: Delegation,
  by: Actor,
): Promise<void> {
  await updateDoc(tenantDoc(schoolId, SUB, delegation.id), {
    active: false,
    revokedAt: Date.now(),
    revokedByUid: by.uid,
    revokedByName: by.name ?? 'Leadership',
    lastModifiedAt: Date.now(),
    lastModifiedBy: by.uid,
  });
  void writeAuditEvent({
    action: 'delegation.revoked',
    schoolId,
    actor: by,
    targetType: 'delegation',
    targetId: delegation.id,
    summary: `${delegation.delegateName}'s "${delegation.moduleLabel}" delegation revoked`,
    details: { delegateUid: delegation.delegateUid, moduleKey: delegation.moduleKey },
  });
}
