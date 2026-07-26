import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Field, Textarea } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { applySubscriptionAction } from '@/features/platform/data';
import { SUBSCRIPTION_ACTIONS } from '@/features/platform/meta';
import type { School, SubscriptionAction } from '@/types/models';

/**
 * Subscription lifecycle action with a MANDATORY reason (stored in the audit
 * log, per spec §12.3). Used from the registry and the school detail page.
 */
export function SubscriptionActionModal({
  school,
  action,
  open,
  onClose,
  onDone,
}: {
  school: School;
  action: SubscriptionAction | null;
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const toast = useToast();
  const { uid, member } = useSession();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  // Reset form state whenever a new action is opened so stale reason/validation
  // from a prior session never pre-fills or shows errors for a different action.
  useEffect(() => {
    if (action) {
      setReason('');
      setTouched(false);
    }
  }, [action]);

  if (!action) return null;
  const meta = SUBSCRIPTION_ACTIONS[action];
  const reasonInvalid = touched && reason.trim().length < 5;

  const submit = async () => {
    setTouched(true);
    if (reason.trim().length < 5) return;
    setBusy(true);
    try {
      await applySubscriptionAction(school, action, reason.trim(), { uid: uid ?? 'unknown', name: member?.name });
      const past = `${action}${action.endsWith('e') ? 'd' : 'ed'}`;
      toast.success(`${school.name} ${past}`, meta.description);
      setReason('');
      setTouched(false);
      onClose();
      onDone?.();
    } catch {
      toast.error('Action failed', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="sm"
      icon={meta.icon}
      tone={meta.tone === 'gold' ? 'gold' : meta.tone === 'warning' ? 'warning' : 'danger'}
      title={`${meta.label} — ${school.name}`}
      description={meta.description}
      dismissible={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={meta.destructive ? 'danger' : 'gold'} loading={busy} onClick={submit}>
            {meta.label}
          </Button>
        </>
      }
    >
      <Field
        label="Reason (required)"
        htmlFor="sub-reason"
        error={reasonInvalid ? 'Please enter a brief reason (min 5 characters).' : undefined}
        hint="Recorded in the platform audit trail and shared with the school admin where applicable."
      >
        <Textarea
          id="sub-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          invalid={reasonInvalid}
          placeholder={`Why are you ${action === 'terminate' ? 'terminating' : `${action.replace(/e$/, '')}ing`} this school?`}
          rows={3}
          autoFocus
        />
      </Field>
      {meta.destructive && (
        <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger)', lineHeight: 1.5 }}>
          This starts a 30-day soft-delete. The school can request a data export during this window before permanent
          deletion.
        </p>
      )}
    </Modal>
  );
}
