import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { ConfirmModal, Modal } from '@/components/Modal';
import { Field, Textarea } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { Icon, type IconName } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { formatINR, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import {
  useRequisition, useExpenseSettings, updateRequisition, deleteRequisition,
  decideRequisition, matchApprovalRule, deleteField, type Actor, type RequisitionDecision,
} from '@/features/finance/data';
import { REQUISITION_STATUS_META } from '@/features/finance/meta';
import type { RequisitionStatus } from '@/types/finance';

/** The four approver decisions, with the copy + tone for each confirm dialog. */
const DECISIONS: Record<RequisitionDecision, {
  title: string; verb: string; icon: IconName; tone: 'gold' | 'danger' | 'warning' | 'info';
  variant: 'gold' | 'danger' | 'subtle'; requireNote: boolean; hint: string; placeholder: string;
}> = {
  approve: { title: 'Approve requisition', verb: 'Approve', icon: 'check-circle', tone: 'gold', variant: 'gold', requireNote: false, hint: 'Optional approval remark (visible to the requester).', placeholder: 'Approved — proceed to PO.' },
  reject: { title: 'Reject requisition', verb: 'Reject', icon: 'x', tone: 'danger', variant: 'danger', requireNote: true, hint: 'Explain why this was rejected (visible to the requester).', placeholder: 'Reason for rejection…' },
  clarify: { title: 'Request clarification', verb: 'Request clarification', icon: 'message', tone: 'info', variant: 'subtle', requireNote: true, hint: 'Ask the requester what you need to know — it bounces back to them to answer.', placeholder: 'What information do you need?' },
  return: { title: 'Return for modification', verb: 'Return', icon: 'refresh', tone: 'warning', variant: 'subtle', requireNote: true, hint: 'Tell the requester what to change — they can edit and resubmit.', placeholder: 'What should be changed before resubmission?' },
};

/** Decisions awaiting a requester response (raiser can answer + resubmit). */
const NEEDS_RESPONSE: RequisitionStatus[] = ['clarification_requested', 'returned'];

export function RequisitionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate, isApprover } = useOwnership('expense');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  // Approve/reject/clarify/return belong to approvers (VP-admin/principal) or
  // Accounts operators — but NEVER the person who raised it (segregation of
  // duties: you can't sign off your own request). The guard is applied below
  // once `req` is loaded and the raiser is known.

  const { data: req, loading } = useRequisition(schoolId, id);
  const { data: settings } = useExpenseSettings(schoolId);

  const [decision, setDecision] = useState<RequisitionDecision | null>(null);
  const [note, setNote] = useState('');
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState('');
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = () => navigate('/expense');

  if (loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={280} /></div>;
  if (!req) {
    return <div className="nx-page"><Panel><EmptyState icon="file-text" title="Requisition not found" message="This requisition may have been removed." action={<Button variant="subtle" onClick={back}>Back</Button>} /></Panel></div>;
  }

  const meta = REQUISITION_STATUS_META[req.status];
  const isRaiser = !!req.requestedByUid && req.requestedByUid === uid;
  // Segregation of duties: an approver/operator may decide any requisition EXCEPT
  // one they raised themselves. (Super Admin is exempt — `isApprover` is forced
  // true for them only as a platform override, and they aren't a real raiser.)
  const canDecide = (isApprover || canOperate) && !isRaiser;
  // The requester (or an operator helping them) can answer a clarification / returned item and resubmit.
  const canRespond = NEEDS_RESPONSE.includes(req.status) && (isRaiser || canOperate);
  // The requester can edit items/details while the requisition is still theirs to change.
  const canEdit = (isRaiser || canOperate) && ['draft', 'returned', 'clarification_requested'].includes(req.status);
  const needsApproval = settings?.requireApproval !== false; // default: require a sign-off step.
  const rule = matchApprovalRule(settings?.approvalRules, req.estTotal);

  const setStatus = async (status: RequisitionStatus, successMsg: string) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await updateRequisition(schoolId, req.id, { status }, actor);
      toast.success(successMsg);
    } catch { toast.error('Could not update', 'Please try again.'); } finally { setBusy(false); }
  };

  // Requester answers the clarification (or notes their changes) and resubmits.
  const resubmit = async () => {
    if (!schoolId) return;
    const answer = response.trim();
    if (req.status === 'clarification_requested' && !answer) { toast.error('Add your answer', 'Respond to the clarification before resubmitting.'); return; }
    setBusy(true);
    try {
      await updateRequisition(schoolId, req.id, {
        status: 'submitted',
        // Carry the requester's reply as the latest note; clear the open question.
        // `deleteField()` actually removes the stored note (a plain `undefined`
        // is stripped before the write and would leave a stale clarification).
        approvalNote: answer || (deleteField() as unknown as undefined),
        decisionNote: answer || (deleteField() as unknown as undefined),
        decidedByName: actor.name,
        decidedAt: Date.now(),
        clarificationNote: deleteField() as unknown as undefined,
      }, actor);
      toast.success('Resubmitted for approval');
      setResponding(false); setResponse('');
    } catch { toast.error('Could not resubmit', 'Please try again.'); } finally { setBusy(false); }
  };

  const submit = async () => {
    // Submitting moves to the approval queue — unless this school skips sign-off.
    if (needsApproval) return setStatus('submitted', 'Submitted for approval');
    if (!schoolId) return;
    setBusy(true);
    try {
      await decideRequisition(schoolId, req.id, 'approve', 'Auto-approved (approval not required for this school).', actor);
      toast.success('Requisition approved');
    } catch { toast.error('Could not update', 'Please try again.'); } finally { setBusy(false); }
  };

  const decide = async () => {
    if (!decision || !schoolId) return;
    const cfg = DECISIONS[decision];
    if (cfg.requireNote && !note.trim()) { toast.error('A note is required', 'Tell the requester why.'); return; }
    setBusy(true);
    try {
      await decideRequisition(schoolId, req.id, decision, note, actor);
      toast.success(
        decision === 'approve' ? 'Requisition approved'
        : decision === 'reject' ? 'Requisition rejected'
        : decision === 'clarify' ? 'Clarification requested'
        : 'Returned for modification',
      );
      setDecision(null); setNote('');
    } catch { toast.error('Could not update', 'Please try again.'); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!schoolId) return;
    setBusy(true);
    try { await deleteRequisition(schoolId, req.id, actor); toast.success('Requisition deleted'); back(); }
    catch { toast.error('Could not delete'); setBusy(false); }
  };

  const createPO = () => {
    // Prefill the PO form from this requisition (router state seam — no shared edits).
    navigate('/expense/po/new', { state: { requisition: req } });
  };

  const openDecision = (d: RequisitionDecision) => { setNote(''); setDecision(d); };

  // Status timeline: created → submitted → (latest decision) → ordered.
  const noteIcon: IconName =
    req.status === 'rejected' ? 'alert-triangle'
    : req.status === 'approved' ? 'check-circle'
    : req.status === 'clarification_requested' ? 'message'
    : req.status === 'returned' ? 'refresh'
    : 'info';
  const latestNote = req.approvalNote ?? req.decisionNote;

  return (
    <div className="nx-page">
      <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={back}>Requisitions</Button>

      <Panel>
        <div className="nx-detail__head" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="nx-page__title" style={{ marginBottom: 2 }}>{req.title}</h1>
            <p className="nx-page__sub" style={{ margin: 0 }}>
              {req.reqNo}{req.department ? ` · ${req.department}` : ''}
              {req.requestedByName ? ` · by ${req.requestedByName}` : ''}
              {req.createdAt ? ` · ${formatDate(req.createdAt)}` : ''}
            </p>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
      </Panel>

      {/* Routing — which configured rule governs this requisition's approval. */}
      <ApprovalRouting estTotal={req.estTotal} rule={rule} needsApproval={needsApproval} />

      {req.justification && (
        <InfoCard icon="info" title="Justification">{req.justification}</InfoCard>
      )}

      <Panel title="Items" sub={`${req.items.length}`}>
        <div className="nx-dt-tablewrap">
          <table className="fin-lines">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qty</th>
                <th className="num">Est. cost</th>
                <th className="num">Est. total</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td className="num">{it.qty}{it.unit ? ` ${it.unit}` : ''}</td>
                  <td className="num">{it.estCost != null ? formatINR(it.estCost) : '—'}</td>
                  <td className="num">{it.estCost != null ? formatINR(it.estCost * it.qty) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Estimated total</td>
                <td className="num"><span className="fin-amount">{formatINR(req.estTotal)}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Phone item cards */}
        <div className="exp-mlist" aria-hidden={false}>
          {req.items.map((it, i) => (
            <div className="exp-mrow" key={i}>
              <div className="exp-mrow__title">{it.name}</div>
              <div className="exp-mrow__meta">
                {it.qty}{it.unit ? ` ${it.unit}` : ''}
                {it.estCost != null ? <> · {formatINR(it.estCost)} each · <span className="fin-amount fin-amount--muted">{formatINR(it.estCost * it.qty)}</span></> : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Outstanding clarification — surfaced prominently to the requester. */}
      {req.status === 'clarification_requested' && req.clarificationNote && (
        <InfoCard icon="message" title={`Clarification requested${req.decidedByName ? ` — ${req.decidedByName}` : ''}`}>
          {req.clarificationNote}
        </InfoCard>
      )}

      {/* Latest approver note (for any decided state). */}
      {latestNote && req.status !== 'clarification_requested' && (
        <InfoCard icon={noteIcon} title={`${meta.label} — note${req.decidedByName ?? req.approverName ? ` · ${req.decidedByName ?? req.approverName}` : ''}`}>
          {latestNote}
        </InfoCard>
      )}

      <ApprovalTimeline status={req.status} req={req} />

      {/* Segregation-of-duties note: a raiser who is also an approver/operator
          can't sign off their own request — it waits for someone else. */}
      {req.status === 'submitted' && isRaiser && (isApprover || canOperate) && (
        <InfoCard icon="shield-check" title="Awaiting another approver">
          You raised this requisition, so you can't approve it yourself. Another approver or Accounts will sign it off.
        </InfoCard>
      )}

      {/* Next-step signpost for the approved state — clarifies who acts next. */}
      {req.status === 'approved' && (
        <InfoCard icon="box" title="Approved — next: purchase order">
          {canOperate
            ? 'Create a purchase order from this requisition. Once goods arrive you record a goods receipt, then record the expense.'
            : 'Accounts will create a purchase order from this requisition, receive the goods, then record the expense.'}
        </InfoCard>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        {/* Submit is the requester's own action — open to whoever raised it. */}
        {req.status === 'draft' && (
          <Button variant="gold" leftIcon="send" loading={busy} onClick={submit}>
            {needsApproval ? 'Submit for approval' : 'Submit & approve'}
          </Button>
        )}

        {/* Edit the requisition's items/details while it's still the requester's to change. */}
        {canEdit && (
          <Button variant="subtle" leftIcon="edit" onClick={() => navigate(`/expense/requisitions/${req.id}/edit`)}>
            Edit
          </Button>
        )}

        {/* Requester response — answer a clarification / returned item, then resubmit. */}
        {canRespond && (
          <Button variant="gold" leftIcon="send" onClick={() => { setResponse(''); setResponding(true); }}>
            {req.status === 'clarification_requested' ? 'Answer & resubmit' : 'Resubmit for approval'}
          </Button>
        )}

        {/* The four approver actions — approvers (VP-admin/principal) or Accounts operators. */}
        {req.status === 'submitted' && canDecide && (
          <>
            <Button variant="gold" leftIcon="check" onClick={() => openDecision('approve')}>Approve</Button>
            <Button variant="subtle" leftIcon="x" onClick={() => openDecision('reject')}>Reject</Button>
            <Button variant="subtle" leftIcon="message" onClick={() => openDecision('clarify')}>Request clarification</Button>
            <Button variant="subtle" leftIcon="refresh" onClick={() => openDecision('return')}>Return for modification</Button>
          </>
        )}

        {/* Procurement actions — Accounts operators only. */}
        {req.status === 'approved' && canOperate && (
          <Button variant="gold" leftIcon="box" onClick={createPO}>Create purchase order</Button>
        )}
        {(req.status === 'draft' || req.status === 'rejected') && canOperate && (
          <Button variant="ghost" leftIcon="minus-circle" onClick={() => setRemoving(true)}>Delete</Button>
        )}
      </div>

      {decision && (
        <DecisionModal
          decision={decision} note={note} setNote={setNote} busy={busy}
          onClose={() => setDecision(null)} onConfirm={decide}
        />
      )}

      <Modal open={responding} onClose={() => setResponding(false)}
        icon={req.status === 'clarification_requested' ? 'message' : 'refresh'} tone="gold"
        title={req.status === 'clarification_requested' ? 'Answer clarification' : 'Resubmit requisition'} size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setResponding(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="send" loading={busy} onClick={resubmit}>Resubmit</Button>
        </>}>
        {req.status === 'clarification_requested' && req.clarificationNote && (
          <InfoCard icon="message" title="Clarification requested">{req.clarificationNote}</InfoCard>
        )}
        <Field label="Your response" required={req.status === 'clarification_requested'} optional={req.status !== 'clarification_requested'}
          hint="Visible to the approver. This goes back into the approval queue.">
          <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3}
            placeholder={req.status === 'clarification_requested' ? 'Provide the details requested…' : 'Note what you changed (optional)…'} autoFocus />
        </Field>
      </Modal>

      <ConfirmModal open={removing} onClose={() => setRemoving(false)} onConfirm={remove} tone="danger" loading={busy}
        title="Delete requisition?" message={`"${req.title}" will be permanently removed.`} confirmLabel="Delete" />
    </div>
  );
}

/** Shows which configured rule routes this requisition (by estimated total). */
function ApprovalRouting({ estTotal, rule, needsApproval }: {
  estTotal: number; rule: ReturnType<typeof matchApprovalRule>; needsApproval: boolean;
}) {
  if (!needsApproval) {
    return <InfoCard icon="info" title="Approval routing">This school approves requisitions directly — no separate sign-off step is required.</InfoCard>;
  }
  if (!rule) {
    return <InfoCard icon="info" title="Approval routing">Single-step approval — any approver or Accounts can sign this off. Add approval rules in Settings to route by amount.</InfoCard>;
  }
  const band = [
    rule.minAmount != null ? `≥ ${formatINR(rule.minAmount)}` : null,
    rule.maxAmount != null ? `≤ ${formatINR(rule.maxAmount)}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <InfoCard icon="shield-check" title="Approval routing">
      <strong>{rule.label}</strong> applies to this requisition (est. {formatINR(estTotal)}).
      {rule.approverLabel ? <> Approver: <strong>{rule.approverLabel}</strong>.</> : null}
      {band ? <span style={{ color: 'var(--text-muted)' }}> {' '}({band})</span> : null}
    </InfoCard>
  );
}

/** Compact status timeline using the kit's .timeline / .tl-row classes. */
function ApprovalTimeline({ status, req }: { status: RequisitionStatus; req: { createdAt?: number; decidedAt?: number; decidedByName?: string; approverName?: string } }) {
  const meta = REQUISITION_STATUS_META[status];
  const decidedName = req.decidedByName ?? req.approverName;
  const steps: { time?: number; icon: IconName; title: string; sub?: string }[] = [
    { time: req.createdAt, icon: 'file-text', title: 'Raised', sub: 'Requisition created' },
  ];
  if (status !== 'draft') {
    steps.push({ icon: 'send', title: 'Submitted', sub: 'Sent for approval' });
  }
  if (['approved', 'rejected', 'clarification_requested', 'returned', 'ordered', 'closed'].includes(status)) {
    steps.push({
      time: req.decidedAt,
      icon: status === 'rejected' ? 'alert-triangle' : status === 'approved' || status === 'ordered' || status === 'closed' ? 'check-circle' : status === 'returned' ? 'refresh' : 'message',
      title: meta.label,
      sub: decidedName ? `by ${decidedName}` : undefined,
    });
  }

  return (
    <Panel title="Status" sub={meta.label}>
      <div className="timeline" role="list" aria-label="Requisition status history">
        {steps.map((s, i) => (
          <div className="tl-row" role="listitem" key={i}>
            <span className="tl-time">{s.time ? formatDate(s.time) : '—'}</span>
            <span className="tl-dot" aria-hidden="true" />
            <span className="tl-body">
              <span className="ti"><Icon name={s.icon} size={14} /> {s.title}</span>
              {s.sub && <span className="sb">{s.sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Confirm dialog for a single approver decision (note required for all but approve). */
function DecisionModal({ decision, note, setNote, busy, onClose, onConfirm }: {
  decision: RequisitionDecision; note: string; setNote: (v: string) => void;
  busy: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const cfg = DECISIONS[decision];
  return (
    <Modal open onClose={onClose} icon={cfg.icon} tone={cfg.tone} title={cfg.title} size="md" dismissible={!busy}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={cfg.variant} leftIcon={cfg.icon} loading={busy} onClick={onConfirm}>{cfg.verb}</Button>
      </>}>
      <Field label="Note" required={cfg.requireNote} optional={!cfg.requireNote} hint={cfg.hint}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={cfg.placeholder} autoFocus />
      </Field>
    </Modal>
  );
}
