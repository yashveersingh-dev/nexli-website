import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { MembersTab } from './MembersTab';
import { MeetingsTab } from './MeetingsTab';
import { BudgetTab } from './BudgetTab';

type TabId = 'members' | 'meetings' | 'budget';

/** School Management Committee portal — roster, meetings & budget. */
export function SmcHub() {
  const [tab, setTab] = useState<TabId>('members');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">School Management Committee</h1>
          <p className="nx-page__sub">The statutory SMC — committee roster, meetings &amp; minutes, and budget oversight.</p>
        </div>
      </div>

      <Tabs
        variant="line"
        aria-label="SMC sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'members', label: 'Members', icon: 'users' },
          { id: 'meetings', label: 'Meetings', icon: 'calendar' },
          { id: 'budget', label: 'Budget', icon: 'wallet' },
        ]}
      >
        {(active) => (
          <>
            {active === 'members' && <MembersTab />}
            {active === 'meetings' && <MeetingsTab />}
            {active === 'budget' && <BudgetTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
