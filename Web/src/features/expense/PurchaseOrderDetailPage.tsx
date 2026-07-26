import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, DatePicker } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { formatINR, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import {
  usePurchaseOrder, useGoodsReceipts, recordGoodsReceipt, updatePurchaseOrder, deletePurchaseOrder, type Actor,
} from '@/features/finance/data';
import { PO_STATUS_META, GRN_STATUS_META } from '@/features/finance/meta';
import { docNumber } from './expenseSchema';
import type { PurchaseOrder, POItem, GRNItem, GoodsReceipt, POStatus } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);

/** Total already received per line, across all prior GRNs for this PO. */
function receivedSoFar(po: PurchaseOrder, receipts: GoodsReceipt[]): number[] {
  return po.items.map((it, i) => {
    // Prefer the authoritative per-line receivedQty on the PO; GRNs are the audit trail.
    const r = it.receivedQty ?? 0;
    return r || receipts.reduce((sum, g) => sum + (g.items[i]?.receivedQty ?? 0), 0);
  });
}

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: po, loading } = usePurchaseOrder(schoolId, id);
  const { data: receipts, loading: rLoading } = useGoodsReceipts(schoolId, id);

  const [grnOpen, setGrnOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = () => navigate('/expense');

  const received = useMemo(() => (po ? receivedSoFar(po, receipts) : []), [po, receipts]);

  if (loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={280} /></div>;
  if (!po) {
    return <div className="nx-page"><Panel><EmptyState icon="box" title="Purchase order not found" message="This PO may have been removed." action={<Button variant="subtle" onClick={back}>Back</Button>} /></Panel></div>;
  }

  const fullyReceived = po.items.every((it, i) => (received[i] ?? 0) >= it.qty);
  const anyReceived = po.items.some((_, i) => (received[i] ?? 0) > 0);
  const canReceive = po.status === 'issued' || po.status === 'partial';
  const meta = PO_STATUS_META[po.status];

  const cancelPO = async () => {
    if (!schoolId) return;
    setBusy(true);
    try { await updatePurchaseOrder(schoolId, po.id, { status: 'cancelled' }, actor); toast.success('Purchase order cancelled'); }
    catch { toast.error('Could not cancel'); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!schoolId) return;
    setBusy(true);
    try { await deletePurchaseOrder(schoolId, po.id, actor); toast.success('Purchase order deleted'); back(); }
    catch { toast.error('Could not delete'); setBusy(false); }
  };

  return (
    <div className="nx-page">
      <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={back}>Purchase orders</Button>

      <Panel>
        <div className="nx-detail__head" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="nx-page__title" style={{ marginBottom: 2 }}>{po.vendorName ?? 'Vendor'}</h1>
            <p className="nx-page__sub" style={{ margin: 0 }}>
              {po.poNo}{po.orderedDate ? ` · ${formatDate(po.orderedDate)}` : ''}
              {po.expectedDate ? ` · expected ${formatDate(po.expectedDate)}` : ''}
            </p>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
      </Panel>

      {po.note && <InfoCard icon="info" title="Note">{po.note}</InfoCard>}

      <Panel title="Items" sub={`${po.items.length}`}>
        <div className="nx-dt-tablewrap">
          <table className="fin-lines">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Ordered</th>
                <th className="num">Received</th>
                <th className="num">Rate</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it, i) => {
                const rec = received[i] ?? 0;
                return (
                  <tr key={i}>
                    <td>{it.name}</td>
                    <td className="num">{it.qty}{it.unit ? ` ${it.unit}` : ''}</td>
                    <td className="num">
                      <span style={{ color: rec >= it.qty ? 'var(--success)' : rec > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{rec}</span>
                    </td>
                    <td className="num">{formatINR(it.rate)}</td>
                    <td className="num">{formatINR(it.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}>Subtotal</td><td className="num">{formatINR(po.subtotal)}</td></tr>
              {po.taxAmount ? <tr><td colSpan={4}>Tax ({po.taxPercent ?? 0}%)</td><td className="num">{formatINR(po.taxAmount)}</td></tr> : null}
              <tr><td colSpan={4}>Total</td><td className="num"><span className="fin-amount">{formatINR(po.total)}</span></td></tr>
            </tfoot>
          </table>
        </div>

        {/* Phone item cards */}
        <div className="exp-mlist">
          {po.items.map((it, i) => {
            const rec = received[i] ?? 0;
            return (
              <div className="exp-mrow" key={i}>
                <div className="exp-mrow__title">{it.name} <span className="fin-amount fin-amount--muted" style={{ marginLeft: 'auto' }}>{formatINR(it.amount)}</span></div>
                <div className="exp-mrow__meta">
                  Ordered {it.qty}{it.unit ? ` ${it.unit}` : ''} · received <span style={{ color: rec >= it.qty ? 'var(--success)' : rec > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>{rec}</span> · {formatINR(it.rate)} each
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Goods receipts" sub={receipts.length ? `${receipts.length}` : undefined}>
        {rLoading ? <Skeleton height={80} /> : receipts.length === 0 ? (
          <EmptyState icon="box" title="Nothing received yet" message={canReceive && canWrite ? 'Record a goods receipt when items arrive.' : 'Goods receipts will appear here.'} />
        ) : (
          <div className="fin-kv-list" style={{ gap: 0 }}>
            {[...receipts].sort((a, b) => b.receivedDate - a.receivedDate).map((g) => (
              <div key={g.id} className="nx-noticerow">
                <span className="nx-noticerow__icon is-normal"><Icon name="check-circle" size={15} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="nx-noticerow__title">{g.grnNo}</div>
                  <div className="nx-noticerow__time">{formatDate(g.receivedDate)}{g.receivedByName ? ` · ${g.receivedByName}` : ''}{g.note ? ` · ${g.note}` : ''}</div>
                </div>
                <Badge variant={GRN_STATUS_META[g.status].variant}>{GRN_STATUS_META[g.status].label}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {canWrite && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {canReceive && <Button variant="gold" leftIcon="download" onClick={() => setGrnOpen(true)}>Record goods receipt</Button>}
          {canReceive && anyReceived && <Button variant="subtle" leftIcon="check" loading={busy} onClick={() => void updatePurchaseOrder(schoolId!, po.id, { status: 'closed' }, actor).then(() => toast.success('PO closed'))}>Close PO</Button>}
          {(po.status === 'issued') && !anyReceived && <Button variant="ghost" leftIcon="x" onClick={cancelPO}>Cancel PO</Button>}
          {!anyReceived && <Button variant="ghost" leftIcon="minus-circle" onClick={() => setRemoving(true)}>Delete</Button>}
        </div>
      )}

      {grnOpen && (
        <GoodsReceiptModal
          po={po} received={received} schoolId={schoolId} actor={actor}
          grnCount={receipts.length} onClose={() => setGrnOpen(false)} fullyReceived={fullyReceived}
        />
      )}

      <ConfirmModal open={removing} onClose={() => setRemoving(false)} onConfirm={remove} tone="danger" loading={busy}
        title="Delete purchase order?" message={`${po.poNo} will be permanently removed.`} confirmLabel="Delete" />
    </div>
  );
}

/* ---------------- Record a goods receipt (received qty per item) ---------------- */
function GoodsReceiptModal({ po, received, schoolId, actor, grnCount, onClose, fullyReceived }: {
  po: PurchaseOrder; received: number[]; schoolId?: string; actor: Actor; grnCount: number; onClose: () => void; fullyReceived: boolean;
}) {
  const toast = useToast();
  // Pre-fill each line with its remaining outstanding quantity.
  const [qtys, setQtys] = useState<string[]>(() => po.items.map((it, i) => String(Math.max(0, it.qty - (received[i] ?? 0)))));
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const remaining = (i: number) => Math.max(0, po.items[i].qty - (received[i] ?? 0));
  const anyEntered = qtys.some((q) => (Number(q) || 0) > 0);

  const submit = async () => {
    if (!schoolId) return;
    // Clamp each line to what's still outstanding; ignore over-receipt.
    const grnItems: GRNItem[] = po.items.map((it, i) => ({
      name: it.name,
      orderedQty: it.qty,
      receivedQty: Math.min(remaining(i), Math.max(0, Number(qtys[i]) || 0)),
    }));
    if (!grnItems.some((g) => g.receivedQty > 0)) { toast.error('Enter at least one received quantity'); return; }

    // New cumulative received per line drives the PO status + per-item receivedQty.
    const newReceived = po.items.map((it, i) => Math.min(it.qty, (received[i] ?? 0) + grnItems[i].receivedQty));
    const allDone = po.items.every((it, i) => newReceived[i] >= it.qty);
    const grnStatus = grnItems.every((g, i) => g.receivedQty >= remaining(i)) && allDone ? 'complete' : 'partial';
    const poStatus: POStatus = allDone ? 'received' : 'partial';
    const updatedItems: POItem[] = po.items.map((it, i) => ({ ...it, receivedQty: newReceived[i] }));

    setBusy(true);
    try {
      // Atomic: the GRN doc + the PO update (received qty + status) commit together,
      // so a failure can't leave received stock with a stale PO status.
      await recordGoodsReceipt(schoolId, {
        schoolId,
        grnNo: docNumber('GRN', grnCount),
        poId: po.id,
        poNo: po.poNo,
        vendorName: po.vendorName,
        items: grnItems,
        receivedDate: new Date(`${date}T00:00:00`).getTime(),
        status: grnStatus,
        receivedByUid: actor.uid,
        receivedByName: actor.name,
        note: note.trim() || undefined,
      }, po.id, { items: updatedItems, status: poStatus }, actor);
      toast.success('Goods receipt recorded', allDone ? 'PO fully received' : 'PO partly received');
      onClose();
    } catch { toast.error('Could not record receipt', 'Please try again.'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} icon="download" tone="gold" title="Record goods receipt" size="md" dismissible={!busy}
      description={po.poNo}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="check" loading={busy} disabled={!anyEntered} onClick={submit}>Record receipt</Button>
      </>}>
      {fullyReceived ? (
        <InfoCard icon="check-circle" title="Already fully received">All ordered quantities have been received against this PO.</InfoCard>
      ) : (
        <>
          <div className="exp-grn-list">
            {po.items.map((it, i) => {
              const rem = remaining(i);
              return (
                <div className="exp-grn-row" key={i}>
                  <div className="exp-grn-row__name">
                    <div>{it.name}</div>
                    <div className="exp-grn-row__sub">Ordered {it.qty}{it.unit ? ` ${it.unit}` : ''} · {rem} outstanding</div>
                  </div>
                  <Input
                    type="number" inputMode="numeric" min={0} max={rem}
                    value={qtys[i]} disabled={rem === 0}
                    onChange={(e) => setQtys((prev) => prev.map((q, j) => (j === i ? e.target.value : q)))}
                    aria-label={`Received quantity for ${it.name}`}
                    className="exp-grn-row__input"
                  />
                </div>
              );
            })}
          </div>
          <div className="grid g-2" style={{ marginTop: 12 }}>
            <Field label="Received on" required><DatePicker value={date} onChange={(e) => setDate(e.target.value)} max={today()} /></Field>
            <Field label="Note" optional><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery note / remark" /></Field>
          </div>
        </>
      )}
    </Modal>
  );
}
