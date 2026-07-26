import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Tabs } from '@/components/Tabs';
import { cn } from '@/lib/cn';
import { Field, Select, Input } from '@/components/form';
import { EmptyState, InfoCard } from '@/components/feedback';
import { DataTable, type Column } from '@/components/DataTable';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import type { Student } from '@/types/sis';
import {
  IDENTITY_FIELDS, autoMapIdentity, detectSubjectColumns, parseCsv, parseRow,
  buildTemplateCsv, toCsv,
  type IdentityField, type ParsedCsv, type ParsedBoardRow,
} from './csv';
import {
  useBoardResults, saveBoardResults, toStoredSubject,
  type NewBoardResult, type BoardResult,
} from './data';
import { BoardResultViewer } from './BoardResultViewer';
import '@/features/students/import/import.css';

type BoardSubTab = 'view' | 'import';

type Step = 'upload' | 'map' | 'preview' | 'done';

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const normKey = (s?: string) => (s ?? '').trim().toLowerCase();

export function BoardResultsTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('exams.write');
  const { data: students } = useStudents(schoolId);
  const { data: existing, loading: listLoading, error: listError } = useBoardResults(schoolId);

  const actor = useMemo(() => ({ uid: uid ?? 'unknown', name: member?.name }), [uid, member?.name]);

  const [subTab, setSubTab] = useState<BoardSubTab>('view');
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<IdentityField, number>>({} as Record<IdentityField, number>);
  const [defaults, setDefaults] = useState({ board: '', examName: '', year: String(new Date().getFullYear()) });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  // Student lookup tables for resolving a row to a real student.
  const byAdmission = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of students) if (s.admissionNo) m.set(normKey(s.admissionNo), s);
    return m;
  }, [students]);
  const byId = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  const subjectCols = useMemo(() => (parsed ? detectSubjectColumns(parsed.headers) : []), [parsed]);

  const onFile = (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const p = parseCsv(String(reader.result ?? ''));
      if (p.headers.length === 0) {
        toast.error('Empty file', 'No rows found in this CSV.');
        return;
      }
      setParsed(p);
      setMapping(autoMapIdentity(p.headers));
      setStep('map');
    };
    reader.readAsText(file);
  };

  // Resolve a parsed row to a student (by admission no, then by student id).
  const resolveStudent = (r: ParsedBoardRow): Student | undefined => {
    if (r.admissionNo && byAdmission.has(normKey(r.admissionNo))) return byAdmission.get(normKey(r.admissionNo));
    if (r.studentId && byId.has(r.studentId)) return byId.get(r.studentId);
    return undefined;
  };

  const parsedRows = useMemo<ParsedBoardRow[]>(() => {
    if (!parsed) return [];
    return parsed.rows.map((row, i) => parseRow(row, i + 1, mapping, subjectCols, defaults));
  }, [parsed, mapping, subjectCols, defaults]);

  // Rows that parse cleanly AND resolve to a known student are importable.
  const decorated = useMemo(
    () => parsedRows.map((r) => ({ row: r, student: r.valid ? resolveStudent(r) : undefined })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parsedRows, byAdmission, byId],
  );

  const importable = decorated.filter((d) => d.row.valid && d.student);
  const unknownRows = decorated.filter((d) => d.row.valid && !d.student);
  const invalidRows = decorated.filter((d) => !d.row.valid);
  const validCount = importable.length;

  const runImport = async () => {
    if (!schoolId || validCount === 0) return;
    setImporting(true);
    try {
      const payloads: NewBoardResult[] = importable.map(({ row, student }) => ({
        schoolId,
        studentId: student!.id,
        studentName: student!.fullName,
        admissionNo: student!.admissionNo || row.admissionNo,
        board: row.board,
        examName: row.examName,
        year: row.year,
        subjects: row.subjects.map(toStoredSubject),
        totalMarks: row.totals.totalMarks,
        totalMax: row.totals.totalMax,
        percentage: row.totals.percentage,
        result: row.totals.result,
        importedAt: Date.now(),
        importedByUid: actor.uid,
      }));
      const imported = await saveBoardResults(schoolId, payloads, actor);
      setResult({ imported, skipped: parsedRows.length - imported });
      setStep('done');
      toast.success('Import complete', `${imported} board result${imported === 1 ? '' : 's'} saved.`);
    } catch {
      toast.error('Import failed', 'Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep('upload'); setParsed(null); setResult(null); setFileName('');
    setMapping({} as Record<IdentityField, number>);
  };

  const STEPS: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'map', label: 'Map columns' },
    { id: 'preview', label: 'Validate' },
    { id: 'done', label: 'Done' },
  ];
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // ----- Saved board results list (always visible below the importer) -----
  const listColumns: Column<BoardResult>[] = [
    {
      key: 'student', header: 'Student', primary: true,
      render: (r) => (
        <span>
          <span style={{ fontWeight: 600 }}>{r.studentName}</span>
          {r.admissionNo && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{r.admissionNo}</span>}
        </span>
      ),
    },
    { key: 'board', header: 'Board', render: (r) => <Badge variant="info">{r.board}</Badge> },
    { key: 'exam', header: 'Exam', render: (r) => `${r.examName}${r.year ? ` · ${r.year}` : ''}` },
    { key: 'total', header: 'Total', render: (r) => (r.totalMax > 0 ? `${r.totalMarks}/${r.totalMax}` : '—') },
    { key: 'pct', header: '%', render: (r) => (r.totalMax > 0 ? `${r.percentage}%` : '—') },
    {
      key: 'result', header: 'Result',
      render: (r) => <Badge variant={r.result === 'pass' ? 'success' : 'danger'}>{r.result === 'pass' ? 'Pass' : 'Fail'}</Badge>,
    },
  ];

  const exportExisting = () => {
    const headers = ['Student', 'Admission No', 'Board', 'Exam', 'Year', 'Total', 'Max', 'Percentage', 'Result'];
    const rows = existing.map((r) => [
      r.studentName, r.admissionNo, r.board, r.examName, r.year,
      String(r.totalMarks), String(r.totalMax), String(r.percentage), r.result,
    ]);
    download('nexli-board-results.csv', toCsv(headers, rows));
  };

  return (
    <Tabs
      variant="pill"
      aria-label="Board results sections"
      value={subTab}
      onChange={(id) => setSubTab(id as BoardSubTab)}
      tabs={[
        { id: 'view', label: 'View results', icon: 'eye' },
        { id: 'import', label: 'Import', icon: 'upload' },
      ]}
    >
      {(active) =>
        active === 'view' ? (
          <BoardResultViewer />
        ) : (
          <div>
            {!canWrite ? (
              <InfoCard icon="info" title="View only">
                You can review imported board results below. Importing requires exam write access.
              </InfoCard>
            ) : (
        <Panel
          title="Import board results"
          sub="CBSE / ICSE / State — bulk-import external results from a CSV"
        >
          <div className="nx-stepper" role="list" style={{ marginBottom: 14 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} className={cn('nx-stepper__item', i < stepIndex && 'is-done', i === stepIndex && 'is-active')} role="listitem">
                <span className="nx-stepper__dot">{i < stepIndex ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}</span>
                <span className="nx-stepper__label">{s.label}</span>
              </div>
            ))}
          </div>

          {step === 'upload' && (
            <>
              <InfoCard icon="info" title="How it works">
                Download the template (identity columns + per-subject Marks/Max/Grade), fill it in or export from your
                board portal, then upload. We auto-detect subjects, match each row to a student by admission number,
                validate, and let you review before anything is saved.
              </InfoCard>
              <div className="nx-import__upload">
                <Button variant="ghost" leftIcon="download" onClick={() => download('nexli-board-results-template.csv', buildTemplateCsv())}>
                  Download CSV template
                </Button>
                <label className="nx-import__drop">
                  <input type="file" accept=".csv,text/csv" className="nx-sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                  <span className="nx-dropzone__icon"><Icon name="upload" size={20} /></span>
                  <span className="nx-dropzone__title">{fileName || 'Click to choose a CSV file'}</span>
                  <span className="nx-dropzone__hint">.csv · one row per student</span>
                </label>
              </div>
              {students.length === 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--warning)', marginTop: 12 }}>
                  Tip: add your students first so imported results can be matched to them.
                </p>
              )}
            </>
          )}

          {step === 'map' && parsed && (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
                Match the identity columns. Subjects are auto-detected from your header
                ({subjectCols.length} found{subjectCols.length ? `: ${subjectCols.map((s) => s.name).join(', ')}` : ''}).
                Blank board / exam / year cells fall back to the defaults below.
              </p>
              <div className="nx-section__grid">
                {IDENTITY_FIELDS.map((f) => (
                  <Field key={f.key} label={f.label}>
                    <Select
                      value={String(mapping[f.key] ?? -1)}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: parseInt(e.target.value, 10) }))}
                      options={[{ value: '-1', label: '— Not mapped —' }, ...parsed.headers.map((h, i) => ({ value: String(i), label: h }))]}
                    />
                  </Field>
                ))}
              </div>
              <div className="nx-section__grid" style={{ marginTop: 12 }}>
                <Field label="Default board" optional>
                  <Input value={defaults.board} onChange={(e) => setDefaults((d) => ({ ...d, board: e.target.value }))} placeholder="CBSE" />
                </Field>
                <Field label="Default exam name" optional>
                  <Input value={defaults.examName} onChange={(e) => setDefaults((d) => ({ ...d, examName: e.target.value }))} placeholder="Class X Board" />
                </Field>
                <Field label="Default year" optional>
                  <Input value={defaults.year} onChange={(e) => setDefaults((d) => ({ ...d, year: e.target.value }))} placeholder="2026" />
                </Field>
              </div>
              {subjectCols.length === 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 12 }}>
                  No subject columns detected. Headers must look like "English Marks", "English Max", "English Grade".
                </p>
              )}
              <div className="nx-wizard__foot" style={{ marginTop: 18 }}>
                <Button variant="ghost" leftIcon="chevron-left" onClick={() => setStep('upload')}>Back</Button>
                <div className="nx-wizard__footright">
                  <Button variant="gold" rightIcon="arrow-right" disabled={subjectCols.length === 0} onClick={() => setStep('preview')}>
                    Validate {parsed.rows.length} rows
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="nx-statstrip" style={{ marginBottom: 16 }}>
                <div className="nx-statstrip__item"><div className="nx-statstrip__val">{parsedRows.length}</div><div className="nx-statstrip__lbl">Total rows</div></div>
                <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--success)' }}>{validCount}</div><div className="nx-statstrip__lbl">Ready</div></div>
                <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--warning)' }}>{unknownRows.length}</div><div className="nx-statstrip__lbl">Unknown student</div></div>
                <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--danger)' }}>{invalidRows.length}</div><div className="nx-statstrip__lbl">With errors</div></div>
              </div>
              {unknownRows.length > 0 && (
                <div className="nx-import__errors">
                  <div className="nx-import__errhead"><Icon name="alert-triangle" size={14} /> {unknownRows.length} row{unknownRows.length === 1 ? '' : 's'} could not be matched to a student (skipped)</div>
                  {unknownRows.slice(0, 30).map(({ row }) => (
                    <div className="nx-import__errrow" key={row.index}>
                      <span className="nx-import__errno">Row {row.index}</span>
                      <span className="nx-import__errmsg">No student with admission no. "{row.admissionNo || '—'}"{row.studentId ? ` / id "${row.studentId}"` : ''}.</span>
                    </div>
                  ))}
                  {unknownRows.length > 30 && <div className="nx-import__errrow"><span className="nx-import__errmsg">…and {unknownRows.length - 30} more</span></div>}
                </div>
              )}
              {invalidRows.length > 0 && (
                <div className="nx-import__errors">
                  <div className="nx-import__errhead"><Icon name="alert-triangle" size={14} /> {invalidRows.length} row{invalidRows.length === 1 ? '' : 's'} have errors (skipped)</div>
                  {invalidRows.slice(0, 30).map(({ row }) => (
                    <div className="nx-import__errrow" key={row.index}>
                      <span className="nx-import__errno">Row {row.index}</span>
                      <span className="nx-import__errmsg">{row.errors.join(' ')}</span>
                    </div>
                  ))}
                  {invalidRows.length > 30 && <div className="nx-import__errrow"><span className="nx-import__errmsg">…and {invalidRows.length - 30} more</span></div>}
                </div>
              )}
              {validCount === 0 && <EmptyState icon="alert-triangle" title="No importable rows" message="Fix the mapping, the file, or add the missing students, then try again." />}
              <div className="nx-wizard__foot" style={{ marginTop: 18 }}>
                <Button variant="ghost" leftIcon="chevron-left" onClick={() => setStep('map')} disabled={importing}>Back</Button>
                <div className="nx-wizard__footright">
                  <Button variant="gold" leftIcon="check" loading={importing} disabled={validCount === 0} onClick={runImport}>
                    Import {validCount} result{validCount === 1 ? '' : 's'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div className="nx-wizard-success__icon" style={{ margin: '0 auto 14px' }}><Icon name="check-circle" size={30} /></div>
              <h2 className="nx-status__title">Import complete</h2>
              <p className="nx-status__msg" style={{ margin: '6px auto 0' }}>
                <strong style={{ color: 'var(--success)' }}>{result.imported}</strong> board result{result.imported === 1 ? '' : 's'} saved
                {result.skipped > 0 ? <>, <strong>{result.skipped}</strong> skipped</> : null}.
              </p>
              <div className="nx-status__actions" style={{ justifyContent: 'center', marginTop: 14 }}>
                <Button variant="ghost" onClick={resetWizard}>Import another file</Button>
              </div>
            </div>
          )}

            {step !== 'done' && <Badge variant="muted" className="nx-import__safe">Nothing is saved until you confirm the import</Badge>}
          </Panel>
            )}

            <div className="ac-bar" style={{ marginTop: 18 }}>
              <span className="ac-bar__title">Imported board results</span>
              {existing.length > 0 && (
                <Button variant="ghost" size="sm" leftIcon="download" onClick={exportExisting}>Export CSV</Button>
              )}
            </div>
            <DataTable
              columns={listColumns}
              rows={existing.slice().sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))}
              rowKey={(r) => r.id}
              loading={listLoading}
              error={listError ? 'Could not load board results.' : null}
              emptyIcon="award"
              emptyTitle="No board results yet"
              emptyMessage="Import an external CBSE / ICSE / State result sheet above to see results here."
            />
          </div>
        )
      }
    </Tabs>
  );
}
