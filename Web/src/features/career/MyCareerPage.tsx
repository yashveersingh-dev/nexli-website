import { useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import type { AnswerMap, AssessmentProfile, CareerAssessment } from '@/types/career';
import { BANK_VERSION } from './bank';
import { useMyCareerAssessments, createCareerAssessment, type Actor } from './data';
import { TakeAssessment } from './TakeAssessment';
import { ProfileView } from './ProfileView';

type Mode = 'overview' | 'taking';

/**
 * Student-facing career assessment. A student sees ONLY their own attempts
 * (filtered here by `member.studentId`; the rules enforce it server-side). Honest
 * empty state before any attempt → take the offline assessment → see the
 * deterministic, explainable result.
 */
export function MyCareerPage() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const studentId = member?.studentId;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: mineRaw, loading } = useMyCareerAssessments(schoolId, studentId);
  const mine = useMemo(
    () => [...mineRaw].sort((a, b) => b.completedAt - a.completedAt),
    [mineRaw],
  );
  const latest = mine[0]; // newest first

  const [mode, setMode] = useState<Mode>('overview');
  const [busy, setBusy] = useState(false);

  if (!studentId) {
    return (
      <Page>
        <Panel>
          <EmptyState
            icon="lock"
            title="Account not linked"
            message="Your account isn't linked to a student record yet. Ask your school office to link it, then you can take the career assessment."
          />
        </Panel>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <Panel><Skeleton height={220} /></Panel>
      </Page>
    );
  }

  const save = async (answers: AnswerMap, profile: AssessmentProfile) => {
    if (!schoolId) return;
    setBusy(true);
    const payload: Omit<CareerAssessment, 'id' | 'schoolId' | 'createdAt' | 'createdBy'> = {
      studentId,
      studentName: member?.name,
      studentClass: undefined,
      bankVersion: BANK_VERSION,
      answers,
      profile,
      status: 'completed',
      completedAt: Date.now(),
    };
    try {
      await createCareerAssessment(schoolId, payload, actor);
      toast.success('Assessment submitted — here is your result');
      setMode('overview');
    } catch {
      toast.error('Could not save your assessment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'taking') {
    return (
      <Page
        sub="Answer honestly — your result is computed instantly from your answers."
        action={<Button variant="ghost" onClick={() => setMode('overview')} disabled={busy}>Cancel</Button>}
      >
        <TakeAssessment onSubmit={save} submitting={busy} />
      </Page>
    );
  }

  // No attempt yet → honest empty state.
  if (!latest) {
    return (
      <Page action={<Button variant="gold" leftIcon="clipboard" onClick={() => setMode('taking')}>Start assessment</Button>}>
        <Panel>
          <EmptyState
            icon="clipboard"
            title="Discover your career direction"
            message="Take a short, offline interest + aptitude assessment (about 34 quick questions). You'll get a clear, explainable profile — your RIASEC interests, aptitudes, recommended stream and career clusters — computed instantly from your own answers."
            action={<Button variant="gold" leftIcon="clipboard" onClick={() => setMode('taking')}>Start assessment</Button>}
          />
        </Panel>
        <Panel title="What you'll get" sub="Honest and transparent">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
            <li>Your Holland (RIASEC) interest code and aptitude profile.</li>
            <li>A recommended stream (Science / Commerce / Arts / Vocational) with the reasons behind it.</li>
            <li>Career clusters to explore, ranked by fit.</li>
            <li>A plain-language summary — no AI, nothing faked, fully reproducible.</li>
          </ul>
        </Panel>
      </Page>
    );
  }

  return (
    <Page action={<Button variant="ghost" leftIcon="refresh" onClick={() => setMode('taking')}>Retake</Button>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge variant="muted">Completed {formatDate(latest.completedAt)}</Badge>
        {latest.status === 'reviewed' ? (
          <Badge variant="success">Reviewed by counsellor</Badge>
        ) : (
          <Badge variant="info">Awaiting counsellor review</Badge>
        )}
        {mine.length > 1 && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{mine.length} attempts on record</span>}
      </div>

      {latest.counsellorNote && (
        <Panel title="Counsellor note" className="cmp-card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="heart-pulse" size={16} aria-hidden="true" />
            <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{latest.counsellorNote}</div>
          </div>
        </Panel>
      )}

      <ProfileView profile={latest.profile} />
    </Page>
  );
}

function Page({ children, sub, action }: { children: React.ReactNode; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Career &amp; Aptitude</h1>
          <p className="nx-page__sub">{sub ?? 'Find the stream and careers that fit you — based on your real interests and aptitudes.'}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
