import { useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Tabs } from '@/components/Tabs';
import { Avatar } from '@/components/Avatar';
import { KPICard } from '@/components/KPICard';
import { Field, Input, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import type { CareerAssessment, StreamKey } from '@/types/career';
import { STREAM_KEYS } from '@/types/career';
import { STREAM_META } from './bank';
import { useCareerAssessments, reviewCareerAssessment, type Actor } from './data';
import { ProfileView } from './ProfileView';

type TabId = 'attempts' | 'cohort';

/**
 * Counsellor / staff career hub. Reads the whole cohort of `careerAssessments`,
 * lets a counsellor open any attempt, read the full explainable profile and add a
 * professional note (which marks the attempt reviewed). A cohort tab shows the
 * stream-inclination distribution for school planning. All read-only of student
 * answers; the only write is the counsellor note.
 */
export function CareerHub() {
  const { schoolId, uid, member, can } = useSession();
  // Reuse the counselling permission set — this is the same counsellor cohort.
  const canManage = can('counseling.write');
  const canRead = can('counseling.read');

  const { data: attempts, loading } = useCareerAssessments(canRead ? schoolId : undefined);
  const [tab, setTab] = useState<TabId>('attempts');

  if (!canRead) {
    return (
      <Page>
        <Panel>
          <EmptyState icon="lock" title="Restricted" message="Career assessment results are limited to the school's counsellors and guidance staff." />
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <Tabs
        variant="line"
        aria-label="Career view"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'attempts', label: 'Student attempts', icon: 'users', badge: attempts.length || undefined },
          { id: 'cohort', label: 'Cohort insights', icon: 'bar-chart' },
        ]}
      >
        {(active) =>
          active === 'attempts' ? (
            <AttemptList
              attempts={attempts}
              loading={loading}
              canManage={canManage}
              schoolId={schoolId}
              actor={{ uid: uid ?? 'unknown', name: member?.name }}
            />
          ) : (
            <CohortInsights attempts={attempts} loading={loading} />
          )
        }
      </Tabs>
    </Page>
  );
}

function AttemptList({
  attempts,
  loading,
  canManage,
  schoolId,
  actor,
}: {
  attempts: CareerAssessment[];
  loading: boolean;
  canManage: boolean;
  schoolId?: string;
  actor: Actor;
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<CareerAssessment | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? attempts.filter((a) => (a.studentName ?? '').toLowerCase().includes(q)) : attempts;
  }, [attempts, search]);

  const openAttempt = (a: CareerAssessment) => {
    setNote(a.counsellorNote ?? '');
    setOpen(a);
  };

  const saveNote = async () => {
    if (!schoolId || !open) return;
    setBusy(true);
    try {
      await reviewCareerAssessment(schoolId, open.id, note, actor);
      toast.success('Note saved · marked reviewed');
      setOpen(null);
    } catch {
      toast.error('Could not save the note');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Panel><Skeleton height={240} /></Panel>;

  if (attempts.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon="clipboard"
          title="No assessments completed yet"
          message="Once students complete the career & aptitude assessment, their attempts appear here for you to review, profile and note."
        />
      </Panel>
    );
  }

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student…"
          aria-label="Search student"
          leftIcon="search"
        />
      </div>

      {rows.length === 0 ? (
        <Panel><EmptyState icon="search" title="No matching students" message="Try a different name." /></Panel>
      ) : (
        <Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rows.map((a) => {
              const top = a.profile.streams[0];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openAttempt(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', width: '100%',
                    background: 'none', border: 'none', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                    color: 'inherit', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <Avatar name={a.studentName ?? 'Student'} size={32} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.studentName ?? 'Student'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Code {a.profile.hollandCode} · Top: {STREAM_META[top.stream].label} ({top.fit}%) · {formatDate(a.completedAt)}
                    </div>
                  </div>
                  {a.status === 'reviewed' ? <Badge variant="success">Reviewed</Badge> : <Badge variant="info">New</Badge>}
                  <Icon name="chevron-right" size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        icon="award"
        tone="gold"
        size="lg"
        title={open ? `${open.studentName ?? 'Student'} · Career profile` : 'Career profile'}
        description={open ? `Holland code ${open.profile.hollandCode} · completed ${formatDate(open.completedAt)}` : undefined}
        dismissible={!busy}
        footer={
          canManage ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(null)} disabled={busy}>Close</Button>
              <Button variant="gold" leftIcon="check" loading={busy} disabled={!note.trim()} onClick={saveNote}>
                Save note &amp; mark reviewed
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
          )
        }
      >
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ProfileView profile={open.profile} />
            {canManage ? (
              <Field label="Counsellor note" hint="Visible to the student. Saving marks this attempt reviewed.">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} autoResize rows={3} placeholder="Professional guidance for this student…" />
              </Field>
            ) : open.counsellorNote ? (
              <Panel title="Counsellor note">
                <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{open.counsellorNote}</div>
              </Panel>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}

function CohortInsights({ attempts, loading }: { attempts: CareerAssessment[]; loading: boolean }) {
  const dist = useMemo(() => {
    const counts: Record<StreamKey, number> = { science: 0, commerce: 0, arts: 0, vocational: 0 };
    for (const a of attempts) {
      const top = a.profile.streams[0]?.stream;
      if (top) counts[top] += 1;
    }
    return counts;
  }, [attempts]);

  if (loading) return <Panel><Skeleton height={200} /></Panel>;
  if (attempts.length === 0) {
    return (
      <Panel>
        <EmptyState icon="bar-chart" title="No data yet" message="Cohort stream-inclination appears once students complete the assessment." />
      </Panel>
    );
  }

  const total = attempts.length;
  const reviewed = attempts.filter((a) => a.status === 'reviewed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid g-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KPICard icon="clipboard" label="Assessments completed" count={total} />
        <KPICard icon="check-circle" label="Reviewed by counsellor" count={reviewed} />
        <KPICard icon="users" label="Awaiting review" count={total - reviewed} />
      </div>
      <Panel title="Top-stream inclination" sub="Where students' best-fit stream lands across the cohort">
        {STREAM_KEYS.map((s) => {
          const n = dist[s];
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
              <div style={{ width: 150, minWidth: 150, fontWeight: 600, fontSize: 13 }}>{STREAM_META[s].label}</div>
              <div style={{ flex: 1, height: 10, borderRadius: 6, background: 'var(--border, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: 'var(--gold, #d4af37)' }} />
              </div>
              <div style={{ width: 90, textAlign: 'right', fontSize: 13 }}>
                <strong>{n}</strong> <span style={{ color: 'var(--text-muted)' }}>· {pct}%</span>
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Career Counselling</h1>
          <p className="nx-page__sub">Review students' offline aptitude &amp; interest assessments, add guidance, and see cohort inclination.</p>
        </div>
      </div>
      {children}
    </div>
  );
}
