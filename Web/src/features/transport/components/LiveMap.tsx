import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TransportRoute, VehiclePosition } from '@/types/ops';

interface MarkerPoint {
  lat: number;
  lng: number;
  label: string;
  kind: 'bus' | 'stop';
}

const busIcon = L.divIcon({ className: '', html: '<div class="ops-bus-marker">🚌</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
const stopIcon = L.divIcon({ className: '', html: '<div class="ops-stop-marker"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

// Geographic placeholder — only used when no stops or positions have coords.
// Schools may be anywhere in India; update if a school-level lat/lng is ever stored.
const FALLBACK_CENTER: [number, number] = [28.6139, 77.209];

/**
 * Imperative Leaflet/OSM map (no react-leaflet). Plots route stops (those with
 * lat/lng) and last-known vehicle positions. Uses `L.divIcon` so we never depend
 * on Leaflet's default marker images (which break under bundlers). The map is
 * created once and markers re-rendered when the data changes.
 */
export function LiveMap({ routes, positions }: { routes: TransportRoute[]; positions: VehiclePosition[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const points = useMemo<MarkerPoint[]>(() => {
    const out: MarkerPoint[] = [];
    for (const r of routes) {
      for (const s of r.stops ?? []) {
        if (typeof s.lat === 'number' && typeof s.lng === 'number') {
          out.push({ lat: s.lat, lng: s.lng, label: `${s.name}${r.name ? ` · ${r.name}` : ''}`, kind: 'stop' });
        }
      }
    }
    for (const p of positions) {
      if (typeof p.lat === 'number' && typeof p.lng === 'number') {
        out.push({ lat: p.lat, lng: p.lng, label: 'Vehicle (live)', kind: 'bus' });
      }
    }
    return out;
  }, [routes, positions]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: FALLBACK_CENTER, zoom: 12, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Leaflet needs a size invalidation after the container settles.
    const t = window.setTimeout(() => map.invalidateSize(), 50);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Re-plot markers when points change.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (points.length === 0) return;
    for (const p of points) {
      L.marker([p.lat, p.lng], { icon: p.kind === 'bus' ? busIcon : stopIcon, title: p.label })
        .bindTooltip(p.label, { direction: 'top' })
        .addTo(layer);
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [points]);

  return <div ref={containerRef} className="ops-map" role="img" aria-label="Live transport map showing route stops and vehicles" />;
}
