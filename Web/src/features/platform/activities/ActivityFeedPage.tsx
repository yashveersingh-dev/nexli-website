import { useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Select } from '@/components/form';
import { formatDate, formatRelative } from '@/lib/format';
import { useActivityFeed } from '@/features/platform/data';
import type { PlatformActivity, PlatformActivityType } from '@/types/models';

/** Friendly label + icon for each platform activity type. */
const TYPE_META: Record<PlatformActivityType, { label: string; icon: IconName }> = {
  'school.registered': { label: 'School registered', icon: 'user-plus' },
  'school.updated': { label: 'School updated', icon: 'school' },
  'subscription.changed': { label: 'Subscription changed', icon: 'credit-card' },
  'import.completed': { label: 'Import completed', icon: 'database' },
  'settings.changed': { label: 'Settings changed', icon: 'settings' },
  'announcement.sent': { label: 'Announcement sent', icon: 'megaphone' },
  impersonation: { label: 'Impersonation', icon: 'eye' },
};

const TYPE_FILTERS = [
  { value: '', label: 'All activity' },
  ...(Object.keys(TYPE_META) as PlatformActivityType[]).map((t) => ({
    value: t,
    label: TYPE_META[t].label,
  })),
];

/** Chronological platform activity feed (read-only timeline). */
export function ActivityFeedPage() {
  const { data, loading, error } = useActivityFeed(100);
  const [type, setType] = useState('');

  const filtered = useMemo(
    () =>
      data.filter((a) => !type || a.type === type).sort((a, b) => b.ts - a.ts),
    [data, type],
  );

  // Group newest-first by calendar day.
  const groups = useMemo(() => {
    const map = new Map<string, PlatformActivity[]>();
    for (const a of filtered) {
      const key = formatDate(a.ts, 'YYYY-MM-DD');
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Activity</h1>
          <p className="nx-page__sub">
            {loading
              ? 'Loading…'
              : `${filtered.length} event${filtered.length === 1 ? '' : 's'} across the platform`}
          </p>
        </div>
      </div>

      <div className="nx-toolbar">
        <div className="nx-toolbar__filter">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={TYPE_FILTERS}
            aria-label="Filter by activity type"
          />
        </div>
      </div>

      {loading ? (
        <Panel>
          <Skeleton height={48} />
          <Skeleton height={48} style={{ marginTop: 8 }} />
          <Skeleton height={48} style={{ marginTop: 8 }} />
        </Panel>
      ) : error ? (
        <EmptyState
          icon="alert-triangle"
          title="Couldn't load activity"
          message="Please try again in a moment."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="activity"
          title={type ? 'No activity of this type' : 'No activity yet'}
          message={
            type
              ? 'Try a different activity type filter.'
              : 'Platform lifecycle and configuration events will appear here.'
          }
        />
      ) : (
        <div className="nx-feed">
          {groups.map(([day, items]) => (
            <section className="nx-feed__group" key={day}>
              <h2 className="nx-feed__day">{formatDate(day, 'DD MMM YYYY')}</h2>
              <div className="nx-timeline">
                {items.map((a) => {
                  const meta = TYPE_META[a.type];
                  return (
                    <div className="nx-timeline__item" key={a.id}>
                      <span className="nx-timeline__dot nx-feed__dot">
                        <Icon name={meta?.icon ?? 'activity'} size={11} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="nx-timeline__title">
                          {a.summary}
                          {a.schoolName && <span className="nx-feed__chip">{a.schoolName}</span>}
                        </div>
                        <div className="nx-timeline__time">
                          {formatRelative(a.ts)}
                          {a.actorName ? ` · ${a.actorName}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
