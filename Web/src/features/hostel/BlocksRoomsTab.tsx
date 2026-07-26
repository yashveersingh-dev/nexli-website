import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/cn';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import {
  useHostelBlocks, createHostelBlock, updateHostelBlock, deleteHostelBlock,
  useHostelRooms, createHostelRoom, updateHostelRoom, deleteHostelRoom,
  useHostelAllocations, type Actor,
} from '@/features/ops/data';
import { HOSTEL_TYPE_OPTIONS } from '@/features/ops/meta';
import type { BadgeVariant } from '@/components/Badge';
import type { HostelBlock, HostelRoom, HostelType } from '@/types/ops';
import { blockSchema, roomSchema } from './hostelSchema';

const typeLabel = (t: HostelType) => HOSTEL_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
const typeVariant = (t: HostelType): BadgeVariant => (t === 'boys' ? 'info' : t === 'girls' ? 'warning' : 'muted');

/** Occupancy meter + count. */
function Meter({ occupied, capacity }: { occupied: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;
  const full = capacity > 0 && occupied >= capacity;
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div className="ops-meter" role="progressbar" aria-valuenow={occupied} aria-valuemin={0} aria-valuemax={capacity} aria-label={`Occupancy ${occupied} of ${capacity}`}>
        <div className="ops-meter__fill" style={{ width: `${pct}%`, background: full ? 'var(--danger)' : pct >= 85 ? 'var(--warning)' : 'var(--gold)' }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{occupied}/{capacity} beds{full ? ' · full' : ''}</div>
    </div>
  );
}

export function BlocksRoomsTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('hostel').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: blocks, loading } = useHostelBlocks(schoolId);
  const { data: rooms } = useHostelRooms(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);

  const [expanded, setExpanded] = useState<string | null>(null);

  // Block modal state
  const [blockEdit, setBlockEdit] = useState<HostelBlock | null | undefined>(undefined); // undefined=closed, null=new
  const [bName, setBName] = useState(''); const [bType, setBType] = useState<HostelType>('boys');
  const [bWarden, setBWarden] = useState(''); const [bPhone, setBPhone] = useState('');
  const [bFloors, setBFloors] = useState(''); const [bCap, setBCap] = useState('');
  const [blockDel, setBlockDel] = useState<HostelBlock | null>(null);

  // Room modal state
  const [roomCtx, setRoomCtx] = useState<{ block: HostelBlock; room: HostelRoom | null } | null>(null);
  const [rNum, setRNum] = useState(''); const [rFloor, setRFloor] = useState(''); const [rCap, setRCap] = useState('2');
  const [roomDel, setRoomDel] = useState<HostelRoom | null>(null);
  const [busy, setBusy] = useState(false);

  const roomsByBlock = useMemo(() => {
    const m = new Map<string, HostelRoom[]>();
    for (const r of rooms) { const list = m.get(r.blockId) ?? []; list.push(r); m.set(r.blockId, list); }
    for (const list of m.values()) list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    return m;
  }, [rooms]);

  // Live occupancy from active allocations (defends against drift in stored counts).
  const occByRoom = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of allocations) if (a.active !== false) m.set(a.roomId, (m.get(a.roomId) ?? 0) + 1);
    return m;
  }, [allocations]);
  const roomOcc = (r: HostelRoom) => occByRoom.get(r.id) ?? r.occupied ?? 0;

  const openBlock = (b: HostelBlock | null) => {
    setBlockEdit(b);
    setBName(b?.name ?? ''); setBType(b?.type ?? 'boys'); setBWarden(b?.wardenName ?? '');
    setBPhone(b?.wardenPhone ?? ''); setBFloors(b?.floors != null ? String(b.floors) : ''); setBCap(b?.capacity != null ? String(b.capacity) : '');
  };

  const saveBlock = async () => {
    if (!schoolId) return;
    const parsed = blockSchema.safeParse({ name: bName, type: bType, wardenName: bWarden, wardenPhone: bPhone, floors: bFloors, capacity: bCap });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    setBusy(true);
    try {
      const patch = {
        name: bName.trim(), type: bType,
        wardenName: bWarden.trim() || undefined, wardenPhone: bPhone.trim() || undefined,
        floors: bFloors ? Number(bFloors) : undefined, capacity: bCap ? Number(bCap) : undefined,
      };
      if (blockEdit) await updateHostelBlock(schoolId, blockEdit.id, patch, actor);
      else await createHostelBlock(schoolId, { schoolId, ...patch }, actor);
      toast.success(blockEdit ? 'Block updated' : 'Block added', patch.name);
      setBlockEdit(undefined);
    } catch { toast.error('Could not save block'); } finally { setBusy(false); }
  };

  const confirmDeleteBlock = async () => {
    if (!schoolId || !blockDel) return;
    setBusy(true);
    try {
      await deleteHostelBlock(schoolId, blockDel.id, actor);
      toast.success('Block removed', blockDel.name);
      setBlockDel(null);
    } catch { toast.error('Could not remove block'); } finally { setBusy(false); }
  };

  const openRoom = (block: HostelBlock, room: HostelRoom | null) => {
    setRoomCtx({ block, room });
    setRNum(room?.number ?? ''); setRFloor(room?.floor != null ? String(room.floor) : ''); setRCap(room?.capacity != null ? String(room.capacity) : '2');
  };

  const saveRoom = async () => {
    if (!schoolId || !roomCtx) return;
    const parsed = roomSchema.safeParse({ number: rNum, floor: rFloor, capacity: rCap });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    setBusy(true);
    try {
      const { block, room } = roomCtx;
      const patch = { number: rNum.trim(), floor: rFloor ? Number(rFloor) : undefined, capacity: Number(rCap) };
      if (room) await updateHostelRoom(schoolId, room.id, patch, actor);
      else await createHostelRoom(schoolId, { schoolId, blockId: block.id, blockName: block.name, ...patch, occupied: 0 }, actor);
      toast.success(room ? 'Room updated' : 'Room added', `Room ${patch.number}`);
      setRoomCtx(null);
    } catch { toast.error('Could not save room'); } finally { setBusy(false); }
  };

  const confirmDeleteRoom = async () => {
    if (!schoolId || !roomDel) return;
    setBusy(true);
    try {
      await deleteHostelRoom(schoolId, roomDel.id, actor);
      toast.success('Room removed', `Room ${roomDel.number}`);
      setRoomDel(null);
    } catch { toast.error('Could not remove room'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Hostel blocks, rooms and live bed occupancy.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => openBlock(null)}>Add block</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : blocks.length === 0 ? (
        <Panel><EmptyState icon="building" title="No hostel blocks yet" message={canWrite ? 'Add a block to start setting up rooms and allocations.' : 'Blocks will appear here once configured.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {blocks.map((b) => {
            const blockRooms = roomsByBlock.get(b.id) ?? [];
            const occ = blockRooms.reduce((s, r) => s + roomOcc(r), 0);
            const cap = blockRooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
            const open = expanded === b.id;
            return (
              <Panel key={b.id} className="hostel-block">
                <button type="button" className="hostel-block__head" aria-expanded={open} onClick={() => setExpanded(open ? null : b.id)}>
                  <span className="hostel-block__chev"><Icon name="chevron-right" size={16} className={cn(open && 'hostel-block__chev--open')} /></span>
                  <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{b.name}</span>
                      <Badge variant={typeVariant(b.type)}>{typeLabel(b.type)}</Badge>
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {blockRooms.length} room{blockRooms.length === 1 ? '' : 's'}
                      {b.wardenName ? ` · Warden ${b.wardenName}` : ''}
                      {b.floors ? ` · ${b.floors} floor${b.floors === 1 ? '' : 's'}` : ''}
                    </span>
                  </span>
                  <Meter occupied={occ} capacity={cap} />
                </button>

                {open && (
                  <div className="hostel-block__body">
                    {canWrite && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        <Button variant="subtle" size="sm" leftIcon="plus" onClick={() => openRoom(b, null)}>Add room</Button>
                        <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => openBlock(b)}>Edit block</Button>
                        <Button variant="ghost" size="sm" leftIcon="minus-circle" onClick={() => setBlockDel(b)}>Delete</Button>
                      </div>
                    )}
                    {blockRooms.length === 0 ? (
                      <EmptyState icon="home" title="No rooms" message={canWrite ? 'Add the first room to this block.' : undefined} />
                    ) : (
                      <div className="hostel-rooms">
                        {blockRooms.map((r) => (
                          <div key={r.id} className="hostel-room">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Room {r.number}{r.floor != null ? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · Floor {r.floor}</span> : null}</div>
                              <Meter occupied={roomOcc(r)} capacity={r.capacity ?? 0} />
                            </div>
                            {canWrite && (
                              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit room ${r.number}`} onClick={() => openRoom(b, r)} />
                                <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Delete room ${r.number}`} onClick={() => setRoomDel(r)} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {/* Block modal */}
      <Modal open={blockEdit !== undefined} onClose={() => setBlockEdit(undefined)} icon="building" tone="gold"
        title={blockEdit ? 'Edit block' : 'Add block'} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setBlockEdit(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={bName.trim().length < 2} onClick={saveBlock}>Save</Button>
        </>}>
        <Field label="Block name" required><Input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="e.g. Tagore House" autoFocus /></Field>
        <Field label="Type" required><Select value={bType} onChange={(e) => setBType(e.target.value as HostelType)} options={HOSTEL_TYPE_OPTIONS} /></Field>
        <div className="nx-section__grid">
          <Field label="Warden name" optional><Input value={bWarden} onChange={(e) => setBWarden(e.target.value)} placeholder="In-charge" /></Field>
          <Field label="Warden phone" optional><Input value={bPhone} onChange={(e) => setBPhone(e.target.value)} inputMode="numeric" maxLength={10} placeholder="10-digit mobile" /></Field>
          <Field label="Floors" optional><Input value={bFloors} onChange={(e) => setBFloors(e.target.value)} inputMode="numeric" placeholder="e.g. 3" /></Field>
          <Field label="Capacity" optional><Input value={bCap} onChange={(e) => setBCap(e.target.value)} inputMode="numeric" placeholder="Total beds" /></Field>
        </div>
      </Modal>

      {/* Room modal */}
      <Modal open={roomCtx !== null} onClose={() => setRoomCtx(null)} icon="home" tone="gold"
        title={roomCtx?.room ? 'Edit room' : 'Add room'} description={roomCtx ? roomCtx.block.name : undefined} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setRoomCtx(null)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!rNum.trim() || !rCap} onClick={saveRoom}>Save</Button>
        </>}>
        <div className="nx-section__grid">
          <Field label="Room number" required><Input value={rNum} onChange={(e) => setRNum(e.target.value)} placeholder="e.g. 101" autoFocus /></Field>
          <Field label="Floor" optional><Input value={rFloor} onChange={(e) => setRFloor(e.target.value)} inputMode="numeric" placeholder="e.g. 1" /></Field>
          <Field label="Capacity (beds)" required><Input value={rCap} onChange={(e) => setRCap(e.target.value)} inputMode="numeric" placeholder="e.g. 2" /></Field>
        </div>
      </Modal>

      <ConfirmModal open={!!blockDel} onClose={() => setBlockDel(null)} onConfirm={confirmDeleteBlock} tone="danger" loading={busy}
        title="Delete block?" message={blockDel ? `${blockDel.name} and its room layout will be removed. Existing allocations are not deleted — deallocate students first.` : ''} confirmLabel="Delete block" />
      <ConfirmModal open={!!roomDel} onClose={() => setRoomDel(null)} onConfirm={confirmDeleteRoom} tone="danger" loading={busy}
        title="Delete room?" message={roomDel ? `Room ${roomDel.number} will be removed.` : ''} confirmLabel="Delete room" />
    </div>
  );
}
