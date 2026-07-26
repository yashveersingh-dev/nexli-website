import { useMemo, useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentContext } from '@/features/studentportal/useStudentContext';
import type { House } from '@/types/academics';
import type { BadgeStatus, GamificationStats, LevelInfo, PointCurrency, Recognition } from '@/types/gamification';
import { useAllAttendance, useHouses, useMyCirculation, useMySubmissions } from './data';
import { computeLevel, computeStats, evaluateBadges, leadershipTitles, recognitions } from './engine';
import { CURRENCY_META, TIER_LABEL, TIER_VARIANT } from './catalogue';
import './gamification.css';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/**
 * Start date (`'yyyy-mm-dd'`) of the CURRENT academic session, used to bound the
 * attendance read that feeds XP / streaks. The engine sums lifetime present-days
 * and tracks a *best* streak, so a short rolling window would wrongly shrink XP
 * and reset the best streak; instead we scope to the active session (Indian
 * Apr→Mar). Tradeoff: points and streaks reflect THIS school year rather than
 * accumulating across years — the intended product behaviour — and the read is
 * capped at one session instead of scanning all history.
 */
function sessionStart(now: Date = new Date()): string {
  const y = now.getFullYear();
  // Apr (month 3) onwards belongs to year Y's session; Jan–Mar to (Y-1)'s.
  const startYear = now.getMonth() >= 3 ? y : y - 1;
  return `${startYear}-04-01`;
}

/**
 * Student-facing rewards / gamification screen (Phase 1).
 *
 * Everything is computed live from the student's real attendance, homework,
 * library and leadership records — no fabricated points. With no activity yet
 * the student sees an honest "start earning" empty state.
 */
export function RewardsPage() {
  const ctx = useStudentContext();

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Rewards</h1>
          <p className="nx-page__sub">Points, badges and streaks earned from your real school activity.</p>
        </div>
      </div>

      {ctx.status === 'not_linked' && (
        <Panel>
          <EmptyState
            icon="user"
            title="Account not linked yet"
            message="Your school will link your account to your student record. Your points and badges will appear here."
          />
        </Panel>
      )}
      {ctx.status === 'loading' && (
        <div className="gm-stack">
          <Skeleton height={120} radius={16} />
          <Skeleton height={90} radius={14} />
          <Panel>
            <Skeleton height={200} />
          </Panel>
        </div>
      )}
      {ctx.status === 'missing' && (
        <Panel>
          <EmptyState icon="info" title="Student record not found" message="We couldn't find your linked record. Please contact your school office." />
        </Panel>
      )}
      {ctx.status === 'ready' && ctx.studentId && (
        <RewardsBody
          studentId={ctx.studentId}
          studentName={ctx.student?.fullName ?? 'there'}
          firstName={ctx.student?.firstName}
          houseRef={ctx.student?.house}
          tags={ctx.student?.tags}
        />
      )}
    </div>
  );
}

function RewardsBody({
  studentId,
  studentName,
  firstName,
  houseRef,
  tags,
}: {
  studentId: string;
  studentName: string;
  firstName?: string;
  houseRef?: string;
  tags?: string[];
}) {
  const { schoolId } = useSession();
  // Bound the attendance read to the current academic session (see sessionStart):
  // preserves XP / best-streak correctness for this year while capping the read.
  const { data: attendance, loading: aLoading } = useAllAttendance(schoolId, { since: sessionStart() });
  const { data: submissions, loading: sLoading } = useMySubmissions(schoolId, studentId);
  const { data: circulation, loading: cLoading } = useMyCirculation(schoolId, studentId);
  const { data: houses, loading: hLoading } = useHouses(schoolId);

  const hasLeadership = leadershipTitles(tags).length > 0;

  const stats = useMemo<GamificationStats>(
    () => computeStats({ attendance, submissions, circulation, tags }, studentId),
    [attendance, submissions, circulation, tags, studentId],
  );
  const level = useMemo<LevelInfo>(() => computeLevel(stats.totalXp), [stats.totalXp]);
  const badges = useMemo<BadgeStatus[]>(() => evaluateBadges(stats, hasLeadership), [stats, hasLeadership]);
  const honours = useMemo<Recognition[]>(() => recognitions(tags), [tags]);

  const loading = aLoading || sLoading || cLoading;
  const [tab, setTab] = useState<'overview' | 'badges' | 'house'>('overview');

  if (loading) {
    return (
      <div className="gm-stack">
        <Skeleton height={120} radius={16} />
        <Skeleton height={90} radius={14} />
        <Panel>
          <Skeleton height={220} />
        </Panel>
      </div>
    );
  }

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="gm-stack">
      <HeroStrip name={firstName ?? studentName.split(' ')[0]} stats={stats} level={level} />

      {!stats.hasActivity ? (
        <Panel>
          <EmptyState
            icon="trophy"
            title="Start earning"
            message="As your attendance is marked, homework is submitted and you borrow library books, you'll earn points, badges and streaks here. Nothing is made up — it all reflects your real activity."
          />
        </Panel>
      ) : (
        <Tabs
          variant="line"
          aria-label="Rewards sections"
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: 'overview', label: 'Overview', icon: 'award' },
            { id: 'badges', label: 'Badges', icon: 'trophy', badge: earnedCount || undefined },
            { id: 'house', label: 'House', icon: 'bar-chart' },
          ]}
        >
          {(active) =>
            active === 'overview' ? (
              <OverviewTab stats={stats} honours={honours} badges={badges} />
            ) : active === 'badges' ? (
              <BadgeWall badges={badges} />
            ) : (
              <HouseTab houses={houses} houseRef={houseRef} loading={hLoading} />
            )
          }
        </Tabs>
      )}
    </div>
  );
}

