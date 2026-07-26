import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useVehicles, useRoutes } from '@/features/ops/data';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_OPTIONS } from '@/features/ops/meta';
import type { Vehicle, TransportRoute } from '@/types/ops';
import { vehicleDocs, worstDocLevel, type DocExpiryLevel } from './docExpiry';

const DOC_BADGE: Record<DocExpiryLevel, { variant: 'danger' | 'warning'; label: (days: number | null) => string } | null> = {
  ok: null,
  expiring: { variant: 'warning', label: (d) => (d === 0 ? 'Expires today' : `${d}d left`) },
  expired: { variant: 'danger', label: (d) => (d === -1 ? 'Expired 1d ago' : `Expired ${Math.abs(d ?? 0)}d ago`) },
};

const typeLabel = (v: Vehicle) => VEHICLE_TYPE_OPTIONS.find((o) => o.value === v.type)?.label ?? v.type;

/** Find the route a vehicle is assigned to (route → vehicle link via id, fallback reg no). */
function routeForVehicle(v: Vehicle, routes: TransportRoute[]): TransportRoute | undefined {
  return (
    routes.find((r) => r.vehicleId && r.vehicleId === v.id) ??
    routes.find((r) => r.vehicleRegNo && r.vehicleRegNo.toUpperCase() === v.regNo.toUpperCase())
  );
}

interface FleetTabProps {
  /** Switch the parent TransportHub to the Live map tab. */
  onSwitchToMap: () => void;
}

/**
 * Fleet overview — the primary first experience of the Transport module. Shows a
 * read-only bus card per vehicle with its associated route, opening a detail
 * modal (vehicle, driver/conductor, route stops, compliance) on demand. Create /
 * edit / delete lives on the separate "Vehicles" management tab.
 */
export function FleetTab({ onSwitchToMap }: FleetTabProps) {
  const { schoolId } = useSession();
  const { data: vehicles, loading: vLoading, error: vError } = useVehicles(schoolId);
  const { data: routes, loading: rLoading } = useRoutes(schoolId);

  const [selected, setSelected] = useState<Vehicle | null>(null);

  const rows = useMemo(() => vehicles.slice().sort((a, b) => a.regNo.localeCompare(b.regNo)), [vehicles]);
  const selectedRoute = useMemo(
    () => (selected ? routeForVehicle(selected, routes) : undefined),
    [selected, routes],
  );

  // Routes load alongside vehicles; keep skeleton up until both are in so route
  // chips don't flash "No route assigned" before routes arrive.
  const loading = vLoading || rLoading;

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>
          Your buses at a glance — driver, conductor and assigned route. Open a card for full details.
        </p>
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : vError ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load fleet" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="bus" title="No vehicles yet" message="Buses added under the Vehicles tab will appear here as fleet cards." /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((v) => (
            <FleetCard
              key={v.id}
              vehicle={v}
              route={routeForVehicle(v, routes)}
              onOpen={() => setSelected(v)}
              onLiveMap={onSwitchToMap}
            />
          ))}
        </div>
      )}

      <VehicleDetailModal
        vehicle={selected}
        route={selectedRoute}
        onClose={() => setSelected(null)}
        onLiveMap={() => { setSelected(null); onSwitchToMap(); }}
      />
    </div>
  );
}

