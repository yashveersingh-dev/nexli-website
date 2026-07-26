import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { Skeleton, EmptyState } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { useCan, useSession } from '@/app/providers/SessionProvider';
import { useStudent, useSections } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { STUDENT_STATUS_META, CATEGORY_OPTIONS, GUARDIAN_RELATIONS } from '@/features/school/meta';
import { ageFromDob } from './studentSchema';
import { StudentAttendancePanel, StudentFeesPanel, StudentHealthPanel } from './StudentProfilePanels';
import type { StudentStatus } from '@/types/sis';
import '@/features/school/school.css';

const label = <T extends string>(opts: { value: T; label: string }[], v?: T) => opts.find((o) => o.value === v)?.label ?? v ?? '—';

export function StudentProfilePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useCan('students.write');
  // Health is sensitive — only roles with medical access (nurse/doctor/leadership) see it.
  const canHealth = useCan('medical.read');
  const { data: s, loading } = useStudent(schoolId, id);
  const { data: sections } = useSections(schoolId);
  // Same section scope as the list — a scoped teacher must not deep-link into a
  // student outside the section(s) they own.
  const { isBroad, sectionIds } = useScopedSectionIds('students', 'students.read', sections);

  if (loading) return <div className="nx-page"><Skeleton width={52} height={52} radius={14} /><Panel><Skeleton height={240} /></Panel></div>;
  if (!s) return <div className="nx-page"><EmptyState icon="users" title="Student not found" action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/students')}>Back to students</Button>} /></div>;

  const outOfScope = !isBroad && (!s.sectionId || !sectionIds!.has(s.sectionId));
  if (outOfScope) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="lock"
          title="Not in your section"
          message="You can only view students in the section(s) you are assigned."
          action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/students')}>Back to students</Button>}
        />
      </div>
    );
  }

  const statusMeta = STUDENT_STATUS_META[(s.status as StudentStatus) ?? 'active'];
  const age = ageFromDob(s.dob);

  return (
    <div className="nx-page">
      <div className="nx-detail__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/students')} aria-label="Back to students">
          <Icon name="chevron-left" size={18} />
        </button>
        <Avatar name={s.fullName} src={s.photoUrl} size={52} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="nx-page__title" style={{ fontSize: 20 }}>{s.fullName}</h1>
          <div className="nx-detail__meta">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <span>{s.admissionNo}</span>
            <span className="dot" />
            <span>{[s.gradeName, s.sectionName].filter(Boolean).join(' · ') || 'Unassigned'}</span>
          </div>
        </div>
        {canWrite && (
          <div className="nx-detail__actions">
            <Button variant="ghost" leftIcon="edit" onClick={() => navigate(`/students/${id}/edit`)}>Edit</Button>
          </div>
        )}
      </div>

      <Tabs
        aria-label="Student profile"
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'user' },
          { id: 'academic', label: 'Enrolment', icon: 'book' },
          { id: 'attendance', label: 'Attendance', icon: 'clock' },
          { id: 'fees', label: 'Fees', icon: 'credit-card' },
          ...(canHealth ? [{ id: 'health', label: 'Health', icon: 'heart-pulse' as const }] : []),
          { id: 'guardians', label: 'Guardians', icon: 'users' },
          { id: 'records', label: 'IDs & address', icon: 'file-text' },
        ]}
      >
        {(tab) =>
          tab === 'overview' ? (
            <div className="grid g-2">
              <Panel title="Personal">
                <KV k="Full name" v={s.fullName} />
                <KV k="Gender" v={s.gender} />
                <KV k="Date of birth" v={s.dob ? formatDate(s.dob) : '—'} />
                <KV k="Age" v={age != null ? `${age} years` : '—'} />
                <KV k="Blood group" v={s.bloodGroup} />
                <KV k="Religion" v={s.religion} />
                <KV k="Mother tongue" v={s.motherTongue} />
                <KV k="Nationality" v={s.nationality} />
              </Panel>
              <Panel title="Category">
                <KV k="Category" v={label(CATEGORY_OPTIONS, s.category)} />
                <KV k="RTE quota" v={s.rteQuota ? 'Yes' : 'No'} />
                <KV k="Special needs (CWSN)" v={s.specialNeeds ? 'Yes' : 'No'} />
                <KV k="House" v={s.house || '—'} />
                <KV k="Tags" v={s.tags?.join(', ') || '—'} />
              </Panel>
            </div>
          ) : tab === 'academic' ? (
            <Panel title="Enrolment">
              <KV k="Admission no." v={s.admissionNo} />
              <KV k="Roll no." v={s.rollNo} />
              <KV k="Grade / Class" v={s.gradeName} />
              <KV k="Section" v={s.sectionName} />
              <KV k="Academic year" v={s.academicYear} />
              <KV k="Admission date" v={s.admissionDate ? formatDate(s.admissionDate) : '—'} />
              <KV k="Admission type" v={s.admissionType} />
              <KV k="Status" v={statusMeta.label} />
            </Panel>
          ) : tab === 'guardians' ? (
            <div className="grid g-2">
              {(s.guardians ?? []).length === 0 ? (
                <EmptyState icon="users" title="No guardians on record" />
              ) : (
                (s.guardians ?? []).map((g, i) => (
                  <Panel key={i} title={label(GUARDIAN_RELATIONS, g.relation)} headerRight={g.isPrimary ? <Badge variant="success">Primary</Badge> : undefined}>
                    <KV k="Name" v={g.name} />
                    <KV k="Mobile" v={g.phone} />
                    <KV k="Email" v={g.email} />
                    <KV k="Occupation" v={g.occupation} />
                    <KV k="Parent login" v={g.uid ? 'Linked' : 'Not linked'} />
                  </Panel>
                ))
              )}
            </div>
          ) : tab === 'attendance' ? (
            <StudentAttendancePanel schoolId={schoolId!} studentId={s.id} />
          ) : tab === 'fees' ? (
            <StudentFeesPanel schoolId={schoolId!} studentId={s.id} />
          ) : tab === 'health' ? (
            <StudentHealthPanel schoolId={schoolId!} studentId={s.id} />
          ) : (
            <div className="grid g-2">
              <Panel title="Government IDs">
                <KV k="Aadhaar (last 4)" v={s.aadhaarLast4 ? `•••• ${s.aadhaarLast4}` : '—'} />
                <KV k="APAAR ID" v={s.apaarId} />
                <KV k="PEN" v={s.penId} />
              </Panel>
              <Panel title="Address">
                <KV k="Address" v={s.address} />
                <KV k="City" v={s.city} />
                <KV k="State" v={s.state} />
                <KV k="Pincode" v={s.pincode} />
                <KV k="Previous school" v={s.previousSchool} />
              </Panel>
            </div>
          )
        }
      </Tabs>
    </div>
  );
}

function KV({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div className="nx-kv">
      <span className="nx-kv__k">{k}</span>
      <span className="nx-kv__v">{v != null && v !== '' ? v : '—'}</span>
    </div>
  );
}
