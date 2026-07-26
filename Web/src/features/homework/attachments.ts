import type { IconName } from '@/components/Icon';
import type { HomeworkAttachment, HomeworkAttachmentType } from '@/types/daily';

/**
 * Single source of truth for homework attachment file types.
 *
 * Attachments today are hosted-link references (Google Drive / ImageKit / any
 * public URL) — Spark plan has no Storage bucket. The model is shaped so a future
 * real upload (ImageKit / Blaze) is a drop-in: the upload component just produces
 * the same `{ name, url, type }` shape and reuses everything below.
 */

/** Extension → attachment type. The keys also drive the accepted-extension list. */
const EXTENSION_TYPE: Record<string, HomeworkAttachmentType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  xls: 'xls',
  xlsx: 'xlsx',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

/** Extension → MIME, for a future real upload (accept filters, content-type checks). */
export const ATTACHMENT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** File-type icon per attachment type (only glyphs that exist in Icon.tsx). */
export const ATTACHMENT_ICON: Record<HomeworkAttachmentType, IconName> = {
  pdf: 'file-text',
  doc: 'file-text',
  docx: 'file-text',
  xls: 'file-text',
  xlsx: 'file-text',
  jpg: 'image',
  png: 'image',
  webp: 'image',
  other: 'paperclip',
};

const IMAGE_TYPES: ReadonlySet<HomeworkAttachmentType> = new Set(['jpg', 'png', 'webp']);

/** Image types get an inline thumbnail; everything else just links out. */
export const isImageAttachment = (type: HomeworkAttachmentType): boolean => IMAGE_TYPES.has(type);

/** Lowercased file extension from a URL or filename, ignoring query/hash. */
function extensionOf(input: string): string {
  const cleaned = input.trim().split(/[?#]/, 1)[0] ?? '';
  const lastSlash = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
  const tail = lastSlash >= 0 ? cleaned.slice(lastSlash + 1) : cleaned;
  const dot = tail.lastIndexOf('.');
  return dot >= 0 ? tail.slice(dot + 1).toLowerCase() : '';
}

/**
 * Infer the attachment type from a URL or filename extension. Prefers the
 * display name's extension (more reliable than a CDN URL), falling back to the
 * URL; unknown / extensionless → 'other'.
 */
export function attachmentTypeFromUrl(url: string, name?: string): HomeworkAttachmentType {
  const ext = (name && extensionOf(name)) || extensionOf(url);
  return EXTENSION_TYPE[ext] ?? 'other';
}

/** A link is usable iff it parses as an absolute http(s) URL. */
export function isValidAttachmentUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Coerce raw `{ name, url }` form rows into stored `HomeworkAttachment[]`.
 * Drops blank rows and rows whose URL is not http(s); derives `type` and falls
 * back to the URL/host as a display name when none was given. Returns `undefined`
 * when nothing valid remains (so the field is omitted from Firestore).
 */
export function toHomeworkAttachments(
  rows: { name?: string; url?: string }[] | undefined,
): HomeworkAttachment[] | undefined {
  if (!rows?.length) return undefined;
  const out: HomeworkAttachment[] = [];
  for (const row of rows) {
    const url = (row.url ?? '').trim();
    if (!isValidAttachmentUrl(url)) continue;
    const name = (row.name ?? '').trim() || fallbackName(url);
    out.push({ name, url, type: attachmentTypeFromUrl(url, name) });
  }
  return out.length ? out : undefined;
}

/** Derive a readable name from a URL: last path segment, else the host. */
function fallbackName(url: string): string {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return decodeURIComponent(segment || parsed.hostname);
  } catch {
    return url;
  }
}
