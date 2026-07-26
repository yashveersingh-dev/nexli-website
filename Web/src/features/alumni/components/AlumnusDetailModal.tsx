import { Modal } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import type { Alumnus } from '@/types/community';
import { locationLine, roleLine } from '../meta';

interface Props {
  alumnus: Alumnus | null;
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  onEdit: (id: string) => void;
  onDelete: (a: Alumnus) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'contents' }}>
      <span className="al-kv__k">{label}</span>
      <span className="al-kv__v">{children}</span>
    </div>
  );
}

/** Read-only profile preview for an alumnus, with edit/delete affordances. */
export function AlumnusDetailModal({ alumnus, open, onClose, canWrite, onEdit, onDelete }: Props) {
  if (!alumnus) return null;
  const a = alumnus;
  const role = roleLine(a);
  const loc = locationLine(a);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {a.name}
          {a.verified && <Icon name="check-circle" size={15} style={{ color: 'var(--gold)' }} />}
        </span>
      }
      description={[a.batchYear ? `Batch of ${a.batchYear}` : null, role].filter(Boolean).join(' · ') || undefined}
      footer={
        canWrite ? (
          <>
            <Button type="button" variant="ghost" leftIcon="edit" onClick={() => onEdit(a.id)}>
              Edit
            </Button>
            <Button type="button" variant="danger" leftIcon="minus-circle" onClick={() => onDelete(a)}>
              Remove
            </Button>
          </>
        ) : (
          <Button type="button" variant="subtle" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <Avatar name={a.name} src={a.photoUrl} size={56} />
        <div style={{ minWidth: 0 }}>
          {role && <div style={{ fontWeight: 600 }}>{role}</div>}
          {loc && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{loc}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {a.industry && <Badge variant="muted">{a.industry}</Badge>}
            {a.willingToMentor && (
              <span className="al-mentor-tag an-mentor-badge">
                <Icon name="sparkles" size={12} aria-hidden="true" />
                Mentor
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="al-kv">
        {a.gradeLeft && <Row label="Grade left">{a.gradeLeft}</Row>}
        {a.higherEducation && <Row label="Higher education">{a.higherEducation}</Row>}
        {a.email && (
          <Row label="Email">
            <a href={`mailto:${a.email}`}>{a.email}</a>
          </Row>
        )}
        {a.phone && (
          <Row label="Phone">
            <a href={`tel:${a.phone}`}>{a.phone}</a>
          </Row>
        )}
        {a.linkedin && (
          <Row label="LinkedIn">
            <a href={a.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Profile <Icon name="external-link" size={12} />
            </a>
          </Row>
        )}
        {a.willingToMentor && a.mentorAreas && a.mentorAreas.length > 0 && (
          <Row label="Mentors in">
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {a.mentorAreas.map((m) => (
                <span className="al-area-pill" key={m}>
                  {m}
                </span>
              ))}
            </span>
          </Row>
        )}
        {a.achievements && <Row label="Achievements">{a.achievements}</Row>}
        {a.notes && <Row label="Notes">{a.notes}</Row>}
      </div>
    </Modal>
  );
}
