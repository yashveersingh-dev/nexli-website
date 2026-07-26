import { useMemo, useState } from 'react';
import { useSession, useCan } from '@/app/providers/SessionProvider';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { Icon, type IconName } from '@/components/Icon';
import {
  useGrades, useSections, useSubjects, useHouses, useRooms, useStaff,
  createGrade, updateGrade, deleteGrade,
  createSection, updateSection, deleteSection,
  createSubject, updateSubject, deleteSubject,
  createHouse, updateHouse, deleteHouse,
  createRoom, updateRoom, deleteRoom,
} from '@/features/school/data';
import { SUBJECT_TYPE_OPTIONS, ROOM_TYPE_OPTIONS, HOUSE_COLORS } from '@/features/school/meta';
import type { Grade, Section } from '@/types/models';
import type { Subject, House, Room } from '@/types/academics';
import { useActor, staffOptions, staffName } from './shared';
import { BellScheduleEditor } from './BellScheduleEditor';

type EntityKey = 'grades' | 'sections' | 'subjects' | 'houses' | 'rooms' | 'bell';

const SEGMENTS: { key: EntityKey; label: string; icon: IconName }[] = [
  { key: 'grades', label: 'Grades', icon: 'award' },
  { key: 'sections', label: 'Sections', icon: 'users' },
  { key: 'subjects', label: 'Subjects', icon: 'book' },
  { key: 'houses', label: 'Houses', icon: 'home' },
  { key: 'rooms', label: 'Rooms', icon: 'building' },
  { key: 'bell', label: 'Bell schedule', icon: 'clock' },
];

export function StructureTab() {
  const [seg, setSeg] = useState<EntityKey>('grades');

  return (
    <div>
      <div className="ac-seg" role="tablist" aria-label="Academic structure entity">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={seg === s.key}
            className={`ac-seg__btn${seg === s.key ? ' is-active' : ''}`}
            onClick={() => setSeg(s.key)}
          >
            <Icon name={s.icon} size={15} />
            {s.label}
          </button>
        ))}
      </div>

      {seg === 'grades' && <GradesManager />}
      {seg === 'sections' && <SectionsManager />}
      {seg === 'subjects' && <SubjectsManager />}
      {seg === 'houses' && <HousesManager />}
      {seg === 'rooms' && <RoomsManager />}
      {seg === 'bell' && <BellScheduleEditor />}
    </div>
  );
}

/* ---- Shared header bar ---- */
function ManagerBar({ title, canWrite, onAdd, addLabel }: { title: string; canWrite: boolean; onAdd: () => void; addLabel: string }) {
  return (
    <div className="ac-bar">
      <span className="ac-bar__title">{title}</span>
      {canWrite && <Button variant="gold" size="sm" leftIcon="plus" onClick={onAdd}>{addLabel}</Button>}
    </div>
  );
}

