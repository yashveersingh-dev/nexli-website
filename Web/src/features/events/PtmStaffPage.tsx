import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Input, Select, Textarea, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useGrades, useSections } from '@/features/school/data';
import { formatDate } from '@/lib/format';
import {
  usePtmMeetings, usePtmBookings, createPtmMeeting, slotAvailability, newSlotId,
  type PtmMeeting, type PtmSlot, type PtmBooking,
} from './ptm';
import './events.css';

/**
 * Staff-facing PTM scheduling (Events hub → "Parent meetings"). Staff create a
 * meeting with bookable slots and view the per-meeting roster. Operate access is
 * gated on the events module ownership (same as the rest of the hub).
 */
export function PtmStaffPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('events');
  const { data: meetings, loading, error } = usePtmMeetings(schoolId);
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => meetings.slice().sort((a, b) => b.date - a.date), [meetings]);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <button type="button" className="nx-formpage__back" style={{ marginBottom: 10 }} onClick={() => navigate('/events')} aria-label="Back to events"><Icon name="chevron-left" size={18} /></button>
          <h1 className="nx-page__title">Parent-teacher meetings</h1>
          <p className="nx-page__sub">{loading ? 'Loading…' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</p>
        </div>
        {canOperate && <Button variant="gold" leftIcon="plus" onClick={() => setOpen(true)}>New PTM</Button>}
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      {loading ? (
        <div className="grid g-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={150} radius={12} />)}</div>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Could not load meetings" message="Check your connection and try again." />
      ) : sorted.length === 0 ? (
        <Panel><EmptyState icon="calendar" title="No PTMs scheduled"
          message={canOperate ? 'Create a parent-teacher meeting with time slots parents can book.' : 'Meetings scheduled by staff will appear here.'}
          action={canOperate ? <Button variant="gold" leftIcon="plus" onClick={() => setOpen(true)}>New PTM</Button> : undefined} /></Panel>
      ) : (
        <div className="grid g-2">
          {sorted.map((m) => <MeetingCard key={m.id} meeting={m} schoolId={schoolId} onOpen={() => navigate(`/events/ptm/${m.id}`)} />)}
        </div>
      )}

      {open && <PtmFormModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function MeetingCard({ meeting, schoolId, onOpen }: { meeting: PtmMeeting; schoolId?: string; onOpen: () => void }) {
  const { data: bookings } = usePtmBookings(schoolId, meeting.id);
  const avail = slotAvailability(meeting, bookings);
  const booked = avail.reduce((n, a) => n + a.booked, 0);
  const capacity = meeting.slots.reduce((n, s) => n + (s.capacity ?? 0), 0);
  return (
    <Panel title={meeting.title} sub={formatDate(meeting.date, 'ddd, DD MMM YYYY')} headerRight={<Badge variant="muted">{meeting.slots.length} slots</Badge>}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}><Icon name="users" size={13} /> {booked} booked{capacity ? ` of ${capacity}` : ''}</span>
        {meeting.note && <span style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.note}</span>}
      </div>
      <Button variant="subtle" size="sm" leftIcon="clipboard" onClick={onOpen}>View roster</Button>
    </Panel>
  );
}

/* ---------------- Roster (per meeting) ---------------- */
export function PtmRosterPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { data: meetings, loading } = usePtmMeetings(schoolId);
  const meeting = meetings.find((m) => m.id === id);
  const { data: bookings, loading: bLoading } = usePtmBookings(schoolId, id);

  if (loading) return <div className="nx-page"><Skeleton height={300} /></div>;
  if (!meeting) return <div className="nx-page"><EmptyState icon="calendar" title="Meeting not found" action={<Button variant="subtle" onClick={() => navigate('/events/ptm')}>Back</Button>} /></div>;

  const active = bookings.filter((b) => b.status === 'booked');
  const avail = slotAvailability(meeting, bookings);

  const columns: Column<PtmBooking>[] = [
    { key: 'student', header: 'Student', primary: true, render: (b) => <span style={{ fontWeight: 600 }}>{b.studentName}</span> },
    { key: 'slot', header: 'Slot', render: (b) => b.slotTime ?? meeting.slots.find((s) => s.id === b.slotId)?.time ?? '—' },
    { key: 'parent', header: 'Booked by', hideOnMobile: true, render: (b) => b.parentName },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <button type="button" className="nx-formpage__back" style={{ marginBottom: 10 }} onClick={() => navigate('/events/ptm')} aria-label="Back to PTMs"><Icon name="chevron-left" size={18} /></button>
          <h1 className="nx-page__title">{meeting.title}</h1>
          <p className="nx-page__sub">{formatDate(meeting.date, 'ddd, DD MMM YYYY')} · {active.length} booked</p>
        </div>
      </div>

      <Panel title="Slot availability" sub={`${meeting.slots.length} slots`}>
        <div className="nx-chips">
          {avail.map((a) => (
            <span key={a.slot.id} className="nx-chip" style={{ cursor: 'default' }}>
              <Icon name="clock" size={12} /> {a.slot.time} · {a.booked}/{a.slot.capacity || '∞'}
              {a.full && <Badge variant="warning">Full</Badge>}
            </span>
          ))}
        </div>
      </Panel>

      <DataTable
        columns={columns}
        rows={active.slice().sort((a, b) => (a.slotTime ?? '').localeCompare(b.slotTime ?? ''))}
        rowKey={(b) => b.id}
        loading={bLoading}
        emptyIcon="users"
        emptyTitle="No bookings yet"
        emptyMessage="Parent bookings for this meeting will appear here."
      />
    </div>
  );
}

