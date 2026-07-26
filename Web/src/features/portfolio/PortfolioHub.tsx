import { useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Tabs } from '@/components/Tabs';
import { KPICard } from '@/components/KPICard';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentContext } from '@/features/studentportal/useStudentContext';
import {
  CATEGORY_META,
  CATEGORY_OPTIONS,
  CATEGORY_ORDER,
  computeSkillsSummary,
  createEntry,
  deleteEntry,
  parseSkills,
  rejectEntry,
  updateEntry,
  useAllPortfolio,
  useStudentPortfolio,
  verifyEntry,
  type Actor,
  type EntryPatch,
  type NewEntryInput,
} from './data';
import { buildPassportHtml, printPassport } from './print';
import type { AchievementCategory, PortfolioEntry } from '@/types/portfolio';

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Verifier roles can endorse/reject claims (own permission key, wired by the parent). */
function statusBadge(e: PortfolioEntry) {
  if (e.status === 'verified' && e.verification) {
    return <Badge variant="success">Verified · {e.verification.verifierName}</Badge>;
  }
  if (e.status === 'rejected') return <Badge variant="danger">Not verified</Badge>;
  return <Badge variant="warning">Self-reported</Badge>;
}

/**
 * Digital Skills Passport hub. Branches on role:
 *  • a student (linked `member.studentId`) gets their own portfolio (add/edit/print);
 *  • verifier staff (`portfolio.verify`) get the verification queue.
 * A user who is both falls back to the student view first via the tabs.
 */
export function PortfolioHub() {
  const { can } = useSession();
  const ctx = useStudentContext();
  const isStudent = ctx.status !== 'not_linked';
  const canVerify = can('students.write');

  // Linked student with no verify rights → just their own passport.
  if (isStudent && !canVerify) return <StudentPassport />;
  // Pure staff verifier (no linked student) → just the queue.
  if (!isStudent && canVerify) return <StaffQueue />;
  // Both (e.g. a teacher testing their own demo student) → tabbed.
  if (isStudent && canVerify) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Skills Passport</h1>
            <p className="nx-page__sub">Your achievements and the school's verification queue.</p>
          </div>
        </div>
        <Tabs
          variant="line"
          aria-label="Skills Passport"
          tabs={[
            { id: 'mine', label: 'My passport', icon: 'award' },
            { id: 'queue', label: 'Verification queue', icon: 'check' },
          ]}
        >
          {(active) => (active === 'mine' ? <StudentPassport embedded /> : <StaffQueue embedded />)}
        </Tabs>
      </div>
    );
  }

  // Neither a linked student nor a verifier.
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Skills Passport</h1>
          <p className="nx-page__sub">Digital achievement portfolio &amp; micro-credentials.</p>
        </div>
      </div>
      <Panel>
        <EmptyState
          icon="award"
          title="No passport linked"
          message="The Skills Passport is for students (their own portfolio) and verifying staff. Your account is linked to neither."
        />
      </Panel>
    </div>
  );
}

/* ============================ Student view ============================ */

const blankForm = () => ({
  category: 'academic' as AchievementCategory,
  title: '',
  description: '',
  date: todayStr(),
  organisation: '',
  skills: '',
  evidenceUrl: '',
});

