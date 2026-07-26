import { useId } from 'react';

export interface RadarAxis {
  label: string;
  /** 0–max (default max 5). */
  value: number;
}

/**
 * Lightweight SVG radar/spider chart for multi-domain ratings (NEP HPC,
 * skill profiles). No deps; respects the gold accent; mobile-friendly.
 */
export function RadarChart({ axes, max = 5, size = 240, color = 'var(--gold)' }: { axes: RadarAxis[]; max?: number; size?: number; color?: string }) {
  const id = useId();
  const n = Math.max(axes.length, 3);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, radius: number) => ({ x: cx + radius * Math.cos(angleAt(i)), y: cy + radius * Math.sin(angleAt(i)) });

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = axes.map((a, i) => point(i, (Math.max(0, Math.min(max, a.value)) / max) * r));
  const dataPath = dataPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Domain radar chart" style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id={`rg-${id}`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.12" />
        </radialGradient>
      </defs>
      {rings.map((rr, ri) => (
        <polygon key={ri} points={axes.map((_, i) => { const p = point(i, r * rr); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => { const p = point(i, r); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />; })}
      <path d={dataPath} fill={`url(#rg-${id})`} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {dataPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
      {axes.map((a, i) => {
        const p = point(i, r + 16);
        const anchor = Math.abs(p.x - cx) < 6 ? 'middle' : p.x > cx ? 'start' : 'end';
        return <text key={i} x={p.x} y={p.y} dy="0.32em" textAnchor={anchor} fontSize={10.5} fill="var(--text-muted)">{a.label}</text>;
      })}
    </svg>
  );
}
