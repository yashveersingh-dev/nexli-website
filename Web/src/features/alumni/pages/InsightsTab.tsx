import { useMemo } from 'react';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Donut, DonutLegend } from '@/components/charts';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useAlumni } from '@/features/analytics/data';
import type { Alumnus } from '@/types/community';
import { batchDecade } from '../meta';

interface DistRow {
  label: string;
  count: number;
}

function tally(alumni: Alumnus[], pick: (a: Alumnus) => string | null): DistRow[] {
  const map = new Map<string, number>();
  for (const a of alumni) {
    const key = pick(a);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count }));
}

export function InsightsTab() {
  const { schoolId } = useSession();
  const { data: alumni, loading } = useAlumni(schoolId);

  const insights = useMemo(() => {
    const total = alumni.length;
    const byIndustry = tally(alumni, (a) => a.industry ?? null).sort((a, b) => b.count - a.count);
    const byDecade = tally(alumni, (a) => batchDecade(a.batchYear)).sort((a, b) => a.label.localeCompare(b.label));
    const mentors = alumni.filter((a) => a.willingToMentor).length;
    const verified = alumni.filter((a) => a.verified).length;
    const unknownIndustry = alumni.filter((a) => !a.industry).length;
    const topIndustryMax = Math.max(...byIndustry.map((r) => r.count), 1);
    const topDecadeMax = Math.max(...byDecade.map((r) => r.count), 1);
    return { total, byIndustry, byDecade, mentors, verified, unknownIndustry, topIndustryMax, topDecadeMax };
  }, [alumni]);

  if (loading) return <Skeleton height={320} />;

  if (insights.total === 0) {
    return (
      <Panel>
        <EmptyState
          icon="bar-chart"
          title="No alumni data yet"
          message="Career insights — industry distribution, batch decades and mentor availability — appear once alumni are added."
        />
      </Panel>
    );
  }

  const mentorPct = Math.round((insights.mentors / insights.total) * 100);

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="users" label="Total alumni" count={insights.total} format="us" />
        <KPICard icon="briefcase" label="Industries" count={insights.byIndustry.length} format="us" />
        <KPICard icon="sparkles" label="Mentor availability" count={mentorPct} format="percent" suffix="%" subColor="var(--gold)" sub={`${insights.mentors} of ${insights.total}`} />
        <KPICard icon="check-circle" label="Verified" count={insights.verified} format="us" />
      </div>

      <div className="an-grid">
        <Panel title="Alumni by industry" sub={insights.unknownIndustry ? `${insights.unknownIndustry} unspecified` : undefined}>
          {insights.byIndustry.length === 0 ? (
            <EmptyState icon="briefcase" title="No industries recorded" message="Add an industry to alumni profiles to see this breakdown." />
          ) : (
            <div className="an-dist">
              {insights.byIndustry.map((row) => (
                <div className="an-dist__row" key={row.label}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.label}>
                    {row.label}
                  </span>
                  <span className="an-dist__bar">
                    <span className="an-dist__fill" style={{ width: `${(row.count / insights.topIndustryMax) * 100}%` }} />
                  </span>
                  <span className="an-dist__val">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Mentor availability">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Donut
              size={150}
              stroke={20}
              segments={[
                { value: insights.mentors, color: 'var(--gold)', label: 'Mentors' },
                { value: Math.max(insights.total - insights.mentors, 0), color: 'rgba(255,255,255,0.10)', label: 'Not mentoring' },
              ]}
              centerValue={`${mentorPct}%`}
              centerLabel="mentors"
            />
            <DonutLegend
              items={[
                { label: 'Willing to mentor', value: insights.mentors, color: 'var(--gold)' },
                { label: 'Not mentoring', value: Math.max(insights.total - insights.mentors, 0), color: 'rgba(255,255,255,0.18)' },
              ]}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Alumni by batch decade">
        {insights.byDecade.length === 0 ? (
          <EmptyState icon="calendar" title="No batch years recorded" message="Add a batch year to alumni profiles to see this distribution." />
        ) : (
          <div className="an-dist">
            {insights.byDecade.map((row) => (
              <div className="an-dist__row" key={row.label}>
                <span>{row.label}</span>
                <span className="an-dist__bar">
                  <span className="an-dist__fill" style={{ width: `${(row.count / insights.topDecadeMax) * 100}%` }} />
                </span>
                <span className="an-dist__val">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
