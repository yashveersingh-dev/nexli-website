import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { CalendarTab } from './CalendarTab';
import { VaultTab } from './VaultTab';

type TabId = 'calendar' | 'vault';

/** Compliance calendar + document vault hub. */
export function ComplianceHub() {
  const [tab, setTab] = useState<TabId>('calendar');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Compliance</h1>
          <p className="nx-page__sub">Statutory deadlines and the school document vault.</p>
        </div>
      </div>

      <Tabs variant="line" aria-label="Compliance sections" value={tab} onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'calendar', label: 'Calendar', icon: 'calendar' },
          { id: 'vault', label: 'Document vault', icon: 'file-text' },
        ]}>
        {(active) => (
          <>
            {active === 'calendar' && <CalendarTab />}
            {active === 'vault' && <VaultTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
