import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { GeneralTab } from './GeneralTab';
import { FeatureFlagsTab } from './FeatureFlagsTab';

/** Super Admin → Platform Settings + Feature Flags (spec §12.4). Single tabbed page. */
export function SettingsPage() {
  const [tab, setTab] = useState('general');

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Platform Settings</h1>
          <p className="nx-page__sub">
            Global configuration and feature flags for every school on NEXLI.
          </p>
        </div>
      </div>

      <Tabs
        aria-label="Platform settings"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'general', label: 'General', icon: 'settings' },
          { id: 'flags', label: 'Feature Flags', icon: 'shield-check' },
        ]}
      >
        {(active) => (active === 'general' ? <GeneralTab /> : <FeatureFlagsTab />)}
      </Tabs>
    </div>
  );
}
