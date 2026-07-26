import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Field, Input, Textarea, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { ChipInput } from './ChipInput';
import { useNow } from './useNow';
import {
  useBreachNotifications,
  createBreachNotification,
  updateBreachNotification,
} from './registersData';
import {
  BREACH_STATUS_META,
  BREACH_NEXT,
  BREACH_REPORTING_WINDOW_MS,
  type BreachNotification,
  type BreachStatus,
} from './registerTypes';
import type { Actor } from './data';

const OPEN = new Set<BreachStatus>(['detected', 'investigating', 'notified', 'contained']);

function deadlineOf(b: BreachNotification): number {
  return b.deadline ?? b.detectedAt + BREACH_REPORTING_WINDOW_MS;
}
function countdown(b: BreachNotification, now: number): { text: string; overdue: boolean } {
  const d = deadlineOf(b);
  const overdue = d < now;
  const totalMin = Math.floor(Math.abs(d - now) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { text: overdue ? `Overdue by ${parts}` : `${parts} left`, overdue };
}

/** DPDP personal-data-breach register with the 72h notification clock. */
export function BreachTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('consent.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const now = useNow();

  const { data: breaches, loading, error } = useBreachNotifications(schoolId);

  const [view, setView] = useState<'open' | 'all' | 'closed'>('open');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BreachNotification | null>(null);
  const [busy, setBusy] = useState(false);

  // form
  const [description, setDescription] = useState('');
  const [affected, setAffected] = useState('');
  const [cats, setCats] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      breaches.filter((b) =>
        view === 'open' ? OPEN.has(b.status) : view === 'closed' ? !OPEN.has(b.status) : true,
      ),
    [breaches, view],
  );

  const overdueOpen = useMemo(
    () => breaches.filter((b) => OPEN.has(b.status) && !b.notifiedBoardAt && countdown(b, now).overdue).length,
    [breaches, now],
  );

  const resetForm = () => {
    setDescription('');
    setAffected('');
    setCats([]);
  };

  const submit = async () => {
    if (!schoolId || !description.trim()) return;
    setBusy(true);
    try {
      const detectedAt = Date.now();
      const payload: Omit<BreachNotification, 'id'> = {
        schoolId,
        detectedAt,
        deadline: detectedAt + BREACH_REPORTING_WINDOW_MS,
        description: description.trim(),
        affectedCount: affected.trim() ? Number(affected) : undefined,
        categories: cats.length ? cats : undefined,
        status: 'detected',
      };
      await createBreachNotification(schoolId, payload, actor);
      toast.success('Breach logged', 'Notify the Board within 72 hours.');
      setCreating(false);
      resetForm();
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (b: BreachNotification, p: Partial<BreachNotification>, msg: string) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await updateBreachNotification(schoolId, b.id, p, actor);
      toast.success(msg);
      setEditing(null);
    } catch {
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="cns-note" role="note">
        <Icon name="shield-check" size={16} />
        <span>
          <strong>Breach notification (DPDP).</strong> Log any personal-data breach. The school (Data Fiduciary)
          must notify the <strong>Data Protection Board</strong> and affected principals — track the 72-hour clock here.
        </span>
      </div>

      {overdueOpen > 0 && (
        <div className="cns-gate" role="alert" style={{ borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)', background: 'color-mix(in srgb, var(--danger) 9%, var(--card))' }}>
          <Icon name="alert-triangle" size={16} aria-hidden="true" />
          <span>
            <strong>{overdueOpen}</strong> open breach{overdueOpen === 1 ? '' : 'es'} past the 72-hour
            notification window without a recorded Board notification.
          </span>
        </div>
      )}

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select
          value={view}
          onChange={(e) => setView(e.target.value as 'open' | 'all' | 'closed')}
          aria-label="View"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'all', label: 'All' },
          ]}
        />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => { resetForm(); setCreating(true); }}>
            Log breach
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load breaches" message="Please try again." />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="shield-check"
            title={view === 'closed' ? 'Nothing closed' : 'No breaches logged'}
            message={canWrite ? 'Log a personal-data breach to start the 72-hour notification workflow.' : 'Breaches will appear here.'}
            action={
              canWrite && view !== 'closed' ? (
                <Button variant="gold" leftIcon="plus" onClick={() => { resetForm(); setCreating(true); }}>
                  Log breach
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="fin-kv-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((b) => {
            const meta = BREACH_STATUS_META[b.status];
            const cd = countdown(b, now);
            const showClock = OPEN.has(b.status) && !b.notifiedBoardAt;
            return (
              <div key={b.id} className="cns-rec">
                <div className="cns-rec__body">
                  <div className="cns-rec__name">{b.description}</div>
                  <div className="cns-rec__meta">
                    Detected {formatDate(b.detectedAt)}
                    {typeof b.affectedCount === 'number' ? ` · ~${b.affectedCount} affected` : ''}
                    {b.categories?.length ? ` · ${b.categories.join(', ')}` : ''}
                    {b.notifiedBoardAt ? ` · Board notified ${formatDate(b.notifiedBoardAt)}` : ''}
                    {showClock && (
                      <span className={cd.overdue ? 'cns-overdue' : 'cns-sla'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="clock" size={11} aria-hidden="true" /> {cd.overdue ? `72h ${cd.text}` : cd.text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="cns-rec__badges" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {showClock && cd.overdue && <Badge variant="danger">Overdue</Badge>}
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                {canWrite && (
                  <div className="cns-rec__actions">
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label="Manage breach" onClick={() => setEditing(b)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log breach */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        icon="alert-triangle"
        tone="gold"
        title="Log a personal-data breach"
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!description.trim()} onClick={submit}>
              Log breach
            </Button>
          </>
        }
      >
        <Field label="What happened" required>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} autoResize rows={3} placeholder="Nature of the breach, systems/data involved…" />
        </Field>
        <Field label="Approx. principals affected" optional>
          <Input type="number" inputMode="numeric" value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="e.g. 120" />
        </Field>
        <Field label="Data categories" optional hint="Type a category and press Enter or comma.">
          <ChipInput value={cats} onChange={setCats} placeholder="Name, Contact, Marks…" aria-label="Data categories" />
        </Field>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>
          A 72-hour notification deadline is set automatically from now.
        </p>
      </Modal>

      {/* Manage breach */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        icon="shield-check"
        tone="gold"
        title="Manage breach"
        description={editing?.description}
        size="md"
        dismissible={!busy}
        footer={<Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Close</Button>}
      >
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={`cns-deadline ${countdown(editing, now).overdue && !editing.notifiedBoardAt ? 'cns-deadline--overdue' : 'cns-deadline--ok'}`}>
              <span className="cns-deadline__icon"><Icon name="clock" size={18} aria-hidden="true" /></span>
              <div className="cns-deadline__body">
                <div className="cns-deadline__title">72-hour notification clock</div>
                <div className="cns-deadline__sub">Deadline {formatDate(deadlineOf(editing))} · {countdown(editing, now).text}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="subtle"
                size="sm"
                leftIcon="check"
                disabled={busy || !!editing.notifiedBoardAt}
                onClick={() => patch(editing, { notifiedBoardAt: Date.now(), status: editing.status === 'detected' ? 'notified' : editing.status }, 'Recorded Board notification')}
              >
                {editing.notifiedBoardAt ? 'Board notified' : 'Mark Board notified'}
              </Button>
              <Button
                variant="subtle"
                size="sm"
                leftIcon="check"
                disabled={busy || !!editing.notifiedPrincipalsAt}
                onClick={() => patch(editing, { notifiedPrincipalsAt: Date.now() }, 'Recorded principal notification')}
              >
                {editing.notifiedPrincipalsAt ? 'Principals notified' : 'Mark principals notified'}
              </Button>
            </div>

            <Field label="Advance status" optional>
              <Select
                value=""
                onChange={(e) => {
                  const to = e.target.value as BreachStatus;
                  if (to) void patch(editing, { status: to }, `Moved to ${BREACH_STATUS_META[to].label}`);
                }}
                placeholder="Choose next status"
                options={BREACH_NEXT[editing.status].map((s) => ({ value: s, label: BREACH_STATUS_META[s].label }))}
                disabled={busy || BREACH_NEXT[editing.status].length === 0}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
