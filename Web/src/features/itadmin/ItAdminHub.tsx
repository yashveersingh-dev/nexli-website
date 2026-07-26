import { useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useSession } from '@/app/providers/SessionProvider';
import { OverviewTab } from './OverviewTab';
import { DevicesTab } from './DevicesTab';
import { TicketsTab } from './TicketsTab';
import { SystemTab } from './SystemTab';
import { SecurityTab } from './SecurityTab';

type TabId = 'overview' | 'devices' | 'tickets' | 'system' | 'security';
const TAB_IDS: TabId[] = ['overview', 'devices', 'tickets', 'system', 'security'];

/**
 * School IT Administration hub (ROLE_AUDIT §7b). Tabbed: Overview · Devices &
 * Labs · Support Tickets · System & Integrations · Security & Audit.
 *
 * Module gate: `settings.manage` (it_admin + leadership hold it). `canManage`
 * gates owner-only writes. Anyone reaching the page can still raise a ticket.
 * Least-privilege: no student marks, fee amounts or payroll figures are read.
 */
export function ItAdminHub() {
  const { can } = useSession();
  const canView = can('settings.manage');
  // Leadership holds settings.manage too; surface a review note for non-it_admin holders.
  const { isReviewer, canOperate, ownerLabel } = useReviewState();
  // Owner-only WRITES are gated on operating ownership (it_admin / super admin),
  // not the raw view permission — leadership reviews & audits but does not operate.
  const canManage = canOperate;

  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as TabId | null;
  const active: TabId = raw && TAB_IDS.includes(raw) ? raw : 'overview';
  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === 'overview') next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  };

  if (!canView) {
    return (
      <div className="nx-page">
        <Panel><EmptyState icon="lock" title="No access" message="You don't have permission to view IT Administration." /></Panel>
      </div>
    );
  }

  return (
    <div className="nx-page ita">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">IT Administration</h1>
          <p className="nx-page__sub">Devices, the helpdesk, system config and security — IT administers the system, not the business data.</p>
        </div>
      </div>

      {isReviewer && !canOperate && (
        <ReviewModeNote owner={ownerLabel}>
          Review mode — IT systems here are operated by the <strong>{ownerLabel}</strong>. You can review and audit.
        </ReviewModeNote>
      )}

      <Tabs
        variant="line"
        aria-label="IT Administration sections"
        value={active}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'dashboard' },
          { id: 'devices', label: 'Devices & Labs', icon: 'server' },
          { id: 'tickets', label: 'Support Tickets', icon: 'help-circle' },
          { id: 'system', label: 'System & Integrations', icon: 'database' },
          { id: 'security', label: 'Security & Audit', icon: 'shield-check' },
        ]}
      >
        {(tab) => (
          <>
            {tab === 'overview' && <OverviewTab />}
            {tab === 'devices' && <DevicesTab canManage={canManage} />}
            {tab === 'tickets' && <TicketsTab canManage={canManage} />}
            {tab === 'system' && <SystemTab canManage={canManage} />}
            {tab === 'security' && <SecurityTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}

/**
 * IT-admin is the operating owner; leadership (who also hold `settings.manage`)
 * are reviewers. We infer review-vs-operate from the role rather than the
 * ownership registry (IT-admin isn't wired into `useOwnership`'s module map).
 */
function useReviewState() {
  const { role, secondaryRole, isSuperAdmin } = useSession();
  const isItAdmin = role === 'it_admin' || secondaryRole === 'it_admin';
  const canOperate = isItAdmin || isSuperAdmin;
  return {
    canOperate,
    isReviewer: !canOperate,
    ownerLabel: 'IT Administrator',
  };
}
