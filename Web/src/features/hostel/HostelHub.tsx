import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { BlocksRoomsTab } from './BlocksRoomsTab';
import { AllocationsTab } from './AllocationsTab';
import { RollcallTab } from './RollcallTab';
import { ExeatTab } from './ExeatTab';
import { GatePassTab } from './GatePassTab';
import { MessTab } from './MessTab';
import { IncidentTab } from './IncidentTab';

type TabId = 'blocks' | 'allocations' | 'rollcall' | 'gatepass' | 'exeat' | 'mess' | 'care';

/** Hostel & residential hub: blocks/rooms, allocations, rollcall and exeat passes. */
export function HostelHub() {
  const { canOperate, isReviewer, ownerLabel } = useOwnership('hostel');
  const [tab, setTab] = useState<TabId>('blocks');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Hostel &amp; Residential</h1>
          <p className="nx-page__sub">Blocks &amp; rooms, bed allocations, rollcall and exeat passes — boarder safety end to end.</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs variant="line" aria-label="Hostel sections" value={tab} onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'blocks', label: 'Blocks & rooms', icon: 'building' },
          { id: 'allocations', label: 'Allocations', icon: 'users' },
          { id: 'rollcall', label: 'Roll-call', icon: 'shield-check' },
          { id: 'gatepass', label: 'Gate pass / leave', icon: 'external-link' },
          { id: 'exeat', label: 'Exeat passes', icon: 'calendar' },
          { id: 'mess', label: 'Mess & dietary', icon: 'utensils' },
          { id: 'care', label: 'Incidents & care', icon: 'heart-pulse' },
        ]}>
        {(active) => (
          <>
            {active === 'blocks' && <BlocksRoomsTab />}
            {active === 'allocations' && <AllocationsTab />}
            {active === 'rollcall' && <RollcallTab />}
            {active === 'gatepass' && <GatePassTab />}
            {active === 'exeat' && <ExeatTab />}
            {active === 'mess' && <MessTab />}
            {active === 'care' && <IncidentTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
