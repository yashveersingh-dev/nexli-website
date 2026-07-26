import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { useHpcCards } from '@/features/analytics/data';
import { TERM_LABEL } from './hpcSchema';
import type { HpcCard } from '@/types/special';
import '@/features/analytics/analytics.css';
import './hpc.css';

/** Parent/student read-only view: published holistic progress cards. */
export function MyHpcPage() {
  const navigate = useNavigate();
  const { schoolId, role, member } = useSession();
  const { data: cards, loading: cLoading } = useHpcCards(schoolId);

  const childIds = useMemo<string[]>(() => {
    if (role === 'student') return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [role, member]);

  // Own-record scoping: families can't list the whole students collection (rules
  // deny it) — fetch only the linked child docs by id.
  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);

  const published = useMemo(
    () =>
      cards
        .filter((c) => c.published === true && childIds.includes(c.studentId))
        .sort((a, b) => (b.lastModifiedAt ?? b.createdAt ?? 0) - (a.lastModifiedAt ?? a.createdAt ?? 0)),
    [cards, childIds],
  );

  const byStudent = useMemo(() => {
    const map = new Map<string, HpcCard[]>();
    for (const c of published) {
      const list = map.get(c.studentId) ?? [];
      list.push(c);
      map.set(c.studentId, list);
    }
    return map;
  }, [published]);

  if (sLoading || cLoading) {
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
          <h1 className="nx-page__title">Progress Cards</h1>
          <p className="nx-page__sub">{role === 'student' ? 'Your published holistic progress cards.' : "Your children's published progress cards."}</p>
        </div>
      </div>

      {childIds.length === 0 ? (
        <Panel>
          <EmptyState icon="user" title="Account not linked" message="Progress cards will appear here once your school links your account to a student." />
        </Panel>
      ) : published.length === 0 ? (
        <Panel>
          <EmptyState icon="file-text" title="No published cards yet" message="When teachers publish a holistic progress card, it will appear here for you to view and print." />
        </Panel>
      ) : (
        children
          .filter((child) => (byStudent.get(child.id)?.length ?? 0) > 0)
          .map((child) => {
            const list = byStudent.get(child.id) ?? [];
            return (
              <Panel key={child.id} title={child.fullName} sub={[child.gradeName, child.sectionName].filter(Boolean).join(' · ') || undefined}>
                <div className="hpc-row__list">
                  {list.map((c) => (
                    <div key={c.id} className="hpc-row" role="button" tabIndex={0}
                      onClick={() => navigate(`/hpc/${c.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/hpc/${c.id}`); } }}
                    >
                      <Avatar name={c.studentName} size={36} />
                      <div className="hpc-row__main">
                        <div className="hpc-row__name">{c.academicYear} · {TERM_LABEL[c.term]}</div>
                        <div className="hpc-row__meta">
                          {c.attendancePct != null ? `${c.attendancePct}% attendance · ` : ''}
                          {c.lastModifiedAt ? `Published ${formatRelative(c.lastModifiedAt)}` : 'Published'}
                        </div>
                      </div>
                      <Badge variant="success">View</Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })
      )}
    </div>
  );
}
