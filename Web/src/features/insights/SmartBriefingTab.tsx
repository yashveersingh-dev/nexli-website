import type { IconName } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { AILockedOverlay } from '@/components/AILockedOverlay';
import type { RoleId } from '@/types/roles';

/** A short description of what a briefing section will surface once AI is live. */
interface PreviewItem {
  icon: IconName;
  title: string;
  desc: string;
}

const SUMMARY_PREVIEW: PreviewItem[] = [
  {
    icon: 'alert-triangle',
    title: 'Attendance anomalies',
    desc: 'Sections trending below your attendance threshold this week.',
  },
  {
    icon: 'wallet',
    title: 'Fee alerts',
    desc: 'Families likely to miss an upcoming due date, drawn from your records.',
  },
  {
    icon: 'shield-check',
    title: 'Compliance',
    desc: 'Statutory returns and certificate renewals falling due soon.',
  },
];

const ACTIONS_PREVIEW: PreviewItem[] = [
  {
    icon: 'users',
    title: 'Follow-ups worth prioritising',
    desc: 'Students or staff matters that need attention today, ranked by urgency.',
  },
  {
    icon: 'file-text',
    title: 'A ready-to-review summary',
    desc: 'An auto-drafted board/principal summary you can refine and sign off.',
  },
];

/**
 * Smart briefing — a daily AI briefing surface.
 *
 * No AI provider is wired yet (see NEXLI_BUILD_PLAN.md §13A), so instead of a
 * fabricated "good morning" summary with invented section names, family counts
 * and to-dos, this shows an honest preview of what the briefing WILL distil from
 * your school&rsquo;s own data. Nothing here is a real or sample result, and the
 * &ldquo;ask NEXLI&rdquo; box is intentionally absent until the model is live.
 */
export function SmartBriefingTab({ role }: { role?: RoleId }) {
  const audience = role === 'parent' || role === 'student' ? 'you' : 'your school';

  return (
    <div className="in-stack">
      <Panel
        title="Daily briefing"
        sub="Preview"
        headerRight={<span className="nx-navtag">AI</span>}
      >
        <AILockedOverlay title="Smart briefing">
          <div className="in-preview">
            <div className="in-preview__head">
              <span className="in-preview__icon">
                <Icon name="sparkles" size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="in-preview__title">A short summary, every morning</div>
                <div className="in-preview__desc">
                  Once a NEXLI AI model is connected, this will open with a brief, plain-language
                  summary of what matters for {audience} today — distilled from attendance, fees and
                  compliance. It is not active yet, so no summary is generated.
                </div>
              </div>
            </div>
            <div className="in-preview__grid">
              {SUMMARY_PREVIEW.map((p) => (
                <div className="in-preview__card" key={p.title}>
                  <span className="in-preview__icon">
                    <Icon name={p.icon} size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="in-preview__title">{p.title}</div>
                    <div className="in-preview__desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AILockedOverlay>
      </Panel>

      <Panel title="What needs attention today" sub="Preview" headerRight={<span className="nx-navtag">AI</span>}>
        <AILockedOverlay title="Prioritised actions">
          <div className="in-preview">
            <p className="in-preview__lead">
              When AI is live, this will list the day&rsquo;s most important follow-ups, ordered by
              urgency and drawn from your school&rsquo;s own data. No tasks are shown yet.
            </p>
            <div className="in-preview__grid">
              {ACTIONS_PREVIEW.map((p) => (
                <div className="in-preview__card" key={p.title}>
                  <span className="in-preview__icon">
                    <Icon name={p.icon} size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="in-preview__title">{p.title}</div>
                    <div className="in-preview__desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AILockedOverlay>
      </Panel>
    </div>
  );
}
