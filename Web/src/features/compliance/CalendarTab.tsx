import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Select } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useComplianceItems, updateComplianceItem, deleteComplianceItem, type Actor } from './data';
import { COMPLIANCE_CATEGORY_META, COMPLIANCE_STATUS_META, COMPLIANCE_CATEGORY_OPTIONS, daysUntil } from './meta';
import { effectiveStatus } from './complianceSchema';
import type { ComplianceItem } from '@/types/compliance';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: items, loading, error } = useComplianceItems(schoolId);

  const [cat, setCat] = useState('');
  const [view, setView] = useState('open'); // open | all | filed
  const [removing, setRemoving] = useState<ComplianceItem | null>(null);
  const [busy, setBusy] = useState(false);

  const enriched = useMemo(() => items.map((i) => ({ ...i, eff: effectiveStatus(i) })), [items]);

  const kpis = useMemo(() => {
    let overdue = 0, soon = 0, filed = 0;
    for (const i of enriched) {
      if (i.eff === 'filed') filed++;
      else if (i.eff === 'overdue') overdue++;
      else if (daysUntil(i.dueDate) <= 30) soon++;
    }
    return { overdue, soon, filed };
  }, [enriched]);

  const rows = useMemo(() => {
    return enriched
      .filter((i) => (cat ? i.category === cat : true))
      .filter((i) => (view === 'filed' ? i.eff === 'filed' : view === 'open' ? i.eff !== 'filed' && i.eff !== 'na' : true))
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [enriched, cat, view]);

  const markFiled = async (i: ComplianceItem) => {
    if (!schoolId) return;
    try { await updateComplianceItem(schoolId, i.id, { status: 'filed', completedDate: Date.now() }, actor); toast.success('Marked filed', i.title); }
    catch { toast.error('Could not update'); }
  };
  const reopen = async (i: ComplianceItem) => {
    if (!schoolId) return;
    try { await updateComplianceItem(schoolId, i.id, { status: 'pending', completedDate: undefined }, actor); toast.success('Reopened', i.title); }
    catch { toast.error('Could not update'); }
  };
  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteComplianceItem(schoolId, removing.id, actor); toast.success('Deleted'); setRemoving(null); }
    catch { toast.error('Could not delete'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="alert-triangle" label="Overdue" count={kpis.overdue} format="us" subColor={kpis.overdue ? 'var(--danger)' : 'var(--success)'} sub={kpis.overdue ? 'need filing' : 'all clear'} />
        <KPICard icon="clock" label="Due in 30 days" count={kpis.soon} format="us" subColor={kpis.soon ? 'var(--warning)' : undefined} />
        <KPICard icon="check-circle" label="Filed" count={kpis.filed} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select value={view} onChange={(e) => setView(e.target.value)} aria-label="View"
          options={[{ value: 'open', label: 'Open items' }, { value: 'filed', label: 'Filed' }, { value: 'all', label: 'All' }]} />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"
          options={[{ value: '', label: 'All categories' }, ...COMPLIANCE_CATEGORY_OPTIONS]} />
        <div style={{ flex: 1 }} />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/compliance/new')}>New deadline</Button>}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Could not load deadlines" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="shield-check" title={view === 'filed' ? 'Nothing filed yet' : 'No deadlines tracked'} message={canWrite ? 'Add statutory deadlines to stay ahead of due dates.' : 'Compliance deadlines will appear here.'} action={canWrite && view !== 'filed' ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/compliance/new')}>New deadline</Button> : undefined} /></Panel>
      ) : (
        <div className="fin-kv-list" style={{ gap: 10 }}>
          {rows.map((i) => {
            const d = new Date(i.dueDate);
            const du = daysUntil(i.dueDate);
            const cls = i.eff === 'overdue' ? 'is-overdue' : du <= 30 && i.eff !== 'filed' ? 'is-soon' : '';
            const meta = COMPLIANCE_CATEGORY_META[i.category];
            return (
              <div key={i.id} className="cmp-row">
                <div className={`cmp-row__date ${cls}`}>
                  <div className="cmp-row__day">{d.getDate()}</div>
                  <div className="cmp-row__mon">{MON[d.getMonth()]}</div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cmp-row__title"><Icon name={meta.icon} size={13} /> {i.title}</div>
                  <div className="cmp-row__meta">
                    {meta.label}{i.authority ? ` · ${i.authority}` : ''} · {formatDate(i.dueDate)}
                    {i.eff !== 'filed' && du >= 0 ? ` · in ${du}d` : i.eff === 'overdue' ? ` · ${-du}d overdue` : ''}
                    {i.assignedToName ? ` · ${i.assignedToName}` : ''}
                  </div>
                </div>
                <Badge variant={COMPLIANCE_STATUS_META[i.eff].variant}>{COMPLIANCE_STATUS_META[i.eff].label}</Badge>
                {canWrite && (
                  <div className="cmp-row__actions">
                    {i.eff === 'filed'
                      ? <Button variant="ghost" size="sm" leftIcon="refresh" aria-label="Reopen" onClick={() => reopen(i)} />
                      : <Button variant="ghost" size="sm" leftIcon="check-circle" aria-label="Mark filed" onClick={() => markFiled(i)} />}
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label="Edit" onClick={() => navigate(`/compliance/${i.id}/edit`)} />
                    <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label="Delete" onClick={() => setRemoving(i)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete deadline?" message={removing ? `"${removing.title}" will be removed from the calendar.` : ''} confirmLabel="Delete" />
    </div>
  );
}
