import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import { Modal } from '@/components/Modal';
import { Field, Input } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { formatDate, formatNumber, formatRelative, formatINR } from '@/lib/format';
import { useSchool, useActivityFeed, effectiveSubscriptionStatus, setSchoolCustomPrice } from '@/features/platform/data';
import { SUBSCRIPTION_STATUS_META } from '@/features/platform/meta';
import { SubscriptionActionModal } from './SubscriptionActionModal';
import { ManageAdminPanel } from './ManageAdminPanel';
import type { School, SubscriptionAction, SubscriptionStatus } from '@/types/models';

/** Actions available from a given (effective) subscription status. */
function availableActions(status: SubscriptionStatus | undefined): SubscriptionAction[] {
  switch (status) {
    case 'active':
      return ['renew', 'pause', 'suspend', 'terminate'];
    case 'trial':
      return ['activate', 'suspend', 'expire', 'terminate'];
    case 'paused':
      return ['resume', 'suspend', 'terminate'];
    case 'suspended':
      return ['resume', 'terminate'];
    case 'expired':
      return ['renew', 'activate', 'suspend', 'terminate'];
    case 'terminated':
      return ['activate'];
    default:
      return ['activate'];
  }
}

export function SchoolDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: school, loading } = useSchool(id);
  const [action, setAction] = useState<SubscriptionAction | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);

  if (loading) return <DetailSkeleton />;
  if (!school) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="school"
          title="School not found"
          message="This school may have been removed."
          action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/schools')}>Back to schools</Button>}
        />
      </div>
    );
  }

  const effStatus = effectiveSubscriptionStatus(school);
  const statusMeta = SUBSCRIPTION_STATUS_META[effStatus];

  return (
    <div className="nx-page">
      <div className="nx-detail__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/schools')} aria-label="Back to schools">
          <Icon name="chevron-left" size={18} />
        </button>
        <Avatar name={school.name} src={school.logoUrl} size={52} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="nx-page__title" style={{ fontSize: 20 }}>{school.name}</h1>
          <div className="nx-detail__meta">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <span>{school.board}</span>
            <span className="dot" />
            <span>{[school.city, school.state].filter(Boolean).join(', ') || '—'}</span>
          </div>
        </div>
        <div className="nx-detail__actions">
          <Button variant="ghost" leftIcon="edit" onClick={() => navigate(`/schools/${id}/edit`)}>
            Edit
          </Button>
        </div>
      </div>

      {school.deletedAt && (
        <InfoCard icon="alert-triangle" title="Pending deletion">
          This school was terminated on {formatDate(school.deletedAt)} and is in the 30-day soft-delete window. Activate
          to restore access.
        </InfoCard>
      )}

      <Tabs
        aria-label="School detail"
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'school' },
          { id: 'subscription', label: 'Subscription', icon: 'credit-card' },
          { id: 'activity', label: 'Activity', icon: 'activity' },
        ]}
      >
        {(tab) =>
          tab === 'overview' ? (
            <OverviewTab school={school} />
          ) : tab === 'subscription' ? (
            <SubscriptionTab school={school} onAction={setAction} onSetPrice={() => setPriceOpen(true)} />
          ) : (
            <ActivityTab schoolId={school.id} />
          )
        }
      </Tabs>

      <SubscriptionActionModal school={school} action={action} open={action !== null} onClose={() => setAction(null)} />
      {priceOpen && <CustomPriceModal school={school} onClose={() => setPriceOpen(false)} />}
    </div>
  );
}

