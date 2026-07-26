import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrievances } from '@/features/compliance/data';
import {
  GRIEVANCE_STATUS_META,
  GRIEVANCE_STATUS_OPTIONS,
  GRIEVANCE_PRIORITY_META,
  GRIEVANCE_PRIORITY_OPTIONS,
} from './meta';
import { isGrievanceOverdue } from './safeguardingSchema';
import type { Grievance } from '@/types/compliance';

const RESOLVED = new Set(['resolved', 'closed']);

/** Grievance register with status/priority filters and an overdue indicator. */
export function GrievancesTab() {
  const navigate = useNavigate();
  const { schoolId, can } = useSession();
  const canWrite = can('pocso.write') || can('grievances.write');
  const { data: grievances, loading, error } = useGrievances(schoolId);

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [view, setView] = useState('open'); // open | all | resolved

  const kpis = useMemo(() => {
    let open = 0, overdue = 0, resolved = 0;
    for (const g of grievances) {
      if (RESOLVED.has(g.status)) resolved++;
      else open++;
      if (isGrievanceOverdue(g)) overdue++;
    }
    return { open, overdue, resolved };
  }, [grievances]);

  const rows = useMemo(() => {
    return grievances
      .filter((g) => (status ? g.status === status : true))
      .filter((g) => (priority ? g.priority === priority : true))
      .filter((g) =>
        view === 'resolved' ? RESOLVED.has(g.status) : view === 'open' ? !RESOLVED.has(g.status) : true,
      )
      .sort((a, b) => b.raisedAt - a.raisedAt);
  }, [grievances, status, priority, view]);

  return (
    <div className="sg-tab">
      <div className="kpi-grid">
        <KPICard
          icon="message"
          label="Open"
          count={kpis.open}
          format="us"
          subColor={kpis.open ? 'var(--warning)' : 'var(--success)'}
          sub={kpis.open ? 'awaiting action' : 'none open'}
        />
        <KPICard
          icon="clock"
          label="Overdue"
          count={kpis.overdue}
          format="us"
          subColor={kpis.overdue ? 'var(--danger)' : undefined}
          sub={kpis.overdue ? 'past 7-day SLA' : undefined}
        />
        <KPICard icon="check-circle" label="Resolved" count={kpis.resolved} format="us" />
      </div>

      <div className="nx-toolbar">
        <Select
          value={view}
          onChange={(e) => setView(e.target.value)}
          aria-label="View"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
          options={[{ value: '', label: 'All statuses' }, ...GRIEVANCE_STATUS_OPTIONS]}
        />
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Priority"
          options={[{ value: '', label: 'All priorities' }, ...GRIEVANCE_PRIORITY_OPTIONS]}
        />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/safeguarding/grievances/new')}>
            Raise grievance
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load grievances" message="Please try again." />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="message"
            title={view === 'resolved' ? 'Nothing resolved yet' : 'No grievances logged'}
            message={
              canWrite
                ? 'Raise a grievance to start the redressal workflow.'
                : 'Grievances will appear here.'
            }
            action={
              canWrite && view !== 'resolved' ? (
                <Button variant="gold" leftIcon="plus" onClick={() => navigate('/safeguarding/grievances/new')}>
                  Raise grievance
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="fin-kv-list" style={{ gap: 10 }}>
          {rows.map((g) => (
            <GrievanceRow key={g.id} g={g} onOpen={() => navigate(`/safeguarding/grievances/${g.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrievanceRow({ g, onOpen }: { g: Grievance; onOpen: () => void }) {
  const st = GRIEVANCE_STATUS_META[g.status];
  const pr = GRIEVANCE_PRIORITY_META[g.priority];
  const overdue = isGrievanceOverdue(g);
  const who = g.anonymous ? 'Anonymous' : g.raisedByName || 'Unknown';
  return (
    <button type="button" className="sg-row" onClick={onOpen} aria-label={`Open grievance ${g.refNo}`}>
      <div className="sg-row__main">
        <div className="sg-row__no">
          <Icon name="message" size={13} aria-hidden="true" /> {g.refNo}
        </div>
        <div className="sg-row__meta">
          <span>{g.subject}</span>
          <span aria-hidden="true">·</span>
          <span>{who}</span>
          <span aria-hidden="true">·</span>
          <span>Raised {formatDate(g.raisedAt)}</span>
          {overdue && (
            <span className="sg-overdue">
              <Icon name="clock" size={11} aria-hidden="true" /> Overdue
            </span>
          )}
        </div>
      </div>
      <div className="sg-row__badges">
        <Badge variant={pr.variant}>{pr.label}</Badge>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>
    </button>
  );
}
