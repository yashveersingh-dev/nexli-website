import { useMemo } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useRoutes, useVehiclePositions, useVehicles } from '@/features/ops/data';
import { LiveMap } from './components/LiveMap';

const STALE_MS = 5 * 60_000; // a position older than 5 min is "stale"
const relTime = (t?: number) => {
  if (!t) return 'never';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

export function LiveMapTab() {
  const { schoolId } = useSession();
  const { data: routes, loading: rLoading } = useRoutes(schoolId);
  const { data: positions, loading: pLoading } = useVehiclePositions(schoolId);
  const { data: vehicles } = useVehicles(schoolId);

  const stops = useMemo(
    () => routes.reduce((n, r) => n + (r.stops?.filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number').length ?? 0), 0),
    [routes],
  );
  const live = useMemo(() => positions.filter((p) => p.updatedAt && Date.now() - p.updatedAt < STALE_MS), [positions]);
  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === 'active').length, [vehicles]);
  const latest = useMemo(() => positions.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)), [positions]);

  const loading = rLoading || pLoading;

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="bus" label="Live vehicles" count={live.length} format="us" subColor={live.length ? 'var(--gold)' : undefined} />
        <KPICard icon="check-circle" label="Active fleet" count={activeVehicles} format="us" />
        <KPICard icon="map-pin" label="Mapped stops" count={stops} format="us" />
      </div>

      {loading ? (
        <Skeleton height={360} />
      ) : (
        <div style={{ position: 'relative' }}>
          <LiveMap routes={routes} positions={live} />
          {live.length === 0 && (
            <div className="ops-map-overlay" role="status">
              <EmptyState
                icon="map-pin"
                title="Live tracking not active"
                message={
                  stops > 0
                    ? 'This map shows your route stops. Live vehicle tracking requires the driver GPS app, which is not yet active — once drivers share their location, their buses will appear here.'
                    : 'Live vehicle tracking requires the driver GPS app, which is not yet active. Add stops with coordinates to your routes to see them mapped here.'
                }
              />
            </div>
          )}
        </div>
      )}

      <p className="fin-noprint" style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon name="info" size={13} /> This is a route &amp; stop map. Live positions would be reported by the driver GPS app (not yet active); there is no routing or ETA here.
      </p>

      {latest.length > 0 && (
        <Panel title="Last reported" className="nx-mt-12">
          <div className="fin-kv-list" style={{ gap: 8 }}>
            {latest.slice(0, 6).map((p) => {
              const veh = vehicles.find((v) => v.id === p.vehicleId);
              const route = routes.find((r) => r.id === p.routeId);
              const stale = !p.updatedAt || Date.now() - p.updatedAt >= STALE_MS;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span className="ops-bus-marker" style={{ width: 26, height: 26, fontSize: 13, opacity: stale ? 0.5 : 1 }} aria-hidden="true">🚌</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>{veh?.regNo ?? 'Vehicle'}</span>
                    {route?.name ? <span style={{ color: 'var(--text-muted)' }}> · {route.name}</span> : null}
                  </span>
                  <span style={{ fontSize: 11.5, color: stale ? 'var(--text-muted)' : 'var(--gold)' }}>{relTime(p.updatedAt)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
