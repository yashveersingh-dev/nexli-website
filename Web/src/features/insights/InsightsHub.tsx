import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession, useFlag } from '@/app/providers/SessionProvider';
import { SmartBriefingTab } from './SmartBriefingTab';
import { PredictionsTab } from './PredictionsTab';
import { AssistantsTab } from './AssistantsTab';

type TabId = 'briefing' | 'predictions' | 'assistants';

/**
 * AI Insights hub. The module is nav-gated by the `ai` flag, but we also gate
 * defensively here. Every surface is fully built and rendered beneath the
 * <AILockedOverlay> veil so flipping a provider on later reveals finished UIs.
 */
export function InsightsHub() {
  const { role } = useSession();
  const aiEnabled = useFlag('ai');
  const [tab, setTab] = useState<TabId>('briefing');

  if (!aiEnabled) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">AI Insights</h1>
            <p className="nx-page__sub">Briefings, predictions and writing assistants for your school.</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            icon="sparkles"
            title="AI is not enabled for this school"
            message="The AI Insights hub is a premium add-on. Ask your Super Admin to enable the AI feature to unlock daily briefings, predictions and assistants."
          />
        </Panel>
      </div>
    );
  }

  const tabs = [
    { id: 'briefing', label: 'Smart briefing', icon: 'sparkles' as const },
    { id: 'predictions', label: 'Predictions', icon: 'trending-up' as const },
    { id: 'assistants', label: 'Assistants', icon: 'edit' as const },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">AI Insights</h1>
          <p className="nx-page__sub">
            Daily briefings, predictive flags and writing assistants — a preview of NEXLI’s AI, coming soon.
          </p>
        </div>
      </div>

      <Tabs
        variant="line"
        aria-label="AI Insights sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={tabs}
      >
        {(active) => (
          <>
            {active === 'briefing' && <SmartBriefingTab role={role} />}
            {active === 'predictions' && <PredictionsTab />}
            {active === 'assistants' && <AssistantsTab role={role} />}
          </>
        )}
      </Tabs>
    </div>
  );
}
