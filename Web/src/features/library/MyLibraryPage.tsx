import { useMemo, useState } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { Tabs } from '@/components/Tabs';
import { Badge } from '@/components/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { formatDate } from '@/lib/format';
import { useCirculation } from '@/features/daily/data';
import { CIRCULATION_STATUS_META } from '@/features/daily/meta';
import type { BookCirculation } from '@/types/daily';
import { CatalogTab } from './CatalogTab';
import { isOverdue, daysOverdue } from './shared';

type TabId = 'browse' | 'mine';

/** Student view: read-only catalog + their own active loans. */
export function MyLibraryPage() {
  const { schoolId, member } = useSession();
  const [tab, setTab] = useState<TabId>('browse');
  const { data: records, loading, error } = useCirculation(schoolId);

  const studentId = member?.studentId;
  const mine = useMemo(
    () => records
      .filter((c) => c.borrowerId === studentId && c.status !== 'returned' && !c.returnedDate)
      .slice()
      .sort((a, b) => a.dueDate - b.dueDate),
    [records, studentId],
  );

  const columns: Column<BookCirculation>[] = [
    { key: 'book', header: 'Book', primary: true, render: (c) => <span style={{ fontWeight: 600 }}>{c.bookTitle ?? '—'}</span> },
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
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Library</h1>
          <p className="nx-page__sub">Browse the catalog and track the books you have borrowed.</p>
        </div>
      </div>

      <Tabs
        variant="line"
        aria-label="Library sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'browse', label: 'Browse', icon: 'search' },
          { id: 'mine', label: 'My books', icon: 'book', badge: mine.length || undefined },
        ]}
      >
        {(active) => (
          <>
            {active === 'browse' && <CatalogTab readOnly />}
            {active === 'mine' && (
              !studentId ? (
                <DataTable
                  columns={columns} rows={[]} rowKey={(c) => c.id}
                  emptyIcon="user" emptyTitle="No linked student"
                  emptyMessage="Your account is not linked to a student record yet. Ask your school to link it."
                />
              ) : (
                <DataTable
                  columns={columns} rows={mine} rowKey={(c) => c.id} loading={loading}
                  error={error ? 'Could not load your books.' : null}
                  emptyIcon="book" emptyTitle="No books borrowed"
                  emptyMessage="Books you borrow from the library will appear here with their due dates."
                />
              )
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
