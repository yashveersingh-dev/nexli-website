import type { Vehicle } from '@/types/ops';

export type DocExpiryLevel = 'ok' | 'expiring' | 'expired';

export interface VehicleDoc {
  key: 'fitnessExpiry' | 'insuranceExpiry' | 'pucExpiry' | 'permitExpiry';
  label: string;
  at?: number;
  level: DocExpiryLevel;
  days: number | null;
}

const DAY = 86_400_000;
/** Documents expiring within this window are flagged as "expiring soon". */
export const EXPIRY_WINDOW_DAYS = 30;

const DOC_LABELS: { key: VehicleDoc['key']; label: string }[] = [
  { key: 'fitnessExpiry', label: 'Fitness' },
  { key: 'insuranceExpiry', label: 'Insurance' },
  { key: 'pucExpiry', label: 'PUC' },
  { key: 'permitExpiry', label: 'Permit' },
];

export function docLevel(at?: number, now = Date.now()): { level: DocExpiryLevel; days: number | null } {
  if (!at) return { level: 'ok', days: null };
  const days = Math.floor((at - now) / DAY);
  if (days < 0) return { level: 'expired', days };
  if (days <= EXPIRY_WINDOW_DAYS) return { level: 'expiring', days };
  return { level: 'ok', days };
}

/** All four compliance docs for a vehicle with their expiry level. */
export function vehicleDocs(v: Vehicle, now = Date.now()): VehicleDoc[] {
  return DOC_LABELS.map(({ key, label }) => {
    const at = v[key];
    const { level, days } = docLevel(at, now);
    return { key, label, at, level, days };
  });
}

/** Worst level across a vehicle's documents (for the summary badge). */
export function worstDocLevel(v: Vehicle, now = Date.now()): DocExpiryLevel {
  let worst: DocExpiryLevel = 'ok';
  for (const d of vehicleDocs(v, now)) {
    if (d.level === 'expired') return 'expired';
    if (d.level === 'expiring') worst = 'expiring';
  }
  return worst;
}
