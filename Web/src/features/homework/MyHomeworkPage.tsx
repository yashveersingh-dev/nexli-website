import { useMemo, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { upsertSubmission } from '@/features/daily/data';
import { useAllHomeworkForStudent, useStudentSubmissions } from './data';
import { HOMEWORK_STATUS_META } from '@/features/daily/meta';
import { formatDate } from '@/lib/format';
import type { Homework, HomeworkStatus, HomeworkSubmission } from '@/types/daily';
import { effectiveStatus, submissionId } from './homeworkSchema';
import { AttachmentList, resolveAttachments } from './AttachmentList';
import { sortHomework } from './util';
import './homework.css';

/**
 * Parent/student read view at /assignments. Student: their own section's homework
 * with a "Mark as submitted" action. Parent: grouped by each linked child.
 */
export function MyHomeworkPage() {
  const { schoolId, role, member } = useSession();

  const isStudent = role === 'student';

  const childIds = useMemo<string[]>(() => {
    if (isStudent) return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [isStudent, member]);

  // Own-record scoping: families can't list the whole students collection (rules
  // deny it) — fetch only the linked child docs by id.
  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);

  if (sLoading) {
    return (
      <div className="nx-page">
        <Skeleton height={48} />
        <Panel>
          <Skeleton height={220} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Homework</h1>
          <p className="nx-page__sub">{isStudent ? 'Your assignments and due dates.' : "Your children's assignments."}</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Panel>
          <EmptyState
            icon="clipboard"
            title="No homework to show"
            message="Homework will appear here once your school links your account to a student."
          />
        </Panel>
      ) : (
        children.map((child) => (
          <ChildHomework
            key={child.id}
            schoolId={schoolId}
            studentId={child.id}
            name={child.fullName}
            photoUrl={child.photoUrl}
            sectionId={child.sectionId}
            showHeader={children.length > 1}
            allowSubmit={isStudent}
          />
        ))
      )}
    </div>
  );
}

function ChildHomework({
  schoolId,
  studentId,
  name,
  photoUrl,
  sectionId,
  showHeader,
  allowSubmit,
}: {
  schoolId?: string;
  studentId: string;
  name: string;
  photoUrl?: string;
  sectionId?: string;
  showHeader: boolean;
  allowSubmit: boolean;
}) {
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: homework, loading } = useAllHomeworkForStudent(schoolId, sectionId);
  const { data: submissions } = useStudentSubmissions(schoolId, studentId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const now = Date.now();
  const actor = useMemo(() => ({ uid: uid ?? 'unknown', name: member?.name }), [uid, member]);

  const subBy = useMemo(() => {
    const m = new Map<string, HomeworkSubmission>();
    for (const s of submissions) m.set(s.homeworkId, s);
    return m;
  }, [submissions]);

  const { upcoming, past } = useMemo(() => {
    const sorted = sortHomework(homework);
    const up: Homework[] = [];
    const pa: Homework[] = [];
    for (const h of sorted) {
      if (h.dueDate != null && now > h.dueDate) pa.push(h);
      else up.push(h);
    }
    // upcoming should read soonest-first.
    up.sort((a, b) => (a.dueDate ?? a.assignedDate ?? 0) - (b.dueDate ?? b.assignedDate ?? 0));
    return { upcoming: up, past: pa };
  }, [homework, now]);

  const statusOf = (h: Homework): HomeworkStatus => effectiveStatus(subBy.get(h.id)?.status, h.dueDate, subBy.get(h.id)?.submittedAt, now);

  const markSubmitted = async (h: Homework) => {
    if (!schoolId) return;
    setBusyId(h.id);
    try {
      const sid = submissionId(h.id, studentId);
      const late = h.dueDate != null && now > h.dueDate;
      const data: Omit<HomeworkSubmission, 'id'> = {
        schoolId,
        homeworkId: h.id,
        studentId,
        studentName: name,
        status: late ? 'late' : 'submitted',
        submittedAt: Date.now(),
      };
      await upsertSubmission(schoolId, sid, data, actor);
      toast.success('Marked as submitted', h.title);
    } catch {
      toast.error('Could not update', 'It will sync when you are back online.');
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = (h: Homework) => {
    const st = statusOf(h);
    const meta = HOMEWORK_STATUS_META[st];
    const sub = subBy.get(h.id);
    const turnedIn = st === 'submitted' || st === 'late' || st === 'graded';
    const overdue = h.dueDate != null && now > h.dueDate && !turnedIn;
    const attachments = resolveAttachments(h);
    return (
      <article className="nx-hw-card" key={h.id}>
        <div className="nx-hw-card__top">
          <div style={{ minWidth: 0 }}>
            <h3 className="nx-hw-card__title">{h.title}</h3>
            <div className="nx-hw-card__meta">
              {h.subjectName && <span>{h.subjectName}</span>}
              {h.dueDate != null && (
                <>
                  {h.subjectName && <span className="dot" aria-hidden="true" />}
                  <span style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>Due {formatDate(h.dueDate)}</span>
                </>
              )}
            </div>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>

        {h.description && <p className="nx-hw-card__desc">{h.description}</p>}

        {attachments.length > 0 && <AttachmentList items={attachments} compact />}

        {(sub?.feedback || (h.maxMarks != null && sub?.marks != null)) && (
          <div className="nx-hw-card__foot">
            {h.maxMarks != null && sub?.marks != null && (
              <span className="nx-hw-card__marks">
                {sub.marks}
                <span className="nx-hw-row__max">/{h.maxMarks}</span>
              </span>
            )}
            {sub?.feedback && <span className="nx-hw-card__fb">“{sub.feedback}”</span>}
          </div>
        )}

        {allowSubmit && !turnedIn && (
          <div className="nx-hw-card__action">
            <Button variant="subtle" size="sm" leftIcon="check" loading={busyId === h.id} onClick={() => markSubmitted(h)}>
              Mark as submitted
            </Button>
          </div>
        )}
      </article>
    );
  };

  const body = (
    <>
      {loading ? (
        <div className="nx-hw-cards">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={96} />
          ))}
        </div>
      ) : homework.length === 0 ? (
        <EmptyState icon="clipboard" title="No homework yet" message="New assignments for this class will appear here." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="nx-hw-group">
              <h2 className="nx-hw-group__title">Upcoming</h2>
              <div className="nx-hw-cards">{upcoming.map(renderItem)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section className="nx-hw-group">
              <h2 className="nx-hw-group__title">Past</h2>
              <div className="nx-hw-cards">{past.map(renderItem)}</div>
            </section>
          )}
        </>
      )}
    </>
  );

  if (!showHeader) return <div>{body}</div>;

  return (
    <Panel
      title={
        <span className="nx-hw-child">
          <Avatar name={name} src={photoUrl} size={26} />
          <span>{name}</span>
        </span>
      }
    >
      {body}
    </Panel>
  );
}
