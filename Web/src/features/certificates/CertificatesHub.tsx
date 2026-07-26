import { useMemo, useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Field, Select, Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useIssuedCertificates, issueCertificate, type CertificateType, type IssuedCertificate, type Actor } from './data';
import { CERT_META, CERT_DEFAULT_ACCENT, buildCertificateHtml, printCertificate, openPrintWindow, type CertOpts, type CertFontStyle } from './print';
import { CertificatePreview } from './CertificatePreview';
import type { Student } from '@/types/sis';

type Layout = 'portrait' | 'landscape';

const LAYOUT_OPTIONS: { value: Layout; label: string }[] = [
  { value: 'portrait', label: 'Portrait (Standard)' },
  { value: 'landscape', label: 'Landscape (Wide)' },
];

const FONT_OPTIONS: { value: CertFontStyle; label: string }[] = [
  { value: 'serif', label: 'Serif (Formal)' },
  { value: 'sans-serif', label: 'Sans-serif (Modern)' },
  { value: 'monospace', label: 'Monospace (Technical)' },
];

/** Visual customizations applied to both the preview and the printed certificate. */
interface CertCustomize {
  certName?: string;
  logoUrl?: string;
  accentColor?: string;
  layout: Layout;
  fontStyle: CertFontStyle;
}

export function CertificatesHub() {
  const { schoolId, uid, member, school, can } = useSession();
  const canIssue = can('certificates.write');
  const [tab, setTab] = useState<'issue' | 'register'>('issue');

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Certificates</h1>
          <p className="nx-page__sub">Issue and re-print bonafide, transfer, character &amp; conduct certificates — auto-filled from student records, serial-numbered, and logged.</p>
        </div>
      </div>
      <Tabs
        variant="line"
        aria-label="Certificates"
        value={tab}
        onChange={(id) => setTab(id as 'issue' | 'register')}
        tabs={[
          { id: 'issue', label: 'Issue', icon: 'award' },
          { id: 'register', label: 'Register', icon: 'file-text' },
        ]}
      >
        {(active) =>
          active === 'issue'
            ? <IssueTab schoolId={schoolId} schoolName={school?.name} schoolLoc={[school?.city, school?.state].filter(Boolean).join(', ')} ay={school?.currentAcademicYear} actor={{ uid: uid ?? 'unknown', name: member?.name }} canIssue={canIssue} />
            : <RegisterTab schoolId={schoolId} schoolName={school?.name} schoolLoc={[school?.city, school?.state].filter(Boolean).join(', ')} ay={school?.currentAcademicYear} />
        }
      </Tabs>
    </div>
  );
}

function studentOpts(students: Student[]) {
  return [...students]
    .filter((s) => s.status === 'active')
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}${s.sectionName ? `-${s.sectionName}` : ''}` : ''}` }));
}

function optsFor(
  type: CertificateType,
  serialNo: string,
  student: Student,
  schoolName?: string,
  schoolLoc?: string,
  ay?: string,
  purpose?: string,
  customize?: Partial<CertCustomize>,
): CertOpts {
  const guardian = student.guardians?.find((g) => g.isPrimary) ?? student.guardians?.[0];
  return {
    schoolName: schoolName ?? 'School',
    schoolLocation: schoolLoc || undefined,
    type,
    certName: customize?.certName?.trim() || undefined,
    serialNo,
    issuedDateText: formatDate(Date.now()),
    purpose: purpose?.trim() || undefined,
    logoUrl: customize?.logoUrl?.trim() || undefined,
    accentColor: customize?.accentColor || undefined,
    landscape: customize?.layout === 'landscape',
    fontStyle: customize?.fontStyle,
    student: {
      fullName: student.fullName,
      admissionNo: student.admissionNo,
      className: [student.gradeName, student.sectionName].filter(Boolean).join('-') || undefined,
      gender: student.gender,
      dobText: student.dob ? formatDate(student.dob) : undefined,
      guardianName: guardian?.name,
      academicYear: student.academicYear ?? ay,
      admissionDateText: student.admissionDate ? formatDate(student.admissionDate) : undefined,
    },
  };
}

/**
 * Map a free-text certificate name onto a known `CertificateType` so the
 * familiar ones keep their tailored prose and serial prefix (BON-, TC-, …);
 * anything else falls back to `custom` (CERT-). Keeps backward compatibility.
 */
function classifyCertName(name: string): CertificateType {
  const n = name.toLowerCase();
  if (n.includes('bonafide') || n.includes('bona fide')) return 'bonafide';
  if (n.includes('character')) return 'character';
  if (n.includes('conduct')) return 'conduct';
  if (n.includes('transfer')) return 'transfer';
  if (n.includes('leaving') || n.includes('slc')) return 'leaving';
  return 'custom';
}

/** A placeholder student so the live preview renders before a real one is picked. */
const PREVIEW_STUDENT: Student = {
  id: '__preview__', schoolId: '', admissionNo: '00000', firstName: 'Student', fullName: 'Student Name',
  gender: 'male', status: 'active',
} as Student;

