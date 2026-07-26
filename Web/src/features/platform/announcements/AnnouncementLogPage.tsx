import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { useAnnouncements } from '@/features/platform/data';
import { ANNOUNCEMENT_TYPE_META } from '@/features/platform/meta';
import type { AnnouncementType, PlatformAnnouncement } from '@/types/models';
import { audienceSummary, channelLabels } from './audience';

/** Announcement log (spec §12.6) — history of platform-wide messages, newest first. */
export function AnnouncementLogPage() {
  const navigate = useNavigate();
  const { data: announcements, loading, error } = useAnnouncements();

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Announcements</h1>
          <p className="nx-page__sub">
            {loading
              ? 'Loading…'
              : `${announcements.length} announcement${announcements.length === 1 ? '' : 's'} sent to School Admins`}
          </p>
        </div>
        <Button variant="gold" leftIcon="plus" onClick={() => navigate('/announcements/new')}>
          New announcement
        </Button>
      </div>

      {loading ? (
        <div className="nx-annlist">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="nx-anncard" key={i}>
              <Skeleton height={18} width="40%" style={{ marginBottom: 10 }} />
              <Skeleton height={12} width="90%" style={{ marginBottom: 6 }} />
              <Skeleton height={12} width="70%" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Couldn't load announcements" message="Please try again in a moment." />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon="megaphone"
          title="No announcements yet"
          message="Send your first platform-wide message to keep School Admins informed about maintenance, new features and policy updates."
          action={
            <Button variant="gold" leftIcon="plus" onClick={() => navigate('/announcements/new')}>
              New announcement
            </Button>
          }
        />
      ) : (
        <ul className="nx-annlist" aria-label="Announcement history">
          {announcements.map((a) => (
            <AnnouncementRow key={a.id} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnnouncementRow({ a }: { a: PlatformAnnouncement }) {
  const meta = ANNOUNCEMENT_TYPE_META[(a.type as AnnouncementType) ?? 'policy'];
  const channels = channelLabels(a.channels);

  return (
    <li className="nx-anncard">
      <div className="nx-anncard__head">
        <span className="nx-anncard__type">
          <Icon name={meta.icon} size={15} aria-hidden="true" />
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </span>
        <span className="nx-anncard__time">
          {a.sentAt ? formatRelative(a.sentAt) : 'Draft'}
          {a.sentByName ? ` · ${a.sentByName}` : ''}
        </span>
      </div>

      <h2 className="nx-anncard__title">{a.title}</h2>
      <p className="nx-anncard__body">{a.body}</p>

      <div className="nx-anncard__meta">
        <span className="nx-anncard__chip">
          <Icon name="users" size={12} aria-hidden="true" />
          {audienceSummary(a)}
        </span>
        {channels.map((c) => (
          <span className="nx-anncard__chip nx-anncard__chip--soft" key={c}>
            <Icon name="bell" size={12} aria-hidden="true" />
            {c}
          </span>
        ))}
      </div>
    </li>
  );
}
