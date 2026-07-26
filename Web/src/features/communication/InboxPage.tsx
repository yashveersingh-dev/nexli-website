import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { Sheet } from '@/components/Sheet';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useCirculars } from '@/features/daily/data';
import { useStudentsByIds, useGrades, useSections } from '@/features/school/data';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import { formatDate, formatRelative } from '@/lib/format';
import type { Circular, CircularAudience } from '@/types/daily';
import { CircularCard } from './CircularCard';
import { audienceSummary, sortCirculars } from './util';

/** Read-only inbox for parents and students, filtered to relevant circulars. */
export function InboxPage() {
  const { schoolId, role, member } = useSession();
  const { data: circulars, loading: cLoading } = useCirculars(schoolId);
  const isStudent = role === 'student';
  // Own-record scoping: a parent/student may NOT list the whole students
  // collection under the tightened rules (and shouldn't — it's an unbounded
  // read). Fetch only their own linked student record(s) by id to resolve the
  // grade/section that grade- and section-targeted circulars are matched against.
  const ownStudentIds = useMemo(
    () => (isStudent ? (member?.studentId ? [member.studentId] : []) : (member?.childStudentIds ?? [])),
    [isStudent, member],
  );
  const { data: students, loading: sLoading } = useStudentsByIds(schoolId, ownStudentIds);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const [open, setOpen] = useState<Circular | null>(null);

  // Resolve which grades/sections this user belongs to (their own records only).
  const { gradeIds, sectionIds } = useMemo(() => {
    return {
      gradeIds: new Set(students.map((s) => s.gradeId).filter(Boolean) as string[]),
      sectionIds: new Set(students.map((s) => s.sectionId).filter(Boolean) as string[]),
    };
  }, [students]);

  const visible = useMemo(() => {
    const baseAudiences: CircularAudience[] = isStudent
      ? ['whole_school', 'students']
      : ['whole_school', 'parents'];
    const filtered = circulars.filter((c) => {
      if (baseAudiences.includes(c.audience)) return true;
      if (c.audience === 'grade' && c.gradeId) return gradeIds.has(c.gradeId);
      if (c.audience === 'section' && c.sectionId) return sectionIds.has(c.sectionId);
      return false;
    });
    return sortCirculars(filtered);
  }, [circulars, isStudent, gradeIds, sectionIds]);

  const loading = cLoading || sLoading;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Announcements</h1>
          <p className="nx-page__sub">{isStudent ? 'Circulars from your school.' : 'Circulars from your school and classes.'}</p>
        </div>
      </div>

      {loading ? (
        <div className="nx-circ-list">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={120} />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon="megaphone" title="No announcements yet" message="New circulars from your school will appear here." />
      ) : (
        <div className="nx-circ-list">
          {visible.map((c) => (
            <CircularCard key={c.id} circular={c} audience={audienceSummary(c, grades, sections)} expandable onClick={() => setOpen(c)} />
          ))}
        </div>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title} side="bottom">
        {open && <CircularBody circular={open} audience={audienceSummary(open, grades, sections)} />}
      </Sheet>
    </div>
  );
}

function CircularBody({ circular, audience }: { circular: Circular; audience: string }) {
  const meta = CIRCULAR_CATEGORY_META[circular.category];
  const emergency = !!circular.emergency || circular.category === 'emergency';
  return (
    <div className="nx-circ-read">
      <div className="nx-circ-detail__head">
        <Badge variant={meta.variant}>
          <Icon name={meta.icon} size={12} aria-hidden="true" />
          <span>{meta.label}</span>
        </Badge>
        {emergency && <Badge variant="danger">Emergency</Badge>}
      </div>
      <div className="nx-detail__meta">
        <span>{audience}</span>
        {circular.publishedAt && (
          <>
            <span className="dot" aria-hidden="true" />
            <span title={formatDate(circular.publishedAt)}>{formatRelative(circular.publishedAt)}</span>
          </>
        )}
        {circular.publishedByName && (
          <>
            <span className="dot" aria-hidden="true" />
            <span>by {circular.publishedByName}</span>
          </>
        )}
      </div>
      <div className="nx-circ-detail__body">{circular.body}</div>
      {circular.attachmentUrl && (
        <a className="nx-circ-detail__attach" href={circular.attachmentUrl} target="_blank" rel="noreferrer">
          <Icon name="file-text" size={15} aria-hidden="true" />
          <span>View attachment</span>
        </a>
      )}
    </div>
  );
}