/* ----------------------------- Hero ----------------------------- */

function HeroStrip({ name, stats, level }: { name: string; stats: GamificationStats; level: LevelInfo }) {
  const pct = Math.round(level.progress * 100);
  return (
    <section className="gm-hero">
      <div className="gm-hero__top">
        <div className="gm-hero__level" aria-hidden="true">
          {level.level}
        </div>
        <div className="gm-hero__main">
          <div className="gm-hero__hi">{greeting()}, {name}</div>
          <div className="gm-hero__rank">{level.levelName}</div>
        </div>
        <div className="gm-hero__xp">
          <span className="gm-hero__xpval">{stats.totalXp}</span>
          <span className="gm-hero__xplbl">total XP</span>
        </div>
      </div>
      <div className="gm-hero__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
        <span className="gm-hero__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="gm-hero__next">
        {level.isMax ? 'Top rank reached — legendary!' : `${level.xpToNext} XP to ${level.levelName.replace(/[IVX]+$/, '').trim() || 'next level'} →`}
      </div>
    </section>
  );
}

/* ----------------------------- Overview ----------------------------- */

function OverviewTab({ stats, honours, badges }: { stats: GamificationStats; honours: Recognition[]; badges: BadgeStatus[] }) {
  const recent = badges.filter((b) => b.earned).slice(0, 6);
  return (
    <div className="gm-stack">
      <StreakRow stats={stats} />

      {honours.length > 0 && (
        <Panel title="Recognition" sub="Honours awarded by your school">
          <div className="gm-honours">
            {honours.map((h) => (
              <div key={h.title} className="gm-honour">
                <span className="gm-honour__crest" aria-hidden="true">
                  <Icon name={h.icon} size={20} />
                </span>
                <div>
                  <div className="gm-honour__title">{h.title}</div>
                  <div className="gm-honour__blurb">{h.blurb}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <PointsBreakdown stats={stats} />

      <Panel title="Recent badges" headerRight={<Badge variant="info">{badges.filter((b) => b.earned).length} earned</Badge>}>
        {recent.length === 0 ? (
          <EmptyState icon="trophy" title="No badges yet" message="Keep your streaks going and your first badge is close." />
        ) : (
          <div className="gm-badge-grid">
            {recent.map((b) => (
              <BadgeTile key={b.def.id} status={b} compact />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function StreakRow({ stats }: { stats: GamificationStats }) {
  const cards: { icon: IconName; label: string; current: number; best: number; unit: string }[] = [
    { icon: 'clock', label: 'Attendance streak', current: stats.attendanceStreak, best: stats.attendanceStreakBest, unit: 'days' },
    { icon: 'check', label: 'Homework streak', current: stats.homeworkStreak, best: stats.homeworkStreakBest, unit: 'on-time' },
    { icon: 'book', label: 'Reading days', current: stats.readingDays, best: stats.readingDays, unit: 'days' },
  ];
  return (
    <div className="gm-streaks">
      {cards.map((c) => (
        <div key={c.label} className={`gm-streak${c.current > 0 ? ' is-active' : ''}`}>
          <span className="gm-streak__icon" aria-hidden="true">
            <Icon name={c.icon} size={18} />
          </span>
          <div className="gm-streak__val">{c.current}</div>
          <div className="gm-streak__lbl">{c.label}</div>
          <div className="gm-streak__sub">
            {c.current > 0 ? `${c.current} ${c.unit}` : 'Start one!'}
            {c.best > c.current ? ` · best ${c.best}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function PointsBreakdown({ stats }: { stats: GamificationStats }) {
  const [open, setOpen] = useState(false);
  const order: PointCurrency[] = ['discipline', 'diligence', 'reading', 'participation', 'character'];
  const max = Math.max(1, ...order.map((k) => stats.points[k]));
  return (
    <Panel
      title="Points breakdown"
      headerRight={
        <button type="button" className="gm-link" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'How points work'}
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} />
        </button>
      }
    >
      <div className="gm-points">
        {order.map((k) => {
          const meta = CURRENCY_META[k];
          const val = stats.points[k];
          return (
            <div key={k} className="gm-point">
              <span className="gm-point__icon" aria-hidden="true">
                <Icon name={meta.icon} size={15} />
              </span>
              <div className="gm-point__body">
                <div className="gm-point__head">
                  <span className="gm-point__label">{meta.label}</span>
                  <span className="gm-point__val">{val}</span>
                </div>
                <div className="gm-point__track">
                  <span className="gm-point__fill" style={{ width: `${(val / max) * 100}%` }} />
                </div>
                {open && <div className="gm-point__how">{meta.how}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ----------------------------- Badges ----------------------------- */

function BadgeWall({ badges }: { badges: BadgeStatus[] }) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  return (
    <div className="gm-stack">
      <Panel title="Earned" headerRight={<Badge variant="success">{earned.length}</Badge>}>
        {earned.length === 0 ? (
          <EmptyState icon="trophy" title="No badges yet" message="Your earned badges will appear here. The locked ones below show exactly how to get them." />
        ) : (
          <div className="gm-badge-grid">
            {earned.map((b) => (
              <BadgeTile key={b.def.id} status={b} />
            ))}
          </div>
        )}
      </Panel>
      <Panel title="To earn" sub="Tap to see how" headerRight={<Badge variant="muted">{locked.length}</Badge>}>
        <div className="gm-badge-grid">
          {locked.map((b) => (
            <BadgeTile key={b.def.id} status={b} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BadgeTile({ status, compact }: { status: BadgeStatus; compact?: boolean }) {
  const { def, earned, progress, progressLabel } = status;
  const pct = Math.round(progress * 100);
  return (
    <div className={`gm-badge${earned ? ' is-earned' : ' is-locked'}`} title={earned ? def.description : def.howToEarn}>
      <span className={`gm-badge__medal gm-badge__medal--${def.tier}`} aria-hidden="true">
        <Icon name={earned ? def.icon : 'lock'} size={compact ? 18 : 22} />
      </span>
      <div className="gm-badge__label">{def.label}</div>
      {earned ? (
        <Badge variant={TIER_VARIANT[def.tier]}>{TIER_LABEL[def.tier]}</Badge>
      ) : (
        <>
          {!compact && <div className="gm-badge__how">{def.howToEarn}</div>}
          <div className="gm-badge__track" aria-hidden="true">
            <span className="gm-badge__fill" style={{ width: `${pct}%` }} />
          </div>
          {progressLabel && <div className="gm-badge__progress">{progressLabel}</div>}
        </>
      )}
    </div>
  );
}

/* ----------------------------- House ----------------------------- */

function HouseTab({ houses, houseRef, loading }: { houses: House[]; houseRef?: string; loading: boolean }) {
  const ranked = useMemo(
    () => [...houses].filter((h) => typeof h.points === 'number').sort((a, b) => (b.points ?? 0) - (a.points ?? 0)),
    [houses],
  );
  const myHouse = useMemo(() => houses.find((h) => h.id === houseRef || h.name === houseRef), [houses, houseRef]);

  if (loading) return <Skeleton height={220} />;
  if (ranked.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon="bar-chart"
          title="No house standings yet"
          message="When your school awards house points, the league table will appear here. House boards keep the competition friendly and team-based."
        />
      </Panel>
    );
  }
  return (
    <Panel title="House league" sub="Team standings — earn together">
      <div className="gm-houses">
        {ranked.map((h, i) => {
          const mine = myHouse && h.id === myHouse.id;
          return (
            <div key={h.id} className={`gm-houserow${mine ? ' is-mine' : ''}`} style={h.color ? { ['--house' as string]: h.color } : undefined}>
              <span className="gm-houserow__rank">{i + 1}</span>
              <span className="gm-houserow__crest" aria-hidden="true">
                <Icon name="award" size={16} />
              </span>
              <div className="gm-houserow__name">
                {h.name}
                {mine && <Badge variant="info">Your house</Badge>}
              </div>
              <span className="gm-houserow__pts">{h.points ?? 0}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
