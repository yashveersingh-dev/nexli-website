import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { ConfirmModal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatINR, formatINRCompact, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useAssets, deleteAsset } from '@/features/ops/data';
import { ASSET_CATEGORY_META, ASSET_CATEGORY_OPTIONS, ASSET_STATUS_META } from '@/features/ops/meta';
import type { Asset } from '@/types/ops';
import { warrantyExpiringSoon, warrantyExpired } from './facilitySchema';

export function AssetsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('facility').canOperate;
  const { data: assets, loading, error } = useAssets(schoolId);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets
      .filter((a) => (category ? a.category === category : true))
      .filter((a) => (status ? a.status === status : true))
      .filter((a) => (needle
        ? [a.name, a.tag, a.location, a.assignedTo, a.vendorName].some((x) => x?.toLowerCase().includes(needle))
        : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, q, category, status]);

  const stats = useMemo(() => {
    const live = assets.filter((a) => a.status !== 'retired' && a.status !== 'lost');
    const totalValue = assets.reduce((sum, a) => sum + (a.cost ?? 0) * (a.quantity ?? 1), 0);
    const inMaintenance = assets.filter((a) => a.status === 'maintenance').length;
    return { total: live.length, totalValue, inMaintenance };
  }, [assets]);

  const doDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteAsset(schoolId, removing.id, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Asset removed', removing.name);
      setRemoving(null);
    } catch { toast.error('Could not remove'); } finally { setBusy(false); }
  };

  const columns: Column<Asset>[] = [
    {
      key: 'name', header: 'Asset', primary: true,
      render: (a) => {
        const expSoon = warrantyExpiringSoon(a.warrantyExpiry);
        const expGone = warrantyExpired(a.warrantyExpiry);
        return (
          <span className="fac-name">
            <span className="fac-name__icon"><Icon name={ASSET_CATEGORY_META[a.category].icon} size={16} /></span>
            <span className="fac-name__text">
              <span className="fac-name__title fac-badges">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                {(expSoon || expGone) && (
                  <Badge variant={expGone ? 'danger' : 'warning'}>
                    {expGone ? 'Warranty expired' : 'Warranty expiring'}
                  </Badge>
                )}
              </span>
              <span className="fac-name__sub">
                {ASSET_CATEGORY_META[a.category].label}
                {a.tag ? ` · ${a.tag}` : ''}
                {a.location ? ` · ${a.location}` : ''}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: 'location', header: 'Location', hideOnMobile: true, render: (a) => a.location || '—' },
    {
      key: 'value', header: 'Value', align: 'right', hideOnMobile: true,
      render: (a) => (a.cost != null ? formatINR((a.cost) * (a.quantity ?? 1)) : '—'),
    },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (a) => <Badge variant={ASSET_STATUS_META[a.status].variant}>{ASSET_STATUS_META[a.status].label}</Badge>,
    },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search name, tag, location…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assets" />
      </div>
      <Select className="nx-toolbar__filter" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"
        options={[{ value: '', label: 'All categories' }, ...ASSET_CATEGORY_OPTIONS]} />
      <Select className="nx-toolbar__filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
        options={[{ value: '', label: 'All statuses' }, ...(Object.keys(ASSET_STATUS_META) as (keyof typeof ASSET_STATUS_META)[]).map((s) => ({ value: s, label: ASSET_STATUS_META[s].label }))]} />
    </div>
  );

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="box" label="Active assets" count={stats.total} format="us" />
        <KPICard icon="wallet" label="Total value" value={formatINRCompact(stats.totalValue)} sub={formatINR(stats.totalValue)} />
        <KPICard icon="settings" label="In maintenance" count={stats.inMaintenance} format="us" subColor={stats.inMaintenance ? 'var(--warning)' : undefined} />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>The school's movable asset register.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/facility/assets/new')}>Add asset</Button>}
      </div>

      <DataTable
        columns={columns} rows={rows} rowKey={(a) => a.id} loading={loading}
        error={error ? 'Could not load the asset register.' : null}
        toolbar={toolbar}
        onRowClick={canWrite ? (a) => navigate(`/facility/assets/${a.id}/edit`) : undefined}
        actions={canWrite ? (a) => (
          <>
            <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${a.name}`} onClick={() => navigate(`/facility/assets/${a.id}/edit`)} />
            <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${a.name}`} onClick={() => setRemoving(a)} />
          </>
        ) : undefined}
        emptyIcon="box"
        emptyTitle={q || category || status ? 'No matching assets' : 'No assets yet'}
        emptyMessage={q || category || status ? 'Try a different search or filter.' : (canWrite ? 'Add your first asset to start the register.' : 'Registered assets will appear here.')}
      />

      {rows.some((a) => warrantyExpiringSoon(a.warrantyExpiry) || warrantyExpired(a.warrantyExpiry)) && (
        <p style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="alert-triangle" size={13} /> Assets flagged above have a warranty that has expired or expires within 30 days.
        </p>
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        {rows.length} of {assets.length} asset{assets.length === 1 ? '' : 's'} · last purchase {assets.length ? formatDate(Math.max(...assets.map((a) => a.purchaseDate ?? 0)) || Date.now()) : '—'}
      </p>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={doDelete} tone="danger" loading={busy}
        title="Remove asset?" message={removing ? `${removing.name} will be deleted from the asset register. This can't be undone.` : ''} confirmLabel="Remove" />
    </div>
  );
}