function FleetCard({
  vehicle: v,
  route,
  onOpen,
  onLiveMap,
}: {
  vehicle: Vehicle;
  route?: TransportRoute;
  onOpen: () => void;
  onLiveMap: () => void;
}) {
  const sm = VEHICLE_STATUS_META[v.status];
  const worst = worstDocLevel(v);
  return (
    <Panel>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span className="ops-bus-marker" style={{ width: 34, height: 34, fontSize: 16, flexShrink: 0 }} aria-hidden="true">🚌</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.02em', fontSize: 15 }}>{v.regNo}</span>
            <Badge variant={sm.variant}>{sm.label}</Badge>
            {worst !== 'ok' && (
              <Badge variant={worst === 'expired' ? 'danger' : 'warning'}>
                {worst === 'expired' ? 'Docs expired' : 'Docs expiring'}
              </Badge>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            {typeLabel(v)}{v.model ? ` · ${v.model}` : ''} · {v.capacity} seats
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
        <CrewLine icon="user" label="Driver" name={v.driverName} />
        <CrewLine icon="user" label="Conductor" name={v.conductorName} />
        <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Icon name="map-pin" size={13} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {route ? (
            <span className="tr-route-chip">
              {route.name}{route.code ? ` · ${route.code}` : ''}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No route assigned</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Button variant="subtle" size="sm" leftIcon="eye" onClick={onOpen}>View details</Button>
        <Button variant="ghost" size="sm" leftIcon="map-pin" onClick={onLiveMap}>Live map</Button>
      </div>
    </Panel>
  );
}

function CrewLine({ icon, label, name }: { icon: 'user'; label: string; name?: string }) {
  return (
    <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Icon name={icon} size={13} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      {name ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
    </div>
  );
}

function VehicleDetailModal({
  vehicle: v,
  route,
  onClose,
  onLiveMap,
}: {
  vehicle: Vehicle | null;
  route?: TransportRoute;
  onClose: () => void;
  onLiveMap: () => void;
}) {
  // Keep last selected vehicle around for the exit transition.
  const sm = v ? VEHICLE_STATUS_META[v.status] : null;
  const docs = v ? vehicleDocs(v).filter((d) => d.at != null) : [];
  const stops = route?.stops?.slice().sort((a, b) => a.order - b.order) ?? [];

  return (
    <Modal
      open={!!v}
      onClose={onClose}
      icon="bus"
      tone="gold"
      title={v?.regNo ?? 'Vehicle'}
      description={v ? `${typeLabel(v)}${v.model ? ` · ${v.model}` : ''} · ${v.capacity} seats` : undefined}
      size="lg"
      footer={<>
        <Button variant="gold" leftIcon="map-pin" onClick={onLiveMap}>View live map</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </>}
    >
      {v && sm && (
        <>
          <section style={{ marginBottom: 18 }}>
            <h3 className="nx-section__title" style={{ marginBottom: 10 }}>Vehicle</h3>
            <div className="fin-kv-list" style={{ gap: 8 }}>
              <KV label="Status" value={<Badge variant={sm.variant}>{sm.label}</Badge>} />
              <KV label="Type" value={typeLabel(v)} />
              {v.model && <KV label="Model" value={v.model} />}
              <KV label="Capacity" value={`${v.capacity} seats`} />
              <KV label="GPS device" value={v.gpsDeviceId || '—'} />
            </div>
          </section>

          <section style={{ marginBottom: 18 }}>
            <h3 className="nx-section__title" style={{ marginBottom: 10 }}>Driver &amp; conductor</h3>
            <div className="fin-kv-list" style={{ gap: 8 }}>
              <KV label="Driver" value={crew(v.driverName, v.driverPhone)} />
              <KV label="Conductor" value={crew(v.conductorName, v.conductorPhone)} />
            </div>
          </section>

          <section style={{ marginBottom: 18 }}>
            <h3 className="nx-section__title" style={{ marginBottom: 10 }}>Route</h3>
            {route ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: stops.length ? 10 : 0 }}>
                  <span style={{ fontWeight: 600 }}>{route.name}</span>
                  {route.code && <span style={{ fontSize: 11.5, color: 'var(--gold)', letterSpacing: '0.04em' }}>{route.code}</span>}
                </div>
                {stops.length > 0 ? (
                  <div className="tr-stopchips">
                    {stops.map((s, i) => (
                      <span className="tr-stopchip" key={`${s.name}-${i}`}>
                        <Icon name="map-pin" size={11} aria-hidden="true" />
                        {s.name}{s.time ? ` · ${s.time}` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>No stops added to this route yet.</p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>No route assigned to this vehicle.</p>
            )}
          </section>

          <section>
            <h3 className="nx-section__title" style={{ marginBottom: 10 }}>Compliance documents</h3>
            {docs.length > 0 ? (
              <div className="fin-kv-list" style={{ gap: 8 }}>
                {docs.map((d) => {
                  const b = DOC_BADGE[d.level];
                  return (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)' }}>{d.label}</span>
                      <span>{formatDate(d.at as number)}</span>
                      {b && <Badge variant={b.variant}>{b.label(d.days)}</Badge>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>No compliance dates recorded.</p>
            )}
          </section>
        </>
      )}
    </Modal>
  );
}

function crew(name?: string, phone?: string) {
  if (!name && !phone) return '—';
  return `${name ?? 'Unnamed'}${phone ? ` · ${phone}` : ''}`;
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}
