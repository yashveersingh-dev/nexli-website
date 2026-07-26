import { z } from 'zod';
import type { Asset, MaintenanceRequest } from '@/types/ops';

/**
 * Form schemas are string-based (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`); numeric fields are coerced with `Number()` at submit.
 * No `z.coerce` / `.default()` (those diverge the input/output types) — defaults
 * are supplied via `defaultValues`.
 */

/* ------------------------------- helpers ---------------------------------- */

/** A non-negative number string ("" allowed) — for cost / quantity / capacity. */
const numStr = (msg: string) =>
  z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), msg);

/** ISO yyyy-mm-dd (from a native date input) → epoch ms, or undefined. */
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

/* -------------------------------- Asset ----------------------------------- */

export const assetSchema = z.object({
  name: z.string().trim().min(2, 'Asset name required'),
  tag: z.string().trim().optional(),
  category: z.enum(['furniture', 'it', 'lab', 'sports', 'av', 'kitchen', 'vehicle', 'electrical', 'other']),
  location: z.string().trim().optional(),
  facilityId: z.string().optional(),
  quantity: numStr('Enter a valid quantity'),
  purchaseDate: z.string().optional(),
  cost: numStr('Enter a valid amount'),
  vendorName: z.string().trim().optional(),
  warrantyExpiry: z.string().optional(),
  status: z.enum(['in_use', 'in_store', 'maintenance', 'retired', 'lost', 'damaged']),
  assignedTo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type AssetValues = z.infer<typeof assetSchema>;

export const emptyAsset: AssetValues = {
  name: '', tag: '', category: 'furniture', location: '', facilityId: '',
  quantity: '1', purchaseDate: '', cost: '', vendorName: '', warrantyExpiry: '',
  status: 'in_use', assignedTo: '', notes: '',
};

/** Map an existing Asset record to editable form values. */
export function assetToForm(a: Asset): AssetValues {
  return {
    name: a.name ?? '',
    tag: a.tag ?? '',
    category: a.category,
    location: a.location ?? '',
    facilityId: a.facilityId ?? '',
    quantity: a.quantity != null ? String(a.quantity) : '',
    purchaseDate: msToIso(a.purchaseDate),
    cost: a.cost != null ? String(a.cost) : '',
    vendorName: a.vendorName ?? '',
    warrantyExpiry: msToIso(a.warrantyExpiry),
    status: a.status,
    assignedTo: a.assignedTo ?? '',
    notes: a.notes ?? '',
  };
}

/** Map form values to an Asset payload (undefined-stripped downstream). */
export function formToAsset(v: AssetValues): Omit<Asset, 'id' | 'schoolId'> {
  return {
    name: v.name.trim(),
    tag: v.tag?.trim() || undefined,
    category: v.category,
    location: v.location?.trim() || undefined,
    facilityId: v.facilityId || undefined,
    quantity: v.quantity ? Number(v.quantity) : undefined,
    purchaseDate: isoToMs(v.purchaseDate),
    cost: v.cost ? Number(v.cost) : undefined,
    vendorName: v.vendorName?.trim() || undefined,
    warrantyExpiry: isoToMs(v.warrantyExpiry),
    status: v.status,
    assignedTo: v.assignedTo?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}

/** True when an asset's warranty expires within `days` (default 30) and is still set. */
export function warrantyExpiringSoon(t?: number, days = 30): boolean {
  if (!t) return false;
  const now = Date.now();
  const horizon = now + days * 24 * 60 * 60 * 1000;
  return t >= now && t <= horizon;
}

export function warrantyExpired(t?: number): boolean {
  return !!t && t < Date.now();
}

/* ----------------------------- Maintenance -------------------------------- */

export const maintenanceSchema = z.object({
  title: z.string().trim().min(3, 'Describe the issue briefly'),
  description: z.string().trim().optional(),
  assetId: z.string().optional(),
  facilityId: z.string().optional(),
  location: z.string().trim().optional(),
  category: z.enum(['furniture', 'it', 'lab', 'sports', 'av', 'kitchen', 'vehicle', 'electrical', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export type MaintenanceValues = z.infer<typeof maintenanceSchema>;

export const emptyMaintenance: MaintenanceValues = {
  title: '', description: '', assetId: '', facilityId: '', location: '',
  category: undefined, priority: 'medium',
};

/** Map form values to a new MaintenanceRequest payload. */
export function formToMaintenance(v: MaintenanceValues): Omit<MaintenanceRequest, 'id' | 'schoolId'> {
  return {
    title: v.title.trim(),
    description: v.description?.trim() || undefined,
    assetId: v.assetId || undefined,
    facilityId: v.facilityId || undefined,
    location: v.location?.trim() || undefined,
    category: v.category,
    priority: v.priority,
    status: 'open',
    reportedAt: Date.now(),
  };
}

/** Sequential, human-readable ticket number e.g. MT-2026-0042. */
export function nextTicketNo(existing: { ticketNo?: string }[], now = new Date()): string {
  const year = now.getFullYear();
  const prefix = `MT-${year}-`;
  let max = 0;
  for (const t of existing) {
    if (t.ticketNo?.startsWith(prefix)) {
      const n = Number(t.ticketNo.slice(prefix.length));
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}
