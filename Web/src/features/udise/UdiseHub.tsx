import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { ReportTab } from './ReportTab';
import { ProfileTab } from './ProfileTab';

type TabId = 'report' | 'profile';

/** UDISE+ reporting hub — live enrolment report + the school UDISE profile. */
export function UdiseHub() {
  const { can } = useSession();
  const canRead = can('compliance.read');
  const [tab, setTab] = useState<TabId>('report');

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">UDISE+ Reporting</h1>
          <p className="nx-page__sub">Enrolment aggregated from your records, ready for the national school data return.</p>
        </div>
      </div>

      {!canRead ? (
        <Panel>
          <EmptyState icon="lock" title="No access" message="You do not have permission to view UDISE+ reporting." />
        </Panel>
      ) : (
        <Tabs
          variant="line"
          aria-label="UDISE sections"
          value={tab}
          onChange={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'report', label: 'Report', icon: 'bar-chart' },
            { id: 'profile', label: 'School profile', icon: 'school' },
          ]}
        >
          {(active) => (
            <>
              {active === 'report' && <ReportTab />}
              {active === 'profile' && <ProfileTab />}
            </>
          )}
        </Tabs>
      )}
    </div>
  );
}
