import type { IconName } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { AILockedOverlay } from '@/components/AILockedOverlay';

/**
 * Predictions — dropout/at-risk, fee-default and performance forecasts.
 *
 * These models are not yet active (NEXLI has no AI provider wired — see
 * NEXLI_BUILD_PLAN.md §13A). To avoid presenting fabricated student names,
 * risk scores or numbers as if they were real, each surface shows an honest
 * "coming soon — preview" description of what it WILL compute once a model is
 * connected. No placeholder PII or invented figures are rendered. The
 * <AILockedOverlay> veil is kept for visual consistency; because the content
 * beneath it carries no fabricated data, removing the veil reveals nothing
 * misleading.
 */

interface PreviewItem {
  icon: IconName;
  title: string;
  desc: string;
}

const PREVIEWS: PreviewItem[] = [
  {
    icon: 'alert-triangle',
    title: 'Dropout / at-risk prediction',
    desc: 'Will flag students who may be at risk, combining attendance trends, grade trajectory and fee status — each with the reasons behind the score.',
  },
  {
    icon: 'wallet',
    title: 'Fee-default prediction',
    desc: 'Will estimate which families are likely to miss an upcoming due date based on their past payment behaviour, so outreach can start early.',
  },
  {
    icon: 'trending-up',
    title: 'Performance forecast',
    desc: 'Will project subject-wise grade trends for a class or student, highlighting where a re-teach or extra support would help most.',
  },
];

export function PredictionsTab() {
  return (
    <div className="in-stack">
      <Panel
        title="Predictive insights"
        sub="Preview"
        headerRight={<span className="nx-navtag">AI</span>}
      >
        <AILockedOverlay title="Predictions">
          <div className="in-preview">
            <p className="in-preview__lead">
              When a NEXLI AI model is connected, this section will turn your school&rsquo;s own
              records into early-warning predictions. It is not active yet — nothing here is a
              real or sample result.
            </p>
            <div className="in-preview__grid">
              {PREVIEWS.map((p) => (
                <div className="in-preview__card" key={p.title}>
                  <span className="in-preview__icon">
                    <Icon name={p.icon} size={18} />
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
