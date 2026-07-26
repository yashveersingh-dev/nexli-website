import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Indian number grouping: last 3 digits, then groups of 2 (e.g. 12,34,567).
 * Ported from the reference script.js formatIndian().
 */
export function formatIndian(value: number, decimals = 0): string {
  const fixed = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  const [intPart, decPart] = fixed.split('.');
  let out: string;
  if (intPart.length <= 3) {
    out = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    out = `${rest},${last3}`;
  }
  return decPart ? `${out}.${decPart}` : out;
}

/** ₹ amount with Indian grouping. */
export function formatINR(value: number, decimals = 0): string {
  return `₹${formatIndian(value, decimals)}`;
}

/** Compact Indian money: 1.2Cr / 48.5L / 12.3K. */
export function formatINRCompact(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value}`;
}

/** Standard (US) grouping for non-currency counts. */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(value: Date | string | number, fmt = 'DD MMM YYYY'): string {
  return dayjs(value).format(fmt);
}

export function formatRelative(value: Date | string | number): string {
  return dayjs(value).fromNow();
}

/** Up to two initials from a name (for avatar fallbacks). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
