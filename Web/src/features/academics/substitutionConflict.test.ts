import { describe, it, expect } from 'vitest';
import { findSubstituteConflict, isSubstituteDoubleBooked, type ProposedSubstitution } from './bellSchedule';
import type { Substitution } from '@/types/academics';

/**
 * Tests for the substitute double-booking check: a substitute already assigned to
 * ANOTHER class in the same date + period. This is the conflict the master-timetable
 * suggestion ranking cannot see (a teacher free in the timetable may already be
 * covering some other absentee's class in that slot).
 */

const DATE = new Date('2026-06-22T00:00:00').getTime();
const OTHER_DATE = new Date('2026-06-23T00:00:00').getTime();

function sub(over: Partial<Substitution>): Substitution {
  return {
    id: over.id ?? 's1',
    schoolId: 'sch1',
    date: over.date ?? DATE,
    day: over.day ?? 'mon',
    periodNo: over.periodNo ?? 1,
    sectionId: over.sectionId ?? 'secB',
    sectionName: over.sectionName,
    substituteTeacherUid: over.substituteTeacherUid ?? 'tSub',
    substituteTeacherName: over.substituteTeacherName,
    absentTeacherUid: over.absentTeacherUid,
    createdAt: 0,
    ...over,
  } as Substitution;
}

const proposed: ProposedSubstitution = {
  date: DATE,
  periodNo: 1,
  sectionId: 'secA',
  substituteTeacherUid: 'tSub',
};

describe('findSubstituteConflict', () => {
  it('flags the same substitute booked for a different class in the same date+period', () => {
    const existing = [sub({ id: 's1', sectionId: 'secB', sectionName: 'Grade 6 · B' })];
    const clash = findSubstituteConflict(proposed, existing);
    expect(clash?.id).toBe('s1');
    expect(isSubstituteDoubleBooked(proposed, existing)).toBe(true);
  });

  it('returns undefined when no substitute is chosen', () => {
    expect(findSubstituteConflict({ ...proposed, substituteTeacherUid: undefined }, [sub({})])).toBeUndefined();
  });

  it('does not clash on a different period', () => {
    const existing = [sub({ periodNo: 2, sectionId: 'secB' })];
    expect(findSubstituteConflict(proposed, existing)).toBeUndefined();
  });

  it('does not clash on a different date', () => {
    const existing = [sub({ date: OTHER_DATE, sectionId: 'secB' })];
    expect(findSubstituteConflict(proposed, existing)).toBeUndefined();
  });

  it('does not clash for a different substitute teacher', () => {
    const existing = [sub({ substituteTeacherUid: 'tOther', sectionId: 'secB' })];
    expect(findSubstituteConflict(proposed, existing)).toBeUndefined();
  });

  it('is not a conflict when it is the SAME class+period (idempotent re-assignment)', () => {
    const existing = [sub({ sectionId: 'secA' })];
    expect(findSubstituteConflict(proposed, existing)).toBeUndefined();
  });

  it('ignores the substitution being edited (same id)', () => {
    const existing = [sub({ id: 'editing', sectionId: 'secB' })];
    expect(findSubstituteConflict({ ...proposed, id: 'editing' }, existing)).toBeUndefined();
  });

  it('finds a clash among several unrelated substitutions', () => {
    const existing = [
      sub({ id: 'a', periodNo: 3, sectionId: 'secC' }),
      sub({ id: 'b', substituteTeacherUid: 'tElse', sectionId: 'secD' }),
      sub({ id: 'c', sectionId: 'secB', sectionName: 'Grade 7 · B' }), // the real clash
    ];
    expect(findSubstituteConflict(proposed, existing)?.id).toBe('c');
  });
});
