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
import { ROLE_CATALOG } from '@/lib/roles/catalog';
import { provisionStaffMember, generateTempPassword } from '@/lib/provisioning';
import { useMembers } from '@/features/delegation/data';
import { createStaff } from '@/features/school/data';
import type { StaffProfile } from '@/types/hr';
import {
  STAFF_IMPORT_FIELDS, autoMap, buildStaffTemplateCsv, parseCsv,
  type StaffImportField, type ParsedCsv,
} from './csv';
import {
  validateStaffRow, rowToStaffMember, type RoleOption, type StaffImportRow,
} from './validate';
import '@/features/students/import/import.css';

type Step = 'upload' | 'map' | 'preview' | 'done';

/** Created-credential row surfaced after a successful provision. */
interface CreatedCred {
  name: string;
  email: string;
  password: string;
}

/** Roles a school can assign to staff via import — excludes platform + family/student. */
const STAFF_ROLE_OPTIONS: RoleOption[] = ROLE_CATALOG
  .filter((r) => r.group !== 'platform' && r.group !== 'family')
  .map((r) => ({ id: r.id, label: r.label }));

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function StaffImportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: members } = useMembers(schoolId);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<StaffImportField, number>>({} as Record<StaffImportField, number>);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: CreatedCred[]; skipped: number; reasons: string[] } | null>(null);

  // Emails already taken by a member of THIS school (lowercased) — duplicate guard.
  const existingEmails = useMemo(
    () => new Set(members.map((m) => (m.email ?? '').trim().toLowerCase()).filter(Boolean)),
    [members],
  );

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

  const mappedRows = useMemo<StaffImportRow[]>(() => {
    if (!parsed) return [];
    const seen = new Set<string>();
    return parsed.rows.map((row, i) => {
      const raw = {} as Record<StaffImportField, string>;
      for (const f of STAFF_IMPORT_FIELDS) {
        const idx = mapping[f.key];
        raw[f.key] = idx != null && idx >= 0 ? (row[idx] ?? '') : '';
      }
      const r = validateStaffRow(raw, i + 1, STAFF_ROLE_OPTIONS, existingEmails, seen);
      // Track valid emails so a later identical row in the SAME file is flagged.
      if (r.valid) seen.add(raw.email.trim().toLowerCase());
      return r;
    });
  }, [parsed, mapping, existingEmails]);

  const validRows = mappedRows.filter((r) => r.valid);
  const validCount = validRows.length;
  const invalidRows = mappedRows.filter((r) => !r.valid);

  const runImport = async () => {
    if (!schoolId) return;
    setImporting(true);
    const actor = { uid: uid ?? 'unknown', name: member?.name };
    const created: CreatedCred[] = [];
    const reasons: string[] = [];
    try {
      // Sequential loop — each account is created on a throwaway secondary app
      // (see lib/provisioning), so concurrency would race the secondary sessions.
      for (const r of validRows) {
        const m = rowToStaffMember(r);
        const password = generateTempPassword();
        try {
          const res = await provisionStaffMember({
            schoolId,
            name: m.name,
            email: m.email,
            password,
            roleId: m.roleId,
            phone: m.phone,
            createdBy: actor.uid,
          });
          // Also create the HR (staff) profile so the new hire shows in the directory.
          const profile: Omit<StaffProfile, 'id'> = {
            schoolId,
            uid: res.uid,
            employeeId: `EMP-${String(members.length + created.length + 1).padStart(4, '0')}`,
            name: m.name,
            roleId: m.roleId,
            email: m.email,
            phone: m.phone,
            department: m.department,
            designation: m.designation,
            status: 'active',
          };
          try {
            await createStaff(schoolId, profile, actor);
          } catch {
            // Login was created; the HR profile write failed — non-fatal, note it.
            reasons.push(`Row ${r.index} (${m.email}): account created but HR profile failed.`);
          }
          created.push({ name: m.name, email: res.email, password: res.password });
        } catch (err) {
          const dup = err instanceof Error && /email-already-in-use/.test(err.message);
          reasons.push(`Row ${r.index} (${m.email}): ${dup ? 'email already registered' : 'account creation failed'}.`);
        }
      }
      setResult({ created, skipped: mappedRows.length - created.length, reasons });
      setStep('done');
      toast.success('Import finished', `${created.length} staff account${created.length === 1 ? '' : 's'} created.`);
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
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/hr')} aria-label="Back to HR"><Icon name="chevron-left" size={18} /></button>
        <div className="nx-formpage__heading">
          <h1 className="nx-formpage__title">Import staff</h1>
          <p className="nx-formpage__sub">Bulk-create staff login accounts from a CSV file.</p>
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
            columns, validate every row, and let you review before any accounts are created. Each new member gets a
            secure temporary password you can share with them.
          </InfoCard>
          <div className="nx-import__upload">
            <Button variant="ghost" leftIcon="download" onClick={() => download('nexli-staff-import-template.csv', buildStaffTemplateCsv())}>
              Download CSV template
            </Button>
            <label className="nx-import__drop">
              <input type="file" accept=".csv,text/csv" className="nx-sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              <span className="nx-dropzone__icon"><Icon name="upload" size={20} /></span>
              <span className="nx-dropzone__title">{fileName || 'Click to choose a CSV file'}</span>
              <span className="nx-dropzone__hint">.csv · name, email, role required</span>
            </label>
          </div>
        </Panel>
      )}

      {step === 'map' && parsed && (
        <Panel title="Map columns" sub={`${parsed.rows.length} rows`}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Match each NEXLI field to a column from your file. We've auto-matched what we could. The Role cell can be a role name (e.g. "Subject Teacher") or its id.</p>
          <div className="nx-section__grid">
            {STAFF_IMPORT_FIELDS.map((f) => (
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
            <div className="nx-statstrip__item"><div className="nx-statstrip__val" style={{ color: 'var(--danger)' }}>{invalidRows.length}</div><div className="nx-statstrip__lbl">With errors</div></div>
          </div>
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
              <Button variant="gold" leftIcon="user-plus" loading={importing} disabled={validCount === 0} onClick={runImport}>Create {validCount} accounts</Button>
            </div>
          </div>
        </Panel>
      )}

      {step === 'done' && result && (
        <ResultPanel
          result={result}
          onDone={() => navigate('/hr')}
          onAgain={() => { setStep('upload'); setParsed(null); setResult(null); setFileName(''); }}
        />
      )}

      {step !== 'done' && <Badge variant="muted" className="nx-import__safe">No accounts are created until you confirm</Badge>}
    </div>
  );
}

/* ---------------- Result + credentials ---------------- */
function ResultPanel({
  result, onDone, onAgain,
}: {
  result: { created: CreatedCred[]; skipped: number; reasons: string[] };
  onDone: () => void;
  onAgain: () => void;
}) {
  const { created, skipped, reasons } = result;
  return (
    <>
      <Panel>
        <div style={{ textAlign: 'center', padding: '20px 12px 8px' }}>
          <div className="nx-wizard-success__icon" style={{ margin: '0 auto 14px' }}><Icon name="check-circle" size={30} /></div>
          <h2 className="nx-status__title">Import finished</h2>
          <p className="nx-status__msg" style={{ margin: '6px auto 0' }}>
            <strong style={{ color: 'var(--success)' }}>{created.length}</strong> account{created.length === 1 ? '' : 's'} created
            {skipped > 0 ? <>, <strong>{skipped}</strong> skipped</> : null}.
          </p>
        </div>
        {reasons.length > 0 && (
          <div className="nx-import__errors" style={{ marginTop: 12 }}>
            <div className="nx-import__errhead"><Icon name="alert-triangle" size={14} /> {reasons.length} not created</div>
            {reasons.slice(0, 40).map((msg, i) => (
              <div className="nx-import__errrow" key={i}><span className="nx-import__errmsg">{msg}</span></div>
            ))}
          </div>
        )}
      </Panel>

      {created.length > 0 && <CredentialsPanel creds={created} />}

      <Panel>
        <div className="nx-status__actions" style={{ justifyContent: 'center' }}>
          <Button variant="gold" leftIcon="users" onClick={onDone}>View staff</Button>
          <Button variant="ghost" onClick={onAgain}>Import another file</Button>
        </div>
      </Panel>
    </>
  );
}

/** Masked/reveal credentials list — same one-time pattern as the school wizard. */
function CredentialsPanel({ creds }: { creds: CreatedCred[] }) {
  const toast = useToast();
  const [revealed, setRevealed] = useState(false);

  const copyAll = () => {
    const text = creds.map((c) => `${c.name}\t${c.email}\t${c.password}`).join('\n');
    void navigator.clipboard?.writeText(`Name\tEmail\tTemp password\n${text}`);
    toast.success('Copied', 'Credentials copied to clipboard.');
  };
  const downloadCsv = () => {
    const rows = [['Name', 'Email', 'Temp password'], ...creds.map((c) => [c.name, c.email, c.password])];
    const csv = rows.map((r) => r.map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nexli-staff-credentials.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title="Temporary credentials"
      sub={`${creds.length} new account${creds.length === 1 ? '' : 's'}`}
      headerRight={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" leftIcon={revealed ? 'eye-off' : 'eye'} onClick={() => setRevealed((v) => !v)}>{revealed ? 'Hide' : 'Reveal'}</Button>
          <Button variant="ghost" size="sm" leftIcon="copy" onClick={copyAll}>Copy</Button>
          <Button variant="ghost" size="sm" leftIcon="download" onClick={downloadCsv}>CSV</Button>
        </div>
      }
    >
      <p className="nx-status__msg" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--warning)', fontSize: 12.5, marginTop: 0, marginBottom: 12 }}>
        <Icon name="alert-triangle" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        One-time passwords — store them securely now; they won&rsquo;t be shown again. Each member should change theirs on first sign-in.
        Secure invite-email delivery is not yet available, so share these directly for now.
      </p>
      <div className="nx-creds">
        {creds.map((c) => (
          <div className="nx-kv" key={c.email}>
            <span className="nx-kv__k" style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ display: 'block', fontSize: 11.5 }}>{c.email}</span>
            </span>
            <span className="nx-kv__v" style={{ fontFamily: 'monospace' }}>
              {revealed ? c.password : '•'.repeat(Math.max(8, c.password.length))}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
