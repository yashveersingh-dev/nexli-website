import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/feedback';
import { ROLE_GROUPS } from '@/lib/roles/catalog';
import { MODULE_LABEL } from '@/lib/roles/modules';
import { useRoleCatalog, saveRoleDefinition } from '@/lib/roles/data';
import type { RoleDefinition, RoleGroupId } from '@/lib/roles/types';
import './roles.css';

function summarize(def: RoleDefinition): string {
  if (def.wildcard) return 'Full access — every module & action';
  const mods = Object.keys(def.permissions ?? {});
  if (mods.length === 0) return def.raw?.length ? 'Scoped / portal access' : 'No module access yet';
  const names = mods.slice(0, 5).map((k) => (MODULE_LABEL[k] ?? k).split(' ')[0]);
  return names.join(' · ') + (mods.length > 5 ? ` +${mods.length - 5}` : '');
}

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Super Admin — the data-driven role directory. Lists every role by group and
 *  opens the permission matrix editor; "New role" adds a role with no code change. */
export function RolesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { roles, loading } = useRoleCatalog();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState<RoleGroupId>('administration');
  const [level, setLevel] = useState('');
  const [busy, setBusy] = useState(false);

  const byGroup = useMemo(() => {
    const map = new Map<RoleGroupId, RoleDefinition[]>();
    for (const r of roles) {
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return map;
  }, [roles]);

  const create = async () => {
    const id = slug(label);
    if (!id) { toast.error('Enter a role name'); return; }
    if (roles.some((r) => r.id === id)) { toast.error('A role with that id already exists'); return; }
    setBusy(true);
    try {
      await saveRoleDefinition({ id, label: label.trim(), group, level: level.trim() || undefined, order: 900, permissions: {}, builtIn: false, active: true });
      toast.success('Role created', 'Now set its permissions.');
      setAdding(false); setLabel(''); setLevel('');
      navigate(`/roles/${id}`);
    } catch { toast.error('Could not create role'); } finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Roles &amp; Permissions</h1>
          <p className="nx-page__sub">Every role a school can have, organised by group and level. Edit what each role can do, or add new roles — all saved as data, no code release.</p>
        </div>
        <Button variant="gold" leftIcon="plus" onClick={() => setAdding(true)}>New role</Button>
      </div>

      {loading ? (
        <Panel><Skeleton height={220} /></Panel>
      ) : (
        ROLE_GROUPS.map((g) => {
          const list = byGroup.get(g.id) ?? [];
          if (list.length === 0) return null;
          return (
            <Panel key={g.id} title={g.label} sub={`${list.length} role${list.length === 1 ? '' : 's'}`}>
              <div className="nx-rolelist">
                {list.map((r) => (
                  <button key={r.id} type="button" className="nx-rolerow" onClick={() => navigate(`/roles/${r.id}`)}>
                    <div className="nx-rolerow__main">
                      <div className="nx-rolerow__name">
                        {r.label}
                        {r.level && <Badge variant="muted">{r.level}</Badge>}
                        {r.wildcard && <Badge variant="warning">Full access</Badge>}
                        {r.builtIn === false && <Badge variant="info">Custom</Badge>}
                      </div>
                      <div className="nx-rolerow__perms">{summarize(r)}</div>
                    </div>
                    <Icon name="chevron-right" size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </Panel>
          );
        })
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        icon="user-plus"
        tone="gold"
        title="New role"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!label.trim()} onClick={create}>Create role</Button>
          </>
        }
      >
        <Field label="Role name" required hint="e.g. “Exam Cell Assistant”. You set its permissions next.">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Role name" autoFocus />
        </Field>
        <div className="grid g-2">
          <Field label="Group">
            <Select value={group} onChange={(e) => setGroup(e.target.value as RoleGroupId)}
              options={ROLE_GROUPS.filter((g) => g.id !== 'platform').map((g) => ({ value: g.id, label: g.label }))} />
          </Field>
          <Field label="Level" optional hint="Senior / Junior / Assistant…">
            <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="(optional)" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
