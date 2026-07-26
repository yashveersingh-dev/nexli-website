import { z } from 'zod';
import { HPC_DOMAINS } from '@/features/analytics/meta';
import type { HpcCard, HpcDomainRating, HpcSubjectLine, HpcTerm } from '@/types/special';

/**
 * HPC form schemas are string-based (input === output) so they satisfy the
 * kit's `Form<T>` (`ZodType<T>`). Numeric ratings / attendance are kept as
 * strings and `Number()`-coerced at submit — never `z.coerce`/`.default()`
 * which diverge the input/output types. Defaults come from `defaultValues`.
 */

const ratingValues = ['1', '2', '3', '4', '5'] as const;

const domainSchema = z.object({
  domain: z.string(),
  rating: z.enum(ratingValues),
});

const subjectLineSchema = z.object({
  subject: z.string().trim().max(80, 'Keep it under 80 characters'),
  grade: z.string().trim().max(20, 'Keep it short'),
  remark: z.string().trim().max(280, 'Keep remarks under 280 characters'),
});

export const hpcSchema = z.object({
  studentId: z.string().min(1, 'Pick a student'),
  academicYear: z.string().trim().min(4, 'Academic year required'),
  term: z.enum(['term1', 'term2', 'annual']),
  domains: z.array(domainSchema),
  scholastic: z.array(subjectLineSchema),
  coScholastic: z.array(subjectLineSchema),
  attendancePct: z
    .string()
    .refine(
      (v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
      'Enter 0–100',
    ),
  strengths: z.string().trim().max(800, 'Keep it under 800 characters'),
  areasToImprove: z.string().trim().max(800, 'Keep it under 800 characters'),
  teacherRemark: z.string().trim().max(800, 'Keep it under 800 characters'),
  selfReflection: z.string().trim().max(800, 'Keep it under 800 characters'),
  peerFeedback: z.string().trim().max(800, 'Keep it under 800 characters'),
});

export type HpcFormValues = z.infer<typeof hpcSchema>;

/** Blank, valid form values. Domains seed from the canonical NEP domain list. */
export function emptyHpcForm(year?: string): HpcFormValues {
  return {
    studentId: '',
    academicYear: year ?? `${new Date().getFullYear()}`,
    term: 'term1',
    domains: HPC_DOMAINS.map((domain) => ({ domain, rating: '3' as const })),
    scholastic: [{ subject: '', grade: '', remark: '' }],
    coScholastic: [{ subject: '', grade: '', remark: '' }],
    attendancePct: '',
    strengths: '',
    areasToImprove: '',
    teacherRemark: '',
    selfReflection: '',
    peerFeedback: '',
  };
}

/** Hydrate the form from a saved card, re-seeding any newly-added domains. */
export function cardToForm(card: HpcCard): HpcFormValues {
  const saved = new Map(card.domains.map((d) => [d.domain, d.rating]));
  return {
    studentId: card.studentId,
    academicYear: card.academicYear,
    term: card.term,
    domains: HPC_DOMAINS.map((domain) => {
      const rating = saved.get(domain);
      const clamped = rating ? Math.max(1, Math.min(5, Math.round(rating))) : 3;
      return { domain, rating: String(clamped) as (typeof ratingValues)[number] };
    }),
    scholastic: card.scholastic.length
      ? card.scholastic.map((s) => ({ subject: s.subject, grade: s.grade ?? '', remark: s.remark ?? '' }))
      : [{ subject: '', grade: '', remark: '' }],
    coScholastic: card.coScholastic?.length
      ? card.coScholastic.map((s) => ({ subject: s.subject, grade: s.grade ?? '', remark: s.remark ?? '' }))
      : [{ subject: '', grade: '', remark: '' }],
    attendancePct: card.attendancePct != null ? String(card.attendancePct) : '',
    strengths: card.strengths ?? '',
    areasToImprove: card.areasToImprove ?? '',
    teacherRemark: card.teacherRemark ?? '',
    selfReflection: card.selfReflection ?? '',
    peerFeedback: card.peerFeedback ?? '',
  };
}

/** Drop empty subject lines and coerce strings → typed line objects. */
function toLines(rows: HpcFormValues['scholastic']): HpcSubjectLine[] {
  return rows
    .filter((r) => r.subject.trim() !== '')
    .map((r) => ({
      subject: r.subject.trim(),
      grade: r.grade.trim() || undefined,
      remark: r.remark.trim() || undefined,
    }));
}

/** Map domain rows → typed ratings with the right descriptor. */
function toDomains(rows: HpcFormValues['domains'], descriptors: Record<number, string>): HpcDomainRating[] {
  return rows.map((d) => {
    const rating = Number(d.rating);
    return { domain: d.domain, rating, descriptor: descriptors[rating] };
  });
}

/** Build the persisted card payload (everything except `id`).
 *
 * Authoring never publishes directly — a card stays an unpublished `draft`
 * (or keeps a `returned` status so the author can resubmit). Publishing happens
 * only through approval, so `published` is always `false` here. */
export function formToCard(
  values: HpcFormValues,
  ctx: {
    schoolId: string;
    studentName: string;
    gradeName?: string;
    sectionName?: string;
    descriptors: Record<number, string>;
    approvalStatus: 'draft' | 'returned';
  },
): Omit<HpcCard, 'id'> {
  const attendance = values.attendancePct.trim();
  return {
    schoolId: ctx.schoolId,
    studentId: values.studentId,
    studentName: ctx.studentName,
    gradeName: ctx.gradeName,
    sectionName: ctx.sectionName,
    academicYear: values.academicYear.trim(),
    term: values.term,
    domains: toDomains(values.domains, ctx.descriptors),
    scholastic: toLines(values.scholastic),
    coScholastic: toLines(values.coScholastic),
    attendancePct: attendance === '' ? undefined : Math.round(Number(attendance)),
    strengths: values.strengths.trim() || undefined,
    areasToImprove: values.areasToImprove.trim() || undefined,
    teacherRemark: values.teacherRemark.trim() || undefined,
    selfReflection: values.selfReflection.trim() || undefined,
    peerFeedback: values.peerFeedback.trim() || undefined,
    approvalStatus: ctx.approvalStatus,
    published: false,
  };
}

export const TERM_LABEL: Record<HpcTerm, string> = {
  term1: 'Term 1',
  term2: 'Term 2',
  annual: 'Annual',
};
