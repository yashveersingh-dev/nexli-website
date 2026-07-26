import { useEffect, useState } from 'react';
import { useSession, useCan } from '@/app/providers/SessionProvider';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Toggle } from '@/components/form';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/feedback';
import { DEFAULT_PERIODS, type PeriodDef } from '@/types/academics';
import {
  useBellSchedule, saveBellSchedule, validateSchedule, nextPeriodNo, sortPeriods,
} from './bellSchedule';
import { useActor } from './shared';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Add minutes to a "HH:MM" string, wrapping nothing past 23:59. */
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + mins);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Per-school bell-schedule editor. Lists the configured periods (the NEXLI default
 * until a school saves its own), and lets a writer add / edit / remove rows — each
 * with a number, label, start/end time and a "break / lunch" toggle. Rows stay in
 * start-time order, so reordering is implicit: change a row's start time and it
 * moves. Saving replaces the whole schedule and audits the change.
 */
export function BellScheduleEditor() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();

  const { periods, loading, isCustom } = useBellSchedule(schoolId);

  // Working draft — seeded from the live schedule, edited locally, saved as a set.
  const [draft, setDraft] = useState<PeriodDef[]>(periods);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Row editor modal ({ index: -1 } = a new row).
  const [editing, setEditing] = useState<{ index: number; period: PeriodDef } | null>(null);

  // Re-seed the draft from the live schedule until the user starts editing.
  useEffect(() => {
    if (!dirty) setDraft(periods);
  }, [periods, dirty]);

  const startNewRow = () => {
    const last = draft[draft.length - 1];
    const n = nextPeriodNo(draft);
    setEditing({
      index: -1,
      period: {
        no: n,
        label: `Period ${n}`,
        startTime: last?.endTime ?? '08:00',
        endTime: addMinutes(last?.endTime ?? '08:00', 45),
        isBreak: false,
      },
    });
  };

  const commitRow = (row: PeriodDef) => {
    setDraft((cur) => {
      const next = editing && editing.index >= 0
        ? cur.map((p, i) => (i === editing.index ? row : p))
        : [...cur, row];
      return sortPeriods(next);
    });
    setDirty(true);
    setEditing(null);
  };

  const removeRow = (index: number) => {
    setDraft((cur) => cur.filter((_, i) => i !== index));
    setDirty(true);
  };

  const save = async () => {
    if (!schoolId) return;
    const problem = validateSchedule(draft);
    if (problem) { toast.error(problem); return; }
    setBusy(true);
    try {
      await saveBellSchedule(schoolId, draft, actor);
      toast.success('Bell schedule saved');
      setDirty(false);
    } catch { toast.error('Could not save bell schedule'); } finally { setBusy(false); }
  };

  const discard = () => { setDirty(false); setDraft(periods); };

  const resetToDefault = async () => {
    if (!schoolId) { setResetting(false); return; }
    setBusy(true);
    try {
      const clean = DEFAULT_PERIODS.map((p) => ({ ...p }));
      await saveBellSchedule(schoolId, clean, actor);
      toast.success('Reset to default schedule');
      setDirty(false);
    } catch { toast.error('Could not reset'); } finally { setBusy(false); setResetting(false); }
  };

  if (loading) return <Skeleton height={320} />;

  return (
    <div>
      <div className="ac-bar">
        <div className="ac-bell-head">
          <span className="ac-bar__title">Bell schedule</span>
          <Badge variant={isCustom ? 'success' : 'muted'}>{isCustom ? 'Custom' : 'Default'}</Badge>
        </div>
        {canWrite && (
          <div className="ac-bell-actions">
            {dirty && <Button variant="ghost" size="sm" onClick={discard} disabled={busy}>Discard</Button>}
            <Button variant="ghost" size="sm" leftIcon="plus" onClick={startNewRow} disabled={busy}>Add row</Button>
            <Button variant="gold" size="sm" leftIcon="check" loading={busy} disabled={!dirty} onClick={save}>Save</Button>
          </div>
        )}
      </div>

      <p className="ac-bell-hint">
        These periods form the rows of every section&rsquo;s timetable. Add breaks and lunch with the
        &ldquo;Break / lunch&rdquo; toggle. Rows order themselves by start time.
      </p>

      <ol className="ac-bell-list">
        {draft.map((p, i) => (
          <li key={`${p.no}-${p.startTime}-${i}`} className={`ac-bell-row${p.isBreak ? ' is-break' : ''}`}>
            <div className="ac-bell-row__no" aria-hidden="true">
              {p.isBreak ? <Icon name="clock" size={15} /> : <span>P{p.no}</span>}
            </div>
            <div className="ac-bell-row__main">
              <span className="ac-bell-row__label">{p.label}</span>
              <span className="ac-bell-row__time">{p.startTime}&ndash;{p.endTime}</span>
            </div>
            {p.isBreak && <Badge variant="muted">Break</Badge>}
            {canWrite && (
              <div className="ac-bell-row__acts">
                <Button variant="ghost" size="sm" leftIcon="edit"
                  onClick={() => setEditing({ index: i, period: p })} aria-label={`Edit ${p.label}`}>Edit</Button>
                <Button variant="ghost" size="sm" leftIcon="minus-circle"
                  onClick={() => removeRow(i)} aria-label={`Remove ${p.label}`}>Remove</Button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {canWrite && isCustom && (
        <div className="ac-bell-foot">
          <Button variant="ghost" size="sm" leftIcon="refresh" onClick={() => setResetting(true)} disabled={busy}>
            Reset to default
          </Button>
        </div>
      )}

      <RowEditor
        open={!!editing}
        period={editing?.period ?? null}
        isNew={editing?.index === -1}
        onClose={() => setEditing(null)}
        onSave={commitRow}
      />

      <ConfirmModal
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={resetToDefault}
        tone="danger"
        loading={busy}
        title="Reset bell schedule?"
        message="Your custom periods will be replaced with the NEXLI default schedule. Existing timetable slots are not changed."
        confirmLabel="Reset"
      />
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Single-row editor modal                                                  */
/* ----------------------------------------------------------------------- */

function RowEditor({
  open, period, isNew, onClose, onSave,
}: {
  open: boolean;
  period: PeriodDef | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (p: PeriodDef) => void;
}) {
  const [label, setLabel] = useState('');
  const [no, setNo] = useState('1');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('08:45');
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    if (!period) return;
    setLabel(period.label);
    setNo(String(period.no));
    setStart(period.startTime);
    setEnd(period.endTime);
    setIsBreak(!!period.isBreak);
  }, [period]);

  const timesOk = HHMM.test(start) && HHMM.test(end) && end > start;
  const valid = label.trim() !== '' && timesOk;

  const submit = () => {
    if (!valid) return;
    onSave({
      no: isBreak ? (period?.no ?? 0) : (Number(no) || 1),
      label: label.trim(),
      startTime: start,
      endTime: end,
      isBreak: isBreak || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="clock"
      tone="gold"
      title={isNew ? 'Add row' : 'Edit row'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" leftIcon="check" disabled={!valid} onClick={submit}>Save</Button>
        </>
      }
    >
      <Field label="Break / lunch" hint="Turn on for non-teaching rows (recess, lunch).">
        <Toggle checked={isBreak} onChange={setIsBreak} label={isBreak ? 'Break row' : 'Teaching period'} />
      </Field>
      <div className="grid g-2">
        <Field label="Label" required>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={isBreak ? 'Lunch' : 'Period 1'} autoFocus />
        </Field>
        {!isBreak && (
          <Field label="Number" hint="Used for slot keys">
            <Input type="number" inputMode="numeric" value={no} onChange={(e) => setNo(e.target.value)} />
          </Field>
        )}
      </div>
      <div className="grid g-2">
        <Field label="Start" required>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End" required error={HHMM.test(end) && end <= start ? 'Must be after start' : undefined}>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
