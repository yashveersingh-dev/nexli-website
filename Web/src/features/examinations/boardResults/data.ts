import { addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import type { Actor } from '@/features/school/data';
import type { BoardResultStatus, ParsedSubject } from './csv';

/**
 * Board-exam results data layer (collection `board_results`). External CBSE / ICSE
 * / State board results imported via CSV — one doc per imported result. Kept in the
 * examinations feature (not the shared daily layer) and written through the public
 * tenant primitives so it stays inside this module's ownership boundary.
 */

const COLLECTION = 'board_results';

/** A stored subject line on a board result. */
export interface BoardResultSubject {
  name: string;
  maxMarks: number;
  marks: number;
  grade?: string;
}

/** A persisted board-exam result for one student + exam. */
export interface BoardResult {
  id: string;
  schoolId: string;
  /** Linked SIS student id when resolved at import (may be empty if unmatched). */
  studentId: string;
  studentName: string;
  admissionNo: string;
  board: string;
  examName: string;
  year: string;
  subjects: BoardResultSubject[];
  totalMarks: number;
  totalMax: number;
  percentage: number;
  result: BoardResultStatus;
  importedAt: number;
  importedByUid: string;
}

/** Payload shape written on import (id/serverImportedAt added by the writer). */
export type NewBoardResult = Omit<BoardResult, 'id'>;

/** Live list of all board results for a school. */
export function useBoardResults(schoolId?: string) {
  return useCollection<BoardResult>(schoolId ? tenantCol(schoolId, COLLECTION) : null, [schoolId]);
}

/** Map a parsed subject (from csv.ts) to the stored subject shape, dropping empties. */
export function toStoredSubject(s: ParsedSubject): BoardResultSubject {
  const out: BoardResultSubject = { name: s.name, marks: s.marks, maxMarks: s.maxMarks };
  if (s.grade && s.grade.trim()) out.grade = s.grade.trim();
  return out;
}

function stamp(actor: Actor) {
  const now = Date.now();
  return { importedAt: now, importedByUid: actor.uid, serverImportedAt: serverTimestamp() };
}

/** Save a single board result (used for retries / one-offs). Returns the new id. */
export async function saveBoardResult(schoolId: string, data: NewBoardResult, actor: Actor): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, COLLECTION), { ...data, schoolId, ...stamp(actor) });
  return ref.id;
}

/**
 * Persist a batch of imported board results ATOMICALLY, in Firestore-batch chunks
 * of up to 450 writes (well under the 500/commit limit). Either a whole chunk
 * commits or it doesn't, so a network drop cannot leave half a chunk written.
 * Returns the number of results written. A best-effort audit event is logged.
 */
export async function saveBoardResults(
  schoolId: string,
  results: readonly NewBoardResult[],
  actor: Actor,
): Promise<number> {
  const CHUNK = 450;
  let written = 0;
  for (let i = 0; i < results.length; i += CHUNK) {
    const slice = results.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const r of slice) {
      // New doc with an auto id inside the tenant collection.
      const ref = tenantDoc(schoolId, COLLECTION, autoId());
      batch.set(ref, { ...r, schoolId, ...stamp(actor) });
    }
    await batch.commit();
    written += slice.length;
  }
  void writeAuditEvent({
    action: 'student.imported',
    schoolId,
    actor,
    targetType: 'board_results',
    summary: `Imported ${written} board result${written === 1 ? '' : 's'}`,
  });
  return written;
}

/** Generate a Firestore-style 20-char auto id (for batched `set`s with a known ref). */
function autoId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