function StudentPassport({ embedded }: { embedded?: boolean }) {
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const ctx = useStudentContext();
  const studentId = ctx.studentId;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: entries, loading } = useStudentPortfolio(schoolId, studentId);
  // Sort client-side (the query has no orderBy — see useStudentPortfolio).
  const sorted = useMemo(() => [...entries].sort((a, b) => (b.date ?? 0) - (a.date ?? 0)), [entries]);
  const summary = useMemo(() => computeSkillsSummary(entries), [entries]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioEntry | null>(null);
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ReturnType<typeof blankForm>>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const studentName = ctx.student?.fullName ?? member?.name ?? 'Student';
  const studentClass = ctx.student
    ? [ctx.student.gradeName, ctx.student.sectionName].filter(Boolean).join('-') || undefined
    : undefined;

  const openNew = () => {
    setEditing(null);
    setForm(blankForm());
    setOpen(true);
  };
  const openEdit = (e: PortfolioEntry) => {
    setEditing(e);
    setForm({
      category: e.category,
      title: e.title,
      description: e.description ?? '',
      date: new Date(e.date).toISOString().slice(0, 10),
      organisation: e.organisation ?? '',
      skills: (e.skills ?? []).join(', '),
      evidenceUrl: e.evidenceUrl ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!schoolId || !studentId || !form.title.trim()) return;
    setBusy(true);
    const skills = parseSkills(form.skills);
    try {
      if (editing) {
        const patch: EntryPatch = {
          category: form.category,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          date: form.date ? new Date(form.date).getTime() : Date.now(),
          organisation: form.organisation.trim() || undefined,
          skills: skills.length ? skills : undefined,
          evidenceUrl: form.evidenceUrl.trim() || undefined,
        };
        await updateEntry(schoolId, editing.id, patch);
        toast.success('Achievement updated');
      } else {
        const payload: NewEntryInput = {
          studentId,
          studentName,
          studentClass,
          category: form.category,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          date: form.date ? new Date(form.date).getTime() : Date.now(),
          organisation: form.organisation.trim() || undefined,
          skills: skills.length ? skills : undefined,
          evidenceUrl: form.evidenceUrl.trim() || undefined,
        };
        await createEntry(schoolId, payload, actor);
        toast.success('Achievement added — awaiting verification');
      }
      setOpen(false);
    } catch {
      toast.error('Could not save the achievement');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: PortfolioEntry) => {
    if (!schoolId) return;
    try {
      await deleteEntry(schoolId, e.id);
      toast.success('Achievement removed');
    } catch {
      toast.error('Could not remove the achievement');
    }
  };

  const print = () => {
    if (!ctx.schoolId) return;
    const ok = printPassport(
      buildPassportHtml({
        schoolName: school?.name ?? 'School',
        schoolLocation: [school?.city, school?.state].filter(Boolean).join(', ') || undefined,
        studentName,
        studentClass,
        generatedDateText: formatDate(Date.now()),
        entries: sorted,
        summary,
      }),
    );
    if (!ok) toast.error('Allow pop-ups to open the printable passport.');
  };

  const head = (
    <div className="nx-page__head">
      <div>
        {!embedded && <h1 className="nx-page__title">Skills Passport</h1>}
        <p className="nx-page__sub">Your cumulative portfolio of achievements, skills and verified credentials.</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" leftIcon="download" disabled={entries.length === 0} onClick={print}>
          Print
        </Button>
        <Button variant="gold" leftIcon="plus" onClick={openNew}>
          Add achievement
        </Button>
      </div>
    </div>
  );

  const body = (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KPICard icon="award" label="Achievements" count={summary.total} />
        <KPICard icon="check" label="Verified" count={summary.verified} sub={`${summary.total - summary.verified} awaiting`} />
        <KPICard icon="trophy" label="Distinct skills" count={summary.distinctSkills} />
      </div>

      <Tabs
        variant="line"
        aria-label="Passport view"
        tabs={[
          { id: 'timeline', label: 'Timeline', icon: 'calendar' },
          { id: 'skills', label: 'Skills summary', icon: 'award' },
        ]}
      >
        {(active) =>
          active === 'skills' ? (
            <SkillsSummaryView entries={entries} />
          ) : loading ? (
            <Panel><Skeleton height={200} /></Panel>
          ) : entries.length === 0 ? (
            <Panel>
              <EmptyState
                icon="award"
                title="Your passport is empty"
                message="Add your first achievement — a project, sport, award, internship or volunteering — and a teacher can verify it into a trusted credential."
                action={<Button variant="gold" leftIcon="plus" onClick={openNew}>Add achievement</Button>}
              />
            </Panel>
          ) : (
            <Panel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sorted.map((e) => (
                  <EntryCard key={e.id} entry={e} onEdit={() => openEdit(e)} onDelete={() => void remove(e)} />
                ))}
              </div>
            </Panel>
          )
        }
      </Tabs>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="award"
        tone="gold"
        title={editing ? 'Edit achievement' : 'Add achievement'}
        description={editing ? 'Saving re-submits this entry for verification.' : 'Your entry is self-reported until a teacher verifies it.'}
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!form.title.trim()} onClick={save}>
              {editing ? 'Save changes' : 'Add achievement'}
            </Button>
          </>
        }
      >
        <div className="grid g-2">
          <Field label="Category" required>
            <Select value={form.category} onChange={(e) => set('category', e.target.value)} options={CATEGORY_OPTIONS} />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        <Field label="Title" required>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. State-level 100m Gold" />
        </Field>
        <Field label="Description" optional>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} autoResize rows={3} placeholder="What you did and what you achieved…" />
        </Field>
        <Field label="Organisation" optional hint="Who ran or awarded it.">
          <Input value={form.organisation} onChange={(e) => set('organisation', e.target.value)} placeholder="e.g. State Athletics Association" />
        </Field>
        <Field label="Skills" optional hint="Comma-separated tags, e.g. teamwork, public speaking, python.">
          <Input value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="teamwork, leadership" />
        </Field>
        <Field label="Evidence link" optional hint="Paste a URL (certificate, photo, drive link).">
          <Input type="url" value={form.evidenceUrl} onChange={(e) => set('evidenceUrl', e.target.value)} placeholder="https://…" />
        </Field>
        <InfoCard icon="upload" title="Uploading files is coming soon">
          Phase 1 stores a pasted link only. Direct photo/file upload arrives once school file storage is enabled.
        </InfoCard>
      </Modal>
    </>
  );

  if (embedded) return <div className="nx-page">{body}</div>;
  return (
    <div className="nx-page">
      {head}
      {body}
    </div>
  );
}

