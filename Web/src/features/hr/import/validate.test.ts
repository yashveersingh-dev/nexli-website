import { describe, it, expect } from 'vitest';
import { parseCsv, autoMap, buildStaffTemplateCsv, STAFF_IMPORT_FIELDS } from './csv';
import { resolveRole, validateStaffRow, rowToStaffMember, type RoleOption, type StaffImportRow } from './validate';
import type { StaffImportField } from './csv';

const ROLES: RoleOption[] = [
  { id: 'subject_teacher', label: 'Subject Teacher' },
  { id: 'class_teacher', label: 'Class Teacher' },
  { id: 'librarian', label: 'Librarian (Head)' },
  { id: 'accountant_junior', label: 'Junior Accountant' },
];

/** Build a `raw` record from a partial (missing fields → ''). */
function raw(p: Partial<Record<StaffImportField, string>>): Record<StaffImportField, string> {
  return {
    name: '', email: '', role: '', department: '', phone: '', designation: '',
    ...p,
  };
}

describe('parseCsv', () => {
  it('parses headers + rows, trims headers, normalises width', () => {
    const csv = 'Name,Email,Role\nAsha,asha@x.com,Subject Teacher\nRavi,ravi@x.com,Class Teacher';
    const out = parseCsv(csv);
    expect(out.headers).toEqual(['Name', 'Email', 'Role']);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toEqual(['Asha', 'asha@x.com', 'Subject Teacher']);
  });

  it('handles quoted commas, escaped quotes, CRLF and a BOM', () => {
    const csv = '﻿Name,Designation\r\n"Menon, Priya","PGT ""Physics"""\r\n';
    const out = parseCsv(csv);
    expect(out.headers).toEqual(['Name', 'Designation']);
    expect(out.rows[0]).toEqual(['Menon, Priya', 'PGT "Physics"']);
  });

  it('drops fully-empty rows and returns empty on a blank file', () => {
    expect(parseCsv('\n\n').rows).toHaveLength(0);
    expect(parseCsv('').headers).toHaveLength(0);
  });

  it('round-trips the template through parseCsv', () => {
    const out = parseCsv(buildStaffTemplateCsv());
    expect(out.headers).toContain('Email');
    expect(out.rows).toHaveLength(1);
  });
});

describe('autoMap', () => {
  it('auto-matches common header variants to fields', () => {
    const m = autoMap(['Full Name', 'E-mail Address', 'Job Role', 'Dept', 'Mobile', 'Job Title']);
    expect(m.name).toBe(0);
    expect(m.email).toBe(1);
    expect(m.role).toBe(2);
    expect(m.department).toBe(3);
    expect(m.phone).toBe(4);
    expect(m.designation).toBe(5);
  });

  it('returns -1 for fields with no matching column', () => {
    const m = autoMap(['Name', 'Email', 'Role']);
    expect(m.department).toBe(-1);
    expect(m.phone).toBe(-1);
  });

  it('never maps two fields to the same column', () => {
    const m = autoMap(['Name', 'Email', 'Role']);
    const used = STAFF_IMPORT_FIELDS.map((f) => m[f.key]).filter((i) => i >= 0);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe('resolveRole', () => {
  it('resolves by role id (case/punctuation-insensitive)', () => {
    expect(resolveRole('subject_teacher', ROLES)).toBe('subject_teacher');
    expect(resolveRole('Subject Teacher', ROLES)).toBe('subject_teacher');
    expect(resolveRole('  CLASS-TEACHER ', ROLES)).toBe('class_teacher');
  });

  it('resolves by display label', () => {
    expect(resolveRole('Junior Accountant', ROLES)).toBe('accountant_junior');
    expect(resolveRole('Librarian (Head)', ROLES)).toBe('librarian');
  });

  it('returns undefined for unknown / blank roles', () => {
    expect(resolveRole('Astronaut', ROLES)).toBeUndefined();
    expect(resolveRole('', ROLES)).toBeUndefined();
  });
});

describe('validateStaffRow', () => {
  const existing = new Set(['taken@x.com']);

  it('accepts a complete, unique row and resolves the role', () => {
    const r = validateStaffRow(raw({ name: 'Asha', email: 'asha@x.com', role: 'Subject Teacher' }), 1, ROLES, existing);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.roleId).toBe('subject_teacher');
  });

  it('flags missing name / email / role', () => {
    const r = validateStaffRow(raw({}), 1, ROLES, existing);
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(expect.arrayContaining([
      'Name is required.', 'Email is required.', 'Role is required.',
    ]));
  });

  it('flags an invalid email format', () => {
    const r = validateStaffRow(raw({ name: 'A', email: 'not-an-email', role: 'class_teacher' }), 2, ROLES, existing);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('invalid'))).toBe(true);
  });

  it('flags a duplicate against existing members (case-insensitive)', () => {
    const r = validateStaffRow(raw({ name: 'A', email: 'TAKEN@x.com', role: 'class_teacher' }), 3, ROLES, existing);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('already exists'))).toBe(true);
  });

  it('flags a duplicate WITHIN the file via seenEmails', () => {
    const seen = new Set(['asha@x.com']);
    const r = validateStaffRow(raw({ name: 'A2', email: 'asha@x.com', role: 'class_teacher' }), 4, ROLES, existing, seen);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('repeated'))).toBe(true);
  });

  it('flags an unrecognised role', () => {
    const r = validateStaffRow(raw({ name: 'A', email: 'a@x.com', role: 'Wizard' }), 5, ROLES, existing);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('does not match any role'))).toBe(true);
    expect(r.roleId).toBeUndefined();
  });
});

describe('rowToStaffMember', () => {
  it('maps a validated row into a provisioning payload, trimming + dropping blanks', () => {
    const row: StaffImportRow = {
      index: 1,
      raw: raw({ name: ' Asha ', email: ' asha@x.com ', role: 'subject_teacher', department: ' Science ', phone: '', designation: 'PGT' }),
      roleId: 'subject_teacher',
      errors: [],
      valid: true,
    };
    expect(rowToStaffMember(row)).toEqual({
      name: 'Asha',
      email: 'asha@x.com',
      roleId: 'subject_teacher',
      department: 'Science',
      phone: undefined,
      designation: 'PGT',
    });
  });
});
