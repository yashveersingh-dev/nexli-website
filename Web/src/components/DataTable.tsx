import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Button } from '@/components/Button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Omit this column from the mobile card layout. */
  hideOnMobile?: boolean;
  /** Use this column's value as the card title on mobile (first one wins). */
  primary?: boolean;
  /** Truncate long content with ellipsis (desktop cell). */
  truncate?: boolean;
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: ReactNode;
  emptyIcon?: IconName;
  /** Row actions, shown in a trailing cell (desktop) / card footer (mobile). */
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  /** Toolbar rendered above the table (search/filters). */
  toolbar?: ReactNode;
  pagination?: PaginationProps;
  caption?: string;
}

function cellValue<T>(col: Column<T>, row: T): ReactNode {
  if (col.render) return col.render(row);
  return (row as Record<string, unknown>)[col.key] as ReactNode;
}

const alignClass = (a?: Column<unknown>['align']) =>
  a === 'right' ? 'ta-right' : a === 'center' ? 'ta-center' : undefined;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyIcon = 'info',
  actions,
  onRowClick,
  toolbar,
  pagination,
  caption,
}: DataTableProps<T>) {
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const cardCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile);

  return (
    <div>
      {toolbar}

      {error ? (
        <EmptyState
          icon="alert-triangle"
          title="Couldn't load this"
          message={error}
          action={onRetry ? <Button variant="subtle" leftIcon="refresh" onClick={onRetry}>Try again</Button> : undefined}
        />
      ) : loading ? (
        <LoadingState columns={columns} />
      ) : rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
      ) : (
        <>
          {/* Desktop table (≥1024) */}
          <div className="nx-dt-tablewrap">
            <table className={cn('nx-dt', onRowClick && 'nx-dt--clickable')}>
              {caption && <caption className="sr-only">{caption}</caption>}
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={alignClass(c.align)}>
                      {c.header}
                    </th>
                  ))}
                  {actions && <th className="ta-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn(alignClass(c.align), c.truncate && 'nx-dt__truncate')}>
                        {cellValue(c, row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="ta-right" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone/tablet cards (<1024) */}
          <div className="nx-dt-cards">
            {rows.map((row) => (
              <div
                key={rowKey(row)}
                className={cn('nx-dtc', onRowClick && 'nx-dtc--clickable')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                <div className="nx-dtc__head">
                  <div className="nx-dtc__title">{cellValue(primaryCol, row)}</div>
                </div>
                <div className="nx-dtc__body">
                  {cardCols.map((c) => (
                    <div className="nx-dtc__row" key={c.key}>
                      <span className="nx-dtc__label">{c.header}</span>
                      <span className="nx-dtc__value">{cellValue(c, row)}</span>
                    </div>
                  ))}
                </div>
                {actions && (
                  <div className="nx-dtc__foot" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {pagination && pagination.total > 0 && !loading && !error && <Pager {...pagination} />}
    </div>
  );
}

function LoadingState<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <>
      <div className="nx-dt-tablewrap">
        <table className="nx-dt">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={alignClass(c.align)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, r) => (
              <tr key={r}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <Skeleton height={12} width={c.primary ? '70%' : '50%'} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="nx-dt-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="nx-dtc" key={i}>
            <Skeleton height={14} width="60%" />
            <div className="nx-dtc__body">
              <Skeleton height={11} width="90%" style={{ marginBottom: 8 }} />
              <Skeleton height={11} width="75%" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Pagination control (reuses the reference .pager styling). */
export function Pager({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Windowed page numbers: 1 … (p-1) p (p+1) … last
  const nums: (number | '…')[] = [];
  const add = (n: number) => nums.push(n);
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) add(i);
  } else {
    add(1);
    if (page > 3) nums.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) add(i);
    if (page < pages - 2) nums.push('…');
    add(pages);
  }

  return (
    <div className="pager">
      <div className="pager__info">
        Showing {from}–{to} of {total}
      </div>
      <div className="pager__nav">
        <button className="pager__btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <Icon name="chevron-left" size={12} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="pager__btn" aria-hidden="true">…</span>
          ) : (
            <button
              key={n}
              className={cn('pager__btn', n === page && 'active')}
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          ),
        )}
        <button className="pager__btn" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <Icon name="chevron-right" size={12} />
        </button>
      </div>
    </div>
  );
}
