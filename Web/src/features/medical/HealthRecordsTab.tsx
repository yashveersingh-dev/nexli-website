import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useMedicalRecords } from '@/features/ops/data';
import { HealthRecordDetail } from './HealthRecordDetail';
import type { MedicalRecord } from '@/types/ops';

export function HealthRecordsTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useOwnership('medical').canOperate;
  const { data: records, loading, error } = useMedicalRecords(schoolId);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<MedicalRecord | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...records]
      .filter((r) => (needle ? [r.studentName, r.gradeName, ...(r.conditions ?? []), ...(r.allergies ?? [])].some((x) => x?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [records, q]);

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <div className="nx-toolbar__search">
          <Input
            leftIcon="search"
            placeholder="Search student, condition or allergy…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search health records"
          />
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/medical/records/new')}>
            New record
          </Button>
        )}
      </div>

      {error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load records" message="Please try again." /></Panel>
      ) : loading ? (
        <div className="grid g-2"><Skeleton height={120} /><Skeleton height={120} /></div>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon="file-text"
            title={q ? 'No matching records' : 'No health records yet'}
            message={q ? 'Try a different search.' : canWrite ? 'Create a record to build a student health profile.' : 'Student health profiles will appear here.'}
          />
        </Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((r) => {
            const hasAlerts = (r.allergies?.length ?? 0) > 0 || (r.conditions?.length ?? 0) > 0;
            return (
              <button
                type="button"
                key={r.id}
                className="med-card"
                onClick={() => setOpen(r)}
                aria-label={`Open health record for ${r.studentName}`}
              >
                <div className="med-card__head">
                  <span className="med-row__avatar" aria-hidden="true">{r.studentName.slice(0, 1).toUpperCase()}</span>
                  <div className="med-card__head-text">
                    <span className="med-card__title">{r.studentName}</span>
                    <span className="med-card__sub">{r.gradeName ?? 'No class'}{r.bloodGroup ? ` · ${r.bloodGroup}` : ''}</span>
                  </div>
                  <Icon name="chevron-right" size={16} className="med-card__chev" />
                </div>
                <div className="med-card__tags">
                  {r.allergies?.slice(0, 3).map((a) => (
                    <Badge key={`a-${a}`} variant="danger">{a}</Badge>
                  ))}
                  {r.conditions?.slice(0, 2).map((c) => (
                    <Badge key={`c-${c}`} variant="warning">{c}</Badge>
                  ))}
                  {r.healthPlan && <Badge variant="info">IHP</Badge>}
                  {!hasAlerts && !r.healthPlan && <span className="med-card__none">No active alerts</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="med-note">
        <Icon name="lock" size={13} /> Confidential — clinic staff only.
      </p>

      <HealthRecordDetail
        record={open}
        onClose={() => setOpen(null)}
        onEdit={(r) => navigate(`/medical/records/${r.id}/edit`)}
        canWrite={canWrite}
      />
    </div>
  );
}
