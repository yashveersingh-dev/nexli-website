import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input } from '@/components/form';
import { useCan, useSession } from '@/app/providers/SessionProvider';
import { useAdmissions } from '@/features/school/data';
import { ADMISSION_STAGE_META } from '@/features/school/meta';
import { formatDate } from '@/lib/format';
import { ADMISSION_STAGES, type Admission, type AdmissionStage } from '@/types/sis';
import './admissions.css';

const PAGE_SIZE = 25;

export function AdmissionsPipelinePage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useCan('students.write');
  const { data: admissions, loading, error } = useAdmissions(schoolId);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<AdmissionStage | ''>('');
  const [page, setPage] = useState(1);

  // Count per pipeline stage for the summary strip.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of admissions) c[a.stage] = (c[a.stage] ?? 0) + 1;
    return c;
  }, [admissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return admissions
      .filter((a) => !stage || a.stage === stage)
      .filter(
        (a) =>
          !q ||
          a.applicantName?.toLowerCase().includes(q) ||
          a.guardianName?.toLowerCase().includes(q) ||
          a.gradeAppliedName?.toLowerCase().includes(q),
      )
      .sort((a, b) => (b.appliedDate ?? 0) - (a.appliedDate ?? 0));
  }, [admissions, search, stage]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Admission>[] = [
    {
      key: 'name',
      header: 'Applicant',
      primary: true,
      render: (a) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.applicantName}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.gradeAppliedName || 'Grade not set'}</div>
        </div>
      ),
    },
    { key: 'grade', header: 'Grade applied', hideOnMobile: true, render: (a) => a.gradeAppliedName || '—' },
    { key: 'guardian', header: 'Guardian', render: (a) => a.guardianName || '—' },
    { key: 'applied', header: 'Applied', hideOnMobile: true, render: (a) => (a.appliedDate ? formatDate(a.appliedDate) : '—') },
    {
      key: 'stage',
      header: 'Stage',
      render: (a) => {
        const m = ADMISSION_STAGE_META[a.stage];
        return <Badge variant={m.variant}>{m.label}</Badge>;
      },
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Admissions</h1>
          <p className="nx-page__sub">
            {loading ? 'Loading…' : `${admissions.length} application${admissions.length === 1 ? '' : 's'} in the pipeline`}
          </p>
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="user-plus" onClick={() => navigate('/admissions/new')}>
            New application
          </Button>
        )}
      </div>

      {/* Stage summary strip — clickable filter tiles. */}
      <div className="nx-statstrip nx-pipeline-strip" role="group" aria-label="Filter by stage">
        <button
          type="button"
          className={`nx-statstrip__item nx-pipeline-tile${stage === '' ? ' is-active' : ''}`}
          aria-pressed={stage === ''}
          onClick={() => {
            setStage('');
            setPage(1);
          }}
        >
          <div className="nx-statstrip__val">{admissions.length}</div>
          <div className="nx-statstrip__lbl">All stages</div>
        </button>
        {ADMISSION_STAGES.map((st) => {
          const m = ADMISSION_STAGE_META[st];
          return (
            <button
              key={st}
              type="button"
              className={`nx-statstrip__item nx-pipeline-tile${stage === st ? ' is-active' : ''}`}
              aria-pressed={stage === st}
              onClick={() => {
                setStage((cur) => (cur === st ? '' : st));
                setPage(1);
              }}
            >
              <div className="nx-statstrip__val" style={{ color: m.color }}>
                {counts[st] ?? 0}
              </div>
              <div className="nx-statstrip__lbl">{m.label}</div>
            </button>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(a) => a.id}
        loading={loading}
        error={error ? 'Could not load applications.' : null}
        onRowClick={(a) => navigate(`/admissions/${a.id}`)}
        emptyIcon="file-text"
        emptyTitle={search || stage ? 'No applications match your filters' : 'No applications yet'}
        emptyMessage={
          search || stage ? 'Try clearing the search or stage filter.' : 'Start a new application to begin the admissions pipeline.'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input
                leftIcon="search"
                placeholder="Search by applicant, guardian or grade…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search applications"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
