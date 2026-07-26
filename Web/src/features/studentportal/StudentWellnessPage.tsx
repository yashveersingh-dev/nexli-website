import { Panel } from '@/components/Panel';
import { Icon, type IconName } from '@/components/Icon';
import { useStudentContext } from './useStudentContext';
import { PortalPage } from './PortalShell';
import type { Student } from '@/types/sis';
import './studentportal.css';

interface WellnessTip {
  icon: IconName;
  title: string;
  body: string;
}

/**
 * Calm, curated well-being guidance. Static, read-only and safe for every student
 * to see — no individual health records are read here (clinical/medical data lives
 * in a rules-restricted collection a student cannot access).
 */
const TIPS: WellnessTip[] = [
  { icon: 'clock', title: 'Rest well', body: 'Aim for 8–9 hours of sleep. A steady bedtime helps focus, mood and memory at school.' },
  { icon: 'heart-pulse', title: 'Move every day', body: 'Thirty minutes of play or exercise lifts energy and lowers stress. Take the stairs, stretch between classes.' },
  { icon: 'utensils', title: 'Eat for energy', body: 'Start with a good breakfast and drink water through the day. Balanced meals keep you sharp.' },
  { icon: 'message', title: 'Talk it out', body: 'Feeling low or overwhelmed is normal. Share it with a teacher, counsellor or family — you are not alone.' },
  { icon: 'book', title: 'Take real breaks', body: 'Short screen-free breaks while studying actually help you remember more. Step away, breathe, return.' },
  { icon: 'sparkles', title: 'Be kind', body: 'A small act of kindness to a classmate — or yourself — makes the whole day better.' },
];

/** Read-only wellness surface: a personal snapshot plus well-being guidance. */
export function StudentWellnessPage() {
  const ctx = useStudentContext();
  return (
    <PortalPage ctx={ctx} title="Wellness" icon="heart-pulse" sub="Looking after your health and well-being.">
      {ctx.status === 'ready' && ctx.student && <WellnessBody student={ctx.student} />}
    </PortalPage>
  );
}

function ageFrom(dob?: number): number | undefined {
  if (dob == null || !Number.isFinite(dob)) return undefined;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}

function WellnessBody({ student }: { student: Student }) {
  const age = ageFrom(student.dob);
  const emergency = (student.guardians ?? []).find((g) => g.isEmergencyContact && g.phone)
    ?? (student.guardians ?? []).find((g) => g.isPrimary && g.phone)
    ?? (student.guardians ?? []).find((g) => g.phone);

  const snapshot: { label: string; value?: string; icon: IconName }[] = [
    { label: 'Blood group', value: student.bloodGroup && student.bloodGroup !== 'unknown' ? student.bloodGroup : undefined, icon: 'heart-pulse' },
    { label: 'Age', value: age != null ? `${age} years` : undefined, icon: 'user' },
    { label: 'Emergency contact', value: emergency ? `${emergency.name}${emergency.phone ? ` · ${emergency.phone}` : ''}` : undefined, icon: 'phone' },
  ];
  const hasSnapshot = snapshot.some((s) => s.value);

  return (
    <div className="sp-stack">
      {hasSnapshot && (
        <Panel title="Health snapshot">
          <dl className="sp-facts">
            {snapshot.filter((s) => s.value).map((s) => (
              <div className="sp-fact" key={s.label}>
                <dt className="sp-fact__label"><Icon name={s.icon} size={13} aria-hidden="true" />{s.label}</dt>
                <dd className="sp-fact__value">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="sp-muted" style={{ marginTop: 12 }}>
            Detailed medical records are kept private by the school clinic. If anything here looks wrong,
            please ask your school office to update it.
          </p>
        </Panel>
      )}

      <Panel title="Well-being tips">
        <ul className="sp-tips">
          {TIPS.map((t) => (
            <li key={t.title} className="sp-tip">
              <span className="sp-tip__icon" aria-hidden="true"><Icon name={t.icon} size={16} /></span>
              <div className="sp-tip__main">
                <div className="sp-tip__title">{t.title}</div>
                <p className="sp-tip__body">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Feeling unwell or need help?">
        <div className="sp-help-row">
          <span className="sp-help-row__icon" aria-hidden="true"><Icon name="heart-pulse" size={18} /></span>
          <div>
            <div className="sp-help-row__title">Reach out any time</div>
            <p className="sp-help-row__body">
              If you feel sick during school, tell your class teacher or visit the school clinic.
              For worries or stress, your school counsellor and teachers are there to help —
              you can also message them from the Communications area.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
