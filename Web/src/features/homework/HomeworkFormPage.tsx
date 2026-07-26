import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import {
  Form,
  FormInput,
  FormTextarea,
  FormSelect,
  FormDate,
  FormPage,
  FormSection,
  FormRow,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades, useSections, useSubjects } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { useHomework, createHomework, updateHomework } from '@/features/daily/data';
import type { Homework } from '@/types/daily';
import { homeworkSchema, emptyHomeworkForm, emptyAttachmentRow, type HomeworkFormValues } from './homeworkSchema';
import { attachmentTypeFromUrl, isValidAttachmentUrl, ATTACHMENT_ICON, toHomeworkAttachments } from './attachments';
import { sectionLabelOf } from './util';
import './homework.css';

const toISO = (ms?: number) => (ms != null ? new Date(ms).toISOString().slice(0, 10) : '');
const fromISO = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`).getTime() : undefined);

export function HomeworkFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: subjects } = useSubjects(schoolId);
  const { data: homework, loading } = useHomework(schoolId);

  const isEdit = !!id;
  const existing = isEdit ? homework.find((h) => h.id === id) : undefined;

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="clipboard" title="No school context" message="Sign in to a school to assign homework." />
      </div>
    );
  }

  if (isEdit && loading && !existing) {
    return (
      <div className="nx-page">
        <Skeleton height={56} />
        <Skeleton height={360} />
      </div>
    );
  }

  if (isEdit && !existing) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="clipboard"
          title="Homework not found"
          message="It may have been deleted."
          action={
            <Button variant="subtle" onClick={() => navigate('/homework')}>
              Back to homework
            </Button>
          }
        />
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const defaults: HomeworkFormValues = existing
    ? {
        title: existing.title ?? '',
        description: existing.description ?? '',
        sectionId: existing.sectionId ?? '',
        subjectId: existing.subjectId ?? '',
        assignedDate: toISO(existing.assignedDate) || new Date().toISOString().slice(0, 10),
        dueDate: toISO(existing.dueDate) || new Date().toISOString().slice(0, 10),
        maxMarks: existing.maxMarks != null ? String(existing.maxMarks) : '',
        attachmentUrl: existing.attachmentUrl ?? null,
        attachments: (existing.attachments ?? []).map((a) => ({ name: a.name, url: a.url })),
      }
    : emptyHomeworkForm();

  return (
    <div className="nx-page">
      <Form<HomeworkFormValues>
        schema={homeworkSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          const section = sections.find((s) => s.id === values.sectionId);
          const subject = subjects.find((s) => s.id === values.subjectId);
          const payload: Omit<Homework, 'id'> = {
            schoolId,
            title: values.title.trim(),
            description: values.description?.trim() || undefined,
            sectionId: values.sectionId,
            sectionName: section ? sectionLabelOf(section.id, sections, grades) : undefined,
            subjectId: values.subjectId || undefined,
            subjectName: subject?.name,
            assignedDate: fromISO(values.assignedDate),
            dueDate: fromISO(values.dueDate),
            maxMarks: values.maxMarks && values.maxMarks.trim() !== '' ? Number(values.maxMarks) : undefined,
            attachmentUrl: values.attachmentUrl || undefined,
            attachments: toHomeworkAttachments(values.attachments),
            assignedByUid: existing?.assignedByUid ?? actor.uid,
            assignedByName: existing?.assignedByName ?? actor.name,
          };
          try {
            if (isEdit && existing) {
              await updateHomework(schoolId, existing.id, payload, actor);
              toast.success('Homework updated', payload.title);
              navigate(`/homework/${existing.id}`);
            } else {
              const newId = await createHomework(schoolId, payload, actor);
              toast.success('Homework assigned', payload.title);
              navigate(`/homework/${newId}`);
            }
          } catch {
            toast.error('Could not save', 'It will sync when you are back online.');
          }
        }}
      >
        <HomeworkFormBody isEdit={isEdit} onCancel={() => navigate(isEdit && existing ? `/homework/${existing.id}` : '/homework')} />
      </Form>
    </div>
  );
}

function HomeworkFormBody({ isEdit, onCancel }: { isEdit: boolean; onCancel: () => void }) {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { watch, formState } = useFormContext<HomeworkFormValues>();
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: subjects } = useSubjects(schoolId);
  // A scoped teacher may only assign homework to their own section(s).
  const { isBroad, sectionIds } = useScopedSectionIds('homework', undefined, sections);

  const sectionId = watch('sectionId');
  const assignedDate = watch('assignedDate');
  const section = sections.find((s) => s.id === sectionId);

  const assignableSections = isBroad || !sectionIds ? sections : sections.filter((s) => sectionIds.has(s.id));
  const sectionOptions = assignableSections.map((s) => ({ value: s.id, label: sectionLabelOf(s.id, sections, grades) }));
  const subjectOptions = [
    { value: '', label: 'No subject' },
    ...subjects
      .filter((sub) => !section || !sub.gradeIds?.length || sub.gradeIds.includes(section.gradeId))
      .map((sub) => ({ value: sub.id, label: sub.name })),
  ];

  return (
    <FormPage
      title={isEdit ? 'Edit homework' : 'New homework'}
      subtitle={
        isEdit
          ? 'Update the assignment details. Students see changes immediately.'
          : 'Assign work to a class section and track submissions.'
      }
      breadcrumbs={[{ label: 'Homework', onClick: () => navigate('/homework') }, { label: isEdit ? 'Edit' : 'New' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save changes' : 'Assign homework'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Assignment" description="What students need to do and when it is due.">
        <FormRow>
          <FormInput<HomeworkFormValues> name="title" label="Title" required placeholder="e.g. Algebra worksheet — Chapter 4" />
        </FormRow>
        <FormRow>
          <FormTextarea<HomeworkFormValues>
            name="description"
            label="Description"
            optional
            autoResize
            rows={4}
            placeholder="Instructions, questions, page numbers…"
          />
        </FormRow>
        <FormSelect<HomeworkFormValues> name="sectionId" label="Class / Section" required placeholder="Select a section" options={sectionOptions} />
        <FormSelect<HomeworkFormValues> name="subjectId" label="Subject" optional options={subjectOptions} />
        <FormDate<HomeworkFormValues> name="assignedDate" label="Assigned date" required />
        <FormDate<HomeworkFormValues> name="dueDate" label="Due date" required min={assignedDate || undefined} />
        <FormInput<HomeworkFormValues>
          name="maxMarks"
          label="Maximum marks"
          optional
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="e.g. 20"
        />
      </FormSection>

      <FormSection
        title="Attachments"
        description="Paste a link to a worksheet or reference (Google Drive, a shared file, or any public URL). PDF, Word, Excel, and image links are supported."
      >
        <AttachmentsField />
      </FormSection>
    </FormPage>
  );
}

/**
 * Repeatable attachment rows: a display name + a pasted link per row. The file
 * type is auto-detected from the link/name and shown as an icon; URLs are
 * validated (http/https). This is the single "add attachment" entry point — a
 * future real upload (ImageKit/Blaze) swaps the input for an uploader and keeps
 * the same `{ name, url }` row shape.
 */
function AttachmentsField() {
  const { control, watch, formState } = useFormContext<HomeworkFormValues>();
  const { fields, append, remove } = useFieldArray<HomeworkFormValues, 'attachments'>({
    control,
    name: 'attachments',
  });

  return (
    <div className="nx-hw-att-editor">
      {fields.length === 0 ? (
        <p className="nx-hw-att-empty">No attachments yet. Add a link to share a file with this class.</p>
      ) : (
        <ul className="nx-hw-att-list" aria-label="Attachments">
          {fields.map((field, index) => {
            const url = (watch(`attachments.${index}.url`) ?? '').trim();
            const name = (watch(`attachments.${index}.name`) ?? '').trim();
            const hasUrl = url !== '';
            const valid = hasUrl && isValidAttachmentUrl(url);
            const type = valid ? attachmentTypeFromUrl(url, name) : 'other';
            const errorMsg = formState.errors.attachments?.[index]?.url?.message;

            return (
              <li className="nx-hw-att-item" key={field.id}>
                <span
                  className={`nx-hw-att-item__icon${valid ? '' : ' is-muted'}`}
                  aria-hidden="true"
                >
                  <Icon name={valid ? ATTACHMENT_ICON[type] : 'paperclip'} size={16} />
                </span>
                <div className="nx-hw-att-item__fields">
                  <FormInput<HomeworkFormValues>
                    name={`attachments.${index}.name`}
                    label="Display name"
                    optional
                    placeholder="e.g. Chapter 4 worksheet"
                  />
                  <FormInput<HomeworkFormValues>
                    name={`attachments.${index}.url`}
                    label="Link"
                    inputMode="url"
                    placeholder="https://…"
                    hint={errorMsg ? undefined : 'Paste a Google Drive or public file link.'}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="nx-hw-att-item__remove"
                  leftIcon="minus-circle"
                  onClick={() => remove(index)}
                  aria-label={`Remove attachment ${name || url || index + 1}`}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <FormRow>
        <Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append(emptyAttachmentRow())}>
          Add attachment
        </Button>
      </FormRow>
    </div>
  );
}
