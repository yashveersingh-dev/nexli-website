import { z } from 'zod';

/** Compose-form schema for a platform announcement (spec §12.6). */
export const announcementSchema = z
  .object({
    type: z.enum(['maintenance', 'feature', 'policy', 'billing', 'emergency']),
    title: z
      .string()
      .trim()
      .min(4, 'Give the announcement a clear title (min 4 characters).')
      .max(120, 'Keep the title under 120 characters.'),
    body: z
      .string()
      .trim()
      .min(12, 'Write a bit more so School Admins understand the message.')
      .max(2000, 'Keep the message under 2000 characters.'),
    audience: z.enum(['all', 'plan', 'state', 'board', 'schools']),
    targetPlan: z.string().optional(),
    targetState: z.string().optional(),
    targetBoard: z.string().optional(),
    targetSchoolIds: z.array(z.string()).optional(),
    channels: z.array(z.string()).min(1, 'Pick at least one delivery channel.'),
  })
  .superRefine((v, ctx) => {
    if (v.audience === 'plan' && !v.targetPlan)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetPlan'], message: 'Choose a plan to target.' });
    if (v.audience === 'state' && !v.targetState)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetState'], message: 'Choose a state to target.' });
    if (v.audience === 'board' && !v.targetBoard)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetBoard'], message: 'Choose a board to target.' });
    if (v.audience === 'schools' && (!v.targetSchoolIds || v.targetSchoolIds.length === 0))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetSchoolIds'], message: 'Select at least one school.' });
  });

export type AnnouncementValues = z.infer<typeof announcementSchema>;
