import { z } from 'zod';

/** Paper builder header fields (zod string-schema convention). */
export const paperSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  subjectId: z.string().optional(),
  gradeId: z.string().optional(),
  sectionName: z.string().optional(),
  examName: z.string().optional(),
  academicYear: z.string().optional(),
  board: z.string().optional(),
  totalMarks: z.coerce.number().min(1, 'Total marks must be at least 1').max(1000),
  durationMins: z.coerce.number().min(1, 'Duration must be at least 1 minute').max(1000),
  instructions: z.string().optional(), // newline separated
});

export type PaperFormValues = z.infer<typeof paperSchema>;
