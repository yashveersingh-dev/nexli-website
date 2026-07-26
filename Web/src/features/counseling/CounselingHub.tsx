import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, Textarea, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useCounselingSessions,
  createCounselingSession,
  isCounselingOversight,
  useStudents,
  type Actor,
  type CounselingType,
  type CounselingSession,
} from './data';

const TYPE_META: Record<CounselingType, { label: string; variant: 'success' | 'info' | 'warning' | 'muted' }> = {
  wellbeing: { label: 'Wellbeing', variant: 'success' },
  academic: { label: 'Academic', variant: 'info' },
  behavioural: { label: 'Behavioural', variant: 'warning' },
  career: { label: 'Career', variant: 'info' },
  family: { label: 'Family', variant: 'muted' },
  other: { label: 'Other', variant: 'muted' },
};
const TYPE_OPTIONS = (Object.keys(TYPE_META) as CounselingType[]).map((k) => ({ value: k, label: TYPE_META[k].label }));
const todayStr = () => new Date().toISOString().slice(0, 10);

/** Counselling case register — confidential session notes for counsellors. */
export function CounselingHub() {
  const toast = useToast();
  const { schoolId, uid, role, secondaryRole, member, can } = useSession();
  const canRead = can('counseling.read');
  const canWrite = can('counseling.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  // Confidentiality: a non-oversight counsellor sees only sessions they own
  // (`counselorUid === uid`); leadership/principal-equivalents see the whole school.
  const isOversight = isCounselingOversight(role, secondaryRole);
  const ownerScope = !isOversight ? uid : undefined;

  const { data: sessions, loading } = useCounselingSessions(canRead ? schoolId : undefined, ownerScope);
  const { data: students } = useStudents(canRead ? schoolId : undefined);

  const [filterType, setFilterType] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [dateStr, setDateStr] = useState(todayStr());
  const [type, setType] = useState<CounselingType>('wellbeing');
  const [summary, setSummary] = useState('');
  const [followUp, setFollowUp] = useState(false);

  const studentOptions = useMemo(
    () =>
      [...students]
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((s) => ({
          value: s.id,
          label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}${s.sectionName ? `-${s.sectionName}` : ''}` : ''}`,
        })),
    [students],
  );

  const rows = useMemo(
    () => sessions.filter((s) => (filterType ? s.type === filterType : true)),
    [sessions, filterType],
  );

  const openNew = () => {
    setStudentId('');
    setDateStr(todayStr());
    setType('wellbeing');
    setSummary('');
    setFollowUp(false);
    setOpen(true);
  };

  const save = async () => {
    if (!schoolId || !studentId || !summary.trim()) return;
    const student = students.find((s) => s.id === studentId);
    setBusy(true);
    const payload: Omit<CounselingSession, 'id'> = {
      schoolId,
      studentId,
      studentName: student?.fullName,
      studentClass: student ? [student.gradeName, student.sectionName].filter(Boolean).join('-') : undefined,
      date: dateStr ? new Date(dateStr).getTime() : Date.now(),
      type,
      summary: summary.trim(),
      followUpRequired: followUp || undefined,
    };
    try {
      await createCounselingSession(schoolId, payload, actor);
      toast.success('Session logged');
      setOpen(false);
    } catch {
      toast.error('Could not save the session');
    } finally {
      setBusy(false);
    }
  };

  if (!canRead) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Counselling</h1>
            <p className="nx-page__sub">Student wellbeing &amp; guidance.</p>
          </div>
        </div>
        <Panel>
          <EmptyState icon="lock" title="Restricted" message="Counselling case notes are limited to the school's counsellors." />
        </Panel>
      </div>
    );
  }

  const followUps = sessions.filter((s) => s.followUpRequired).length;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Counselling</h1>
          <p className="nx-page__sub">Confidential student wellbeing &amp; guidance sessions.</p>
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={openNew}>
            Log session
          </Button>
        )}
      </div>

      <div className="cmp-confidential" role="note" style={{ marginBottom: 16 }}>
        <Icon name="lock" size={15} aria-hidden="true" />
        <span>
          <strong>Confidential.</strong> Counselling notes are sensitive personal data. Share only on a strict
          need-to-know basis, and escalate child-protection concerns to the CPO via Safeguarding.{' '}
          {isOversight
            ? 'As leadership you can see every counsellor’s sessions.'
            : 'You see only the sessions you have logged.'}
        </span>
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          aria-label="Filter by type"
          options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]}
        />
        <div style={{ flex: 1 }} />
        {followUps > 0 && <Badge variant="warning">{followUps} follow-up{followUps > 1 ? 's' : ''} pending</Badge>}
      </div>

      {loading ? (
        <Panel><Skeleton height={200} /></Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="heart-pulse"
            title={filterType ? 'No sessions of this type' : 'No counselling sessions logged yet'}
            message={canWrite ? 'Log your first session to start a confidential record for a student.' : 'Sessions will appear here once logged.'}
            action={canWrite && !filterType ? <Button variant="gold" leftIcon="plus" onClick={openNew}>Log session</Button> : undefined}
          />
        </Panel>
      ) : (
        <Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((s) => {
              const meta = TYPE_META[s.type] ?? TYPE_META.other;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
                    borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{s.studentName ?? 'Student'}</strong>
                      {s.studentClass && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.studentClass}</span>}
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {s.followUpRequired && <Badge variant="warning">Follow-up</Badge>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{s.summary}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {formatDate(s.date)}{s.counselorName ? ` · ${s.counselorName}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="heart-pulse"
        tone="gold"
        title="Log counselling session"
        description="Confidential — visible only to counselling staff and leadership."
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!studentId || !summary.trim()} onClick={save}>
              Save session
            </Button>
          </>
        }
      >
        <Field label="Student" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select a student…" options={studentOptions} />
        </Field>
        <div className="grid g-2">
          <Field label="Date" required>
            <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </Field>
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as CounselingType)} options={TYPE_OPTIONS} />
          </Field>
        </div>
        <Field label="Session notes" required hint="What was discussed and any agreed actions.">
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} autoResize rows={3} placeholder="Confidential notes…" />
        </Field>
        <Field label="Follow-up needed">
          <Toggle checked={followUp} onChange={setFollowUp} label="Flag this student for a follow-up session" />
        </Field>
      </Modal>
    </div>
  );
}
