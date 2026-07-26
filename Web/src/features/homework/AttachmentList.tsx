import { Icon } from '@/components/Icon';
import type { Homework, HomeworkAttachment } from '@/types/daily';
import { ATTACHMENT_ICON, attachmentTypeFromUrl, isImageAttachment } from './attachments';

/**
 * Read-only attachment list shared by the staff detail page and the
 * parent/student view. Merges the legacy single `attachmentUrl` with the
 * `attachments[]` array so older homework still renders. Images show a small
 * thumbnail; every type links out in a new tab.
 */

/** Normalise a homework's attachments into one list (legacy field first). */
export function resolveAttachments(hw: Pick<Homework, 'attachments' | 'attachmentUrl'>): HomeworkAttachment[] {
  const list: HomeworkAttachment[] = [];
  if (hw.attachmentUrl) {
    list.push({ name: 'Attachment', url: hw.attachmentUrl, type: attachmentTypeFromUrl(hw.attachmentUrl) });
  }
  if (hw.attachments?.length) list.push(...hw.attachments);
  return list;
}

export function AttachmentList({ items, compact = false }: { items: HomeworkAttachment[]; compact?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ul className={`nx-hw-attach-list${compact ? ' nx-hw-attach-list--compact' : ''}`} aria-label="Attachments">
      {items.map((att, i) => {
        const isImage = isImageAttachment(att.type);
        return (
          <li className="nx-hw-attach-row" key={`${att.url}-${i}`}>
            <a
              className="nx-hw-attach-row__link"
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${att.name} in a new tab`}
            >
              {isImage && !compact ? (
                <img className="nx-hw-attach-row__thumb" src={att.url} alt="" loading="lazy" />
              ) : (
                <span className="nx-hw-attach-row__icon" aria-hidden="true">
                  <Icon name={ATTACHMENT_ICON[att.type]} size={16} />
                </span>
              )}
              <span className="nx-hw-attach-row__name">{att.name}</span>
              <span className="nx-hw-attach-row__open" aria-hidden="true">
                <Icon name="external-link" size={14} />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
