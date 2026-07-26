import { useState } from 'react';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Tabs } from '@/components/Tabs';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { ExpensesTab } from './ExpensesTab';
import { RequisitionsTab } from './RequisitionsTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';
import { VendorsTab } from './VendorsTab';
import { ApprovalSettingsTab } from './ApprovalSettingsTab';
import { ExpenseFlow } from './ExpenseFlow';

type TabId = 'expenses' | 'requisitions' | 'po' | 'vendors' | 'settings';

/** Staff expense & procurement hub. */
export function ExpenseHub() {
  const { can } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('expense');
  const [tab, setTab] = useState<TabId>('expenses');

  if (!can('expense.read')) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState icon="lock" title="Not allowed" message="You don't have permission to view expenses and procurement." />
        </Panel>
      </div>
    );
  }

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: 'wallet' as const },
    { id: 'requisitions', label: 'Requisitions', icon: 'file-text' as const },
    { id: 'po', label: 'Purchase orders', icon: 'box' as const },
    { id: 'vendors', label: 'Vendors', icon: 'building' as const },
    // Approval routing is configured by Accounts/admin (operators) only.
    ...(canOperate ? [{ id: 'settings', label: 'Settings', icon: 'settings' as const }] : []),
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Expense &amp; Procurement</h1>
          <p className="nx-page__sub">{canOperate ? 'Record expenses, raise requisitions, issue purchase orders and manage vendors.' : 'Procurement oversight — you can still raise a requisition; POs, expenses and vendors are handled by Accounts.'}</p>
        </div>
      </div>

      {isReviewer && !canOperate && (
        <ReviewModeNote owner={ownerLabel}>
          Review mode — purchase orders, expenses and vendors are handled by <strong>{ownerLabel}</strong>, and you approve requisitions. You can still raise a requisition yourself.
        </ReviewModeNote>
      )}

      <ExpenseFlow />

      <Tabs variant="line" aria-label="Expense and procurement sections" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs}>
        {(active) => (
          <>
            {active === 'expenses' && <ExpensesTab />}
            {active === 'requisitions' && <RequisitionsTab />}
            {active === 'po' && <PurchaseOrdersTab />}
            {active === 'vendors' && <VendorsTab />}
            {active === 'settings' && canOperate && <ApprovalSettingsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
