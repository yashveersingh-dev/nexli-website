import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Field, Select, Input, Textarea } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrievance, updateGrievance } from '@/features/compliance/data';
import { ConfidentialBanner } from '../components/Confidential';
import { GRIEVANCE_STATUS_META, GRIEVANCE_PRIORITY_META, GRIEVANCE_NEXT } from '../meta';
import { isGrievanceOverdue } from '../safeguardingSchema';
import { GRIEVANCE_CATEGORY_OPTIONS } from '@/features/compliance/meta';
import type { Grievance, GrievanceStatus } from '@/types/compliance';

const RESOLVING = new Set<GrievanceStatus>(['resolved', 'closed']);

/** Grievance redressal detail + workflow. */
export function GrievanceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canRead = can('pocso.read') || can('grievances.read');
  const canWrite = can('pocso.write') || can('grievances.write');
  const { data: g, loading } = useGrievance(schoolId, canRead ? id : undefined);

  const back = () => navigate('/safeguarding');
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const [assignedToName, setAssignedToName] = useState('');
  const [resolution, setResolution] = useState('');
  const [nextStatus, setNextStatus] = useState<GrievanceStatus | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (g) {
      setAssignedToName(g.assignedToName ?? '');
      setResolution(g.resolution ?? '');
    }
  }, [g]);

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  // Defense-in-depth: grievances are confidential to the CPO/grievance committee.
  // The Hub gates the list; this deep-linkable detail route re-gates on read.
  if (!canRead) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="Grievance records are limited to the grievance redressal officer."
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
  if (!g) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="message"
            title="Grievance not found"
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

  const st = GRIEVANCE_STATUS_META[g.status];
  const pr = GRIEVANCE_PRIORITY_META[g.priority];
  const catLabel = GRIEVANCE_CATEGORY_OPTIONS.find((o) => o.value === g.category)?.label ?? g.category;
  const transitions = GRIEVANCE_NEXT[g.status];
  const done = RESOLVING.has(g.status);
  const overdue = isGrievanceOverdue(g);
  const who = g.anonymous ? 'Anonymous' : g.raisedByName || 'Unknown';

  const persist = async (patch: Partial<Grievance>, successMsg: string) => {
    setSaving(true);
    try {
      await updateGrievance(schoolId, g.id, patch, actor);
      toast.success(successMsg, g.refNo);
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = () =>
    persist(
      { assignedToName: assignedToName.trim() || undefined, resolution: resolution.trim() || undefined },
      'Grievance updated',
    );

  const advance = async (to: GrievanceStatus) => {
    const now = Date.now();
    const patch: Partial<Grievance> = { status: to };
    if (to === 'acknowledged' && !g.acknowledgedAt) patch.acknowledgedAt = now;
    if (to === 'resolved') {
      patch.resolution = resolution.trim() || g.resolution || undefined;
      patch.resolvedAt = g.resolvedAt ?? now;
    }
    if (assignedToName.trim() && assignedToName.trim() !== (g.assignedToName ?? '')) {
      patch.assignedToName = assignedToName.trim();
    }
    await persist(patch, `Moved to ${GRIEVANCE_STATUS_META[to].label}`);
    setNextStatus('');
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
              <Icon name="message" size={18} aria-hidden="true" /> {g.refNo}
            </h1>
            <p className="nx-page__sub">{g.subject}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {overdue && (
            <span className="sg-overdue">
              <Icon name="clock" size={12} aria-hidden="true" /> Overdue
            </span>
          )}
          <Badge variant={pr.variant}>{pr.label}</Badge>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
      </div>

      <ConfidentialBanner />

      <div className="sg-detail-grid">
        <Panel title="Grievance">
          <div className="sg-field">
            <div className="sg-field__label">Description</div>
            <div className="sg-field__value">{g.description}</div>
          </div>
          <div className="sg-field">
            <div className="sg-field__label">Category</div>
            <div className="sg-field__value">{catLabel}</div>
          </div>
          {g.against && (
            <div className="sg-field">
              <div className="sg-field__label">Against</div>
              <div className="sg-field__value">{g.against}</div>
            </div>
          )}
          <div className="sg-field">
            <div className="sg-field__label">Raised by</div>
            <div className="sg-field__value">
              {who}
              {!g.anonymous && g.contact ? ` · ${g.contact}` : ''}
            </div>
          </div>
          <div className="sg-field">
            <div className="sg-field__label">Raised</div>
            <div className="sg-field__value">
              {formatDate(g.raisedAt)} ({formatRelative(g.raisedAt)})
            </div>
          </div>
          {g.dueAt && (
            <div className="sg-field">
              <div className="sg-field__label">Due</div>
              <div className="sg-field__value" style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                {formatDate(g.dueAt)}
              </div>
            </div>
          )}
          {g.acknowledgedAt && (
            <div className="sg-field">
              <div className="sg-field__label">Acknowledged</div>
              <div className="sg-field__value">{formatDate(g.acknowledgedAt)}</div>
            </div>
          )}
          {g.resolvedAt && (
            <div className="sg-field">
              <div className="sg-field__label">Resolved</div>
              <div className="sg-field__value">{formatDate(g.resolvedAt)}</div>
            </div>
          )}
          {g.resolution && (
            <div className="sg-field">
              <div className="sg-field__label">Resolution</div>
              <div className="sg-field__value">{g.resolution}</div>
            </div>
          )}
        </Panel>

        <Panel title="Redressal">
          {!canWrite ? (
            <div className="sg-field__value" style={{ color: 'var(--text-muted)' }}>
              You have read-only access to this grievance.
            </div>
          ) : done ? (
            <EmptyState
              icon="check-circle"
              title={g.status === 'closed' ? 'Grievance closed' : 'Grievance resolved'}
              message={g.resolvedAt ? `Resolved on ${formatDate(g.resolvedAt)}.` : undefined}
            />
          ) : (
            <div className="sg-flow">
              <Field label="Assigned to" optional>
                <Input
                  value={assignedToName}
                  onChange={(e) => setAssignedToName(e.target.value)}
                  placeholder="Handling staff"
                />
              </Field>
              <Field label="Resolution" optional hint="Required before resolving — what was done.">
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  placeholder="Outcome / action taken"
                />
              </Field>

              <Button variant="subtle" leftIcon="check" onClick={saveDetails} loading={saving} block>
                Save details
              </Button>

              {transitions.length > 0 && (
                <>
                  <div className="sg-flow__hint">Advance the grievance:</div>
                  <Field label="Move to" optional>
                    <Select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as GrievanceStatus | '')}
                      placeholder="Choose next status"
                      options={transitions.map((s) => ({ value: s, label: GRIEVANCE_STATUS_META[s].label }))}
                    />
                  </Field>
                  <Button
                    variant="gold"
                    leftIcon="arrow-right"
                    disabled={!nextStatus || saving || (nextStatus === 'resolved' && !resolution.trim())}
                    onClick={() => nextStatus && advance(nextStatus)}
                    block
                  >
                    Update status
                  </Button>
                  {nextStatus === 'resolved' && !resolution.trim() && (
                    <div className="sg-flow__hint" style={{ color: 'var(--danger)' }}>
                      Add a resolution before marking resolved.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
