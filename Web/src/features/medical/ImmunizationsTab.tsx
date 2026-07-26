import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, DatePicker } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useImmunizations, createImmunization, deleteImmunization, type Actor } from '@/features/ops/data';
import { useStudents, useGrades } from '@/features/school/data';
import { immunizationStatus, IMMUNIZATION_STATUS_META } from './meta';
import type { Immunization } from '@/types/ops';

interface DraftState {
  studentId: string;
  vaccine: string;
  doseLabel: string;
  givenDate: string;
  nextDueDate: string;
  administeredBy: string;
}
const emptyDraft: DraftState = { studentId: '', vaccine: '', doseLabel: '', givenDate: '', nextDueDate: '', administeredBy: '' };

export function ImmunizationsTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('medical').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: shots, loading, error } = useImmunizations(schoolId);
  const { data: students } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);

  const [filterStudent, setFilterStudent] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [removing, setRemoving] = useState<Immunization | null>(null);
  const [busy, setBusy] = useState(false);

  const studentOptions = useMemo(
    () =>
      [...students]
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((s) => {
          const grade = grades.find((g) => g.id === s.gradeId)?.name;
          return { value: s.id, label: grade ? `${s.fullName} · ${grade}` : s.fullName };
        }),
    [students, grades],
  );

  const rows = useMemo(
    () =>
      shots
        .filter((s) => (filterStudent ? s.studentId === filterStudent : true))
        .sort((a, b) => {
          const rank = (s: Immunization) => (immunizationStatus(s.nextDueDate) === 'overdue' ? 0 : immunizationStatus(s.nextDueDate) === 'due' ? 1 : 2);
          return rank(a) - rank(b) || (b.givenDate ?? 0) - (a.givenDate ?? 0);
        }),
    [shots, filterStudent],
  );

  const save = async () => {
    if (!schoolId || !draft.studentId || !draft.vaccine.trim()) return;
    const student = students.find((s) => s.id === draft.studentId);
    if (!student) return;
    setBusy(true);
    try {
      await createImmunization(
        schoolId,
        {
          schoolId,
          studentId: draft.studentId,
          studentName: student.fullName,
          vaccine: draft.vaccine.trim(),
          doseLabel: draft.doseLabel.trim() || undefined,
          givenDate: draft.givenDate ? new Date(draft.givenDate).getTime() : undefined,
          nextDueDate: draft.nextDueDate ? new Date(draft.nextDueDate).getTime() : undefined,
          administeredBy: draft.administeredBy.trim() || member?.name || undefined,
        },
        actor,
      );
      toast.success('Immunization recorded', `${student.fullName} · ${draft.vaccine.trim()}`);
      setAdding(false);
      setDraft(emptyDraft);
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteImmunization(schoolId, removing.id, actor);
      toast.success('Immunization removed');
      setRemoving(null);
    } catch {
      toast.error('Could not remove');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <div className="nx-toolbar__search">
          <Select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            aria-label="Filter by student"
            options={[{ value: '', label: 'All students' }, ...studentOptions]}
          />
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => { setDraft(emptyDraft); setAdding(true); }}>
            Add immunization
          </Button>
        )}
      </div>

      {error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load immunizations" message="Please try again." /></Panel>
      ) : loading ? (
        <Skeleton height={180} />
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="shield"
            title={filterStudent ? 'No immunizations for this student' : 'No immunizations recorded'}
            message={canWrite ? 'Add a vaccine record to track due and overdue doses.' : 'Vaccine records will appear here.'}
          />
        </Panel>
      ) : (
        <div className="med-list">
          {rows.map((s) => {
            const status = immunizationStatus(s.nextDueDate);
            const meta = IMMUNIZATION_STATUS_META[status];
            return (
              <Panel key={s.id}>
                <div className="med-shot-row">
                  <span className="med-row__avatar" aria-hidden="true"><Icon name="shield" size={16} /></span>
                  <div className="med-shot-row__main">
                    <div className="med-shot-row__title">
                      {s.vaccine}{s.doseLabel ? <span className="med-shot-row__dose"> · {s.doseLabel}</span> : null}
                    </div>
                    <div className="med-shot-row__sub">
                      {s.studentName}
                      {s.givenDate ? ` · given ${formatDate(s.givenDate)}` : ''}
                      {s.nextDueDate ? ` · next due ${formatDate(s.nextDueDate)}` : ''}
                      {s.administeredBy ? ` · by ${s.administeredBy}` : ''}
                    </div>
                  </div>
                  <div className="med-shot-row__end">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {canWrite && (
                      <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${s.vaccine} for ${s.studentName}`} onClick={() => setRemoving(s)} />
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <p className="med-note">
        <Icon name="lock" size={13} /> Confidential — clinic staff only.
      </p>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        icon="shield"
        tone="gold"
        title="Add immunization"
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!draft.studentId || !draft.vaccine.trim()} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Student" required>
          <Select
            value={draft.studentId}
            onChange={(e) => setDraft((d) => ({ ...d, studentId: e.target.value }))}
            placeholder={studentOptions.length ? 'Select student' : 'No students found'}
            options={studentOptions}
          />
        </Field>
        <Field label="Vaccine" required>
          <Input value={draft.vaccine} onChange={(e) => setDraft((d) => ({ ...d, vaccine: e.target.value }))} placeholder="e.g. Hepatitis B" autoFocus />
        </Field>
        <Field label="Dose" optional>
          <Input value={draft.doseLabel} onChange={(e) => setDraft((d) => ({ ...d, doseLabel: e.target.value }))} placeholder="e.g. Dose 2 / Booster" />
        </Field>
        <Field label="Given date" optional>
          <DatePicker value={draft.givenDate} onChange={(e) => setDraft((d) => ({ ...d, givenDate: e.target.value }))} />
        </Field>
        <Field label="Next due date" optional hint="Drives the due / overdue badge.">
          <DatePicker value={draft.nextDueDate} onChange={(e) => setDraft((d) => ({ ...d, nextDueDate: e.target.value }))} />
        </Field>
        <Field label="Administered by" optional>
          <Input value={draft.administeredBy} onChange={(e) => setDraft((d) => ({ ...d, administeredBy: e.target.value }))} placeholder={member?.name ?? 'Clinic staff'} />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        tone="danger"
        loading={busy}
        title="Remove immunization?"
        message={removing ? `${removing.vaccine} for ${removing.studentName} will be deleted.` : ''}
        confirmLabel="Remove"
      />
    </div>
  );
}