function OverviewTab({ school }: { school: School }) {
  return (
    <div className="grid g-2">
      <Panel title="School details">
        <Detail label="Board" value={school.board} />
        <Detail label="Type" value={school.type?.replace(/_/g, ' ')} />
        <Detail label="Academic year" value={school.currentAcademicYear} />
        <Detail label="City" value={school.city} />
        <Detail label="State" value={school.state} />
        <Detail label="Pincode" value={school.pincode} />
        <Detail label="Phone" value={school.phone} />
        <Detail label="Email" value={school.email} />
        {school.website && <Detail label="Website" value={school.website} />}
      </Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ManageAdminPanel school={school} />
        <Panel title="At a glance">
          <Detail label="Students" value={formatNumber(school.studentCount ?? 0)} />
          <Detail label="Staff" value={formatNumber(school.staffCount ?? 0)} />
          <Detail label="Onboarding" value={`${school.onboardingPct ?? 0}%`} />
          <Detail label="Last active" value={school.lastActiveAt ? formatRelative(school.lastActiveAt) : '—'} />
        </Panel>
        {school.notes && (
          <Panel title="Internal notes">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{school.notes}</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function SubscriptionTab({ school, onAction, onSetPrice }: { school: School; onAction: (a: SubscriptionAction) => void; onSetPrice: () => void }) {
  const effStatus = effectiveSubscriptionStatus(school);
  const actions = availableActions(effStatus);
  const lapsed = effStatus === 'expired' && school.subscriptionStatus !== 'expired';
  const hasCustom = school.customPriceMonthly != null || school.customPriceAnnual != null;
  return (
    <div className="grid g-2">
      <Panel title="Current subscription">
        <Detail label="Plan (size band)" value={school.plan ?? 'Unassigned'} />
        <Detail
          label="Custom / founding price"
          value={
            hasCustom
              ? school.customPriceMonthly != null
                ? `${formatINR(school.customPriceMonthly)} / month`
                : `${formatINR(school.customPriceAnnual as number)} / year`
              : 'Not set (uses band price)'
          }
        />
        <Detail label="Billing cycle" value={school.billingCycle ?? '—'} />
        <Detail label="Status" value={SUBSCRIPTION_STATUS_META[effStatus].label} />
        <Detail label="Renewal date" value={school.renewalDate ? formatDate(school.renewalDate) : '—'} />
        {school.trialEndsAt && <Detail label="Trial ends" value={formatDate(school.trialEndsAt)} />}
        {lapsed && (
          <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 8, lineHeight: 1.5 }}>
            Term has lapsed — shown as Expired. Renew to extend, or it will be persisted on the next platform sweep.
          </p>
        )}
        <div style={{ marginTop: 14 }}>
          <Button variant="subtle" leftIcon="wallet" onClick={onSetPrice}>
            {hasCustom ? 'Edit custom price' : 'Set custom / founding price'}
          </Button>
        </div>
      </Panel>
      <Panel title="Manage subscription" sub="reason required">
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.55 }}>
          Every lifecycle action is recorded in the platform audit trail with your reason.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map((a) => (
            <Button
              key={a}
              variant={a === 'terminate' ? 'danger' : 'subtle'}
              block
              onClick={() => onAction(a)}
              style={{ justifyContent: 'flex-start' }}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </Button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** Small modal to set/clear a per-school custom (founding) price override. */
function CustomPriceModal({ school, onClose }: { school: School; onClose: () => void }) {
  const toast = useToast();
  const { uid, member } = useSession();
  const [monthly, setMonthly] = useState(school.customPriceMonthly != null ? String(school.customPriceMonthly) : '');
  const [annual, setAnnual] = useState(school.customPriceAnnual != null ? String(school.customPriceAnnual) : '');
  const [busy, setBusy] = useState(false);

  const run = async (clear: boolean) => {
    setBusy(true);
    try {
      const m = clear || monthly.trim() === '' ? null : Math.max(0, Math.round(Number(monthly) || 0));
      const a = clear || annual.trim() === '' ? null : Math.max(0, Math.round(Number(annual) || 0));
      await setSchoolCustomPrice(school.id, m, a, { uid: uid ?? 'unknown', name: member?.name });
      toast.success(clear ? 'Custom price cleared' : 'Custom price saved', school.name);
      onClose();
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      icon="wallet"
      tone="gold"
      title="Custom / founding price"
      description={`Override the size-band price for ${school.name}. Used for founding schools and negotiated pricing.`}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => void run(true)} disabled={busy}>Clear override</Button>
          <Button type="button" variant="gold" leftIcon="check" loading={busy} onClick={() => void run(false)}>Save price</Button>
        </>
      }
    >
      <Field label="Custom price / month (₹)" hint="Used when billed monthly. Leave blank to skip.">
        <Input type="number" inputMode="numeric" min={0} prefix="₹" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="e.g. 7500" aria-label="Custom monthly price" />
      </Field>
      <Field label="Custom price / year (₹)" hint="Used when billed annually. Leave blank to skip.">
        <Input type="number" inputMode="numeric" min={0} prefix="₹" value={annual} onChange={(e) => setAnnual(e.target.value)} placeholder="e.g. 75000" aria-label="Custom annual price" />
      </Field>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
        When set, this price <strong>ignores the normal size bands</strong> and is used in revenue and billing for this school.
      </p>
    </Modal>
  );
}

function ActivityTab({ schoolId }: { schoolId: string }) {
  const { data, loading } = useActivityFeed(100);
  const items = useMemo(() => data.filter((a) => a.schoolId === schoolId), [data, schoolId]);

  if (loading) return <Panel><Skeleton height={48} /><Skeleton height={48} style={{ marginTop: 8 }} /></Panel>;
  if (items.length === 0)
    return <EmptyState icon="activity" title="No activity yet" message="Lifecycle and configuration events for this school will appear here." />;

  return (
    <Panel title="Activity">
      <div className="nx-timeline">
        {items.map((a) => (
          <div className="nx-timeline__item" key={a.id}>
            <span className="nx-timeline__dot" />
            <div>
              <div className="nx-timeline__title">{a.summary}</div>
              <div className="nx-timeline__time">
                {formatRelative(a.ts)}
                {a.actorName ? ` · ${a.actorName}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="nx-kv">
      <span className="nx-kv__k">{label}</span>
      <span className="nx-kv__v">{value ?? '—'}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="nx-page">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Skeleton width={52} height={52} radius={14} />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={20} />
          <Skeleton width="25%" height={12} style={{ marginTop: 8 }} />
        </div>
      </div>
      <Panel><Skeleton height={200} /></Panel>
    </div>
  );
}
