import type { EventRegistration, SchoolEvent } from '@/types/community';
import { REGISTRATION_STATUS_META } from '@/features/analytics/meta';
import { formatDate } from '@/lib/format';

/**
 * Spark-native participant exports for the Events module. No Storage / Cloud
 * Functions: the CSV is built client-side and downloaded via a Blob URL, and the
 * "PDF" is a print-friendly sheet driven by `window.print()` (the HPC/fees model).
 */

const PARTICIPANT_TYPE_LABEL: Record<NonNullable<EventRegistration['participantType']>, string> = {
  student: 'Student',
  staff: 'Staff',
  parent: 'Parent',
};

/** Escape one cell for CSV output (quotes wrap commas / quotes / newlines). */
function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build a CSV string from a header row + data rows (CRLF line endings). */
function toCsv(headers: readonly string[], rows: string[][]): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCell).join(','));
  return lines.join('\r\n');
}

/** Participant-type display label, falling back to '—'. */
export function participantTypeLabel(type?: EventRegistration['participantType']): string {
  return type ? PARTICIPANT_TYPE_LABEL[type] : '—';
}

/** A safe, dated file name stem for an event's participant export. */
export function exportFileStem(event: Pick<SchoolEvent, 'title'>): string {
  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'event';
  return `${slug}-participants-${formatDate(Date.now(), 'YYYY-MM-DD')}`;
}

/** Stable export order: by status rank, then registration time, then name. */
const STATUS_RANK: Record<EventRegistration['status'], number> = {
  registered: 0,
  waitlist: 1,
  attended: 2,
  cancelled: 3,
};

export function sortedForExport(registrations: EventRegistration[]): EventRegistration[] {
  return registrations
    .slice()
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.registeredAt ?? 0) - (b.registeredAt ?? 0) ||
        a.participantName.localeCompare(b.participantName),
    );
}

/** CSV column headers, in order — the "Export to Excel" contract. */
export const REGISTRATION_CSV_HEADERS = ['Name', 'Grade', 'Type', 'Status', 'Registered date'] as const;

/** One CSV row per registration (name, grade, type, status, registered date). */
function registrationToRow(reg: EventRegistration): string[] {
  return [
    reg.participantName,
    reg.gradeName ?? '',
    participantTypeLabel(reg.participantType),
    REGISTRATION_STATUS_META[reg.status]?.label ?? reg.status,
    reg.registeredAt ? formatDate(reg.registeredAt, 'DD MMM YYYY') : '',
  ];
}

/** Build the full participant-list CSV (BOM is added at download time). */
export function buildRegistrationsCsv(registrations: EventRegistration[]): string {
  return toCsv(REGISTRATION_CSV_HEADERS, sortedForExport(registrations).map(registrationToRow));
}

/**
 * Download the participant list as a `.csv` (opens in Excel / Sheets / Numbers).
 * Prepends a UTF-8 BOM so Excel renders non-ASCII names correctly.
 */
export function downloadRegistrationsCsv(event: Pick<SchoolEvent, 'title'>, registrations: EventRegistration[]): void {
  const csv = buildRegistrationsCsv(registrations);
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exportFileStem(event)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
