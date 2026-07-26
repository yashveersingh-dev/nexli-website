/**
 * Centralized feature-flag system (built from day one — no later refactor).
 * Flags resolve as: DEFAULT_FLAGS  ◀  global overrides (feature_flags/global)
 *   ◀  per-school overrides (schools/{id}/settings/feature_flags).
 * Super Admin manages global + per-school flags in the platform panel.
 */
export type FeatureFlagKey =
  | 'ai'
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'online_payments'
  | 'gps_tracking'
  | 'advanced_analytics'
  | 'hostel'
  | 'transport'
  | 'canteen'
  | 'library'
  | 'medical'
  | 'alumni'
  | 'smc'
  | 'push_notifications';

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  label: string;
  description: string;
  /** Default ON/OFF when no override exists. */
  defaultEnabled: boolean;
  /** Premium/paid-integration flag — OFF until provisioned. */
  premium?: boolean;
  /** Requires a paid external integration (architected, not wired yet). */
  externalIntegration?: boolean;
}

export const FEATURE_FLAGS: FeatureFlagMeta[] = [
  { key: 'ai', label: 'AI Features', description: 'AI briefings, at-risk flags, draft comments, predictions.', defaultEnabled: false, premium: true, externalIntegration: true },
  { key: 'whatsapp', label: 'WhatsApp Integration', description: 'Outbound parent notifications via WhatsApp Business API.', defaultEnabled: false, premium: true, externalIntegration: true },
  { key: 'sms', label: 'SMS Integration', description: 'OTP fallback + critical alerts via SMS provider.', defaultEnabled: false, premium: true, externalIntegration: true },
  { key: 'email', label: 'Email Delivery', description: 'Transactional email (welcome, receipts, reports).', defaultEnabled: false, externalIntegration: true },
  { key: 'online_payments', label: 'Online Payments', description: 'Payment gateway (Razorpay/UPI). Manual QR + bank until enabled.', defaultEnabled: false, premium: true, externalIntegration: true },
  { key: 'gps_tracking', label: 'GPS Tracking', description: 'Live bus tracking (free Leaflet/OSM + driver geolocation).', defaultEnabled: true },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Deep academic/financial analytics + custom report builder.', defaultEnabled: true },
  { key: 'hostel', label: 'Hostel Module', description: 'Residential management (boarding schools).', defaultEnabled: true },
  { key: 'transport', label: 'Transport Module', description: 'Routes, fleet, bus attendance.', defaultEnabled: true },
  { key: 'canteen', label: 'Canteen Module', description: 'Menu, allergens, FSSAI, headcount.', defaultEnabled: true },
  { key: 'library', label: 'Library Module', description: 'Catalog, circulation, reading programs.', defaultEnabled: true },
  { key: 'medical', label: 'Medical Module', description: 'Clinic, health records, immunization.', defaultEnabled: true },
  { key: 'alumni', label: 'Alumni Module', description: 'Alumni directory, events, career tracking.', defaultEnabled: true },
  { key: 'smc', label: 'SMC Portal', description: 'School Management Committee (govt schools).', defaultEnabled: true },
  { key: 'push_notifications', label: 'Push Notifications', description: 'Web push via FCM.', defaultEnabled: false, externalIntegration: true },
];

export type FlagMap = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FLAGS: FlagMap = FEATURE_FLAGS.reduce((acc, f) => {
  acc[f.key] = f.defaultEnabled;
  return acc;
}, {} as FlagMap);

/** Merge DEFAULT ◀ global ◀ per-school. Unknown keys ignored. */
export function resolveFlags(
  global?: Partial<FlagMap> | null,
  perSchool?: Partial<FlagMap> | null,
): FlagMap {
  const out: FlagMap = { ...DEFAULT_FLAGS };
  for (const f of FEATURE_FLAGS) {
    if (global && typeof global[f.key] === 'boolean') out[f.key] = global[f.key]!;
    if (perSchool && typeof perSchool[f.key] === 'boolean') out[f.key] = perSchool[f.key]!;
  }
  // Dev override for AI via env (kept off by default).
  if (import.meta.env.VITE_AI_ENABLED === 'true') out.ai = true;
  return out;
}
