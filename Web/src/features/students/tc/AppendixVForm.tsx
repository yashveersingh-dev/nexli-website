import { useEffect, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Field, Input, Textarea, Select, Toggle } from '@/components/form';
import type { TransferCertificate } from '@/types/sis';

/**
 * Editable CBSE Appendix-V particulars for a Transfer Certificate. Optional fields
 * staff complete before issuing/printing the certificate. Persists via the parent's
 * `onSave` (which wraps the atomic `updateTC` writer — this component never touches
 * the TC number / clearance / status logic).
 *
 * NOTE (LEGAL REVIEW): labels mirror the Appendix-V draft in `appendixV.ts`; verify
 * against the latest CBSE Affiliation Bye-Laws before official use.
 */

/** Local string/boolean form mirror of the Appendix-V subset of the TC. */
interface FormState {
  fatherName: string;
  motherName: string;
  nationality: string;
  category: string;
  isScStObc: boolean;
  dob: string; // yyyy-mm-dd
  dobInWords: string;
  classLastStudied: string;
  classPromotedTo: string;
  duesPaid: boolean;
  feeConcession: boolean;
  feeConcessionDetail: string;
  workingDaysTotal: string;
  workingDaysPresent: string;
  nccScoutGuide: boolean;
  gamesActivities: string;
  generalConduct: string;
  applicationDate: string;
  dateOfLeaving: string;
  otherRemarks: string;
}

