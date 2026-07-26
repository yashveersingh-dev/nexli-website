import { z } from 'zod';
import type { ComplianceItem } from '@/types/compliance';

/** String-based (input === output) to satisfy the kit `Form<T>`. */
export const complianceItemSchema = z.object({
  title: z.string().trim().min(2, 'Title required'),
  category: z.enum(['statutory', 'affiliation', 'safety', 'financial', 'tax', 'labour', 'academic', 'infrastructure', 'data_privacy', 'other']),
  authority: z.string().trim().optional(),
  description: z.string().trim().optional(),
  dueDate: z.string().min(1, 'Pick a due date'),
  frequency: z.enum(['one_time', 'monthly', 'quarterly', 'half_yearly', 'annual']),
  assignedToName: z.string().trim().optional(),
  reminderDays: z.string().refine((v) => v === '' || (Number(v) >= 0 && Number(v) <= 365), '0–365 days'),
  notes: z.string().trim().optional(),
});

export type ComplianceItemValues = z.infer<typeof complianceItemSchema>;

const iso = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');

export const emptyComplianceItem = (): ComplianceItemValues => ({
  title: '', category: 'statutory', authority: '', description: '',
  dueDate: iso(Date.now() + 7 * 86400000), frequency: 'annual', assignedToName: '', reminderDays: '7', notes: '',
});

export function itemToForm(it: ComplianceItem): ComplianceItemValues {
  return {
    title: it.title, category: it.category, authority: it.authority ?? '', description: it.description ?? '',
    dueDate: iso(it.dueDate), frequency: it.frequency, assignedToName: it.assignedToName ?? '',
    reminderDays: it.reminderDays != null ? String(it.reminderDays) : '7', notes: it.notes ?? '',
  };
}

export function formToItem(v: ComplianceItemValues): Omit<ComplianceItem, 'id' | 'schoolId' | 'status'> {
  return {
    title: v.title.trim(),
    category: v.category,
    authority: v.authority?.trim() || undefined,
    description: v.description?.trim() || undefined,
    dueDate: new Date(`${v.dueDate}T00:00:00`).getTime(),
    frequency: v.frequency,
    assignedToName: v.assignedToName?.trim() || undefined,
    reminderDays: v.reminderDays ? Number(v.reminderDays) : undefined,
    notes: v.notes?.trim() || undefined,
  };
}

/** Derive an effective status (auto-overdue) for display. */
export function effectiveStatus(it: ComplianceItem): ComplianceItem['status'] {
  if (it.status === 'filed' || it.status === 'na') return it.status;
  if (it.dueDate < Date.now()) return 'overdue';
  return it.status;
}
