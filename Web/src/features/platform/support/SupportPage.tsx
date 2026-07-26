import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { EmptyState, InfoCard } from '@/components/feedback';

/**
 * Platform Support. School admins raise support requests; the Super Admin triages
 * them here and can investigate inside a school via audited impersonation (spec
 * §12.7, launched from the school detail page). The ticket queue activates when
 * the in-app support request channel is wired — until then this is an honest,
 * ready shell with the workflow explained.
 */
export function SupportPage() {
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Support</h1>
          <p className="nx-page__sub">Triage school support requests and platform incidents.</p>
        </div>
      </div>

      <div className="kpi-grid kpi-grid--4">
        <KPICard icon="message" label="Open" count={0} format="us" />
        <KPICard icon="clock" label="In progress" count={0} format="us" />
        <KPICard icon="check-circle" label="Resolved (30d)" count={0} format="us" />
        <KPICard icon="alert-triangle" label="Incidents" count={0} format="us" />
      </div>

      <Panel>
        <Tabs
          aria-label="Support queues"
          tabs={[
            { id: 'open', label: 'Open' },
            { id: 'progress', label: 'In progress' },
            { id: 'resolved', label: 'Resolved' },
          ]}
        >
          {(tab) => (
            <EmptyState
              icon="message"
              title={tab === 'open' ? 'No open tickets' : tab === 'progress' ? 'Nothing in progress' : 'No resolved tickets yet'}
              message="School support requests will appear here once the in-app support channel is live."
            />
          )}
        </Tabs>
      </Panel>

      <InfoCard icon="shield-check" title="How platform support works">
        When a school admin raises a request, it lands in this queue. To investigate inside their account you can start
        an <strong>audited impersonation</strong> session from the school's detail page — it's time-boxed to 60 minutes,
        fully logged, and never exposes medical, counseling or POCSO data.
      </InfoCard>
    </div>
  );
}
