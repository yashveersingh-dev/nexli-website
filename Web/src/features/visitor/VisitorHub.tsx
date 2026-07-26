import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { GateRegisterTab } from './GateRegisterTab';
import { VisitorHistoryTab } from './VisitorHistoryTab';
import { BlacklistTab } from './BlacklistTab';

type TabId = 'register' | 'history' | 'blacklist';

/** Visitor & gate management hub. */
export function VisitorHub() {
  const { canOperate, isReviewer, ownerLabel } = useOwnership('visitor');
  const [tab, setTab] = useState<TabId>('register');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Visitor &amp; Gate</h1>
          <p className="nx-page__sub">Gate register, visitor log and blacklist — with verification passes.</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs variant="line" aria-label="Visitor sections" value={tab} onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'register', label: 'Gate register', icon: 'shield-check' },
          { id: 'history', label: 'Visitor log', icon: 'users' },
          { id: 'blacklist', label: 'Blacklist', icon: 'shield' },
        ]}>
        {(active) => (
          <>
            {active === 'register' && <GateRegisterTab />}
            {active === 'history' && <VisitorHistoryTab />}
            {active === 'blacklist' && <BlacklistTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
