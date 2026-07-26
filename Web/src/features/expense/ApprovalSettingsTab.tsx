import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Field, Input, Checkbox } from '@/components/form';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useExpenseSettings, saveExpenseSettings, type Actor } from '@/features/finance/data';
import type { ApprovalRule, ExpenseSettings } from '@/types/finance';

/** Local editable shape — amounts kept as strings (coerced at save). */
interface RuleForm {
  id: string;
  label: string;
  minAmount: string;
  maxAmount: string;
  approverLabel: string;
}

let seq = 0;
const newRuleId = () => `rule_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const emptyRule = (): RuleForm => ({ id: newRuleId(), label: '', minAmount: '', maxAmount: '', approverLabel: '' });

function toForm(r: ApprovalRule): RuleForm {
  return {
    id: r.id || newRuleId(),
    label: r.label ?? '',
    minAmount: r.minAmount != null ? String(r.minAmount) : '',
    maxAmount: r.maxAmount != null ? String(r.maxAmount) : '',
    approverLabel: r.approverLabel ?? '',
  };
}

const numOrUndef = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
};

/**
 * Per-school approval routing configuration. Admin/Accounts add bands like
 * "≤ ₹10,000 → VP Admin" or "Capital → Trustee". No amounts are hardcoded —
 * an empty ruleset means simple single-step approval.
 */
export function ApprovalSettingsTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: saved, loading } = useExpenseSettings(schoolId);

  const [requireApproval, setRequireApproval] = useState(true);
  const [rules, setRules] = useState<RuleForm[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saved) return;
    setRequireApproval(saved.requireApproval !== false);
    setRules((saved.approvalRules ?? []).map(toForm));
  }, [saved]);

  const setRule = (id: string, patch: Partial<RuleForm>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRule = () => setRules((rs) => [...rs, emptyRule()]);
  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id));

  const submit = async () => {
    if (!schoolId) return;
    // Drop blank rows; a rule needs at least a label to be meaningful.
    const cleaned: ApprovalRule[] = rules
      .filter((r) => r.label.trim())
      .map((r) => {
        const rule: ApprovalRule = { id: r.id, label: r.label.trim() };
        const min = numOrUndef(r.minAmount);
        const max = numOrUndef(r.maxAmount);
        if (min != null) rule.minAmount = min;
        if (max != null) rule.maxAmount = max;
        if (r.approverLabel.trim()) rule.approverLabel = r.approverLabel.trim();
        return rule;
      });

    // Guard against inverted bands (min > max) — confusing routing.
    const inverted = cleaned.find((r) => r.minAmount != null && r.maxAmount != null && r.minAmount > r.maxAmount);
    if (inverted) { toast.error('Check the amounts', `"${inverted.label}" has a minimum above its maximum.`); return; }

    setBusy(true);
    try {
      const payload: ExpenseSettings = { requireApproval, approvalRules: cleaned };
      await saveExpenseSettings(schoolId, payload, actor);
      toast.success('Approval settings saved');
    } catch { toast.error('Could not save settings', 'Please try again.'); } finally { setBusy(false); }
  };

  if (loading) return <Skeleton height={320} />;

  return (
    <div className="grid g-2">
      <div>
        <Panel title="Approval rules" sub="Route requisitions to the right approver by estimated amount."
          headerRight={canWrite ? <Button variant="subtle" size="sm" leftIcon="plus" onClick={addRule}>Add rule</Button> : undefined}>
          <div style={{ marginBottom: 12 }}>
            <Checkbox checked={requireApproval} onChange={setRequireApproval} disabled={!canWrite}
              label="Require approval before ordering"
              description="When off, submitting a requisition approves it directly (no separate sign-off)." />
          </div>

          {rules.length === 0 ? (
            <EmptyState icon="shield-check" title="No rules yet"
              message={canWrite ? 'Single-step approval is in effect. Add a rule to route by amount — e.g. “≤ ₹10,000 → VP Admin”.' : 'No approval rules configured. Single-step approval is in effect.'}
              action={canWrite ? <Button variant="gold" size="sm" leftIcon="plus" onClick={addRule}>Add first rule</Button> : undefined} />
          ) : (
            <div className="exp-rules">
              {rules.map((r, i) => (
                <div className="exp-rule" key={r.id}>
                  <div className="exp-rule__head">
                    <span className="exp-rule__no">Rule {i + 1}</span>
                    {canWrite && (
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove rule ${i + 1}`} onClick={() => removeRule(r.id)} />
                    )}
                  </div>
                  <Field label="Label" required>
                    <Input value={r.label} onChange={(e) => setRule(r.id, { label: e.target.value })} placeholder="e.g. Routine purchases" disabled={!canWrite} />
                  </Field>
                  <div className="grid g-2">
                    <Field label="Min amount (₹)" optional hint="Leave blank for no lower bound.">
                      <Input value={r.minAmount} onChange={(e) => setRule(r.id, { minAmount: e.target.value })} type="text" inputMode="decimal" placeholder="0" disabled={!canWrite} />
                    </Field>
                    <Field label="Max amount (₹)" optional hint="Leave blank for no upper bound.">
                      <Input value={r.maxAmount} onChange={(e) => setRule(r.id, { maxAmount: e.target.value })} type="text" inputMode="decimal" placeholder="No limit" disabled={!canWrite} />
                    </Field>
                  </div>
                  <Field label="Approver" optional hint="Who signs this off, e.g. VP Admin, Principal, Trustee.">
                    <Input value={r.approverLabel} onChange={(e) => setRule(r.id, { approverLabel: e.target.value })} placeholder="e.g. Principal" disabled={!canWrite} />
                  </Field>
                </div>
              ))}
            </div>
          )}

          {canWrite ? (
            <div style={{ marginTop: 14 }}>
              <Button variant="gold" leftIcon="check" loading={busy} onClick={submit}>Save settings</Button>
            </div>
          ) : (
            <InfoCard icon="lock" title="View only">You don't have permission to edit approval settings.</InfoCard>
          )}
        </Panel>
      </div>

      <div>
        <Panel title="How routing works">
          <div className="exp-rule-help">
            <p>Rules are matched <strong>top to bottom</strong> by a requisition's estimated total. The first rule whose amount band contains the total decides the approver shown on the requisition.</p>
            <p>A rule with no min and no max acts as a <strong>catch-all</strong> — place it last.</p>
            <p>With no rules, any approver or Accounts can sign off (simple single-step approval).</p>
          </div>
          {rules.some((r) => r.label.trim()) && (
            <div className="exp-rule-preview" aria-label="Rule preview">
              {rules.filter((r) => r.label.trim()).map((r) => {
                const band = [
                  r.minAmount.trim() ? `≥ ${formatINR(Number(r.minAmount) || 0)}` : null,
                  r.maxAmount.trim() ? `≤ ${formatINR(Number(r.maxAmount) || 0)}` : null,
                ].filter(Boolean).join(' · ') || 'Any amount';
                return (
                  <div className="exp-rule-preview__row" key={r.id}>
                    <Icon name="shield-check" size={14} />
                    <span className="exp-rule-preview__label">{r.label}</span>
                    <span className="exp-rule-preview__band">{band}</span>
                    {r.approverLabel.trim() && <span className="exp-rule-preview__who">→ {r.approverLabel.trim()}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
