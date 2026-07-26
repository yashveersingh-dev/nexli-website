import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { ConfidentialBanner } from './components/Confidential';
import { PocsoTab } from './PocsoTab';
import { GrievancesTab } from './GrievancesTab';

type TabId = 'pocso' | 'grievances';

/** Safeguarding hub — POCSO case register + grievance redressal.
 *  POCSO cases are limited to the CPO/Alternate CPO/Principal (`pocso.read`).
 *  The grievance/complaints side is also open to the POSH/ICC committees
 *  (`grievances.read`), who must NOT see POCSO child-protection records. */
export function SafeguardingHub() {
  const { can } = useSession();
  const canPocso = can('pocso.read');
  const canGrievances = canPocso || can('grievances.read');
  const [tab, setTab] = useState<TabId>(canPocso ? 'pocso' : 'grievances');

  // Self-gate: at least one of the two confidential surfaces must be permitted.
  if (!canPocso && !canGrievances) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Safeguarding</h1>
            <p className="nx-page__sub">Child protection &amp; grievance redressal.</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="Child-protection records are limited to the Child Protection Officer."
          />
        </Panel>
      </div>
    );
  }

  // Only surface the tabs the user is permitted to open (POSH/ICC see Grievances only).
  const tabDefs = [
    ...(canPocso ? [{ id: 'pocso' as const, label: 'POCSO cases', icon: 'shield' as const }] : []),
    ...(canGrievances ? [{ id: 'grievances' as const, label: 'Grievances', icon: 'message' as const }] : []),
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Safeguarding</h1>
          <p className="nx-page__sub">
            {canPocso ? 'POCSO case register and grievance redressal — confidential.' : 'Grievance redressal — confidential.'}
          </p>
        </div>
      </div>

      <ConfidentialBanner />

      <Tabs
        variant="line"
        aria-label="Safeguarding sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={tabDefs}
      >
        {(active) => (
          <>
            {active === 'pocso' && canPocso && <PocsoTab />}
            {active === 'grievances' && canGrievances && <GrievancesTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
