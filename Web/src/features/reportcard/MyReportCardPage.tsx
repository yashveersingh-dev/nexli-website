import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { RESULT_STATUS_META } from '@/features/examinations/examSchema';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { usePublishedReportCards } from './data';
import type { Student } from '@/types/sis';
import type { ReportCard } from '@/types/reportcard';
import './reportcard.css';

/**
 * Parent/student read-only view: PUBLISHED report cards only, scoped to the
 * linked child(ren)/self. Each child's cards are fetched with the own-record
 * query (`where studentId == <own> and published == true`) — never the whole
 * collection, matching the tightened security rules.
 */
export function MyReportCardPage() {
  const { schoolId, role, member } = useSession();

  const childIds = useMemo<string[]>(() => {
    if (role === 'student') return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [role, member]);

  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);

  if (sLoading) {
    return (
      <div className="nx-page">
        <Skeleton height={48} />
        <Panel><Skeleton height={160} /></Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Report Cards</h1>
          <p className="nx-page__sub">{role === 'student' ? 'Your published report cards.' : "Your children's published report cards."}</p>
        </div>
      </div>

      {childIds.length === 0 ? (
        <Panel>
          <EmptyState icon="user" title="Account not linked" message="Report cards will appear here once your school links your account to a student." />
        </Panel>
      ) : (
        childIds.map((id) => (
          <ChildReportCards key={id} schoolId={schoolId} studentId={id} child={children.find((c) => c.id === id)} />
        ))
      )}
    </div>
  );
}

/** One child's published cards (own-record query per student). */
function ChildReportCards({ schoolId, studentId, child }: { schoolId?: string; studentId: string; child?: Student }) {
  const navigate = useNavigate();
  const { data: cards, loading } = usePublishedReportCards(schoolId, studentId);

  const sorted = useMemo<ReportCard[]>(
    () => [...cards].sort((a, b) => (b.lastModifiedAt ?? b.createdAt ?? 0) - (a.lastModifiedAt ?? a.createdAt ?? 0)),
    [cards],
  );

  const title = child?.fullName ?? 'Student';
  const sub = child ? [child.gradeName, child.sectionName].filter(Boolean).join(' · ') || undefined : undefined;

  if (loading) {
    return <Panel title={title} sub={sub}><Skeleton height={64} /></Panel>;
  }
  if (sorted.length === 0) {
    return (
      <Panel title={title} sub={sub}>
        <EmptyState icon="file-text" title="No published cards yet" message="When teachers publish a report card, it will appear here for you to view and print." />
      </Panel>
    );
  }

  return (
    <Panel title={title} sub={sub}>
      <div className="rc-row__list">
        {sorted.map((c) => {
          const resultMeta = RESULT_STATUS_META[c.result];
          return (
            <div key={c.id} className="rc-row" role="button" tabIndex={0}
              onClick={() => navigate(`/report-cards/${c.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/report-cards/${c.id}`); } }}
            >
              <Avatar name={c.studentName} size={36} />
              <div className="rc-row__main">
                <div className="rc-row__name">{c.academicYear} · {c.termLabel ?? c.term}</div>
                <div className="rc-row__meta">
                  {c.totals.max > 0 ? `${c.totals.percentage}% · ` : ''}
                  {c.attendance ? `${c.attendance.pct}% attendance · ` : ''}
                  {c.lastModifiedAt ? `Published ${formatRelative(c.lastModifiedAt)}` : 'Published'}
                </div>
              </div>
              {c.totals.max > 0 && <Badge variant={resultMeta.variant}>{resultMeta.label}</Badge>}
              <Badge variant="success">View</Badge>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
