import { Panel } from '@/components/Panel';
import { Icon, type IconName } from '@/components/Icon';
import { AILockedOverlay } from '@/components/AILockedOverlay';
import { useFlag } from '@/app/providers/SessionProvider';

interface Insight { icon: IconName; title: string; body: string; tone?: 'gold' | 'danger' | 'info' }

/**
 * A fully-built AI insights surface, shown under the AILockedOverlay veil
 * (provider-less per the AI strategy). Only rendered when a school has the `ai`
 * feature flag on; the real UI is built so flipping a provider on reveals it.
 */
export function AiInsightsPanel({ title = 'AI insights', insights }: { title?: string; insights: Insight[] }) {
  if (!useFlag('ai')) return null;
  return (
    <Panel title={title} headerRight={<span className="nx-navtag">AI</span>}>
      <AILockedOverlay title="AI insights">
        <div className="an-ai-grid">
          {insights.map((it, i) => (
            <div key={i} className="an-risk" style={{ alignItems: 'flex-start' }}>
              <span className="nx-noticerow__icon is-normal" style={{ flexShrink: 0 }}><Icon name={it.icon} size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{it.body}</div>
              </div>
            </div>
          ))}
        </div>
      </AILockedOverlay>
    </Panel>
  );
}
