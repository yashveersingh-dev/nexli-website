import { z } from 'zod';
import type { Bloom, Difficulty, QuestionType } from '@/types/qpaper';

/**
 * Question editor form values (zod string-schema convention, mirroring
 * `examSchema.ts`). Tags + type-specific content. Options/correct are validated
 * lightly here and shaped into the stored `Question` by the form page.
 */
export const questionSchema = z
  .object({
    type: z.string().min(1, 'Type is required'),
    stem: z.string().trim().min(1, 'Question text is required'),
    // type-specific
    optionA: z.string().optional(),
    optionB: z.string().optional(),
    optionC: z.string().optional(),
    optionD: z.string().optional(),
    correct: z.string().optional(), // comma-separated option keys, e.g. "A" or "A,C"
    answer: z.string().optional(),
    solution: z.string().optional(),
    markingScheme: z.string().optional(),
    imageUrls: z.string().optional(), // newline / comma separated
    // tags
    subjectId: z.string().optional(),
    gradeId: z.string().optional(),
    chapter: z.string().optional(),
    topic: z.string().optional(),
    subTopic: z.string().optional(),
    loCode: z.string().optional(),
    bloom: z.string().min(1, 'Bloom level is required'),
    difficulty: z.string().min(1, 'Difficulty is required'),
    competency: z.boolean().optional(),
    marks: z.coerce.number().min(0, 'Marks must be 0 or more').max(100, 'Too many marks'),
    expectedTimeMins: z.coerce.number().min(0).max(600).optional(),
    board: z.string().optional(),
    source: z.string().optional(),
    pyqYear: z.coerce.number().min(0).max(2100).optional(),
    language: z.string().optional(),
    status: z.string().min(1),
  })
  .refine(
    (v) => {
      // MCQ-style types need at least options A & B + a correct key.
      const optionTypes = ['mcq', 'mcq_multi', 'assertion_reason'];
      if (!optionTypes.includes(v.type)) return true;
      return !!v.optionA?.trim() && !!v.optionB?.trim();
    },
    { message: 'MCQ questions need at least options A and B', path: ['optionA'] },
  );

export type QuestionFormValues = z.infer<typeof questionSchema>;

export const emptyQuestionForm = (subjectId = '', gradeId = ''): QuestionFormValues => ({
  type: 'mcq' as QuestionType,
  stem: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct: '',
  answer: '',
  solution: '',
  markingScheme: '',
  imageUrls: '',
  subjectId,
  gradeId,
  chapter: '',
  topic: '',
  subTopic: '',
  loCode: '',
  bloom: 'understand' as Bloom,
  difficulty: 'medium' as Difficulty,
  competency: false,
  marks: 1,
  expectedTimeMins: undefined,
  board: 'CBSE',
  source: '',
  pyqYear: undefined,
  language: 'en',
  status: 'approved',
});
