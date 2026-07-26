import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { MenuTab } from './MenuTab';
import { HeadcountTab } from './HeadcountTab';
import { FeedbackTab } from './FeedbackTab';
import { HygieneTab } from './HygieneTab';

type TabId = 'menu' | 'headcount' | 'feedback' | 'hygiene';

/** Canteen & Nutrition hub — menu, headcount, feedback and hygiene/FSSAI. */
export function CanteenHub() {
  const { canOperate, isReviewer, ownerLabel } = useOwnership('canteen');
  const [tab, setTab] = useState<TabId>('menu');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Canteen &amp; Nutrition</h1>
          <p className="nx-page__sub">Daily menus, meal headcount, family feedback and FSSAI hygiene inspections.</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs variant="line" aria-label="Canteen sections" value={tab} onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'menu', label: 'Menu', icon: 'utensils' },
          { id: 'headcount', label: 'Headcount', icon: 'users' },
          { id: 'feedback', label: 'Feedback', icon: 'message' },
          { id: 'hygiene', label: 'Hygiene & FSSAI', icon: 'shield-check' },
        ]}>
        {(active) => (
          <>
            {active === 'menu' && <MenuTab />}
            {active === 'headcount' && <HeadcountTab />}
            {active === 'feedback' && <FeedbackTab />}
            {active === 'hygiene' && <HygieneTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
