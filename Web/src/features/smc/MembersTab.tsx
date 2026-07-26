import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, DatePicker, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useSmcMembers, createSmcMember, updateSmcMember, deleteSmcMember, type Actor } from '@/features/compliance/data';
import { SMC_ROLE_OPTIONS } from '@/features/compliance/meta';
import { SMC_ROLE_META, computeComposition } from './smcMeta';
import type { SmcMember, SmcRole } from '@/types/compliance';

const iso = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');
const ROLE_ORDER = (Object.keys(SMC_ROLE_META) as SmcRole[]).sort((a, b) => SMC_ROLE_META[a].order - SMC_ROLE_META[b].order);

export function MembersTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: members, loading, error } = useSmcMembers(schoolId);

  const [editing, setEditing] = useState<SmcMember | null | undefined>(undefined);
  const [removing, setRemoving] = useState<SmcMember | null>(null);
  const [busy, setBusy] = useState(false);
  // form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<SmcRole>('parent');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [isChairperson, setIsChairperson] = useState(false);
  const [termFrom, setTermFrom] = useState('');
  const [termTo, setTermTo] = useState('');
  const [active, setActive] = useState(true);

  const composition = useMemo(() => computeComposition(members), [members]);

  const grouped = useMemo(() => {
    const by = new Map<SmcRole, SmcMember[]>();
    for (const m of members) {
      const list = by.get(m.role) ?? [];
      list.push(m);
      by.set(m.role, list);
    }
    return ROLE_ORDER.filter((r) => by.has(r)).map((r) => ({
      role: r,
      meta: SMC_ROLE_META[r],
      list: (by.get(r) ?? []).sort((a, b) => Number(b.isChairperson ?? false) - Number(a.isChairperson ?? false) || a.name.localeCompare(b.name)),
    }));
  }, [members]);

  const open = (m: SmcMember | null) => {
    setEditing(m);
    setName(m?.name ?? '');
    setRole(m?.role ?? 'parent');
    setPhone(m?.phone ?? '');
    setDesignation(m?.designation ?? '');
    setIsChairperson(m?.isChairperson ?? false);
    setTermFrom(iso(m?.termFrom));
    setTermTo(iso(m?.termTo));
    setActive(m?.active ?? true);
  };

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    const payload = {
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      designation: designation.trim() || undefined,
      isChairperson: isChairperson || undefined,
      termFrom: termFrom ? new Date(`${termFrom}T00:00:00`).getTime() : undefined,
      termTo: termTo ? new Date(`${termTo}T00:00:00`).getTime() : undefined,
      active,
    };
    try {
      if (editing) await updateSmcMember(schoolId, editing.id, payload, actor);
      else await createSmcMember(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Member updated' : 'Member added', payload.name);
      setEditing(undefined);
    } catch { toast.error('Could not save', 'Please try again.'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteSmcMember(schoolId, removing.id, actor); toast.success('Member removed'); setRemoving(null); }
    catch { toast.error('Could not remove'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 180 }}>
          The statutory School Management Committee roster — parents, teachers and community representatives.
        </p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add member</Button>}
      </div>

      {/* RTE composition hint */}
      {!loading && composition.total > 0 && (
        <div className={`smc-hint ${composition.parentMajorityMet ? 'is-ok' : 'is-warn'}`} role="status" style={{ marginBottom: 16 }}>
          <Icon name={composition.parentMajorityMet ? 'check-circle' : 'info'} size={16} />
          <span>
            <strong>{composition.parents}</strong> of <strong>{composition.total}</strong> members are parent / guardian representatives ({composition.parentPct}%).{' '}
            {composition.parentMajorityMet
              ? 'Meets the RTE §21(b) expectation of a three-fourths parent committee.'
              : 'RTE §21(b) expects parents / guardians to be at least 75% — add more parent representatives.'}
            {!composition.hasChairperson && ' No chairperson is designated yet.'}
          </span>
        </div>
      )}

      {loading ? (
        <Skeleton height={240} />
      ) : error ? (
        <Panel><EmptyState icon="info" title="Could not load the committee" message="Please try again." /></Panel>
      ) : members.length === 0 ? (
        <Panel>
          <EmptyState
            icon="users"
            title="No committee members yet"
            message={canWrite ? 'Add parents, teachers and community members to constitute the SMC.' : 'Committee members will appear here.'}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add member</Button> : undefined}
          />
        </Panel>
      ) : (
        <div className="smc-roster">
          {grouped.map(({ role: r, meta, list }) => (
            <section key={r} className="smc-group" aria-label={meta.label}>
              <div className="smc-group__head">
                <Icon name={meta.icon} size={15} />
                <h3 className="smc-group__title">{meta.label}</h3>
                <span className="smc-group__count">{list.length}</span>
              </div>
              <div className="grid g-2">
                {list.map((m) => (
                  <div key={m.id} className={`smc-card ${m.isChairperson ? 'is-chair' : ''} ${m.active === false ? 'is-inactive' : ''}`}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="smc-card__name">
                        {m.name}
                        {m.isChairperson && <span className="smc-card__chair"><Icon name="crown" size={12} /> Chairperson</span>}
                        {m.active === false && <Badge variant="muted">Inactive</Badge>}
                      </div>
                      <div className="smc-card__meta">
                        {m.designation ? `${m.designation} · ` : ''}{SMC_ROLE_META[m.role].label}
                        {m.phone ? ` · ${m.phone}` : ''}
                      </div>
                      {(m.termFrom || m.termTo) && (
                        <div className="smc-card__term">
                          Term {m.termFrom ? formatDate(m.termFrom) : '—'} → {m.termTo ? formatDate(m.termTo) : 'present'}
                        </div>
                      )}
                    </div>
                    {canWrite && (
                      <div className="smc-card__actions">
                        <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${m.name}`} onClick={() => open(m)} />
                        <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        icon="user"
        tone="gold"
        title={editing ? 'Edit member' : 'Add member'}
        size="md"
        dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!name.trim()} onClick={save}>Save</Button>
        </>}
      >
        <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunita Sharma" autoFocus /></Field>
        <div className="grid g-2">
          <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value as SmcRole)} options={SMC_ROLE_OPTIONS} /></Field>
          <Field label="Designation" optional><Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Member, Secretary…" /></Field>
        </div>
        <div className="grid g-2">
          <Field label="Phone" optional><Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="+91…" /></Field>
          <Field label="Active"><Toggle checked={active} onChange={setActive} label={active ? 'Currently serving' : 'Not serving'} /></Field>
        </div>
        <div className="grid g-2">
          <Field label="Term from" optional><DatePicker value={termFrom} onChange={(e) => setTermFrom(e.target.value)} /></Field>
          <Field label="Term to" optional><DatePicker value={termTo} onChange={(e) => setTermTo(e.target.value)} /></Field>
        </div>
        <Field label="Chairperson"><Toggle checked={isChairperson} onChange={setIsChairperson} label="Designate as committee chairperson" /></Field>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Remove member?"
        message={removing ? `"${removing.name}" will be removed from the committee roster.` : ''}
        confirmLabel="Remove"
      />
    </div>
  );
}
