import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useInView, usePrefersReducedMotion } from '@/lib/hooks';

/* ============================ Donut ============================ */
export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

export function Donut({
  segments,
  size = 170,
  stroke = 22,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const show = reduced ? true : inView;

  const r = size / 2 - stroke / 2 - 4;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;

  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const len = (seg.value / total) * circ;
    const arc = { len, color: seg.color, dashoffset: -offset, delay: i * 0.12 };
    offset += len;
    return arc;
  });

  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--chart-track)" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${show ? a.len : 0} ${circ}`}
            strokeDashoffset={a.dashoffset}
            style={{
              transition: reduced ? 'none' : 'stroke-dasharray 1.1s var(--ease)',
              transitionDelay: `${a.delay}s`,
            }}
          />
        ))}
      </svg>
      {centerValue != null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {centerValue}
          </div>
          {centerLabel != null && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

export interface DonutLegendItem {
  label: string;
  value?: ReactNode;
  color: string;
}

export function DonutLegend({ items }: { items: DonutLegendItem[] }) {
  return (
    <div className="donut__legend">
      {items.map((it, i) => (
        <div className="item" key={i}>
          <span className="dot" style={{ background: it.color }} />
          <div className="text">
            <div className="n">{it.label}</div>
          </div>
          {it.value != null && (
            <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 12 }}>{it.value}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================ Ring ============================ */
export function Ring({
  pct,
  color = 'var(--success)',
  size = 50,
  stroke = 5,
}: {
  pct: number;
  color?: string;
  size?: number;
  stroke?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const show = reduced ? true : inView;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - (show ? pct : 0) / 100);
  return (
    <div ref={ref} style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-track-strong)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          style={{ transition: reduced ? 'none' : 'stroke-dashoffset 1.1s var(--ease)' }}
        />
      </svg>
    </div>
  );
}

/* ============================ Line ============================ */
function smoothPath(coords: { x: number; y: number }[]): string {
  if (!coords.length) return '';
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const p0 = coords[i - 1];
    const p1 = coords[i];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function LineChart({
  points,
  height = 220,
  color = '#C6A55C',
  yLabels,
  xLabels,
}: {
  points: number[];
  height?: number;
  color?: string;
  yLabels?: string[];
  xLabels?: string[];
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const lineRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const gradId = useId().replace(/:/g, '');

  const W = 600;
  const H = 200;
  const max = Math.max(...points, 1);
  const stepX = W / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => ({ x: i * stepX, y: H - (p / max) * (H - 10) - 5 }));
  const pathD = smoothPath(coords);
  const last = coords[coords.length - 1] ?? { x: 0, y: H };
  const areaD = `${pathD} L ${last.x} ${H} L 0 ${H} Z`;

  useEffect(() => {
    if (lineRef.current) setLen(lineRef.current.getTotalLength());
  }, [pathD]);

  const draw = reduced ? true : inView;

  return (
    <div ref={ref} className="line-chart" style={{ height }}>
      {yLabels && (
        <div className="y-axis">
          {yLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
      <div className="plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={areaD}
            fill={`url(#${gradId})`}
            style={{ opacity: draw ? 1 : 0, transition: reduced ? 'none' : 'opacity 1.6s ease' }}
          />
          <path
            ref={lineRef}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={
              len
                ? {
                    strokeDasharray: len,
                    strokeDashoffset: draw ? 0 : len,
                    transition: reduced ? 'none' : 'stroke-dashoffset 1.6s var(--ease)',
                  }
                : undefined
            }
          />
        </svg>
      </div>
      {xLabels && (
        <div className="x-axis">
          {xLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ Bar ============================ */
export interface BarItem {
  value: number;
  color?: 'success' | 'warning' | 'danger' | 'muted';
  label?: string;
}

export function BarChart({
  bars,
  max,
  height = 170,
  axis,
}: {
  bars: BarItem[];
  max?: number;
  height?: number;
  axis?: string[];
}) {
  const top = max ?? Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="bar-chart" style={{ height }}>
      {axis && (
        <div className="axis">
          {axis.map((a, i) => (
            <span key={i}>{a}</span>
          ))}
        </div>
      )}
      <div className="bars">
        {bars.map((b, i) => (
          <div
            key={i}
            className={cn('bar', b.color)}
            style={{ height: `${Math.min((b.value / top) * 100, 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
