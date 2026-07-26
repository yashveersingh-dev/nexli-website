import { useMemo, useState } from 'react';
import { useSession, useCan } from '@/app/providers/SessionProvider';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, Textarea } from '@/components/form';
import { Icon } from '@/components/Icon';
import { EmptyState, Spinner } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import {
  useSubstitutions, useSections, useGrades, useStaff, useAllTimetable,
  createSubstitution, deleteSubstitution,
} from '@/features/school/data';
import { WEEKDAYS, type Weekday, type Substitution, type TimetableSlot } from '@/types/academics';
import { useActor, staffOptions, staffName } from './shared';
import {
  useBellSchedule, periodLabelOf, affectedSlotsFor, suggestSubstitutes, findSubstituteConflict,
  type SubSuggestion, type TeacherLike,
} from './bellSchedule';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekdayOf(iso: string): Weekday {
  const idx = new Date(`${iso}T00:00:00`).getDay(); // 0=Sun
  const map: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[idx] === 'sun' ? 'mon' : map[idx];
}

export function SubstitutionsTab() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();

  const { data: subs, loading, error } = useSubstitutions(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: staff } = useStaff(schoolId);
  const { data: allSlots } = useAllTimetable(schoolId);
  const { periods } = useBellSchedule(schoolId);

  const periodOptions = useMemo(
    () => periods.filter((p) => !p.isBreak).map((p) => ({ value: String(p.no), label: `${p.label} (${p.startTime})` })),
    [periods],
  );

  const [adding, setAdding] = useState(false);
  const [absentFlow, setAbsentFlow] = useState(false);
  const [removing, setRemoving] = useState<Substitution | null>(null);
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [periodNo, setPeriodNo] = useState(String(periods.find((p) => !p.isBreak)?.no ?? 1));
  const [sectionId, setSectionId] = useState('');
  const [absent, setAbsent] = useState('');
  const [substitute, setSubstitute] = useState('');
  const [reason, setReason] = useState('');

  const gradeName = (id: string) => grades.find((g) => g.id === id)?.name;
  const sectionLabel = (id: string) => {
    const s = sections.find((x) => x.id === id);
    return s ? `${gradeName(s.gradeId) ?? '—'} · ${s.name}` : '—';
  };
  const sectionOptions = sections.slice().sort((a, b) =>
    (gradeName(a.gradeId) ?? '').localeCompare(gradeName(b.gradeId) ?? '') || a.name.localeCompare(b.name))
    .map((s) => ({ value: s.id, label: `${gradeName(s.gradeId) ?? '—'} · ${s.name}` }));

  const openAdd = () => {
    setDate(todayISO());
    setPeriodNo(String(periods.find((p) => !p.isBreak)?.no ?? 1));
    setSectionId(sections[0]?.id ?? '');
    setAbsent(''); setSubstitute(''); setReason('');
    setAdding(true);
  };

  const save = async () => {
    if (!schoolId || !date || !sectionId || !substitute) return;
    // Block double-booking: the chosen substitute must not already be covering a
    // DIFFERENT class in the same date + period (the timetable check can't see
    // other substitutions). Pure check lives in bellSchedule for testability.
    const clash = findSubstituteConflict(
      { date: new Date(`${date}T00:00:00`).getTime(), periodNo: Number(periodNo), sectionId, substituteTeacherUid: substitute },
      subs,
    );
    if (clash) {
      toast.error('Substitute already booked', `${staffName(staff, substitute) ?? 'This teacher'} is covering ${clash.sectionName ?? 'another class'} in ${periodLabelOf(periods, Number(periodNo))} already.`);
      return;
    }
    setBusy(true);
    try {
      const section = sections.find((s) => s.id === sectionId);
      await createSubstitution(schoolId, {
        schoolId,
        date: new Date(`${date}T00:00:00`).getTime(),
        day: weekdayOf(date),
        periodNo: Number(periodNo),
        sectionId,
        sectionName: section ? sectionLabel(sectionId) : undefined,
        absentTeacherUid: absent || undefined,
        absentTeacherName: staffName(staff, absent),
        substituteTeacherUid: substitute,
        substituteTeacherName: staffName(staff, substitute),
        reason: reason.trim() || undefined,
      }, actor);
      toast.success('Substitution added');
      setAdding(false);
    } catch { toast.error('Could not add substitution'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteSubstitution(schoolId, removing.id, actor); toast.success('Substitution removed'); setRemoving(null); }
    catch { toast.error('Could not remove substitution'); } finally { setBusy(false); }
  };

  const startOfToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const rows = useMemo(
    () => subs.slice().filter((s) => s.date >= startOfToday).sort((a, b) => a.date - b.date || a.periodNo - b.periodNo),
    [subs, startOfToday],
  );

  const periodLabel = (no: number) => periodLabelOf(periods, no);
  const dayLabel = (d: Weekday) => WEEKDAYS.find((w) => w.id === d)?.short ?? d;

  const columns: Column<Substitution>[] = [
    {
      key: 'when', header: 'When', primary: true,
      render: (s) => <span style={{ fontWeight: 600 }}>{formatDate(s.date)} · {dayLabel(s.day)}</span>,
    },
    { key: 'period', header: 'Period', render: (s) => periodLabel(s.periodNo) },
    { key: 'section', header: 'Section', render: (s) => s.sectionName ?? sectionLabel(s.sectionId) },
    { key: 'absent', header: 'Absent', render: (s) => s.absentTeacherName ?? staffName(staff, s.absentTeacherUid) ?? '—' },
    {
      key: 'sub', header: 'Covered by',
      render: (s) => <Badge variant="success">{s.substituteTeacherName ?? staffName(staff, s.substituteTeacherUid) ?? '—'}</Badge>,
    },
    { key: 'reason', header: 'Reason', hideOnMobile: true, truncate: true, render: (s) => s.reason ?? '—' },
  ];

  return (
    <div>
      <div className="ac-bar">
        <span className="ac-bar__title">Upcoming substitutions</span>
        {canWrite && (
          <div className="ac-bell-actions">
            <Button variant="gold" size="sm" leftIcon="user" onClick={() => setAbsentFlow(true)} disabled={sections.length === 0}>
              Mark teacher absent
            </Button>
            <Button variant="ghost" size="sm" leftIcon="plus" onClick={openAdd} disabled={sections.length === 0}>
              Manual
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns} rows={rows} rowKey={(s) => s.id} loading={loading}
        error={error ? 'Could not load substitutions.' : null}
        emptyIcon="refresh" emptyTitle="No upcoming substitutions"
        emptyMessage={sections.length === 0 ? 'Set up sections first, then arrange cover for absent teachers.' : 'Mark a teacher absent to auto-arrange cover, or add one manually.'}
        actions={canWrite ? (s) => <Button variant="ghost" size="sm" leftIcon="x" onClick={() => setRemoving(s)} aria-label="Remove">Remove</Button> : undefined}
      />

      {/* ===== Manual add ===== */}
      <Modal open={adding} onClose={() => setAdding(false)} icon="refresh" tone="gold"
        title="Add substitution" size="sm" dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!date || !sectionId || !substitute} onClick={save}>Save</Button>
          </>
        }>
        <div className="grid g-2">
          <Field label="Date" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Period" required><Select value={periodNo} onChange={(e) => setPeriodNo(e.target.value)} options={periodOptions} /></Field>
        </div>
        <Field label="Section" required>
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="Select section" options={sectionOptions} />
        </Field>
        <Field label="Absent teacher" optional>
          <Select value={absent} onChange={(e) => setAbsent(e.target.value)} options={staffOptions(staff)} />
        </Field>
        <Field label="Substitute teacher" required>
          <Select value={substitute} onChange={(e) => setSubstitute(e.target.value)} options={staffOptions(staff, '— Select —')} />
        </Field>
        <Field label="Reason" optional>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Sick leave, official duty…" autoResize />
        </Field>
      </Modal>

      {/* ===== Intelligent "mark absent" flow ===== */}
      <AbsentFlow
        open={absentFlow}
        onClose={() => setAbsentFlow(false)}
        staff={staff}
        allSlots={allSlots}
        existingSubs={subs}
        sectionLabel={sectionLabel}
        periodLabel={periodLabel}
      />

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Remove substitution?" message="This cover arrangement will be deleted." confirmLabel="Remove" />
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* "Mark a teacher absent" — auto-detect slots + suggest substitutes        */
/* ----------------------------------------------------------------------- */

function AbsentFlow({
  open, onClose, staff, allSlots, existingSubs, sectionLabel, periodLabel,
}: {
  open: boolean;
  onClose: () => void;
  staff: TeacherLike[];
  allSlots: TimetableSlot[];
  existingSubs: Substitution[];
  sectionLabel: (id: string) => string;
  periodLabel: (no: number) => string;
}) {
  const { schoolId } = useSession();
  const actor = useActor();
  const toast = useToast();

  const [date, setDate] = useState(todayISO());
  const [absent, setAbsent] = useState('');
  const [reason, setReason] = useState('');
  // Per-slot assignment state: slotId → substitute uid, plus "saving"/"done" flags.
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [savingSlot, setSavingSlot] = useState<string | null>(null);

  const day = weekdayOf(date);
  const affected = useMemo(
    () => (absent ? affectedSlotsFor(absent, day, allSlots) : []),
    [absent, day, allSlots],
  );

  // Slots already covered (same date+period+section) so we don't double-book.
  const dateMs = new Date(`${date}T00:00:00`).getTime();
  const coveredKey = useMemo(() => {
    const s = new Set<string>();
    for (const sub of existingSubs) {
      if (sub.date === dateMs) s.add(`${sub.sectionId}_${sub.periodNo}`);
    }
    return s;
  }, [existingSubs, dateMs]);

  const reset = () => {
    setDate(todayISO()); setAbsent(''); setReason(''); setAssigned({}); setSavingSlot(null);
  };
  const close = () => { reset(); onClose(); };

  const assign = async (slot: TimetableSlot, subUid: string, subName?: string) => {
    if (!schoolId) return;
    // Guard against booking the same substitute into two classes at once.
    const clash = findSubstituteConflict(
      { date: dateMs, periodNo: slot.periodNo, sectionId: slot.sectionId, substituteTeacherUid: subUid },
      existingSubs,
    );
    if (clash) {
      toast.error('Substitute already booked', `${subName ?? staffName(staff, subUid) ?? 'This teacher'} is already covering ${clash.sectionName ?? 'another class'} this period.`);
      return;
    }
    setSavingSlot(slot.id);
    try {
      await createSubstitution(schoolId, {
        schoolId,
        date: dateMs,
        day,
        periodNo: slot.periodNo,
        sectionId: slot.sectionId,
        sectionName: slot.sectionName ?? sectionLabel(slot.sectionId),
        absentTeacherUid: absent || undefined,
        absentTeacherName: staffName(staff, absent),
        substituteTeacherUid: subUid,
        substituteTeacherName: subName ?? staffName(staff, subUid),
        subjectName: slot.subjectName,
        reason: reason.trim() || undefined,
      }, actor);
      setAssigned((a) => ({ ...a, [slot.id]: subUid }));
      toast.success(`Cover arranged for ${periodLabel(slot.periodNo)}`);
    } catch { toast.error('Could not arrange cover'); } finally { setSavingSlot(null); }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon="user"
      tone="gold"
      title="Mark a teacher absent"
      description="Pick the teacher and date — NEXLI finds their classes and suggests free staff to cover."
      size="md"
      dismissible={!savingSlot}
      footer={<Button variant="gold" leftIcon="check" onClick={close}>Done</Button>}
    >
      <div className="grid g-2">
        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Absent teacher" required>
          <Select value={absent} onChange={(e) => setAbsent(e.target.value)} options={staffOptions(staff, '— Select —')} />
        </Field>
      </div>
      <Field label="Reason" optional>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sick leave, official duty…" />
      </Field>

      {!absent ? (
        <EmptyState icon="user" title="Select a teacher" message="Choose the absent teacher to see the classes that need cover." />
      ) : affected.length === 0 ? (
        <EmptyState icon="check-circle" title="Nothing to cover"
          message={`This teacher has no scheduled classes on ${WEEKDAYS.find((w) => w.id === day)?.label}.`} />
      ) : (
        <div className="ac-sub-slots">
          <div className="ac-sub-slots__head">
            {affected.length} {affected.length === 1 ? 'class' : 'classes'} need cover
          </div>
          {affected.map((slot) => (
            <SlotCover
              key={slot.id}
              slot={slot}
              day={day}
              dateMs={dateMs}
              absentUid={absent}
              staff={staff}
              allSlots={allSlots}
              existingSubs={existingSubs}
              periodLabel={periodLabel}
              sectionLabel={sectionLabel}
              alreadyCovered={coveredKey.has(`${slot.sectionId}_${slot.periodNo}`)}
              assignedUid={assigned[slot.id]}
              saving={savingSlot === slot.id}
              disabledAll={!!savingSlot && savingSlot !== slot.id}
              onAssign={(uid, name) => assign(slot, uid, name)}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

function SlotCover({
  slot, day, dateMs, absentUid, staff, allSlots, existingSubs, periodLabel, sectionLabel,
  alreadyCovered, assignedUid, saving, disabledAll, onAssign,
}: {
  slot: TimetableSlot;
  day: Weekday;
  dateMs: number;
  absentUid: string;
  staff: TeacherLike[];
  allSlots: TimetableSlot[];
  existingSubs: Substitution[];
  periodLabel: (no: number) => string;
  sectionLabel: (id: string) => string;
  alreadyCovered: boolean;
  assignedUid?: string;
  saving: boolean;
  disabledAll: boolean;
  onAssign: (uid: string, name?: string) => void;
}) {
  const suggestions: SubSuggestion[] = useMemo(
    () =>
      suggestSubstitutes({ day, periodNo: slot.periodNo }, absentUid, staff, allSlots)
        // Also drop anyone already pulled into another class this exact date+period
        // (the timetable check can't see substitutions). Keeps the chips truthful.
        .filter(
          (s) =>
            !findSubstituteConflict(
              { date: dateMs, periodNo: slot.periodNo, sectionId: slot.sectionId, substituteTeacherUid: s.teacher.id },
              existingSubs,
            ),
        ),
    [day, slot.periodNo, slot.sectionId, dateMs, absentUid, staff, allSlots, existingSubs],
  );

  const top = suggestions.slice(0, 3);
  const done = !!assignedUid;
  const assignedName = assignedUid ? staff.find((s) => s.id === assignedUid)?.name : undefined;

  return (
    <div className={`ac-sub-slot${done ? ' is-done' : ''}`}>
      <div className="ac-sub-slot__meta">
        <span className="ac-sub-slot__period">{periodLabel(slot.periodNo)}</span>
        <span className="ac-sub-slot__section">
          {slot.sectionName ?? sectionLabel(slot.sectionId)}{slot.subjectName ? ` · ${slot.subjectName}` : ''}
        </span>
      </div>

      {done ? (
        <div className="ac-sub-slot__assigned">
          <Icon name="check-circle" size={15} />
          <span>Covered by <strong>{assignedName ?? 'substitute'}</strong></span>
        </div>
      ) : alreadyCovered ? (
        <Badge variant="info">Already covered</Badge>
      ) : suggestions.length === 0 ? (
        <span className="ac-sub-slot__none">No free teacher this period — assign manually.</span>
      ) : (
        <div className="ac-sub-slot__suggest">
          {top.map((s, i) => (
            <button
              key={s.teacher.id}
              type="button"
              className={`ac-sub-chip${i === 0 ? ' is-best' : ''}`}
              disabled={disabledAll || saving}
              onClick={() => onAssign(s.teacher.id, s.teacher.name)}
            >
              {i === 0 && <span className="ac-sub-chip__best" aria-hidden="true"><Icon name="check" size={12} /></span>}
              <span className="ac-sub-chip__name">{s.teacher.name ?? 'Unnamed'}</span>
              <span className="ac-sub-chip__load">{s.loadThatDay === 0 ? 'free all day' : `${s.loadThatDay}/day`}</span>
            </button>
          ))}
          {saving && <Spinner size={16} />}
        </div>
      )}
    </div>
  );
}
