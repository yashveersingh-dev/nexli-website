import { z } from 'zod';
import type { CircularAudience, CircularCategory } from '@/types/daily';

const CATEGORIES = ['general', 'academic', 'event', 'holiday', 'fee', 'exam', 'emergency'] as const;
const AUDIENCES = ['whole_school', 'staff', 'grade', 'section', 'parents', 'students'] as const;

export const circularSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a short, clear title (min 3 characters).').max(140, 'Keep the title under 140 characters.'),
    body: z.string().trim().min(5, 'Write the message body (min 5 characters).').max(5000, 'Keep the message under 5000 characters.'),
    category: z.enum(CATEGORIES),
    audience: z.enum(AUDIENCES),
    gradeId: z.string().optional(),
    sectionId: z.string().optional(),
    pinned: z.boolean(),
    emergency: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.audience === 'grade' && !v.gradeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gradeId'], message: 'Pick the grade to target.' });
    }
    if (v.audience === 'section' && !v.sectionId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sectionId'], message: 'Pick the section to target.' });
    }
  });

export type CircularValues = {
  title: string;
  body: string;
  category: CircularCategory;
  audience: CircularAudience;
  gradeId?: string;
  sectionId?: string;
  pinned: boolean;
  emergency: boolean;
};
