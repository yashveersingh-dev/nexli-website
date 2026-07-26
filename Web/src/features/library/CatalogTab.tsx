import { useMemo, useState } from 'react';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { KPICard } from '@/components/KPICard';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { useBooks, createBook, updateBook, deleteBook } from '@/features/daily/data';
import { BOOK_CATEGORIES } from '@/features/daily/meta';
import type { LibraryBook } from '@/types/daily';
import { useActor } from './shared';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...BOOK_CATEGORIES.map((c) => ({ value: c, label: c })),
];

/** Catalog tab: KPI strip + searchable, category-filtered book list with CRUD. */
export function CatalogTab({ readOnly = false }: { readOnly?: boolean }) {
  const { schoolId } = useSession();
  const { canOperate } = useOwnership('library');
  const canWrite = canOperate && !readOnly;
  const actor = useActor();
  const toast = useToast();
  const { data: books, loading, error } = useBooks(schoolId);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState<LibraryBook | null | undefined>(undefined); // undefined=closed, null=new
  const [removing, setRemoving] = useState<LibraryBook | null>(null);
  const [busy, setBusy] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [publisher, setPublisher] = useState('');
  const [language, setLanguage] = useState('');
  const [copiesTotal, setCopiesTotal] = useState('1');
  const [shelf, setShelf] = useState('');

  const stats = useMemo(() => {
    let copies = 0, available = 0;
    for (const b of books) { copies += b.copiesTotal ?? 0; available += b.copiesAvailable ?? 0; }
    return { titles: books.length, copies, available, issued: Math.max(0, copies - available) };
  }, [books]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return books
      .filter((b) => (cat ? b.category === cat : true))
      .filter((b) =>
        !needle
          ? true
          : [b.title, b.author, b.isbn, b.publisher].some((v) => v?.toLowerCase().includes(needle)),
      )
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [books, q, cat]);

  const open = (b: LibraryBook | null) => {
    setEditing(b);
    setTitle(b?.title ?? '');
    setAuthor(b?.author ?? '');
    setIsbn(b?.isbn ?? '');
    setCategory(b?.category ?? '');
    setPublisher(b?.publisher ?? '');
    setLanguage(b?.language ?? '');
    setCopiesTotal(String(b?.copiesTotal ?? 1));
    setShelf(b?.shelf ?? '');
  };

  const save = async () => {
    if (!schoolId || !title.trim()) return;
    const total = Math.max(0, Number(copiesTotal) || 0);
    setBusy(true);
    try {
      if (editing) {
        // Keep availability consistent: shift available by the change in total, clamped.
        const delta = total - (editing.copiesTotal ?? 0);
        const nextAvailable = Math.min(total, Math.max(0, (editing.copiesAvailable ?? 0) + delta));
        await updateBook(schoolId, editing.id, {
          title: title.trim(),
          author: author.trim() || undefined,
          isbn: isbn.trim() || undefined,
          category: category || undefined,
          publisher: publisher.trim() || undefined,
          language: language.trim() || undefined,
          copiesTotal: total,
          copiesAvailable: nextAvailable,
          shelf: shelf.trim() || undefined,
        }, actor);
      } else {
        await createBook(schoolId, {
          schoolId,
          title: title.trim(),
          author: author.trim() || undefined,
          isbn: isbn.trim() || undefined,
          category: category || undefined,
          publisher: publisher.trim() || undefined,
          language: language.trim() || undefined,
          copiesTotal: total,
          copiesAvailable: total,
          shelf: shelf.trim() || undefined,
        }, actor);
      }
      toast.success(editing ? 'Book updated' : 'Book added');
      setEditing(undefined);
    } catch { toast.error('Could not save book'); } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteBook(schoolId, removing.id, actor); toast.success('Book deleted'); setRemoving(null); }
    catch { toast.error('Could not delete book'); } finally { setBusy(false); }
  };

  const columns: Column<LibraryBook>[] = [
    {
      key: 'title', header: 'Title', primary: true,
      render: (b) => (
        <span className="lib-book">
          <Avatar name={b.title} src={b.coverUrl ?? null} size={34} />
          <span className="lib-book__text">
            <span className="lib-book__title">{b.title}</span>
            {b.author && <span className="lib-book__author">{b.author}</span>}
          </span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', render: (b) => (b.category ? <Badge variant="muted">{b.category}</Badge> : '—') },
    { key: 'shelf', header: 'Shelf', hideOnMobile: true, render: (b) => b.shelf ?? '—' },
    {
      key: 'available', header: 'Available', align: 'right',
      render: (b) => (
        <Badge variant={b.copiesAvailable > 0 ? 'success' : 'danger'}>{b.copiesAvailable}/{b.copiesTotal}</Badge>
      ),
    },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search title, author, ISBN…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search books" />
      </div>
      <Select value={cat} onChange={(e) => setCat(e.target.value)} options={CATEGORY_OPTIONS} aria-label="Filter by category" className="lib-catfilter" />
      {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Add book</Button>}
    </div>
  );

  return (
    <div>
      <div className="kpi-grid lib-kpis">
        <KPICard icon="book" label="Titles" count={stats.titles} />
        <KPICard icon="box" label="Total copies" count={stats.copies} />
        <KPICard icon="check-circle" label="Available" count={stats.available} />
        <KPICard icon="download" label="Issued" count={stats.issued} />
      </div>

      <DataTable
        columns={columns} rows={rows} rowKey={(b) => b.id} loading={loading}
        error={error ? 'Could not load the catalog.' : null}
        toolbar={toolbar}
        emptyIcon="book"
        emptyTitle={q || cat ? 'No matching books' : 'No books yet'}
        emptyMessage={q || cat ? 'Try a different search or category filter.' : canWrite ? 'Add your first book to build the library catalog.' : 'The catalog is empty for now.'}
        actions={canWrite ? (b) => (
          <>
            <Button variant="ghost" size="sm" leftIcon="edit" onClick={() => open(b)} aria-label={`Edit ${b.title}`}>Edit</Button>
            <Button variant="ghost" size="sm" leftIcon="x" onClick={() => setRemoving(b)} aria-label={`Delete ${b.title}`}>Delete</Button>
          </>
        ) : undefined}
      />

      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} icon="book" tone="gold"
        title={editing ? 'Edit book' : 'Add book'} size="md" dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!title.trim()} onClick={save}>Save</Button>
          </>
        }>
        <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Jungle Book" autoFocus /></Field>
        <div className="grid g-2">
          <Field label="Author" optional><Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Rudyard Kipling" /></Field>
          <Field label="ISBN" optional><Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-…" inputMode="numeric" /></Field>
        </div>
        <div className="grid g-2">
          <Field label="Category" optional>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select category"
              options={BOOK_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Language" optional><Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English" /></Field>
        </div>
        <Field label="Publisher" optional><Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Macmillan" /></Field>
        <div className="grid g-2">
          <Field label="Total copies" required hint={editing ? 'Available adjusts with the change' : undefined}>
            <Input type="number" inputMode="numeric" min={0} value={copiesTotal} onChange={(e) => setCopiesTotal(e.target.value)} />
          </Field>
          <Field label="Shelf" optional><Input value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="A-12" /></Field>
        </div>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} tone="danger" loading={busy}
        title="Delete book?" message={`"${removing?.title}" will be removed from the catalog. Existing circulation records are kept.`} confirmLabel="Delete" />
    </div>
  );
}
