import { Link } from 'react-router-dom';
import { Panel, PanelAction } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useCirculars } from '@/features/daily/data';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import './dashboards.css';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/**
 * Alumni command center — a deliberately minimal portal. Alumni are NOT staff, so
 * this reads only what they may access (notices + the alumni network) and never
 * the staff/student data the staff dashboard pulls (which the rules now deny them).
 */
export function AlumniDashboard() {
  const { schoolId, member, school } = useSession();
  const { data: circulars } = useCirculars(schoolId);
  const name = member?.name?.split(' ')[0] ?? 'there';
  const notices = circulars.filter((c) => ['whole_school', 'alumni'].includes(c.audience)).slice(0, 5);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{greeting()}, {name}</h1>
          <p className="nx-page__sub">Welcome back to the {school?.name ?? 'school'} alumni community.</p>
        </div>
      </div>

      <div className="grid g-2">
        <Panel title="Alumni network" headerRight={<PanelAction><Link to="/alumni" style={{ color: 'inherit' }}>Open</Link></PanelAction>}>
          <EmptyState
            icon="award"
            title="Reconnect & give back"
            message="Find batchmates, offer to mentor current students, and discover opportunities."
            action={<Link to="/alumni" className="nx-chip-link"><Icon name="award" size={13} /> Open directory</Link>}
          />
        </Panel>

        <Panel title="School notices" headerRight={<PanelAction><Link to="/communication" style={{ color: 'inherit' }}>All</Link></PanelAction>}>
          {notices.length === 0 ? (
            <EmptyState icon="megaphone" title="No notices yet" message="Announcements for alumni will appear here." />
          ) : (
            notices.map((c) => {
              const m = CIRCULAR_CATEGORY_META[c.category] ?? CIRCULAR_CATEGORY_META.general;
              return (
                <Link key={c.id} to={`/communication/${c.id}`} className="nx-noticerow">
                  <span className="nx-noticerow__icon is-normal"><Icon name={m.icon} size={15} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="nx-noticerow__title">{c.title}</div>
                    <div className="nx-noticerow__time">{c.publishedAt ? formatRelative(c.publishedAt) : ''}</div>
                  </div>
                </Link>
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}
