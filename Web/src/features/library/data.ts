/**
 * Library-module data layer (settings). Book catalog + circulation live in the
 * shared `features/daily/data.ts` layer; this file holds only the library-specific
 * settings doc (`library_settings/main`) — kept here so the library module owns its
 * own configuration without touching the shared daily layer.
 */
import { setDoc } from 'firebase/firestore';
import { tenantDoc, useDocument } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import type { Actor } from '@/features/daily/data';

// The pure fine-rate resolver lives in the Firebase-free `./fines` module (so it is
// unit-testable in the node vitest env); re-exported here for the library data API.
export { finePerDay, DEFAULT_FINE_PER_DAY } from './fines';

/** Per-school library configuration (one doc: library_settings/main). */
export interface LibrarySettings {
  /** Overdue fine charged per day, in whole rupees. Falls back to the default. */
  finePerDay?: number;
  /** Default loan period in days (informational; issue UI still defaults to 14). */
  loanPeriodDays?: number;
}

export function useLibrarySettings(schoolId?: string) {
  return useDocument<LibrarySettings & { id: string }>(schoolId ? tenantDoc(schoolId, 'library_settings', 'main') : null);
}

export async function saveLibrarySettings(schoolId: string, patch: LibrarySettings, actor: Actor): Promise<void> {
  const clean: Record<string, number> = {};
  if (typeof patch.finePerDay === 'number' && Number.isFinite(patch.finePerDay)) clean.finePerDay = Math.max(0, patch.finePerDay);
  if (typeof patch.loanPeriodDays === 'number' && Number.isFinite(patch.loanPeriodDays)) clean.loanPeriodDays = Math.max(0, patch.loanPeriodDays);
  await setDoc(tenantDoc(schoolId, 'library_settings', 'main'), { ...clean, schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  void writeAuditEvent({ action: 'settings.changed', schoolId, actor, targetType: 'library_settings', summary: 'Library settings updated' });
}
