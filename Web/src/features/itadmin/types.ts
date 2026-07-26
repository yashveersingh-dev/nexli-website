import type { TenantRecord } from '@/types/models';

/* ============================================================================
 * School IT Administration (ROLE_AUDIT §7b). IT administers the SYSTEM, not the
 * business data: devices/labs, the IT helpdesk, system config & integrations,
 * backup logs and a read view of audit events. Deliberately NO student marks,
 * fee amounts or payroll figures (least-privilege / DPDP minimisation).
 *
 * Tenant-scoped collections under `schools/{schoolId}/…`:
 *   it_assets · it_tickets · it_backups · it_integrations
 * ==========================================================================*/

/* -------------------------------- Devices --------------------------------- */

export type ItAssetType =
  | 'desktop'
  | 'laptop'
  | 'tablet'
  | 'projector'
  | 'printer'
  | 'network' // switch / router / access point
  | 'server'
  | 'peripheral'
  | 'other';

export type ItAssetStatus = 'in_use' | 'spare' | 'repair' | 'retired';

/** An IT asset — distinct from the facility asset register (computers, AV, network gear). */
export interface ItAsset extends TenantRecord {
  name: string;
  type: ItAssetType;
  /** Asset tag / inventory code, e.g. IT-2026-014. */
  assetTag?: string;
  /** Physical location or lab, e.g. "Computer Lab 1". */
  location?: string;
  /** Who/where it's allocated to (staff name, department, lab). */
  assignedTo?: string;
  status: ItAssetStatus;
  /** Warranty / AMC end (epoch ms). */
  warrantyUntil?: number;
  serialNo?: string;
  notes?: string;
}

/* ----------------------------- Support tickets ---------------------------- */

export type TicketCategory =
  | 'hardware'
  | 'software'
  | 'network'
  | 'account'
  | 'erp_lms'
  | 'projector_av'
  | 'printer'
  | 'other';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

/** open → in_progress → resolved → closed (vendor = escalated to a 3rd-party vendor). */
export type TicketStatus = 'open' | 'in_progress' | 'vendor' | 'resolved' | 'closed';

/** An IT helpdesk ticket. Any staff member can raise one; IT triages and resolves. */
export interface ItTicket extends TenantRecord {
  /** Sequential, human-readable number, e.g. IT-2026-0042. */
  ticketNo?: string;
  title: string;
  description?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  location?: string;
  assetId?: string;
  /** Reporter (the staff member who raised it). */
  raisedByUid?: string;
  raisedByName?: string;
  raisedAt?: number;
  /** IT staff this ticket is assigned to. */
  assignedToUid?: string;
  assignedToName?: string;
  /** Resolution / closure notes (also used for the escalate-to-vendor note). */
  resolutionNotes?: string;
  resolvedAt?: number;
}

/* ------------------------------- Backup log ------------------------------- */

export type BackupScope = 'full' | 'database' | 'documents' | 'config' | 'media';
export type BackupResult = 'success' | 'partial' | 'failed';

/**
 * A CLIENT-SIDE backup LOG entry — a manual record that a backup was taken (date,
 * scope, result, location). This does NOT perform a backup; on a future Blaze
 * upgrade a scheduled Cloud Function would write these entries automatically.
 */
export interface ItBackup extends TenantRecord {
  takenAt: number;
  scope: BackupScope;
  result: BackupResult;
  /** Where the backup lives, e.g. "Google Drive · IT vault". */
  destination?: string;
  /** Optional human-readable size, e.g. "2.4 GB". */
  sizeLabel?: string;
  takenByUid?: string;
  takenByName?: string;
  notes?: string;
}

/* ---------------------------- Integration seam ---------------------------- */

export type IntegrationKind = 'cctv' | 'biometric' | 'sms_gateway' | 'lms' | 'payment' | 'email' | 'other';

/** not_configured → configured → connected | error | disabled. */
export type IntegrationStatus = 'not_configured' | 'configured' | 'connected' | 'error' | 'disabled';

/**
 * A typed integration config record — the documented INTEGRATION SEAM. Records
 * describe an external system (CCTV / biometric attendance / SMS gateway / LMS)
 * and hold non-secret config (endpoint, vendor, mapping note). On a future Blaze
 * upgrade these records are read by Cloud Functions that own the live connection
 * and any secrets; the client never holds credentials and performs no network
 * calls here. Until then the registry documents intent and tracks status.
 */
export interface ItIntegration extends TenantRecord {
  kind: IntegrationKind;
  name: string;
  vendor?: string;
  status: IntegrationStatus;
  /** Non-secret endpoint / base URL (secrets live server-side, never here). */
  endpoint?: string;
  /** How the device/system maps into NEXLI, e.g. "Camera 1 → Main Gate". */
  mappingNote?: string;
  lastCheckedAt?: number;
  notes?: string;
}
