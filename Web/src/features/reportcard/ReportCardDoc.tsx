import { Icon, type IconName } from '@/components/Icon';
import { RESULT_STATUS_META } from '@/features/examinations/examSchema';
import type { ReportCard, ReportCardGradeBand } from '@/types/reportcard';

interface SchoolLike {
  name?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
}

const REMARK_FIELDS: { key: keyof ReportCard; label: string; icon: IconName }[] = [
  { key: 'overallRemark', label: 'Overall remark', icon: 'file-text' },
  { key: 'classTeacherRemark', label: "Class teacher's remark", icon: 'edit' },
  { key: 'principalRemark', label: "Principal's remark", icon: 'award' },
  { key: 'remarks', label: "Coordinator's remark", icon: 'activity' },
];

/** Title-case a rating enum value ("needs_improvement" → "Needs improvement"). */
const ratingLabel = (r: string) => (r ? r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—');

/** Premium, printable traditional marks Report Card. Add `className="rc-print"` to target print. */
export function ReportCardDoc({
  card,
  school,
  gradeBands,
  className,
}: {
  card: ReportCard;
  school?: SchoolLike | null;
  /** Scheme grade bands for the printed legend (optional). */
  gradeBands?: ReportCardGradeBand[];
  className?: string;
}) {
  const hasMarks = card.subjects.some((s) => s.max > 0 && s.components.some((c) => c.marks != null));
  const remarks = REMARK_FIELDS
    .map((f) => ({ ...f, value: (card[f.key] as string | undefined)?.trim() }))
    .filter((f) => f.value);
  const result = RESULT_STATUS_META[card.result];
  const componentDefs = card.subjects[0]?.components ?? [];
  const sports = (card.sports ?? []).filter((s) => s.activity || s.performance);
  const activities = (card.activities ?? []).filter((a) => a.activity || a.participation);
  const achievements = (card.achievements ?? []).filter(Boolean);

  return (
    <div className={`rc-doc ${className ?? ''}`}>
      <header className="rc-doc__head">
        <div className="rc-doc__brand">
          {school?.logoUrl && (
            <img className="rc-doc__logo" src={school.logoUrl} alt={school?.name ? `${school.name} logo` : 'School logo'} />
          )}
          <div className="rc-doc__brandtext">
            <div className="rc-doc__kicker">Report Card{card.schemeName ? ` · ${card.schemeName}` : ''}</div>
            <div className="rc-doc__school">{school?.name ?? 'Report Card'}</div>
            {(school?.city || school?.state) && (
              <div className="rc-doc__meta">{[school?.city, school?.state].filter(Boolean).join(', ')}</div>
            )}
            {(school?.phone || school?.email || school?.website) && (
              <div className="rc-doc__meta">{[school?.phone, school?.email, school?.website].filter(Boolean).join(' · ')}</div>
            )}
          </div>
        </div>
        <div className="rc-doc__student">
          <div className="rc-doc__name">{card.studentName}</div>
          <div className="rc-doc__meta">{[card.gradeName, card.sectionName].filter(Boolean).join(' · ') || '—'}</div>
          <div className="rc-doc__meta">
            {[card.academicYear, card.termLabel ?? card.term].filter(Boolean).join(' · ')}
            {card.rollNo ? ` · Roll ${card.rollNo}` : ''}
          </div>
        </div>
      </header>

      {/* Subject marks table */}
      <section className="rc-doc__section">
        <h2 className="rc-doc__section-title">Scholastic areas</h2>
        {card.subjects.length === 0 ? (
          <p className="rc-remark" style={{ color: 'var(--text-muted)' }}>
            No subjects configured for this term yet.
          </p>
        ) : !hasMarks ? (
          <p className="rc-remark" style={{ color: 'var(--text-muted)' }}>
            No marks recorded yet. Once exam marks are entered, this card auto-fills and recomputes.
          </p>
        ) : (
          <div className="rc-table-wrap">
            {/* `rc-table--marks` restacks into per-subject cards on phones (≤560px) so
                every column — incl. Subject total + Result — is fully visible with no
                clipping; wider screens + print keep the tabular layout. */}
            <table className="rc-table rc-table--marks">
              <thead>
                <tr>
                  <th>Subject</th>
                  {componentDefs.map((c) => (
                    <th key={c.componentId} className="rc-table__num">{c.label}<br /><small>/{c.max}</small></th>
                  ))}
                  <th className="rc-table__num">Total</th>
                  <th className="rc-table__num">%</th>
                  <th>Grade</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {card.subjects.map((s) => (
                  <tr key={s.subjectName}>
                    <td data-label="Subject">{s.subjectName}</td>
                    {s.components.map((c) => (
                      <td key={c.componentId} data-label={`${c.label} / ${c.max}`} className="rc-table__num">{c.marks == null ? '—' : c.marks}</td>
                    ))}
                    <td data-label="Subject total" className="rc-table__num">{s.total} / {s.max}</td>
                    <td data-label="Percentage" className="rc-table__num">{s.percentage}%</td>
                    <td data-label="Grade" className="rc-table__grade">{s.grade}</td>
                    <td data-label="Result">{s.passed ? 'Pass' : 'Fail'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td data-label="Overall">Total</td>
                  {componentDefs.map((c) => <td key={c.componentId} />)}
                  <td data-label="Grand total" className="rc-table__num">{card.totals.obtained} / {card.totals.max}</td>
                  <td data-label="Percentage" className="rc-table__num">{card.totals.percentage}%</td>
                  <td className="rc-table__grade" />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Result / rank / attendance summary */}
      <section className="rc-doc__section">
        <h2 className="rc-doc__section-title">Summary</h2>
        <div className="rc-summary">
          {/* Marks-derived stats are shown only when marks exist, so an unmarked
              card never prints a misleading 0% / "Fail" (parity with the hub,
              generate preview and family list, which all gate on totals.max > 0). */}
          {card.totals.max > 0 && (
            <div className="rc-stat">
              <div className="rc-stat__label">Percentage</div>
              <div className="rc-stat__value">{card.totals.percentage}%</div>
            </div>
          )}
          {card.totals.cgpa != null && (
            <div className="rc-stat">
              <div className="rc-stat__label">CGPA</div>
              <div className="rc-stat__value">{card.totals.cgpa}</div>
            </div>
          )}
          {card.totals.max > 0 && (
            <div className="rc-stat">
              <div className="rc-stat__label">Result</div>
              <div className="rc-stat__value" style={{ color: 'var(--gold)' }}>{result.label}</div>
            </div>
          )}
          {card.rank != null && (
            <div className="rc-stat">
              <div className="rc-stat__label">Class rank</div>
              <div className="rc-stat__value">{card.rank}{card.classSize ? ` / ${card.classSize}` : ''}</div>
            </div>
          )}
          {card.attendance && (
            <div className="rc-stat">
              <div className="rc-stat__label">Attendance</div>
              <div className="rc-stat__value">{card.attendance.pct}%</div>
            </div>
          )}
          {card.promotedTo && (
            <div className="rc-stat">
              <div className="rc-stat__label">Promoted to</div>
              <div className="rc-stat__value">{card.promotedTo}</div>
            </div>
          )}
        </div>
      </section>

      {/* Co-scholastic */}
      {card.coScholastic && card.coScholastic.some((c) => c.grade) && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Co-scholastic areas</h2>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead><tr><th>Area</th><th>Grade</th></tr></thead>
              <tbody>
                {card.coScholastic.filter((c) => c.grade).map((c) => (
                  <tr key={c.area}><td>{c.area}</td><td className="rc-table__grade">{c.grade}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sports & games */}
      {sports.length > 0 && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Sports &amp; games</h2>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead><tr><th>Activity</th><th>Performance</th><th>Remark</th></tr></thead>
              <tbody>
                {sports.map((s, i) => (
                  <tr key={`${s.activity}-${i}`}>
                    <td>{s.activity || '—'}</td>
                    <td className="rc-table__grade">{ratingLabel(s.performance)}</td>
                    <td>{s.remarks ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Activities & clubs */}
      {activities.length > 0 && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Activities &amp; clubs</h2>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead><tr><th>Activity</th><th>Participation</th><th>Remark</th></tr></thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={`${a.activity}-${i}`}>
                    <td>{a.activity || '—'}</td>
                    <td className="rc-table__grade">{ratingLabel(a.participation)}</td>
                    <td>{a.remarks ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Achievements</h2>
          <ul className="rc-doc__achievements">
            {achievements.map((a, i) => <li key={`${a}-${i}`}>{a}</li>)}
          </ul>
        </section>
      )}

      {/* Health */}
      {card.health && (card.health.heightCm != null || card.health.weightKg != null) && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Health</h2>
          <div className="rc-summary">
            {card.health.heightCm != null && (
              <div className="rc-stat"><div className="rc-stat__label">Height</div><div className="rc-stat__value">{card.health.heightCm} cm</div></div>
            )}
            {card.health.weightKg != null && (
              <div className="rc-stat"><div className="rc-stat__label">Weight</div><div className="rc-stat__value">{card.health.weightKg} kg</div></div>
            )}
          </div>
        </section>
      )}

      {/* Remarks */}
      {remarks.length > 0 && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Remarks</h2>
          <div className="rc-remarks">
            {remarks.map((f) => (
              <div className="rc-remark-card" key={String(f.key)}>
                <div className="rc-remark-card__label"><Icon name={f.icon} size={13} /> {f.label}</div>
                <p className="rc-remark">{f.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grade legend */}
      {gradeBands && gradeBands.length > 0 && (
        <section className="rc-doc__section">
          <h2 className="rc-doc__section-title">Grade legend</h2>
          <div className="rc-legend">
            {gradeBands.map((b) => (
              <span className="rc-legend__item" key={b.grade}>
                <b>{b.grade}</b> {b.minPct}–{b.maxPct}%{b.point != null ? ` · ${b.point}` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      {card.approvalStatus === 'approved' && (card.approvedByName || card.approvedAt) && (
        <div className="rc-doc__approval" role="note">
          <Icon name="check-circle" size={15} />
          <span>
            Approved{card.approvedByName ? ` by ${card.approvedByName}` : ''}
            {card.approvedAt ? ` on ${new Date(card.approvedAt).toLocaleDateString()}` : ''}
          </span>
        </div>
      )}

      <div className="rc-doc__sign">
        <span className="rc-doc__sign-line">Class teacher{card.submittedByName ? ` · ${card.submittedByName}` : ''}</span>
        <span className="rc-doc__sign-line">Principal{card.approvedByName ? ` · ${card.approvedByName}` : ''}</span>
        <span className="rc-doc__sign-line">Parent / Guardian</span>
      </div>
    </div>
  );
}
