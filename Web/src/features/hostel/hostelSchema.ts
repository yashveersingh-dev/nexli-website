import { z } from 'zod';

/**
 * Hostel form schemas. String-based (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`); numeric fields stay `z.string()` and are coerced at
 * submit. No `z.coerce` / `.default()` (those diverge input/output types) —
 * defaults are supplied via `defaultValues`. Mirrors `feeSchema.ts` / `visitorSchema.ts`.
 */

const phoneRule = z.string().trim().refine((v) => v === '' || /^\d{10}$/.test(v), 'Enter a 10-digit mobile');
const posIntRule = (msg: string) => z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 9999), msg);

/* ------------------------------- Block ------------------------------------ */
export const blockSchema = z.object({
  name: z.string().trim().min(2, 'Block name required'),
  type: z.enum(['boys', 'girls', 'mixed']),
  wardenName: z.string().trim().optional(),
  wardenPhone: phoneRule,
  floors: posIntRule('Floors 1–9999'),
  capacity: z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 99999), 'Enter a valid capacity'),
});
export type BlockValues = z.infer<typeof blockSchema>;
export const emptyBlock: BlockValues = { name: '', type: 'boys', wardenName: '', wardenPhone: '', floors: '', capacity: '' };

/* -------------------------------- Room ------------------------------------ */
export const roomSchema = z.object({
  number: z.string().trim().min(1, 'Room number required'),
  floor: z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 9999), 'Enter a valid floor'),
  capacity: posIntRule('Capacity 1–9999'),
});
export type RoomValues = z.infer<typeof roomSchema>;
export const emptyRoom: RoomValues = { number: '', floor: '', capacity: '2' };

/* ----------------------------- Allocation --------------------------------- */
export const allocationSchema = z.object({
  studentId: z.string().min(1, 'Pick a student'),
  blockId: z.string().min(1, 'Pick a block'),
  roomId: z.string().min(1, 'Pick a room'),
  bedNo: z.string().trim().optional(),
  fromDate: z.string().optional(),
});
export type AllocationValues = z.infer<typeof allocationSchema>;
export const emptyAllocation = (fromDate: string): AllocationValues => ({
  studentId: '', blockId: '', roomId: '', bedNo: '', fromDate,
});

/* ------------------------------- Exeat ------------------------------------ */
export const exeatSchema = z.object({
  studentId: z.string().min(1, 'Pick a student'),
  type: z.enum(['day_out', 'overnight', 'home', 'medical']),
  reason: z.string().trim().min(3, 'Add a brief reason'),
  destination: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianPhone: phoneRule,
  expectedReturn: z.string().min(1, 'Expected return required'),
});
export type ExeatValues = z.infer<typeof exeatSchema>;
export const emptyExeat = (expectedReturn: string): ExeatValues => ({
  studentId: '', type: 'day_out', reason: '', destination: '', guardianName: '', guardianPhone: '', expectedReturn,
});

/* ----------------------------- Gate pass ---------------------------------- */
export const gatePassSchema = z.object({
  studentId: z.string().min(1, 'Pick a boarder'),
  type: z.enum(['day_out', 'overnight', 'home', 'medical', 'market', 'sports']),
  reason: z.string().trim().min(3, 'Add a brief reason'),
  destination: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianPhone: phoneRule,
  expectedReturn: z.string().min(1, 'Expected return required'),
});
export type GatePassValues = z.infer<typeof gatePassSchema>;
export const emptyGatePass = (expectedReturn: string): GatePassValues => ({
  studentId: '', type: 'day_out', reason: '', destination: '', guardianName: '', guardianPhone: '', expectedReturn,
});

/* ------------------------------- Dietary ---------------------------------- */
export const dietSchema = z.object({
  studentId: z.string().min(1, 'Pick a boarder'),
  preference: z.enum(['veg', 'non_veg', 'jain', 'vegan', 'eggetarian']),
  noOnionGarlic: z.boolean(),
  allergies: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type DietValues = z.infer<typeof dietSchema>;
export const emptyDiet: DietValues = { studentId: '', preference: 'veg', noOnionGarlic: false, allergies: '', notes: '' };

/* ------------------------------- Incident --------------------------------- */
export const incidentSchema = z.object({
  kind: z.enum(['discipline', 'health', 'damage', 'bullying', 'safety', 'other']),
  studentId: z.string().trim().optional(),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string().trim().min(3, 'Add a short title'),
  description: z.string().trim().optional(),
  escalatedToNurse: z.boolean(),
});
export type IncidentValues = z.infer<typeof incidentSchema>;
export const emptyIncident: IncidentValues = { kind: 'discipline', studentId: '', severity: 'low', title: '', description: '', escalatedToNurse: false };

/* ------------------------------- helpers ---------------------------------- */
/** Local datetime string (yyyy-MM-ddThh:mm) for `datetime-local` inputs. */
export function toLocalDateTime(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
/** A sensible default expected-return: tomorrow 18:00 local. */
export function defaultExpectedReturn(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return toLocalDateTime(d.getTime());
}
