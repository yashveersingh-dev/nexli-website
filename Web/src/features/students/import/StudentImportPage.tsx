import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { cn } from '@/lib/cn';
import { Field, Select } from '@/components/form';
import { EmptyState, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades, useSections, useStudents, createStudent, nextAdmissionNo } from '@/features/school/data';
import { IMPORT_FIELDS, autoMap, buildTemplateCsv, parseCsv, type ImportField, type ParsedCsv } from './csv';
import { validateRow, rowToStudent, findDuplicateStudent, type ImportRow } from './validate';
import '@/features/school/school.css';
import './import.css';

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

export function StudentImportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: existingStudents } = useStudents(schoolId);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<ImportField, number>>({} as Record<ImportField, number>);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; reasons: string[] } | null>(null);

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
      setMapping(autoMap(p.headers));
      setStep('map');
    };
    reader.readAsText(file);
  };

  // Header text the user mapped the guardian-name column to (e.g. "Father Name"),
  // used to preserve the guardian relation instead of defaulting to 'guardian'.
  const guardianHeader = useMemo(() => {
    const idx = parsed ? mapping.guardianName : undefined;
    return parsed && idx != null && idx >= 0 ? parsed.headers[idx] : undefined;
  }, [parsed, mapping]);

  const mappedRows = useMemo<ImportRow[]>(() => {
    if (!parsed) return [];
    return parsed.rows.map((row, i) => {
      const raw = {} as Record<ImportField, string>;
      for (const f of IMPORT_FIELDS) {
        const idx = mapping[f.key];
        raw[f.key] = idx != null && idx >= 0 ? (row[idx] ?? '') : '';
      }
      return validateRow(raw, i + 1, grades, sections);
    });
  }, [parsed, mapping, grades, sections]);

  // Duplicate detection against existing Firestore students (by admission no, or
  // name+DOB). Duplicates are WARNED and SKIPPED on import (not written).
  const duplicateByIndex = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of mappedRows) {
      if (!r.valid) continue;
      const reason = findDuplicateStudent(r.raw, existingStudents);
      if (reason) m.set(r.index, reason);
    }
    return m;
  }, [mappedRows, existingStudents]);

  const validRows = mappedRows.filter((r) => r.valid && !duplicateByIndex.has(r.index));
  const validCount = validRows.length;
  const invalidRows = mappedRows.filter((r) => !r.valid);
  const duplicateRows = mappedRows.filter((r) => r.valid && duplicateByIndex.has(r.index));

  const runImport = async () => {
    if (!schoolId) return;
    setImporting(true);
    const actor = { uid: uid ?? 'unknown', name: member?.name };
    let imported = 0;
    const reasons: string[] = [];
    try {
      // Generate a starting admission number for blank rows.
      const base = await nextAdmissionNo(schoolId, school?.currentAcademicYear);
      const m = base.match(/^(.*?)(\d+)$/);
      const prefix = m ? m[1] : 'ADM-';
      let counter = m ? parseInt(m[2], 10) : 1;

      for (const r of mappedRows) {
        if (!r.valid) continue;
        // Skip rows flagged as duplicates of existing students (warned in preview).
        if (duplicateByIndex.has(r.index)) {
          reasons.push(`Row ${r.index}: skipped — ${duplicateByIndex.get(r.index)}`);
          continue;
        }
        const adm = r.raw.admissionNo?.trim() || `${prefix}${String(counter++).padStart(4, '0')}`;
        try {
          const payload = rowToStudent(r.raw, adm, grades, sections, guardianHeader);
          await createStudent(schoolId, { ...payload, schoolId }, actor);
          imported++;
        } catch {
          reasons.push(`Row ${r.index}: write failed`);
        }
      }
      setResult({ imported, skipped: mappedRows.length - imported, reasons });
      setStep('done');
      toast.success('Import complete', `${imported} student${imported === 1 ? '' : 's'} added.`);
    } catch {
      toast.error('Import failed', 'Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const STEPS: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'map', label: 'Map columns' },
    { id: 'preview', label: 'Validate' },
    { id: 'done', label: 'Done' },
  ];
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="nx-page">
      <div className="nx-formpage__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/students')} aria-label="Back to students"><Icon name="chevron-left" size={18} /></button>
        <div className="nx-formpage__heading">
          <h1 className="nx-formpage__title">Import students</h1>
          <p className="nx-formpage__sub">Bulk-add students from a CSV file.</p>
        </div>
      </div>

      <div className="nx-stepper" role="list">
        {STEPS.map((s, i) => (
          <div key={s.id} className={cn('nx-stepper__item', i < stepIndex && 'is-done', i === stepIndex && 'is-active')} role="listitem">
            <span className="nx-stepper__dot">{i < stepIndex ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}</span>
            <span className="nx-stepper__label">{s.label}</span>
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <Panel>
          <InfoCard icon="info" title="How it works">
            Download the template, fill it in (or export from your existing system), then upload it here. We'll map the
            columns, validate every row, and let you review before anything is saved.
          </InfoCard>
          <div className="nx-import__upload">
            <Button variant="ghost" leftIcon="download" onClick={() => download('nexli-student-import-template.csv', buildTemplateCsv())}>
              Download CSV template
            </Button>
            <label className="nx-import__drop">
              <input type="file" accept=".csv,text/csv" className="nx-sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              <span className="nx-dropzone__icon"><Icon name="upload" size={20} /></span>
              <span className="nx-dropzone__title">{fileName || 'Click to choose a CSV file'}</span>
              <span className="nx-dropzone__hint">.csv · up to a few thousand rows</span>
            </label>
          </div>
          {grades.length === 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--warning)', marginTop: 12 }}>
              Tip: set up your grades &amp; sections first (Academics → Structure) so the import can match classes.
            </p>
          )}
        </Panel>
      )}

      {step === 'map' && parsed && (
        <Panel title="Map columns" sub={`${parsed.rows.length} rows`}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Match each NEXLI field to a column from your file. We've auto-matched what we could.</p>
          <div className="nx-section__grid">
            {IMPORT_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} required={f.required}>
                <Select
                  value={String(mapping[f.key] ?? -1)}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: parseInt(e.target.value, 10) }))}
                  options={[{ value: '-1', label: '— Not mapped —' }, ...parsed.headers.map((h, i) => ({ value: String(i), label: h }))]}
                />
              </Field>
            ))}
          </div>
          <div className="nx-wizard__foot" style={{ marginTop: 18 }}>
            <Button variant="ghost" leftIcon="chevron-left" onClick={() => setStep('upload')}>Back</Button>
            <div className="nx-wizard__footright">
              <Button variant="gold" rightIcon="arrow-right" onClick={() => setStep('preview')}>Validate {parsed.rows.length} rows</Button>
            </div>
          </div>
        </Panel>
      )}

      {step === 'preview' && (
        <Panel title="Review" sub={`${validCount} of ${mappedRows.length} ready`}>
          <div className="nx-statstrip" style={{ marginBottom: 16 }}>
            <div className="nx-statstrip__item"><div className="nx-statstrip__val">{mappedRows.length}</div><div className="nx-statstrip__lbl">Total rows</div></div>
            <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--success)' }}>{validCount}</div><div className="nx-statstrip__lbl">Ready</div></div>
            <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--warning)' }}>{duplicateRows.length}</div><div className="nx-statstrip__lbl">Duplicates</div></div>
            <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--danger)' }}>{invalidRows.length}</div><div className="nx-statstrip__lbl">With errors</div></div>
          </div>
          {duplicateRows.length > 0 && (
            <div className="nx-import__errors">
              <div className="nx-import__errhead"><Icon name="alert-triangle" size={14} /> {duplicateRows.length} duplicate{duplicateRows.length === 1 ? '' : 's'} will be skipped</div>
              {duplicateRows.slice(0, 30).map((r) => (
                <div className="nx-import__errrow" key={r.index}>
                  <span className="nx-import__errno">Row {r.index}</span>
                  <span className="nx-import__errmsg">{duplicateByIndex.get(r.index)}</span>
                </div>
              ))}
              {duplicateRows.length > 30 && <div className="nx-import__errrow"><span className="nx-import__errmsg">…and {duplicateRows.length - 30} more</span></div>}
            </div>
          )}
          {invalidRows.length > 0 && (
            <div className="nx-import__errors">
              <div className="nx-import__errhead"><Icon name="alert-triangle" size={14} /> {invalidRows.length} row{invalidRows.length === 1 ? '' : 's'} will be skipped</div>
              {invalidRows.slice(0, 30).map((r) => (
                <div className="nx-import__errrow" key={r.index}>
                  <span className="nx-import__errno">Row {r.index}</span>
                  <span className="nx-import__errmsg">{r.errors.join(' ')}</span>
                </div>
              ))}
              {invalidRows.length > 30 && <div className="nx-import__errrow"><span className="nx-import__errmsg">…and {invalidRows.length - 30} more</span></div>}
            </div>
          )}
          {validCount === 0 && <EmptyState icon="alert-triangle" title="No valid rows" message="Fix the mapping or the file and try again." />}
          <div className="nx-wizard__foot" style={{ marginTop: 18 }}>
            <Button variant="ghost" leftIcon="chevron-left" onClick={() => setStep('map')} disabled={importing}>Back</Button>
            <div className="nx-wizard__footright">
              <Button variant="gold" leftIcon="check" loading={importing} disabled={validCount === 0} onClick={runImport}>Import {validCount} students</Button>
            </div>
          </div>
        </Panel>
      )}

      {step === 'done' && result && (
        <Panel>
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div className="nx-wizard-success__icon" style={{ margin: '0 auto 14px' }}><Icon name="check-circle" size={30} /></div>
            <h2 className="nx-status__title">Import complete</h2>
            <p className="nx-status__msg" style={{ margin: '6px auto 0' }}>
              <strong style={{ color: 'var(--success)' }}>{result.imported}</strong> students added
              {result.skipped > 0 ? <>, <strong>{result.skipped}</strong> skipped</> : null}.
            </p>
            <div className="nx-status__actions" style={{ justifyContent: 'center' }}>
              <Button variant="gold" leftIcon="users" onClick={() => navigate('/students')}>View students</Button>
              <Button variant="ghost" onClick={() => { setStep('upload'); setParsed(null); setResult(null); setFileName(''); }}>Import another file</Button>
            </div>
          </div>
        </Panel>
      )}

      {step !== 'done' && <Badge variant="muted" className="nx-import__safe">Nothing is saved until you confirm the import</Badge>}
    </div>
  );
}
