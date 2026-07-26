import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { KPICard } from '@/components/KPICard';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useClinicVisits } from '@/features/ops/data';
import { VISIT_OUTCOME_META, VISIT_OUTCOME_OPTIONS } from '@/features/ops/meta';
import type { ClinicVisit } from '@/types/ops';

const isToday = (t?: number) => {
  if (!t) return false;
  const d = new Date(t);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
const within7d = (t?: number) => !!t && Date.now() - t <= 7 * 86_400_000;

export function ClinicVisitsTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useOwnership('medical').canOperate;
  const { data: visits, loading, error } = useClinicVisits(schoolId);

  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState('');
  const [range, setRange] = useState('');

  const stats = useMemo(() => {
    const today = visits.filter((v) => isToday(v.date));
    return {
      today: today.length,
      week: visits.filter((v) => within7d(v.date)).length,
      escalated: visits.filter((v) => within7d(v.date) && (v.outcome === 'referred' || v.outcome === 'hospital')).length,
    };
  }, [visits]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visits
      .filter((v) => (outcome ? v.outcome === outcome : true))
      .filter((v) => (range === 'today' ? isToday(v.date) : range === 'week' ? within7d(v.date) : true))
      .filter((v) =>
        needle ? [v.studentName, v.gradeName, v.complaint, v.diagnosis].some((x) => x?.toLowerCase().includes(needle)) : true,
      )
      .sort((a, b) => (b.date ?? b.createdAt ?? 0) - (a.date ?? a.createdAt ?? 0));
  }, [visits, q, outcome, range]);

  const columns: Column<ClinicVisit>[] = [
    {
      key: 'student',
      header: 'Student',
      primary: true,
      render: (v) => (
        <span className="med-row">
          <span className="med-row__avatar" aria-hidden="true">{v.studentName.slice(0, 1).toUpperCase()}</span>
          <span className="med-row__text">
            <span className="med-row__title">{v.studentName}</span>
            <span className="med-row__sub">{v.gradeName ? `${v.gradeName} · ` : ''}{v.complaint}</span>
          </span>
        </span>
      ),
    },
    { key: 'date', header: 'Date', hideOnMobile: true, render: (v) => (v.date ? formatDate(v.date) : '—') },
    {
      key: 'parent',
      header: 'Parent',
      hideOnMobile: true,
      render: (v) =>
        v.parentNotified ? (
          <span className="med-flag med-flag--ok"><Icon name="check-circle" size={13} /> Notified</span>
        ) : (
          <span className="med-flag med-flag--muted"><Icon name="minus-circle" size={13} /> Not yet</span>
        ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      align: 'right',
      render: (v) => <Badge variant={VISIT_OUTCOME_META[v.outcome].variant}>{VISIT_OUTCOME_META[v.outcome].label}</Badge>,
    },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input
          leftIcon="search"
          placeholder="Search by student or complaint…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search clinic visits"
        />
      </div>
      <Select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        aria-label="Filter by outcome"
        options={[{ value: '', label: 'All outcomes' }, ...VISIT_OUTCOME_OPTIONS]}
      />
      <Select
        value={range}
        onChange={(e) => setRange(e.target.value)}
        aria-label="Filter by date"
        options={[
          { value: '', label: 'All dates' },
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Last 7 days' },
        ]}
      />
    </div>
  );

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="heart-pulse" label="Visits today" count={stats.today} format="us" subColor={stats.today ? 'var(--gold)' : undefined} />
        <KPICard icon="calendar" label="This week" count={stats.week} format="us" />
        <KPICard icon="alert-triangle" label="Escalated (7d)" count={stats.escalated} format="us" subColor={stats.escalated ? 'var(--danger)' : undefined} />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>
          Recent clinic visits, most recent first.
        </p>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/medical/visits/new')}>
            Log visit
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        loading={loading}
        error={error ? 'Could not load clinic visits.' : null}
        toolbar={toolbar}
        emptyIcon="heart-pulse"
        emptyTitle={q || outcome || range ? 'No matching visits' : 'No clinic visits yet'}
        emptyMessage={
          q || outcome || range
            ? 'Try a different search or filter.'
            : canWrite
              ? 'Log a visit to start the clinic register.'
              : 'Clinic visits will appear here.'
        }
      />

      <p className="med-note">
        <Icon name="lock" size={13} /> Confidential — clinic staff only.
      </p>
    </div>
  );
}
