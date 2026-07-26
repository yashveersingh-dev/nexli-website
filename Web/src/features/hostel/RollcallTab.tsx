import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Field, Select, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/cn';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useHostelBlocks, useHostelAllocations, useRollcall, saveRollcall } from '@/features/ops/data';
import { ROLLCALL_STATUS_META } from '@/features/ops/meta';
import { useHostelScope } from './scope';
import type { RollcallSession, RollcallStatus } from '@/types/ops';

const STATUSES: RollcallStatus[] = ['present', 'absent', 'leave', 'infirmary'];
const SESSION_OPTIONS: { value: RollcallSession; label: string }[] = [
  { value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }, { value: 'night', label: 'Night' },
];
const today = () => new Date().toISOString().slice(0, 10);

export function RollcallTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('hostel').canOperate;

  const { data: allBlocks } = useHostelBlocks(schoolId);
  const { data: students } = useStudents(schoolId);
  const { data: allocations } = useHostelAllocations(schoolId);

  // Block-scope: a warden may only take rollcall for their own block(s).
  const { blockIds, seesAll } = useHostelScope();
  const blocks = useMemo(
    () => (seesAll ? allBlocks : allBlocks.filter((b) => blockIds.has(b.id))),
    [allBlocks, seesAll, blockIds],
  );

  const [blockId, setBlockId] = useState('');
  const [date, setDate] = useState(today());
  const [session, setSession] = useState<RollcallSession>('night');
  const { data: existing, loading: existingLoading } = useRollcall(schoolId, blockId || undefined, date, session);

  const [entries, setEntries] = useState<Record<string, RollcallStatus>>({});
  const [saving, setSaving] = useState(false);

  const roster = useMemo(() => {
    if (!blockId) return [];
    const ids = new Set(allocations.filter((a) => a.blockId === blockId && a.active !== false).map((a) => a.studentId));
    return students.filter((s) => ids.has(s.id))
      .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }, [students, allocations, blockId]);

  // Stable roster identity (sorted ids). A same-size boarder swap changes this key
  // but not roster.length, so depending on length would seed under the wrong
  // studentId; depend on the key instead.
  const rosterKey = useMemo(() => roster.map((s) => s.id).join(','), [roster]);

  // Seed entries when block/date/session/existing changes (existing marks, else all present).
  useEffect(() => {
    if (!blockId) { setEntries({}); return; }
    const seed: Record<string, RollcallStatus> = {};
    for (const s of roster) seed[s.id] = existing?.entries?.[s.id] ?? 'present';
    setEntries(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, date, session, existing, rosterKey]);

  const counts = useMemo(() => {
    const c: Record<RollcallStatus, number> = { present: 0, absent: 0, leave: 0, infirmary: 0 };
    for (const st of Object.values(entries)) c[st]++;
    return c;
  }, [entries]);

  const allPresent = () => {
    const next: Record<string, RollcallStatus> = {};
    for (const s of roster) next[s.id] = 'present';
    setEntries(next);
  };

  const save = async () => {
    if (!schoolId || !blockId) return;
    setSaving(true);
    try {
      const block = blocks.find((b) => b.id === blockId);
      await saveRollcall(schoolId, {
        schoolId, blockId, blockName: block?.name, date, session,
        entries, presentCount: counts.present, total: roster.length,
      }, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Rollcall saved', `${counts.present}/${roster.length} present`);
    } catch {
      toast.error('Could not save', 'It will sync when you are back online.');
    } finally { setSaving(false); }
  };

  const unaccounted = counts.absent;

  return (
    <div>
      <Panel>
        <div className="nx-section__grid">
          <Field label="Block"><Select value={blockId} onChange={(e) => setBlockId(e.target.value)} placeholder="Select a block"
            options={blocks.map((b) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="Date"><DatePicker value={date} onChange={(e) => setDate(e.target.value)} max={today()} /></Field>
          <Field label="Session"><Select value={session} onChange={(e) => setSession(e.target.value as RollcallSession)} options={SESSION_OPTIONS} /></Field>
        </div>
        {session === 'night' && blockId && (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon name="shield-check" size={13} /> Night rollcall — every boarder must be accounted for before lights-out.
          </p>
        )}
      </Panel>

      {!blockId ? (
        <Panel><EmptyState icon="clock" title="Pick a block" message="Choose a hostel block to take its rollcall." /></Panel>
      ) : existingLoading ? (
        <Panel><Skeleton height={280} /></Panel>
      ) : roster.length === 0 ? (
        <Panel><EmptyState icon="users" title="No boarders in this block" message="Allocate students to this block to take a rollcall." /></Panel>
      ) : (
        <>
          {unaccounted > 0 && (
            <div className="ops-sos" role="alert">
              <span className="ops-sos__icon"><Icon name="alert-triangle" size={20} /></span>
              <div>
                <div className="ops-sos__title">{unaccounted} unaccounted</div>
                <div className="ops-sos__meta">Mark each absent boarder as on-leave or in the infirmary, or escalate immediately.</div>
              </div>
            </div>
          )}

          <div className="nx-att-summary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map((st) => counts[st] > 0 && (
                <span key={st} className="badge" style={{ borderColor: ROLLCALL_STATUS_META[st].color, color: ROLLCALL_STATUS_META[st].color }}>
                  {counts[st]} {ROLLCALL_STATUS_META[st].label}
                </span>
              ))}
            </div>
            {canWrite && <Button variant="subtle" size="sm" leftIcon="check-circle" onClick={allPresent}>All present</Button>}
          </div>

          <Panel bodyClassName="ops-roster">
            {roster.map((s) => (
              <div className="ops-roster__row" key={s.id}>
                <Avatar name={s.fullName} src={s.photoUrl} size={32} />
                <span className="ops-roster__name">{s.fullName}{s.gradeName ? <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}> · {s.gradeName}</span> : null}</span>
                <div className="ops-seg" role="group" aria-label={`Rollcall status for ${s.fullName}`}>
                  {STATUSES.map((st) => {
                    const m = ROLLCALL_STATUS_META[st];
                    const isActive = entries[s.id] === st;
                    return (
                      <button key={st} type="button" title={m.label} aria-pressed={isActive} disabled={!canWrite}
                        className={cn('ops-seg__btn', isActive && 'is-active')}
                        style={isActive ? { background: m.color } : undefined}
                        onClick={() => canWrite && setEntries((e) => ({ ...e, [s.id]: st }))}>
                        {m.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Panel>

          {canWrite && (
            <div className="nx-savebar">
              <div className="nx-savebar__inner">
                <div className="nx-savebar__left"><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{counts.present}/{roster.length} present{existing?.takenAt ? ' · saved' : ''}</span></div>
                <div className="nx-savebar__right"><Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save rollcall</Button></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
