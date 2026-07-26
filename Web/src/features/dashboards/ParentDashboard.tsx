import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Panel, PanelAction } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { useAttendanceBySections, useCirculars, useHomeworkBySections } from '@/features/daily/data';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import { FamilyChildrenGrid } from '@/features/family/FamilyChildrenGrid';
import './dashboards.css';

function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

export function ParentDashboard() {
  const { schoolId, member } = useSession();
  const childIds = member?.childStudentIds ?? [];
  const { data: children } = useStudentsByIds(schoolId, childIds);
  // Derive section ids from the children's own records so attendance and homework
  // queries are scoped to only those sections — never the whole collection (which
  // tightened rules deny to non-staff / parent accounts).
  const childSectionIds = useMemo(
    () => [...new Set(children.map((c) => c.sectionId).filter((id): id is string => !!id))],
    [children],
  );
  const { data: attendance } = useAttendanceBySections(schoolId, childSectionIds);
  const { data: circulars } = useCirculars(schoolId);
  const { data: homework } = useHomeworkBySections(schoolId, childSectionIds);
  const name = member?.name?.split(' ')[0] ?? 'there';

  const childSectionIdSet = useMemo(() => new Set(childSectionIds), [childSectionIds]);
  const upcomingHw = useMemo(
    () => homework.filter((h) => childSectionIdSet.has(h.sectionId) && (h.dueDate ?? 0) >= Date.now() - 86400000).sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0)).slice(0, 5),
    [homework, childSectionIdSet],
  );
  const notices = circulars.filter((c) => ['whole_school', 'parents', 'grade', 'section'].includes(c.audience)).slice(0, 5);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{greeting()}, {name}</h1>
          <p className="nx-page__sub">Your family overview</p>
        </div>
      </div>

      <FamilyChildrenGrid students={children} days={attendance} />

      <div className="grid g-2">
        <Panel title="Upcoming homework" headerRight={<PanelAction><Link to="/assignments" style={{ color: 'inherit' }}>All</Link></PanelAction>}>
          {upcomingHw.length === 0 ? (
            <EmptyState icon="file-text" title="Nothing due" message="No upcoming homework." />
          ) : upcomingHw.map((h) => (
            <div className="nx-kv" key={h.id}>
              <span className="nx-kv__k">{h.title}{h.subjectName ? ` · ${h.subjectName}` : ''}</span>
              <span className="nx-kv__v">{h.dueDate ? formatRelative(h.dueDate) : '—'}</span>
            </div>
          ))}
        </Panel>

        <Panel title="School notices" headerRight={<PanelAction><Link to="/communication" style={{ color: 'inherit' }}>All</Link></PanelAction>}>
          {notices.length === 0 ? (
            <EmptyState icon="megaphone" title="No notices" />
          ) : notices.map((c) => {
            const m = CIRCULAR_CATEGORY_META[c.category] ?? CIRCULAR_CATEGORY_META.general;
            return (
              <Link key={c.id} to={`/communication/${c.id}`} className="nx-noticerow">
                <span className={`nx-noticerow__icon is-${c.emergency ? 'emergency' : 'normal'}`}><Icon name={m.icon} size={15} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="nx-noticerow__title">{c.title}</div>
                  <div className="nx-noticerow__time">{c.publishedAt ? formatRelative(c.publishedAt) : ''}</div>
                </div>
                {c.emergency && <Badge variant="danger">Urgent</Badge>}
              </Link>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
