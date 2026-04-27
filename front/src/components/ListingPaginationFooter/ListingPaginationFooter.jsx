import { useTranslation } from 'react-i18next'
import Pagination from '../Pagination'
import '../../pages/Clients/Clients.css'

/**
 * Total count + optional page-size selector + shared Pagination (prev / page numbers / next).
 * Uses `clients-pagination` layout from Clients.css.
 */
export default function ListingPaginationFooter({
  meta,
  loading = false,
  onPageChange,
  onPerPageChange,
  pageSize,
  perPageOptions = [10, 12, 25, 50],
}) {
  const { t } = useTranslation()

  if (!meta) return null

  const total = Number(meta.total) || 0
  const currentPage = Math.max(1, Number(meta.current_page) || 1)
  const lastPage = Math.max(1, Number(meta.last_page) || 1)
  const metaPer = Number(meta.per_page)
  const fromMeta = Number.isFinite(metaPer) && metaPer > 0 ? metaPer : null
  const selectValue =
    typeof pageSize === 'number' && pageSize > 0 ? pageSize : fromMeta ?? perPageOptions[0]

  return (
    <div className="clients-pagination listing-pagination-footer">
      <div className="clients-pagination__left">
        <span className="clients-pagination__total">
          {t('pricing.pagingSummary', {
            count: total,
            page: currentPage,
            pages: lastPage,
          })}
        </span>
        {typeof onPerPageChange === 'function' ? (
          <label className="clients-pagination__per-page">
            <span className="clients-pagination__per-page-label">{t('pricing.perPage')}</span>
            <select
              value={String(selectValue)}
              disabled={loading}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="clients-select clients-pagination__select"
            >
              {perPageOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={lastPage}
        onPageChange={onPageChange}
        disabled={loading}
      />
    </div>
  )
}