/* ---- Color picker ---- */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="ac-colors" role="radiogroup" aria-label="Colour">
      {HOUSE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          className={`ac-colors__sw${value === c ? ' is-active' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

/* ======================================================================= */
/* GRADES                                                                   */
/* ======================================================================= */
function GradesManager() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();
  const { data: grades, loading, error } = useGrades(schoolId);

  const [editing, setEditing] = useState<Grade | null | undefined>(undefined); // undefined=closed, null=new
  const [removing, setRemoving] = useState<Grade | null>(null);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('1');
  const [busy, setBusy] = useState(false);

  const open = (g: Grade | null) => {
    setEditing(g);
    setName(g?.name ?? '');
    setOrder(String(g?.order ?? grades.length + 1));
  };

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), order: Number(order) || 0 };
      if (editing) await updateGrade(schoolId, editing.id, payload, actor);
      else await createGrade(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Grade updated' : 'Grade added');
      setEditing(undefined);
    } catch { toast.error('Could not save grade'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteGrade(schoolId, removing.id, actor); toast.success('Grade deleted'); setRemoving(null); }
    catch { toast.error('Could not delete grade'); } finally { setBusy(false); }
  };

  const rows = useMemo(() => grades.slice().sort((a, b) => a.order - b.order), [grades]);
  const columns: Column<Grade>[] = [
    { key: 'name', header: 'Grade', primary: true, render: (g) => <span style={{ fontWeight: 600 }}>{g.name}</span> },
    { key: 'order', header: 'Order', render: (g) => g.order },
  ];

  return (
    <>
      <ManagerBar title="Grades" canWrite={canWrite} onAdd={() => open(null)} addLabel="Add grade" />
      <DataTable
        columns={columns} rows={rows} rowKey={(g) => g.id} loading={loading}
        error={error ? 'Could not load grades.' : null}
        emptyIcon="award" emptyTitle="No grades yet" emptyMessage="Add your first grade (e.g. Class 1) to build the academic structure."
        actions={canWrite ? (g) => <RowActions onEdit={() => open(g)} onDelete={() => setRemoving(g)} /> : undefined}
      />

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="award" tone="gold"
        title={editing ? 'Edit grade' : 'Add grade'} size="sm" dismissible={!busy}
        footer={<ModalFooter onCancel={() => setEditing(undefined)} onSave={save} busy={busy} disabled={!name.trim()} />}>
        <div className="grid g-2">
          <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class 6" autoFocus /></Field>
          <Field label="Order" hint="Sort position"><Input type="number" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} /></Field>
        </div>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete grade?" message={`"${removing?.name}" will be removed. Sections under it are not deleted automatically.`} confirmLabel="Delete" />
    </>
  );
}

/* ======================================================================= */
/* SECTIONS                                                                  */
/* ======================================================================= */
function SectionsManager() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();
  const { data: grades } = useGrades(schoolId);
  const { data: sections, loading, error } = useSections(schoolId);
  const { data: staff } = useStaff(schoolId);

  const [editing, setEditing] = useState<Section | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Section | null>(null);
  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [teacher, setTeacher] = useState('');
  const [busy, setBusy] = useState(false);

  const gradeName = (id: string) => grades.find((g) => g.id === id)?.name;

  const open = (s: Section | null) => {
    setEditing(s);
    setName(s?.name ?? '');
    setGradeId(s?.gradeId ?? grades[0]?.id ?? '');
    setTeacher(s?.classTeacherUid ?? '');
  };

  const save = async () => {
    if (!schoolId || !name.trim() || !gradeId) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(), gradeId,
        gradeName: gradeName(gradeId),
        classTeacherUid: teacher || undefined,
      };
      if (editing) await updateSection(schoolId, editing.id, payload, actor);
      else await createSection(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Section updated' : 'Section added');
      setEditing(undefined);
    } catch { toast.error('Could not save section'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteSection(schoolId, removing.id, actor); toast.success('Section deleted'); setRemoving(null); }
    catch { toast.error('Could not delete section'); } finally { setBusy(false); }
  };

  const rows = useMemo(
    () => sections.slice().sort((a, b) =>
      (gradeName(a.gradeId) ?? '').localeCompare(gradeName(b.gradeId) ?? '') || a.name.localeCompare(b.name)),
    [sections, grades],
  );

  const columns: Column<Section>[] = [
    { key: 'name', header: 'Section', primary: true, render: (s) => <span style={{ fontWeight: 600 }}>{gradeName(s.gradeId) ?? '—'} · {s.name}</span> },
    { key: 'grade', header: 'Grade', render: (s) => gradeName(s.gradeId) ?? '—' },
    { key: 'teacher', header: 'Class teacher', render: (s) => staffName(staff, s.classTeacherUid) ?? '—' },
  ];

  if (grades.length === 0 && !loading) {
    return <NeedsSetup icon="award" title="Set up grades first" message="Sections belong to a grade. Add at least one grade before creating sections." />;
  }

  return (
    <>
      <ManagerBar title="Sections" canWrite={canWrite} onAdd={() => open(null)} addLabel="Add section" />
      <DataTable
        columns={columns} rows={rows} rowKey={(s) => s.id} loading={loading}
        error={error ? 'Could not load sections.' : null}
        emptyIcon="users" emptyTitle="No sections yet" emptyMessage="Add a section (e.g. A, B, Rose) under a grade."
        actions={canWrite ? (s) => <RowActions onEdit={() => open(s)} onDelete={() => setRemoving(s)} /> : undefined}
      />

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="users" tone="gold"
        title={editing ? 'Edit section' : 'Add section'} size="sm" dismissible={!busy}
        footer={<ModalFooter onCancel={() => setEditing(undefined)} onSave={save} busy={busy} disabled={!name.trim() || !gradeId} />}>
        <Field label="Grade" required>
          <Select value={gradeId} onChange={(e) => setGradeId(e.target.value)} placeholder="Select grade"
            options={grades.slice().sort((a, b) => a.order - b.order).map((g) => ({ value: g.id, label: g.name }))} />
        </Field>
        <Field label="Section name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A" autoFocus /></Field>
        <Field label="Class teacher" optional>
          <Select value={teacher} onChange={(e) => setTeacher(e.target.value)} options={staffOptions(staff)} />
        </Field>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete section?" message={`This section will be removed. Timetable slots for it are not cleared automatically.`} confirmLabel="Delete" />
    </>
  );
}

/* ======================================================================= */
/* SUBJECTS                                                                  */
/* ======================================================================= */
function SubjectsManager() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();
  const { data: subjects, loading, error } = useSubjects(schoolId);

  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<Subject['type']>('core');
  const [color, setColor] = useState(HOUSE_COLORS[2]);
  const [busy, setBusy] = useState(false);

  const open = (s: Subject | null) => {
    setEditing(s);
    setName(s?.name ?? '');
    setCode(s?.code ?? '');
    setType(s?.type ?? 'core');
    setColor(s?.color ?? HOUSE_COLORS[2]);
  };

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), code: code.trim() || undefined, type, color };
      if (editing) await updateSubject(schoolId, editing.id, payload, actor);
      else await createSubject(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Subject updated' : 'Subject added');
      setEditing(undefined);
    } catch { toast.error('Could not save subject'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteSubject(schoolId, removing.id, actor); toast.success('Subject deleted'); setRemoving(null); }
    catch { toast.error('Could not delete subject'); } finally { setBusy(false); }
  };

  const typeLabel = (t: string) => SUBJECT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
  const rows = useMemo(() => subjects.slice().sort((a, b) => a.name.localeCompare(b.name)), [subjects]);
  const columns: Column<Subject>[] = [
    {
      key: 'name', header: 'Subject', primary: true,
      render: (s) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="ac-swatch" style={{ background: s.color ?? 'var(--border)' }} />
          <span style={{ fontWeight: 600 }}>{s.name}</span>
        </span>
      ),
    },
    { key: 'code', header: 'Code', render: (s) => s.code ?? '—' },
    { key: 'type', header: 'Type', render: (s) => <Badge variant="muted">{typeLabel(s.type)}</Badge> },
  ];

  return (
    <>
      <ManagerBar title="Subjects" canWrite={canWrite} onAdd={() => open(null)} addLabel="Add subject" />
      <DataTable
        columns={columns} rows={rows} rowKey={(s) => s.id} loading={loading}
        error={error ? 'Could not load subjects.' : null}
        emptyIcon="book" emptyTitle="No subjects yet" emptyMessage="Add subjects taught at your school (e.g. Mathematics, English)."
        actions={canWrite ? (s) => <RowActions onEdit={() => open(s)} onDelete={() => setRemoving(s)} /> : undefined}
      />

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="book" tone="gold"
        title={editing ? 'Edit subject' : 'Add subject'} size="sm" dismissible={!busy}
        footer={<ModalFooter onCancel={() => setEditing(undefined)} onSave={save} busy={busy} disabled={!name.trim()} />}>
        <div className="grid g-2">
          <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" autoFocus /></Field>
          <Field label="Code" optional><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH" /></Field>
        </div>
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value as Subject['type'])} options={SUBJECT_TYPE_OPTIONS} />
        </Field>
        <Field label="Colour"><ColorPicker value={color} onChange={setColor} /></Field>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete subject?" message={`"${removing?.name}" will be removed.`} confirmLabel="Delete" />
    </>
  );
}

/* ======================================================================= */
/* HOUSES                                                                    */
/* ======================================================================= */
function HousesManager() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();
  const { data: houses, loading, error } = useHouses(schoolId);
  const { data: staff } = useStaff(schoolId);

  const [editing, setEditing] = useState<House | null | undefined>(undefined);
  const [removing, setRemoving] = useState<House | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(HOUSE_COLORS[0]);
  const [motto, setMotto] = useState('');
  const [master, setMaster] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (h: House | null) => {
    setEditing(h);
    setName(h?.name ?? '');
    setColor(h?.color ?? HOUSE_COLORS[0]);
    setMotto(h?.motto ?? '');
    setMaster(h?.masterUid ?? '');
  };

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(), color, motto: motto.trim() || undefined,
        masterUid: master || undefined, masterName: staffName(staff, master),
      };
      if (editing) await updateHouse(schoolId, editing.id, payload, actor);
      else await createHouse(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'House updated' : 'House added');
      setEditing(undefined);
    } catch { toast.error('Could not save house'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteHouse(schoolId, removing.id, actor); toast.success('House deleted'); setRemoving(null); }
    catch { toast.error('Could not delete house'); } finally { setBusy(false); }
  };

  const rows = useMemo(() => houses.slice().sort((a, b) => a.name.localeCompare(b.name)), [houses]);
  const columns: Column<House>[] = [
    {
      key: 'name', header: 'House', primary: true,
      render: (h) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="ac-swatch ac-swatch--lg" style={{ background: h.color }} />
          <span style={{ fontWeight: 600 }}>{h.name}</span>
        </span>
      ),
    },
    { key: 'motto', header: 'Motto', truncate: true, render: (h) => h.motto ?? '—' },
    { key: 'master', header: 'House master', render: (h) => staffName(staff, h.masterUid) ?? '—' },
  ];

  return (
    <>
      <ManagerBar title="Houses" canWrite={canWrite} onAdd={() => open(null)} addLabel="Add house" />
      <DataTable
        columns={columns} rows={rows} rowKey={(h) => h.id} loading={loading}
        error={error ? 'Could not load houses.' : null}
        emptyIcon="home" emptyTitle="No houses yet" emptyMessage="Add school houses (e.g. Red, Blue) for inter-house activities."
        actions={canWrite ? (h) => <RowActions onEdit={() => open(h)} onDelete={() => setRemoving(h)} /> : undefined}
      />

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="home" tone="gold"
        title={editing ? 'Edit house' : 'Add house'} size="sm" dismissible={!busy}
        footer={<ModalFooter onCancel={() => setEditing(undefined)} onSave={save} busy={busy} disabled={!name.trim()} />}>
        <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aravali" autoFocus /></Field>
        <Field label="Colour" required><ColorPicker value={color} onChange={setColor} /></Field>
        <Field label="Motto" optional><Input value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Strength & honour" /></Field>
        <Field label="House master" optional>
          <Select value={master} onChange={(e) => setMaster(e.target.value)} options={staffOptions(staff)} />
        </Field>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete house?" message={`"${removing?.name}" will be removed.`} confirmLabel="Delete" />
    </>
  );
}

/* ======================================================================= */
/* ROOMS                                                                     */
/* ======================================================================= */
function RoomsManager() {
  const { schoolId } = useSession();
  const canWrite = useCan('academics.write');
  const actor = useActor();
  const toast = useToast();
  const { data: rooms, loading, error } = useRooms(schoolId);

  const [editing, setEditing] = useState<Room | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Room['type']>('classroom');
  const [capacity, setCapacity] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (r: Room | null) => {
    setEditing(r);
    setName(r?.name ?? '');
    setType(r?.type ?? 'classroom');
    setCapacity(r?.capacity != null ? String(r.capacity) : '');
    setBuilding(r?.building ?? '');
    setFloor(r?.floor ?? '');
  };

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(), type,
        capacity: capacity ? Number(capacity) : undefined,
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
      };
      if (editing) await updateRoom(schoolId, editing.id, payload, actor);
      else await createRoom(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Room updated' : 'Room added');
      setEditing(undefined);
    } catch { toast.error('Could not save room'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteRoom(schoolId, removing.id, actor); toast.success('Room deleted'); setRemoving(null); }
    catch { toast.error('Could not delete room'); } finally { setBusy(false); }
  };

  const typeLabel = (t: string) => ROOM_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
  const rows = useMemo(() => rooms.slice().sort((a, b) => a.name.localeCompare(b.name)), [rooms]);
  const columns: Column<Room>[] = [
    { key: 'name', header: 'Room', primary: true, render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge variant="muted">{typeLabel(r.type)}</Badge> },
    { key: 'capacity', header: 'Capacity', render: (r) => r.capacity ?? '—' },
    { key: 'location', header: 'Location', hideOnMobile: true, render: (r) => [r.building, r.floor].filter(Boolean).join(' · ') || '—' },
  ];

  return (
    <>
      <ManagerBar title="Rooms" canWrite={canWrite} onAdd={() => open(null)} addLabel="Add room" />
      <DataTable
        columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading}
        error={error ? 'Could not load rooms.' : null}
        emptyIcon="building" emptyTitle="No rooms yet" emptyMessage="Add classrooms, labs and other spaces used in the timetable."
        actions={canWrite ? (r) => <RowActions onEdit={() => open(r)} onDelete={() => setRemoving(r)} /> : undefined}
      />

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="building" tone="gold"
        title={editing ? 'Edit room' : 'Add room'} size="sm" dismissible={!busy}
        footer={<ModalFooter onCancel={() => setEditing(undefined)} onSave={save} busy={busy} disabled={!name.trim()} />}>
        <div className="grid g-2">
          <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room 101" autoFocus /></Field>
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as Room['type'])} options={ROOM_TYPE_OPTIONS} />
          </Field>
        </div>
        <div className="grid g-3">
          <Field label="Capacity" optional><Input type="number" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="40" /></Field>
          <Field label="Building" optional><Input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Block A" /></Field>
          <Field label="Floor" optional><Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Ground" /></Field>
        </div>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete room?" message={`"${removing?.name}" will be removed.`} confirmLabel="Delete" />
    </>
  );
}

/* ---- Small shared bits ---- */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <Button variant="ghost" size="sm" leftIcon="edit" onClick={onEdit} aria-label="Edit">Edit</Button>
      <Button variant="ghost" size="sm" leftIcon="x" onClick={onDelete} aria-label="Delete">Delete</Button>
    </>
  );
}

function ModalFooter({ onCancel, onSave, busy, disabled }: { onCancel: () => void; onSave: () => void; busy: boolean; disabled: boolean }) {
  return (
    <>
      <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button variant="gold" leftIcon="check" loading={busy} disabled={disabled} onClick={onSave}>Save</Button>
    </>
  );
}

function NeedsSetup({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <div className="nx-empty">
      <div className="nx-empty__icon"><Icon name={icon} size={24} /></div>
      <div className="nx-empty__title">{title}</div>
      <div className="nx-empty__msg">{message}</div>
    </div>
  );
}
