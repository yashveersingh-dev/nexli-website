import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { AcademicAnalyticsTab } from './AcademicAnalyticsTab';
import { FinancialAnalyticsTab } from './FinancialAnalyticsTab';
import { ReportBuilderTab } from './ReportBuilderTab';
import { useSession } from '@/app/providers/SessionProvider';

type TabId = 'academic' | 'financial' | 'builder';

/** Reports & Analytics hub. */
export function ReportsHub() {
  const { can } = useSession();
  const showFinance = can('fees.read') || can('reports.read');
  const [tab, setTab] = useState<TabId>('academic');

  const tabs = [
    { id: 'academic', label: 'Academic', icon: 'bar-chart' as const },
    ...(showFinance ? [{ id: 'financial', label: 'Financial', icon: 'credit-card' as const }] : []),
    { id: 'builder', label: 'Report builder', icon: 'file-text' as const },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Reports &amp; Analytics</h1>
          <p className="nx-page__sub">Academic and financial insights, and a custom report builder.</p>
        </div>
      </div>

      <Tabs variant="line" aria-label="Analytics sections" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs}>
        {(active) => (
          <>
            {active === 'academic' && <AcademicAnalyticsTab />}
            {active === 'financial' && showFinance && <FinancialAnalyticsTab />}
            {active === 'builder' && <ReportBuilderTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
