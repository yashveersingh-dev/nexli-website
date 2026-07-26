import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Icon, type IconName } from '@/components/Icon';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentContext } from './useStudentContext';
import { PortalHead } from './PortalShell';
import './studentportal.css';

interface QuickLink {
  icon: IconName;
  title: string;
  desc: string;
  to: string;
}

const QUICK_LINKS: QuickLink[] = [
  { icon: 'message', title: 'Message a teacher', desc: 'Read circulars and reach your teachers in Communications.', to: '/communication' },
  { icon: 'file-text', title: 'Check assignments', desc: 'See homework, due dates and submissions.', to: '/assignments' },
  { icon: 'calendar', title: 'View your timetable', desc: 'Your weekly class schedule.', to: '/timetable' },
  { icon: 'award', title: 'Exam datesheet & results', desc: 'Datesheets and published results.', to: '/examinations' },
  { icon: 'credit-card', title: 'Fee details', desc: 'View dues, receipts and payment history.', to: '/fees' },
  { icon: 'user', title: 'My profile', desc: 'Check your record and contact details.', to: '/profile' },
];

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  { q: 'How do I contact my class teacher?', a: 'Open Communications from the menu. School circulars and teacher messages appear there. For urgent matters, ask at the school office or reception.' },
  { q: 'Where can I see my homework and due dates?', a: 'Go to Assignments. Upcoming and past homework for your class is listed there, with due dates and any feedback.' },
  { q: 'When are my exam results available?', a: 'Results appear under Examinations once your school publishes them. You will only see results that have been officially released.' },
  { q: 'How do I check my attendance?', a: 'Open Attendance to see your day-by-day record and overall percentage.' },
  { q: 'My profile details are wrong — how do I fix them?', a: 'Profile details are maintained by the school. Please contact your school office with the correction and they will update your record.' },
  { q: 'I can\'t see one of my modules. What do I do?', a: 'Some areas are turned on by your school. If you expect to see something that isn\'t there, let your class teacher or the office know.' },
];

/** Read-only student help & support: quick links, FAQs and how to reach the school. */
export function StudentSupportPage() {
  const ctx = useStudentContext();
  const { school } = useSession();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const phone = school?.phone;
  const email = school?.email;

  return (
    <div className="nx-page">
      <PortalHead title="Support" sub="Help, answers and how to reach your school." />

      <div className="sp-stack">
        <Panel title="Quick links">
          <div className="sp-links">
            {QUICK_LINKS.map((l) => (
              <button key={l.to} type="button" className="sp-link" onClick={() => navigate(l.to)}>
                <span className="sp-link__icon" aria-hidden="true"><Icon name={l.icon} size={18} /></span>
                <span className="sp-link__main">
                  <span className="sp-link__title">{l.title}</span>
                  <span className="sp-link__desc">{l.desc}</span>
                </span>
                <span className="sp-link__chev" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Frequently asked questions">
          <ul className="sp-faqs">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <li key={f.q} className={`sp-faq${open ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="sp-faq__q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{f.q}</span>
                    <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} aria-hidden="true" />
                  </button>
                  {open && <p className="sp-faq__a">{f.a}</p>}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Contact your school">
          <div className="sp-contact">
            {school?.name && (
              <div className="sp-contact__row">
                <span className="sp-contact__icon" aria-hidden="true"><Icon name="school" size={16} /></span>
                <span className="sp-contact__val">{school.name}</span>
              </div>
            )}
            {phone ? (
              <a className="sp-contact__row sp-contact__row--link" href={`tel:${phone}`}>
                <span className="sp-contact__icon" aria-hidden="true"><Icon name="phone" size={16} /></span>
                <span className="sp-contact__val">{phone}</span>
              </a>
            ) : null}
            {email ? (
              <a className="sp-contact__row sp-contact__row--link" href={`mailto:${email}`}>
                <span className="sp-contact__icon" aria-hidden="true"><Icon name="mail" size={16} /></span>
                <span className="sp-contact__val">{email}</span>
              </a>
            ) : null}
            {!phone && !email && (
              <p className="sp-muted">
                Contact details aren't listed yet. Please reach your school office in person or check a recent
                circular in Communications.
              </p>
            )}
          </div>
          {ctx.status === 'not_linked' && (
            <p className="sp-muted" style={{ marginTop: 12 }}>
              Your account isn't linked to a student record yet. Ask the school office to link it so all your
              areas show your own information.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
