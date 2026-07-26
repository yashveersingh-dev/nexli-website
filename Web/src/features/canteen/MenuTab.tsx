import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useCanteenMenus, deleteMenu, type Actor } from '@/features/ops/data';
import type { CanteenMenu } from '@/types/ops';
import { MealBlocks } from './MealBlocks';
import { menuScopeLabel, todayISO, todayWeekday, totalItems } from './lib';

export function MenuTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('canteen').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: menus, loading, error } = useCanteenMenus(schoolId);

  const [removing, setRemoving] = useState<CanteenMenu | null>(null);
  const [busy, setBusy] = useState(false);

  const { todayMenu, others } = useMemo(() => {
    const iso = todayISO();
    const wd = todayWeekday();
    const dated = menus.filter((m) => m.date === iso);
    const template = menus.filter((m) => m.date == null && m.weekday === wd);
    // Prefer a published dated menu; fall back to a weekday template.
    const pick =
      dated.find((m) => m.published) ?? dated[0] ?? template.find((m) => m.published) ?? template[0] ?? null;
    const rest = menus
      .filter((m) => m.id !== pick?.id)
      .slice()
      .sort((a, b) => sortKey(b) - sortKey(a));
    return { todayMenu: pick, others: rest };
  }, [menus]);

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteMenu(schoolId, removing.id, actor);
      toast.success('Menu deleted');
      setRemoving(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Plan dated daily menus and reusable weekday templates.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/canteen/menu/new')}>New menu</Button>}
      </div>

      {error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load menus" message="Please try again." /></Panel>
      ) : loading ? (
        <div className="grid g-2"><Skeleton height={220} /><Skeleton height={220} /></div>
      ) : menus.length === 0 ? (
        <Panel>
          <EmptyState icon="utensils" title="No menus yet" message={canWrite ? 'Create the first menu to share with families and staff.' : "Today's menu will appear here once published."}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/canteen/menu/new')}>New menu</Button> : undefined} />
        </Panel>
      ) : (
        <>
          {todayMenu ? (
            <Panel className="cant-today" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="calendar" size={16} /> Today</span>}
              headerRight={<StatusBadge m={todayMenu} />}>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>{menuScopeLabel(todayMenu)}</div>
              <MealBlocks menu={todayMenu} />
              {todayMenu.notes && <p className="cant-notes"><Icon name="info" size={13} /> {todayMenu.notes}</p>}
              {canWrite && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`/canteen/menu/${todayMenu.id}/edit`)}>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon="minus-circle" onClick={() => setRemoving(todayMenu)}>Delete</Button>
                </div>
              )}
            </Panel>
          ) : (
            <Panel><EmptyState icon="calendar" title="No menu set for today" message={canWrite ? 'Add a dated menu or a template for today’s weekday.' : 'Check back later.'} /></Panel>
          )}

          {others.length > 0 && (
            <>
              <h2 className="cant-subhead">All menus</h2>
              <div className="grid g-2">
                {others.map((m) => (
                  <Panel key={m.id} title={menuScopeLabel(m)} headerRight={<StatusBadge m={m} />}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                      {m.meals.length} {m.meals.length === 1 ? 'meal' : 'meals'} · {totalItems(m)} {totalItems(m) === 1 ? 'item' : 'items'}
                    </div>
                    <MealBlocks menu={m} />
                    {canWrite && (
                      <div style={{ display: 'flex', gap: 2, marginTop: 12, justifyContent: 'flex-end' }}>
                        <Button variant="ghost" size="sm" leftIcon="edit" aria-label="Edit menu" onClick={() => navigate(`/canteen/menu/${m.id}/edit`)} />
                        <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label="Delete menu" onClick={() => setRemoving(m)} />
                      </div>
                    )}
                  </Panel>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmRemove} tone="danger" loading={busy}
        title="Delete this menu?" message={removing ? `${menuScopeLabel(removing)} will be removed permanently.` : ''} confirmLabel="Delete" />
    </div>
  );
}

function StatusBadge({ m }: { m: CanteenMenu }) {
  return m.published ? <Badge variant="success">Published</Badge> : <Badge variant="muted">Draft</Badge>;
}

/** Dated menus rank above templates; newer dates first. */
function sortKey(m: CanteenMenu): number {
  if (m.date) return new Date(`${m.date}T00:00:00`).getTime();
  return -100000 + (m.weekday ?? 0); // templates sink below dated menus
}
