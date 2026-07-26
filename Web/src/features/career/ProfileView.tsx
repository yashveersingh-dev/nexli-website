import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { AILockedOverlay } from '@/components/AILockedOverlay';
import type { AssessmentProfile, ScoreBand } from '@/types/career';
import { RIASEC_CODES, APTITUDE_KEYS } from '@/types/career';
import { RIASEC_META, APTITUDE_META, STREAM_META, CLUSTER_META } from './bank';
import { band, buildTemplatedNarrative } from './scoring';

const BAND_LABEL: Record<ScoreBand, string> = { high: 'High', average: 'Average', low: 'Low' };

/** A single labelled horizontal score bar (0–100). */
function ScoreBar({ label, sub, score }: { label: string; sub?: string; score: number }) {
  const b = band(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <div style={{ width: 132, minWidth: 132 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, height: 10, borderRadius: 6, background: 'var(--border, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            borderRadius: 6,
            background:
              b === 'high' ? 'var(--gold, #d4af37)' : b === 'average' ? 'rgba(212,175,55,0.55)' : 'rgba(255,255,255,0.25)',
            transition: 'width .4s ease',
          }}
        />
      </div>
      <div style={{ width: 84, textAlign: 'right' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{score}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · {BAND_LABEL[b]}</span>
      </div>
    </div>
  );
}

/**
 * The full, explainable assessment report. Shared by the student result screen and
 * the counsellor review screen so both see exactly the same profile + reasoning.
 */
export function ProfileView({ profile }: { profile: AssessmentProfile }) {
  const top = profile.streams[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Headline */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="award" size={22} />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Holland (RIASEC) code</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>{profile.hollandCode}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top recommended stream</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{STREAM_META[top.stream].label}</div>
            <Badge variant="success">{top.fit}% fit</Badge>
          </div>
        </div>
        {profile.flags.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {profile.flags.map((f) => (
              <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)' }}>
                <Icon name="alert-triangle" size={14} aria-hidden="true" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Interest profile */}
      <Panel title="Interest profile (RIASEC)" sub="What you enjoy">
        {RIASEC_CODES.map((code) => (
          <ScoreBar key={code} label={RIASEC_META[code].label} sub={RIASEC_META[code].blurb} score={profile.riasec[code]} />
        ))}
      </Panel>

      {/* Aptitude profile */}
      <Panel title="Aptitude profile" sub="How you tend to work">
        {APTITUDE_KEYS.map((key) => (
          <ScoreBar key={key} label={APTITUDE_META[key].label} score={profile.aptitude[key]} />
        ))}
      </Panel>

      {/* Stream recommendation + why */}
      <Panel title="Recommended streams" sub="With the reasons (drivers) behind each fit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profile.streams.map((s, i) => (
            <div
              key={s.stream}
              style={{ padding: '10px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {i === 0 && <Icon name="trophy" size={16} />}
                <strong>{STREAM_META[s.stream].label}</strong>
                <Badge variant={i === 0 ? 'success' : i === 1 ? 'info' : 'muted'}>{s.fit}% fit</Badge>
                {i === 0 && <Badge variant="success">Best match</Badge>}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                Typical subjects: {STREAM_META[s.stream].subjects}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Why: </span>
                {s.drivers.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Career clusters */}
      <Panel title="Career clusters to explore" sub="Ranked by fit to your profile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profile.careers.map((c) => (
            <div key={c.cluster} style={{ padding: '10px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Icon name="briefcase" size={15} />
                <strong>{c.title || CLUSTER_META[c.cluster].title}</strong>
                <Badge variant={c.fit >= 67 ? 'success' : c.fit >= 40 ? 'warning' : 'muted'}>{c.fit}% match</Badge>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{c.why}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Honest rules-based summary */}
      <Panel title="Your summary" sub="Generated from your answers — transparent, no AI">
        <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{buildTemplatedNarrative(profile)}</p>
      </Panel>

      {/* Blocked AI add-on — honest, behind the locked overlay; never a fake AI call. */}
      <Panel title="Personalised AI guidance" sub="A future add-on">
        <AILockedOverlay title="Personalised career narrative">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              A deeper, individually written guidance essay — connecting your profile to subject choices,
              entrance exams and long-term goals — will appear here once AI is enabled for your school.
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Until then, the profile, stream recommendation and clusters above are fully computed offline
              from your actual answers — nothing on this screen is AI-generated or simulated.
            </p>
          </div>
        </AILockedOverlay>
      </Panel>
    </div>
  );
}
