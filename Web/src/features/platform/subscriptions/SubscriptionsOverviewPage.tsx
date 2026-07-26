import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState, Skeleton } from '@/components/feedback';
import { Input, Select } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatDate, formatINRCompact, formatRelative } from '@/lib/format';
import { usePlans, useSchools, usePlatformSettings, effectiveSubscriptionStatus, effectiveMonthlyPrice } from '@/features/platform/data';
import { SUBSCRIPTION_STATUS_META } from '@/features/platform/meta';
import { buildSubscriptionInvoiceHtml } from './invoice';
import { openPrintWindow, writePrintWindow } from './gst';
import type { Plan, School, SubscriptionStatus } from '@/types/models';

const PAGE_SIZE = 25;
const DAY = 86_400_000;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'paused', label: 'Paused' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
];

/** Monthly price for a school: a per-school custom/founding price if set, else the
 *  plan price (annual ÷ 12 when billed annually) — see `effectiveMonthlyPrice`. */
function monthlyFor(school: School, plans: Plan[]): number | null {
  return effectiveMonthlyPrice(school, plans);
}

/** Subscriptions overview (spec §12.3) — platform-wide billing snapshot. */
export function SubscriptionsOverviewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: schools, loading, error } = useSchools();
  const { data: plans } = usePlans();
  const { data: settings } = usePlatformSettings();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c = { active: 0, trial: 0, paused: 0, suspended: 0, expired: 0, terminated: 0 } as Record<SubscriptionStatus, number>;
    for (const s of schools) {
      const st = effectiveSubscriptionStatus(s);
      if (st in c) c[st] += 1;
    }
    return c;
  }, [schools]);

  const mrr = useMemo(() => {
    let total = 0;
    let known = false;
    for (const s of schools) {
      if (effectiveSubscriptionStatus(s) !== 'active') continue;
      const m = monthlyFor(s, plans);
      if (m != null) {
        total += m;
        known = true;
      }
    }
    return known ? total : null;
  }, [schools, plans]);

  const renewals = useMemo(() => {
    const now = Date.now();
    const horizon = now + 30 * DAY;
    return schools
      .filter((s) => s.renewalDate != null && s.renewalDate >= now && s.renewalDate <= horizon)
      .filter((s) => s.subscriptionStatus === 'active' || s.subscriptionStatus === 'trial')
      .sort((a, b) => (a.renewalDate ?? 0) - (b.renewalDate ?? 0));
  }, [schools]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schools
      .filter((s) => !status || effectiveSubscriptionStatus(s) === status)
      .filter(
        (s) =>
          !q ||
          s.name?.toLowerCase().includes(q) ||
          s.plan?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [schools, search, status]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Generate + print a GST tax invoice for a school's current subscription. The
  // print window is opened synchronously (within the click) so the pop-up blocker
  // treats it as user-initiated; the HTML is written immediately after.
  const generateInvoice = (school: School) => {
    const win = openPrintWindow();
    if (!win) {
      toast.error('Pop-up blocked', 'Allow pop-ups to generate the invoice.');
      return;
    }
    const html = buildSubscriptionInvoiceHtml(school, plans, Date.now(), settings?.gstSeller);
    if (!html) {
      win.close();
      toast.error('No price on file', 'Assign a plan or custom price before invoicing.');
      return;
    }
    writePrintWindow(win, html);
  };

  const columns: Column<School>[] = [
    {
      key: 'name',
      header: 'School',
      primary: true,
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={s.name ?? '?'} src={s.logoUrl} size={34} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {[s.city, s.state].filter(Boolean).join(', ') || '—'}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', render: (s) => s.plan ?? 'Unassigned' },
    {
      key: 'cycle',
      header: 'Cycle',
      render: (s) => (s.billingCycle ? s.billingCycle[0].toUpperCase() + s.billingCycle.slice(1) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const m = SUBSCRIPTION_STATUS_META[effectiveSubscriptionStatus(s)];
        return <Badge variant={m.variant}>{m.label}</Badge>;
      },
    },
    { key: 'renewal', header: 'Renewal', render: (s) => (s.renewalDate ? formatDate(s.renewalDate) : '—') },
    {
      key: 'invoice',
      header: 'Invoice',
      align: 'right',
      render: (s) => (
        <Button
          variant="subtle"
          size="sm"
          leftIcon="download"
          onClick={(e) => {
            e.stopPropagation();
            generateInvoice(s);
          }}
        >
          GST invoice
        </Button>
      ),
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Subscriptions</h1>
          <p className="nx-page__sub">
            {loading ? 'Loading…' : 'Platform-wide billing and lifecycle overview.'}
          </p>
        </div>
        <Button variant="subtle" leftIcon="settings" onClick={() => navigate('/subscriptions/seller')}>
          Seller / GST details
        </Button>
      </div>

      {loading ? (
        <div className="kpi-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={92} radius={14} />
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          <KPICard icon="check-circle" label="Active" count={counts.active} />
          <KPICard icon="clock" label="Trial" count={counts.trial} />
          <KPICard icon="clock" label="Paused" count={counts.paused} />
          <KPICard icon="shield" label="Suspended" count={counts.suspended} />
          <KPICard
            icon="wallet"
            label="Est. MRR"
            value={mrr == null ? '—' : formatINRCompact(Math.round(mrr))}
            sub={mrr == null ? 'Assign priced plans to estimate' : 'From active subscriptions'}
          />
        </div>
      )}

      <div className="grid g-2" style={{ marginTop: 16 }}>
        <Panel title="Renewals due" sub="next 30 days">
          <RenewalsList loading={loading} renewals={renewals} onOpen={(id) => navigate(`/schools/${id}`)} />
        </Panel>

        <Panel title="Snapshot">
          <Detail label="Schools on platform" value={String(schools.length)} />
          <Detail
            label="Paying (active)"
            value={String(counts.active)}
          />
          <Detail label="On trial" value={String(counts.trial)} />
          <Detail label="Renewals next 30d" value={String(renewals.length)} />
          <Detail
            label="Estimated MRR"
            value={mrr == null ? '—' : formatINRCompact(Math.round(mrr))}
          />
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(s) => s.id}
          loading={loading}
          error={error ? 'Could not load subscriptions.' : null}
          onRowClick={(s) => navigate(`/schools/${s.id}`)}
          emptyIcon="credit-card"
          emptyTitle={search || status ? 'No subscriptions match your filters' : 'No subscriptions yet'}
          emptyMessage={
            search || status
              ? 'Try a different search or clear the status filter.'
              : 'Schools and their subscriptions will appear here once onboarded.'
          }
          pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
          toolbar={
            <div className="nx-toolbar">
              <div className="nx-toolbar__search">
                <Input
                  leftIcon="search"
                  placeholder="Search by school, plan or city…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Search subscriptions"
                />
              </div>
              <div className="nx-toolbar__filter">
                <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  options={STATUS_FILTERS}
                  aria-label="Filter by status"
                />
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}

function RenewalsList({
  loading,
  renewals,
  onOpen,
}: {
  loading: boolean;
  renewals: School[];
  onOpen: (id: string) => void;
}) {
  if (loading) {
    return (
      <>
        <Skeleton height={44} />
        <Skeleton height={44} style={{ marginTop: 8 }} />
        <Skeleton height={44} style={{ marginTop: 8 }} />
      </>
    );
  }
  if (renewals.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Nothing due soon"
        message="No active or trial subscriptions renew in the next 30 days."
      />
    );
  }
  const now = Date.now();
  return (
    <div>
      {renewals.map((s) => {
        const meta = SUBSCRIPTION_STATUS_META[(s.subscriptionStatus as SubscriptionStatus) ?? 'trial'];
        const soon = (s.renewalDate ?? 0) - now <= 7 * DAY;
        return (
          <button type="button" className="nx-renewal" key={s.id} onClick={() => onOpen(s.id)}>
            <Avatar name={s.name ?? '?'} src={s.logoUrl} size={32} />
            <div className="nx-renewal__body">
              <div className="nx-renewal__name">{s.name}</div>
              <div className="nx-renewal__meta">{s.plan ?? 'Unassigned'}</div>
            </div>
            <div className="nx-renewal__right">
              <span className={`nx-renewal__date${soon ? ' is-soon' : ''}`}>
                {s.renewalDate ? formatRelative(s.renewalDate) : '—'}
              </span>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <Icon name="chevron-right" size={16} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="nx-kv">
      <span className="nx-kv__k">{label}</span>
      <span className="nx-kv__v">{value ?? '—'}</span>
    </div>
  );
}
