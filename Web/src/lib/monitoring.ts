/* =============================================================
   NEXLI — error/telemetry monitoring seam
   -------------------------------------------------------------
   A thin, dependency-free indirection for crash + message
   reporting. By default these are NO-OPs (nothing is sent
   anywhere) so the app ships clean with no third-party SDK and
   no network chatter.

   When a DSN is provided via `VITE_SENTRY_DSN`, the seams below
   are where a real provider (Sentry, etc.) would be wired in.

   NEEDS YASHVEER: to actually capture exceptions off-device you
   must (1) create a Sentry (or equivalent) account, (2) set
   `VITE_SENTRY_DSN` in the Web `.env`, and (3) install the SDK
   (`@sentry/react`) and replace the TODO blocks below with the
   real `Sentry.captureException` / `Sentry.captureMessage`
   calls + `Sentry.init({ dsn })`. The SDK is intentionally NOT
   imported here because it is not installed.
   ============================================================= */

/** Arbitrary structured context attached to a captured event. */
export type MonitoringContext = Record<string, unknown>;

type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/** The reporting DSN, if configured at build time. Empty → monitoring is a no-op. */
const DSN: string = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() ?? '';

/** True when an external monitoring backend has been configured. */
export const isMonitoringEnabled = (): boolean => DSN.length > 0;

/**
 * Report a caught exception. No-op unless `VITE_SENTRY_DSN` is set. Safe to call
 * from anywhere (error boundaries, async catch blocks) — it never throws.
 */
export function captureException(error: unknown, context?: MonitoringContext): void {
  if (!isMonitoringEnabled()) return;
  try {
    // TODO(NEEDS YASHVEER): once @sentry/react is installed + initialised, forward:
    //   Sentry.captureException(error, context ? { extra: context } : undefined);
    // Until then, surface it to the console so it isn't silently swallowed in builds
    // that opted into monitoring before the SDK landed.
    // eslint-disable-next-line no-console
    console.error('[NEXLI monitoring] captureException', error, context ?? {});
  } catch {
    /* monitoring must never break the app */
  }
}

/**
 * Report a standalone message/breadcrumb. No-op unless `VITE_SENTRY_DSN` is set.
 */
export function captureMessage(
  message: string,
  context?: MonitoringContext,
  level: Severity = 'info',
): void {
  if (!isMonitoringEnabled()) return;
  try {
    // TODO(NEEDS YASHVEER): once @sentry/react is installed + initialised, forward:
    //   Sentry.captureMessage(message, { level, extra: context });
    // eslint-disable-next-line no-console
    console.warn('[NEXLI monitoring] captureMessage', level, message, context ?? {});
  } catch {
    /* monitoring must never break the app */
  }
}
