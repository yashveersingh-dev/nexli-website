import { useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { formatDate } from '@/lib/format';
import { useImmunizations } from '@/features/ops/data';
import { useSession } from '@/app/providers/SessionProvider';
import { immunizationStatus, IMMUNIZATION_STATUS_META } from './meta';
import type { MedicalRecord } from '@/types/ops';

function ChipRow({ icon, label, items, tone }: { icon: 'alert-triangle' | 'heart-pulse' | 'file-text'; label: string; items?: string[]; tone?: 'danger' }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="med-detail__chips">
      <div className="med-detail__chips-head">
        <Icon name={icon} size={13} />
        <span>{label}</span>
      </div>
      <div className="med-chips med-chips--static" data-tone={tone}>
        {items.map((x) => (
          <span className="med-chip med-chip--static" key={x}>{x}</span>
        ))}
      </div>
    </div>
  );
}

/** 360-style read-only detail panel for a student's health record. */
export function HealthRecordDetail({
  record,
  onClose,
  onEdit,
  canWrite,
}: {
  record: MedicalRecord | null;
  onClose: () => void;
  onEdit: (r: MedicalRecord) => void;
  canWrite: boolean;
}) {
  const { schoolId } = useSession();
  const { data: shots } = useImmunizations(schoolId, record?.studentId);

  const bmi = useMemo(() => {
    if (!record?.heightCm || !record?.weightKg) return null;
    const m = record.heightCm / 100;
    return (record.weightKg / (m * m)).toFixed(1);
  }, [record]);

  const shotsForStudent = useMemo(
    () => [...shots].sort((a, b) => (b.givenDate ?? 0) - (a.givenDate ?? 0)),
    [shots],
  );

  return (
    <Modal
      open={!!record}
      onClose={onClose}
      icon="heart-pulse"
      tone="gold"
      size="lg"
      title={record?.studentName ?? 'Health record'}
      description={record?.gradeName ? `${record.gradeName} · Confidential health file` : 'Confidential health file'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {record && canWrite && (
            <Button variant="gold" leftIcon="edit" onClick={() => onEdit(record)}>Edit record</Button>
          )}
        </>
      }
    >
      {record && (
        <div className="med-detail">
          <div className="med-detail__vitals">
            <div className="med-vital">
              <span className="med-vital__k">Blood group</span>
              <span className="med-vital__v">{record.bloodGroup || '—'}</span>
            </div>
            <div className="med-vital">
              <span className="med-vital__k">Height</span>
              <span className="med-vital__v">{record.heightCm ? `${record.heightCm} cm` : '—'}</span>
            </div>
            <div className="med-vital">
              <span className="med-vital__k">Weight</span>
              <span className="med-vital__v">{record.weightKg ? `${record.weightKg} kg` : '—'}</span>
            </div>
            <div className="med-vital">
              <span className="med-vital__k">BMI</span>
              <span className="med-vital__v">{bmi ?? '—'}</span>
            </div>
          </div>

          <ChipRow icon="alert-triangle" label="Allergies" items={record.allergies} tone="danger" />
          <ChipRow icon="heart-pulse" label="Chronic conditions" items={record.conditions} />
          <ChipRow icon="file-text" label="Regular medications" items={record.medications} />

          {(record.emergencyContactName || record.emergencyContactPhone || record.doctorName || record.insuranceNo) && (
            <div className="med-detail__kv">
              {record.emergencyContactName && (
                <div className="nx-kv"><span className="nx-kv__k">Emergency contact</span><span className="nx-kv__v">{record.emergencyContactName}</span></div>
              )}
              {record.emergencyContactPhone && (
                <div className="nx-kv"><span className="nx-kv__k">Emergency mobile</span><span className="nx-kv__v">{record.emergencyContactPhone}</span></div>
              )}
              {record.doctorName && (
                <div className="nx-kv"><span className="nx-kv__k">Family doctor</span><span className="nx-kv__v">{record.doctorName}</span></div>
              )}
              {record.insuranceNo && (
                <div className="nx-kv"><span className="nx-kv__k">Insurance no.</span><span className="nx-kv__v">{record.insuranceNo}</span></div>
              )}
            </div>
          )}

          {record.healthPlan && (
            <div className="med-detail__block">
              <div className="med-detail__block-head"><Icon name="shield-check" size={14} /> Individual Health Plan</div>
              <p className="med-detail__text">{record.healthPlan}</p>
            </div>
          )}

          {record.notes && (
            <div className="med-detail__block">
              <div className="med-detail__block-head"><Icon name="file-text" size={14} /> Notes</div>
              <p className="med-detail__text">{record.notes}</p>
            </div>
          )}

          {shotsForStudent.length > 0 && (
            <div className="med-detail__block">
              <div className="med-detail__block-head"><Icon name="shield" size={14} /> Immunizations</div>
              <div className="med-detail__shots">
                {shotsForStudent.map((s) => {
                  const status = immunizationStatus(s.nextDueDate);
                  const meta = IMMUNIZATION_STATUS_META[status];
                  return (
                    <div className="med-shot" key={s.id}>
                      <span className="med-shot__name">{s.vaccine}{s.doseLabel ? ` · ${s.doseLabel}` : ''}</span>
                      <span className="med-shot__meta">
                        {s.givenDate ? formatDate(s.givenDate) : '—'}
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="med-note med-note--flush">
            <Icon name="lock" size={13} /> Confidential — clinic staff only.
          </p>
        </div>
      )}
    </Modal>
  );
}
