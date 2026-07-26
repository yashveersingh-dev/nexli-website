/* =============================================================
   NEXLI — public health-check endpoint (/healthz)
   -------------------------------------------------------------
   A deliberately tiny, UNAUTHENTICATED route for uptime monitors
   and load-balancer probes. It must NEVER touch Firebase, the
   session, or any tenant data — it only proves "the app shell is
   being served and the JS booted". Mounted in the browser router
   ABOVE the protected catch-all so it bypasses the auth gate.

   NOTE on the path: `/__health` was avoided on purpose — Vite-PWA's
   `navigateFallbackDenylist: [/^\/__/]` would stop the service
   worker from serving the SPA shell for it, and `/health` is already
   the Super Admin "System Health" screen inside the app. `/healthz`
   (the k8s convention) is unused and served by the SPA catch-all.
   ============================================================= */

/**
 * Build/version info. APP_VERSION mirrors package.json's `version`.
 * It is a plain constant (not imported from package.json) so the build
 * doesn't bundle the whole manifest — incl. devDependencies — into the
 * client. NEEDS YASHVEER: to keep this in lockstep automatically, add
 *   define: { __APP_VERSION__: JSON.stringify(pkg.version) }
 * in vite.config.ts and read __APP_VERSION__ here.
 */
const APP_VERSION = '0.1.0';

export interface HealthPayload {
  status: 'ok';
  version: string;
  /** Vite build mode ('production' | 'development'). */
  mode: string;
  /** ISO timestamp of when this probe rendered (client clock). */
  time: string;
}

/** The machine-readable payload, also reused by the JSON probe page. */
export function healthPayload(): HealthPayload {
  return {
    status: 'ok',
    version: APP_VERSION,
    mode: import.meta.env.MODE,
    time: new Date().toISOString(),
  };
}

/**
 * Renders the health payload as pre-formatted JSON. A monitor can assert on
 * the `"status": "ok"` string in the response body, or a human can eyeball it.
 * Intentionally NOT internationalised and NOT styled with the app chrome — it
 * is infrastructure, not a product surface.
 */
export function HealthCheck() {
  const payload = healthPayload();
  return (
    <main
      // data-health lets a headless monitor target the node without guessing.
      data-health="ok"
      style={{
        margin: 0,
        padding: 16,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        color: '#0a0a0a',
        background: '#ffffff',
        minHeight: '100vh',
      }}
    >
      {JSON.stringify(payload, null, 2)}
    </main>
  );
}
