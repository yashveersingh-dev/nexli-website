import { z } from 'zod';
import type { ItAsset } from './types';

/**
 * String-based form schemas (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`). Dates come from native date inputs as ISO strings
 * and are converted to epoch ms at submit. No `z.coerce` / `.default()` (those
 * diverge input/output types) — defaults are supplied via `defaultValues`.
 */

/** ISO yyyy-mm-dd → epoch ms, or undefined. */
export const isoToMs = (v?: string): number | undefined => {
  if (!v) return undefined;
  const t = new Date(`${v}T00:00:00`).getTime();
  return Number.isNaN(t) ? undefined : t;
};

/** Epoch ms → ISO yyyy-mm-dd for a native date input value. */
export const msToIso = (t?: number): string => {
  if (!t) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* -------------------------------- Device ---------------------------------- */

export const assetSchema = z.object({
  name: z.string().trim().min(2, 'Device name required'),
  type: z.enum(['desktop', 'laptop', 'tablet', 'projector', 'printer', 'network', 'server', 'peripheral', 'other']),
  assetTag: z.string().trim().optional(),
  serialNo: z.string().trim().optional(),
  location: z.string().trim().optional(),
  assignedTo: z.string().trim().optional(),
  status: z.enum(['in_use', 'spare', 'repair', 'retired']),
  warrantyUntil: z.string().optional(),
  notes: z.string().trim().optional(),
});

export type AssetValues = z.infer<typeof assetSchema>;

export const emptyAsset: AssetValues = {
  name: '', type: 'desktop', assetTag: '', serialNo: '', location: '',
  assignedTo: '', status: 'in_use', warrantyUntil: '', notes: '',
};

export function assetToForm(a: ItAsset): AssetValues {
  return {
    name: a.name ?? '',
    type: a.type,
    assetTag: a.assetTag ?? '',
    serialNo: a.serialNo ?? '',
    location: a.location ?? '',
    assignedTo: a.assignedTo ?? '',
    status: a.status,
    warrantyUntil: msToIso(a.warrantyUntil),
    notes: a.notes ?? '',
  };
}

export function formToAsset(v: AssetValues): Omit<ItAsset, 'id' | 'schoolId'> {
  return {
    name: v.name.trim(),
    type: v.type,
    assetTag: v.assetTag?.trim() || undefined,
    serialNo: v.serialNo?.trim() || undefined,
    location: v.location?.trim() || undefined,
    assignedTo: v.assignedTo?.trim() || undefined,
    status: v.status,
    warrantyUntil: isoToMs(v.warrantyUntil),
    notes: v.notes?.trim() || undefined,
  };
}

/** True when warranty expires within `days` (default 30) and is still set. */
export function warrantyExpiringSoon(t?: number, days = 30): boolean {
  if (!t) return false;
  const now = Date.now();
  return t >= now && t <= now + days * 24 * 60 * 60 * 1000;
}

export function warrantyExpired(t?: number): boolean {
  return !!t && t < Date.now();
}
