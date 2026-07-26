import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { RteEnrolledTab } from './RteEnrolledTab';
import { ApplicationsTab } from './ApplicationsTab';
import { ClaimsTab } from './ClaimsTab';

type TabId = 'enrolled' | 'applications' | 'claims';

/** RTE quota (applications + lottery) and state reimbursement claims hub. */
export function RteHub() {
  const [tab, setTab] = useState<TabId>('enrolled');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">RTE quota &amp; reimbursement</h1>
          <p className="nx-page__sub">Manage the 25% RTE / EWS quota lottery and state reimbursement claims.</p>
        </div>
      </div>

      <Tabs
        variant="line"
        aria-label="RTE sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'enrolled', label: 'Quota enrolment', icon: 'users' },
          { id: 'applications', label: 'Applications', icon: 'award' },
          { id: 'claims', label: 'Reimbursement claims', icon: 'wallet' },
        ]}
      >
        {(active) => (
          <>
            {active === 'enrolled' && <RteEnrolledTab />}
            {active === 'applications' && <ApplicationsTab />}
            {active === 'claims' && <ClaimsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
