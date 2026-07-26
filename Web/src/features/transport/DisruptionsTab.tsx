import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, Textarea, DatePicker, Checkbox } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useRoutes, type Actor } from '@/features/ops/data';
import type { TransportRoute, TransportDisruption, DisruptionCause, DisruptionResolution } from '@/types/ops';
import {
  useDisruptions, reportDisruption, updateDisruption, notifyTransport,
} from './disruptions';
import {
  DISRUPTION_CAUSE_META, DISRUPTION_CAUSE_OPTIONS,
  DISRUPTION_RESOLUTION_META, DISRUPTION_STATUS_META,
} from './disruptionMeta';

const today = () => new Date().toISOString().slice(0, 10);
const when = (t?: number) => (t ? formatDate(t, 'DD MMM, h:mm A') : '—');

type Workflow = 'backup' | 'merged' | 'cancelled';

const WORKFLOW: Record<Workflow, { label: string; icon: 'user-plus' | 'refresh' | 'x'; tone: 'gold' | 'danger' }> = {
  backup: { label: 'Assign backup driver', icon: 'user-plus', tone: 'gold' },
  merged: { label: 'Merge / re-route', icon: 'refresh', tone: 'gold' },
  cancelled: { label: 'Cancel route', icon: 'x', tone: 'danger' },
};

export function DisruptionsTab() {
  const { schoolId } = useSession();
  const canWrite = useOwnership('transport').canOperate;
  const { data: disruptions, loading, error } = useDisruptions(schoolId);
  const { data: routes } = useRoutes(schoolId);

  const [reporting, setReporting] = useState(false);

  const open = useMemo(() => disruptions.filter((d) => d.status === 'open'), [disruptions]);
  const resolved = useMemo(() => disruptions.filter((d) => d.status === 'resolved'), [disruptions]);

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>
          Driver-absent &amp; route disruptions. Flag the route, assign a backup, merge or cancel, then notify parents — no student is ever stranded.
        </p>
        {canWrite && <Button variant="gold" leftIcon="alert-triangle" onClick={() => setReporting(true)}>Report disruption</Button>}
      </div>

      {loading ? (
        <Skeleton height={180} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load disruptions" message="Please try again." /></Panel>
      ) : disruptions.length === 0 ? (
        <Panel>
          <EmptyState
            icon="check-circle"
            title="No disruptions logged"
            message={canWrite ? 'When a driver is absent or a route is disrupted, report it here to flag the route and notify parents.' : 'Route disruptions and their resolution will appear here.'}
          />
        </Panel>
      ) : (
        <>
          {open.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: resolved.length ? 22 : 0 }}>
              {open.map((d) => <DisruptionCard key={d.id} d={d} routes={routes} canWrite={canWrite} />)}
            </div>
          )}
          {resolved.length > 0 && (
            <>
              <h3 className="nx-section__title" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Resolved &amp; reviewed</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {resolved.slice(0, 30).map((d) => <DisruptionCard key={d.id} d={d} routes={routes} canWrite={canWrite} />)}
              </div>
            </>
          )}
        </>
      )}

      {reporting && <ReportModal routes={routes} onClose={() => setReporting(false)} />}
    </div>
  );
}

/* ------------------------------- Card ------------------------------------- */

