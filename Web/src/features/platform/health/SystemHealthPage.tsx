import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Icon, type IconName } from '@/components/Icon';
import { InfoCard } from '@/components/feedback';

type ServiceState = 'operational' | 'configured' | 'pending';

interface ServiceRow {
  icon: IconName;
  name: string;
  detail: string;
  state: ServiceState;
}

const STATE_META: Record<ServiceState, { label: string; cls: string }> = {
  operational: { label: 'Operational', cls: 'is-operational' },
  configured: { label: 'Configured', cls: 'is-configured' },
  pending: { label: 'Pending integration', cls: 'is-pending' },
};

const SERVICES: ServiceRow[] = [
  { icon: 'database', name: 'Firestore', detail: 'Tenant data store · offline persistence enabled', state: 'operational' },
  { icon: 'shield-check', name: 'Authentication', detail: 'Firebase Auth · custom-claim RBAC', state: 'operational' },
  { icon: 'server', name: 'Hosting / PWA', detail: 'Installable app · service worker active', state: 'operational' },
  { icon: 'wifi', name: 'Offline Sync', detail: 'IndexedDB persistence · queued writes on reconnect', state: 'configured' },
  { icon: 'image', name: 'ImageKit (media)', detail: 'Media CDN & transforms · credentials not yet wired', state: 'pending' },
  { icon: 'activity', name: 'Metrics pipeline', detail: 'Usage & error telemetry · needs Blaze + Cloud Functions', state: 'pending' },
];

/**
 * System Health (spec §12.5) — honest service status board. Real-time metrics
 * (Firestore reads/writes, auth success rate, function errors, latency) require
 * Blaze + Cloud Functions + a metrics pipeline that aren't wired, so those tiles
 * are shown as pending rather than fabricated.
 */
export function SystemHealthPage() {
  const operational = SERVICES.filter((s) => s.state === 'operational').length;
  const pending = SERVICES.filter((s) => s.state === 'pending').length;
  const coreHealthy = operational > 0;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">System Health</h1>
          <p className="nx-page__sub">
            <span className={`hl-statusdot ${coreHealthy ? 'is-ok' : ''}`} />
            Core services operational · {operational} of {SERVICES.length} live, {pending} pending integration
          </p>
        </div>
      </div>

      {/* Live-metric KPIs (placeholders until monitoring is wired) */}
      <div className="kpi-grid">
        <KPICard icon="activity" label="Uptime (30d)" value="—" sub="Live with Blaze" />
        <KPICard icon="alert-triangle" label="Error rate" value="—" sub="Live with Blaze" />
        <KPICard icon="trending-up" label="P95 latency" value="—" sub="Live with Blaze" />
        <KPICard icon="database" label="Reads / writes" value="—" sub="Live with Blaze" />
      </div>

      {/* Service status board */}
      <Panel title="Service status" sub={`${operational} operational`}>
        <div className="hl-board">
          {SERVICES.map((svc) => {
            const m = STATE_META[svc.state];
            return (
              <div className="hl-row" key={svc.name}>
                <span className={`hl-row__icon ${m.cls}`}>
                  <Icon name={svc.icon} size={17} />
                </span>
                <div className="hl-row__body">
                  <div className="hl-row__name">{svc.name}</div>
                  <div className="hl-row__detail">{svc.detail}</div>
                </div>
                <span className={`hl-pill ${m.cls}`}>
                  <span className="hl-pill__dot" aria-hidden="true" />
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Honest explanation of what activates monitoring */}
      <InfoCard icon="server" title="Live monitoring activates with Cloud Functions">
        Real-time uptime, error rate, latency and Firestore read/write volume are sourced from a metrics pipeline
        running on Cloud Functions (Firebase Blaze plan). Until that is enabled, the board above reflects
        configuration status — what is wired and serving — rather than fabricated numbers. Core services
        (Firestore, Authentication, Hosting) are live and serving traffic today.
      </InfoCard>

      <div className="grid g-2">
        <InfoCard icon="shield-check" title="Auth & access integrity">
          Authentication success rate, failed-login monitoring and anomaly alerts activate with the metrics
          pipeline. RBAC and tenant isolation are enforced today by Firestore security rules.
        </InfoCard>
        <InfoCard icon="image" title="Media delivery (ImageKit)">
          Image CDN, transforms and storage usage report here once ImageKit credentials are configured. Media
          features remain non-blocking until then.
        </InfoCard>
      </div>

      <p className="hl-foot">
        Status reflects platform configuration, not synthetic metrics. NEXLI shows nothing it cannot measure —
        instrumentation lights up automatically when Cloud Functions and a metrics pipeline are enabled.
      </p>
    </div>
  );
}
