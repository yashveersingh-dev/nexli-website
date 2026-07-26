import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useSmcBudget, createSmcBudgetItem, updateSmcBudgetItem, deleteSmcBudgetItem, type Actor } from '@/features/compliance/data';
import type { SmcBudgetItem } from '@/types/compliance';

/** Default current Indian financial year, e.g. "2026-27". */
function currentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 3 ? y : y - 1; // FY starts April
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function clampPct(spent: number, allocated: number): number {
  if (allocated <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / allocated) * 100));
}

export function BudgetTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: items, loading, error } = useSmcBudget(schoolId);

  const [fy, setFy] = useState<string>('');
  const [editing, setEditing] = useState<SmcBudgetItem | null | undefined>(undefined);
  const [removing, setRemoving] = useState<SmcBudgetItem | null>(null);
  const [busy, setBusy] = useState(false);
  // form
  const [head, setHead] = useState('');
  const [category, setCategory] = useState('');
  const [financialYear, setFinancialYear] = useState(currentFY());
  const [allocated, setAllocated] = useState('');
  const [spent, setSpent] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const fyOptions = useMemo(() => {
    const set = new Set<string>(items.map((i) => i.financialYear).filter(Boolean));
    set.add(currentFY());
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [items]);

  // Default the FY filter to the most recent FY present (once items load).
  const activeFy = fy || fyOptions[0] || currentFY();

  const rows = useMemo(
    () => items.filter((i) => i.financialYear === activeFy).sort((a, b) => a.head.localeCompare(b.head)),
    [items, activeFy],
  );

  const totals = useMemo(() => {
    let allocatedSum = 0, spentSum = 0;
    for (const i of rows) { allocatedSum += i.allocated || 0; spentSum += i.spent || 0; }
    const util = allocatedSum > 0 ? Math.round((spentSum / allocatedSum) * 100) : 0;
    return { allocated: allocatedSum, spent: spentSum, util, remaining: allocatedSum - spentSum };
  }, [rows]);

  const open = (i: SmcBudgetItem | null) => {
    setEditing(i);
    setHead(i?.head ?? '');
    setCategory(i?.category ?? '');
    setFinancialYear(i?.financialYear ?? activeFy);
    setAllocated(i?.allocated != null ? String(i.allocated) : '');
    setSpent(i?.spent != null ? String(i.spent) : '');
    setSource(i?.source ?? '');
    setNotes(i?.notes ?? '');
  };

  const canSave = head.trim() !== '' && financialYear.trim() !== '' && allocated.trim() !== '' && Number(allocated) >= 0 && (spent === '' || Number(spent) >= 0);

  const save = async () => {
    if (!schoolId || !canSave) return;
    setBusy(true);
    const payload = {
      head: head.trim(),
      category: category.trim() || undefined,
      financialYear: financialYear.trim(),
      allocated: Number(allocated),
      spent: spent.trim() === '' ? 0 : Number(spent),
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (editing) await updateSmcBudgetItem(schoolId, editing.id, payload, actor);
      else await createSmcBudgetItem(schoolId, { schoolId, ...payload }, actor);
      toast.success(editing ? 'Budget item updated' : 'Budget item added', payload.head);
      // Make the new item's FY visible if it differs from the current filter.
      if (payload.financialYear !== activeFy) setFy(payload.financialYear);
      setEditing(undefined);
    } catch { toast.error('Could not save', 'Please try again.'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteSmcBudgetItem(schoolId, removing.id, actor); toast.success('Deleted'); setRemoving(null); }
    catch { toast.error('Could not delete'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="wallet" label={`Allocated · FY ${activeFy}`} count={totals.allocated} format="inr" />
        <KPICard icon="credit-card" label="Spent" count={totals.spent} format="inr" subColor={totals.spent > totals.allocated ? 'var(--danger)' : undefined} sub={totals.spent > totals.allocated ? 'over budget' : undefined} />
        <KPICard icon="bar-chart" label="Utilisation" count={totals.util} format="percent" suffix="%" subColor={totals.util > 100 ? 'var(--danger)' : totals.util >= 85 ? 'var(--warning)' : undefined} sub={totals.allocated > 0 ? formatINR(totals.remaining) + ' remaining' : undefined} />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select value={activeFy} onChange={(e) => setFy(e.target.value)} aria-label="Financial year"
          options={fyOptions.map((y) => ({ value: y, label: `FY ${y}` }))} />
        <div style={{ flex: 1 }} />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add budget item</Button>}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel><EmptyState icon="info" title="Could not load the budget" message="Please try again." /></Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="wallet"
            title={items.length === 0 ? 'No budget tracked yet' : `Nothing budgeted for FY ${activeFy}`}
            message={canWrite ? 'Add budget heads with allocations to track utilisation across the year.' : 'Budget items will appear here.'}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add budget item</Button> : undefined}
          />
        </Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((i) => {
            const alloc = i.allocated || 0;
            const used = i.spent || 0;
            const over = used > alloc;
            const pct = clampPct(used, alloc);
            return (
              <div key={i.id} className="smc-budget">
                <div className="smc-budget__top">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="smc-budget__head">{i.head}</div>
                    <div className="smc-budget__meta">
                      {i.category ? `${i.category} · ` : ''}{i.source ? `${i.source}` : 'Source not set'}
                    </div>
                  </div>
                  {canWrite && (
                    <div className="smc-budget__actions">
                      <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${i.head}`} onClick={() => open(i)} />
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Delete ${i.head}`} onClick={() => setRemoving(i)} />
                    </div>
                  )}
                </div>
                <div className="smc-budget__figures">
                  <span><strong>{formatINR(used)}</strong> spent</span>
                  <span className="smc-muted">of {formatINR(alloc)}</span>
                  <span className={`smc-budget__pct ${over ? 'is-over' : ''}`}>{pct}%{over ? ' · over' : ''}</span>
                </div>
                <div className="cmp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${i.head} utilisation`}>
                  <div className={`cmp-bar__fill ${over ? 'is-over' : ''}`} style={{ width: `${pct}%` }} />
                </div>
                {i.notes && <div className="smc-budget__notes">{i.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        icon="wallet"
        tone="gold"
        title={editing ? 'Edit budget item' : 'Add budget item'}
        size="md"
        dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!canSave} onClick={save}>Save</Button>
        </>}
      >
        <Field label="Budget head" required><Input value={head} onChange={(e) => setHead(e.target.value)} placeholder="e.g. Library books" autoFocus /></Field>
        <div className="grid g-2">
          <Field label="Category" optional><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Academic, Infrastructure…" /></Field>
          <Field label="Financial year" required hint="e.g. 2026-27"><Input value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} placeholder="2026-27" /></Field>
        </div>
        <div className="grid g-2">
          <Field label="Allocated (₹)" required><Input value={allocated} onChange={(e) => setAllocated(e.target.value)} type="number" inputMode="numeric" min={0} prefix="₹" /></Field>
          <Field label="Spent (₹)" optional><Input value={spent} onChange={(e) => setSpent(e.target.value)} type="number" inputMode="numeric" min={0} prefix="₹" /></Field>
        </div>
        <Field label="Funding source" optional hint="SMDP, state grant, donation…"><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="State grant" /></Field>
        <Field label="Notes" optional><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Delete budget item?"
        message={removing ? `"${removing.head}" will be removed from FY ${removing.financialYear}.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
