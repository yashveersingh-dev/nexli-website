import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { formatINR } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades } from '@/features/school/data';
import { useInvoicesByYear } from '@/features/finance/data';
import { studentDue } from './feeSchema';

interface Row {
  id: string;
  fullName: string;
  admissionNo?: string;
  photoUrl?: string;
  gradeId?: string;
  sectionName?: string;
  gradeName?: string;
  due: number;
  paid: number;
  billed: number;
}

export function StudentsTab() {
  const navigate = useNavigate();
  const { schoolId, school } = useSession();
  const currentYear = school?.currentAcademicYear;
  const { data: students, loading: sLoading, error } = useStudents(schoolId);

  // Default the ledger to the current academic year (a SCOPED read) instead of the
  // whole `fee_invoices` history; '' = All years (the previous unbounded behaviour,
  // still available on demand). Per-year billed/paid/due remain correct.
  const [year, setYear] = useState<string>(currentYear ?? '');
  // Adopt the current year once the school doc loads (only while still unset).
  useEffect(() => { if (currentYear && year === '') setYear(currentYear); }, [currentYear]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: invoices, loading: iLoading } = useInvoicesByYear(schoolId, year || undefined);
  const { data: grades } = useGrades(schoolId);

  const [q, setQ] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [filter, setFilter] = useState('');

  const byStudent = useMemo(() => {
    const grp = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      const arr = grp.get(inv.studentId) ?? [];
      arr.push(inv);
      grp.set(inv.studentId, arr);
    }
    return grp;
  }, [invoices]);

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase();
    return students
      .filter((s) => s.status === 'active')
      .filter((s) => (gradeId ? s.gradeId === gradeId : true))
      .filter((s) => (needle ? [s.fullName, s.admissionNo, s.rollNo].some((v) => v?.toLowerCase().includes(needle)) : true))
      .map((s) => {
        const { due, paid, billed } = studentDue(byStudent.get(s.id) ?? []);
        return { id: s.id, fullName: s.fullName, admissionNo: s.admissionNo, photoUrl: s.photoUrl, gradeId: s.gradeId, gradeName: s.gradeName, sectionName: s.sectionName, due, paid, billed };
      })
      .filter((r) => (filter === 'due' ? r.due > 0 : filter === 'clear' ? r.due === 0 && r.billed > 0 : true))
      .sort((a, b) => b.due - a.due || a.fullName.localeCompare(b.fullName));
  }, [students, byStudent, q, gradeId, filter]);

  const gradeOptions = [{ value: '', label: 'All grades' }, ...grades.slice().sort((a, b) => a.order - b.order).map((g) => ({ value: g.id, label: g.name }))];

  // Year options: the current year (so it's always selectable even before any
  // invoice exists), any years seen in the loaded set, plus "All years".
  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    if (currentYear) set.add(currentYear);
    for (const inv of invoices) if (inv.academicYear) set.add(inv.academicYear);
    const sorted = [...set].sort((a, b) => b.localeCompare(a));
    return [...sorted.map((y) => ({ value: y, label: y })), { value: '', label: 'All years' }];
  }, [invoices, currentYear]);

  const columns: Column<Row>[] = [
    {
      key: 'fullName', header: 'Student', primary: true,
      render: (r) => (
        <span className="lib-book">
          <Avatar name={r.fullName} src={r.photoUrl ?? null} size={34} />
          <span className="lib-book__text">
            <span className="lib-book__title">{r.fullName}</span>
            <span className="lib-book__author">{[r.gradeName, r.sectionName].filter(Boolean).join(' · ') || r.admissionNo}</span>
          </span>
        </span>
      ),
    },
    { key: 'billed', header: 'Billed', align: 'right', hideOnMobile: true, render: (r) => <span className="fin-amount fin-amount--muted">{r.billed ? formatINR(r.billed) : '—'}</span> },
    { key: 'paid', header: 'Paid', align: 'right', hideOnMobile: true, render: (r) => <span className="fin-amount fin-amount--paid">{r.paid ? formatINR(r.paid) : '—'}</span> },
    {
      key: 'due', header: 'Due', align: 'right',
      render: (r) => (r.due > 0 ? <Badge variant="danger">{formatINR(r.due)}</Badge> : r.billed > 0 ? <Badge variant="success">Cleared</Badge> : <span style={{ color: 'var(--text-muted)' }}>—</span>),
    },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search name, admission no…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
      </div>
      <Select value={year} onChange={(e) => setYear(e.target.value)} options={yearOptions} aria-label="Filter by academic year" />
      <Select value={gradeId} onChange={(e) => setGradeId(e.target.value)} options={gradeOptions} aria-label="Filter by grade" />
      <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by dues"
        options={[{ value: '', label: 'All students' }, { value: 'due', label: 'With dues' }, { value: 'clear', label: 'Fully paid' }]} />
    </div>
  );

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(r) => r.id}
      loading={sLoading || iLoading} error={error ? 'Could not load students.' : null}
      toolbar={toolbar} onRowClick={(r) => navigate(`/fees/students/${r.id}`)}
      emptyIcon="users"
      emptyTitle={q || gradeId || filter ? 'No matching students' : 'No students yet'}
      emptyMessage={q || gradeId || filter ? 'Try a different search or filter.' : 'Add students to begin fee management.'}
    />
  );
}
