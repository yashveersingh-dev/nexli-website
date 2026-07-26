import { Panel } from '@/components/Panel';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import type {
  ReportCard, ReportCardActivity, ReportCardSport,
} from '@/types/reportcard';

export interface TrendPoint {
  term: string;
  pct: number;
  /** Marks the point belonging to the card currently being viewed. */
  current?: boolean;
}

/** Map a sports performance / activity participation rating to a badge variant. */
const RATING_VARIANT: Record<string, BadgeVariant> = {
  excellent: 'success',
  good: 'info',
  satisfactory: 'warning',
  needs_improvement: 'danger',
  minimal: 'muted',
};
const ratingLabel = (r: string) =>
  r ? r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—';

/**
 * Simple CSS bar chart of overall % across the student's terms in one academic
 * year. No chart library — pure fl/inline layout. Bars are scaled to the larger
 * of 100 or the max point so a >100 edge case never overflows.
 */
function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(100, ...points.map((p) => p.pct));
  return (
    <div className="rc-trend" role="img" aria-label={`Academic trend: ${points.map((p) => `${p.term} ${p.pct}%`).join(', ')}`}>
      {points.map((p, i) => (
        <div className={`rc-trend__col ${p.current ? 'is-current' : ''}`} key={`${p.term}-${i}`}>
          <span className="rc-trend__pct">{p.pct}%</span>
          <div className="rc-trend__bar" style={{ height: `${Math.max(4, (p.pct / max) * 96)}px` }} />
          <span className="rc-trend__term">{p.term}</span>
        </div>
      ))}
    </div>
  );
}

/** Sports + activities summary drawn from the CURRENT card (with performance badges). */
function SportsActivitiesSummary({ sports, activities }: { sports: ReportCardSport[]; activities: ReportCardActivity[] }) {
  return (
    <div className="rc-sasummary">
      {sports.length > 0 && (
        <div className="rc-sasummary__group">
          <div className="rc-doc__section-title"><Icon name="trophy" size={13} /> Sports &amp; games</div>
          <div className="rc-sasummary__items">
            {sports.map((s, i) => (
              <span className="rc-sasummary__item" key={`${s.activity}-${i}`}>
                <b>{s.activity || '—'}</b>
                {s.performance && <Badge variant={RATING_VARIANT[s.performance] ?? 'muted'}>{ratingLabel(s.performance)}</Badge>}
              </span>
            ))}
          </div>
        </div>
      )}
      {activities.length > 0 && (
        <div className="rc-sasummary__group">
          <div className="rc-doc__section-title"><Icon name="activity" size={13} /> Activities &amp; clubs</div>
          <div className="rc-sasummary__items">
            {activities.map((a, i) => (
              <span className="rc-sasummary__item" key={`${a.activity}-${i}`}>
                <b>{a.activity || '—'}</b>
                {a.participation && <Badge variant={RATING_VARIANT[a.participation] ?? 'muted'}>{ratingLabel(a.participation)}</Badge>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * App-view (non-print) enhancement shown under the printable card: an academic
 * trend chart across the year's terms plus a sports/activities summary for the
 * current term. Renders nothing when there's nothing useful to show.
 */
export function ReportCardTrend({
  points,
  card,
  className,
}: {
  points: TrendPoint[];
  card: ReportCard;
  className?: string;
}) {
  const sports = card.sports ?? [];
  const activities = card.activities ?? [];
  const hasSA = sports.length > 0 || activities.length > 0;
  const hasMultiTerm = points.length >= 2;

  // Nothing to add beyond the printed doc — render nothing.
  if (!hasMultiTerm && points.length === 0 && !hasSA) return null;

  return (
    <Panel title="Performance trend" className={className} sub="How this student is tracking across the year — shown in the app only, not on the printed card.">
      {hasMultiTerm ? (
        <TrendChart points={points} />
      ) : points.length === 1 ? (
        <p className="rc-note" style={{ margin: 0 }}>
          <Icon name="info" size={14} />
          Showing {points[0].term} ({points[0].pct}%). More terms will appear here as they are published.
        </p>
      ) : (
        <p className="rc-note" style={{ margin: 0 }}>
          <Icon name="info" size={14} />
          The academic trend will appear once this term's marks and at least one other term are available.
        </p>
      )}

      {hasSA && <SportsActivitiesSummary sports={sports} activities={activities} />}
    </Panel>
  );
}
