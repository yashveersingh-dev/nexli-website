import { useMemo } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatNumber } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useStaff, useGrades, useUdiseProfile } from './data';
import {
  buildEnrolmentReport, reportToCsv, reportFileName,
  GENDERS, GENDER_LABEL, GENDER_SHORT, CATEGORY_BUCKETS, CATEGORY_LABEL,
  INFRA_COUNT_META, FACILITY_META,
} from './meta';

/** Live UDISE enrolment report, aggregated from the school's own SIS rosters. */
export function ReportTab() {
  const toast = useToast();
  const { schoolId, school } = useSession();
  const { data: students, loading: ls, error: es } = useStudents(schoolId);
  const { data: staff, loading: lt, error: et } = useStaff(schoolId);
  const { data: grades, loading: lg, error: eg } = useGrades(schoolId);
  // Infrastructure figures come from the manually-maintained UDISE+ profile doc
  // (not aggregated from SIS); shown read-only alongside the live enrolment.
  const { data: profile } = useUdiseProfile(schoolId);

  const loading = ls || lt || lg;
  const error = es || et || eg;

  const report = useMemo(
    () => buildEnrolmentReport(students, staff, grades),
    [students, staff, grades],
  );

  const exportCsv = () => {
    try {
      const asOf = Date.now();
      const csv = reportToCsv(report, { schoolName: school?.name, asOf, profile: profile ?? undefined });
      // Prepend a BOM so Excel reads UTF-8 correctly.
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportFileName(asOf);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Report exported', 'CSV downloaded to your device.');
    } catch {
      toast.error('Could not export', 'Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height={92} />
        <Skeleton height={240} />
        <Skeleton height={180} />
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState icon="alert-triangle" title="Could not load enrolment data" message="We could not reach the student records. Please try again." />
      </Panel>
    );
  }

  if (report.totalStudents === 0) {
    return (
      <Panel>
        <EmptyState icon="users" title="No enrolled students yet" message="Once active students are admitted, their enrolment will be summarised here for UDISE+ reporting." />
      </Panel>
    );
  }

  return (
    <div className="udise-report">
      {/* Action bar — hidden from print */}
      <div className="nx-toolbar udise-noprint" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 180 }}>
          Live figures aggregated from your active student and staff records — nothing is entered manually.
        </p>
        <Button variant="subtle" leftIcon="bar-chart" onClick={() => window.print()}>Print</Button>
        <Button variant="gold" leftIcon="download" onClick={exportCsv}>Export CSV</Button>
      </div>

      {/* Headline KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KPICard icon="users" label="Total enrolment" count={report.totalStudents} format="us" sub={`${formatNumber(report.byGenderTotal.male)} boys · ${formatNumber(report.byGenderTotal.female)} girls`} />
        <KPICard icon="check-circle" label="RTE-quota students" count={report.rteCount} format="us" sub={report.totalStudents ? `${((report.rteCount / report.totalStudents) * 100).toFixed(1)}% of enrolment` : undefined} />
        <KPICard icon="user" label="Teachers" count={report.teacherCount} format="us" sub={`${formatNumber(report.nonTeacherCount)} non-teaching`} />
        <KPICard
          icon="bar-chart"
          label="Pupil-teacher ratio"
          value={report.ptr != null ? `${report.ptr.toFixed(1)}:1` : '—'}
          sub={report.ptr == null ? 'Add teaching staff to compute' : `${formatNumber(report.staffTotal)} staff total`}
          subColor={report.ptr != null && report.ptr > 30 ? 'var(--warning)' : undefined}
        />
      </div>

      <div className="udise-stack">
        {/* Enrolment by grade x gender matrix */}
        <Panel title="Enrolment by grade & gender" sub="Active students" bodyClassName="udise-panel__body">
          <div className="udise-table-wrap" role="region" aria-label="Enrolment by grade and gender" tabIndex={0}>
            <table className="udise-matrix">
              <thead>
                <tr>
                  <th scope="col">Grade</th>
                  {GENDERS.map((g) => (
                    <th key={g} scope="col" className="udise-matrix__num">
                      <span className="udise-matrix__th-full">{GENDER_LABEL[g]}</span>
                      <span className="udise-matrix__th-short" aria-hidden="true">{GENDER_SHORT[g]}</span>
                    </th>
                  ))}
                  <th scope="col" className="udise-matrix__num">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.gradeRows.map((r) => (
                  <tr key={r.gradeId}>
                    <th scope="row" className="udise-matrix__grade">{r.gradeName}</th>
                    {GENDERS.map((g) => (
                      <td key={g} className="udise-matrix__num">{formatNumber(r.byGender[g])}</td>
                    ))}
                    <td className="udise-matrix__num udise-matrix__total">{formatNumber(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {GENDERS.map((g) => (
                    <td key={g} className="udise-matrix__num">{formatNumber(report.byGenderTotal[g])}</td>
                  ))}
                  <td className="udise-matrix__num udise-matrix__total">{formatNumber(report.totalStudents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* By social category */}
        <Panel title="Enrolment by social category" sub="Per Student record" bodyClassName="udise-panel__body">
          <div className="cmp-udise-grid">
            {CATEGORY_BUCKETS.map((b) => (
              <div key={b} className="cmp-stat">
                <div className="cmp-stat__label">{CATEGORY_LABEL[b]}</div>
                <div className="cmp-stat__value">{formatNumber(report.byCategory[b])}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Staff summary */}
        <Panel title="Staff & ratio" bodyClassName="udise-panel__body">
          <div className="cmp-udise-grid">
            <div className="cmp-stat">
              <div className="cmp-stat__label">Teachers</div>
              <div className="cmp-stat__value">{formatNumber(report.teacherCount)}</div>
            </div>
            <div className="cmp-stat">
              <div className="cmp-stat__label">Non-teaching staff</div>
              <div className="cmp-stat__value">{formatNumber(report.nonTeacherCount)}</div>
            </div>
            <div className="cmp-stat">
              <div className="cmp-stat__label">Total staff</div>
              <div className="cmp-stat__value">{formatNumber(report.staffTotal)}</div>
            </div>
            <div className="cmp-stat">
              <div className="cmp-stat__label">Pupil-teacher ratio</div>
              <div className="cmp-stat__value">{report.ptr != null ? `${report.ptr.toFixed(1)}:1` : '—'}</div>
            </div>
          </div>
        </Panel>

        {/* Infrastructure — from the UDISE+ profile (counts + facility flags). */}
        <Panel title="Infrastructure" sub="From UDISE+ profile" bodyClassName="udise-panel__body">
          <div className="cmp-udise-grid">
            <div className="cmp-stat">
              <div className="cmp-stat__label">Classrooms</div>
              <div className="cmp-stat__value">{profile?.classrooms != null ? formatNumber(profile.classrooms) : '—'}</div>
            </div>
            <div className="cmp-stat">
              <div className="cmp-stat__label">Functional toilets</div>
              <div className="cmp-stat__value">{profile?.functionalToilets != null ? formatNumber(profile.functionalToilets) : '—'}</div>
            </div>
            {INFRA_COUNT_META.map((c) => (
              <div key={c.key} className="cmp-stat">
                <div className="cmp-stat__label">{c.label}</div>
                <div className="cmp-stat__value">{profile?.[c.key] != null ? formatNumber(profile[c.key] as number) : '—'}</div>
              </div>
            ))}
          </div>
          <div className="udise-fac-grid" style={{ marginTop: 14 }} role="group" aria-label="Facilities available">
            {FACILITY_META.map((f) => {
              const on = profile?.[f.key] === true;
              return (
                <div key={f.key} className="udise-fac">
                  <span className="udise-fac__icon"><Icon name={on ? 'check-circle' : 'x'} size={16} /></span>
                  <span style={{ color: on ? 'var(--text)' : 'var(--text-muted)' }}>{f.label}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
