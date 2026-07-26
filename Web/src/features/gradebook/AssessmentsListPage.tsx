import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useGrades, useSections } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { useAssessments } from '@/features/daily/data';
import { ASSESSMENT_TYPE_OPTIONS } from '@/features/daily/meta';
import { formatDate } from '@/lib/format';
import type { Assessment } from '@/types/daily';
import './gradebook.css';

const PAGE_SIZE = 25;
const typeLabel = (t: string) => ASSESSMENT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

export function AssessmentsListPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('gradebook');
  const canWrite = canOperate;
  const [sectionId, setSectionId] = useState('');
  const { data: assessments, loading, error } = useAssessments(schoolId, sectionId || undefined);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  // Section scope: a scoped class/subject teacher only sees their own section(s)'
  // assessments (reaches this page via the gradebook.read.* → gradebook.read nav
  // inference). Coordinators/HOD/VP/leadership see all.
  const { isBroad, sectionIds } = useScopedSectionIds('gradebook', 'gradebook.read', sections);
  const visibleSections = useMemo(
    () => (isBroad || !sectionIds ? sections : sections.filter((s) => sectionIds.has(s.id))),
    [isBroad, sectionIds, sections],
  );
  const scopedNoSections = !isBroad && visibleSections.length === 0;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name;
  const sectionLabel = (sid: string) => {
    const s = sections.find((x) => x.id === sid);
    return s ? `${gradeName(s.gradeId) ?? ''} ${s.name}`.trim() : '—';
  };
  const sectionOptions = [{ value: '', label: 'All sections' }, ...visibleSections.map((s) => ({ value: s.id, label: `${gradeName(s.gradeId) ?? ''} ${s.name}`.trim() }))];

  const scoped = useMemo(
    () => (isBroad ? assessments : assessments.filter((a) => !!a.sectionId && sectionIds!.has(a.sectionId))),
    [assessments, isBroad, sectionIds],
  );

  const stats = useMemo(() => {
    const published = scoped.filter((a) => a.published).length;
    return { total: scoped.length, published, drafts: scoped.length - published };
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...scoped]
      .filter((a) => !q || a.name?.toLowerCase().includes(q) || a.subjectName?.toLowerCase().includes(q))
      .sort((a, b) => (b.date ?? b.createdAt ?? 0) - (a.date ?? a.createdAt ?? 0));
  }, [scoped, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Assessment>[] = [
    {
      key: 'name',
      header: 'Assessment',
      primary: true,
      render: (a) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{typeLabel(a.type)}</div>
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', render: (a) => a.subjectName || '—' },
    { key: 'section', header: 'Section', render: (a) => a.sectionName || sectionLabel(a.sectionId) },
    { key: 'max', header: 'Max', align: 'right', render: (a) => a.maxMarks },
    { key: 'date', header: 'Date', hideOnMobile: true, render: (a) => (a.date ? formatDate(a.date) : '—') },
    {
      key: 'published',
      header: 'Status',
      render: (a) => <Badge variant={a.published ? 'success' : 'muted'}>{a.published ? 'Published' : 'Draft'}</Badge>,
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Class Assessments</h1>
          <p className="nx-page__sub">Day-to-day class tests, unit tests &amp; assignments (continuous assessment). For formal term/board exams, use Examinations.</p>
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/gradebook/new')}>New assessment</Button>
        )}
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <div className="nx-statstrip" style={{ marginBottom: 16 }}>
        <div className="nx-statstrip__item">
          <div className="nx-statstrip__val">{stats.total}</div>
          <div className="nx-statstrip__lbl">Assessments</div>
        </div>
        <div className="nx-statstrip__item">
          <div className="nx-statstrip__val" style={{ color: 'var(--success)' }}>{stats.published}</div>
          <div className="nx-statstrip__lbl">Published</div>
        </div>
        <div className="nx-statstrip__item">
          <div className="nx-statstrip__val" style={{ color: 'var(--text-muted)' }}>{stats.drafts}</div>
          <div className="nx-statstrip__lbl">Drafts</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(a) => a.id}
        loading={loading}
        error={error ? 'Could not load assessments.' : null}
        onRowClick={(a) => navigate(`/gradebook/${a.id}`)}
        emptyIcon="file-text"
        emptyTitle={scopedNoSections ? 'No class assigned to you' : search || sectionId ? 'No assessments match' : 'No assessments yet'}
        emptyMessage={
          scopedNoSections
            ? 'You can only see assessments for the section(s) you are assigned. Ask your coordinator if this looks wrong.'
            : search || sectionId
              ? 'Try clearing the filters.'
              : 'Create your first assessment to start entering marks.'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input leftIcon="search" placeholder="Search by name or subject…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search assessments" />
            </div>
            <div className="nx-toolbar__filter">
              <Select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(1); }} options={sectionOptions} aria-label="Filter by section" />
            </div>
          </div>
        }
      />
    </div>
  );
}
