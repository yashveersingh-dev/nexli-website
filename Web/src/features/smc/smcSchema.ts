import { z } from 'zod';
import type { SmcMeeting } from '@/types/compliance';

/* ============================================================================
 * SMC (School Management Committee) form schemas — string-based
 * (input === output) to satisfy the kit `Form<T>` (no z.coerce / .default()).
 * Numerics are kept as strings and Number()-coerced at submit. Defaults come
 * from `defaultValues`. Mirrors compliance/complianceSchema.ts.
 * ==========================================================================*/

const iso = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');

/* ------------------------------- Meeting ---------------------------------- */
export const smcMeetingSchema = z.object({
  title: z.string().trim().min(2, 'Title required'),
  date: z.string().min(1, 'Pick a date'),
  venue: z.string().trim().optional(),
  agenda: z.string().trim().optional(),
});

export type SmcMeetingValues = z.infer<typeof smcMeetingSchema>;

export const emptySmcMeeting = (): SmcMeetingValues => ({
  title: '',
  date: iso(Date.now() + 7 * 86400000),
  venue: '',
  agenda: '',
});

export function meetingToForm(m: SmcMeeting): SmcMeetingValues {
  return {
    title: m.title,
    date: iso(m.date),
    venue: m.venue ?? '',
    agenda: m.agenda ?? '',
  };
}

export function formToMeeting(v: SmcMeetingValues): Omit<SmcMeeting, 'id' | 'schoolId' | 'status'> {
  return {
    title: v.title.trim(),
    date: new Date(`${v.date}T00:00:00`).getTime(),
    venue: v.venue?.trim() || undefined,
    agenda: v.agenda?.trim() || undefined,
  };
}
