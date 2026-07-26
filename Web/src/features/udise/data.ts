/**
 * UDISE+ module data layer. The school UDISE profile is a single doc owned by the
 * shared Compliance (P7) data layer; enrolment figures are aggregated live from
 * the School Backbone (P3) rosters. This file just re-exports the typed hooks so
 * the UDISE feature has one import surface and never touches Firestore directly.
 */
export { useUdiseProfile, saveUdiseProfile, type Actor } from '@/features/compliance/data';
export { useStudents, useStaff, useGrades } from '@/features/school/data';
