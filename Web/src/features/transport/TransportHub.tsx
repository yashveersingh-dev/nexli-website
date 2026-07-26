import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useSosAlerts } from '@/features/ops/data';
import { FleetTab } from './FleetTab';
import { LiveMapTab } from './LiveMapTab';
import { RoutesTab } from './RoutesTab';
import { VehiclesTab } from './VehiclesTab';
import { BusAttendanceTab } from './BusAttendanceTab';
import { SosTab } from './SosTab';
import { DisruptionsTab } from './DisruptionsTab';
import { useDisruptions } from './disruptions';

type TabId = 'fleet' | 'map' | 'routes' | 'vehicles' | 'attendance' | 'disruptions' | 'sos';

/** Transport & Fleet hub: fleet overview, live map, routes, vehicles, bus attendance and SOS. */
export function TransportHub() {
  const [tab, setTab] = useState<TabId>('fleet');
  const { schoolId } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('transport');
  const { data: alerts } = useSosAlerts(schoolId);
  const activeSos = alerts.filter((a) => a.status !== 'resolved').length;
  const { data: disruptions } = useDisruptions(schoolId);
  const openDisruptions = disruptions.filter((d) => d.status === 'open').length;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Transport &amp; Fleet</h1>
          <p className="nx-page__sub">Live tracking, routes &amp; stops, vehicles, bus attendance and emergency SOS.</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs
        variant="line"
        aria-label="Transport sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'fleet', label: 'Fleet', icon: 'bus' },
          { id: 'map', label: 'Live map', icon: 'map-pin' },
          { id: 'routes', label: 'Routes', icon: 'bus' },
          { id: 'vehicles', label: 'Vehicles', icon: 'settings' },
          { id: 'attendance', label: 'Bus attendance', icon: 'users' },
          { id: 'disruptions', label: 'Disruptions', icon: 'alert-triangle', badge: openDisruptions > 0 ? openDisruptions : undefined },
          { id: 'sos', label: 'SOS', icon: 'bell', badge: activeSos > 0 ? activeSos : undefined },
        ]}
      >
        {(active) => (
          <>
            {active === 'fleet' && <FleetTab onSwitchToMap={() => setTab('map')} />}
            {active === 'map' && <LiveMapTab />}
            {active === 'routes' && <RoutesTab />}
            {active === 'vehicles' && <VehiclesTab />}
            {active === 'attendance' && <BusAttendanceTab />}
            {active === 'disruptions' && <DisruptionsTab />}
            {active === 'sos' && <SosTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
