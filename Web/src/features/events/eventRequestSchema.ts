import { z } from 'zod';
import type { EventType } from '@/types/community';

const TYPES = [
  'academic', 'sports', 'cultural', 'celebration', 'excursion',
  'competition', 'workshop', 'ptm', 'holiday', 'other',
] as const;

/**
 * Lighter "Teacher Event Request" schema. String-based (input === output) so it
 * satisfies `ZodType<EventRequestValues>` for the RHF <Form> kit — no z.coerce /
 * .default(). The proposed date is a `date` string and is coerced at submit.
 */
export const eventRequestSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a short, clear title (min 3 characters).').max(140, 'Keep the title under 140 characters.'),
    type: z.enum(TYPES),
    proposedDate: z.string().min(1, 'Pick a proposed date for the event.'),
    venue: z.string().trim().max(160, 'Keep the venue under 160 characters.'),
    description: z.string().trim().max(4000, 'Keep the description under 4000 characters.'),
    rationale: z.string().trim().min(10, 'Add a short rationale so leadership can review (min 10 characters).').max(2000, 'Keep the rationale under 2000 characters.'),
  });

export type EventRequestValues = {
  title: string;
  type: EventType;
  proposedDate: string;
  venue: string;
  description: string;
  rationale: string;
};
