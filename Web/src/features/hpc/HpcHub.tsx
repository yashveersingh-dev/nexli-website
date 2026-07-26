import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Select, Field } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { formatRelative } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useHpcCards, deleteHpcCard, type Actor } from '@/features/analytics/data';
import { useGrades, useSections, useStudents } from '@/features/school/data';
import { HPC_TERM_OPTIONS } from '@/features/analytics/meta';
import { TERM_LABEL } from './hpcSchema';
import { statusOf, canApproveHpc, canEditStatus, HPC_STATUS_META } from './hpcWorkflow';
import { bulkGenerateDrafts } from './hpcBulk';
import type { HpcCard, HpcTerm } from '@/types/special';
import '@/features/analytics/analytics.css';
import './hpc.css';

type Tab = 'all' | 'submitted' | 'draft' | 'approved' | 'returned';

/** Staff HPC hub: list, filter, approve and bulk-manage holistic progress cards. */
export function HpcHub() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, role, can } = useSession();
  // HPC authoring is owned by teachers/coordinator; leadership reviews & approves.
  const { canOperate: canWrite, isReviewer: isHpcReviewer, ownerLabel } = useOwnership('hpc');
  const isApprover = canApproveHpc(role, can);
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: cards, loading } = useHpcCards(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: students } = useStudents(schoolId);

  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  // Approvers land on the pending queue first; authors see everything.
  const [tab, setTab] = useState<Tab>(isApprover ? 'submitted' : 'all');
  const [removing, setRemoving] = useState<HpcCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const counts = useMemo(() => {
    const c = { total: cards.length, draft: 0, submitted: 0, approved: 0, returned: 0 };
    for (const card of cards) c[statusOf(card)] += 1;
    return c;
  }, [cards]);

  const gradeOptions = useMemo(
    () => [{ value: '', label: 'All grades' }, ...grades.map((g) => ({ value: g.name, label: g.name }))],
    [grades],
  );
  const termOptions = [{ value: '', label: 'All terms' }, ...HPC_TERM_OPTIONS];

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'submitted', label: 'Pending approval', count: counts.submitted },
    { id: 'draft', label: 'Drafts', count: counts.draft },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'returned', label: 'Returned', count: counts.returned },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards
      .filter((c) => (tab === 'all' ? true : statusOf(c) === tab))
      .filter((c) => (grade ? c.gradeName === grade : true))
      .filter((c) => (term ? c.term === term : true))
      .filter((c) => (q ? c.studentName.toLowerCase().includes(q) : true))
      .sort((a, b) => (b.lastModifiedAt ?? b.createdAt ?? 0) - (a.lastModifiedAt ?? a.createdAt ?? 0));
  }, [cards, tab, grade, term, search]);

  const remove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteHpcCard(schoolId, removing.id, actor);
      toast.success('Card deleted', removing.studentName);
      setRemoving(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Holistic Progress Cards</h1>
          <p className="nx-page__sub">NEP 2020 holistic progress cards — domains, scholastic &amp; co-scholastic, reflections, and a leadership approval workflow.</p>
        </div>
        <div className="hpc-head-actions">
          {canWrite && (
            <Button variant="subtle" leftIcon="users" onClick={() => setBulkOpen(true)}>Bulk tools</Button>
          )}
          {canWrite && (
            <Button variant="gold" leftIcon="plus" onClick={() => navigate('/hpc/new')}>New card</Button>
          )}
        </div>
      </div>

      {isHpcReviewer && !canWrite && <ReviewModeNote owner={ownerLabel} />}

      <div className="kpi-grid">
        <KPICard icon="file-text" label="Cards created" count={counts.total} format="us" />
        <KPICard icon="clock" label="Pending approval" count={counts.submitted} format="us" subColor="var(--warning, var(--gold))" sub={counts.submitted ? 'Awaiting leadership' : 'All clear'} />
        <KPICard icon="check-circle" label="Approved & published" count={counts.approved} format="us" subColor="var(--gold)" sub={counts.total ? `${Math.round((counts.approved / counts.total) * 100)}% of cards` : undefined} />
        <KPICard icon="edit" label="Drafts & returned" count={counts.draft + counts.returned} format="us" />
      </div>

      <Panel
        title="Progress cards"
        headerRight={
          <div className="hpc-filters">
            <div className="nx-input-wrap nx-input-wrap--sm has-left">
              <Icon name="search" size={16} className="nx-input__icon nx-input__icon--left" />
              <input
                className="nx-input"
                type="search"
                value={search}
                placeholder="Search student"
                aria-label="Search by student name"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select size="sm" value={grade} onChange={(e) => setGrade(e.target.value)} options={gradeOptions} aria-label="Filter by grade" />
            <Select size="sm" value={term} onChange={(e) => setTerm(e.target.value)} options={termOptions} aria-label="Filter by term" />
          </div>
        }
      >
        <div className="hpc-tabs" role="tablist" aria-label="Filter cards by status">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`hpc-tab ${tab === t.id ? 'is-on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="hpc-tab__count">{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="hpc-row__list">
            <Skeleton height={64} /><Skeleton height={64} /><Skeleton height={64} />
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No progress cards yet"
            message={canWrite ? 'Create the first holistic progress card, or use Bulk tools to generate drafts for a whole section.' : 'Holistic progress cards will appear here once teachers create them.'}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/hpc/new')}>New card</Button> : undefined}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={tab === 'submitted' ? 'check-circle' : 'search'}
            title={tab === 'submitted' ? 'Nothing pending approval' : 'No cards match'}
            message={tab === 'submitted' ? 'There are no cards waiting on you right now.' : 'Try a different status tab, or clear the grade, term or search filters.'}
          />
        ) : (
          <div className="hpc-row__list">
            {filtered.map((c) => {
              const status = statusOf(c);
              const meta = HPC_STATUS_META[status];
              return (
                <div key={c.id} className="hpc-row" role="button" tabIndex={0}
                  onClick={() => navigate(`/hpc/${c.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/hpc/${c.id}`); } }}
                >
                  <Avatar name={c.studentName} size={36} />
                  <div className="hpc-row__main">
                    <div className="hpc-row__name">{c.studentName}</div>
                    <div className="hpc-row__meta">
                      {[c.gradeName, c.sectionName].filter(Boolean).join(' · ') || 'No class'} · {c.academicYear} · {TERM_LABEL[c.term]}
                      {c.lastModifiedAt ? ` · ${formatRelative(c.lastModifiedAt)}` : ''}
                    </div>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  {canWrite && (
                    <div className="hpc-row__rowactions" onClick={(e) => e.stopPropagation()}>
                      {canEditStatus(status) && (
                        <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${c.studentName}'s card`} onClick={() => navigate(`/hpc/${c.id}/edit`)} />
                      )}
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Delete ${c.studentName}'s card`} onClick={() => setRemoving(c)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        tone="danger"
        loading={busy}
        title="Delete progress card?"
        message={removing ? `${removing.studentName}'s ${TERM_LABEL[removing.term]} card will be permanently removed.` : ''}
        confirmLabel="Delete"
      />

      {canWrite && (
        <BulkToolsModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          grades={gradeOptions}
          sections={sections}
          gradesRaw={grades}
          students={students}
          cards={cards}
          schoolId={schoolId}
          actor={actor}
          onPrint={(g, s, t) => {
            const qs = new URLSearchParams();
            if (g) qs.set('grade', g);
            if (s) qs.set('section', s);
            if (t) qs.set('term', t);
            navigate(`/hpc/print?${qs.toString()}`);
          }}
        />
      )}
    </div>
  );
}

