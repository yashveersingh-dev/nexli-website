import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Field, Input, Textarea } from '@/components/form';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStaffAttendanceSettings, saveStaffAttendanceSettings } from './data';
import type { ScheduleBlock, StaffAttendanceSettings } from './types';

const newId = () => `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** A `HH:mm` time input field. */
function TimeField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/**
 * School schedule & attendance-timing configuration. Owned by leadership + HR
 * (`schedule.configure`): Principal, Vice Principals, HR. Each school sets its own
 * operational day here — no technical change required. Feeds the present/late/
 * half-day derivation in `recordStaffCheckIn`.
 */
export function StaffAttendanceSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, isSuperAdmin, can } = useSession();
  const canConfigure = isSuperAdmin || can('schedule.configure');

  const { data: saved, loading } = useStaffAttendanceSettings(schoolId);

  const [form, setForm] = useState<StaffAttendanceSettings>({});
  const [saving, setSaving] = useState(false);

  // Hydrate the form from the saved doc (once it loads / changes).
  useEffect(() => {
    if (saved) {
      setForm({
        schoolStart: saved.schoolStart ?? saved.workStart ?? '',
        schoolEnd: saved.schoolEnd ?? '',
        lateCutoff: saved.lateCutoff ?? '',
        halfDayCutoff: saved.halfDayCutoff ?? '',
        graceMinutes: saved.graceMinutes,
        lunch: saved.lunch ?? {},
        breaks: saved.breaks ?? [],
        rules: saved.rules ?? '',
      });
    }
  }, [saved]);

  const set = <K extends keyof StaffAttendanceSettings>(key: K, value: StaffAttendanceSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setBreak = (id: string, patch: Partial<ScheduleBlock>) =>
    setForm((f) => ({ ...f, breaks: (f.breaks ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const addBreak = () =>
    setForm((f) => ({ ...f, breaks: [...(f.breaks ?? []), { id: newId(), label: 'Break', start: '', end: '' }] }));
  const removeBreak = (id: string) =>
    setForm((f) => ({ ...f, breaks: (f.breaks ?? []).filter((b) => b.id !== id) }));

  async function save() {
    if (!schoolId) return;
    // Light validation: end after start where both are present.
    if (form.schoolStart && form.schoolEnd && form.schoolEnd <= form.schoolStart) {
      toast.error('Check the times', 'School end must be after school start.');
      return;
    }
    setSaving(true);
    try {
      const clean: StaffAttendanceSettings = {
        schoolStart: form.schoolStart || undefined,
        schoolEnd: form.schoolEnd || undefined,
        lateCutoff: form.lateCutoff || undefined,
        halfDayCutoff: form.halfDayCutoff || undefined,
        graceMinutes: form.graceMinutes != null && !Number.isNaN(form.graceMinutes) ? Number(form.graceMinutes) : undefined,
        lunch: (form.lunch?.start || form.lunch?.end) ? form.lunch : undefined,
        breaks: (form.breaks ?? []).filter((b) => b.start && b.end),
        rules: form.rules?.trim() || undefined,
      };
      await saveStaffAttendanceSettings(schoolId, clean, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Schedule saved', 'Attendance timings updated for the school.');
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!canConfigure) {
    return (
      <div className="nx-page">
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Schedule & timing settings</h1>
            <p className="nx-page__sub">School start/end, attendance cutoffs, breaks and lunch.</p>
          </div>
          <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/staff-attendance')}>Back</Button>
        </div>
        <Panel>
          <EmptyState
            icon="lock"
            title="Configured by leadership & HR"
            message="School schedule and attendance timings are set by the Principal, Vice Principals or HR."
            action={<Button variant="subtle" onClick={() => navigate('/staff-attendance')}>Back to attendance</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Schedule & timing settings</h1>
          <p className="nx-page__sub">Configure your school's operational day — start/end, cutoffs, breaks and lunch.</p>
        </div>
        <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/staff-attendance')}>Back</Button>
      </div>

      {loading ? (
        <Panel><Skeleton height={320} /></Panel>
      ) : (
        <>
          <InfoCard icon="info" title="These timings drive attendance status">
            Check-ins after the <strong>late cutoff</strong> (plus any grace) are marked <em>Late</em>; after the
            <strong> half-day cutoff</strong>, <em>Half day</em>. Leave a field blank to skip that rule.
          </InfoCard>

          <Panel title="School day" sub="start, end & grace">
            <div className="nx-section__grid">
              <TimeField label="School start time" value={form.schoolStart ?? ''} onChange={(v) => set('schoolStart', v)} />
              <TimeField label="School end time" value={form.schoolEnd ?? ''} onChange={(v) => set('schoolEnd', v)} />
              <Field label="Grace period (minutes)" hint="Added to a cutoff before a check-in counts as late.">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  inputMode="numeric"
                  placeholder="e.g. 10"
                  value={form.graceMinutes ?? ''}
                  onChange={(e) => set('graceMinutes', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Attendance cutoffs" sub="late & half-day thresholds">
            <div className="nx-section__grid">
              <TimeField label="Late cutoff" value={form.lateCutoff ?? ''} onChange={(v) => set('lateCutoff', v)} hint="After this → Late." />
              <TimeField label="Half-day cutoff" value={form.halfDayCutoff ?? ''} onChange={(v) => set('halfDayCutoff', v)} hint="After this → Half day." />
            </div>
          </Panel>

          <Panel title="Lunch" sub="midday break window">
            <div className="nx-section__grid">
              <TimeField label="Lunch start" value={form.lunch?.start ?? ''} onChange={(v) => set('lunch', { ...form.lunch, start: v })} />
              <TimeField label="Lunch end" value={form.lunch?.end ?? ''} onChange={(v) => set('lunch', { ...form.lunch, end: v })} />
            </div>
          </Panel>

          <Panel
            title="Breaks"
            sub="short breaks during the day"
            headerRight={<Button variant="subtle" size="sm" leftIcon="plus" onClick={addBreak}>Add break</Button>}
          >
            {(form.breaks ?? []).length === 0 ? (
              <EmptyState icon="clock" title="No breaks added" message="Add a break to record its timing (e.g. Morning break)." />
            ) : (
              <div className="nx-sa-breaks">
                {(form.breaks ?? []).map((b) => (
                  <div className="nx-sa-break" key={b.id}>
                    <Field label="Label">
                      <Input value={b.label} placeholder="Break name" onChange={(e) => setBreak(b.id, { label: e.target.value })} />
                    </Field>
                    <Field label="Start"><Input type="time" value={b.start} onChange={(e) => setBreak(b.id, { start: e.target.value })} /></Field>
                    <Field label="End"><Input type="time" value={b.end} onChange={(e) => setBreak(b.id, { end: e.target.value })} /></Field>
                    <button type="button" className="nx-sa-break__del" onClick={() => removeBreak(b.id)} aria-label={`Remove ${b.label}`}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Other timing rules" sub="free-form notes">
            <Field label="Attendance / schedule rules" hint="e.g. Saturdays half-day; shift timings; assembly start.">
              <Textarea
                rows={3}
                maxLength={600}
                placeholder="Any additional attendance or schedule timing rules for this school"
                value={form.rules ?? ''}
                onChange={(e) => set('rules', e.target.value)}
              />
            </Field>
          </Panel>

          <div className="nx-savebar">
            <div className="nx-savebar__inner">
              <div className="nx-savebar__left">
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Applies school-wide</span>
              </div>
              <div className="nx-savebar__right">
                <Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save schedule</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
