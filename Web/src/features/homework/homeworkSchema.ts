import { z } from 'zod';
import type { HomeworkStatus } from '@/types/daily';
import { isValidAttachmentUrl } from './attachments';

/** yyyy-mm-dd for native date inputs. */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * One attachment row in the form: a pasted link + a display name. Both stay
 * strings (input === output) so the kit's `Form<T>` (`ZodType<T>`) is satisfied;
 * the `type` is derived and rows are coerced to `HomeworkAttachment[]` at submit.
 * A row is "blank" when both fields are empty (ignored); otherwise the URL must
 * be a valid http(s) link.
 */
const attachmentRowSchema = z
  .object({
    name: z.string().trim().max(120, 'Keep the name under 120 characters'),
    url: z.string().trim(),
  })
  .superRefine((row, ctx) => {
    const isBlank = row.url === '' && row.name === '';
    if (isBlank) return;
    if (!isValidAttachmentUrl(row.url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'Enter a valid http(s) link' });
    }
  });

export type HomeworkAttachmentRow = z.infer<typeof attachmentRowSchema>;

export const emptyAttachmentRow = (): HomeworkAttachmentRow => ({ name: '', url: '' });

/**
 * Form values for creating / editing a homework assignment. Dates are the ISO
 * strings the native <DatePicker> uses; converted to epoch ms on submit. Due date
 * must be on or after the assigned date (validated cross-field below).
 *
 * String-based (input === output) to satisfy the kit's `Form<T>` (`ZodType<T>`);
 * `maxMarks` is validated as a number but coerced at submit. No `z.coerce`/
 * `.default()` (they diverge the input/output types). See `features/fees/feeSchema.ts`.
 */
export const homeworkSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(140, 'Keep it under 140 characters'),
    description: z.string().trim().max(4000, 'That description is too long').optional(),
    sectionId: z.string().min(1, 'Pick a section'),
    subjectId: z.string().optional(),
    assignedDate: z.string().min(1, 'Pick an assigned date'),
    dueDate: z.string().min(1, 'Pick a due date'),
    maxMarks: z
      .string()
      .refine(
        (v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1000),
        'Enter a number between 0 and 1000',
      )
      .optional(),
    attachmentUrl: z.string().nullable().optional(),
    attachments: z.array(attachmentRowSchema),
  })
  .refine((v) => !v.assignedDate || !v.dueDate || v.dueDate >= v.assignedDate, {
    path: ['dueDate'],
    message: 'Due date must be on or after the assigned date',
  });

export type HomeworkFormValues = z.infer<typeof homeworkSchema>;

export const emptyHomeworkForm = (sectionId = ''): HomeworkFormValues => ({
  title: '',
  description: '',
  sectionId,
  subjectId: '',
  assignedDate: today(),
  dueDate: today(),
  maxMarks: '',
  attachmentUrl: null,
  attachments: [],
});

/** Submission doc id is deterministic: one row per (homework, student). */
export const submissionId = (homeworkId: string, studentId: string) => `${homeworkId}_${studentId}`;

/**
 * Resolve a student's effective status for a homework, factoring in the due date.
 * - graded / explicit late / explicit missing are taken as-is.
 * - a submission whose `submittedAt` is after the due date reads as "late".
 * - no submission yet reads as "assigned", or "missing" once the due date passes.
 */
export function effectiveStatus(
  raw: HomeworkStatus | undefined,
  dueDate: number | undefined,
  submittedAt?: number,
  now = Date.now(),
): HomeworkStatus {
  if (raw === 'graded') return 'graded';
  if (raw === 'missing') return 'missing';
  if (raw === 'late') return 'late';
  if (raw === 'submitted') {
    return dueDate != null && submittedAt != null && submittedAt > dueDate ? 'late' : 'submitted';
  }
  // No submission yet → assigned, or missing once overdue.
  if (dueDate != null && now > dueDate) return 'missing';
  return 'assigned';
}
