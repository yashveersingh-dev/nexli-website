import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormSelect,
  FormDate,
  FormCheckbox,
  FormFileUpload,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { INDIAN_STATES } from '@/features/platform/meta';
import {
  useStudent,
  useGrades,
  useSections,
  useHouses,
  createStudent,
  updateStudent,
  nextAdmissionNo,
} from '@/features/school/data';
import {
  GENDER_OPTIONS,
  BLOOD_GROUPS,
  CATEGORY_OPTIONS,
  GUARDIAN_RELATIONS,
  STUDENT_STATUS_META,
} from '@/features/school/meta';
import { ConsentRequiredBanner, useConsentStatus, decideConsentGate } from '@/features/consent';
import {
  studentSchema,
  emptyStudentForm,
  studentToForm,
  formToStudent,
  type StudentFormValues,
} from './studentSchema';
import '@/features/school/school.css';
import '@/features/consent/consent.css';

const STATUS_OPTIONS = Object.entries(STUDENT_STATUS_META).map(([value, m]) => ({ value, label: m.label }));

/** localStorage key for a per-school new-admission draft (so an interrupted 20+
 *  field entry can be recovered). Edit mode is intentionally NOT drafted — the
 *  saved record is the source of truth there. */
const draftKeyFor = (schoolId: string) => `nexli:draft:student:new:${schoolId}`;

function readDraft(key: string): { values: StudentFormValues; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { values?: StudentFormValues; savedAt?: number };
    if (!parsed || typeof parsed !== 'object' || !parsed.values) return null;
    return { values: parsed.values, savedAt: parsed.savedAt ?? 0 };
  } catch {
    return null;
  }
}

function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore (private mode / quota) */
  }
}

/** Short human age for a saved draft, e.g. "just now", "12 min ago", "2 days ago". */
function formatDraftAge(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function StudentFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const { data: existing, loading } = useStudent(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);
  const [defaults, setDefaults] = useState<StudentFormValues | null>(null);

  // Build defaults (generate admission no for new students).
  useEffect(() => {
    let active = true;
    if (mode === 'edit') {
      if (existing) setDefaults(studentToForm(existing));
      return;
    }
    if (!schoolId) return;
    void nextAdmissionNo(schoolId, school?.currentAcademicYear).then((no) => {
      if (active) setDefaults(emptyStudentForm(no, school?.currentAcademicYear));
    });
    return () => {
      active = false;
    };
  }, [mode, existing, schoolId, school?.currentAcademicYear]);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return <div className="nx-page"><EmptyState icon="users" title="Student not found" action={<Button variant="subtle" onClick={() => navigate('/students')}>Back</Button>} /></div>;
  }
  if (!defaults) return <div className="nx-page"><Skeleton height={360} /></div>;

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  // Drafts apply only to a brand-new admission (recover an interrupted entry).
  const draftKey = mode === 'new' ? draftKeyFor(schoolId) : null;

  return (
    <div className="nx-page">
      <Form<StudentFormValues>
        schema={studentSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const payload = formToStudent(values);
            if (mode === 'new') {
              const newId = await createStudent(schoolId, { ...payload, schoolId }, actor);
              if (draftKey) clearDraft(draftKey); // success → discard the recovery draft
              toast.success('Student admitted', payload.fullName);
              navigate(`/students/${newId}`);
            } else {
              await updateStudent(schoolId, id, payload, actor);
              toast.success('Student updated', payload.fullName);
              navigate(`/students/${id}`);
            }
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <StudentFormBody
          mode={mode}
          studentId={mode === 'edit' ? id : undefined}
          draftKey={draftKey}
          emptyDraft={defaults}
          onCancel={() => navigate(mode === 'edit' ? `/students/${id}` : '/students')}
        />
      </Form>
    </div>
  );
}

