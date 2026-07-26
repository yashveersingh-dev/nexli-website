import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useTimetable } from '@/features/school/data';
import { useBellSchedule } from '@/features/academics/bellSchedule';
import { WEEKDAYS, type Weekday, type TimetableSlot } from '@/types/academics';
import { useStudentContext } from './useStudentContext';
import { PortalPage } from './PortalShell';
import './studentportal.css';

/** Today's weekday id (mon..sat); falls back to Monday on Sundays. */
function todayWeekday(): Weekday {
  const map: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Weekday[];
  const id = map[new Date().getDay()] as Weekday;
  return WEEKDAYS.some((d) => d.id === id) ? id : 'mon';
}

/** Read-only weekly class timetable for the student's own section. */
export function StudentTimetablePage() {
  const ctx = useStudentContext();
  const sectionLabel = [ctx.student?.gradeName ?? ctx.grade?.name, ctx.student?.sectionName ?? ctx.section?.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <PortalPage
      ctx={ctx}
      title="Timetable"
      icon="calendar"
      sub="Your weekly class schedule."
      headerRight={sectionLabel ? <Badge variant="muted">{sectionLabel}</Badge> : undefined}
    >
      {ctx.status === 'ready' && <TimetableBody sectionId={ctx.student?.sectionId} />}
    </PortalPage>
  );
}

function TimetableBody({ sectionId }: { sectionId?: string }) {
  const { schoolId } = useSession();
  const { data: slots, loading } = useTimetable(schoolId, sectionId);
  const { periods } = useBellSchedule(schoolId);
  const [activeDay, setActiveDay] = useState<Weekday>(todayWeekday());

  // Index slots by `${day}_${periodNo}` for O(1) cell lookup.
  const byKey = useMemo(() => {
    const m = new Map<string, TimetableSlot>();
    for (const s of slots) m.set(`${s.day}_${s.periodNo}`, s);
    return m;
  }, [slots]);

  const getSlot = (day: Weekday, periodNo: number) => byKey.get(`${day}_${periodNo}`);
  const hasAny = slots.length > 0;
  const today = todayWeekday();

  if (!sectionId) {
    return (
      <Panel>
        <EmptyState
          icon="calendar"
          title="No class assigned yet"
          message="Your timetable will appear here once your school assigns you to a class section."
        />
      </Panel>
    );
  }

  if (!loading && !hasAny) {
    return (
      <Panel>
        <EmptyState
          icon="calendar"
          title="Timetable not published"
          message="Your school hasn't published a timetable for your class yet. Check back soon."
        />
      </Panel>
    );
  }

  return (
    <Panel>
      {/* Desktop / tablet grid */}
      <div className="sp-tt-grid" role="region" aria-label="Weekly timetable">
        <table>
          <thead>
            <tr>
              <th aria-label="Period" />
              {WEEKDAYS.map((d) => (
                <th key={d.id} scope="col" className={d.id === today ? 'is-today' : undefined}>
                  {d.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={`${p.no}-${p.label}-${p.startTime}`}>
                <td className="sp-tt-grid__period" scope="row">
                  <div className="sp-tt-grid__plabel">{p.label}</div>
                  <div className="sp-tt-grid__ptime">{p.startTime}–{p.endTime}</div>
                </td>
                {p.isBreak ? (
                  <td colSpan={WEEKDAYS.length}>
                    <div className="sp-tt-break">{p.label}</div>
                  </td>
                ) : (
                  WEEKDAYS.map((d) => {
                    const slot = getSlot(d.id, p.no);
                    const filled = !!(slot && (slot.subjectName || slot.teacherName || slot.roomName));
                    return (
                      <td key={d.id} className={d.id === today ? 'is-today' : undefined}>
                        {filled ? (
                          <div className="sp-tt-cell">
                            <span className="sp-tt-cell__subject">{slot?.subjectName ?? 'Class'}</span>
                            <span className="sp-tt-cell__meta">
                              {[slot?.teacherName, slot?.roomName].filter(Boolean).join(' · ') || ' '}
                            </span>
                          </div>
                        ) : (
                          <div className="sp-tt-cell sp-tt-cell--free">Free</div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile per-day list */}
      <div className="sp-tt-daylist">
        <div className="sp-day-tabs" role="tablist" aria-label="Day of week">
          {WEEKDAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={activeDay === d.id}
              className={`sp-day-tab${activeDay === d.id ? ' is-active' : ''}`}
              onClick={() => setActiveDay(d.id)}
            >
              {d.short}
            </button>
          ))}
        </div>
        <div className="sp-period-list">
          {periods.map((p) => {
            if (p.isBreak) {
              return (
                <div key={`${p.no}-${p.label}-${p.startTime}`} className="sp-period-card sp-period-card--break">
                  <div className="sp-period-card__no">
                    <span className="sp-period-card__time">{p.startTime}</span>
                  </div>
                  <div className="sp-period-card__body">
                    <span className="sp-period-card__subject">{p.label}</span>
                  </div>
                </div>
              );
            }
            const slot = getSlot(activeDay, p.no);
            const filled = !!(slot && (slot.subjectName || slot.teacherName || slot.roomName));
            return (
              <div key={`${p.no}-${p.label}-${p.startTime}`} className="sp-period-card">
                <div className="sp-period-card__no">
                  <span className="sp-period-card__pno">P{p.no}</span>
                  <span className="sp-period-card__time">{p.startTime}</span>
                </div>
                <div className="sp-period-card__body">
                  {filled ? (
                    <>
                      <span className="sp-period-card__subject">{slot?.subjectName ?? 'Class'}</span>
                      <span className="sp-period-card__meta">
                        {[slot?.teacherName, slot?.roomName].filter(Boolean).join(' · ') || 'Class'}
                      </span>
                    </>
                  ) : (
                    <span className="sp-period-card__free">Free period</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="sp-footnote">
        <Icon name="info" size={13} aria-hidden="true" />
        Timetable can change for events or substitutions. Your school will notify you of any changes.
      </p>
    </Panel>
  );
}
