import { z } from 'zod';
import type {
  RequisitionItem, POItem, ExpenseCategory, PaymentMethod,
} from '@/types/finance';

/**
 * Form schemas are string-based (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`). Numeric fields stay strings and are `Number()`-coerced
 * at submit; defaults come from `defaultValues`. Avoids `z.coerce`/`.default()`
 * which diverge input/output types and fail to compile. Mirrors `feeSchema.ts`.
 */

const numStr = (msg = 'Enter a valid amount') =>
  z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), msg);

const posNumStr = (msg = 'Enter a quantity') =>
  z.string().refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0, msg);

/* ----------------------------- Expense ----------------------------- */

const EXPENSE_CATEGORIES = [
  'utilities', 'maintenance', 'stationery', 'lab', 'sports',
  'transport', 'events', 'rent', 'salary', 'procurement', 'misc',
] as const;

const PAYMENT_METHODS = ['cash', 'cheque', 'dd', 'upi', 'bank_transfer', 'card', 'online'] as const;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(2, 'Describe the expense'),
  vendorId: z.string().optional(),
  amount: posNumStr('Enter the amount'),
  date: z.string().min(1, 'Pick a date'),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().optional(),
  pettyCash: z.boolean(),
  billUrl: z.string().trim().optional(),
});
export type ExpenseValues = z.infer<typeof expenseSchema>;

/* --------------------------- Requisition --------------------------- */

const reqItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name required'),
  qty: posNumStr('Qty'),
  unit: z.string().optional(),
  estCost: numStr('Est. cost'),
});

export const requisitionSchema = z.object({
  title: z.string().trim().min(2, 'Name this request'),
  department: z.string().optional(),
  justification: z.string().optional(),
  items: z.array(reqItemSchema).min(1, 'Add at least one item'),
});
export type RequisitionValues = z.infer<typeof requisitionSchema>;

export function itemsToRequisition(values: RequisitionValues): RequisitionItem[] {
  return values.items.map((it) => ({
    name: it.name.trim(),
    qty: Number(it.qty) || 0,
    unit: it.unit?.trim() || undefined,
    estCost: it.estCost === '' ? undefined : Number(it.estCost) || 0,
  }));
}

export function requisitionEstTotal(items: { qty: string; estCost: string }[]): number {
  return items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.estCost) || 0), 0);
}

/* ------------------------- Purchase order -------------------------- */

const poItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name required'),
  qty: posNumStr('Qty'),
  unit: z.string().optional(),
  rate: numStr('Rate'),
});

export const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  expectedDate: z.string().optional(),
  taxPercent: numStr('Tax %'),
  note: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
});
export type PurchaseOrderValues = z.infer<typeof purchaseOrderSchema>;

export function lineAmount(qty: string, rate: string): number {
  return (Number(qty) || 0) * (Number(rate) || 0);
}

export function poSubtotal(items: { qty: string; rate: string }[]): number {
  return items.reduce((sum, it) => sum + lineAmount(it.qty, it.rate), 0);
}

export function poTotals(items: { qty: string; rate: string }[], taxPercent: string) {
  const subtotal = poSubtotal(items);
  const tax = Math.max(0, Number(taxPercent) || 0);
  const taxAmount = Math.round((subtotal * tax) / 100);
  return { subtotal, taxPercent: tax, taxAmount, total: subtotal + taxAmount };
}

export function itemsToPO(values: PurchaseOrderValues): POItem[] {
  return values.items.map((it) => ({
    name: it.name.trim(),
    qty: Number(it.qty) || 0,
    unit: it.unit?.trim() || undefined,
    rate: Number(it.rate) || 0,
    amount: lineAmount(it.qty, it.rate),
    receivedQty: 0,
  }));
}

/* --------------------- Number generation helper -------------------- */

/** Human-readable doc number, e.g. EXP-2026-0007. Free-tier: not strictly unique. */
export function docNumber(prefix: string, count: number, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

/* ------------------------- Shared coercion ------------------------- */

export type { ExpenseCategory, PaymentMethod };