function StudentFormBody({
  mode,
  studentId,
  draftKey,
  emptyDraft,
  onCancel,
}: {
  mode: 'new' | 'edit';
  studentId?: string;
  draftKey: string | null;
  emptyDraft: StudentFormValues;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { control, watch, reset, formState } = useFormContext<StudentFormValues>();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: houses } = useHouses(schoolId);
  const { fields, append, remove } = useFieldArray({ control, name: 'guardians' });

  // ---- Draft autosave / recovery (new admission only) -------------------------
  // A recoverable draft is offered if one was found in storage on mount; the live
  // form is then debounced-persisted on every change and cleared on success.
  const [draft, setDraft] = useState<{ values: StudentFormValues; savedAt: number } | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  submittingRef.current = formState.isSubmitting;

  useEffect(() => {
    if (!draftKey) return;
    const found = readDraft(draftKey);
    if (found) setDraft(found);
  }, [draftKey]);

  // Debounced persistence of the in-progress form. A single ref-held timer is
  // reset on every change (true debounce), and writes are skipped while
  // submitting. The `{ type: undefined }` first emission from RHF is naturally
  // debounced away. Best-effort — storage failures are ignored.
  useEffect(() => {
    if (!draftKey) return;
    const sub = watch((values, { name }) => {
      // Skip RHF's initial emission (name === undefined): don't persist the
      // untouched default form, which would falsely offer a "draft" next time.
      if (!name) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (submittingRef.current) return;
        try {
          localStorage.setItem(draftKey, JSON.stringify({ values, savedAt: Date.now() }));
        } catch {
          /* ignore (private mode / quota) */
        }
      }, 800);
    });
    return () => {
      sub.unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draftKey, watch]);

  const restoreDraft = () => {
    if (draft) reset(draft.values, { keepDefaultValues: true });
    setDraft(null);
  };
  const discardDraft = () => {
    if (draftKey) clearDraft(draftKey);
    // Reset back to a clean form so the just-discarded values don't linger.
    reset(emptyDraft, { keepDefaultValues: true });
    setDraft(null);
    setDraftDismissed(true);
  };
  const showDraftBanner = !!draft && !draftDismissed;

  const gradeId = watch('gradeId');
  const gradeOptions = grades.map((g) => ({ value: g.id, label: g.name }));
  const sectionOptions = sections.filter((s) => !gradeId || s.gradeId === gradeId).map((s) => ({ value: s.id, label: s.name }));
  const houseOptions = [{ value: '', label: 'None' }, ...houses.map((h) => ({ value: h.id, label: h.name }))];

  // ---- DPDP consent hard-gate (edit mode) -----------------------------------
  // A student record may exist before consent is attached (records are keyed by
  // studentId), so creation is never blocked here. But *processing* an ACTIVE
  // student without recorded verifiable parental consent is not permitted, so we
  // block the save while the student is/would be `active` and required consent is
  // verifiably missing. The record can still be saved in a non-active status to
  // correct data or park it until consent arrives — this is what prevents a
  // deadlock. When consent simply can't be VERIFIED (no consent.read), we advise
  // rather than block, so non-consent staff aren't locked out.
  const status = watch('status');
  const consent = useConsentStatus(studentId);
  const gate = decideConsentGate(consent);
  const blockSave = mode === 'edit' && status === 'active' && gate.hardBlock;

  return (
    <FormPage
      title={mode === 'new' ? 'New admission' : 'Edit student'}
      subtitle={mode === 'new' ? 'Enrol a new student into the school.' : 'Update the student record.'}
      breadcrumbs={[{ label: 'Students', onClick: () => navigate('/students') }, { label: mode === 'new' ? 'New' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Admit student' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
      submitDisabled={blockSave}
    >
      {mode === 'edit' && studentId && (
        <div style={{ marginBottom: 16 }}>
          {/* DPDP block-mode gate: prominent required-consent banner + a direct CTA
              (deep-link) for consent staff, or who-to-contact for others. Pairs with
              `submitDisabled` above to actually stop enabling an active student
              record without recorded consent. */}
          <ConsentRequiredBanner studentId={studentId} />
          {blockSave && (
            <p role="note" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Saving is disabled while this student is <strong>Active</strong> without recorded consent. Record
              the consent above, or set <strong>Status</strong> to a non-active value to save and park the record
              until consent is captured.
            </p>
          )}
        </div>
      )}

      {showDraftBanner && (
        <div className="nx-info-card" role="status" style={{ marginBottom: 16 }}>
          <div className="nx-info-card__icon">
            <Icon name="clock" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nx-info-card__title">Unsaved draft found</div>
            <div className="nx-info-card__msg">
              You have an unfinished admission saved on this device
              {draft && draft.savedAt ? ` (${formatDraftAge(draft.savedAt)})` : ''}. Restore it to
              continue where you left off, or discard to start fresh.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button type="button" variant="gold" size="sm" leftIcon="check" onClick={restoreDraft}>
                Restore draft
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      <FormSection title="Identity" description="Basic details of the student.">
        <FormFileUpload<StudentFormValues> name="photoUrl" label="Photo" kind="avatar" />
        <FormInput<StudentFormValues> name="firstName" label="First name" required placeholder="First name" />
        <FormInput<StudentFormValues> name="lastName" label="Last name" placeholder="Last name" />
        <FormSelect<StudentFormValues> name="gender" label="Gender" required placeholder="Select" options={GENDER_OPTIONS} />
        <FormDate<StudentFormValues> name="dob" label="Date of birth" />
        <FormSelect<StudentFormValues> name="bloodGroup" label="Blood group" placeholder="Select" options={BLOOD_GROUPS} />
      </FormSection>

      <FormSection title="Enrolment">
        <FormInput<StudentFormValues> name="admissionNo" label="Admission no." required />
        <FormInput<StudentFormValues> name="rollNo" label="Roll no." />
        <FormSelect<StudentFormValues> name="gradeId" label="Grade / Class" placeholder="Select grade" options={gradeOptions} />
        <FormSelect<StudentFormValues> name="sectionId" label="Section" placeholder="Select section" options={sectionOptions} />
        <FormSelect<StudentFormValues> name="house" label="House" options={houseOptions} />
        <FormSelect<StudentFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
        <FormDate<StudentFormValues> name="admissionDate" label="Admission date" />
        <FormInput<StudentFormValues> name="academicYear" label="Academic year" />
      </FormSection>

      <FormSection title="Category & identifiers">
        <FormSelect<StudentFormValues> name="category" label="Category" options={CATEGORY_OPTIONS} />
        <FormInput<StudentFormValues> name="religion" label="Religion" />
        <FormInput<StudentFormValues> name="motherTongue" label="Mother tongue" />
        <FormInput<StudentFormValues> name="nationality" label="Nationality" />
        <FormInput<StudentFormValues> name="aadhaarLast4" label="Aadhaar (last 4)" maxLength={4} inputMode="numeric" hint="Store only the last 4 digits." />
        <FormInput<StudentFormValues> name="apaarId" label="APAAR ID" />
        <FormInput<StudentFormValues> name="penId" label="PEN" />
        <div className="nx-col-full">
          <FormCheckbox<StudentFormValues> name="rteQuota" label="RTE quota admission (25% EWS/DG)" />
        </div>
      </FormSection>

      <FormSection title="Contact & address">
        <FormRow>
          <FormInput<StudentFormValues> name="address" label="Address" placeholder="House / street / area" />
        </FormRow>
        <FormInput<StudentFormValues> name="city" label="City" />
        <FormSelect<StudentFormValues> name="state" label="State" placeholder="Select state" options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} />
        <FormInput<StudentFormValues> name="pincode" label="Pincode" inputMode="numeric" maxLength={6} />
      </FormSection>

      <FormSection
        title="Parents & guardians"
        description="At least one guardian is required. The primary guardian can be given a parent login later."
        single
        aside={
          <Button type="button" variant="subtle" size="sm" leftIcon="user-plus" onClick={() => append({ relation: 'mother', name: '', phone: '', email: '', occupation: '', isPrimary: false })}>
            Add guardian
          </Button>
        }
      >
        {fields.map((f, i) => (
          <div className="nx-guardian" key={f.id}>
            <div className="nx-guardian__head">
              <span className="nx-guardian__title">Guardian {i + 1}</span>
              {fields.length > 1 && (
                <button type="button" className="nx-guardian__remove" onClick={() => remove(i)} aria-label={`Remove guardian ${i + 1}`}>
                  <Icon name="x" size={14} /> Remove
                </button>
              )}
            </div>
            <div className="nx-section__grid">
              <FormSelect<StudentFormValues> name={`guardians.${i}.relation`} label="Relation" required options={GUARDIAN_RELATIONS} />
              <FormInput<StudentFormValues> name={`guardians.${i}.name`} label="Name" required />
              <FormInput<StudentFormValues> name={`guardians.${i}.phone`} label="Mobile" inputMode="numeric" />
              <FormInput<StudentFormValues> name={`guardians.${i}.email`} label="Email" />
              <FormInput<StudentFormValues> name={`guardians.${i}.occupation`} label="Occupation" />
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                <FormCheckbox<StudentFormValues> name={`guardians.${i}.isPrimary`} label="Primary contact" />
              </div>
            </div>
          </div>
        ))}
      </FormSection>
    </FormPage>
  );
}
