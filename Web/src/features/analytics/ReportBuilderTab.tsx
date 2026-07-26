import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Checkbox, Select, Input } from '@/components/form';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate, formatINR } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useStaff } from '@/features/school/data';
import { usePayments } from '@/features/finance/data';

type EntityId = 'students' | 'staff' | 'payments';
interface FieldDef { key: string; label: string; get: (row: Record<string, unknown>) => string }

const D = (ts: unknown) => (typeof ts === 'number' ? formatDate(ts) : '');
const S = (v: unknown) => (v == null ? '' : String(v));

const ENTITY_FIELDS: Record<EntityId, FieldDef[]> = {
  students: [
    { key: 'fullName', label: 'Name', get: (r) => S(r.fullName) },
    { key: 'admissionNo', label: 'Admission no.', get: (r) => S(r.admissionNo) },
    { key: 'rollNo', label: 'Roll no.', get: (r) => S(r.rollNo) },
    { key: 'gradeName', label: 'Grade', get: (r) => S(r.gradeName) },
    { key: 'sectionName', label: 'Section', get: (r) => S(r.sectionName) },
    { key: 'gender', label: 'Gender', get: (r) => S(r.gender) },
    { key: 'category', label: 'Category', get: (r) => S(r.category) },
    { key: 'status', label: 'Status', get: (r) => S(r.status) },
  ],
  staff: [
    { key: 'name', label: 'Name', get: (r) => S(r.name) },
    { key: 'employeeId', label: 'Employee ID', get: (r) => S(r.employeeId) },
    { key: 'designation', label: 'Designation', get: (r) => S(r.designation) },
    { key: 'department', label: 'Department', get: (r) => S(r.department) },
    { key: 'status', label: 'Status', get: (r) => S(r.status) },
    { key: 'joiningDate', label: 'Joining date', get: (r) => D(r.joiningDate) },
  ],
  payments: [
    { key: 'receiptNo', label: 'Receipt', get: (r) => S(r.receiptNo) },
    { key: 'studentName', label: 'Student', get: (r) => S(r.studentName) },
    { key: 'amount', label: 'Amount', get: (r) => (typeof r.amount === 'number' ? formatINR(r.amount) : '') },
    { key: 'method', label: 'Method', get: (r) => S(r.method) },
    { key: 'paidAt', label: 'Date', get: (r) => D(r.paidAt) },
    { key: 'status', label: 'Status', get: (r) => S(r.status) },
  ],
};

const ENTITY_OPTIONS = [
  { value: 'students', label: 'Students' },
  { value: 'staff', label: 'Staff' },
  { value: 'payments', label: 'Fee payments' },
];

export function ReportBuilderTab() {
  const toast = useToast();
  const { schoolId } = useSession();
  const { data: students } = useStudents(schoolId);
  const { data: staff } = useStaff(schoolId);
  const { data: payments } = usePayments(schoolId);

  const [entity, setEntity] = useState<EntityId>('students');
  const [picked, setPicked] = useState<Record<string, string[]>>({
    students: ['fullName', 'admissionNo', 'gradeName', 'sectionName', 'status'],
    staff: ['name', 'employeeId', 'designation', 'department', 'status'],
    payments: ['receiptNo', 'studentName', 'amount', 'method', 'paidAt'],
  });
  const [q, setQ] = useState('');

  const fields = ENTITY_FIELDS[entity];
  const selected = picked[entity];
  const source = entity === 'students' ? students : entity === 'staff' ? staff : payments;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = (source as unknown as Record<string, unknown>[]).map((r, i) => ({ __i: i, ...r }));
    if (!needle) return arr;
    return arr.filter((r) => fields.some((f) => f.get(r).toLowerCase().includes(needle)));
  }, [source, q, fields]);

  const activeFields = fields.filter((f) => selected.includes(f.key));

  const columns: Column<Record<string, unknown>>[] = activeFields.map((f, idx) => ({
    key: f.key, header: f.label, primary: idx === 0, render: (r) => f.get(r) || '—',
  }));

  const toggleField = (key: string) => setPicked((p) => {
    const cur = p[entity];
    return { ...p, [entity]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
  });

  const exportCsv = () => {
    if (activeFields.length === 0) { toast.error('Pick at least one column'); return; }
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const header = activeFields.map((f) => esc(f.label)).join(',');
    const body = rows.map((r) => activeFields.map((f) => esc(f.get(r))).join(',')).join('\r\n');
    const csv = `﻿${header}\r\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${entity}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Report exported', `${rows.length} rows`);
  };

  return (
    <div className="an-builder">
      <div className="an-builder__panel">
        <h3 className="nx-subhead" style={{ marginTop: 0 }}>Build a report</h3>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data source</label>
        <Select value={entity} onChange={(e) => setEntity(e.target.value as EntityId)} options={ENTITY_OPTIONS} />
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Columns</label>
          {fields.map((f) => (
            <div className="an-field-pick" key={f.key}>
              <Checkbox checked={selected.includes(f.key)} onChange={() => toggleField(f.key)} label={f.label} />
            </div>
          ))}
        </div>
        <Button variant="gold" leftIcon="download" onClick={exportCsv} style={{ marginTop: 14, width: '100%' }}>Export CSV</Button>
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="nx-toolbar" style={{ marginBottom: 12 }}>
          <div className="nx-toolbar__search">
            <Input leftIcon="search" placeholder="Filter rows…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter report rows" />
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', alignSelf: 'center' }}>{rows.length} rows</span>
        </div>
        {activeFields.length === 0 ? (
          <Panel><EmptyState icon="bar-chart" title="Pick columns" message="Select at least one column to preview the report." /></Panel>
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.__i)} emptyIcon="file-text" emptyTitle="No rows" emptyMessage="No records match your filter." />
        )}
      </div>
    </div>
  );
}
