import { Icon, type IconName } from '@/components/Icon';
import { RadarChart, type RadarAxis } from '@/features/analytics/RadarChart';
import { HPC_RATING_DESCRIPTORS } from '@/features/analytics/meta';
import { TERM_LABEL } from './hpcSchema';
import type { HpcCard } from '@/types/special';

interface SchoolLike {
  name?: string;
  addressLine?: string;
  city?: string;
  state?: string;
}

const REMARK_FIELDS: { key: keyof HpcCard; label: string; icon: IconName }[] = [
  { key: 'strengths', label: 'Strengths', icon: 'sparkles' },
  { key: 'areasToImprove', label: 'Areas to improve', icon: 'trophy' },
  { key: 'teacherRemark', label: "Teacher's remark", icon: 'user' },
  { key: 'selfReflection', label: 'Self reflection', icon: 'edit' },
  { key: 'peerFeedback', label: 'Peer feedback', icon: 'users' },
];

function ratingLabel(rating: number): string {
  return HPC_RATING_DESCRIPTORS[Math.max(1, Math.min(5, Math.round(rating)))] ?? '';
}

/** Premium, printable NEP Holistic Progress Card. Add `className="hpc-print"` to target print. */
export function HpcCardDoc({ card, school, className }: { card: HpcCard; school?: SchoolLike | null; className?: string }) {
  const axes: RadarAxis[] = card.domains.map((d) => ({ label: d.domain, value: d.rating }));
  const radarSummary = card.domains.map((d) => `${d.domain}: ${d.rating} of 5 (${ratingLabel(d.rating)})`).join('; ');
  const remarks = REMARK_FIELDS.map((f) => ({ ...f, value: (card[f.key] as string | undefined)?.trim() })).filter((f) => f.value);

  return (
    <div className={`hpc-doc ${className ?? ''}`}>
      <header className="hpc-doc__head">
        <div className="hpc-doc__brand">
          <div className="hpc-doc__kicker">Holistic Progress Card · NEP 2020</div>
          <div className="hpc-doc__school">{school?.name ?? 'Holistic Progress Card'}</div>
          {(school?.addressLine || school?.city) && (
            <div className="hpc-doc__meta">{[school?.addressLine, school?.city, school?.state].filter(Boolean).join(', ')}</div>
          )}
        </div>
        <div className="hpc-doc__student">
          <div className="hpc-doc__name">{card.studentName}</div>
          <div className="hpc-doc__meta">{[card.gradeName, card.sectionName].filter(Boolean).join(' · ') || '—'}</div>
          <div className="hpc-doc__meta">{[card.academicYear, TERM_LABEL[card.term]].filter(Boolean).join(' · ')}</div>
        </div>
      </header>

      {/* Holistic domains: radar + per-domain rating dots */}
      <section className="hpc-doc__section">
        <h2 className="hpc-doc__section-title">Holistic development</h2>
        {card.domains.length === 0 ? (
          <p className="hpc-remark" style={{ color: 'var(--text-muted)' }}>No domains rated.</p>
        ) : (
          <div className="hpc-doc__holistic">
            <div className="an-hpc__radar">
              <RadarChart axes={axes} max={5} size={240} />
              <span className="nx-sr-only">{radarSummary}</span>
            </div>
            <ul className="an-domain-list" aria-label="Domain ratings">
              {card.domains.map((d) => (
                <li className="an-domain" key={d.domain}>
                  <span>
                    {d.domain}
                    <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: 12 }}>{d.descriptor ?? ratingLabel(d.rating)}</span>
                  </span>
                  <span className="an-domain__dots" role="img" aria-label={`${d.domain}: ${d.rating} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`an-domain__dot ${n <= Math.round(d.rating) ? 'is-on' : ''}`} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Scholastic */}
      {card.scholastic.length > 0 && (
        <section className="hpc-doc__section">
          <h2 className="hpc-doc__section-title">Scholastic areas</h2>
          <div className="hpc-table-wrap">
            <table className="hpc-table">
              <thead>
                <tr><th>Subject</th><th>Grade</th><th>Remark</th></tr>
              </thead>
              <tbody>
                {card.scholastic.map((s, i) => (
                  <tr key={`${s.subject}-${i}`}>
                    <td>{s.subject}</td>
                    <td className="hpc-table__grade">{s.grade || '—'}</td>
                    <td className="hpc-table__remark">{s.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Co-scholastic */}
      {card.coScholastic && card.coScholastic.length > 0 && (
        <section className="hpc-doc__section">
          <h2 className="hpc-doc__section-title">Co-scholastic areas</h2>
          <div className="hpc-table-wrap">
            <table className="hpc-table">
              <thead>
                <tr><th>Activity</th><th>Grade</th><th>Remark</th></tr>
              </thead>
              <tbody>
                {card.coScholastic.map((s, i) => (
                  <tr key={`${s.subject}-${i}`}>
                    <td>{s.subject}</td>
                    <td className="hpc-table__grade">{s.grade || '—'}</td>
                    <td className="hpc-table__remark">{s.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Attendance */}
      {card.attendancePct != null && (
        <section className="hpc-doc__section">
          <h2 className="hpc-doc__section-title">Attendance</h2>
          <div className="hpc-doc__attendance">
            <b>{card.attendancePct}%</b>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>of working days attended this term</span>
          </div>
        </section>
      )}

      {/* Remark prose */}
      {remarks.length > 0 && (
        <section className="hpc-doc__section">
          <h2 className="hpc-doc__section-title">Narrative &amp; reflections</h2>
          <div className="hpc-remarks">
            {remarks.map((f) => (
              <div className="hpc-remark-card" key={String(f.key)}>
                <div className="hpc-remark-card__label"><Icon name={f.icon} size={13} /> {f.label}</div>
                <p className="hpc-remark">{f.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {card.approvalStatus === 'approved' && (card.approvedByName || card.approvedAt) && (
        <div className="hpc-doc__approval" role="note">
          <Icon name="shield-check" size={15} />
          <span>
            Approved{card.approvedByName ? ` by ${card.approvedByName}` : ''}
            {card.approvedAt ? ` on ${new Date(card.approvedAt).toLocaleDateString()}` : ''}
          </span>
        </div>
      )}

      <div className="hpc-doc__sign">
        <span className="hpc-doc__sign-line">Class teacher{card.submittedByName ? ` · ${card.submittedByName}` : ''}</span>
        <span className="hpc-doc__sign-line">Principal{card.approvedByName ? ` · ${card.approvedByName}` : ''}</span>
        <span className="hpc-doc__sign-line">Parent / Guardian</span>
      </div>
    </div>
  );
}
