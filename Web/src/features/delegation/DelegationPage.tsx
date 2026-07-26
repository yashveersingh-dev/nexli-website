import { useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { KPICard } from '@/components/KPICard';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Select, Textarea, Input } from '@/components/form';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { DELEGATABLE_MODULES } from '@/lib/ownership';
import { isDelegationActive, type Delegation } from '@/lib/delegation';
import { ROLES, type RoleId } from '@/types/roles';
import { useDelegations, useMembers, grantDelegation, revokeDelegation } from './data';

const NON_STAFF_ROLES: RoleId[] = ['parent', 'student', 'super_admin'];

type DurationKey = 'today' | '3days' | '1week' | '2weeks' | 'custom';
const DURATIONS: { value: DurationKey; label: string }[] = [
  { value: 'today', label: 'Until end of today' },
  { value: '3days', label: '3 days' },
  { value: '1week', label: '1 week' },
  { value: '2weeks', label: '2 weeks' },
  { value: 'custom', label: 'Custom end date & time' },
];

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function untilFor(key: DurationKey, customISO: string): number {
  const now = Date.now();
  switch (key) {
    case 'today': return endOfToday();
    case '3days': return now + 3 * 864e5;
    case '1week': return now + 7 * 864e5;
    case '2weeks': return now + 14 * 864e5;
    case 'custom': return customISO ? new Date(customISO).getTime() : 0;
  }
}
function fmt(ts: number): string {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function roleLabel(role?: RoleId): string {
  return role ? ROLES[role]?.label ?? role : '—';
}

/**
 * Operational Delegation — leadership grants a substitute temporary *operate*
 * access to a module during a staffing gap (Reason + window + audit). Reflected
 * live in `useOwnership(moduleKey).canOperate` for the delegate. UI-level today;
 * DB enforcement lands in P9.
 */
export function DelegationPage() {
  const { schoolId, isSuperAdmin, uid, member, can } = useSession();
  const toast = useToast();
  const canManage = isSuperAdmin || can('delegation.manage');

  const { data: delegations, loading } = useDelegations(schoolId);
  const { data: members } = useMembers(schoolId);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Grant form state (local — avoids RHF schema friction).
  const [delegateUid, setDelegateUid] = useState('');
  const [moduleKey, setModuleKey] = useState('');
  const [duration, setDuration] = useState<DurationKey>('1week');
  const [customISO, setCustomISO] = useState('');
  const [reason, setReason] = useState('');

  const staffMembers = useMemo(
    () =>
      members
        .filter((m) => !NON_STAFF_ROLES.includes(m.roleId) && m.status !== 'suspended' && m.uid !== uid)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members, uid],
  );

  const { active, history } = useMemo(() => {
    const sorted = [...delegations].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return {
      active: sorted.filter((d) => isDelegationActive(d)),
      history: sorted.filter((d) => !isDelegationActive(d)),
    };
  }, [delegations]);

  function resetForm() {
    setDelegateUid(''); setModuleKey(''); setDuration('1week'); setCustomISO(''); setReason('');
  }

  async function submit() {
    const delegate = staffMembers.find((m) => m.uid === delegateUid || m.id === delegateUid);
    const untilAt = untilFor(duration, customISO);
    if (!delegate) { toast.error('Select who will cover this module.'); return; }
    if (!moduleKey) { toast.error('Select a module to delegate.'); return; }
    if (!reason.trim()) { toast.error('A reason is required for a temporary override.'); return; }
    if (!untilAt || untilAt <= Date.now()) { toast.error('Pick an end date in the future.'); return; }
    setBusy(true);
    try {
      await grantDelegation(
        schoolId!,
        {
          delegate: { uid: delegate.uid ?? delegate.id, name: delegate.name, roleId: delegate.roleId },
          moduleKey,
          reason,
          fromAt: Date.now(),
          untilAt,
        },
        { uid: uid!, name: member?.name },
      );
      toast.success('Delegation granted');
      setOpen(false);
      resetForm();
    } catch {
      toast.error('Could not grant the delegation. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(d: Delegation) {
    setRevoking(d.id);
    try {
      await revokeDelegation(schoolId!, d, { uid: uid!, name: member?.name });
      toast.success('Delegation revoked');
    } catch {
      toast.error('Could not revoke. Try again.');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Operational Delegation</h1>
          <p className="nx-page__sub">
            Temporarily hand a module's day-to-day operation to a substitute during a staffing gap — with a reason and a time limit.
          </p>
        </div>
        {canManage && (
          <Button variant="gold" leftIcon="user-plus" onClick={() => { resetForm(); setOpen(true); }}>
            Grant delegation
          </Button>
        )}
      </div>

      {!canManage ? (
        <InfoCard icon="lock" title="Leadership-managed">
          Temporary operational delegations are granted by the Principal, Vice Principals, Directors, HR or IT Admin.
          If you need cover for a module while a colleague is away, ask one of them to grant it.
        </InfoCard>
      ) : (
        <>
          <div className="kpi-grid">
            <KPICard icon="shield-check" label="Active delegations" count={active.length} />
            <KPICard icon="users" label="People covering" count={new Set(active.map((d) => d.delegateUid)).size} />
            <KPICard icon="clock" label="Granted (all time)" count={delegations.length} />
          </div>

          <Panel title="Active delegations" sub="who is temporarily operating which module">
            {loading ? (
              <Skeleton height={160} />
            ) : active.length === 0 ? (
              <EmptyState
                icon="shield-check"
                title="No active delegations"
                message="Everyone operates their own modules. Grant a delegation when someone needs to cover for an absent colleague."
              />
            ) : (
              <div className="nx-deleg-list">
                {active.map((d) => (
                  <div className="nx-deleg-row" key={d.id}>
                    <Avatar name={d.delegateName} size={36} />
                    <div className="nx-deleg-row__main">
                      <div className="nx-deleg-row__name">
                        {d.delegateName}
                        <span className="nx-deleg-row__role">{roleLabel(d.delegateRole)}</span>
                      </div>
                      <div className="nx-deleg-row__sub">
                        <Badge variant="info">{d.moduleLabel}</Badge>
                        <span className="nx-deleg-row__reason" title={d.reason}>{d.reason}</span>
                      </div>
                      <div className="nx-deleg-row__meta">
                        <Icon name="clock" size={12} /> until {fmt(d.untilAt)} · granted by {d.grantedByName}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon="x"
                      loading={revoking === d.id}
                      onClick={() => onRevoke(d)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {history.length > 0 && (
            <Panel title="History" sub="expired & revoked delegations (kept for audit)">
              <div className="nx-deleg-list nx-deleg-list--muted">
                {history.slice(0, 30).map((d) => (
                  <div className="nx-deleg-row nx-deleg-row--past" key={d.id}>
                    <Avatar name={d.delegateName} size={30} />
                    <div className="nx-deleg-row__main">
                      <div className="nx-deleg-row__name">
                        {d.delegateName}
                        <span className="nx-deleg-row__role">{d.moduleLabel}</span>
                      </div>
                      <div className="nx-deleg-row__meta">
                        {d.revokedAt
                          ? `Revoked ${fmt(d.revokedAt)} by ${d.revokedByName ?? '—'}`
                          : `Expired ${fmt(d.untilAt)}`}
                        {' · '}reason: {d.reason}
                      </div>
                    </div>
                    <Badge variant={d.revokedAt ? 'danger' : 'muted'}>{d.revokedAt ? 'Revoked' : 'Expired'}</Badge>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Grant temporary delegation"
        icon="user-plus"
        tone="gold"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" onClick={submit} loading={busy} leftIcon="check">Grant</Button>
          </>
        }
      >
        <p className="nx-deleg-note">
          The substitute will be able to operate this module (alongside their own role) until the delegation ends or you revoke it.
          A reason and an audit record are required.
        </p>
        <Field label="Who is covering?" required>
          <Select
            placeholder="Select a staff member"
            value={delegateUid}
            onChange={(e) => setDelegateUid(e.target.value)}
            options={staffMembers.map((m) => ({
              value: m.uid ?? m.id,
              label: `${m.name} — ${roleLabel(m.roleId)}`,
            }))}
          />
        </Field>
        <Field label="Module to delegate" required>
          <Select
            placeholder="Select a module"
            value={moduleKey}
            onChange={(e) => setModuleKey(e.target.value)}
            options={DELEGATABLE_MODULES.map((m) => ({ value: m.key, label: `${m.label} (owner: ${m.ownerLabel})` }))}
          />
        </Field>
        <Field label="Duration" required>
          <Select value={duration} onChange={(e) => setDuration(e.target.value as DurationKey)} options={DURATIONS} />
        </Field>
        {duration === 'custom' && (
          <Field label="Ends at" required>
            <Input type="datetime-local" value={customISO} onChange={(e) => setCustomISO(e.target.value)} />
          </Field>
        )}
        <Field label="Reason" required hint="Why is this cover needed? (e.g. Librarian on medical leave)">
          <Textarea
            rows={3}
            maxLength={240}
            placeholder="Reason for the temporary override"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