function IssueTab({ schoolId, schoolName, schoolLoc, ay, actor, canIssue }: {
  schoolId?: string; schoolName?: string; schoolLoc?: string; ay?: string; actor: Actor; canIssue: boolean;
}) {
  const toast = useToast();
  const { data: students, loading } = useStudents(schoolId);
  const [certName, setCertName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState(CERT_DEFAULT_ACCENT);
  const [layout, setLayout] = useState<Layout>('portrait');
  const [fontStyle, setFontStyle] = useState<CertFontStyle>('serif');
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => studentOpts(students), [students]);

  const customize: CertCustomize = { certName, logoUrl, accentColor, layout, fontStyle };
  const type = classifyCertName(certName);

  // Live preview opts — uses the selected student, or a placeholder until one is chosen.
  const previewOpts = useMemo<CertOpts>(() => {
    const student = students.find((s) => s.id === studentId) ?? PREVIEW_STUDENT;
    return optsFor(type, 'CERT-0000-0000', student, schoolName, schoolLoc, ay, purpose, customize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, studentId, type, schoolName, schoolLoc, ay, purpose, certName, logoUrl, accentColor, layout, fontStyle]);

  const issue = async () => {
    const student = students.find((s) => s.id === studentId);
    if (!schoolId || !student || !certName.trim()) return;
    setBusy(true);
    // Open the print window synchronously (pre-await) so pop-up blockers don't stop it.
    const printWin = openPrintWindow();
    try {
      const cert = await issueCertificate(schoolId, {
        type, certName: certName.trim(), studentId: student.id, studentName: student.fullName,
        className: [student.gradeName, student.sectionName].filter(Boolean).join('-') || undefined,
        admissionNo: student.admissionNo, purpose: purpose.trim() || undefined,
      }, actor);
      const ok = printCertificate(buildCertificateHtml(optsFor(type, cert.serialNo, student, schoolName, schoolLoc, ay, purpose, customize)), printWin);
      toast.success(`${certName.trim()} issued — ${cert.serialNo}`);
      if (!ok) toast.error('Allow pop-ups to open the printable certificate.');
      setPurpose('');
    } catch {
      printWin?.close();
      toast.error('Could not issue the certificate');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton height={240} />;
  if (!canIssue) return <Panel><EmptyState icon="lock" title="View only" message="You don't have permission to issue certificates." /></Panel>;

  return (
    <Panel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: form (dark theme) */}
        <div style={{ flex: '1 1 320px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Field label="Certificate Name / Purpose" required>
            <Input
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="e.g. Bonafide Certificate, Transfer Certificate, Character Certificate, Scholarship Certificate"
            />
          </Field>
          <Field label="Student" required>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select a student…" options={options} />
          </Field>
          <Field label="Additional details / purpose" optional hint="Shown on the certificate (e.g. bank account, passport, scholarship).">
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. opening a bank account" />
          </Field>
          <Field label="School logo URL" optional hint="Direct image URL to your school logo (PNG/JPG recommended).">
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
          </Field>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '0 0 auto' }}>
              <Field label="Certificate accent color">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  aria-label="Certificate accent color"
                  style={{
                    width: 56, height: 38, padding: 2, borderRadius: 8, cursor: 'pointer',
                    background: 'var(--card, #181818)', border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  }}
                />
              </Field>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Layout">
                <Select value={layout} onChange={(e) => setLayout(e.target.value as Layout)} options={LAYOUT_OPTIONS} />
              </Field>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Font style">
                <Select value={fontStyle} onChange={(e) => setFontStyle(e.target.value as CertFontStyle)} options={FONT_OPTIONS} />
              </Field>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Button variant="gold" leftIcon="download" loading={busy} disabled={!studentId || !certName.trim()} onClick={issue}>
              Issue &amp; print
            </Button>
          </div>
        </div>

        {/* Right: live preview (document/light background) */}
        <div style={{ flex: '1 1 360px', minWidth: 300 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Live preview
          </div>
          <div
            style={{
              maxHeight: 500,
              overflow: 'hidden',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              borderRadius: 8,
              background: '#fff',
              padding: 12,
            }}
          >
            <CertificatePreview opts={previewOpts} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function RegisterTab({ schoolId, schoolName, schoolLoc, ay }: { schoolId?: string; schoolName?: string; schoolLoc?: string; ay?: string }) {
  const { data: certs, loading } = useIssuedCertificates(schoolId);
  const { data: students } = useStudents(schoolId);

  const reprint = (c: IssuedCertificate) => {
    const student = students.find((s) => s.id === c.studentId);
    const opts: CertOpts = student
      ? { ...optsFor(c.type, c.serialNo, student, schoolName, schoolLoc, ay, c.purpose, { certName: c.certName }), issuedDateText: formatDate(c.issuedAt) }
      : {
          schoolName: schoolName ?? 'School', schoolLocation: schoolLoc || undefined, type: c.type, certName: c.certName || undefined, serialNo: c.serialNo,
          issuedDateText: formatDate(c.issuedAt), purpose: c.purpose,
          student: { fullName: c.studentName, admissionNo: c.admissionNo, className: c.className, academicYear: ay },
        };
    printCertificate(buildCertificateHtml(opts));
  };

  if (loading) return <Skeleton height={200} />;
  if (certs.length === 0) {
    return <Panel><EmptyState icon="file-text" title="No certificates issued yet" message="Issued certificates are logged here with their serial numbers for re-printing and verification." /></Panel>;
  }

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {certs.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13.5 }}>{c.studentName}</strong>
                <Badge variant="info">{c.certName?.trim() || CERT_META[c.type].label}</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                {c.serialNo} · {formatDate(c.issuedAt)}{c.issuedByName ? ` · by ${c.issuedByName}` : ''}{c.className ? ` · ${c.className}` : ''}
              </div>
            </div>
            <Button variant="ghost" size="sm" leftIcon="download" onClick={() => reprint(c)}>Re-print</Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
