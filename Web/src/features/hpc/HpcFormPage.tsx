import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import {
  Form, FormInput, FormSelect, FormTextarea, FormPage, FormSection,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { RadarChart, type RadarAxis } from '@/features/analytics/RadarChart';
import { useHpcCard, hpcCardId, saveHpcCard, type Actor } from '@/features/analytics/data';
import { HPC_RATING_DESCRIPTORS, HPC_TERM_OPTIONS } from '@/features/analytics/meta';
import { useStudents, useSubjects } from '@/features/school/data';
import { hpcSchema, emptyHpcForm, cardToForm, formToCard, type HpcFormValues } from './hpcSchema';
import { statusOf, canEditStatus, HPC_STATUS_META } from './hpcWorkflow';

const RATINGS = [1, 2, 3, 4, 5] as const;
const emptyLine = { subject: '', grade: '', remark: '' };

export function HpcFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  // Creating/editing cards is an operate action; leadership reviews & approves instead.
  const canWrite = useOwnership('hpc').canOperate;

  const { data: existing, loading } = useHpcCard(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);
  const { data: students, loading: sLoading } = useStudents(schoolId);
  const { data: subjects } = useSubjects(schoolId);

  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active'), [students]);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return <div className="nx-page"><EmptyState icon="lock" title="Not allowed" message="You don't have permission to create or edit progress cards." action={<Button variant="subtle" onClick={() => navigate('/hpc')}>Back</Button>} /></div>;
  }
  if ((mode === 'edit' && loading) || sLoading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return <div className="nx-page"><EmptyState icon="file-text" title="Card not found" action={<Button variant="subtle" onClick={() => navigate('/hpc')}>Back</Button>} /></div>;
  }

  // Submitted/approved cards are locked from editing — they belong to the approval flow.
  const editStatus = existing ? statusOf(existing) : 'draft';
  if (mode === 'edit' && existing && !canEditStatus(editStatus)) {
    return (
      <div className="nx-page">
        <EmptyState
          icon={HPC_STATUS_META[editStatus].icon}
          title={editStatus === 'approved' ? 'Card is approved' : 'Card is awaiting approval'}
          message={
            editStatus === 'approved'
              ? 'Approved cards are locked. Ask an approver to return it if changes are needed.'
              : 'This card is pending approval and cannot be edited until it is approved or returned.'
          }
          action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate(`/hpc/${existing.id}`)}>View card</Button>}
        />
      </div>
    );
  }

  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  // Editing a returned card keeps it `returned` (author can resubmit); everything else is a draft.
  const nextStatus: 'draft' | 'returned' = editStatus === 'returned' ? 'returned' : 'draft';
  const defaults = mode === 'edit' && existing ? cardToForm(existing) : emptyHpcForm(school?.currentAcademicYear);
  const studentOptions = [
    { value: '', label: 'Select a student' },
    ...activeStudents
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((s) => ({ value: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })),
  ];
  const subjectNames = subjects.map((s) => s.name);

  return (
    <div className="nx-page">
      <Form<HpcFormValues>
        schema={hpcSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          const student = activeStudents.find((s) => s.id === values.studentId);
          if (!student) {
            toast.error('Pick a student', 'Choose the student this card belongs to.');
            return;
          }
          try {
            const payload = formToCard(values, {
              schoolId,
              studentName: student.fullName,
              gradeName: student.gradeName,
              sectionName: student.sectionName,
              descriptors: HPC_RATING_DESCRIPTORS,
              approvalStatus: nextStatus,
            });
            // Stable, idempotent id per student/year/term (upsert on re-save).
            const docId = mode === 'edit' && existing ? existing.id : hpcCardId(values.studentId, payload.academicYear, values.term);
            await saveHpcCard(schoolId, docId, payload, actor);
            toast.success('Card saved', `${student.fullName} · submit it for approval when ready`);
            navigate(`/hpc/${docId}`);
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <HpcFormBody
          mode={mode}
          studentOptions={studentOptions}
          subjectNames={subjectNames}
          lockStudent={mode === 'edit'}
          onCancel={() => navigate('/hpc')}
        />
      </Form>
    </div>
  );
}

function HpcFormBody({ mode, studentOptions, subjectNames, lockStudent, onCancel }: {
  mode: 'new' | 'edit';
  studentOptions: { value: string; label: string }[];
  subjectNames: string[];
  lockStudent: boolean;
  onCancel: () => void;
}) {
  const { formState } = useFormContext<HpcFormValues>();

  return (
    <FormPage
      title={mode === 'new' ? 'New holistic progress card' : 'Edit progress card'}
      subtitle="Rate the NEP holistic domains, record scholastic & co-scholastic progress, and add narrative remarks."
      breadcrumbs={[{ label: 'Progress cards', onClick: onCancel }, { label: mode === 'new' ? 'New card' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Save card' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Student & term">
        <FormSelect<HpcFormValues>
          name="studentId"
          label="Student"
          required
          options={studentOptions}
          disabled={lockStudent}
          hint={lockStudent ? 'Student is fixed once a card is created.' : undefined}
        />
        <FormInput<HpcFormValues> name="academicYear" label="Academic year" required placeholder="2025-26" />
        <FormSelect<HpcFormValues> name="term" label="Term" options={HPC_TERM_OPTIONS} required />
        <FormInput<HpcFormValues>
          name="attendancePct"
          label="Attendance"
          type="number"
          inputMode="numeric"
          rightSlot={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>%</span>}
          placeholder="e.g. 92"
          hint="Percentage of working days attended (optional)."
        />
      </FormSection>

      <DomainsSection />

      <SubjectLinesSection
        arrayName="scholastic"
        title="Scholastic areas"
        description="Subjects with a grade/level and a short remark. Blank rows are dropped on save."
        subjectLabel="Subject"
        subjectNames={subjectNames}
      />

      <SubjectLinesSection
        arrayName="coScholastic"
        title="Co-scholastic areas"
        description="Art, music, sport, work education and life skills."
        subjectLabel="Activity"
        subjectNames={[]}
      />

      <FormSection title="Narrative & reflections" single>
        <FormTextarea<HpcFormValues> name="strengths" label="Strengths" autoResize rows={3} placeholder="What the child does well…" />
        <FormTextarea<HpcFormValues> name="areasToImprove" label="Areas to improve" autoResize rows={3} placeholder="Focus areas for next term…" />
        <FormTextarea<HpcFormValues> name="teacherRemark" label="Teacher's remark" autoResize rows={3} placeholder="Holistic observation from the class teacher…" />
        <FormTextarea<HpcFormValues> name="selfReflection" label="Self reflection" autoResize rows={3} placeholder="In the student's own words…" optional />
        <FormTextarea<HpcFormValues> name="peerFeedback" label="Peer feedback" autoResize rows={3} placeholder="Feedback from classmates / group work…" optional />
      </FormSection>

      <FormSection title="Approval" description="Cards stay a private draft until you submit them for approval. A Principal or Vice Principal then approves (which publishes to parent & student) or returns the card with a note." single>
        <InfoCard icon="shield-check" title="Submit for approval from the card view">
          Save your changes here, then open the card and use <b>Submit for approval</b>. Parents and students only see a card once it has been approved.
        </InfoCard>
      </FormSection>
    </FormPage>
  );
}

/** Domain rating picker with a live radar preview. */
function DomainsSection() {
  const { control, setValue } = useFormContext<HpcFormValues>();
  const domains = useWatch({ control, name: 'domains' }) ?? [];

  const axes: RadarAxis[] = domains.map((d) => ({ label: d.domain, value: Number(d.rating) || 0 }));

  return (
    <FormSection
      title="Holistic domains"
      description="Rate each NEP domain from 1 (Beginning) to 5 (Exemplary). The radar updates live."
      single
    >
      <div className="hpc-form-radar" aria-hidden="true">
        <RadarChart axes={axes} max={5} size={220} />
      </div>

      <div className="hpc-rate-list">
        {domains.map((d, i) => {
          const current = Number(d.rating) || 0;
          return (
            <div className="hpc-rate" key={d.domain}>
              <div>
                <div className="hpc-rate__name">{d.domain}</div>
                <div className="hpc-rate__desc">{HPC_RATING_DESCRIPTORS[current] ?? ''}</div>
              </div>
              <div className="hpc-rate__scale" role="radiogroup" aria-label={`${d.domain} rating`}>
                {RATINGS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`hpc-rate__btn ${n === current ? 'is-on' : ''}`}
                    role="radio"
                    aria-checked={n === current}
                    aria-label={`${d.domain}: ${n} — ${HPC_RATING_DESCRIPTORS[n]}`}
                    onClick={() => setValue(`domains.${i}.rating`, String(n) as HpcFormValues['domains'][number]['rating'], { shouldDirty: true })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}

/** Editable repeating subject/co-scholastic lines (RHF useFieldArray). */
function SubjectLinesSection({ arrayName, title, description, subjectLabel, subjectNames }: {
  arrayName: 'scholastic' | 'coScholastic';
  title: string;
  description: string;
  subjectLabel: string;
  subjectNames: string[];
}) {
  const { control } = useFormContext<HpcFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: arrayName });
  const listId = `hpc-subjects-${arrayName}`;

  return (
    <FormSection
      title={title}
      description={description}
      single
      aside={
        <Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append({ ...emptyLine })}>
          Add row
        </Button>
      }
    >
      {subjectNames.length > 0 && (
        <datalist id={listId}>
          {subjectNames.map((n) => <option key={n} value={n} />)}
        </datalist>
      )}
      {fields.length === 0 ? (
        <InfoCard icon="info" title="No rows yet">Add a row to record progress in this area.</InfoCard>
      ) : (
        fields.map((f, i) => (
          <div className="hpc-linerow" key={f.id}>
            <FormInput<HpcFormValues>
              name={`${arrayName}.${i}.subject`}
              label={i === 0 ? subjectLabel : undefined}
              placeholder={subjectLabel}
              list={subjectNames.length ? listId : undefined}
            />
            <FormInput<HpcFormValues> name={`${arrayName}.${i}.grade`} label={i === 0 ? 'Grade' : undefined} placeholder="A / B+" />
            <FormInput<HpcFormValues> name={`${arrayName}.${i}.remark`} label={i === 0 ? 'Remark' : undefined} placeholder="Short note" />
            <div className="hpc-linerow__rm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon="minus-circle"
                aria-label={`Remove ${subjectLabel.toLowerCase()} row ${i + 1}`}
                onClick={() => remove(i)}
              />
            </div>
          </div>
        ))
      )}
    </FormSection>
  );
}
