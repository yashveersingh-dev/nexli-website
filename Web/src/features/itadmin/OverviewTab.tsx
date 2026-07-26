import { useMemo } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { InfoCard } from '@/components/feedback';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useItAssets, useItTickets, useItBackups, useItIntegrations } from './data';
import { OPEN_TICKET_STATUSES } from './meta';

/** What IT actually administers — the surfaces, framed by least-privilege. */
const MANAGES: { icon: Parameters<typeof Icon>[0]['name']; title: string; body: string }[] = [
  { icon: 'server', title: 'Devices & labs', body: 'Computers, projectors, tablets and network gear — allocation, repair and warranty.' },
  { icon: 'help-circle', title: 'Support helpdesk', body: 'Any staff member raises a ticket; IT triages, resolves or escalates to a vendor.' },
  { icon: 'database', title: 'System & integrations', body: 'Backup log, ERP/LMS config and the CCTV / biometric / SMS integration registry.' },
  { icon: 'shield-check', title: 'Security & audit', body: 'Read the audit trail and enforce least-privilege — administering the system, not the data.' },
];

export function OverviewTab() {
  const { schoolId } = useSession();
  const { data: assets } = useItAssets(schoolId);
  const { data: tickets } = useItTickets(schoolId);
  const { data: backups } = useItBackups(schoolId);
  const { data: integrations } = useItIntegrations(schoolId);

  const stats = useMemo(() => {
    const liveDevices = assets.filter((a) => a.status !== 'retired').length;
    const openTickets = tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length;
    const lastBackup = backups.reduce<number>((max, b) => Math.max(max, b.takenAt ?? 0), 0);
    const connectedIntegrations = integrations.filter((i) => i.status === 'connected').length;
    return { liveDevices, openTickets, lastBackup, connectedIntegrations };
  }, [assets, tickets, backups, integrations]);

  return (
    <div>
      <div className="kpi-grid kpi-grid--4">
        <KPICard icon="server" label="Active devices" count={stats.liveDevices} format="us" />
        <KPICard
          icon="help-circle" label="Open tickets" count={stats.openTickets} format="us"
          subColor={stats.openTickets ? 'var(--warning)' : undefined}
          sub={stats.openTickets ? 'Awaiting IT' : 'All clear'}
        />
        <KPICard
          icon="database" label="Last backup"
          value={stats.lastBackup ? formatRelative(stats.lastBackup) : '—'}
          sub={stats.lastBackup ? undefined : 'No backup logged yet'}
          subColor={stats.lastBackup ? undefined : 'var(--warning)'}
        />
        <KPICard icon="wifi" label="Integrations live" count={stats.connectedIntegrations} format="us" sub={`${integrations.length} registered`} />
      </div>

      <Panel title="What IT Administration manages" className="ita-intro">
        <p className="ita-intro__lede">
          IT administers the <strong>system</strong>, not the business data. This hub covers accounts,
          devices, the helpdesk, system config and security — deliberately <strong>not</strong> student
          marks, fee amounts or payroll figures (least-privilege under the DPDP Act).
        </p>
        <div className="ita-manage-grid">
          {MANAGES.map((m) => (
            <div className="ita-manage" key={m.title}>
              <span className="ita-manage__icon" aria-hidden="true"><Icon name={m.icon} size={18} /></span>
              <div>
                <div className="ita-manage__title">{m.title}</div>
                <p className="ita-manage__body">{m.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <InfoCard icon="lock" title="Least-privilege by design">
        IT provisions accounts and roles only within the leadership-approved role matrix — it cannot
        self-grant access to academic, fee or payroll data. Any break-glass access would be logged and
        time-boxed.
      </InfoCard>
    </div>
  );
}
