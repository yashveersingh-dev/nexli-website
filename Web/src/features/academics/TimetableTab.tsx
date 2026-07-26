import { useMemo, useState } from 'react';
import { useSession, useCan } from '@/app/providers/SessionProvider';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Field, Select } from '@/components/form';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  useSections, useGrades, useSubjects, useRooms, useStaff, useTimetable, useAllTimetable,
  setTimetableSlot, deleteTimetableSlot,
} from '@/features/school/data';
import { WEEKDAYS, type Weekday, type TimetableSlot, type PeriodDef } from '@/types/academics';
import { useActor, staffOptions, staffName } from './shared';
import {
  useBellSchedule, detectClashes, clashSentence, type Clash, type ProposedSlot,
} from './bellSchedule';

const slotKey = (sectionId: string, day: Weekday, periodNo: number) => `${sectionId}_${day}_${periodNo}`;

/** A pending save awaiting conflict confirmation. */
interface PendingSave {
  id: string;
  clashes: Clash[];
  /** The actual write to run when confirmed (or run immediately when no clash). */
  commit: () => Promise<void>;
}

export function TimetableTab() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();

  const { data: grades } = useGrades(schoolId);
  const { data: sections, loading: secLoading } = useSections(schoolId);
  const { data: subjects } = useSubjects(schoolId);
  const { data: rooms } = useRooms(schoolId);
  const { data: staff } = useStaff(schoolId);
  const { periods } = useBellSchedule(schoolId);

  // Whole-school timetable — drives cross-section clash detection.
  const { data: allSlots } = useAllTimetable(schoolId);

  const [sectionId, setSectionId] = useState('');
  const [activeDay, setActiveDay] = useState<Weekday>('mon');

  // Editor modal state
  const [editing, setEditing] = useState<{ day: Weekday; period: PeriodDef } | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [teacher, setTeacher] = useState('');
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  // Conflict-alert modal state
  const [pending, setPending] = useState<PendingSave | null>(null);

  const { data: slots, loading: ttLoading } = useTimetable(schoolId, sectionId || undefined);

  const gradeName = (id: string) => grades.find((g) => g.id === id)?.name;
  const sortedSections = useMemo(
    () => sections.slice().sort((a, b) =>
      (gradeName(a.gradeId) ?? '').localeCompare(gradeName(b.gradeId) ?? '') || a.name.localeCompare(b.name)),
    [sections, grades],
  );
  const sectionOptions = sortedSections.map((s) => ({ value: s.id, label: `${gradeName(s.gradeId) ?? '—'} · ${s.name}` }));

  // index slots by `${day}_${periodNo}`
  const slotMap = useMemo(() => {
    const m = new Map<string, TimetableSlot>();
    for (const s of slots) m.set(`${s.day}_${s.periodNo}`, s);
    return m;
  }, [slots]);
  const getSlot = (day: Weekday, periodNo: number) => slotMap.get(`${day}_${periodNo}`);

  // Live conflict scan for the *current* section's slots against the whole school.
  const sectionConflicts = useMemo(() => {
    if (!sectionId) return new Map<string, Clash[]>();
    const out = new Map<string, Clash[]>();
    for (const s of slots) {
      const clashes = detectClashes(
        { id: s.id, sectionId: s.sectionId, day: s.day, periodNo: s.periodNo, teacherUid: s.teacherUid, roomId: s.roomId },
        allSlots,
      ).filter((c) => c.kind !== 'section'); // a section never double-books itself in its own grid
      if (clashes.length) out.set(`${s.day}_${s.periodNo}`, clashes);
    }
    return out;
  }, [sectionId, slots, allSlots]);

  const conflictCount = sectionConflicts.size;

  const openEditor = (day: Weekday, period: PeriodDef) => {
    if (!canWrite || period.isBreak) return;
    const existing = getSlot(day, period.no);
    setSubjectId(existing?.subjectId ?? '');
    setTeacher(existing?.teacherUid ?? '');
    setRoomId(existing?.roomId ?? '');
    setEditing({ day, period });
  };

  /** Build the slot payload + the write closure for the current editor state. */
  const buildCommit = () => {
    if (!schoolId || !sectionId || !editing) return null;
    const section = sections.find((s) => s.id === sectionId);
    const { day, period } = editing;
    const id = slotKey(sectionId, day, period.no);

    if (!subjectId && !teacher && !roomId) {
      return {
        id, proposed: null as ProposedSlot | null,
        commit: async () => { await deleteTimetableSlot(schoolId, id, actor); },
        cleared: true,
      };
    }
    const subject = subjects.find((s) => s.id === subjectId);
    const room = rooms.find((r) => r.id === roomId);
    const proposed: ProposedSlot = {
      id, sectionId, day, periodNo: period.no,
      teacherUid: teacher || undefined, roomId: roomId || undefined,
    };
    return {
      id,
      proposed,
      cleared: false,
      commit: async () => {
        await setTimetableSlot(schoolId, id, {
          sectionId, sectionName: section ? `${gradeName(section.gradeId) ?? ''} ${section.name}`.trim() : undefined,
          day, periodNo: period.no,
          subjectId: subjectId || undefined, subjectName: subject?.name,
          teacherUid: teacher || undefined, teacherName: staffName(staff, teacher),
          roomId: roomId || undefined, roomName: room?.name,
        }, actor);
      },
    };
  };

  const save = async () => {
    const built = buildCommit();
    if (!built) return;

    // Clearing a slot can never create a clash → write straight away.
    if (built.cleared || !built.proposed) {
      await runWrite(built.commit, 'Slot cleared');
      return;
    }

    const clashes = detectClashes(built.proposed, allSlots);
    if (clashes.length === 0) {
      await runWrite(built.commit, 'Slot saved');
      return;
    }
    // Surface the conflict; the user may cancel or override.
    setEditing(null);
    setPending({ id: built.id, clashes, commit: built.commit });
  };

  const runWrite = async (commit: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    try {
      await commit();
      toast.success(successMsg);
      setEditing(null);
    } catch { toast.error('Could not save slot'); } finally { setBusy(false); }
  };

  const overridePending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.commit();
      toast.success('Saved with conflict');
      setPending(null);
    } catch { toast.error('Could not save slot'); } finally { setBusy(false); }
  };

  const clearSlot = async () => {
    if (!schoolId || !sectionId || !editing) return;
    setBusy(true);
    try {
      await deleteTimetableSlot(schoolId, slotKey(sectionId, editing.day, editing.period.no), actor);
      toast.success('Slot cleared');
      setEditing(null);
    } catch { toast.error('Could not clear slot'); } finally { setBusy(false); }
  };

  if (secLoading) return <Skeleton height={320} />;
  if (sections.length === 0) {
    return <EmptyState icon="users" title="Set up sections first" message="Create grades and sections in the Structure tab before building a timetable." />;
  }

  return (
    <div>
      <div className="ac-tt-pickrow">
        <Field label="Section">
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="Select a section" options={sectionOptions} />
        </Field>
      </div>

      {!sectionId ? (
        <EmptyState icon="calendar" title="Pick a section" message="Choose a section above to view and edit its weekly timetable." />
      ) : ttLoading ? (
        <Skeleton height={320} />
      ) : (
        <>
          {conflictCount > 0 && (
            <ConflictBanner conflicts={sectionConflicts} periods={periods} />
          )}

          {/* ===== Desktop / tablet grid (≥768px) ===== */}
          <div className="ac-tt-grid">
            <table>
              <thead>
                <tr>
                  <th aria-label="Period" />
                  {WEEKDAYS.map((d) => <th key={d.id} scope="col">{d.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={`${p.no}-${p.label}-${p.startTime}`}>
                    <td className="ac-tt-grid__period" scope="row">
                      <div className="ac-tt-grid__plabel">{p.label}</div>
                      <div className="ac-tt-grid__ptime">{p.startTime}–{p.endTime}</div>
                    </td>
                    {p.isBreak
                      ? <td colSpan={WEEKDAYS.length}><div className="ac-tt-break">{p.label}</div></td>
                      : WEEKDAYS.map((d) => {
                          const slot = getSlot(d.id, p.no);
                          const hasClash = sectionConflicts.has(`${d.id}_${p.no}`);
                          return (
                            <td key={d.id}>
                              <GridCell slot={slot} subjects={subjects} canWrite={canWrite} hasClash={hasClash}
                                onClick={() => openEditor(d.id, p)} />
                            </td>
                          );
                        })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== Mobile per-day list (<768px) ===== */}
          <div className="ac-tt-daylist">
            <div className="ac-day-tabs" role="tablist" aria-label="Day of week">
              {WEEKDAYS.map((d) => (
                <button key={d.id} type="button" role="tab" aria-selected={activeDay === d.id}
                  className={`ac-day-tab${activeDay === d.id ? ' is-active' : ''}`} onClick={() => setActiveDay(d.id)}>
                  {d.short}
                </button>
              ))}
            </div>
            <div className="ac-period-list">
              {periods.map((p) => {
                if (p.isBreak) {
                  return (
                    <div key={`${p.no}-${p.label}-${p.startTime}`} className="ac-period-card ac-period-card--break">
                      <div className="ac-period-card__no">
                        <span className="ac-period-card__time">{p.startTime}</span>
                      </div>
                      <div className="ac-period-card__body"><span className="ac-period-card__subject">{p.label}</span></div>
                    </div>
                  );
                }
                const slot = getSlot(activeDay, p.no);
                const subject = subjects.find((s) => s.id === slot?.subjectId);
                const filled = !!(slot && (slot.subjectId || slot.teacherUid || slot.roomId));
                const hasClash = sectionConflicts.has(`${activeDay}_${p.no}`);
                return (
                  <button key={`${p.no}-${p.label}-${p.startTime}`} type="button"
                    className={`ac-period-card${canWrite ? ' ac-period-card--btn' : ''}${hasClash ? ' ac-period-card--clash' : ''}`}
                    style={filled && subject?.color ? { borderLeftColor: subject.color } : undefined}
                    onClick={() => openEditor(activeDay, p)} disabled={!canWrite}>
                    <div className="ac-period-card__no">
                      <span className="ac-period-card__pno">P{p.no}</span>
                      <span className="ac-period-card__time">{p.startTime}</span>
                    </div>
                    <div className="ac-period-card__body">
                      {filled ? (
                        <>
                          <span className="ac-period-card__subject">
                            {slot?.subjectName ?? 'Untitled'}
                            {hasClash && <span className="ac-clash-tag"><Icon name="alert-triangle" size={12} /> Conflict</span>}
                          </span>
                          <span className="ac-period-card__meta">
                            {[slot?.teacherName, slot?.roomName].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </>
                      ) : (
                        <span className="ac-cell__empty">{canWrite ? 'Tap to add' : 'Free'}</span>
                      )}
                    </div>
                    {canWrite && <span className="ac-period-card__chev"><Icon name="chevron-right" size={16} /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== Slot editor modal ===== */}
      <Modal open={!!editing} onClose={() => setEditing(null)} icon="calendar" tone="gold"
        title={editing ? `${WEEKDAYS.find((d) => d.id === editing.day)?.label} · ${editing.period.label}` : ''}
        description={editing ? `${editing.period.startTime}–${editing.period.endTime}` : undefined}
        size="sm" dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" leftIcon="minus-circle" onClick={clearSlot} disabled={busy}>Clear</Button>
            <Button variant="gold" leftIcon="check" loading={busy} onClick={save}>Save</Button>
          </>
        }>
        <Field label="Subject">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
            options={[{ value: '', label: '— None —' }, ...subjects.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ value: s.id, label: s.name }))]} />
        </Field>
        <Field label="Teacher">
          <Select value={teacher} onChange={(e) => setTeacher(e.target.value)} options={staffOptions(staff)} />
        </Field>
        <Field label="Room">
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}
            options={[{ value: '', label: '— None —' }, ...rooms.slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ value: r.id, label: r.name }))]} />
        </Field>
      </Modal>

      {/* ===== Conflict alert ===== */}
      <ConflictModal
        pending={pending}
        busy={busy}
        onCancel={() => setPending(null)}
        onOverride={overridePending}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Conflict alert modal                                                     */
/* ----------------------------------------------------------------------- */

function ConflictModal({
  pending, busy, onCancel, onOverride,
}: {
  pending: PendingSave | null;
  busy: boolean;
  onCancel: () => void;
  onOverride: () => void;
}) {
  return (
    <Modal
      open={!!pending}
      onClose={onCancel}
      icon="alert-triangle"
      tone="warning"
      title="Timetable Conflict Detected"
      description="Saving this slot creates a scheduling clash. Review the conflicts below, then cancel or override."
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" leftIcon="alert-triangle" loading={busy} onClick={onOverride}>Override &amp; save</Button>
        </>
      }
    >
      <ul className="ac-clash-list">
        {pending?.clashes.map((c, i) => (
          <li key={`${c.kind}-${c.with.id}-${i}`} className="ac-clash-item">
            <span className={`ac-clash-item__icon ac-clash-item__icon--${c.kind}`} aria-hidden="true">
              <Icon name={c.kind === 'teacher' ? 'user' : c.kind === 'room' ? 'building' : 'users'} size={15} />
            </span>
            <span className="ac-clash-item__txt">{clashSentence(c)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* ----------------------------------------------------------------------- */
/* Conflict banner (live indicator for the section grid)                    */
/* ----------------------------------------------------------------------- */

function ConflictBanner({ conflicts, periods }: { conflicts: Map<string, Clash[]>; periods: PeriodDef[] }) {
  const total = conflicts.size;
  const periodLabel = (no: number) => periods.find((p) => p.no === no && !p.isBreak)?.label ?? `Period ${no}`;
  const dayLabel = (d: string) => WEEKDAYS.find((w) => w.id === d)?.short ?? d;
  return (
    <div className="ac-conflict-banner" role="status">
      <span className="ac-conflict-banner__icon" aria-hidden="true"><Icon name="alert-triangle" size={16} /></span>
      <div className="ac-conflict-banner__body">
        <span className="ac-conflict-banner__title">
          {total} scheduling {total === 1 ? 'conflict' : 'conflicts'} in this section
        </span>
        <ul className="ac-conflict-banner__list">
          {[...conflicts.entries()].slice(0, 4).map(([key, list]) => {
            const [day, no] = key.split('_');
            return (
              <li key={key}>
                <strong>{dayLabel(day)} · {periodLabel(Number(no))}:</strong> {clashSentence(list[0])}
              </li>
            );
          })}
          {total > 4 && <li>…and {total - 4} more.</li>}
        </ul>
      </div>
    </div>
  );
}

function GridCell({ slot, subjects, canWrite, hasClash, onClick }: {
  slot?: TimetableSlot; subjects: { id: string; color?: string }[]; canWrite: boolean; hasClash?: boolean; onClick: () => void;
}) {
  const filled = !!(slot && (slot.subjectId || slot.teacherUid || slot.roomId));
  const color = filled ? subjects.find((s) => s.id === slot?.subjectId)?.color : undefined;
  return (
    <button type="button" className={`ac-cell${canWrite ? ' ac-cell--btn' : ''}${hasClash ? ' ac-cell--clash' : ''}`}
      style={color ? { borderLeftColor: color } : undefined} onClick={onClick} disabled={!canWrite}
      aria-label={filled ? `Edit ${slot?.subjectName ?? 'slot'}${hasClash ? ' (has conflict)' : ''}` : 'Add slot'}>
      {filled ? (
        <>
          <span className="ac-cell__subject">
            {slot?.subjectName ?? 'Untitled'}
            {hasClash && <Icon name="alert-triangle" size={12} className="ac-cell__warn" />}
          </span>
          {slot?.teacherName && <span className="ac-cell__meta">{slot.teacherName}</span>}
          {slot?.roomName && <span className="ac-cell__meta">{slot.roomName}</span>}
        </>
      ) : (
        <span className="ac-cell__empty">{canWrite ? '+' : ''}</span>
      )}
    </button>
  );
}
