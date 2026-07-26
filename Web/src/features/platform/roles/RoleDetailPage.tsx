import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { APP_MODULES, ROLE_ACTION_LABEL } from '@/lib/roles/modules';
import { ROLE_ACTIONS } from '@/lib/roles/types';
import { GROUP_LABEL } from '@/lib/roles/catalog';
import { useRoleCatalog, saveRoleDefinition } from '@/lib/roles/data';
import type { PermissionMatrix, RoleAction } from '@/lib/roles/types';
import './roles.css';

/** Super Admin — edit one role's permission matrix (module × action). Saves to
 *  Firestore, so the change takes effect with no code release. */
export function RoleDetailPage() {
  const { roleId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { roles, loading } = useRoleCatalog();
  const def = useMemo(() => roles.find((r) => r.id === roleId), [roles, roleId]);

  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (def) { setMatrix(def.permissions ?? {}); setDirty(false); }
  }, [def?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !def) return <div className="nx-page"><Skeleton height={48} /><Panel><Skeleton height={300} /></Panel></div>;
  if (!def) return <div className="nx-page"><EmptyState icon="users" title="Role not found" action={<Button variant="subtle" onClick={() => navigate('/roles')}>Back to roles</Button>} /></div>;

  const toggle = (mod: string, action: RoleAction) => {
    setMatrix((m) => {
      const cur = new Set(m[mod] ?? []);
      if (cur.has(action)) cur.delete(action);
      else cur.add(action);
      const next = { ...m };
      if (cur.size) next[mod] = ROLE_ACTIONS.filter((a) => cur.has(a));
      else delete next[mod];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveRoleDefinition({ ...def, id: def.id, permissions: matrix });
      toast.success('Permissions saved', def.label);
      setDirty(false);
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-detail__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/roles')} aria-label="Back"><Icon name="chevron-left" size={18} /></button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="nx-page__title" style={{ fontSize: 20 }}>{def.label}</h1>
          <div className="nx-detail__meta">
            <Badge variant="muted">{GROUP_LABEL[def.group] ?? def.group}</Badge>
            {def.level && <><span className="dot" /><span>{def.level}</span></>}
            {def.builtIn === false && <Badge variant="info">Custom role</Badge>}
          </div>
        </div>
      </div>

      {def.description && <InfoCard icon="info" title="About this role">{def.description}</InfoCard>}

      {def.wildcard ? (
        <Panel title="Permissions">
          <InfoCard icon="shield" title="Full access">
            This leadership role holds every permission across all modules. Day-to-day operation is shaped by the operational-ownership model (reviewer vs. operator), not by removing access here.
          </InfoCard>
        </Panel>
      ) : (
        <Panel title="Permission matrix" sub="Tick exactly what this role may do in each part of the app">
          {def.raw?.length ? (
            <InfoCard icon="lock" title="Plus scoped permissions">
              This role also holds fine-grained, scoped permissions (e.g. limited to their own section or subject) defined in code, in addition to anything ticked below.
            </InfoCard>
          ) : null}
          <div className="nx-matrix-wrap">
            <table className="nx-matrix">
              <thead>
                <tr>
                  <th className="nx-matrix__mod">Module</th>
                  {ROLE_ACTIONS.map((a) => <th key={a}>{ROLE_ACTION_LABEL[a]}</th>)}
                </tr>
              </thead>
              <tbody>
                {APP_MODULES.map((m) => (
                  <tr key={m.key}>
                    <td className="nx-matrix__mod">{m.label}</td>
                    {ROLE_ACTIONS.map((a) => {
                      const on = matrix[m.key]?.includes(a) ?? false;
                      return (
                        <td key={a}>
                          <button
                            type="button"
                            className={`nx-matrix__cell${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            aria-label={`${ROLE_ACTION_LABEL[a]} — ${m.label}`}
                            onClick={() => toggle(m.key, a)}
                          >
                            {on && <Icon name="check" size={13} strokeWidth={3} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!def.wildcard && (
        <div className="nx-savebar">
          <div className="nx-savebar__inner">
            <div className="nx-savebar__left"><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span></div>
            <div className="nx-savebar__right"><Button variant="gold" leftIcon="check" loading={busy} disabled={!dirty} onClick={save}>Save permissions</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
