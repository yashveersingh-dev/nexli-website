import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Select } from '@/components/form';
import { Form, FormSelect, FormDate, FormInput, FormTextarea } from '@/components/form';
import { Modal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useTherapyLogs, createTherapyLog } from '@/features/analytics/data';
import {
  THERAPY_TYPE_META,
  THERAPY_TYPE_OPTIONS,
  THERAPY_PROGRESS_META,
} from '@/features/analytics/meta';
import {
  therapyLogSchema,
  emptyTherapyLog,
  formToTherapyLog,
  type TherapyLogValues,
} from './therapySchema';
import type { TherapyLog } from '@/types/special';

const PROGRESS_OPTIONS = (Object.keys(THERAPY_PROGRESS_META) as TherapyLog['progress'][]).map((v) => ({
  value: v as string,
  label: THERAPY_PROGRESS_META[v as NonNullable<TherapyLog['progress']>].label,
}));

/** Therapy session log — filter by student/type, add via modal, recent view. */
export function TherapyLogsTab() {
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('iep.write');
  const { data: logs, loading, error } = useTherapyLogs(schoolId);
  const { data: students } = useStudents(schoolId);
  const toast = useToast();

  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('');
  const [open, setOpen] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const studentOptions = useMemo(
    () =>
      students
        .filter((s) => s.status === 'active')
        .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
    [students],
  );

  const kpis = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    let week = 0,
      mins = 0;
    const learners = new Set<string>();
    for (const l of logs) {
      learners.add(l.studentId);
      if (l.date >= weekAgo) week++;
      if (l.durationMins) mins += l.durationMins;
    }
    return { total: logs.length, week, learners: learners.size, mins };
  }, [logs]);

  const rows = useMemo(() => {
    return logs
      .filter((l) => (studentId ? l.studentId === studentId : true))
      .filter((l) => (type ? l.type === type : true))
      .sort((a, b) => b.date - a.date);
  }, [logs, studentId, type]);

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="heart-pulse" label="Sessions logged" count={kpis.total} format="us" />
        <KPICard icon="calendar" label="This week" count={kpis.week} format="us" />
        <KPICard icon="users" label="Learners supported" count={kpis.learners} format="us" />
        <KPICard icon="clock" label="Total minutes" count={kpis.mins} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label="Filter by student"
          options={[{ value: '', label: 'All students' }, ...studentOptions]}
        />
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by therapy type"
          options={[{ value: '', label: 'All types' }, ...THERAPY_TYPE_OPTIONS]}
        />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => setOpen(true)}>
            Log session
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel>
          <EmptyState icon="alert-triangle" title="Could not load sessions" message="Please try again." />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="heart-pulse"
            title="No therapy sessions logged"
            message={
              canWrite
                ? 'Log a speech, OT, physio, behavioural or counseling session.'
                : 'Therapy sessions will appear here.'
            }
            action={
              canWrite ? (
                <Button variant="gold" leftIcon="plus" onClick={() => setOpen(true)}>
                  Log session
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <Panel title="Recent sessions">
          <div className="sped-sessions">
            {rows.map((l) => (
              <TherapyRow key={l.id} log={l} />
            ))}
          </div>
        </Panel>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log a therapy session"
        description="Record a CWSN support / therapy session."
        icon="heart-pulse"
        tone="gold"
        size="md"
      >
        <Form<TherapyLogValues>
          schema={therapyLogSchema}
          defaultValues={emptyTherapyLog()}
          onSubmit={async (values) => {
            try {
              const student = students.find((s) => s.id === values.studentId);
              const base = formToTherapyLog(values);
              await createTherapyLog(
                schoolId!,
                { ...base, schoolId: schoolId!, studentName: student?.fullName ?? 'Student' },
                actor,
              );
              toast.success('Session logged', THERAPY_TYPE_META[base.type].label);
              setOpen(false);
            } catch {
              toast.error('Could not save', 'Please try again.');
            }
          }}
        >
          <TherapyModalBody studentOptions={studentOptions} onCancel={() => setOpen(false)} />
        </Form>
      </Modal>
    </div>
  );
}

function TherapyModalBody({
  studentOptions,
  onCancel,
}: {
  studentOptions: { value: string; label: string }[];
  onCancel: () => void;
}) {
  const { formState } = useFormContext<TherapyLogValues>();
  return (
    <div className="sped-modal-form">
      <div className="nx-section__grid">
        <FormSelect<TherapyLogValues>
          name="studentId"
          label="Student"
          required
          placeholder="Select a student"
          options={studentOptions}
        />
        <FormSelect<TherapyLogValues> name="type" label="Therapy type" required options={THERAPY_TYPE_OPTIONS} />
        <FormDate<TherapyLogValues> name="date" label="Date" required />
        <FormInput<TherapyLogValues> name="therapist" label="Therapist" placeholder="Name of the therapist" />
        <FormSelect<TherapyLogValues> name="progress" label="Progress" required options={PROGRESS_OPTIONS} />
        <FormInput<TherapyLogValues>
          name="durationMins"
          label="Duration (mins)"
          inputMode="numeric"
          maxLength={3}
          placeholder="e.g. 45"
        />
      </div>
      <div className="nx-col-full">
        <FormInput<TherapyLogValues> name="focus" label="Focus" placeholder="What this session worked on" />
      </div>
      <div className="nx-col-full">
        <FormTextarea<TherapyLogValues>
          name="notes"
          label="Notes"
          rows={3}
          placeholder="Observations, progress notes, next steps."
        />
      </div>
      <div className="sped-modal-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={formState.isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" leftIcon="check" loading={formState.isSubmitting}>
          Save session
        </Button>
      </div>
    </div>
  );
}

function TherapyRow({ log }: { log: TherapyLog }) {
  const typeLabel = THERAPY_TYPE_META[log.type].label;
  const prog = log.progress ? THERAPY_PROGRESS_META[log.progress] : null;
  return (
    <div className="sped-session">
      <div className="sped-session__icon" aria-hidden="true">
        <Icon name="heart-pulse" size={16} />
      </div>
      <div className="sped-session__main">
        <div className="sped-session__head">
          <span className="sped-session__name">{log.studentName}</span>
          <span className="sped-session__type">{typeLabel}</span>
        </div>
        <div className="sped-session__meta">
          <span>{formatDate(log.date)}</span>
          {log.therapist && (
            <>
              <span aria-hidden="true">·</span>
              <span>{log.therapist}</span>
            </>
          )}
          {log.durationMins != null && (
            <>
              <span aria-hidden="true">·</span>
              <span>{log.durationMins} min</span>
            </>
          )}
        </div>
        {log.focus && <div className="sped-session__focus">{log.focus}</div>}
        {log.notes && <div className="sped-session__notes">{log.notes}</div>}
      </div>
      {prog && (
        <div className="sped-session__badge">
          <Badge variant={prog.variant}>{prog.label}</Badge>
        </div>
      )}
    </div>
  );
}
