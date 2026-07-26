import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { ConfirmModal } from '@/components/Modal';
import { Field, Textarea, Select, Checkbox } from '@/components/form';
import { Skeleton, EmptyState } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useSmcMeeting, useSmcMembers, updateSmcMeeting, deleteSmcMeeting, type Actor } from '@/features/compliance/data';
import { SMC_MEETING_STATUS_META } from '@/features/compliance/meta';
import { SMC_ROLE_META } from './smcMeta';
import type { SmcMeetingStatus } from '@/types/compliance';

const STATUS_OPTIONS = (Object.keys(SMC_MEETING_STATUS_META) as SmcMeetingStatus[]).map((v) => ({ value: v, label: SMC_MEETING_STATUS_META[v].label }));

export function SmcMeetingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: meeting, loading } = useSmcMeeting(schoolId, id);
  const { data: members } = useSmcMembers(schoolId);

  const [status, setStatus] = useState<SmcMeetingStatus | null>(null);
  const [minutes, setMinutes] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Working values fall back to the persisted record until edited.
  const wStatus = status ?? meeting?.status ?? 'scheduled';
  const wMinutes = minutes ?? meeting?.minutes ?? '';
  const wDecisions = decisions ?? meeting?.decisions ?? '';
  const wAttendees = attendees ?? meeting?.attendees ?? [];

  const activeMembers = useMemo(() => members.filter((m) => m.active !== false).sort((a, b) => a.name.localeCompare(b.name)), [members]);

  const dirty = status !== null || minutes !== null || decisions !== null || attendees !== null;

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (!meeting) {
    return <div className="nx-page"><EmptyState icon="calendar" title="Meeting not found" action={<Button variant="subtle" onClick={() => navigate('/smc')}>Back to SMC</Button>} /></div>;
  }

  const toggleAttendee = (memberId: string, on: boolean) => {
    const set = new Set(wAttendees);
    if (on) set.add(memberId); else set.delete(memberId);
    setAttendees(Array.from(set));
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateSmcMeeting(schoolId, id, {
        status: wStatus,
        minutes: wMinutes.trim() || undefined,
        decisions: wDecisions.trim() || undefined,
        attendees: wAttendees,
      }, actor);
      toast.success('Meeting saved');
      setStatus(null); setMinutes(null); setDecisions(null); setAttendees(null);
    } catch { toast.error('Could not save', 'Please try again.'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteSmcMeeting(schoolId, id, actor); toast.success('Meeting deleted'); navigate('/smc'); }
    catch { toast.error('Could not delete'); setBusy(false); }
  };

  const statusMeta = SMC_MEETING_STATUS_META[wStatus];

  return (
    <div className="nx-page">
      <div className="nx-formpage__head" style={{ marginBottom: 18 }}>
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/smc')} aria-label="Back to SMC">
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="nx-formpage__heading">
          <nav className="nx-formpage__crumbs" aria-label="Breadcrumb">
            <span className="nx-formpage__crumb"><button type="button" onClick={() => navigate('/smc')}>SMC</button><Icon name="chevron-right" size={12} /></span>
            <span className="nx-formpage__crumb"><span>Meeting</span></span>
          </nav>
          <h1 className="nx-formpage__title">{meeting.title}</h1>
          <p className="nx-formpage__sub">
            {formatDate(meeting.date)}{meeting.venue ? ` · ${meeting.venue}` : ''}
          </p>
        </div>
        <div className="nx-formpage__head-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          {canWrite && <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`/smc/meetings/${id}/edit`)}>Edit details</Button>}
        </div>
      </div>

      {meeting.agenda && (
        <Panel title="Agenda" className="smc-stack">
          <p className="smc-prose">{meeting.agenda}</p>
        </Panel>
      )}

      <Panel title="Record" sub="Minutes, decisions & status" className="smc-stack">
        {canWrite ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid g-2">
              <Field label="Status">
                <Select value={wStatus} onChange={(e) => setStatus(e.target.value as SmcMeetingStatus)} options={STATUS_OPTIONS} />
              </Field>
            </div>
            <Field label="Minutes" hint="What was discussed">
              <Textarea value={wMinutes} onChange={(e) => setMinutes(e.target.value)} rows={5} placeholder="Summary of the discussion…" autoResize />
            </Field>
            <Field label="Decisions / action items" hint="Resolutions taken">
              <Textarea value={wDecisions} onChange={(e) => setDecisions(e.target.value)} rows={4} placeholder="Decisions and who owns each…" autoResize />
            </Field>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><div className="smc-label">Minutes</div><p className="smc-prose">{meeting.minutes || <span className="smc-muted">Not recorded</span>}</p></div>
            <div><div className="smc-label">Decisions</div><p className="smc-prose">{meeting.decisions || <span className="smc-muted">Not recorded</span>}</p></div>
          </div>
        )}
      </Panel>

      <Panel title="Attendance" sub={`${wAttendees.length} of ${activeMembers.length} members`} className="smc-stack">
        {activeMembers.length === 0 ? (
          <EmptyState icon="users" title="No committee members" message="Add members on the Members tab to record attendance." />
        ) : canWrite ? (
          <div className="smc-attendees">
            {activeMembers.map((m) => (
              <Checkbox
                key={m.id}
                checked={wAttendees.includes(m.id)}
                onChange={(on) => toggleAttendee(m.id, on)}
                label={m.name}
                description={`${SMC_ROLE_META[m.role].label}${m.isChairperson ? ' · Chairperson' : ''}`}
              />
            ))}
          </div>
        ) : wAttendees.length === 0 ? (
          <p className="smc-muted">Attendance not recorded.</p>
        ) : (
          <ul className="smc-attend-readonly">
            {activeMembers.filter((m) => wAttendees.includes(m.id)).map((m) => (
              <li key={m.id}><Icon name="check" size={13} /> {m.name}</li>
            ))}
          </ul>
        )}
      </Panel>

      {canWrite && (
        <div className="nx-savebar" role="group" aria-label="Meeting actions">
          <div className="nx-savebar__inner">
            <div className="nx-savebar__left">
              <Button type="button" variant="ghost" leftIcon="minus-circle" onClick={() => setRemoving(true)} disabled={busy}>Delete</Button>
            </div>
            <div className="nx-savebar__right">
              <Button type="button" variant="ghost" onClick={() => navigate('/smc')} disabled={busy}>Back</Button>
              <Button type="button" variant="gold" leftIcon="check" loading={busy} disabled={!dirty} onClick={save}>Save record</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Delete meeting?"
        message={`"${meeting.title}" and its minutes will be permanently removed.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
