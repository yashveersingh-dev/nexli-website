import { useMemo, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useAlumni } from '@/features/analytics/data';
import type { Alumnus } from '@/types/community';
import { AlumnusDetailModal } from '../components/AlumnusDetailModal';
import { roleLine } from '../meta';

interface MentorGroup {
  key: string;
  mentors: Alumnus[];
}

const UNGROUPED = 'General mentorship';

/** Group mentors by each of their focus areas; fall back to industry, then general. */
function groupMentors(mentors: Alumnus[]): MentorGroup[] {
  const map = new Map<string, Alumnus[]>();
  const push = (key: string, a: Alumnus) => {
    const list = map.get(key) ?? [];
    if (!list.includes(a)) list.push(a);
    map.set(key, list);
  };
  for (const a of mentors) {
    const areas = a.mentorAreas?.filter(Boolean) ?? [];
    if (areas.length) areas.forEach((area) => push(area, a));
    else if (a.industry) push(a.industry, a);
    else push(UNGROUPED, a);
  }
  return [...map.entries()]
    .map(([key, list]) => ({ key, mentors: list.sort((x, y) => (x.name ?? '').localeCompare(y.name ?? '')) }))
    .sort((a, b) => {
      if (a.key === UNGROUPED) return 1;
      if (b.key === UNGROUPED) return -1;
      return b.mentors.length - a.mentors.length || a.key.localeCompare(b.key);
    });
}

export function MentorshipTab() {
  const { schoolId } = useSession();
  const { data: alumni, loading } = useAlumni(schoolId);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Alumnus | null>(null);

  const mentors = useMemo(() => alumni.filter((a) => a.willingToMentor), [alumni]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? mentors.filter(
          (a) =>
            a.name?.toLowerCase().includes(q) ||
            a.industry?.toLowerCase().includes(q) ||
            a.organisation?.toLowerCase().includes(q) ||
            a.mentorAreas?.some((m) => m.toLowerCase().includes(q)),
        )
      : mentors;
    return groupMentors(pool);
  }, [mentors, search]);

  const areaCount = useMemo(() => {
    const set = new Set<string>();
    for (const m of mentors) (m.mentorAreas ?? []).forEach((a) => set.add(a.toLowerCase()));
    return set.size;
  }, [mentors]);

  if (loading) return <Skeleton height={320} />;

  if (mentors.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon="sparkles"
          title="No mentors yet"
          message="Alumni who opt in to mentoring will appear here, grouped by their focus areas. Enable “Willing to mentor” on an alumnus profile."
        />
      </Panel>
    );
  }

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="sparkles" label="Available mentors" count={mentors.length} format="us" subColor="var(--gold)" />
        <KPICard icon="briefcase" label="Focus areas covered" count={areaCount} format="us" />
        <KPICard icon="users" label="Total alumni" count={alumni.length} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginTop: 16 }}>
        <div className="nx-toolbar__search">
          <Input
            leftIcon="search"
            placeholder="Search mentors by name, area or industry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search mentors"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="search" title="No mentors match" message="Try a different search term." />
      ) : (
        <Panel title="Available mentors" sub={`${mentors.length}`}>
          {groups.map((g) => (
            <div className="al-mentor-group" key={g.key}>
              <div className="al-mentor-group__head">
                <Icon name="sparkles" size={15} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                <span className="al-mentor-group__title">{g.key}</span>
                <span className="al-mentor-group__count">
                  · {g.mentors.length} mentor{g.mentors.length === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.mentors.map((a) => (
                  <button type="button" className="al-mentor-row" key={a.id} onClick={() => setSelected(a)} aria-label={`Open ${a.name}`}>
                    <Avatar name={a.name} src={a.photoUrl} size={38} />
                    <div className="al-mentor-row__body">
                      <div className="al-mentor-row__name">{a.name}</div>
                      <div className="al-mentor-row__meta">
                        {[roleLine(a), a.batchYear ? `Batch ${a.batchYear}` : null].filter(Boolean).join(' · ') || 'Alumnus'}
                      </div>
                      {a.mentorAreas && a.mentorAreas.length > 0 && (
                        <div className="al-mentor-row__areas">
                          {a.mentorAreas.map((m) => (
                            <span className="al-area-pill" key={m}>
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Icon name="chevron-right" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Panel>
      )}

      <AlumnusDetailModal
        alumnus={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        canWrite={false}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />
    </div>
  );
}