function DisruptionCard({ d, routes, canWrite }: { d: TransportDisruption; routes: TransportRoute[]; canWrite: boolean }) {
  const cause = DISRUPTION_CAUSE_META[d.cause];
  const res = DISRUPTION_RESOLUTION_META[d.resolution];
  const st = DISRUPTION_STATUS_META[d.status];

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [supervising, setSupervising] = useState(false);

  const { schoolId, uid, member } = useSession();
  const toast = useToast();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const toggleSupervised = async () => {
    if (!schoolId) return;
    setSupervising(true);
    try {
      await updateDisruption(schoolId, d.id, { studentsSupervised: !d.studentsSupervised }, actor);
    } catch { toast.error('Could not update'); } finally { setSupervising(false); }
  };

  const notified = !!d.parentsNotifiedAt;

  return (
    <div className="tr-disrupt" role={d.status === 'open' ? 'alert' : undefined}>
      <span className={`tr-disrupt__icon tr-disrupt__icon--${d.status}`} aria-hidden="true">
        <Icon name={cause.icon} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{d.routeName ?? 'Route'}</span>
          <Badge variant={st.variant}>{st.label}</Badge>
          <Badge variant={res.variant}>{res.label}</Badge>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
          {cause.label} · {formatDate(d.date)}
          {d.reportedByName ? ` · by ${d.reportedByName}` : ''}
        </div>

        {/* Resolution detail */}
        {(d.backupDriverName || d.mergedIntoRouteName || (d.resolution === 'cancelled')) && (
          <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name={res.icon} size={13} aria-hidden="true" />
            {d.resolution === 'backup' && <span>Covered by <b>{d.backupDriverName}</b></span>}
            {d.resolution === 'merged' && <span>Stops merged into <b>{d.mergedIntoRouteName ?? 'another route'}</b></span>}
            {d.resolution === 'cancelled' && <span>Route cancelled for the day</span>}
          </div>
        )}
        {d.note && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 5 }}>{d.note}</div>}

        {/* Supervised-student checklist */}
        <div className={`tr-disrupt__check${d.studentsSupervised ? ' is-on' : ''}`}>
          <Checkbox
            checked={!!d.studentsSupervised}
            disabled={!canWrite || supervising}
            onChange={() => void toggleSupervised()}
            label={<><Icon name="shield-check" size={13} aria-hidden="true" /> Affected students held in a supervised area until pickup</>}
          />
        </div>

        {/* Parent-notification status */}
        <div style={{ fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: notified ? 'var(--success)' : 'var(--warning)' }}>
          <Icon name={notified ? 'check-circle' : 'bell'} size={13} aria-hidden="true" />
          {notified
            ? `Parents notified · ${when(d.parentsNotifiedAt)}${d.parentsNotifiedCount ? ` · ${d.parentsNotifiedCount} record${d.parentsNotifiedCount === 1 ? '' : 's'}` : ''}`
            : 'Parents not yet notified'}
        </div>

        {/* Actions */}
        {canWrite && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {d.status === 'open' && (
              <>
                <Button variant="subtle" size="sm" leftIcon="user-plus" onClick={() => setWorkflow('backup')}>Backup</Button>
                <Button variant="subtle" size="sm" leftIcon="refresh" onClick={() => setWorkflow('merged')}>Merge</Button>
                <Button variant="ghost" size="sm" leftIcon="x" onClick={() => setWorkflow('cancelled')}>Cancel route</Button>
              </>
            )}
            <Button variant={notified ? 'ghost' : 'gold'} size="sm" leftIcon="bell" onClick={() => setNotifying(true)}>
              {notified ? 'Notify again' : 'Notify parents'}
            </Button>
            {d.status === 'open' && d.resolution !== 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon="check-circle"
                disabled={!d.studentsSupervised}
                title={!d.studentsSupervised ? 'Confirm affected students are supervised before closing' : undefined}
                onClick={() => setReviewing(true)}
              >
                Mark reviewed
              </Button>
            )}
          </div>
        )}
        {/* Safety gate: a disruption can't be closed while students are still unsupervised. */}
        {canWrite && d.status === 'open' && d.resolution !== 'pending' && !d.studentsSupervised && (
          <div style={{ fontSize: 11.5, marginTop: 8, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield-check" size={13} aria-hidden="true" /> Confirm affected students are held in a supervised area before marking this resolved.
          </div>
        )}
      </div>

      {workflow && (
        <ResolveModal workflow={workflow} d={d} routes={routes} onClose={() => setWorkflow(null)} />
      )}
      {notifying && (
        <NotifyModal d={d} onClose={() => setNotifying(false)} />
      )}
      <ConfirmModal
        open={reviewing}
        onClose={() => setReviewing(false)}
        tone="gold"
        title="Mark as resolved?"
        message={`Close this disruption for ${d.routeName ?? 'the route'}.${notified ? '' : ' Parents have NOT been notified yet — consider notifying them first.'} It stays visible in the log for VP-Admin review.`}
        confirmLabel="Mark resolved"
        icon="check-circle"
        onConfirm={async () => {
          if (!schoolId) return;
          try {
            await updateDisruption(schoolId, d.id, { status: 'resolved', resolvedAt: Date.now() }, actor);
            toast.success('Disruption resolved');
            setReviewing(false);
          } catch { toast.error('Could not update'); }
        }}
      />
    </div>
  );
}

