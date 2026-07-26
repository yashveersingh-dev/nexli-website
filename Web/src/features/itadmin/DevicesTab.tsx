import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { ConfirmModal, Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Field, Input, Select } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useItAssets, deleteItAsset, updateItAsset } from './data';
import { ASSET_TYPE_META, ASSET_TYPE_OPTIONS, ASSET_STATUS_META, ASSET_STATUS_OPTIONS } from './meta';
import { warrantyExpiringSoon, warrantyExpired } from './schema';
import type { ItAsset } from './types';

export function DevicesTab({ canManage }: { canManage: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: assets, loading, error } = useItAssets(schoolId);

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState<ItAsset | null>(null);
  const [allocating, setAllocating] = useState<ItAsset | null>(null);
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets
      .filter((a) => (type ? a.type === type : true))
      .filter((a) => (status ? a.status === status : true))
      .filter((a) => (needle
        ? [a.name, a.assetTag, a.serialNo, a.location, a.assignedTo].some((x) => x?.toLowerCase().includes(needle))
        : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, q, type, status]);

  const stats = useMemo(() => {
    const active = assets.filter((a) => a.status !== 'retired').length;
    const inRepair = assets.filter((a) => a.status === 'repair').length;
    const spare = assets.filter((a) => a.status === 'spare').length;
    return { active, inRepair, spare };
  }, [assets]);

  const doDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteItAsset(schoolId, removing.id, actor);
      toast.success('Device removed', removing.name);
      setRemoving(null);
    } catch { toast.error('Could not remove', 'Please try again.'); } finally { setBusy(false); }
  };

  const openAllocate = (a: ItAsset) => { setAllocating(a); setAssignee(a.assignedTo ?? ''); };

  const doAllocate = async () => {
    if (!schoolId || !allocating) return;
    setBusy(true);
    const next = assignee.trim();
    try {
      await updateItAsset(schoolId, allocating.id, {
        assignedTo: next || undefined,
        // Allocating puts it in use; returning a non-retired device makes it spare.
        status: next ? 'in_use' : (allocating.status === 'retired' ? 'retired' : 'spare'),
      }, actor);
      toast.success(next ? 'Device allocated' : 'Device returned', allocating.name);
      setAllocating(null);
    } catch { toast.error('Could not update', 'Please try again.'); } finally { setBusy(false); }
  };

  const columns: Column<ItAsset>[] = [
    {
      key: 'name', header: 'Device', primary: true,
      render: (a) => {
        const expSoon = warrantyExpiringSoon(a.warrantyUntil);
        const expGone = warrantyExpired(a.warrantyUntil);
        return (
          <span className="ita-name">
            <span className="ita-name__icon"><Icon name={ASSET_TYPE_META[a.type].icon} size={16} /></span>
            <span className="ita-name__text">
              <span className="ita-name__title">
                <span className="ita-name__label">{a.name}</span>
                {(expSoon || expGone) && (
                  <Badge variant={expGone ? 'danger' : 'warning'}>{expGone ? 'Warranty expired' : 'Warranty due'}</Badge>
                )}
              </span>
              <span className="ita-name__sub">
                {ASSET_TYPE_META[a.type].label}
                {a.assetTag ? ` · ${a.assetTag}` : ''}
                {a.location ? ` · ${a.location}` : ''}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: 'assignedTo', header: 'Assigned to', render: (a) => a.assignedTo || <span className="ita-muted">Unassigned</span> },
    { key: 'warrantyUntil', header: 'Warranty', hideOnMobile: true, render: (a) => (a.warrantyUntil ? formatDate(a.warrantyUntil) : '—') },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (a) => <Badge variant={ASSET_STATUS_META[a.status].variant}>{ASSET_STATUS_META[a.status].label}</Badge>,
    },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search name, tag, serial, location…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search devices" />
      </div>
      <Select className="nx-toolbar__filter" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type"
        options={[{ value: '', label: 'All types' }, ...ASSET_TYPE_OPTIONS]} />
      <Select className="nx-toolbar__filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
        options={[{ value: '', label: 'All statuses' }, ...ASSET_STATUS_OPTIONS]} />
    </div>
  );

  const filtered = !!(q || type || status);

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="server" label="Active devices" count={stats.active} format="us" />
        <KPICard icon="box" label="Spare" count={stats.spare} format="us" />
        <KPICard icon="settings" label="In repair" count={stats.inRepair} format="us" subColor={stats.inRepair ? 'var(--warning)' : undefined} />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>The school's IT asset register — computers, projectors, tablets and network gear.</p>
        {canManage && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/it-admin/devices/new')}>Add device</Button>}
      </div>

      <DataTable
        columns={columns} rows={rows} rowKey={(a) => a.id} loading={loading}
        error={error ? 'Could not load the device register.' : null}
        toolbar={toolbar}
        onRowClick={canManage ? (a) => navigate(`/it-admin/devices/${a.id}/edit`) : undefined}
        actions={canManage ? (a) => (
          <>
            <Button variant="ghost" size="sm" leftIcon="user-plus" aria-label={`Allocate ${a.name}`} onClick={() => openAllocate(a)} />
            <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${a.name}`} onClick={() => navigate(`/it-admin/devices/${a.id}/edit`)} />
            <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${a.name}`} onClick={() => setRemoving(a)} />
          </>
        ) : undefined}
        emptyIcon="server"
        emptyTitle={filtered ? 'No matching devices' : 'No devices yet'}
        emptyMessage={filtered ? 'Try a different search or filter.' : (canManage ? 'Add your first device to start the IT asset register.' : 'Registered devices will appear here.')}
      />

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        {rows.length} of {assets.length} device{assets.length === 1 ? '' : 's'}
      </p>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={doDelete} tone="danger" loading={busy}
        title="Remove device?" message={removing ? `${removing.name} will be deleted from the IT asset register. This can't be undone.` : ''} confirmLabel="Remove" />

      <Modal
        open={!!allocating} onClose={() => setAllocating(null)} size="sm" icon="user-plus" tone="gold"
        title="Allocate / return device"
        description={allocating ? allocating.name : ''}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setAllocating(null)} disabled={busy}>Cancel</Button>
            <Button type="button" variant="gold" loading={busy} onClick={() => void doAllocate()}>{assignee.trim() ? 'Allocate' : 'Return to spare'}</Button>
          </>
        }
      >
        <Field label="Assign to" hint="Staff member, department or lab. Clear the field to return the device to the spare pool.">
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="e.g. Maths Dept · Computer Lab 1" aria-label="Assign device to" />
        </Field>
      </Modal>
    </div>
  );
}
