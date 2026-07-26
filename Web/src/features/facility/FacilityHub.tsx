import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { AssetsTab } from './AssetsTab';
import { FacilitiesTab } from './FacilitiesTab';
import { MaintenanceTab } from './MaintenanceTab';

type TabId = 'assets' | 'facilities' | 'maintenance';

/** Asset & Facility management hub — register, facilities and maintenance. */
export function FacilityHub() {
  const { can } = useSession();
  const canRead = can('facility.read');
  const { canOperate, isReviewer, ownerLabel } = useOwnership('facility');
  const [tab, setTab] = useState<TabId>('assets');

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Asset &amp; Facility</h1>
          <p className="nx-page__sub">{canOperate ? 'Asset register, facilities and maintenance tickets across the campus.' : 'Asset register, facilities and maintenance — oversight view. Anyone can still raise a maintenance request.'}</p>
        </div>
      </div>

      {canRead && isReviewer && !canOperate && (
        <ReviewModeNote owner={ownerLabel}>
          Review mode — the asset register, facilities and maintenance work are managed by <strong>{ownerLabel}</strong>. You can still raise a maintenance request.
        </ReviewModeNote>
      )}

      {!canRead ? (
        <Panel><EmptyState icon="lock" title="No access" message="You don't have permission to view assets and facilities." /></Panel>
      ) : (
        <Tabs variant="line" aria-label="Asset & facility sections" value={tab} onChange={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'assets', label: 'Assets', icon: 'box' },
            { id: 'facilities', label: 'Facilities', icon: 'building' },
            { id: 'maintenance', label: 'Maintenance', icon: 'settings' },
          ]}>
          {(active) => (
            <>
              {active === 'assets' && <AssetsTab />}
              {active === 'facilities' && <FacilitiesTab />}
              {active === 'maintenance' && <MaintenanceTab />}
            </>
          )}
        </Tabs>
      )}
    </div>
  );
}