/* ----------------------------- Bulk tools ----------------------------- */
function BulkToolsModal({
  open, onClose, grades, sections, gradesRaw, students, cards, schoolId, actor, onPrint,
}: {
  open: boolean;
  onClose: () => void;
  grades: { value: string; label: string }[];
  sections: { id: string; gradeId: string; name: string }[];
  gradesRaw: { id: string; name: string }[];
  students: { id: string; fullName: string; status: string; gradeName?: string; sectionName?: string }[];
  cards: HpcCard[];
  schoolId?: string;
  actor: Actor;
  onPrint: (grade: string, section: string, term: HpcTerm | '') => void;
}) {
  const toast = useToast();
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [term, setTerm] = useState<HpcTerm>('term1');
  const [year, setYear] = useState(`${new Date().getFullYear()}`);
  const [running, setRunning] = useState(false);

  // Sections belonging to the chosen grade (by name → id → sections).
  const gradeId = useMemo(() => gradesRaw.find((g) => g.name === grade)?.id, [gradesRaw, grade]);
  const sectionOptions = useMemo(
    () => [
      { value: '', label: 'All sections' },
      ...sections.filter((s) => (gradeId ? s.gradeId === gradeId : true)).map((s) => ({ value: s.name, label: s.name })),
    ],
    [sections, gradeId],
  );

  const targetStudents = useMemo(
    () =>
      students.filter(
        (s) => s.status === 'active' && (grade ? s.gradeName === grade : false) && (section ? s.sectionName === section : true),
      ),
    [students, grade, section],
  );

  const reset = () => { setGrade(''); setSection(''); setTerm('term1'); };

  const generate = async () => {
    if (!schoolId) return;
    if (!grade) { toast.error('Pick a grade', 'Choose at least a grade to generate cards for.'); return; }
    if (targetStudents.length === 0) { toast.error('No active students', 'No active students match that class.'); return; }
    setRunning(true);
    try {
      const res = await bulkGenerateDrafts(
        schoolId,
        targetStudents as Parameters<typeof bulkGenerateDrafts>[1],
        cards,
        year.trim() || `${new Date().getFullYear()}`,
        term,
        actor,
      );
      toast.success(
        res.created ? `Generated ${res.created} draft card${res.created === 1 ? '' : 's'}` : 'Nothing to generate',
        res.skipped ? `${res.skipped} already existed and were left untouched.` : undefined,
      );
      onClose();
      reset();
    } catch {
      toast.error('Could not generate', 'Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={generate}
      loading={running}
      tone="gold"
      icon="users"
      title="Bulk tools"
      message="Generate draft cards for a whole section, or print every approved card for a class in one go."
      confirmLabel={`Generate ${targetStudents.length || ''} draft${targetStudents.length === 1 ? '' : 's'}`.trim()}
    >
      <div className="hpc-bulk-grid">
        <Field label="Grade" required htmlFor="hpc-bulk-grade">
          <Select id="hpc-bulk-grade" value={grade} options={grades} onChange={(e) => { setGrade(e.target.value); setSection(''); }} />
        </Field>
        <Field label="Section" htmlFor="hpc-bulk-section">
          <Select id="hpc-bulk-section" value={section} options={sectionOptions} onChange={(e) => setSection(e.target.value)} />
        </Field>
        <Field label="Term" required htmlFor="hpc-bulk-term">
          <Select id="hpc-bulk-term" value={term} options={HPC_TERM_OPTIONS} onChange={(e) => setTerm(e.target.value as HpcTerm)} />
        </Field>
        <Field label="Academic year" required htmlFor="hpc-bulk-year">
          <input id="hpc-bulk-year" className="nx-input" value={year} placeholder="2025-26" onChange={(e) => setYear(e.target.value)} />
        </Field>
      </div>
      <p className="hpc-bulk-note">
        <Icon name="info" size={14} /> {grade ? `${targetStudents.length} active student${targetStudents.length === 1 ? '' : 's'} in scope. ` : 'Choose a grade to see who is in scope. '}
        Existing cards are never overwritten.
      </p>
      <Button type="button" variant="subtle" block leftIcon="download" onClick={() => onPrint(grade, section, term)}>
        Print approved cards for this class
      </Button>
    </ConfirmModal>
  );
}
