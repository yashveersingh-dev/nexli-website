import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  ItAssetType, ItAssetStatus,
  TicketCategory, TicketPriority, TicketStatus,
  BackupScope, BackupResult,
  IntegrationKind, IntegrationStatus,
} from './types';

/* -------------------------------- Devices --------------------------------- */

export const ASSET_TYPE_META: Record<ItAssetType, { label: string; icon: IconName }> = {
  desktop: { label: 'Desktop', icon: 'server' },
  laptop: { label: 'Laptop', icon: 'server' },
  tablet: { label: 'Tablet', icon: 'credit-card' },
  projector: { label: 'Projector', icon: 'image' },
  printer: { label: 'Printer', icon: 'copy' },
  network: { label: 'Network gear', icon: 'wifi' },
  server: { label: 'Server', icon: 'database' },
  peripheral: { label: 'Peripheral', icon: 'box' },
  other: { label: 'Other', icon: 'box' },
};
export const ASSET_TYPE_OPTIONS = (Object.keys(ASSET_TYPE_META) as ItAssetType[])
  .map((value) => ({ value, label: ASSET_TYPE_META[value].label }));

export const ASSET_STATUS_META: Record<ItAssetStatus, { label: string; variant: BadgeVariant }> = {
  in_use: { label: 'In use', variant: 'success' },
  spare: { label: 'Spare', variant: 'info' },
  repair: { label: 'In repair', variant: 'warning' },
  retired: { label: 'Retired', variant: 'muted' },
};
export const ASSET_STATUS_OPTIONS = (Object.keys(ASSET_STATUS_META) as ItAssetStatus[])
  .map((value) => ({ value, label: ASSET_STATUS_META[value].label }));

/* ----------------------------- Support tickets ---------------------------- */

export const TICKET_CATEGORY_META: Record<TicketCategory, { label: string; icon: IconName }> = {
  hardware: { label: 'Hardware', icon: 'server' },
  software: { label: 'Software', icon: 'settings' },
  network: { label: 'Network / Wi-Fi', icon: 'wifi' },
  account: { label: 'Account / login', icon: 'user' },
  erp_lms: { label: 'ERP / LMS', icon: 'database' },
  projector_av: { label: 'Projector / AV', icon: 'image' },
  printer: { label: 'Printer', icon: 'copy' },
  other: { label: 'Other', icon: 'help-circle' },
};
export const TICKET_CATEGORY_OPTIONS = (Object.keys(TICKET_CATEGORY_META) as TicketCategory[])
  .map((value) => ({ value, label: TICKET_CATEGORY_META[value].label }));

export const TICKET_PRIORITY_META: Record<TicketPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'muted' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};
export const TICKET_PRIORITY_OPTIONS = (Object.keys(TICKET_PRIORITY_META) as TicketPriority[])
  .map((value) => ({ value, label: TICKET_PRIORITY_META[value].label }));

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'danger' },
  in_progress: { label: 'In progress', variant: 'warning' },
  vendor: { label: 'With vendor', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'muted' },
};
export const TICKET_STATUS_OPTIONS = (Object.keys(TICKET_STATUS_META) as TicketStatus[])
  .map((value) => ({ value, label: TICKET_STATUS_META[value].label }));

/** Statuses that count a ticket as still needing IT attention. */
export const OPEN_TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'vendor'];

/* ------------------------------- Backup log ------------------------------- */

export const BACKUP_SCOPE_META: Record<BackupScope, { label: string }> = {
  full: { label: 'Full system' },
  database: { label: 'Database' },
  documents: { label: 'Documents' },
  config: { label: 'Configuration' },
  media: { label: 'Media' },
};
export const BACKUP_SCOPE_OPTIONS = (Object.keys(BACKUP_SCOPE_META) as BackupScope[])
  .map((value) => ({ value, label: BACKUP_SCOPE_META[value].label }));

export const BACKUP_RESULT_META: Record<BackupResult, { label: string; variant: BadgeVariant }> = {
  success: { label: 'Success', variant: 'success' },
  partial: { label: 'Partial', variant: 'warning' },
  failed: { label: 'Failed', variant: 'danger' },
};
export const BACKUP_RESULT_OPTIONS = (Object.keys(BACKUP_RESULT_META) as BackupResult[])
  .map((value) => ({ value, label: BACKUP_RESULT_META[value].label }));

/* ---------------------------- Integration seam ---------------------------- */

export const INTEGRATION_KIND_META: Record<IntegrationKind, { label: string; icon: IconName; blurb: string }> = {
  cctv: { label: 'CCTV', icon: 'eye', blurb: 'Camera feeds & device mapping (operate the integration, not surveillance decisions).' },
  biometric: { label: 'Biometric attendance', icon: 'shield-check', blurb: 'Sync attendance devices — IT owns the device, HR owns the data.' },
  sms_gateway: { label: 'SMS gateway', icon: 'message', blurb: 'Transactional SMS provider for alerts and notifications.' },
  lms: { label: 'LMS', icon: 'book', blurb: 'Learning management system single sign-on & roster sync.' },
  payment: { label: 'Payment gateway', icon: 'credit-card', blurb: 'Online fee payment provider connection.' },
  email: { label: 'Email / SMTP', icon: 'mail', blurb: 'Outbound transactional email provider.' },
  other: { label: 'Other', icon: 'box', blurb: 'Any other external system.' },
};
export const INTEGRATION_KIND_OPTIONS = (Object.keys(INTEGRATION_KIND_META) as IntegrationKind[])
  .map((value) => ({ value, label: INTEGRATION_KIND_META[value].label }));

export const INTEGRATION_STATUS_META: Record<IntegrationStatus, { label: string; variant: BadgeVariant }> = {
  not_configured: { label: 'Not configured', variant: 'muted' },
  configured: { label: 'Configured', variant: 'info' },
  connected: { label: 'Connected', variant: 'success' },
  error: { label: 'Error', variant: 'danger' },
  disabled: { label: 'Disabled', variant: 'muted' },
};
export const INTEGRATION_STATUS_OPTIONS = (Object.keys(INTEGRATION_STATUS_META) as IntegrationStatus[])
  .map((value) => ({ value, label: INTEGRATION_STATUS_META[value].label }));
