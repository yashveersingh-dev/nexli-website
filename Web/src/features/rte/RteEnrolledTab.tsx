import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import type { SocialCategory } from '@/types/sis';

const CATEGORY_LABEL: Record<SocialCategory, string> = {
  general: 'General', obc: 'OBC', sc: 'SC', st: 'ST', ews: 'EWS', other: 'Other',
};

/**
 * RTE-quota enrolment overview — derived live from the school's own student
 * records (the SAME source UDISE+ reads), so the page shows real numbers even
 * before any RTE applications are filed. Honest at zero: if no students are
 * flagged RTE/EWS, it says so rather than rendering an empty workflow.
 */
export function RteEnrolledTab() {
  const { schoolId } = useSession();
  const { data: students, loading, error } = useStudents(schoolId);

  const active = useMemo(() => students.filter((s) => s.status === 'active'), [students]);
  const rte = useMemo(() => active.filter((s) => s.rteQuota === true), [active]);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of active) {
      const k = s.category ?? 'other';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [active]);
  const pct = active.length ? ((rte.length / active.length) * 100).toFixed(1) : '0';

  if (loading) return <Skeleton height={260} />;
  if (error) {
    return (
      <Panel>
        <EmptyState icon="alert-triangle" title="Could not load student records" message="We could not reach the student records the RTE-quota summary is derived from. Please try again." />
      </Panel>
    );
  }
  if (active.length === 0) {
    return (
      <Panel>
        <EmptyState icon="users" title="No students enrolled yet" message="The RTE-quota summary is derived from your student records — it will populate once students are admitted." />
      </Panel>
    );
  }

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 };

  return (
    <div>
      <div style={grid}>
        <KPICard icon="users" label="Active students" count={active.length} format="us" />
        <KPICard icon="award" label="RTE / EWS quota" count={rte.length} format="us" sub={`${pct}% of enrolment`} subColor="var(--gold)" />
        <KPICard icon="check-circle" label="25% quota target" count={Math.ceil(active.length * 0.25)} format="us" sub="reserved seats" />
      </div>

      <div className="grid g-2">
        <Panel title="Enrolment by social category" sub="From student records (same source as UDISE+)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byCategory.map(([k, n]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 64, fontSize: 13 }}>{CATEGORY_LABEL[k as SocialCategory] ?? k}</span>
                <span style={{ flex: 1, height: 8, borderRadius: 6, background: 'var(--surface-2, rgba(255,255,255,0.06))', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${active.length ? (n / active.length) * 100 : 0}%`, background: 'var(--gold)' }} />
                </span>
                <span style={{ width: 36, textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>{n}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="RTE-quota students" sub={rte.length ? `${rte.length}` : undefined}>
          {rte.length === 0 ? (
            <EmptyState
              icon="award"
              title="No RTE / EWS students flagged yet"
              message="Mark a student's RTE/EWS quota on their profile, or admit RTE applicants from the Applications tab. The 25% reservation summary above updates automatically."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rte.map((s) => (
                <Link key={s.id} to={`/students/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', textDecoration: 'none', color: 'inherit' }}>
                  <Avatar name={s.fullName} src={s.photoUrl} size={30} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[s.gradeName, s.sectionName].filter(Boolean).join(' · ')}</div>
                  </div>
                  <Badge variant="info">{CATEGORY_LABEL[(s.category ?? 'other') as SocialCategory]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