function EntryCard({ entry, onEdit, onDelete }: { entry: PortfolioEntry; onEdit: () => void; onDelete: () => void }) {
  const meta = CATEGORY_META[entry.category];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
      <span aria-hidden="true" style={{ marginTop: 2, color: 'var(--gold, #c6a55c)' }}><Icon name={meta.icon} size={18} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14 }}>{entry.title}</strong>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {statusBadge(entry)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
          {formatDate(entry.date)}{entry.organisation ? ` · ${entry.organisation}` : ''}
          {entry.status === 'verified' && entry.verification ? ` · verified ${formatDate(entry.verification.verifiedAt)}` : ''}
        </div>
        {entry.description && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{entry.description}</div>
        )}
        {entry.skills && entry.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {entry.skills.map((s) => (
              <span key={s} className="badge badge--muted">{s}</span>
            ))}
          </div>
        )}
        {entry.evidenceUrl && (
          <div style={{ marginTop: 6 }}>
            <a href={entry.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--gold, #c6a55c)' }}>
              <Icon name="external-link" size={12} /> Evidence
            </a>
          </div>
        )}
        {entry.status === 'rejected' && entry.verification?.note && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Note: {entry.verification.note}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button variant="ghost" size="sm" leftIcon="edit" aria-label="Edit" onClick={onEdit} />
        <Button variant="ghost" size="sm" leftIcon="x" aria-label="Delete" onClick={onDelete} />
      </div>
    </div>
  );
}

