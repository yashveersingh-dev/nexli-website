import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { KPICard } from '@/components/KPICard';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, Textarea, DatePicker, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useHostelAllocations } from '@/features/ops/data';
import {
  useDietProfiles, saveDietProfile, deleteDietProfile,
  useMessMenu, saveMessMenu, type Actor,
} from './data';
import { useHostelScope } from './scope';
import { DIET_PREFERENCE_META, DIET_PREFERENCE_OPTIONS, MESS_MEALS, MESS_MEAL_META } from './meta';
import { dietSchema } from './hostelSchema';
import type { DietProfile, DietPreference, MessMealType } from '@/types/ops';

const today = () => new Date().toISOString().slice(0, 10);

export function MessTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('hostel').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { blockIds, seesAll } = useHostelScope();

  const { data: students } = useStudents(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);
  const { data: diets, loading: dietsLoading } = useDietProfiles(schoolId);

  // Menu day
  const [menuDate, setMenuDate] = useState(today());
  const { data: menu } = useMessMenu(schoolId, menuDate);

  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  // Diet modal state
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [preference, setPreference] = useState<DietPreference>('veg');
  const [noOG, setNoOG] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [dietNotes, setDietNotes] = useState('');
  const [del, setDel] = useState<DietProfile | null>(null);

  // Menu modal state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<Record<MessMealType, string>>({ breakfast: '', lunch: '', snacks: '', dinner: '' });
  const [menuNotes, setMenuNotes] = useState('');

  // Boarders scoped to the warden's block(s).
  const boarders = useMemo(() => {
    const active = allocations.filter((a) => a.active !== false && (seesAll || !a.blockId || blockIds.has(a.blockId)));
    return active.map((a) => ({ alloc: a, student: students.find((s) => s.id === a.studentId) }))
      .sort((a, b) => (a.alloc.studentName ?? '').localeCompare(b.alloc.studentName ?? ''));
  }, [allocations, students, seesAll, blockIds]);

  const dietByStudent = useMemo(() => {
    const m = new Map<string, DietProfile>();
    for (const d of diets) m.set(d.studentId, d);
    return m;
  }, [diets]);

  const scopedDiets = useMemo(
    () => diets.filter((d) => seesAll || !d.blockId || blockIds.has(d.blockId)),
    [diets, seesAll, blockIds],
  );

  const kpis = useMemo(() => {
    let veg = 0, jain = 0, allergy = 0;
    for (const d of scopedDiets) {
      if (d.preference === 'veg' || d.preference === 'vegan' || d.preference === 'jain') veg++;
      if (d.preference === 'jain' || d.noOnionGarlic) jain++;
      if (d.allergies && d.allergies.trim()) allergy++;
    }
    return { veg, jain, allergy };
  }, [scopedDiets]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return boarders.filter(({ alloc }) => (needle ? alloc.studentName.toLowerCase().includes(needle) : true));
  }, [boarders, q]);

  const openDiet = (b: { alloc: typeof boarders[number]['alloc'] }) => {
    const existing = dietByStudent.get(b.alloc.studentId);
    setStudentId(b.alloc.studentId);
    setPreference(existing?.preference ?? 'veg');
    setNoOG(existing?.noOnionGarlic ?? false);
    setAllergies(existing?.allergies ?? '');
    setDietNotes(existing?.notes ?? '');
    setOpen(true);
  };

  const saveDiet = async () => {
    if (!schoolId || !studentId) return;
    const parsed = dietSchema.safeParse({ studentId, preference, noOnionGarlic: noOG, allergies, notes: dietNotes });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    const alloc = allocations.find((a) => a.studentId === studentId && a.active !== false);
    setBusy(true);
    try {
      await saveDietProfile(schoolId, {
        schoolId, studentId,
        studentName: alloc?.studentName ?? 'Boarder',
        blockId: alloc?.blockId, blockName: alloc?.blockName,
        preference, noOnionGarlic: noOG,
        allergies: allergies.trim() || undefined,
        notes: dietNotes.trim() || undefined,
      }, actor);
      toast.success('Dietary profile saved', alloc?.studentName);
      setOpen(false);
    } catch { toast.error('Could not save'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !del) return;
    setBusy(true);
    try { await deleteDietProfile(schoolId, del.studentId, actor); toast.success('Dietary profile cleared', del.studentName); setDel(null); }
    catch { toast.error('Could not clear'); } finally { setBusy(false); }
  };

  const openMenu = () => {
    setMenuItems({
      breakfast: menu?.meals.find((m) => m.type === 'breakfast')?.items ?? '',
      lunch: menu?.meals.find((m) => m.type === 'lunch')?.items ?? '',
      snacks: menu?.meals.find((m) => m.type === 'snacks')?.items ?? '',
      dinner: menu?.meals.find((m) => m.type === 'dinner')?.items ?? '',
    });
    setMenuNotes(menu?.notes ?? '');
    setMenuOpen(true);
  };

  const saveMenu = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await saveMessMenu(schoolId, {
        schoolId, date: menuDate,
        meals: MESS_MEALS.map((type) => ({ type, items: menuItems[type].trim() })).filter((m) => m.items),
        notes: menuNotes.trim() || undefined,
      }, actor);
      toast.success('Mess menu saved', menuDate);
      setMenuOpen(false);
    } catch { toast.error('Could not save menu'); } finally { setBusy(false); }
  };

  return (
    <div>
      {!seesAll && (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="info" size={13} /> Showing dietary profiles for your block only.
        </p>
      )}

      <div className="nx-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard icon="utensils" label="Veg / Jain / Vegan" count={kpis.veg} />
        <KPICard icon="alert-triangle" label="No onion-garlic" count={kpis.jain} />
        <KPICard icon="heart-pulse" label="With allergies" count={kpis.allergy} delta={kpis.allergy > 0 ? { value: 'Mess must know', dir: 'muted' } : undefined} />
      </div>

      {/* Daily mess menu */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <strong style={{ fontSize: 14, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="utensils" size={15} /> Daily mess menu</strong>
          <DatePicker value={menuDate} onChange={(e) => setMenuDate(e.target.value)} aria-label="Menu date" />
          {canWrite && <Button variant="subtle" size="sm" leftIcon="edit" onClick={openMenu}>{menu ? 'Edit menu' : 'Set menu'}</Button>}
        </div>
        {!menu || menu.meals.length === 0 ? (
          <EmptyState icon="utensils" title="No menu set" message={canWrite ? 'Set today’s mess menu so boarders and the kitchen are aligned.' : 'The mess menu for this day has not been set.'} />
        ) : (
          <div className="hostel-rooms">
            {MESS_MEALS.map((type) => {
              const meal = menu.meals.find((m) => m.type === type);
              if (!meal) return null;
              return (
                <div key={type} className="hostel-room" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{MESS_MEAL_META[type].label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{meal.items}</div>
                </div>
              );
            })}
          </div>
        )}
        {menu?.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{menu.notes}</p>}
      </Panel>

      {/* Dietary roster */}
      <div className="nx-toolbar" style={{ marginTop: 16 }}>
        <div className="nx-toolbar__search">
          <Input leftIcon="search" placeholder="Search boarder…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search boarders" />
        </div>
      </div>

      {dietsLoading ? (
        <Skeleton height={200} />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="users" title={q ? 'No matching boarders' : 'No boarders'} message={q ? 'Try a different search.' : 'Allocate boarders to record their dietary needs.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map(({ alloc, student }) => {
            const d = dietByStudent.get(alloc.studentId);
            return (
              <Panel key={alloc.studentId}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar name={alloc.studentName} src={student?.photoUrl} size={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alloc.studentName}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                      {d ? <>
                        <Badge variant={DIET_PREFERENCE_META[d.preference].variant}>{DIET_PREFERENCE_META[d.preference].label}</Badge>
                        {d.noOnionGarlic && <Badge variant="warning">No onion-garlic</Badge>}
                        {d.allergies && <Badge variant="danger">Allergy</Badge>}
                      </> : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No dietary profile</span>}
                    </div>
                    {d?.allergies && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 3 }}>Allergy: {d.allergies}</div>}
                    {d?.notes && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{d.notes}</div>}
                  </div>
                  {canWrite && <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit diet for ${alloc.studentName}`} onClick={() => openDiet({ alloc })} />
                    {d && <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Clear diet for ${alloc.studentName}`} onClick={() => setDel(d)} />}
                  </div>}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Diet modal */}
      <Modal open={open} onClose={() => setOpen(false)} icon="utensils" tone="gold" title="Dietary profile" size="md" dismissible={!busy}
        description={boarders.find((b) => b.alloc.studentId === studentId)?.alloc.studentName}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} onClick={saveDiet}>Save</Button>
        </>}>
        <Field label="Preference" required><Select value={preference} onChange={(e) => setPreference(e.target.value as DietPreference)} options={DIET_PREFERENCE_OPTIONS} /></Field>
        <Field label="No onion / garlic"><Toggle checked={noOG} onChange={setNoOG} aria-label="No onion or garlic" /></Field>
        <Field label="Allergies" optional hint="Comma-separated — surfaced to the mess in red."><Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. peanuts, lactose" /></Field>
        <Field label="Notes" optional><Textarea value={dietNotes} onChange={(e) => setDietNotes(e.target.value)} rows={2} placeholder="Any other dietary need" /></Field>
      </Modal>

      {/* Menu modal */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} icon="utensils" tone="gold" title="Mess menu" description={menuDate} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setMenuOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} onClick={saveMenu}>Save menu</Button>
        </>}>
        {MESS_MEALS.map((type) => (
          <Field key={type} label={MESS_MEAL_META[type].label} optional>
            <Input value={menuItems[type]} onChange={(e) => setMenuItems((m) => ({ ...m, [type]: e.target.value }))} placeholder={`${MESS_MEAL_META[type].label} items`} />
          </Field>
        ))}
        <Field label="Notes" optional><Textarea value={menuNotes} onChange={(e) => setMenuNotes(e.target.value)} rows={2} placeholder="Festival special, etc." /></Field>
      </Modal>

      <ConfirmModal open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Clear dietary profile?" message={del ? `${del.studentName}'s dietary profile will be removed.` : ''} confirmLabel="Clear" />
    </div>
  );
}
