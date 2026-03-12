import { useTranslation } from 'react-i18next'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import './Table.css'

/**
 * Responsive Table – desktop table + mobile card list.
 * Localized empty message and sort labels. Sortable column headers (except last column).
 *
 * Props:
 *   - columns: Array<{ key: string, label: string, render?: (value, row) => ReactNode, hideOnMobile?: boolean, sortable?: boolean, sortKey?: string }>  (sortKey used for onSort when different from key, e.g. API param)
 *   - data: array of row objects
 *   - getRowKey: (row) => string | number
 *   - emptyMessage?: ReactNode (defaults to localized "No data.")
 *   - sortKey?: string – key of column currently sorted
 *   - sortDirection?: 'asc' | 'desc'
 *   - onSort?: (key: string, direction: 'asc' | 'desc') => void
 *   - className?: string
 */
export default function Table({
  columns = [],
  data = [],
  getRowKey = (row) => row.id ?? row.key,
  emptyMessage,
  sortKey,
  sortDirection = 'asc',
  onSort,
  className = '',
}) {
  const { t } = useTranslation()
  const defaultEmpty = t('table.empty')
  const visibleColumns = columns.filter((col) => !col.hideOnMobile)

  const handleSort = (colKey) => {
    if (!onSort) return
    const nextDirection = sortKey === colKey && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(colKey, nextDirection)
  }

  if (data.length === 0) {
    return (
      <div
        className={`responsive-table__empty rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 ${className}`.trim()}
        role="status"
      >
        {emptyMessage ?? defaultEmpty}
      </div>
    )
  }

  return (
    <div className={`responsive-table ${className}`.trim()}>
      {/* Desktop (md+): table with horizontal scroll */}
      <div className="responsive-table__scroll hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 md:block">
        <table className="responsive-table__table w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col, index) => {
                const isLast = index === columns.length - 1
                const colSortKey = col.sortKey ?? col.key
                const sortable = !isLast && col.sortable !== false && !!onSort
                const isSorted = sortKey === colSortKey

                return (
                  <th
                    key={col.key}
                    className="responsive-table__th whitespace-nowrap border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200"
                    aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(colSortKey)}
                        className="responsive-table__sort-btn inline-flex items-center gap-1.5 text-left font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                        aria-label={
                          isSorted
                            ? sortDirection === 'asc'
                              ? t('table.sortedAsc', { column: col.label })
                              : t('table.sortedDesc', { column: col.label })
                            : t('table.sortable')
                        }
                      >
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="responsive-table__sort-icon h-4 w-4 shrink-0" aria-hidden />
                          ) : (
                            <ChevronDown className="responsive-table__sort-icon h-4 w-4 shrink-0" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="responsive-table__sort-icon h-4 w-4 shrink-0 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowKey(row)}
                className="responsive-table__tr border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="responsive-table__td border-b border-gray-100 px-4 py-3 text-gray-800 last:border-b-0 dark:border-gray-700 dark:text-gray-200"
                    data-label={col.label}
                  >
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile (< md): card list */}
      <div className="responsive-table__cards space-y-3 md:hidden">
        {data.map((row) => (
          <div
            key={getRowKey(row)}
            className="responsive-table__card rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            {visibleColumns.map((col) => (
              <div
                key={col.key}
                className="responsive-table__card-row flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 py-2 last:border-b-0 last:pb-0 first:pt-0 dark:border-gray-700"
              >
                <span className="responsive-table__card-label text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {col.label}
                </span>
                <span className="responsive-table__card-value min-w-0 flex-1 text-end text-sm text-gray-800 dark:text-gray-200">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
