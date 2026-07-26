import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { CONSENT_STATE_META } from '@/features/compliance/meta';
import {
  useConsentPurposes,
  useConsentRecords,
  upsertConsentRecord,
  useStudents,
  type Actor,
} from './data';
import { CONSENT_CHANNEL_OPTIONS, CONSENT_STATE_OPTIONS, CONSENT_COUNT_META } from './meta';
import type { ConsentPurpose, ConsentRecord, ConsentState } from '@/types/compliance';

type WriteState = Exclude<ConsentState, 'pending'>;

export function RecordsTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('consent.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: purposes, loading: loadingPurposes } = useConsentPurposes(schoolId);
  const { data: students } = useStudents(schoolId);

  const [purposeId, setPurposeId] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Default to the first purpose once they load.
  useEffect(() => {
    if (!purposeId && purposes.length) setPurposeId(purposes[0].id);
  }, [purposes, purposeId]);

  const { data: records, loading: loadingRecords, error } = useConsentRecords(schoolId, purposeId || undefined);
  const activePurpose = useMemo(() => purposes.find((p) => p.id === purposeId), [purposes, purposeId]);

  const counts = useMemo(() => {
    let granted = 0, denied = 0, withdrawn = 0;
    for (const r of records) {
      if (r.state === 'granted') granted++;
      else if (r.state === 'denied') denied++;
      else if (r.state === 'withdrawn') withdrawn++;
    }
    return { granted, denied, withdrawn };
  }, [records]);

  const studentOptions = useMemo(
    () => [...students]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}${s.sectionName ? `-${s.sectionName}` : ''}` : ''}` })),
    [students],
  );

  const rows = useMemo(
    () => [...records]
      .filter((r) => (stateFilter ? r.state === stateFilter : true))
      .sort((a, b) => (a.studentName ?? '').localeCompare(b.studentName ?? '')),
    [records, stateFilter],
  );

  // ---- record / change consent modal ----
  const [editing, setEditing] = useState<ConsentRecord | null | undefined>(undefined);
  const [withdrawing, setWithdrawing] = useState<ConsentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [state, setState] = useState<WriteState>('granted');
  const [channel, setChannel] = useState<'app' | 'paper' | 'verbal'>('app');
  const [notes, setNotes] = useState('');

  const open = (r: ConsentRecord | null, presetStudentId?: string) => {
    setEditing(r);
    setStudentId(r?.studentId ?? presetStudentId ?? '');
    setGuardianName(r?.guardianName ?? '');
    setState((r && r.state !== 'pending' ? r.state : 'granted') as WriteState);
    setChannel(r?.channel ?? 'app');
    setNotes(r?.notes ?? '');
  };

  // Deep-link handoff from a consent gate CTA (`/consent?tab=records&student=…`):
  // pre-open the "Record consent" modal for that student once the roster has loaded.
  // Guarded so it fires a single time and only for a writer who can actually record.
  const [params, setParams] = useSearchParams();
  const deepLinkStudent = params.get('student');
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current || !deepLinkStudent) return;
    if (!canWrite || !students.length) return; // wait for roster / ignore for read-only viewers
    deepLinkDone.current = true;
    const exists = students.some((s) => s.id === deepLinkStudent);
    if (exists) open(null, deepLinkStudent);
    // Consume the hint so a refresh / back doesn't re-trigger the modal.
    const next = new URLSearchParams(params);
    next.delete('student');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkStudent, canWrite, students]);

  const save = async () => {
    if (!schoolId || !activePurpose || !studentId) return;
    const student = students.find((s) => s.id === studentId);
    setBusy(true);
    const now = Date.now();
    // The grant/withdrawal timestamp is legally meaningful (DPDP) and must be
    // STABLE: only stamp `now` when the state actually transitions into that
    // state. Editing an unrelated field (e.g. fixing the guardian name) on an
    // already-granted record must NOT move its grant date — preserve the prior
    // timestamp via the existing record (`editing`).
    const grantedAt =
      state === 'granted' ? (editing?.state === 'granted' ? editing.grantedAt ?? now : now) : undefined;
    const withdrawnAt =
      state === 'withdrawn' ? (editing?.state === 'withdrawn' ? editing.withdrawnAt ?? now : now) : undefined;
    const payload: Omit<ConsentRecord, 'id'> = {
      schoolId,
      purposeId: activePurpose.id,
      purposeName: activePurpose.name,
      studentId,
      studentName: student?.fullName,
      guardianName: guardianName.trim() || undefined,
      state,
      channel,
      notes: notes.trim() || undefined,
      recordedByName: member?.name,
      grantedAt,
      withdrawnAt,
    };
    try {
      // Deterministic id => one record per (purpose, student); records change in place.
      await upsertConsentRecord(schoolId, `${activePurpose.id}_${studentId}`, payload, actor);
      toast.success(editing ? 'Consent updated' : 'Consent recorded');
      setEditing(undefined);
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const confirmWithdraw = async () => {
    if (!schoolId || !withdrawing) return;
    setBusy(true);
    try {
      await upsertConsentRecord(
        schoolId,
        `${withdrawing.purposeId}_${withdrawing.studentId}`,
        { ...withdrawing, state: 'withdrawn', withdrawnAt: Date.now(), recordedByName: member?.name },
        actor,
      );
      toast.success('Consent withdrawn');
      setWithdrawing(null);
    } catch {
      toast.error('Could not withdraw');
    } finally {
      setBusy(false);
    }
  };

  if (loadingPurposes) return <Skeleton height={220} />;

  if (!purposes.length) {
    return (
      <Panel>
        <EmptyState
          icon="shield-check"
          title="Add a purpose first"
          message="Consent is always tied to a specific purpose. Define one in the Purposes tab, then record decisions here."
        />
      </Panel>
    );
  }

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select value={purposeId} onChange={(e) => setPurposeId(e.target.value)} aria-label="Purpose"
          options={purposes.map((p: ConsentPurpose) => ({ value: p.id, label: p.name }))} />
        <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} aria-label="Filter by state"
          options={[
            { value: '', label: 'All states' },
            { value: 'granted', label: 'Granted' },
            { value: 'denied', label: 'Denied' },
            { value: 'withdrawn', label: 'Withdrawn' },
          ]} />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>
            Record consent
          </Button>
        )}
      </div>

      {/* Per-purpose compliance summary */}
      <div className="cns-counts" style={{ marginBottom: 16 }}>
        {(['granted', 'denied', 'withdrawn'] as const).map((k) => (
          <span key={k} className={`cns-count cns-count--${k}`}>
            <span className="cns-count__dot" aria-hidden="true" />
            {CONSENT_COUNT_META[k].label}: {counts[k]}
          </span>
        ))}
      </div>

      {loadingRecords ? (
        <Skeleton height={200} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load records" message="Please try again." />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="user"
            title={stateFilter ? 'No records in this state' : 'No consent recorded yet'}
            message={
              canWrite
                ? `Record a guardian's decision for "${activePurpose?.name ?? 'this purpose'}".`
                : 'Consent decisions for this purpose will appear here.'
            }
            action={canWrite && !stateFilter ? <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Record consent</Button> : undefined}
          />
        </Panel>
      ) : (
        <div className="fin-kv-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => {
            const meta = CONSENT_STATE_META[r.state];
            const stamp =
              r.state === 'withdrawn' && r.withdrawnAt
                ? `Withdrawn ${formatDate(r.withdrawnAt)}`
                : r.state === 'granted' && r.grantedAt
                  ? `Granted ${formatDate(r.grantedAt)}`
                  : null;
            return (
              <div key={r.id} className="cns-rec">
                <div className="cns-rec__body">
                  <div className="cns-rec__name">{r.studentName ?? 'Unknown student'}</div>
                  <div className="cns-rec__meta">
                    {r.guardianName ? `${r.guardianName}` : 'Guardian'}
                    {r.channel ? ` · ${CONSENT_CHANNEL_OPTIONS.find((c) => c.value === r.channel)?.label ?? r.channel}` : ''}
                    {stamp ? ` · ${stamp}` : ''}
                  </div>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
                {canWrite && (
                  <div className="cns-rec__actions">
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Change consent for ${r.studentName ?? 'student'}`} onClick={() => open(r)} />
                    {r.state !== 'withdrawn' && (
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Withdraw consent for ${r.studentName ?? 'student'}`} onClick={() => setWithdrawing(r)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        icon="shield-check"
        tone="gold"
        title={editing ? 'Change consent' : 'Record consent'}
        description={activePurpose?.name}
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!studentId} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Student" required>
          <Select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Select a student…"
            disabled={!!editing}
            options={studentOptions}
          />
        </Field>
        <Field label="Guardian name" optional hint="Who gave or changed this consent.">
          <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="e.g. Mrs. Sharma" />
        </Field>
        <div className="grid g-2">
          <Field label="Decision" required>
            <Select value={state} onChange={(e) => setState(e.target.value as WriteState)} options={CONSENT_STATE_OPTIONS} />
          </Field>
          <Field label="Channel">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as 'app' | 'paper' | 'verbal')} options={CONSENT_CHANNEL_OPTIONS} />
          </Field>
        </div>
        <Field label="Notes" optional>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} autoResize rows={2} placeholder="Reference to the signed form, caveats…" />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        onConfirm={confirmWithdraw}
        tone="danger"
        icon="minus-circle"
        loading={busy}
        title="Withdraw consent?"
        message={
          withdrawing
            ? `Consent for "${withdrawing.studentName ?? 'this student'}" will be marked withdrawn and stamped with today's date. The guardian may grant it again later.`
            : ''
        }
        confirmLabel="Withdraw"
      />
    </div>
  );
}