/* ---------------- Create modal ---------------- */
function PtmFormModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [note, setNote] = useState('');
  const [slots, setSlots] = useState<PtmSlot[]>([{ id: newSlotId(), time: '', capacity: 1 }]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sectionOptions = useMemo(
    () => sections.filter((s) => !gradeId || s.gradeId === gradeId).map((s) => ({ value: s.id, label: s.name })),
    [sections, gradeId],
  );

  const setSlot = (id: string, patch: Partial<PtmSlot>) => setSlots((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addSlot = () => setSlots((arr) => [...arr, { id: newSlotId(), time: '', capacity: 1 }]);
  const removeSlot = (id: string) => setSlots((arr) => (arr.length > 1 ? arr.filter((s) => s.id !== id) : arr));

  const submit = async () => {
    setErr(null);
    if (!schoolId) return;
    if (title.trim().length < 2) return setErr('Enter a meeting title.');
    if (!date) return setErr('Pick a meeting date.');
    const cleanSlots = slots
      .map((s) => ({ ...s, time: s.time.trim(), capacity: Math.max(0, Math.floor(Number(s.capacity) || 0)) }))
      .filter((s) => s.time);
    if (cleanSlots.length === 0) return setErr('Add at least one time slot.');
    if (cleanSlots.some((s) => s.capacity <= 0)) return setErr('Each slot needs a capacity of at least 1.');

    setBusy(true);
    try {
      const grade = grades.find((g) => g.id === gradeId);
      const section = sections.find((s) => s.id === sectionId);
      const payload: Omit<PtmMeeting, 'id'> = {
        schoolId,
        title: title.trim(),
        date: new Date(`${date}T00:00:00`).getTime(),
        gradeId: grade?.id,
        sectionId: section?.id,
        slots: cleanSlots,
        note: note.trim() || undefined,
        createdByUid: uid ?? 'unknown',
        createdByName: member?.name,
      };
      await createPtmMeeting(schoolId, payload, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('PTM scheduled', title.trim());
      onClose();
    } catch {
      toast.error('Could not schedule', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Schedule a PTM" icon="calendar" tone="gold" size="lg"
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="gold" onClick={submit} loading={busy}>Schedule</Button></>}>
      {err && <p className="nx-field__error" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Term 1 Parent-Teacher Meeting" /></Field>
        <div className="nx-section__grid">
          <Field label="Date" required><DatePicker value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Grade (optional)"><Select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setSectionId(''); }} placeholder="All grades" options={grades.map((g) => ({ value: g.id, label: g.name }))} /></Field>
          <Field label="Section (optional)"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="All sections" options={sectionOptions} /></Field>
        </div>

        <Field label="Time slots" hint="Each slot is bookable up to its capacity.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <DatePicker mode="time" value={s.time} onChange={(e) => setSlot(s.id, { time: e.target.value })} aria-label={`Slot ${i + 1} time`} />
                <Input type="number" min={1} value={String(s.capacity)} onChange={(e) => setSlot(s.id, { capacity: Number(e.target.value) })} aria-label={`Slot ${i + 1} capacity`} style={{ maxWidth: 110 }} />
                <button type="button" className="nx-guardian__remove" onClick={() => removeSlot(s.id)} aria-label={`Remove slot ${i + 1}`} disabled={slots.length === 1}><Icon name="x" size={14} /></button>
              </div>
            ))}
            <Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={addSlot}>Add slot</Button>
          </div>
        </Field>

        <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything parents should know" /></Field>
      </div>
    </Modal>
  );
}
