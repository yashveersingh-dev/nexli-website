import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useOwnership } from '@/app/providers/SessionProvider';
import { DirectoryTab } from './DirectoryTab';
import { MentorshipTab } from './MentorshipTab';
import { InsightsTab } from './InsightsTab';

type TabId = 'directory' | 'mentorship' | 'insights';

/**
 * Alumni hub — directory, mentorship board and career insights.
 * Module access is nav-gated on `alumni.read`; the Alumni Office (front desk /
 * coordination) *operates* (add/edit), leadership reviews (`useOwnership`).
 */
export function AlumniHub() {
  const { canOperate, isReviewer, ownerLabel } = useOwnership('alumni');
  const canWrite = canOperate;
  const [tab, setTab] = useState<TabId>('directory');

  const tabs = [
    { id: 'directory', label: 'Directory', icon: 'users' as const },
    { id: 'mentorship', label: 'Mentorship', icon: 'sparkles' as const },
    { id: 'insights', label: 'Insights', icon: 'bar-chart' as const },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Alumni</h1>
          <p className="nx-page__sub">A living network of former students — directory, mentorship and career insights.</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs variant="line" aria-label="Alumni sections" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs}>
        {(active) => (
          <>
            {active === 'directory' && <DirectoryTab canWrite={canWrite} />}
            {active === 'mentorship' && <MentorshipTab />}
            {active === 'insights' && <InsightsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
