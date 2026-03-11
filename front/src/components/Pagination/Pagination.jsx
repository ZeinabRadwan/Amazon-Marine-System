import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination – navigate between pages in tables.
 * Previous / Next buttons + page number buttons.
 *
 * @param {number} currentPage - 1-based current page
 * @param {number} totalPages - Total number of pages
 * @param {(page: number) => void} onPageChange - Called with 1-based page number
 * @param {string} [className] - Optional class for the container
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  const safeCurrent = Math.max(1, Math.min(currentPage, totalPages))
  const hasPrev = safeCurrent > 1
  const hasNext = safeCurrent < totalPages

  const btnBase = `
    inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-lg
    text-sm font-medium
    border border-gray-200 bg-white text-gray-700
    shadow-sm
    transition-colors duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0039c5] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111827]
    disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
    hover:bg-gray-50 hover:border-gray-300
    dark:border-[#1F2937] dark:bg-[#1F2937] dark:text-gray-300 dark:hover:bg-[#374151] dark:hover:border-[#374151]
  `
  const btnActive = `
    !bg-[#0039c5] !border-[#0039c5] !text-white
    dark:!bg-blue-500 dark:!border-blue-500 dark:!text-white
    hover:!bg-[#0030a0] hover:!border-[#0030a0] dark:hover:!bg-blue-600 dark:hover:!border-blue-600
  `

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = []
    if (safeCurrent <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('ellipsis')
      pages.push(totalPages)
    } else if (safeCurrent >= totalPages - 3) {
      pages.push(1)
      pages.push('ellipsis')
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('ellipsis')
      for (let i = safeCurrent - 1; i <= safeCurrent + 1; i++) pages.push(i)
      pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  if (totalPages < 1) return null

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-2 rounded-lg ${className}`.trim()}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange?.(safeCurrent - 1)}
        disabled={!hasPrev}
        className={btnBase}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, i) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-9 min-w-[2.25rem] items-center justify-center px-1 text-gray-500 dark:text-gray-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange?.(page)}
              className={`${btnBase} ${page === safeCurrent ? btnActive : ''}`}
              aria-label={page === safeCurrent ? `Page ${page}, current page` : `Go to page ${page}`}
              aria-current={page === safeCurrent ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => onPageChange?.(safeCurrent + 1)}
        disabled={!hasNext}
        className={btnBase}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  )
}
