import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Field, Select, Textarea } from '@/components/form';
import { Modal, ConfirmModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { usePocsoCase, updatePocsoCase } from '@/features/compliance/data';
import { ConfidentialBanner } from '../components/Confidential';
import { markPocsoReported } from '../safeguardingData';
import { useNow } from '../useNow';
import {
  pocsoReportingCountdown,
  pocsoDeadlineLabel,
  isPocsoReported,
} from '../safeguardingSchema';
import {
  POCSO_SEVERITY_META,
  POCSO_STATUS_META,
  POCSO_NEXT,
  POCSO_REFERRAL_OPTIONS,
} from '../meta';
import type { PocsoCase, PocsoStatus } from '@/types/compliance';

/** Confidential POCSO case file with the committee workflow. */
export function PocsoDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canRead = can('pocso.read');
  const canWrite = can('pocso.write');
  const { data: c, loading } = usePocsoCase(schoolId, canRead ? id : undefined);
  const now = useNow();

  const back = () => navigate('/safeguarding');
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  // Local working copy of editable committee fields.
  const [committeeNotes, setCommitteeNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [referredTo, setReferredTo] = useState('');
  const [nextStatus, setNextStatus] = useState<PocsoStatus | ''>('');
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // POCSO s.19 mandatory-reporting capture.
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAuthority, setReportAuthority] = useState('');

  useEffect(() => {
    if (c) {
      setCommitteeNotes(c.committeeNotes ?? '');
      setActionTaken(c.actionTaken ?? '');
      setReferredTo(c.referredTo ?? '');
    }
  }, [c]);

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  // Defense-in-depth: child-protection files are CPO/Principal-confidential. The
  // Hub gates the list, but the detail route is deep-linkable — re-gate it here
  // (Firestore rules remain the authoritative boundary).
  if (!canRead) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="Child-protection records are limited to the Child Protection Officer."
            action={<Button variant="subtle" onClick={back}>Back</Button>}
          />
        </Panel>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="nx-page">
        <Skeleton height={360} />
      </div>
    );
  }
  if (!c) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="shield-check"
            title="Case not found"
            action={
              <Button variant="subtle" onClick={back}>
                Back
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const sev = POCSO_SEVERITY_META[c.severity];
  const st = POCSO_STATUS_META[c.status];
  const transitions = POCSO_NEXT[c.status];
  const isClosed = c.status === 'closed';
  const reported = isPocsoReported(c);
  const countdown = pocsoReportingCountdown(c, now); // null once reported
  const deadlineTone = reported ? 'done' : countdown?.overdue ? 'overdue' : 'ok';

  const persist = async (patch: Partial<PocsoCase>, successMsg: string) => {
    setSaving(true);
    try {
      await updatePocsoCase(schoolId, c.id, patch, actor);
      toast.success(successMsg, c.caseNo);
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = () =>
    persist(
      {
        committeeNotes: committeeNotes.trim() || undefined,
        actionTaken: actionTaken.trim() || undefined,
        referredTo: referredTo.trim() || undefined,
      },
      'Case updated',
    );

  const advance = async (to: PocsoStatus) => {
    if (to === 'closed') {
      setConfirmClose(true);
      return;
    }
    const patch: Partial<PocsoCase> = { status: to };
    if (to === 'referred') patch.referredTo = referredTo.trim() || undefined;
    if (to === 'action_taken') patch.actionTaken = actionTaken.trim() || undefined;
    await persist(patch, `Moved to ${POCSO_STATUS_META[to].label}`);
    setNextStatus('');
  };

  const confirmCloseCase = async () => {
    await persist(
      {
        status: 'closed',
        closedAt: Date.now(),
        committeeNotes: committeeNotes.trim() || undefined,
        actionTaken: actionTaken.trim() || undefined,
        referredTo: referredTo.trim() || undefined,
      },
      'Case closed',
    );
    setConfirmClose(false);
    setNextStatus('');
  };

  const recordReported = async () => {
    setSaving(true);
    try {
      await markPocsoReported(schoolId, c.id, reportAuthority.trim(), actor);
      toast.success('Reporting recorded', c.caseNo);
      setReportOpen(false);
      setReportAuthority('');
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <button type="button" className="nx-formpage__back" onClick={back} aria-label="Go back">
            <Icon name="chevron-left" size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 className="nx-page__title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Icon name="shield" size={18} aria-hidden="true" /> {c.caseNo}
            </h1>
            <p className="nx-page__sub">{c.natureOfConcern}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge variant={sev.variant}>{sev.label}</Badge>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
      </div>

      <ConfidentialBanner />

      {/* POCSO s.19 — mandatory reporting clock + record control */}
      <div className={`sg-deadline sg-deadline--${deadlineTone}`} role={countdown?.overdue ? 'alert' : 'note'}>
        <span className="sg-deadline__icon">
          <Icon name={reported ? 'check-circle' : 'clock'} size={18} aria-hidden="true" />
        </span>
        <div className="sg-deadline__body">
          {reported ? (
            <>
              <div className="sg-deadline__title">
                Reported to authorities{c.reportedToAuthority ? ` — ${c.reportedToAuthority}` : ''}
              </div>
              <div className="sg-deadline__sub">
                {c.reportedToAuthoritiesAt ? `Recorded ${formatDate(c.reportedToAuthoritiesAt)}` : ''}
              </div>
            </>
          ) : (
            <>
              <div className="sg-deadline__title">
                POCSO s.19 reporting {countdown?.overdue ? 'OVERDUE' : 'due'}
                {countdown ? ` — ${countdown.text}` : ''}
              </div>
              <div className="sg-deadline__sub">
                Mandatory report due by {pocsoDeadlineLabel(c)} (24h from when the concern was logged).
              </div>
            </>
          )}
        </div>
        {canWrite && !reported && (
          <Button variant={countdown?.overdue ? 'gold' : 'subtle'} size="sm" leftIcon="check" onClick={() => setReportOpen(true)}>
            Record reporting
          </Button>
        )}
      </div>

      <div className="sg-detail-grid">
        <Panel title="Case file">
          <div className="sg-field">
            <div className="sg-field__label">Factual summary</div>
            <div className="sg-field__value">{c.summary}</div>
          </div>
          <div className="sg-field">
            <div className="sg-field__label">Reported</div>
            <div className="sg-field__value">
              {formatDate(c.reportedAt)} ({formatRelative(c.reportedAt)})
              {c.reportedByRole ? ` · by ${c.reportedByRole}` : ''}
            </div>
          </div>
          {c.involvesStudentId && (
            <div className="sg-field">
              <div className="sg-field__label">Linked student (internal ref)</div>
              <div className="sg-field__value">
                <span className="sg-mask">
                  <Icon name="user" size={12} aria-hidden="true" /> {c.involvesStudentId}
                </span>
              </div>
            </div>
          )}
          {c.closedAt && (
            <div className="sg-field">
              <div className="sg-field__label">Closed</div>
              <div className="sg-field__value">{formatDate(c.closedAt)}</div>
            </div>
          )}
        </Panel>

        <Panel title="Committee workflow">
          {!canWrite ? (
            <div className="sg-field__value" style={{ color: 'var(--text-muted)' }}>
              You have read-only access to this case.
            </div>
          ) : isClosed ? (
            <EmptyState
              icon="check-circle"
              title="Case closed"
              message={c.closedAt ? `Closed on ${formatDate(c.closedAt)}.` : undefined}
            />
          ) : (
            <div className="sg-flow">
              <Field label="Committee notes" optional>
                <Textarea
                  value={committeeNotes}
                  onChange={(e) => setCommitteeNotes(e.target.value)}
                  rows={3}
                  placeholder="Inquiry findings, committee observations…"
                />
              </Field>
              <Field label="Action taken" optional>
                <Textarea
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  rows={2}
                  placeholder="Steps taken / outcome"
                />
              </Field>
              <Field label="Referred to" optional>
                <Select
                  value={referredTo}
                  onChange={(e) => setReferredTo(e.target.value)}
                  placeholder="Select a referral"
                  options={POCSO_REFERRAL_OPTIONS}
                />
              </Field>

              <Button variant="subtle" leftIcon="check" onClick={saveNotes} loading={saving} block>
                Save notes
              </Button>

              {transitions.length > 0 && (
                <>
                  <div className="sg-flow__hint">Advance the case to the next stage:</div>
                  <Field label="Move to" optional>
                    <Select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as PocsoStatus | '')}
                      placeholder="Choose next status"
                      options={transitions.map((s) => ({ value: s, label: POCSO_STATUS_META[s].label }))}
                    />
                  </Field>
                  <Button
                    variant="gold"
                    leftIcon="arrow-right"
                    disabled={!nextStatus || saving}
                    onClick={() => nextStatus && advance(nextStatus)}
                    block
                  >
                    Update status
                  </Button>
                </>
              )}
            </div>
          )}
        </Panel>
      </div>

      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={confirmCloseCase}
        tone="danger"
        loading={saving}
        title="Close this case?"
        message={`Case ${c.caseNo} will be marked closed. This records a closure date and cannot be advanced further.`}
        confirmLabel="Close case"
      />

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        icon="shield"
        tone="gold"
        title="Record mandatory reporting"
        description="POCSO s.19 requires reporting an apprehended offence to the authorities without delay."
        size="md"
        dismissible={!saving}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gold" leftIcon="check" loading={saving} onClick={recordReported}>
              Record
            </Button>
          </>
        }
      >
        <Field label="Reported to" hint="Who the matter was reported to (e.g. SJPU / police / CWC).">
          <Select
            value={reportAuthority}
            onChange={(e) => setReportAuthority(e.target.value)}
            placeholder="Select an authority"
            options={POCSO_REFERRAL_OPTIONS}
          />
        </Field>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>
          This stamps the case with the current date and time as the reporting record. It does not transmit
          anything externally.
        </p>
      </Modal>
    </div>
  );
}
