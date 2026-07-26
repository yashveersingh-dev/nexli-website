import { useMemo, useState } from 'react';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Field, Select, DatePicker } from '@/components/form';
import { formatDate } from '@/lib/format';
import {
  useBooks, useCirculation,
} from '@/features/daily/data';
import { useStudents, useStaff } from '@/features/school/data';
import { CIRCULATION_STATUS_META } from '@/features/daily/meta';
import type { BookCirculation } from '@/types/daily';
import { useActor, defaultDueDate, toDateInput, fromDateInput, activeIssues, isOverdue, daysOverdue, issueBookTx, returnBookTx } from './shared';

/** Circulation tab: issue books, list active loans, return them. */
export function CirculationTab() {
  const { schoolId } = useSession();
  const canWrite = useOwnership('library').canOperate;
  const actor = useActor();
  const toast = useToast();
  const { data: books, loading: bLoading } = useBooks(schoolId);
  const { data: records, loading: cLoading, error } = useCirculation(schoolId);
  const { data: students } = useStudents(schoolId);
  const { data: staff } = useStaff(schoolId);

  const [issuing, setIssuing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [returning, setReturning] = useState<BookCirculation | null>(null);

  // issue form state
  const [bookId, setBookId] = useState('');
  const [borrowerType, setBorrowerType] = useState<'student' | 'staff'>('student');
  const [borrowerId, setBorrowerId] = useState('');
  const [dueDate, setDueDate] = useState(toDateInput(defaultDueDate()));

  const availableBooks = useMemo(
    () => books.filter((b) => (b.copiesAvailable ?? 0) > 0).slice().sort((a, b) => a.title.localeCompare(b.title)),
    [books],
  );

  const borrowerOptions = useMemo(() => {
    const list = borrowerType === 'student'
      ? students.map((s) => ({ value: s.id, label: s.fullName }))
      : staff.map((s) => ({ value: s.id, label: s.name }));
    return list.slice().sort((a, b) => a.label.localeCompare(b.label));
  }, [borrowerType, students, staff]);

  const active = useMemo(() => activeIssues(records), [records]);

  const openIssue = () => {
    setBookId('');
    setBorrowerType('student');
    setBorrowerId('');
    setDueDate(toDateInput(defaultDueDate()));
    setIssuing(true);
  };

  const submitIssue = async () => {
    if (!schoolId || !bookId || !borrowerId) return;
    const book = books.find((b) => b.id === bookId);
    if (!book || (book.copiesAvailable ?? 0) <= 0) { toast.error('No copies available'); return; }
    const borrowerName = borrowerType === 'student'
      ? students.find((s) => s.id === borrowerId)?.fullName
      : staff.find((s) => s.id === borrowerId)?.name;
    setBusy(true);
    try {
      // Atomic: re-reads availability server-side and writes loan + decrement together.
      await issueBookTx(schoolId, { bookId, bookTitle: book.title, borrowerId, borrowerName, borrowerType, dueDate: fromDateInput(dueDate) }, actor);
      toast.success('Book issued');
      setIssuing(false);
    } catch (e) {
      toast.error((e as Error)?.message === 'NO_COPIES' ? 'No copies available' : 'Could not issue book');
    } finally { setBusy(false); }
  };

  const confirmReturn = async () => {
    if (!schoolId || !returning) return;
    setBusy(true);
    try {
      // Atomic + idempotent: marks returned and increments availability (capped at total).
      await returnBookTx(schoolId, returning.id, returning.bookId, actor);
      toast.success('Book returned');
      setReturning(null);
    } catch { toast.error('Could not return book'); } finally { setBusy(false); }
  };

  const columns: Column<BookCirculation>[] = [
    {
      key: 'book', header: 'Book', primary: true,
      render: (c) => <span style={{ fontWeight: 600 }}>{c.bookTitle ?? '—'}</span>,
    },
    {
      key: 'borrower', header: 'Borrower',
      render: (c) => (
        <span className="lib-borrower">
          {c.borrowerName ?? '—'}
          <Badge variant="muted">{c.borrowerType === 'staff' ? 'Staff' : 'Student'}</Badge>
        </span>
      ),
    },
    { key: 'issued', header: 'Issued', hideOnMobile: true, render: (c) => formatDate(c.issuedDate) },
    {
      key: 'due', header: 'Due',
      render: (c) => {
        const over = isOverdue(c);
        return (
          <span className={over ? 'lib-due lib-due--over' : 'lib-due'}>
            {formatDate(c.dueDate)}
            {over && <Badge variant="danger">{daysOverdue(c)}d over</Badge>}
          </span>
        );
      },
    },
    {
      key: 'status', header: 'Status',
      render: (c) => {
        const meta = isOverdue(c) ? CIRCULATION_STATUS_META.overdue : CIRCULATION_STATUS_META[c.status];
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <div>
      <div className="nx-toolbar">
        <div className="lib-spacer" />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={openIssue} disabled={availableBooks.length === 0 && !bLoading}>Issue book</Button>}
      </div>

      <DataTable
        columns={columns} rows={active} rowKey={(c) => c.id} loading={cLoading}
        error={error ? 'Could not load circulation records.' : null}
        emptyIcon="check-circle"
        emptyTitle="No active loans"
        emptyMessage={canWrite ? 'Issue a book to start tracking loans here.' : 'Nothing is currently issued.'}
        actions={canWrite ? (c) => (
          <Button variant="ghost" size="sm" leftIcon="check" onClick={() => setReturning(c)} aria-label={`Return ${c.bookTitle ?? 'book'}`}>Return</Button>
        ) : undefined}
      />

      <Modal open={issuing} onClose={() => setIssuing(false)} icon="download" tone="gold"
        title="Issue book" size="md" dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIssuing(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!bookId || !borrowerId} onClick={submitIssue}>Issue</Button>
          </>
        }>
        {availableBooks.length === 0 ? (
          <p className="lib-note">No books have available copies right now. Add copies in the Catalog first.</p>
        ) : (
          <>
            <Field label="Book" required>
              <Select value={bookId} onChange={(e) => setBookId(e.target.value)} placeholder="Select an available book"
                options={availableBooks.map((b) => ({ value: b.id, label: `${b.title} (${b.copiesAvailable} avail.)` }))} />
            </Field>
            <Field label="Borrower type" required>
              <Select value={borrowerType} onChange={(e) => { setBorrowerType(e.target.value as 'student' | 'staff'); setBorrowerId(''); }}
                options={[{ value: 'student', label: 'Student' }, { value: 'staff', label: 'Staff' }]} />
            </Field>
            <Field label="Borrower" required>
              <Select value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} placeholder={`Select a ${borrowerType}`}
                options={borrowerOptions} />
            </Field>
            <Field label="Due date" required hint="Defaults to 14 days from today">
              <DatePicker value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={toDateInput(Date.now())} />
            </Field>
          </>
        )}
      </Modal>

      <Modal open={!!returning} onClose={() => setReturning(null)} icon="check-circle" tone="success"
        title="Return book" size="sm" dismissible={!busy}
        description={returning ? `${returning.bookTitle ?? 'This book'} — ${returning.borrowerName ?? 'borrower'}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturning(null)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} onClick={confirmReturn}>Mark returned</Button>
          </>
        }>
        <p className="lib-note">
          Marking this returned will free one copy back into the catalog.
          {returning && isOverdue(returning) && <> This loan is <strong>{daysOverdue(returning)} day(s)</strong> overdue.</>}
        </p>
      </Modal>
    </div>
  );
}