/* --------------------------- Report (detect/flag) ------------------------- */

function ReportModal({ routes, onClose }: { routes: TransportRoute[]; onClose: () => void }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState(today());
  const [cause, setCause] = useState<DisruptionCause>('driver_absent');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const routeOptions = useMemo(
    () => [{ value: '', label: 'Select the affected route' }, ...routes.slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ value: r.id, label: r.name }))],
    [routes],
  );

  const submit = async () => {
    if (!schoolId || !routeId) return;
    setBusy(true);
    try {
      const route = routes.find((r) => r.id === routeId);
      await reportDisruption(schoolId, {
        schoolId,
        date,
        routeId,
        routeName: route?.name,
        cause,
        resolution: 'pending',
        note: note.trim() || undefined,
        studentsSupervised: false,
        status: 'open',
        reportedByName: member?.name,
        reportedAt: Date.now(),
        handledByUid: uid ?? undefined,
        handledByName: member?.name,
      }, actor);
      toast.success('Disruption flagged', route?.name);
      onClose();
    } catch { toast.error('Could not report disruption'); } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon="alert-triangle"
      tone="gold"
      title="Report a disruption"
      description="Flag an affected route when a driver/conductor is absent or a vehicle is out of service."
      size="md"
      dismissible={!busy}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="alert-triangle" loading={busy} disabled={!routeId} onClick={submit}>Flag route</Button>
      </>}
    >
      <div className="nx-section__grid">
        <Field label="Affected route" required><Select value={routeId} onChange={(e) => setRouteId(e.target.value)} options={routeOptions} placeholder="Select the affected route" /></Field>
        <Field label="Date" required><DatePicker value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Cause" required><Select value={cause} onChange={(e) => setCause(e.target.value as DisruptionCause)} options={DISRUPTION_CAUSE_OPTIONS} /></Field>
      </div>
      <Field label="Note" optional><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Which driver/conductor is absent? Any context for the handling team…" /></Field>
    </Modal>
  );
}

/* ----------------- Resolve: backup / merge / cancel ----------------------- */

