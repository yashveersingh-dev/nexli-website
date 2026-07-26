import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import type { Alumnus } from '@/types/community';
import { locationLine, roleLine } from '../meta';

/**
 * Directory card for one alumnus (extends analytics `.an-alum`). Avatar, name,
 * batch year, role @ organisation, optional industry badge + mentor ribbon.
 * Rendered as a button so the whole card is keyboard-activatable.
 */
export function AlumnusCard({ alumnus, onOpen }: { alumnus: Alumnus; onOpen: () => void }) {
  const role = roleLine(alumnus);
  const loc = locationLine(alumnus);

  return (
    <button type="button" className="an-alum al-card" onClick={onOpen} aria-label={`Open ${alumnus.name}`}>
      <Avatar name={alumnus.name} src={alumnus.photoUrl} size={56} />

      <div className="al-card__name">
        {alumnus.name}
        {alumnus.verified && (
          <span className="al-card__verified" title="Verified profile">
            {' '}
            <Icon name="check-circle" size={13} />
          </span>
        )}
      </div>

      {alumnus.batchYear && <div className="al-card__batch">Batch of {alumnus.batchYear}</div>}

      {role && <div className="an-alum__role">{role}</div>}

      {loc && (
        <div className="al-card__loc">
          <Icon name="map-pin" size={11} aria-hidden="true" />
          {loc}
        </div>
      )}

      {alumnus.industry && (
        <div className="al-card__industry">
          <Badge variant="muted">{alumnus.industry}</Badge>
        </div>
      )}

      {alumnus.willingToMentor && (
        <span className="al-mentor-tag an-mentor-badge">
          <Icon name="sparkles" size={12} aria-hidden="true" />
          Mentor
        </span>
      )}
    </button>
  );
}
