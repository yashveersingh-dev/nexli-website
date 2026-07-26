import {
  Panel,
  KPICard,
  Badge,
  Icon,
  AILockedOverlay,
  Donut,
  DonutLegend,
  Button,
} from '@/components';

/**
 * Temporary on-brand foundation page (P0 smoke test) — now exercising the
 * NEXLI UI Kit (KPI count-up, donut, panels, AI overlay) to verify it composes.
 * Replaced by the real shells + role dashboards from P1 onward.
 */
export function FoundationPage() {
  return (
    <div
      style={{
        minHeight: '100svh',
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(198,165,92,0.08), transparent 60%), var(--bg)',
      }}
      className="px-5 py-12"
    >
      <div className="mx-auto w-full" style={{ maxWidth: 1080 }}>
        {/* Brand lockup */}
        <div className="flex items-center justify-center gap-3">
          <div className="sb-logo__mark" style={{ width: 46, height: 46 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
              <path d="M3 7 L12 12 L21 7" />
              <path d="M12 12 L12 22" />
            </svg>
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text)' }}>NEXLI</div>
            <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.3em', color: 'var(--gold)' }}>
              SCHOOL OPERATING SYSTEM
            </div>
          </div>
        </div>

        <h1 className="mt-9 text-center" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)' }}>
          Foundation ready.
        </h1>
        <p className="mt-3 text-center" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          The Obsidian · Gold · Ivory design system and the NEXLI UI Kit are live. Building the platform next.
        </p>

        {/* KPI kit (animated count-up) */}
        <div className="kpi-grid mt-8">
          <KPICard icon="school" label="Schools (demo)" count={286} format="us" delta={{ value: '12 this month', dir: 'up' }} />
          <KPICard icon="users" label="Students (demo)" count={128347} format="us" delta={{ value: '4,532 this month', dir: 'up' }} />
          <KPICard icon="wallet" label="Revenue (demo)" count={14875320} format="inrCompact" delta={{ value: '18.6%', dir: 'up' }} />
          <KPICard icon="activity" label="Uptime (demo)" count={99.98} format="percent" decimals={2} suffix="%" sub="All systems operational" subColor="var(--gold)" />
        </div>

        {/* Charts + AI overlay */}
        <div className="grid g-2 mt-4">
          <Panel title="Attendance Overview" sub="(demo)" headerRight={<Badge variant="success">Live kit</Badge>}>
            <div className="donut-wrap">
              <Donut
                segments={[
                  { value: 1182, color: '#22C55E' },
                  { value: 52, color: '#EF4444' },
                  { value: 14, color: '#F59E0B' },
                ]}
                centerValue="94.6%"
                centerLabel="Present"
              />
              <DonutLegend
                items={[
                  { label: 'Present', value: '1,182', color: '#22C55E' },
                  { label: 'Absent', value: '52', color: '#EF4444' },
                  { label: 'On Leave', value: '14', color: '#F59E0B' },
                ]}
              />
            </div>
          </Panel>

          <Panel title="AI Insights" sub="(preview)">
            <AILockedOverlay title="Morning Briefing">
              <div className="list-tile">
                <div className="tile">
                  <div className="tile__icon event">
                    <Icon name="sparkles" size={16} />
                  </div>
                  <div className="tile__body">
                    <div className="tile__title">3 students at academic risk this week</div>
                    <div className="tile__sub">Attendance + grade trend</div>
                  </div>
                </div>
                <div className="tile">
                  <div className="tile__icon transport">
                    <Icon name="trending-down" size={16} />
                  </div>
                  <div className="tile__body">
                    <div className="tile__title">Fee defaulter risk: 8 families</div>
                    <div className="tile__sub">Predicted before due date</div>
                  </div>
                </div>
              </div>
            </AILockedOverlay>
          </Panel>
        </div>

        {/* P0 checklist */}
        <Panel className="mt-4" title="P0 — Foundation" sub="in progress" headerRight={<Badge variant="success">on track</Badge>}>
          <Check done text="React + TypeScript + Vite scaffold (installable PWA) — builds green" />
          <Check done text="NEXLI tokens mapped into the Tailwind v4 theme" />
          <Check done text="Reference design system ported verbatim (nexli.css)" />
          <Check done text="Firebase initialized with offline persistence" />
          <Check done text="UI Kit: Icon, Avatar, Badge, Button, Panel, KPICard, charts, AI overlay, feedback" />
          <Check done text="App shells (sidebar / drawer / bottom-nav / topbar) + nav manifest" />
          <Check done text="DataTable (responsive table→cards), form kit, overlays (modal/sheet/toast/tabs), i18n" />
        </Panel>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="gold" rightIcon="arrow-right">
            Continue build
          </Button>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>NEXLI · © 2026</span>
        </div>
      </div>
    </div>
  );
}

function Check({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          background: done ? 'var(--success-bg)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${done ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
        }}
      >
        {done ? (
          <Icon name="check" size={10} strokeWidth={3} style={{ color: 'var(--success)' }} />
        ) : (
          <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--text-dim)' }} />
        )}
      </span>
      <span style={{ fontSize: 13, color: done ? 'var(--text)' : 'var(--text-muted)' }}>{text}</span>
    </div>
  );
}
