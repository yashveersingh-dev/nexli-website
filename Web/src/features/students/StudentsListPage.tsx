import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { useCan } from '@/app/providers/SessionProvider';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { STUDENT_STATUS_META } from '@/features/school/meta';
import { ageFromDob } from './studentSchema';
import type { Student, StudentStatus } from '@/types/sis';
import '@/features/school/school.css';

const PAGE_SIZE = 25;

export function StudentsListPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useCan('students.write');
  const { data: students, loading, error } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  // ROLE_AUDIT — section scoping. A class/subject teacher reaches this page via the
  // `students.read.section` → `students.read` nav inference; the data must then be
  // limited to the section(s) they own (mirrors MarkAttendancePage). Broad viewers
  // (coordinator/VP/leadership/Super Admin) see the whole school.
  const { isBroad, sectionIds } = useScopedSectionIds('students', 'students.read', sections);
  const [search, setSearch] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Sections this user may actually see (all, when broad).
  const visibleSections = useMemo(
    () => (isBroad || !sectionIds ? sections : sections.filter((s) => sectionIds.has(s.id))),
    [isBroad, sectionIds, sections],
  );
  const scopedNoSections = !isBroad && visibleSections.length === 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => isBroad || (!!s.sectionId && sectionIds!.has(s.sectionId)))
      .filter((s) => !gradeId || s.gradeId === gradeId)
      .filter((s) => !sectionId || s.sectionId === sectionId)
      .filter((s) => !status || s.status === status)
      .filter((s) => !q || s.fullName?.toLowerCase().includes(q) || s.admissionNo?.toLowerCase().includes(q) || s.rollNo?.toLowerCase().includes(q))
      .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }, [students, search, gradeId, sectionId, status, isBroad, sectionIds]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const gradeOptions = [{ value: '', label: 'All grades' }, ...grades.map((g) => ({ value: g.id, label: g.name }))];
  const sectionOptions = [{ value: '', label: 'All sections' }, ...visibleSections.filter((s) => !gradeId || s.gradeId === gradeId).map((s) => ({ value: s.id, label: s.name }))];

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Student',
      primary: true,
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={s.fullName ?? '?'} src={s.photoUrl} size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.fullName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.admissionNo}</div>
          </div>
        </div>
      ),
    },
    { key: 'class', header: 'Class', render: (s) => [s.gradeName, s.sectionName].filter(Boolean).join(' · ') || '—' },
    { key: 'roll', header: 'Roll', render: (s) => s.rollNo ?? '—' },
    { key: 'age', header: 'Age', hideOnMobile: true, render: (s) => { const a = ageFromDob(s.dob); return a != null ? `${a} yrs` : '—'; } },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const m = STUDENT_STATUS_META[(s.status as StudentStatus) ?? 'active'];
        return <Badge variant={m.variant}>{m.label}</Badge>;
      },
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Students</h1>
          <p className="nx-page__sub">
            {loading ? 'Loading…' : `${filtered.length} student${filtered.length === 1 ? '' : 's'}`}
            {!isBroad && !scopedNoSections ? ' · your section(s)' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" leftIcon="award" onClick={() => navigate('/students/tc')}>Transfer certs</Button>
          {canWrite && <Button variant="ghost" leftIcon="upload" onClick={() => navigate('/students/import')}>Import</Button>}
          {canWrite && (
            <Button variant="gold" leftIcon="user-plus" onClick={() => navigate('/students/new')}>New admission</Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(s) => s.id}
        loading={loading}
        error={error ? 'Could not load students.' : null}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        emptyIcon="users"
        emptyTitle={scopedNoSections ? 'No class assigned to you' : search || gradeId || sectionId || status ? 'No students match your filters' : 'No students yet'}
        emptyMessage={
          scopedNoSections
            ? 'You can only see students in the section(s) you are assigned. Ask your coordinator if this looks wrong.'
            : search || gradeId || sectionId || status
              ? 'Try clearing the filters.'
              : 'Admit your first student or import a roster to get started.'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input leftIcon="search" placeholder="Search by name, admission or roll no…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search students" />
            </div>
            <div className="nx-toolbar__filter"><Select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setSectionId(''); setPage(1); }} options={gradeOptions} aria-label="Filter by grade" /></div>
            <div className="nx-toolbar__filter"><Select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(1); }} options={sectionOptions} aria-label="Filter by section" /></div>
            <div className="nx-toolbar__filter">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status"
                options={[{ value: '', label: 'All statuses' }, ...Object.entries(STUDENT_STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
            </div>
          </div>
        }
      />
    </div>
  );
}
