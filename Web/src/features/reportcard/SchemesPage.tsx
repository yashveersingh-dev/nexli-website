import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useSchemes, createScheme, deleteScheme, seedSchemes, type Actor,
} from './data';
import { SEED_SCHEMES, GRADING_SYSTEM_META, gradingSystemOf } from './schemes';
import { GradingSystemModal } from './GradingSystemModal';
import type { ReportCardScheme } from '@/types/reportcard';
import './reportcard.css';

/**
 * Scheme manager: view the grading & component configuration each report card is
 * built from. Schools start from the three bundled seed schemes (CBSE 9-point,
 * percentage, state-board) which can be re-seeded, cloned, and removed. Phase 1
 * keeps editing to clone+delete; a full field-by-field editor is a later phase.
 */
export function SchemesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('gradebook.write') || can('exams.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: schemes, loading } = useSchemes(schoolId);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<ReportCardScheme | null>(null);
  const [grading, setGrading] = useState<ReportCardScheme | null>(null);

  const missingSeeds = useMemo(
    () => SEED_SCHEMES.filter((s) => !schemes.some((p) => p.id === s.id)),
    [schemes],
  );

  const runSeed = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const n = await seedSchemes(schoolId, schemes, actor);
      toast.success(n ? `Added ${n} scheme${n === 1 ? '' : 's'}` : 'Schemes already present');
    } catch {
      toast.error('Could not add schemes');
    } finally {
      setBusy(false);
    }
  };

  const clone = async (scheme: ReportCardScheme) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const { id, ...rest } = scheme;
      void id;
      await createScheme(schoolId, { ...rest, schoolId, name: `${scheme.name} (copy)` }, actor);
      toast.success('Scheme cloned', `${scheme.name} (copy)`);
    } catch {
      toast.error('Could not clone scheme');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteScheme(schoolId, removing.id, actor);
      toast.success('Scheme removed', removing.name);
      setRemoving(null);
    } catch {
      toast.error('Could not remove scheme');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Grading schemes</h1>
          <p className="nx-page__sub">The component structure, grade bands and pass rules each report card is built from.</p>
        </div>
        <div className="rc-head-actions">
          <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/report-cards')}>Back</Button>
          {canWrite && missingSeeds.length > 0 && (
            <Button variant="gold" leftIcon="plus" loading={busy} onClick={runSeed}>Add starter schemes</Button>
          )}
        </div>
      </div>

      {loading ? (
        <Panel><Skeleton height={160} /></Panel>
      ) : schemes.length === 0 ? (
        <Panel>
          <EmptyState
            icon="file-text"
            title="No grading schemes yet"
            message="Add the bundled starter schemes (CBSE 9-point, percentage, state-board) to start generating report cards."
            action={canWrite ? <Button variant="gold" leftIcon="plus" loading={busy} onClick={runSeed}>Add starter schemes</Button> : undefined}
          />
        </Panel>
      ) : (
        schemes.map((scheme) => (
          <Panel
            key={scheme.id}
            title={scheme.name}
            headerRight={
              <div className="rc-head-actions">
                <Badge variant="info">{scheme.board}</Badge>
                <Badge variant="muted">{GRADING_SYSTEM_META[gradingSystemOf(scheme)].label}</Badge>
                {scheme.showRank && <Badge variant="muted">Ranked</Badge>}
                {canWrite && <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => setGrading(scheme)}>Grading</Button>}
                {canWrite && <Button variant="ghost" size="sm" leftIcon="plus" onClick={() => clone(scheme)}>Clone</Button>}
                {canWrite && <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${scheme.name}`} onClick={() => setRemoving(scheme)} />}
              </div>
            }
          >
            <div className="rc-grid">
              <div>
                <div className="rc-doc__section-title">Terms</div>
                <div className="rc-legend">{scheme.terms.map((t) => <span className="rc-legend__item" key={t.id}><b>{t.label}</b></span>)}</div>
              </div>
              <div>
                <div className="rc-doc__section-title">Components</div>
                <div className="rc-legend">{scheme.components.map((c) => <span className="rc-legend__item" key={c.id}><b>{c.label}</b> /{c.max}</span>)}</div>
              </div>
              <div>
                <div className="rc-doc__section-title">{gradingSystemOf(scheme) === 'marks' ? 'Grade bands' : 'Grade symbols'}</div>
                <div className="rc-legend">
                  {scheme.gradeBands.map((b) => (
                    <span className="rc-legend__item" key={b.grade}>
                      <b>{b.grade}</b>
                      {gradingSystemOf(scheme) === 'marks' ? ` ${b.minPct}–${b.maxPct}%` : ''}
                      {b.description ? ` · ${b.description}` : ''}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="rc-doc__section-title">Pass / co-scholastic</div>
                <p className="rc-note" style={{ margin: 0 }}>
                  <Icon name="info" size={14} /> Pass at {scheme.passPercent}%.
                  {scheme.coScholasticAreas?.length ? ` Co-scholastic: ${scheme.coScholasticAreas.join(', ')}.` : ''}
                </p>
              </div>
            </div>
          </Panel>
        ))
      )}

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        tone="danger"
        loading={busy}
        title="Remove scheme?"
        message={removing ? `${removing.name} will be removed. Existing cards already built from it are unaffected.` : ''}
        confirmLabel="Remove"
      />

      <GradingSystemModal open={!!grading} scheme={grading} onClose={() => setGrading(null)} />
    </div>
  );
}
