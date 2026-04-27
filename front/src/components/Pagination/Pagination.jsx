import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Pagination.css'

/**
 * Pagination – navigate between pages in tables.
 * Previous / Next buttons + page number buttons.
 * Responsive: on narrow screens shows Prev + "Page X of Y" + Next.
 * Localized aria-labels and summary text.
 *
 * @param {number} currentPage - 1-based current page
 * @param {number} totalPages - Total number of pages
 * @param {(page: number) => void} onPageChange - Called with 1-based page number
 * @param {string} [className] - Optional class for the container
 * @param {boolean} [disabled] - Disable all controls (e.g. while list is loading)
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
  disabled = false,
}) {
  const { t } = useTranslation()
  const safeCurrent = Math.max(1, Math.min(currentPage, totalPages))
  const hasPrev = safeCurrent > 1
  const hasNext = safeCurrent < totalPages
  const isDisabled = Boolean(disabled)

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
      className={`pagination ${className}`.trim()}
      aria-label={t('pagination.ariaLabel')}
    >
      <button
        type="button"
        onClick={() => onPageChange?.(safeCurrent - 1)}
        disabled={isDisabled || !hasPrev}
        className="pagination__btn"
        aria-label={t('pagination.prev')}
      >
        <ChevronLeft className="pagination__icon pagination__icon--prev" aria-hidden />
      </button>

      <span className="pagination__summary" aria-live="polite">
        {t('pagination.pageOfTotal', { current: safeCurrent, total: totalPages })}
      </span>

      <div className="pagination__group pagination__pages">
        {getPageNumbers().map((page, i) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="pagination__ellipsis"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange?.(page)}
              disabled={isDisabled}
              className={`pagination__page ${page === safeCurrent ? 'pagination__page--current' : ''}`}
              aria-label={page === safeCurrent ? t('pagination.currentPage', { num: page }) : t('pagination.goToPage', { num: page })}
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
        disabled={isDisabled || !hasNext}
        className="pagination__btn"
        aria-label={t('pagination.next')}
      >
        <ChevronRight className="pagination__icon pagination__icon--next" aria-hidden />
      </button>
    </nav>
  )
}
