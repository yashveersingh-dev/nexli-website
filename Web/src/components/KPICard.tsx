import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';
import { useCountUp } from '@/lib/hooks';
import { formatIndian, formatNumber, formatINR, formatINRCompact } from '@/lib/format';

export type KpiFormat = 'in' | 'us' | 'inr' | 'inrCompact' | 'percent' | 'plain';

export interface KPICardProps {
  icon: IconName;
  label: string;
  /** Numeric value → animated count-up. Use either `count` or `value`. */
  count?: number;
  value?: ReactNode;
  format?: KpiFormat;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delta?: { value: string; dir?: 'up' | 'down' | 'muted' };
  sub?: ReactNode;
  subColor?: string;
}

function fmt(v: number, f: KpiFormat, decimals: number): string {
  switch (f) {
    case 'in':
      return formatIndian(v, decimals);
    case 'us':
      return formatNumber(v);
    case 'inr':
      return formatINR(v, decimals);
    case 'inrCompact':
      return formatINRCompact(v);
    case 'percent':
      return v.toFixed(decimals);
    default:
      return decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
  }
}

/** KPI stat card with animated count-up (maps to the reference .kpi). */
export function KPICard({
  icon,
  label,
  count,
  value,
  format = 'plain',
  decimals = 0,
  prefix = '',
  suffix = '',
  delta,
  sub,
  subColor,
}: KPICardProps) {
  const { ref, value: animated } = useCountUp(count ?? 0, { decimals });
  const display = count !== undefined ? `${prefix}${fmt(animated, format, decimals)}${suffix}` : value;

  return (
    <div className="kpi">
      <div className="kpi__icon">
        <Icon name={icon} size={18} />
      </div>
      <div className="kpi__body">
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">
          <span ref={ref}>{display}</span>
        </div>
        {delta && (
          <div className={cn('kpi__delta', delta.dir === 'down' && 'neg', delta.dir === 'muted' && 'muted')}>
            {delta.dir !== 'muted' && (
              <Icon name={delta.dir === 'down' ? 'trending-down' : 'trending-up'} size={10} strokeWidth={2.5} />
            )}
            {delta.value}
          </div>
        )}
        {sub != null && (
          <div className="kpi__sub" style={subColor ? { color: subColor } : undefined}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
