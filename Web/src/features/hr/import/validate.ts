import type { RoleId } from '@/types/roles';
import type { StaffImportField } from './csv';

/**
 * PURE validation + role resolution for the Staff bulk-import wizard. No
 * Firestore here — callers pass the role catalogue (id + label) and the list of
 * existing member emails. Unit-tested in `./validate.test.ts`.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A role option the importer can map an incoming "Role" cell onto. */
export interface RoleOption {
  id: RoleId;
  label: string;
}

/** A single mapped + validated import row. */
export interface StaffImportRow {
  /** 1-based source row number (after the header), for user-facing messages. */
  index: number;
  raw: Record<StaffImportField, string>;
  /** Resolved role id when the role cell matched the catalogue, else undefined. */
  roleId?: RoleId;
  errors: string[];
  /** True when there are no blocking errors. */
  valid: boolean;
}

const normEmail = (s?: string) => (s ?? '').trim().toLowerCase();
const normKey = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Resolve a free-text role cell to a catalogue role id. Accepts the role id
 * itself (e.g. `subject_teacher`) OR its display label (e.g. "Subject Teacher"),
 * case/punctuation-insensitive. Returns undefined when nothing matches.
 */
export function resolveRole(value: string, roles: readonly RoleOption[]): RoleId | undefined {
  const key = normKey(value);
  if (!key) return undefined;
  const byId = roles.find((r) => normKey(r.id) === key);
  if (byId) return byId.id;
  const byLabel = roles.find((r) => normKey(r.label) === key);
  return byLabel?.id;
}

/**
 * Validate one mapped row. `existingEmails` is the set of emails already taken
 * by members of THIS school (lowercased), used for duplicate detection.
 * `seenEmails` (optional) lets the caller flag duplicates WITHIN the file —
 * pass the emails of earlier valid rows.
 */
export function validateStaffRow(
  raw: Record<StaffImportField, string>,
  index: number,
  roles: readonly RoleOption[],
  existingEmails: ReadonlySet<string>,
  seenEmails?: ReadonlySet<string>,
): StaffImportRow {
  const errors: string[] = [];

  const name = raw.name?.trim() ?? '';
  if (!name) errors.push('Name is required.');

  const email = raw.email?.trim() ?? '';
  if (!email) {
    errors.push('Email is required.');
  } else if (!EMAIL_RE.test(email)) {
    errors.push(`Email "${email}" is invalid.`);
  } else {
    const key = normEmail(email);
    if (existingEmails.has(key)) errors.push(`A member with email "${email}" already exists.`);
    else if (seenEmails?.has(key)) errors.push(`Email "${email}" is repeated earlier in this file.`);
  }

  const roleId = raw.role?.trim() ? resolveRole(raw.role, roles) : undefined;
  if (!raw.role?.trim()) errors.push('Role is required.');
  else if (!roleId) errors.push(`Role "${raw.role.trim()}" does not match any role.`);

  return { index, raw, roleId, errors, valid: errors.length === 0 };
}

export interface MappedStaffMember {
  name: string;
  email: string;
  roleId: RoleId;
  department?: string;
  phone?: string;
  designation?: string;
}

/** Build the provisioning/staff payload from a validated row (roleId resolved). */
export function rowToStaffMember(row: StaffImportRow): MappedStaffMember {
  return {
    name: row.raw.name.trim(),
    email: row.raw.email.trim(),
    roleId: row.roleId as RoleId,
    department: row.raw.department?.trim() || undefined,
    phone: row.raw.phone?.trim() || undefined,
    designation: row.raw.designation?.trim() || undefined,
  };
}
