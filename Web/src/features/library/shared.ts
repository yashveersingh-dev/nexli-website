import { useMemo } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { useSession } from '@/app/providers/SessionProvider';
import type { Actor } from '@/features/daily/data';
import type { BookCirculation, LibraryBook } from '@/types/daily';

/** Session-derived actor for library writers ({ uid, name }). */
export function useActor(): Actor {
  const { uid, member } = useSession();
  return useMemo(() => ({ uid: uid ?? 'unknown', name: member?.name }), [uid, member?.name]);
}

/**
 * Issue a book ATOMICALLY (copy-count integrity).
 *
 * The previous flow did `createCirculation()` then a separate `updateBook(avail-1)`
 * off a stale client read — two concurrent issues could both see `avail=1` and
 * over-issue (negative/oversold copies). This runs inside a Firestore transaction:
 * it re-reads the book server-side, refuses when no copy is free, then writes the
 * decrement and the circulation record together (all-or-nothing).
 *
 * Throws `Error('NO_COPIES')` when nothing is available so the caller can toast it.
 */
export async function issueBookTx(
  schoolId: string,
  input: { bookId: string; bookTitle?: string; borrowerId: string; borrowerName?: string; borrowerType: 'student' | 'staff'; dueDate: number },
  actor: Actor,
): Promise<void> {
  const bookRef = tenantDoc(schoolId, 'library_books', input.bookId);
  const circRef = doc(tenantCol(schoolId, 'book_circulation'));
  await runTransaction(db, async (tx) => {
    const bookSnap = await tx.get(bookRef);
    if (!bookSnap.exists()) throw new Error('NO_COPIES');
    const book = bookSnap.data() as LibraryBook;
    const avail = book.copiesAvailable ?? 0;
    if (avail <= 0) throw new Error('NO_COPIES');
    tx.update(bookRef, { copiesAvailable: avail - 1, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
    tx.set(circRef, {
      schoolId,
      bookId: input.bookId,
      bookTitle: input.bookTitle ?? book.title,
      borrowerId: input.borrowerId,
      ...(input.borrowerName !== undefined ? { borrowerName: input.borrowerName } : {}),
      borrowerType: input.borrowerType,
      issuedDate: Date.now(),
      dueDate: input.dueDate,
      status: 'issued',
      createdAt: Date.now(),
      createdBy: actor.uid,
      serverCreatedAt: serverTimestamp(),
      version: 1,
    });
  });
  void writeAuditEvent({ action: 'book.issued', schoolId, actor, targetType: 'circulation', targetId: circRef.id, summary: input.bookTitle });
}

/**
 * Return a book ATOMICALLY: re-reads the loan + book inside a transaction, marks
 * the loan returned (idempotent — skips if already returned) and increments the
 * available count, capped at `copiesTotal`. Prevents a double-return inflating the
 * available count beyond the number of physical copies.
 */
export async function returnBookTx(schoolId: string, circulationId: string, bookId: string, actor: Actor): Promise<void> {
  const bookRef = tenantDoc(schoolId, 'library_books', bookId);
  const circRef = tenantDoc(schoolId, 'book_circulation', circulationId);
  await runTransaction(db, async (tx) => {
    // All reads must precede all writes in a Firestore transaction.
    const circSnap = await tx.get(circRef);
    if (!circSnap.exists()) return;
    const circ = circSnap.data() as BookCirculation;
    if (circ.status === 'returned' || circ.returnedDate) return; // idempotent
    const bookSnap = await tx.get(bookRef);
    tx.update(circRef, { status: 'returned', returnedDate: Date.now(), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
    if (bookSnap.exists()) {
      const book = bookSnap.data() as LibraryBook;
      const next = Math.min(book.copiesTotal ?? 0, (book.copiesAvailable ?? 0) + 1);
      tx.update(bookRef, { copiesAvailable: next, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
    }
  });
}

// Pure overdue/fine maths lives in the Firebase-free `./fines` module so it can be
// unit-tested without dragging in the Firebase SDK. Re-exported here so existing
// `./shared` imports (DAY_MS, isOverdue, daysOverdue, computeFine, DEFAULT_FINE_PER_DAY)
// keep working unchanged.
export { DAY_MS, isOverdue, daysOverdue, computeFine, DEFAULT_FINE_PER_DAY } from './fines';
import { DAY_MS } from './fines';

/** Default loan period: today + 14 days, as an epoch-ms timestamp. */
export function defaultDueDate(from = Date.now()): number {
  return from + 14 * DAY_MS;
}

/** ISO yyyy-mm-dd string (for native date inputs) from an epoch-ms timestamp. */
export function toDateInput(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Epoch-ms (local noon, to avoid TZ drift) from an ISO yyyy-mm-dd input value. */
export function fromDateInput(value: string): number {
  return new Date(`${value}T12:00:00`).getTime();
}

/** Active (not returned) circulation records, newest issue first. */
export function activeIssues(records: BookCirculation[]): BookCirculation[] {
  return records
    .filter((c) => c.status !== 'returned' && !c.returnedDate)
    .slice()
    .sort((a, b) => b.issuedDate - a.issuedDate);
}
