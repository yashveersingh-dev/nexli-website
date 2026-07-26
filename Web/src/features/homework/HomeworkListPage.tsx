import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useGrades, useSections, useSubjects, useStudents } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { useHomework } from '@/features/daily/data';
import { HOMEWORK_STATUS_META } from '@/features/daily/meta';
import { formatDate } from '@/lib/format';
import type { Homework, HomeworkStatus } from '@/types/daily';
import { sectionLabelOf, sortHomework, HOMEWORK_FILTER_STATUSES } from './util';
import './homework.css';

const PAGE_SIZE = 25;

/**
 * A homework's headline status (no per-student fetch in the list): overdue with
 * an active roster reads "missing", otherwise "assigned". The detail page resolves
 * true submission progress. Cheap + correct for an at-a-glance list.
 */
function headlineStatus(hw: Homework, now: number): HomeworkStatus {
  if (hw.dueDate != null && now > hw.dueDate) return 'missing';
  return 'assigned';
}

export function HomeworkListPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('homework');
  const canWrite = canOperate;

  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState<'' | HomeworkStatus>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: homework, loading, error } = useHomework(schoolId, sectionId || undefined);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: subjects } = useSubjects(schoolId);
  const { data: students } = useStudents(schoolId);

  // Homework read/write is unscoped in RBAC for both teacher roles, so broadness is
  // decided purely by reviewer/leadership status: class/subject teachers (operators)
  // see only their own section(s); coordinators/HOD/VP/leadership see all.
  const { isBroad, sectionIds } = useScopedSectionIds('homework', undefined, sections);
  const visibleSections = useMemo(
    () => (isBroad || !sectionIds ? sections : sections.filter((s) => sectionIds.has(s.id))),
    [isBroad, sectionIds, sections],
  );
  const scopedNoSections = !isBroad && visibleSections.length === 0;

  const now = Date.now();

  const sectionOptions = useMemo(
    () => [
      { value: '', label: 'All sections' },
      ...visibleSections.map((s) => ({ value: s.id, label: sectionLabelOf(s.id, sections, grades) })),
    ],
    [visibleSections, sections, grades],
  );
  const subjectOptions = useMemo(
    () => [{ value: '', label: 'All subjects' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))],
    [subjects],
  );

  // Roster size per section for the progress column (active students only).
  const rosterSize = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of students) {
      if (s.status !== 'active' || !s.sectionId) continue;
      m.set(s.sectionId, (m.get(s.sectionId) ?? 0) + 1);
    }
    return m;
  }, [students]);

  const scoped = useMemo(
    () => (isBroad ? homework : homework.filter((h) => !!h.sectionId && sectionIds!.has(h.sectionId))),
    [homework, isBroad, sectionIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortHomework(
      scoped.filter((h) => {
        if (subjectId && h.subjectId !== subjectId) return false;
        if (status && headlineStatus(h, now) !== status) return false;
        if (q && !h.title?.toLowerCase().includes(q) && !h.subjectName?.toLowerCase().includes(q)) return false;
        return true;
      }),
    );
  }, [scoped, subjectId, status, search, now]);

  const stats = useMemo(() => {
    let due = 0;
    let overdue = 0;
    for (const h of scoped) {
      if (h.dueDate == null) continue;
      if (now > h.dueDate) overdue++;
      else due++;
    }
    return { total: scoped.length, due, overdue };
  }, [scoped, now]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = !!(search || sectionId || subjectId || status);

  const columns: Column<Homework>[] = [
    {
      key: 'title',
      header: 'Homework',
      primary: true,
      render: (h) => (
        <div style={{ minWidth: 0 }}>
          <div className="nx-hw-title">{h.title}</div>
          {h.subjectName && <div className="nx-hw-subtitle">{h.subjectName}</div>}
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', hideOnMobile: true, render: (h) => h.subjectName || '—' },
    { key: 'section', header: 'Section', render: (h) => h.sectionName || sectionLabelOf(h.sectionId, sections, grades) },
    { key: 'assigned', header: 'Assigned', hideOnMobile: true, render: (h) => (h.assignedDate ? formatDate(h.assignedDate) : '—') },
    {
      key: 'due',
      header: 'Due',
      render: (h) => {
        if (h.dueDate == null) return '—';
        const overdue = now > h.dueDate;
        return <span style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{formatDate(h.dueDate)}</span>;
      },
    },
    {
      key: 'progress',
      header: 'Status',
      render: (h) => {
        const meta = HOMEWORK_STATUS_META[headlineStatus(h, now)];
        const total = rosterSize.get(h.sectionId) ?? 0;
        return (
          <div className="nx-hw-progress">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {total > 0 && <span className="nx-hw-progress__count">{total} students</span>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Homework</h1>
          <p className="nx-page__sub">{loading ? 'Loading…' : `${filtered.length} assignment${filtered.length === 1 ? '' : 's'}`}</p>
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/homework/new')}>
            New homework
          </Button>
        )}
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <div className="nx-statstrip" style={{ marginBottom: 16 }}>
        <div className="nx-statstrip__item">
          <div className="nx-statstrip__val">{stats.total}</div>
          <div className="nx-statstrip__lbl">Assignments</div>
        </div>
        <div className="nx-statstrip__item">
          <div className="nx-statstrip__val" style={{ color: 'var(--info)' }}>{stats.due}</div>
          <div className="nx-statstrip__lbl">Upcoming</div>
        </div>
        <div className="nx-statstrip__item">
          <div className="nx-statstrip__val" style={{ color: stats.overdue ? 'var(--danger)' : 'var(--text-muted)' }}>{stats.overdue}</div>
          <div className="nx-statstrip__lbl">Past due</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(h) => h.id}
        loading={loading}
        error={error ? 'Could not load homework.' : null}
        onRowClick={(h) => navigate(`/homework/${h.id}`)}
        emptyIcon="clipboard"
        emptyTitle={scopedNoSections ? 'No class assigned to you' : hasFilters ? 'No homework matches' : 'No homework yet'}
        emptyMessage={
          scopedNoSections
            ? 'You can only see homework for the section(s) you are assigned. Ask your coordinator if this looks wrong.'
            : hasFilters
              ? 'Try clearing the filters or search.'
              : canWrite
                ? 'Assign your first piece of homework to start tracking submissions.'
                : 'Homework assigned to your classes will appear here.'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        caption="Assigned homework"
        toolbar={
          <div className="nx-hw-toolbar">
            <div className="nx-hw-toolbar__search">
              <Input
                leftIcon="search"
                placeholder="Search by title or subject…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search homework"
              />
            </div>
            <Select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setPage(1);
              }}
              options={sectionOptions}
              aria-label="Filter by section"
              className="nx-hw-toolbar__filter"
            />
            <Select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
              options={subjectOptions}
              aria-label="Filter by subject"
              className="nx-hw-toolbar__filter"
            />
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as '' | HomeworkStatus);
                setPage(1);
              }}
              options={HOMEWORK_FILTER_STATUSES}
              aria-label="Filter by status"
              className="nx-hw-toolbar__filter"
            />
          </div>
        }
      />
    </div>
  );
}
