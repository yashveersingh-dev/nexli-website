import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { OverviewTab } from './OverviewTab';
import { StudentsTab } from './StudentsTab';
import { StructuresTab } from './StructuresTab';
import { PaymentsTab } from './PaymentsTab';
import { ReconciliationTab } from './ReconciliationTab';
import { SettingsTab } from './SettingsTab';

type TabId = 'overview' | 'students' | 'structures' | 'payments' | 'reconcile' | 'settings';

/** Staff fee-management hub. */
export function FeesHub() {
  const { canOperate, isReviewer, ownerLabel } = useOwnership('fees');
  const [tab, setTab] = useState<TabId>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' as const },
    { id: 'students', label: 'Student ledger', icon: 'users' as const },
    { id: 'structures', label: 'Structures', icon: 'credit-card' as const },
    { id: 'payments', label: 'Payments', icon: 'wallet' as const },
    { id: 'reconcile', label: 'Reconciliation', icon: 'check-circle' as const },
    ...(canOperate ? [{ id: 'settings', label: 'Settings', icon: 'settings' as const }] : []),
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Fees &amp; Finance</h1>
          <p className="nx-page__sub">{canOperate ? 'Fee structures, student ledgers, collection and receipts.' : 'Fee structures, ledgers and collection — oversight view.'}</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs variant="line" aria-label="Fee management sections" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs}>
        {(active) => (
          <>
            {active === 'overview' && <OverviewTab />}
            {active === 'students' && <StudentsTab />}
            {active === 'structures' && <StructuresTab />}
            {active === 'payments' && <PaymentsTab />}
            {active === 'reconcile' && <ReconciliationTab />}
            {active === 'settings' && <SettingsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
