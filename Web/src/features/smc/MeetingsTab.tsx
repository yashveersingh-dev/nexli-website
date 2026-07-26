import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useSmcMeetings } from '@/features/compliance/data';
import { SMC_MEETING_STATUS_META } from '@/features/compliance/meta';
import type { SmcMeeting } from '@/types/compliance';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MeetingRow({ m, onOpen }: { m: SmcMeeting; onOpen: () => void }) {
  const d = new Date(m.date);
  const status = SMC_MEETING_STATUS_META[m.status];
  return (
    <button type="button" className="smc-meeting" onClick={onOpen}>
      <div className={`smc-meeting__date ${m.status === 'cancelled' ? 'is-cancelled' : ''}`}>
        <div className="smc-meeting__day">{d.getDate()}</div>
        <div className="smc-meeting__mon">{MON[d.getMonth()]}</div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="smc-meeting__title">{m.title}</div>
        <div className="smc-meeting__meta">
          {formatDate(m.date)}{m.venue ? ` · ${m.venue}` : ''}
          {m.attendees?.length ? ` · ${m.attendees.length} attended` : ''}
        </div>
      </div>
      <Badge variant={status.variant}>{status.label}</Badge>
      <Icon name="edit" size={15} className="smc-meeting__chev" />
    </button>
  );
}

export function MeetingsTab() {
  const navigate = useNavigate();
  const { schoolId, can } = useSession();
  const canWrite = can('compliance.write');
  const { data: meetings, loading, error } = useSmcMeetings(schoolId);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: SmcMeeting[] = [];
    const pa: SmcMeeting[] = [];
    for (const m of meetings) {
      if (m.status !== 'cancelled' && m.date >= now - 86400000) up.push(m);
      else pa.push(m);
    }
    up.sort((a, b) => a.date - b.date);
    pa.sort((a, b) => b.date - a.date);
    return { upcoming: up, past: pa };
  }, [meetings]);

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 180 }}>
          Schedule meetings, record minutes &amp; decisions, and track attendance.
        </p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/smc/meetings/new')}>Schedule meeting</Button>}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : error ? (
        <Panel><EmptyState icon="info" title="Could not load meetings" message="Please try again." /></Panel>
      ) : meetings.length === 0 ? (
        <Panel>
          <EmptyState
            icon="calendar"
            title="No meetings yet"
            message={canWrite ? 'Schedule the first committee meeting to start recording minutes.' : 'SMC meetings will appear here.'}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/smc/meetings/new')}>Schedule meeting</Button> : undefined}
          />
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {upcoming.length > 0 && (
            <section aria-label="Upcoming meetings">
              <h3 className="smc-section-title"><Icon name="calendar" size={14} /> Upcoming</h3>
              <div className="smc-meeting-list">
                {upcoming.map((m) => <MeetingRow key={m.id} m={m} onOpen={() => navigate(`/smc/meetings/${m.id}`)} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section aria-label="Past meetings">
              <h3 className="smc-section-title"><Icon name="check-circle" size={14} /> Past &amp; cancelled</h3>
              <div className="smc-meeting-list">
                {past.map((m) => <MeetingRow key={m.id} m={m} onOpen={() => navigate(`/smc/meetings/${m.id}`)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
