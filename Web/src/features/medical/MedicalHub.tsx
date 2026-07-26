import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { ClinicVisitsTab } from './ClinicVisitsTab';
import { HealthRecordsTab } from './HealthRecordsTab';
import { ImmunizationsTab } from './ImmunizationsTab';

type TabId = 'visits' | 'records' | 'immunizations';

/** Medical & clinic hub — visits, health records and immunizations. Self-gated. */
export function MedicalHub() {
  const { can } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('medical');
  const [tab, setTab] = useState<TabId>('visits');

  // Defensive self-gate: the nav already requires `medical.read`, but never
  // render sensitive health data without re-checking here.
  if (!can('medical.read')) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Medical &amp; Clinic</h1>
            <p className="nx-page__sub">Student health records, clinic visits and immunizations.</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="Medical records are limited to clinic staff."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Medical &amp; Clinic</h1>
          <p className="nx-page__sub">Clinic visits, student health records and immunizations — confidential, clinic staff only.</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs
        variant="line"
        aria-label="Medical sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'visits', label: 'Clinic visits', icon: 'heart-pulse' },
          { id: 'records', label: 'Health records', icon: 'file-text' },
          { id: 'immunizations', label: 'Immunizations', icon: 'shield-check' },
        ]}
      >
        {(active) => (
          <>
            {active === 'visits' && <ClinicVisitsTab />}
            {active === 'records' && <HealthRecordsTab />}
            {active === 'immunizations' && <ImmunizationsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
