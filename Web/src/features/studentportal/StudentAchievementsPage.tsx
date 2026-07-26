import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useHouses } from '@/features/school/data';
import { useEvents, useEventRegistrations } from '@/features/analytics/data';
import { EVENT_TYPE_META, REGISTRATION_STATUS_META } from '@/features/analytics/meta';
import { formatDate } from '@/lib/format';
import type { EventRegistration, SchoolEvent } from '@/types/community';
import type { House } from '@/types/academics';
import { useStudentContext } from './useStudentContext';
import { PortalPage } from './PortalShell';
import './studentportal.css';

/** Read-only achievements: house standing, event participation and recognitions. */
export function StudentAchievementsPage() {
  const ctx = useStudentContext();
  return (
    <PortalPage ctx={ctx} title="Achievements" icon="trophy" sub="Your house, participation and recognitions.">
      {ctx.status === 'ready' && (
        <AchievementsBody studentId={ctx.studentId} houseRef={ctx.student?.house} tags={ctx.student?.tags} />
      )}
    </PortalPage>
  );
}

function AchievementsBody({
  studentId,
  houseRef,
  tags,
}: {
  studentId?: string;
  houseRef?: string;
  tags?: string[];
}) {
  const { schoolId } = useSession();
  const { data: houses, loading: hLoading } = useHouses(schoolId);
  const { data: events, loading: eLoading } = useEvents(schoolId);
  const { data: regs, loading: rLoading } = useEventRegistrations(schoolId);

  // The student's house (matched by id or name), plus the league standing.
  const myHouse = useMemo<House | undefined>(
    () => houses.find((h) => h.id === houseRef || h.name === houseRef),
    [houses, houseRef],
  );
  const houseRank = useMemo(() => {
    if (!myHouse) return undefined;
    const ranked = houses
      .filter((h) => typeof h.points === 'number')
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    const idx = ranked.findIndex((h) => h.id === myHouse.id);
    return idx >= 0 ? { rank: idx + 1, of: ranked.length } : undefined;
  }, [houses, myHouse]);

  // This student's own event registrations (participation history).
  const myRegs = useMemo<EventRegistration[]>(() => {
    if (!studentId) return [];
    return regs
      .filter((r) => r.participantId === studentId && r.status !== 'cancelled')
      .sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0));
  }, [regs, studentId]);

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const attendedCount = myRegs.filter((r) => r.status === 'attended').length;

  const loading = hLoading || eLoading || rLoading;
  if (loading) {
    return (
      <div className="sp-stack">
        <Skeleton height={96} radius={14} />
        <Panel><Skeleton height={200} /></Panel>
      </div>
    );
  }

  return (
    <div className="sp-stack">
      <div className="kpi-grid">
        <KPICard
          icon="award"
          label="My house"
          value={myHouse?.name ?? '—'}
          sub={houseRank ? `Rank ${houseRank.rank} of ${houseRank.of}` : 'Not assigned'}
        />
        <KPICard icon="trophy" label="House points" count={myHouse?.points ?? 0} />
        <KPICard icon="calendar" label="Activities joined" count={myRegs.length} sub={`${attendedCount} attended`} />
      </div>

      {myHouse && (
        <Panel title="House standing">
          <div className="sp-house-card" style={myHouse.color ? { ['--house' as string]: myHouse.color } : undefined}>
            <span className="sp-house-card__crest" aria-hidden="true"><Icon name="award" size={22} /></span>
            <div className="sp-house-card__main">
              <div className="sp-house-card__name">{myHouse.name} House</div>
              {myHouse.motto && <div className="sp-house-card__motto">“{myHouse.motto}”</div>}
              {myHouse.masterName && <div className="sp-house-card__master">House master · {myHouse.masterName}</div>}
            </div>
            <div className="sp-house-card__pts">
              <span className="sp-house-card__val">{myHouse.points ?? 0}</span>
              <span className="sp-house-card__lbl">points</span>
            </div>
          </div>
        </Panel>
      )}

      {tags && tags.length > 0 && (
        <Panel title="Recognitions">
          <div className="sp-tags">
            {tags.map((t) => (
              <span key={t} className="sp-tag"><Icon name="sparkles" size={13} aria-hidden="true" />{t}</span>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Participation">
        {myRegs.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="No activities yet"
            message="When you take part in school events and competitions, your participation will be recorded here."
          />
        ) : (
          <ul className="sp-participation">
            {myRegs.map((r) => {
              const ev: SchoolEvent | undefined = eventById.get(r.eventId);
              const type = ev ? EVENT_TYPE_META[ev.type] ?? EVENT_TYPE_META.other : EVENT_TYPE_META.other;
              const meta = REGISTRATION_STATUS_META[r.status];
              return (
                <li key={r.id} className="sp-part">
                  <span className="sp-part__icon" aria-hidden="true"><Icon name={type.icon} size={15} /></span>
                  <div className="sp-part__main">
                    <div className="sp-part__title">{r.eventTitle ?? ev?.title ?? 'Event'}</div>
                    <div className="sp-part__meta">
                      {type.label}
                      {ev?.startDate != null && (
                        <>
                          <span className="sp-dot" aria-hidden="true" />
                          {formatDate(ev.startDate, 'DD MMM YYYY')}
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
