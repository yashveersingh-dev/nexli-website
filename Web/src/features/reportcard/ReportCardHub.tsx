import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Select } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatRelative } from '@/lib/format';
import { RESULT_STATUS_META } from '@/features/examinations/examSchema';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useReportCards, useSchemes, deleteReportCard, seedSchemes, type Actor,
  useGrades,
} from './data';
import { statusOf, canApproveReportCard, canEditStatus, RC_STATUS_META } from './workflow';
import type { ReportCard } from '@/types/reportcard';
import './reportcard.css';

type Tab = 'all' | 'submitted' | 'draft' | 'approved' | 'returned';

/** Staff report-card hub: list, filter, review/approve and bulk-manage cards. */
export function ReportCardHub() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, role, can } = useSession();
  const canWrite = can('gradebook.write') || can('exams.write');
  const isApprover = canApproveReportCard(role, can);
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: cards, loading } = useReportCards(schoolId);
  const { data: schemes, loading: schemesLoading } = useSchemes(schoolId);
  const { data: grades } = useGrades(schoolId);

  // Seed the bundled schemes once, on first load, when none exist yet (write users only).
  // Guard on schemesLoading so we don't seed before the first Firestore snapshot arrives —
  // firing while data: [] / loading: true would write seeds even when schemes already exist.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!schoolId || !canWrite || schemesLoading || seededRef.current) return;
    if (schemes.length === 0) {
      seededRef.current = true;
      void seedSchemes(schoolId, schemes, actor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, canWrite, schemesLoading, schemes.length]);

  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>(isApprover ? 'submitted' : 'all');
  const [removing, setRemoving] = useState<ReportCard | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c = { total: cards.length, draft: 0, submitted: 0, approved: 0, returned: 0 };
    for (const card of cards) c[statusOf(card)] += 1;
    return c;
  }, [cards]);

  const gradeOptions = useMemo(
    () => [{ value: '', label: 'All grades' }, ...grades.map((g) => ({ value: g.name, label: g.name }))],
    [grades],
  );
  const termOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of cards) seen.set(c.term, c.termLabel ?? c.term);
    return [{ value: '', label: 'All terms' }, ...[...seen].map(([value, label]) => ({ value, label }))];
  }, [cards]);

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
      await deleteReportCard(schoolId, removing.id, actor);
      toast.success('Card deleted', removing.studentName);
      setRemoving(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const printBatch = () => {
    const qs = new URLSearchParams();
    if (grade) qs.set('grade', grade);
    if (term) qs.set('term', term);
    navigate(`/report-cards/print?${qs.toString()}`);
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Report Cards</h1>
          <p className="nx-page__sub">Traditional marks report cards — auto-filled from exam marks &amp; attendance, with grades, totals, rank and a leadership approval workflow.</p>
        </div>
        <div className="rc-head-actions">
          <Button variant="ghost" leftIcon="edit" onClick={() => navigate('/report-cards/schemes')}>Schemes</Button>
          {canWrite && <Button variant="subtle" leftIcon="download" onClick={printBatch}>Print approved</Button>}
          {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/report-cards/generate')}>Generate</Button>}
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard icon="file-text" label="Cards created" count={counts.total} format="us" />
        <KPICard icon="clock" label="Pending approval" count={counts.submitted} format="us" subColor="var(--warning, var(--gold))" sub={counts.submitted ? 'Awaiting leadership' : 'All clear'} />
        <KPICard icon="check" label="Approved & published" count={counts.approved} format="us" subColor="var(--gold)" sub={counts.total ? `${Math.round((counts.approved / counts.total) * 100)}% of cards` : undefined} />
        <KPICard icon="edit" label="Drafts & returned" count={counts.draft + counts.returned} format="us" />
      </div>

      <Panel
        title="Report cards"
        headerRight={
          <div className="rc-filters">
            <div className="nx-input-wrap nx-input-wrap--sm has-left">
              <Icon name="search" size={16} className="nx-input__icon nx-input__icon--left" />
              <input className="nx-input" type="search" value={search} placeholder="Search student"
                aria-label="Search by student name" onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select size="sm" value={grade} onChange={(e) => setGrade(e.target.value)} options={gradeOptions} aria-label="Filter by grade" />
            <Select size="sm" value={term} onChange={(e) => setTerm(e.target.value)} options={termOptions} aria-label="Filter by term" />
          </div>
        }
      >
        <div className="rc-tabs" role="tablist" aria-label="Filter cards by status">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
              className={`rc-tab ${tab === t.id ? 'is-on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              <span className="rc-tab__count">{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rc-row__list"><Skeleton height={64} /><Skeleton height={64} /><Skeleton height={64} /></div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No report cards yet"
            message={canWrite ? 'Generate a class’s report cards from existing exam marks & attendance to get started.' : 'Report cards will appear here once teachers generate them.'}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/report-cards/generate')}>Generate cards</Button> : undefined}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={tab === 'submitted' ? 'check' : 'search'}
            title={tab === 'submitted' ? 'Nothing pending approval' : 'No cards match'}
            message={tab === 'submitted' ? 'There are no cards waiting on you right now.' : 'Try a different status tab, or clear the grade, term or search filters.'}
          />
        ) : (
          <div className="rc-row__list">
            {filtered.map((c) => {
              const status = statusOf(c);
              const meta = RC_STATUS_META[status];
              const resultMeta = RESULT_STATUS_META[c.result];
              return (
                <div key={c.id} className="rc-row" role="button" tabIndex={0}
                  onClick={() => navigate(`/report-cards/${c.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/report-cards/${c.id}`); } }}
                >
                  <Avatar name={c.studentName} size={36} />
                  <div className="rc-row__main">
                    <div className="rc-row__name">{c.studentName}</div>
                    <div className="rc-row__meta">
                      {[c.gradeName, c.sectionName].filter(Boolean).join(' · ') || 'No class'} · {c.academicYear} · {c.termLabel ?? c.term}
                      {c.totals.max > 0 ? ` · ${c.totals.percentage}%` : ''}
                      {c.lastModifiedAt ? ` · ${formatRelative(c.lastModifiedAt)}` : ''}
                    </div>
                  </div>
                  {c.totals.max > 0 && <Badge variant={resultMeta.variant}>{resultMeta.label}</Badge>}
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  {canWrite && (
                    <div className="rc-row__rowactions" onClick={(e) => e.stopPropagation()}>
                      {canEditStatus(status) && (
                        <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${c.studentName}'s card`} onClick={() => navigate(`/report-cards/${c.id}/edit`)} />
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
        title="Delete report card?"
        message={removing ? `${removing.studentName}'s ${removing.termLabel ?? removing.term} card will be permanently removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