function ResolveModal({ workflow, d, routes, onClose }: { workflow: Workflow; d: TransportDisruption; routes: TransportRoute[]; onClose: () => void }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const cfg = WORKFLOW[workflow];

  const [backupDriverName, setBackupDriverName] = useState('');
  const [mergedIntoRouteId, setMergedIntoRouteId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const mergeOptions = useMemo(
    () => [
      { value: '', label: 'Select a route to merge into' },
      ...routes.filter((r) => r.id !== d.routeId && r.status === 'active')
        .slice().sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => ({ value: r.id, label: r.name })),
    ],
    [routes, d.routeId],
  );

  const valid =
    workflow === 'backup' ? backupDriverName.trim().length > 0 :
    workflow === 'merged' ? mergedIntoRouteId.length > 0 :
    true;

  const submit = async () => {
    if (!schoolId || !valid) return;
    setBusy(true);
    try {
      const resolution = workflow as DisruptionResolution;
      const patch: Partial<TransportDisruption> = {
        resolution,
        note: note.trim() || d.note || undefined,
        handledByUid: uid ?? undefined,
        handledByName: member?.name,
      };
      if (workflow === 'backup') {
        patch.backupDriverName = backupDriverName.trim();
        patch.mergedIntoRouteId = undefined;
        patch.mergedIntoRouteName = undefined;
      } else if (workflow === 'merged') {
        const into = routes.find((r) => r.id === mergedIntoRouteId);
        patch.mergedIntoRouteId = mergedIntoRouteId;
        patch.mergedIntoRouteName = into?.name;
        patch.backupDriverName = undefined;
      } else {
        patch.backupDriverName = undefined;
        patch.mergedIntoRouteId = undefined;
        patch.mergedIntoRouteName = undefined;
      }
      await updateDisruption(schoolId, d.id, patch, actor);
      toast.success('Resolution applied', DISRUPTION_RESOLUTION_META[resolution].label);
      onClose();
    } catch { toast.error('Could not apply resolution'); } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={cfg.icon}
      tone={cfg.tone}
      title={cfg.label}
      description={`${d.routeName ?? 'Route'} · ${formatDate(d.date)}`}
      size="md"
      dismissible={!busy}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={cfg.tone === 'danger' ? 'danger' : 'gold'} leftIcon={cfg.icon} loading={busy} disabled={!valid} onClick={submit}>
          {workflow === 'cancelled' ? 'Cancel route' : 'Apply'}
        </Button>
      </>}
    >
      {workflow === 'backup' && (
        <Field label="Backup driver / conductor" required>
          <Input value={backupDriverName} onChange={(e) => setBackupDriverName(e.target.value)} placeholder="e.g. R. Sharma (standby)" autoFocus />
        </Field>
      )}
      {workflow === 'merged' && (
        <>
          <Field label="Merge stops into route" required>
            <Select value={mergedIntoRouteId} onChange={(e) => setMergedIntoRouteId(e.target.value)} options={mergeOptions} />
          </Field>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={13} aria-hidden="true" /> Check the target route has spare capacity before merging — note it below.
          </p>
        </>
      )}
      {workflow === 'cancelled' && (
        <p style={{ fontSize: 13, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="alert-triangle" size={15} style={{ color: 'var(--danger)' }} aria-hidden="true" />
          Last resort. Cancel the route for the day — be sure parents are notified and students are supervised until pickup.
        </p>
      )}
      <Field label={workflow === 'cancelled' ? 'Reason' : 'Note (capacity / ETA)'} optional>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={workflow === 'merged' ? 'e.g. 6 spare seats on the target bus; revised pickup ~07:40' : 'Revised ETA, capacity, any caveats…'} />
      </Field>
    </Modal>
  );
}

/* ------------------- Notify parents (records in-app log) ------------------ */

function defaultMessage(d: TransportDisruption): string {
  const route = d.routeName ?? 'your child\'s route';
  if (d.resolution === 'backup') return `${route} is running today with a backup driver${d.backupDriverName ? ` (${d.backupDriverName})` : ''}. Pickup/drop will proceed as scheduled.`;
  if (d.resolution === 'merged') return `${route} has been merged into ${d.mergedIntoRouteName ?? 'another route'} today. Please expect a revised pickup/drop time; students are supervised until pickup.`;
  if (d.resolution === 'cancelled') return `${route} is cancelled today due to a driver/vehicle issue. Please arrange alternate pickup. Students at school are held in a supervised area until collected.`;
  return `There is a disruption on ${route} today. We are arranging cover and will share a revised ETA shortly. Students are supervised until pickup.`;
}

function NotifyModal({ d, onClose }: { d: TransportDisruption; onClose: () => void }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const [message, setMessage] = useState(() => defaultMessage(d));
  const [recipients, setRecipients] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!schoolId || !message.trim()) return;
    setBusy(true);
    try {
      const count = recipients.trim() ? Number(recipients) : undefined;
      const recipientCount = count !== undefined && !Number.isNaN(count) && count >= 0 ? count : undefined;
      const { notifiedAt } = await notifyTransport(schoolId, {
        disruptionId: d.id,
        routeId: d.routeId,
        routeName: d.routeName,
        date: d.date,
        message: message.trim(),
        audience: `Parents on ${d.routeName ?? 'the affected route'}`,
        recipientCount,
      }, actor);
      await updateDisruption(schoolId, d.id, {
        parentsNotifiedAt: notifiedAt,
        parentsNotifiedCount: recipientCount,
      }, actor);
      toast.success('Parents notified', 'In-app notification recorded');
      onClose();
    } catch { toast.error('Could not notify parents'); } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon="bell"
      tone="gold"
      title="Notify affected parents"
      description="Records an in-app notification of the resolution. (SMS/push provider drops in later — no app changes.)"
      size="md"
      dismissible={!busy}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="bell" loading={busy} disabled={!message.trim()} onClick={submit}>Notify &amp; log</Button>
      </>}
    >
      <Field label="Message to parents" required>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
      </Field>
      <Field label="Affected parents (count)" optional>
        <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} type="number" inputMode="numeric" placeholder="e.g. 24" />
      </Field>
      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="info" size={13} aria-hidden="true" /> On the current plan this is logged in-app only; no SMS is sent.
      </p>
    </Modal>
  );
}