const toDateInput = (ts?: number): string => (ts != null ? new Date(ts).toISOString().slice(0, 10) : '');
const fromDateInput = (v: string): number | undefined => (v ? new Date(`${v}T12:00:00`).getTime() : undefined);
const numOrUndef = (v: string): number | undefined => {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

function fromTc(t: TransferCertificate): FormState {
  return {
    fatherName: t.fatherName ?? '',
    motherName: t.motherName ?? '',
    nationality: t.nationality ?? 'Indian',
    category: t.category ?? '',
    isScStObc: t.isScStObc ?? false,
    dob: toDateInput(t.dob),
    dobInWords: t.dobInWords ?? '',
    classLastStudied: t.classLastStudied ?? t.gradeName ?? '',
    classPromotedTo: t.classPromotedTo ?? '',
    duesPaid: t.duesPaid ?? false,
    feeConcession: t.feeConcession ?? false,
    feeConcessionDetail: t.feeConcessionDetail ?? '',
    workingDaysTotal: t.workingDaysTotal != null ? String(t.workingDaysTotal) : '',
    workingDaysPresent: t.workingDaysPresent != null ? String(t.workingDaysPresent) : '',
    nccScoutGuide: t.nccScoutGuide ?? false,
    gamesActivities: t.gamesActivities ?? '',
    generalConduct: t.generalConduct ?? '',
    applicationDate: toDateInput(t.applicationDate ?? t.requestedDate),
    dateOfLeaving: toDateInput(t.dateOfLeaving),
    otherRemarks: t.otherRemarks ?? '',
  };
}

/** Build the patch (undefined for cleared fields) the parent passes to `updateTC`. */
export function formToPatch(f: FormState): Partial<TransferCertificate> {
  return {
    fatherName: f.fatherName.trim() || undefined,
    motherName: f.motherName.trim() || undefined,
    nationality: f.nationality.trim() || undefined,
    category: f.category.trim() || undefined,
    isScStObc: f.isScStObc,
    dob: fromDateInput(f.dob),
    dobInWords: f.dobInWords.trim() || undefined,
    classLastStudied: f.classLastStudied.trim() || undefined,
    classPromotedTo: f.classPromotedTo.trim() || undefined,
    duesPaid: f.duesPaid,
    feeConcession: f.feeConcession,
    feeConcessionDetail: f.feeConcession ? f.feeConcessionDetail.trim() || undefined : undefined,
    workingDaysTotal: numOrUndef(f.workingDaysTotal),
    workingDaysPresent: numOrUndef(f.workingDaysPresent),
    nccScoutGuide: f.nccScoutGuide,
    gamesActivities: f.gamesActivities.trim() || undefined,
    generalConduct: f.generalConduct.trim() || undefined,
    applicationDate: fromDateInput(f.applicationDate),
    dateOfLeaving: fromDateInput(f.dateOfLeaving),
    otherRemarks: f.otherRemarks.trim() || undefined,
  };
}

const CONDUCT_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Satisfactory'].map((v) => ({ value: v, label: v }));

export function AppendixVForm({
  tc,
  editable,
  onSave,
}: {
  tc: TransferCertificate;
  editable: boolean;
  onSave: (patch: Partial<TransferCertificate>) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => fromTc(tc));
  const [saving, setSaving] = useState(false);

  // Re-hydrate when the TC doc changes (e.g. after a save or external edit).
  useEffect(() => setForm(fromTc(tc)), [tc]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(formToPatch(form));
    } finally {
      setSaving(false);
    }
  };

  const dis = !editable;

  return (
    <Panel
      title="CBSE Appendix-V particulars"
      sub="Filled in on the printed Transfer Certificate"
    >
      <div className="grid g-2">
        <Field label="Father's / Guardian's name">
          <Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} disabled={dis} />
        </Field>
        <Field label="Mother's name">
          <Input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} disabled={dis} />
        </Field>
      </div>

      <div className="grid g-2">
        <Field label="Nationality">
          <Input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} disabled={dis} />
        </Field>
        <Field label="Category" hint="As printed (e.g. General / SC / ST / OBC)">
          <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. General" disabled={dis} />
        </Field>
      </div>

      <div className="grid g-2">
        <Field label="Date of birth (figures)">
          <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} disabled={dis} />
        </Field>
        <Field label="Date of birth (in words)" hint="Auto-derived on print if left blank">
          <Input value={form.dobInWords} onChange={(e) => set('dobInWords', e.target.value)} placeholder="e.g. Fifth January Two Thousand Twelve" disabled={dis} />
        </Field>
      </div>

      <div className="grid g-2">
        <Field label="Class last studied">
          <Input value={form.classLastStudied} onChange={(e) => set('classLastStudied', e.target.value)} placeholder="e.g. VIII" disabled={dis} />
        </Field>
        <Field label="Class promoted to / eligible">
          <Input value={form.classPromotedTo} onChange={(e) => set('classPromotedTo', e.target.value)} placeholder="e.g. IX" disabled={dis} />
        </Field>
      </div>

      <div className="grid g-2">
        <Field label="Total working days">
          <Input value={form.workingDaysTotal} onChange={(e) => set('workingDaysTotal', e.target.value)} inputMode="numeric" placeholder="e.g. 220" disabled={dis} />
        </Field>
        <Field label="Days present">
          <Input value={form.workingDaysPresent} onChange={(e) => set('workingDaysPresent', e.target.value)} inputMode="numeric" placeholder="e.g. 205" disabled={dis} />
        </Field>
      </div>

      <div className="grid g-2">
        <Field label="General conduct">
          <Select value={form.generalConduct} onChange={(e) => set('generalConduct', e.target.value)} placeholder="Select conduct" options={CONDUCT_OPTIONS} disabled={dis} />
        </Field>
        <Field label="Games / extra-curricular activities">
          <Input value={form.gamesActivities} onChange={(e) => set('gamesActivities', e.target.value)} placeholder="e.g. Football, Quiz" disabled={dis} />
        </Field>
      </div>

      <div className="grid g-2">
        <Field label="Date of application">
          <Input type="date" value={form.applicationDate} onChange={(e) => set('applicationDate', e.target.value)} disabled={dis} />
        </Field>
        <Field label="Date of leaving">
          <Input type="date" value={form.dateOfLeaving} onChange={(e) => set('dateOfLeaving', e.target.value)} disabled={dis} />
        </Field>
      </div>

      <div className="udise-fac-grid" style={{ margin: '4px 0 10px' }} role="group" aria-label="Yes/No particulars">
        <Toggle checked={form.isScStObc} onChange={(v) => set('isScStObc', v)} label="Belongs to SC / ST / OBC" disabled={dis} size="sm" />
        <Toggle checked={form.duesPaid} onChange={(v) => set('duesPaid', v)} label="All school dues paid" disabled={dis} size="sm" />
        <Toggle checked={form.feeConcession} onChange={(v) => set('feeConcession', v)} label="Fee concession availed" disabled={dis} size="sm" />
        <Toggle checked={form.nccScoutGuide} onChange={(v) => set('nccScoutGuide', v)} label="NCC / Scout / Guide" disabled={dis} size="sm" />
      </div>

      {form.feeConcession && (
        <Field label="Fee concession detail">
          <Input value={form.feeConcessionDetail} onChange={(e) => set('feeConcessionDetail', e.target.value)} placeholder="e.g. 50% tuition (sibling)" disabled={dis} />
        </Field>
      )}

      <Field label="Any other remarks">
        <Textarea value={form.otherRemarks} onChange={(e) => set('otherRemarks', e.target.value)} rows={2} disabled={dis} />
      </Field>

      {editable && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <Button variant="subtle" leftIcon="check" loading={saving} onClick={save}>
            Save particulars
          </Button>
        </div>
      )}
    </Panel>
  );
}