function SkillsSummaryView({ entries }: { entries: PortfolioEntry[] }) {
  const summary = useMemo(() => computeSkillsSummary(entries), [entries]);
  if (entries.length === 0) {
    return (
      <Panel>
        <EmptyState icon="award" title="No skills yet" message="Skills tagged on your achievements are aggregated here." />
      </Panel>
    );
  }
  const cats = CATEGORY_ORDER.filter((k) => summary.byCategory[k] > 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel title="By category">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {cats.map((k) => (
            <span key={k} className="badge badge--info">{CATEGORY_META[k].label}: {summary.byCategory[k]}</span>
          ))}
        </div>
      </Panel>
      <Panel title="Skill tags" sub={`${summary.distinctSkills} distinct`}>
        {summary.skillTags.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skill tags added yet. Add tags when logging an achievement.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {summary.skillTags.map((t) => (
              <span key={t.skill} className="badge badge--muted">{t.skill}{t.count > 1 ? ` ×${t.count}` : ''}</span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============================ Staff verification queue ============================ */

function StaffQueue({ embedded }: { embedded?: boolean }) {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const canVerify = can('students.write');

  const { data: entries, loading } = useAllPortfolio(schoolId);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reject, setReject] = useState<PortfolioEntry | null>(null);
  const [note, setNote] = useState('');

  const classes = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.studentClass) set.add(e.studentClass);
    return [...set].sort();
  }, [entries]);

  const pending = useMemo(
    () => entries.filter((e) => e.status === 'submitted' && (filter ? e.studentClass === filter : true)),
    [entries, filter],
  );
  const decided = useMemo(
    () => entries.filter((e) => e.status !== 'submitted' && (filter ? e.studentClass === filter : true)),
    [entries, filter],
  );

  const doVerify = async (e: PortfolioEntry) => {
    if (!schoolId) return;
    setBusyId(e.id);
    try {
      await verifyEntry(schoolId, e.id, actor);
      toast.success(`Verified · ${e.title}`);
    } catch {
      toast.error('Could not verify the entry');
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    if (!schoolId || !reject) return;
    setBusyId(reject.id);
    try {
      await rejectEntry(schoolId, reject.id, actor, note);
      toast.success('Entry marked not verified');
      setReject(null);
      setNote('');
    } catch {
      toast.error('Could not update the entry');
    } finally {
      setBusyId(null);
    }
  };

  const head = !embedded && (
    <div className="nx-page__head">
      <div>
        <h1 className="nx-page__title">Skills Passport — verification</h1>
        <p className="nx-page__sub">Endorse student-reported achievements into trusted, school-signed credentials.</p>
      </div>
    </div>
  );

  const body = (
    <>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by class"
          options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c, label: c }))]}
        />
        <div style={{ flex: 1 }} />
        {pending.length > 0 && <Badge variant="warning">{pending.length} awaiting verification</Badge>}
      </div>

      {!canVerify && (
        <InfoCard icon="lock" title="View only">
          You can review the queue but only verifier roles (class teacher / coach / coordinator) can endorse entries.
        </InfoCard>
      )}

      {loading ? (
        <Panel><Skeleton height={200} /></Panel>
      ) : pending.length === 0 ? (
        <Panel>
          <EmptyState
            icon="check"
            title={filter ? 'No claims for this class' : 'Nothing awaiting verification'}
            message="Student-submitted achievements appear here for one-tap verification."
          />
        </Panel>
      ) : (
        <Panel title="Awaiting verification" sub={`${pending.length}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((e) => (
              <QueueRow
                key={e.id}
                entry={e}
                canVerify={canVerify}
                busy={busyId === e.id}
                onVerify={() => void doVerify(e)}
                onReject={() => { setReject(e); setNote(''); }}
              />
            ))}
          </div>
        </Panel>
      )}

      {decided.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Panel title="Decided" sub={`${decided.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {decided.map((e) => (
                <QueueRow key={e.id} entry={e} canVerify={false} busy={false} onVerify={() => {}} onReject={() => {}} />
              ))}
            </div>
          </Panel>
        </div>
      )}

      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        icon="x"
        tone="danger"
        title="Mark not verified"
        description="The student keeps the entry but it is clearly labelled unverified."
        size="sm"
        dismissible={busyId === null}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReject(null)} disabled={busyId !== null}>Cancel</Button>
            <Button variant="danger" loading={busyId !== null && !!reject} onClick={() => void doReject()}>Confirm</Button>
          </>
        }
      >
        <Field label="Reason" optional hint="Shown to the student.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} autoResize rows={2} placeholder="e.g. evidence link not accessible" />
        </Field>
      </Modal>
    </>
  );

  if (embedded) return <div className="nx-page">{body}</div>;
  return (
    <div className="nx-page">
      {head}
      {body}
    </div>
  );
}

function QueueRow({
  entry,
  canVerify,
  busy,
  onVerify,
  onReject,
}: {
  entry: PortfolioEntry;
  canVerify: boolean;
  busy: boolean;
  onVerify: () => void;
  onReject: () => void;
}) {
  const meta = CATEGORY_META[entry.category];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
      <span aria-hidden="true" style={{ marginTop: 2, color: 'var(--gold, #c6a55c)' }}><Icon name={meta.icon} size={18} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14 }}>{entry.studentName ?? 'Student'}</strong>
          {entry.studentClass && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.studentClass}</span>}
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {entry.status !== 'submitted' && statusBadge(entry)}
        </div>
        <div style={{ fontSize: 13.5, marginTop: 3 }}>{entry.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
          {formatDate(entry.date)}{entry.organisation ? ` · ${entry.organisation}` : ''}
        </div>
        {entry.description && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{entry.description}</div>
        )}
        {entry.skills && entry.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {entry.skills.map((s) => <span key={s} className="badge badge--muted">{s}</span>)}
          </div>
        )}
        {entry.evidenceUrl && (
          <div style={{ marginTop: 6 }}>
            <a href={entry.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--gold, #c6a55c)' }}>
              <Icon name="external-link" size={12} /> Evidence
            </a>
          </div>
        )}
      </div>
      {canVerify && entry.status === 'submitted' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="gold" size="sm" leftIcon="check" loading={busy} onClick={onVerify}>Verify</Button>
          <Button variant="ghost" size="sm" leftIcon="x" disabled={busy} onClick={onReject} aria-label="Reject" />
        </div>
      )}
    </div>
  );
}
