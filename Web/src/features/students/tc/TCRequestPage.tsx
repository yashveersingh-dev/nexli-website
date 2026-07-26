import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Form, FormSelect, FormTextarea, FormPage, FormSection, FormRow } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, createTC } from '@/features/school/data';
import '@/features/school/school.css';

export const DEFAULT_CLEARANCES = ['Library', 'Accounts / Fees', 'Sports', 'Transport', 'Class Teacher', 'Principal'];

const tcSchema = z.object({
  studentId: z.string().min(1, 'Select a student'),
  reason: z.string().min(3, 'Enter a reason'),
  remarks: z.string().optional(),
});
type TCValues = z.infer<typeof tcSchema>;

export function TCRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: students } = useStudents(schoolId);

  const studentOptions = students
    .filter((s) => s.status === 'active')
    .map((s) => ({ value: s.id, label: `${s.fullName} — ${s.admissionNo}` }));

  return (
    <div className="nx-page">
      <Form<TCValues>
        schema={tcSchema}
        defaultValues={{ studentId: '', reason: '', remarks: '' }}
        onSubmit={async (v) => {
          if (!schoolId) return;
          const student = students.find((s) => s.id === v.studentId);
          if (!student) return;
          try {
            const id = await createTC(
              schoolId,
              {
                schoolId,
                studentId: student.id,
                studentName: student.fullName,
                admissionNo: student.admissionNo,
                gradeName: student.gradeName,
                reason: v.reason,
                remarks: v.remarks || undefined,
                status: 'requested',
                requestedDate: Date.now(),
                clearances: DEFAULT_CLEARANCES.map((d) => ({ department: d, cleared: false })),
              },
              { uid: uid ?? 'unknown', name: member?.name },
            );
            toast.success('TC request raised', student.fullName);
            navigate(`/students/tc/${id}`);
          } catch {
            toast.error('Could not raise request', 'Please try again.');
          }
        }}
      >
        {({ formState }) => (
          <FormPage
            title="New TC request"
            subtitle="Start the transfer/leaving certificate clearance for a student."
            breadcrumbs={[{ label: 'Students', onClick: () => navigate('/students') }, { label: 'Transfer certificates', onClick: () => navigate('/students/tc') }, { label: 'New' }]}
            onBack={() => navigate('/students/tc')}
            onCancel={() => navigate('/students/tc')}
            submitLabel="Raise request"
            submitIcon="check"
            submitting={formState.isSubmitting}
          >
            <FormSection title="Details" single>
              <FormSelect<TCValues> name="studentId" label="Student" required placeholder="Select an active student" options={studentOptions} />
              <FormRow><FormTextarea<TCValues> name="reason" label="Reason for leaving" required placeholder="e.g. Relocation to another city" /></FormRow>
              <FormRow><FormTextarea<TCValues> name="remarks" label="Remarks" optional placeholder="Optional notes" /></FormRow>
            </FormSection>
          </FormPage>
        )}
      </Form>
    </div>
  );
}
