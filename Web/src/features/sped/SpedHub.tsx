import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { ConfidentialNote } from './components/Confidential';
import { IepPlansTab } from './IepPlansTab';
import { TherapyLogsTab } from './TherapyLogsTab';
import { CwsnRegisterTab } from './CwsnRegisterTab';

type TabId = 'plans' | 'therapy' | 'cwsn';

/** Special Education / IEP hub — IEP plans, therapy logs, CWSN register. */
export function SpedHub() {
  const { can } = useSession();
  const [tab, setTab] = useState<TabId>('plans');

  // Self-gate: CWSN / disability records are limited to special educators.
  if (!can('iep.read')) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Special Education</h1>
            <p className="nx-page__sub">IEP plans, therapy &amp; the CWSN register.</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="IEP records are limited to special educators."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Special Education</h1>
          <p className="nx-page__sub">Individualised Education Plans, therapy logs and the CWSN register — confidential.</p>
        </div>
      </div>

      <ConfidentialNote />

      <Tabs
        variant="line"
        aria-label="Special Education sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'plans', label: 'IEP plans', icon: 'file-text' },
          { id: 'therapy', label: 'Therapy logs', icon: 'heart-pulse' },
          { id: 'cwsn', label: 'CWSN register', icon: 'users' },
        ]}
      >
        {(active) => (
          <>
            {active === 'plans' && <IepPlansTab />}
            {active === 'therapy' && <TherapyLogsTab />}
            {active === 'cwsn' && <CwsnRegisterTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
