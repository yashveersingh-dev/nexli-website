import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useIepPlans } from '@/features/analytics/data';
import { IEP_STATUS_META } from '@/features/analytics/meta';
import { isReviewDue, goalsAchieved } from './iepSchema';
import type { IepPlan } from '@/types/special';

interface CwsnRow {
  plan: IepPlan;
  goalsTotal: number;
  goalsDone: number;
  reviewDue: boolean;
}

/**
 * CWSN (Children With Special Needs) register — a derived roster of every
 * student who has an IEP plan, with disability, plan status and goals achieved.
 * Each row links to the underlying plan.
 */
export function CwsnRegisterTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { data: plans, loading, error } = useIepPlans(schoolId);
  const [q, setQ] = useState('');

  const register = useMemo<CwsnRow[]>(() => {
    // One row per student; keep the most recent plan if duplicates exist.
    const byStudent = new Map<string, IepPlan>();
    for (const p of plans) {
      const prev = byStudent.get(p.studentId);
      if (!prev || (p.createdAt ?? 0) > (prev.createdAt ?? 0)) byStudent.set(p.studentId, p);
    }
    return Array.from(byStudent.values())
      .map((plan) => ({
        plan,
        goalsTotal: plan.goals?.length ?? 0,
        goalsDone: goalsAchieved(plan.goals),
        reviewDue: isReviewDue(plan) || plan.status === 'review_due',
      }))
      .sort((a, b) => a.plan.studentName.localeCompare(b.plan.studentName));
  }, [plans]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return register;
    return register.filter(
      (r) =>
        r.plan.studentName.toLowerCase().includes(term) ||
        (r.plan.disability ?? '').toLowerCase().includes(term) ||
        (r.plan.gradeName ?? '').toLowerCase().includes(term),
    );
  }, [register, q]);

  const kpis = useMemo(() => {
    const reviewDue = register.filter((r) => r.reviewDue && r.plan.status !== 'closed').length;
    const active = register.filter((r) => r.plan.status !== 'closed').length;
    return { total: register.length, active, reviewDue };
  }, [register]);

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="users" label="CWSN learners" count={kpis.total} format="us" />
        <KPICard
          icon="file-text"
          label="Active plans"
          count={kpis.active}
          format="us"
          subColor={kpis.active ? 'var(--success)' : undefined}
        />
        <KPICard
          icon="clock"
          label="Reviews due"
          count={kpis.reviewDue}
          format="us"
          subColor={kpis.reviewDue ? 'var(--warning)' : undefined}
        />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Input
          leftIcon="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search learners, grade or disability"
          aria-label="Search the CWSN register"
        />
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load the register" message="Please try again." />
        </Panel>
      ) : register.length === 0 ? (
        <Panel>
          <EmptyState
            icon="users"
            title="No CWSN learners yet"
            message="Students appear here automatically once they have an IEP plan."
          />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState icon="search" title="No matches" message="Try a different search term." />
        </Panel>
      ) : (
        <Panel
          title="CWSN register"
          sub={`${rows.length} of ${register.length}`}
          bodyClassName="sped-table-wrap"
        >
          <table className="sped-table">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Grade</th>
                <th scope="col">Disability</th>
                <th scope="col" className="sped-table__num">
                  Goals achieved
                </th>
                <th scope="col">Plan status</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st =
                  IEP_STATUS_META[r.reviewDue && r.plan.status !== 'closed' ? 'review_due' : r.plan.status];
                return (
                  <tr
                    key={r.plan.id}
                    className="sped-table__row"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open IEP plan for ${r.plan.studentName}`}
                    onClick={() => navigate(`/sped/${r.plan.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/sped/${r.plan.id}`);
                      }
                    }}
                  >
                    <td data-label="Student">
                      <span className="sped-table__student">
                        <Icon name="user" size={13} aria-hidden="true" /> {r.plan.studentName}
                      </span>
                    </td>
                    <td data-label="Grade">{r.plan.gradeName || '—'}</td>
                    <td data-label="Disability">{r.plan.disability || '—'}</td>
                    <td data-label="Goals achieved" className="sped-table__num">
                      {r.goalsDone}/{r.goalsTotal}
                    </td>
                    <td data-label="Plan status">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="sped-table__chev" aria-hidden="true">
                      <Icon name="chevron-right" size={16} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
