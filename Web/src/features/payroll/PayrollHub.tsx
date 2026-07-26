import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { EmptyState } from '@/components/feedback';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { StructuresTab } from './StructuresTab';
import { RunsTab } from './RunsTab';

type TabId = 'structures' | 'runs';

/** Staff/HR payroll hub: salary structures + monthly runs. Read-gated. */
export function PayrollHub() {
  const { can } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('payroll');
  // Leadership lands on the Runs list (overview); operators default to structures.
  const [tab, setTab] = useState<TabId>(canOperate ? 'structures' : 'runs');

  if (!can('payroll.read')) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="Not allowed" message="You don't have permission to view payroll." />
      </div>
    );
  }

  const tabs = [
    { id: 'structures', label: 'Salary structures', icon: 'wallet' as const },
    { id: 'runs', label: 'Payroll runs', icon: 'calendar' as const },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Payroll</h1>
          <p className="nx-page__sub">{canOperate ? 'Salary structures, monthly runs, payslips and statutory deductions.' : 'Salary structures and monthly runs — oversight view.'}</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs variant="line" aria-label="Payroll sections" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs}>
        {(active) => (
          <>
            {active === 'structures' && <StructuresTab />}
            {active === 'runs' && <RunsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
