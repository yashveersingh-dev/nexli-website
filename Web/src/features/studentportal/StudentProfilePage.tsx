import { useMemo } from 'react';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Icon, type IconName } from '@/components/Icon';
import { useSession } from '@/app/providers/SessionProvider';
import { useHouses } from '@/features/school/data';
import { formatDate } from '@/lib/format';
import type { Guardian, Student } from '@/types/sis';
import { useStudentContext } from './useStudentContext';
import { PortalPage } from './PortalShell';
import './studentportal.css';

/** Years between a DOB epoch and now (whole years). */
function ageFrom(dob?: number): number | undefined {
  if (dob == null || !Number.isFinite(dob)) return undefined;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}

const RELATION_LABEL: Record<Guardian['relation'], string> = {
  father: 'Father',
  mother: 'Mother',
  guardian: 'Guardian',
  grandparent: 'Grandparent',
  sibling: 'Sibling',
  other: 'Guardian',
};

/** Read-only "My Profile" — the student's own identity, enrolment and contacts. */
export function StudentProfilePage() {
  const ctx = useStudentContext();
  const { schoolId, school } = useSession();
  const { data: houses } = useHouses(schoolId);

  const student = ctx.student;
  const houseName = useMemo(() => {
    if (!student?.house) return undefined;
    // `house` may be a house id or a plain name — resolve to a friendly label either way.
    return houses.find((h) => h.id === student.house)?.name ?? student.house;
  }, [houses, student]);
  const houseColor = useMemo(
    () => houses.find((h) => h.id === student?.house)?.color,
    [houses, student],
  );

  return (
    <PortalPage ctx={ctx} title="My Profile" icon="user" sub="Your student record at a glance.">
      {student && (
        <ProfileBody
          student={student}
          schoolName={school?.name}
          gradeLabel={student.gradeName ?? ctx.grade?.name}
          sectionLabel={student.sectionName ?? ctx.section?.name}
          houseName={houseName}
          houseColor={houseColor}
        />
      )}
    </PortalPage>
  );
}

function ProfileBody({
  student,
  schoolName,
  gradeLabel,
  sectionLabel,
  houseName,
  houseColor,
}: {
  student: Student;
  schoolName?: string;
  gradeLabel?: string;
  sectionLabel?: string;
  houseName?: string;
  houseColor?: string;
}) {
  const age = ageFrom(student.dob);
  const classLine = [gradeLabel, sectionLabel && `Section ${sectionLabel}`].filter(Boolean).join(' · ');
  const guardians = (student.guardians ?? []).filter((g) => g.name?.trim());

  const personal: { label: string; value?: ReactNodeValue; icon: IconName }[] = [
    { label: 'Full name', value: student.fullName, icon: 'user' },
    { label: 'Admission no.', value: student.admissionNo, icon: 'file-text' },
    { label: 'Roll no.', value: student.rollNo, icon: 'clipboard' },
    { label: 'Date of birth', value: student.dob ? `${formatDate(student.dob)}${age != null ? ` · ${age} yrs` : ''}` : undefined, icon: 'calendar' },
    { label: 'Gender', value: student.gender ? cap(student.gender) : undefined, icon: 'user' },
    { label: 'Blood group', value: student.bloodGroup && student.bloodGroup !== 'unknown' ? student.bloodGroup : undefined, icon: 'heart-pulse' },
  ];

  const enrolment: { label: string; value?: ReactNodeValue; icon: IconName }[] = [
    { label: 'Class', value: classLine || undefined, icon: 'book' },
    { label: 'House', value: houseName, icon: 'award' },
    { label: 'Academic year', value: student.academicYear, icon: 'calendar' },
    { label: 'Admission date', value: student.admissionDate ? formatDate(student.admissionDate) : undefined, icon: 'calendar' },
  ];

  const contact: { label: string; value?: ReactNodeValue; icon: IconName }[] = [
    { label: 'Address', value: [student.address, student.city, student.state, student.pincode].filter(Boolean).join(', ') || undefined, icon: 'map-pin' },
    { label: 'Mother tongue', value: student.motherTongue, icon: 'message' },
    { label: 'Nationality', value: student.nationality, icon: 'home' },
  ];

  return (
    <div className="sp-stack">
      {/* Hero identity strip */}
      <section className="sp-hero">
        <Avatar name={student.fullName} src={student.photoUrl} size={84} />
        <div className="sp-hero__main">
          <div className="sp-hero__name">{student.fullName}</div>
          <div className="sp-hero__chips">
            {classLine && <Badge variant="muted">{classLine}</Badge>}
            {student.admissionNo && <Badge variant="info">{student.admissionNo}</Badge>}
            {houseName && (
              <span className="sp-house" style={houseColor ? { ['--house' as string]: houseColor } : undefined}>
                <span className="sp-house__dot" aria-hidden="true" />
                {houseName} House
              </span>
            )}
          </div>
          {schoolName && <div className="sp-hero__school"><Icon name="school" size={13} aria-hidden="true" />{schoolName}</div>}
        </div>
        {student.status && student.status !== 'active' && <Badge variant="warning">{cap(student.status)}</Badge>}
      </section>

      <Panel title="Personal details">
        <FactGrid items={personal} />
      </Panel>

      <Panel title="Enrolment">
        <FactGrid items={enrolment} />
      </Panel>

      <Panel title="Contact">
        <FactGrid items={contact} />
      </Panel>

      <Panel title="Parents & guardians">
        {guardians.length === 0 ? (
          <p className="sp-muted">No guardian details on file. Please contact the school office to update them.</p>
        ) : (
          <ul className="sp-guardians">
            {guardians.map((g, i) => (
              <li key={`${g.name}-${i}`} className="sp-guardian">
                <Avatar name={g.name} size={40} />
                <div className="sp-guardian__main">
                  <div className="sp-guardian__name">
                    {g.name}
                    {g.isPrimary && <Badge variant="muted">Primary</Badge>}
                  </div>
                  <div className="sp-guardian__rel">{RELATION_LABEL[g.relation] ?? 'Guardian'}{g.occupation ? ` · ${g.occupation}` : ''}</div>
                  <div className="sp-guardian__contacts">
                    {g.phone && <span><Icon name="phone" size={12} aria-hidden="true" />{g.phone}</span>}
                    {g.email && <span><Icon name="mail" size={12} aria-hidden="true" />{g.email}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="sp-footnote">
        <Icon name="info" size={13} aria-hidden="true" />
        This is a read-only view. To correct any detail, please contact your school office.
      </p>
    </div>
  );
}

type ReactNodeValue = string | undefined;

function FactGrid({ items }: { items: { label: string; value?: ReactNodeValue; icon: IconName }[] }) {
  const present = items.filter((i) => i.value != null && String(i.value).trim() !== '');
  if (present.length === 0) return <p className="sp-muted">No details recorded yet.</p>;
  return (
    <dl className="sp-facts">
      {present.map((i) => (
        <div className="sp-fact" key={i.label}>
          <dt className="sp-fact__label"><Icon name={i.icon} size={13} aria-hidden="true" />{i.label}</dt>
          <dd className="sp-fact__value">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
