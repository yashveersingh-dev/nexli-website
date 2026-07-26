import { useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { PurposesTab } from './PurposesTab';
import { RecordsTab } from './RecordsTab';
import { ErasureTab } from './ErasureTab';
import { BreachTab } from './BreachTab';

type TabId = 'purposes' | 'records' | 'erasure' | 'breach';
const TAB_IDS: TabId[] = ['purposes', 'records', 'erasure', 'breach'];

/** Privacy & Consent (DPDP) hub — purpose catalogue + per-student consent records. */
export function ConsentHub() {
  const { can } = useSession();
  const canRead = can('consent.read');
  // Tab is URL-driven so consent-gate CTAs (e.g. `/consent?tab=records&student=…`)
  // can deep-link straight to the per-student record flow.
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as TabId | null;
  const tab: TabId = rawTab && TAB_IDS.includes(rawTab) ? rawTab : 'purposes';
  const setTab = (id: TabId) => {
    const next = new URLSearchParams(params);
    if (id === 'purposes') next.delete('tab');
    else next.set('tab', id);
    if (id !== 'records') next.delete('student'); // the student hint only applies to records
    setParams(next, { replace: true });
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Privacy &amp; Consent</h1>
          <p className="nx-page__sub">DPDP-aligned consent for processing student &amp; guardian personal data.</p>
        </div>
      </div>

      <div className="cns-note" role="note">
        <Icon name="shield-check" size={16} />
        <span>
          <strong>Purpose limitation.</strong> Collect consent only for clearly stated purposes, and process data
          solely for those. Guardians have the <strong>right to withdraw</strong> consent at any time.
        </span>
      </div>

      {!canRead ? (
        <Panel>
          <EmptyState icon="lock" title="Restricted" message="You do not have access to privacy &amp; consent records." />
        </Panel>
      ) : (
        <Tabs
          variant="line"
          aria-label="Consent sections"
          value={tab}
          onChange={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'purposes', label: 'Purposes', icon: 'shield-check' },
            { id: 'records', label: 'Consent records', icon: 'users' },
            { id: 'erasure', label: 'Erasure requests', icon: 'minus-circle' },
            { id: 'breach', label: 'Breach register', icon: 'alert-triangle' },
          ]}
        >
          {(active) => (
            <>
              {active === 'purposes' && <PurposesTab />}
              {active === 'records' && <RecordsTab />}
              {active === 'erasure' && <ErasureTab />}
              {active === 'breach' && <BreachTab />}
            </>
          )}
        </Tabs>
      )}
    </div>
  );
}
