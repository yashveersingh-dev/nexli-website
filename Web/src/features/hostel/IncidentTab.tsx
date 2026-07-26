import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, Textarea, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useHostelAllocations } from '@/features/ops/data';
import { useHostelIncidents, createIncident, updateIncident, type Actor } from './data';
import { useHostelScope } from './scope';
import {
  INCIDENT_KIND_META, INCIDENT_KIND_OPTIONS, INCIDENT_SEVERITY_META, INCIDENT_SEVERITY_OPTIONS, INCIDENT_STATUS_META,
} from './meta';
import { incidentSchema } from './hostelSchema';
import type { HostelIncident, HostelIncidentKind, HostelIncidentSeverity } from '@/types/ops';

const FILTERS = [
  { value: '', label: 'All' }, { value: 'open', label: 'Open' },
  { value: 'escalated', label: 'Escalated' }, { value: 'resolved', label: 'Resolved' },
];

export function IncidentTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('hostel').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { blockIds, seesAll } = useHostelScope();

  const { data: allocations } = useHostelAllocations(schoolId);
  const { data: incidents, loading } = useHostelIncidents(schoolId);

  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<HostelIncidentKind>('discipline');
  const [studentId, setStudentId] = useState('');
  const [severity, setSeverity] = useState<HostelIncidentSeverity>('low');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [escalate, setEscalate] = useState(false);

  const boarders = useMemo(() => {
    const active = allocations.filter((a) => a.active !== false && (seesAll || !a.blockId || blockIds.has(a.blockId)));
    return active.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [allocations, seesAll, blockIds]);

  const scoped = useMemo(
    () => incidents.filter((i) => seesAll || !i.blockId || blockIds.has(i.blockId)),
    [incidents, seesAll, blockIds],
  );

  const rows = useMemo(() => scoped
    .filter((i) => (filter ? i.status === filter : true))
    .sort((a, b) => {
      const rank = (i: HostelIncident) => (i.status === 'open' ? 0 : i.status === 'escalated' ? 1 : 2);
      return rank(a) - rank(b) || (b.occurredAt ?? b.createdAt ?? 0) - (a.occurredAt ?? a.createdAt ?? 0);
    }), [scoped, filter]);

  const openModal = () => {
    setKind('discipline'); setStudentId(''); setSeverity('low'); setTitle(''); setDescription(''); setEscalate(false); setOpen(true);
  };

  const save = async () => {
    if (!schoolId) return;
    const parsed = incidentSchema.safeParse({ kind, studentId, severity, title, description, escalatedToNurse: escalate });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    const alloc = studentId ? allocations.find((a) => a.studentId === studentId && a.active !== false) : undefined;
    // A health / sick-bay note always goes to the nurse; the toggle lets any other
    // kind be escalated too. Keep `status` and `escalatedToNurse` consistent.
    const toNurse = escalate || kind === 'health';
    setBusy(true);
    try {
      await createIncident(schoolId, {
        schoolId, kind,
        studentId: studentId || undefined,
        studentName: alloc?.studentName,
        blockId: alloc?.blockId, blockName: alloc?.blockName,
        severity, title: title.trim(),
        description: description.trim() || undefined,
        occurredAt: Date.now(),
        status: toNurse ? 'escalated' : 'open',
        escalatedToNurse: toNurse || undefined,
        reportedByName: member?.name,
      }, actor);
      toast.success('Incident logged', title.trim());
      setOpen(false);
    } catch { toast.error('Could not log'); } finally { setBusy(false); }
  };

  const resolve = async (i: HostelIncident) => {
    if (!schoolId) return;
    setBusy(true);
    try { await updateIncident(schoolId, i.id, { status: 'resolved', resolvedAt: Date.now() }, actor); toast.success('Resolved', i.title); }
    catch { toast.error('Could not update'); } finally { setBusy(false); }
  };

  const escalateNurse = async (i: HostelIncident) => {
    if (!schoolId) return;
    setBusy(true);
    try { await updateIncident(schoolId, i.id, { status: 'escalated', escalatedToNurse: true }, actor); toast.success('Escalated to nurse', i.title); }
    catch { toast.error('Could not escalate'); } finally { setBusy(false); }
  };

  return (
    <div>
      {!seesAll && (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="info" size={13} /> Showing incidents for your block only.
        </p>
      )}

      <div className="nx-toolbar">
        <Select className="nx-toolbar__filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status" options={FILTERS} />
        <span style={{ flex: 1 }} />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={openModal}>Log incident</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="shield-check" title={filter ? 'No matching incidents' : 'No incidents logged'}
          message={filter ? 'Try a different status filter.' : canWrite ? 'Log a discipline or sick-bay note to keep a record.' : 'Incidents will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((i) => (
            <Panel key={i.id}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', marginTop: 2 }}><Icon name={INCIDENT_KIND_META[i.kind].icon} size={18} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{i.title}</span>
                    <Badge variant={INCIDENT_SEVERITY_META[i.severity].variant}>{INCIDENT_SEVERITY_META[i.severity].label}</Badge>
                    <Badge variant={INCIDENT_STATUS_META[i.status].variant}>{INCIDENT_STATUS_META[i.status].label}</Badge>
                    {i.escalatedToNurse && <Badge variant="info">Nurse</Badge>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    {INCIDENT_KIND_META[i.kind].label}{i.studentName ? ` · ${i.studentName}` : ''}{i.blockName ? ` · ${i.blockName}` : ''}{i.occurredAt ? ` · ${formatDate(i.occurredAt)}` : ''}
                  </div>
                  {i.description && <div style={{ fontSize: 12.5, marginTop: 3 }}>{i.description}</div>}
                </div>
              </div>
              {canWrite && i.status !== 'resolved' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {i.kind === 'health' && !i.escalatedToNurse && (
                    <Button variant="ghost" size="sm" leftIcon="heart-pulse" disabled={busy} onClick={() => escalateNurse(i)}>Escalate to nurse</Button>
                  )}
                  <Button variant="gold" size="sm" leftIcon="check-circle" loading={busy} onClick={() => resolve(i)}>Mark resolved</Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} icon="alert-triangle" tone="gold" title="Log incident / health note" size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={title.trim().length < 3} onClick={save}>Save</Button>
        </>}>
        <div className="nx-section__grid">
          <Field label="Type" required><Select value={kind} onChange={(e) => setKind(e.target.value as HostelIncidentKind)} options={INCIDENT_KIND_OPTIONS} /></Field>
          <Field label="Severity" required><Select value={severity} onChange={(e) => setSeverity(e.target.value as HostelIncidentSeverity)} options={INCIDENT_SEVERITY_OPTIONS} /></Field>
        </div>
        <Field label="Boarder" optional hint="Leave blank for a block-wide note.">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select a boarder"
            options={[{ value: '', label: 'No specific boarder' }, ...boarders.map((a) => ({ value: a.studentId, label: a.studentName }))]} />
        </Field>
        <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" autoFocus /></Field>
        <Field label="Details" optional><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What happened and any action taken" /></Field>
        <Field label="Escalate to school nurse" hint={kind === 'health' ? 'Sick-bay / health notes always go to the nurse.' : 'Turn on to flag this for the school nurse.'}><Toggle checked={escalate || kind === 'health'} disabled={kind === 'health'} onChange={setEscalate} aria-label="Escalate to nurse" /></Field>
      </Modal>
    </div>
  );
}
