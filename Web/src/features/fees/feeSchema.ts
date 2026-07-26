import { z } from 'zod';
import { FEE_FREQUENCY_META } from '@/features/finance/meta';
import type { FeeStructureItem, InvoiceLine, ConcessionLine, FeeFrequency } from '@/types/finance';

/** Annualised value of a fee item (term ×3, monthly ×12). */
export function annualize(amount: number, frequency: FeeFrequency): number {
  return Math.round(amount * (FEE_FREQUENCY_META[frequency]?.perYear ?? 1));
}

export function structureTotal(items: { amount: number; frequency: FeeFrequency }[]): number {
  return items.reduce((sum, it) => sum + annualize(Number(it.amount) || 0, it.frequency), 0);
}

export function invoiceTotals(lines: InvoiceLine[], concessions: ConcessionLine[] = []) {
  const grossAmount = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const concessionAmount = concessions.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const netAmount = Math.max(0, grossAmount - concessionAmount);
  return { grossAmount, concessionAmount, netAmount };
}

/** Sum outstanding across a student's invoices (ignoring cancelled). */
export function studentDue(invoices: { netAmount: number; paidAmount: number; status: string }[]): { due: number; paid: number; billed: number } {
  let due = 0, paid = 0, billed = 0;
  for (const i of invoices) {
    if (i.status === 'cancelled') continue;
    billed += i.netAmount ?? 0;
    paid += i.paidAmount ?? 0;
    due += Math.max(0, (i.netAmount ?? 0) - (i.paidAmount ?? 0));
  }
  return { due, paid, billed };
}

/**
 * Form schemas are string-based (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`); numbers are coerced at submit. Avoids `z.coerce`/
 * `.default()` which diverge the input/output types.
 */
const itemSchema = z.object({
  headId: z.string().min(1, 'Pick a fee head'),
  headName: z.string(),
  category: z.string(),
  amount: z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a valid amount'),
  frequency: z.enum(['one_time', 'annual', 'term', 'monthly']),
});

export const feeStructureSchema = z.object({
  name: z.string().trim().min(2, 'Name the structure'),
  academicYear: z.string().trim().min(4, 'Academic year required'),
  gradeId: z.string().optional(),
  studentCategory: z.enum(['general', 'rte', 'staff_ward', 'sibling', 'concession']),
  items: z.array(itemSchema).min(1, 'Add at least one fee head'),
  active: z.boolean(),
});

export type FeeStructureValues = z.infer<typeof feeStructureSchema>;

export function itemsToStructure(values: FeeStructureValues, headName: (id: string) => string, headCategory: (id: string) => string): FeeStructureItem[] {
  return values.items.map((it) => ({
    headId: it.headId,
    headName: headName(it.headId) || it.headName,
    category: (headCategory(it.headId) || it.category) as FeeStructureItem['category'],
    amount: Number(it.amount) || 0,
    frequency: it.frequency,
  }));
}
