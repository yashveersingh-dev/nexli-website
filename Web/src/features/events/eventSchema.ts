import { z } from 'zod';
import type { EventAudience, EventStatus, EventType } from '@/types/community';

const TYPES = [
  'academic', 'sports', 'cultural', 'celebration', 'excursion',
  'competition', 'workshop', 'ptm', 'holiday', 'other',
] as const;
const AUDIENCES = ['whole_school', 'staff', 'parents', 'students', 'grade', 'invitees'] as const;
const STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'] as const;

/** Empty string passes (optional); otherwise must be a non-negative integer. */
const optInt = (label: string) =>
  z.string().refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) >= 0), `Enter a valid ${label}.`);

/**
 * String-based schema (input === output) so it satisfies `ZodType<EventValues>`
 * for the RHF <Form> kit. No z.coerce / .default(); numerics stay strings and
 * are Number()-coerced at submit. Dates are `datetime-local` strings (or '' for
 * all-day where only the date matters via startDate).
 */
export const eventSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a short, clear title (min 3 characters).').max(140, 'Keep the title under 140 characters.'),
    type: z.enum(TYPES),
    description: z.string().trim().max(4000, 'Keep the description under 4000 characters.'),
    startDate: z.string().min(1, 'Pick when the event starts.'),
    endDate: z.string(),
    allDay: z.boolean(),
    venue: z.string().trim().max(160, 'Keep the venue under 160 characters.'),
    audience: z.enum(AUDIENCES),
    gradeId: z.string(),
    organiser: z.string().trim().max(120, 'Keep the organiser under 120 characters.'),
    registrationRequired: z.boolean(),
    capacity: optInt('capacity'),
    fee: optInt('fee'),
    status: z.enum(STATUSES),
  })
  .superRefine((v, ctx) => {
    if (v.audience === 'grade' && !v.gradeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gradeId'], message: 'Pick the grade this event is for.' });
    }
    if (v.startDate && v.endDate) {
      const s = new Date(v.startDate).getTime();
      const e = new Date(v.endDate).getTime();
      if (Number.isFinite(s) && Number.isFinite(e) && e < s) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End must be on or after the start.' });
      }
    }
  });

export type EventValues = {
  title: string;
  type: EventType;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  venue: string;
  audience: EventAudience;
  gradeId: string;
  organiser: string;
  registrationRequired: boolean;
  capacity: string;
  fee: string;
  status: EventStatus;
};
