import { Bx } from '../components/BxIcon'
import { Table } from '../../../components/Table'
import Shimmer from '../../../components/Shimmer'
import { TRACKING_STATUS_KEYS } from '../constants'

export function TrackingView({
  t,
  filters,
  setFilters,
  filteredData,
  columns,
  onOpenAddUpdateStandalone,
  loading = false,
  error = null,
  onRetry,
}) {
  return (
    <div className="cs-card">
      <div className="cs-card-header">
        <span className="cs-card-title">{t('customerServices.tracking.cardTitle')}</span>
        <button type="button" className="cs-btn cs-btn-outline cs-btn-sm" onClick={onOpenAddUpdateStandalone} disabled={loading}>
          <Bx name="bx-plus" className="cs-btn-icon" /> {t('customerServices.tracking.addUpdate')}
        </button>
      </div>
      <p className="cs-card-desc">{t('customerServices.tracking.cardDesc')}</p>
      <div className="cs-filter-bar">
        <input
          type="text"
          className="cs-input"
          placeholder={t('customerServices.tracking.searchBl')}
          value={filters.qBl}
          onChange={(e) => setFilters((f) => ({ ...f, qBl: e.target.value }))}
          disabled={loading}
        />
        <input
          type="text"
          className="cs-input"
          placeholder={t('customerServices.tracking.searchClient')}
          value={filters.qClient}
          onChange={(e) => setFilters((f) => ({ ...f, qClient: e.target.value }))}
          disabled={loading}
        />
        <select
          className="cs-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          disabled={loading}
        >
          <option value="">{t('customerServices.tracking.statusLabel')}</option>
          {Object.keys(TRACKING_STATUS_KEYS).map((k) => (
            <option key={k} value={k}>{t(TRACKING_STATUS_KEYS[k])}</option>
          ))}
        </select>
        <button type="button" className="cs-btn cs-btn-icon-only" onClick={() => setFilters({ qBl: '', qClient: '', status: '' })} aria-label={t('customerServices.clearFilters')} disabled={loading}>
          <Bx name="bx-reset" className="cs-btn-icon" />
        </button>
      </div>
      {loading ? (
        <Shimmer rows={5} className="cs-tracking-shimmer" />
      ) : error ? (
        <div className="cs-tracking-error">
          <p className="cs-text-muted">{error}</p>
          {onRetry && (
            <button type="button" className="cs-btn cs-btn-outline cs-btn-sm" onClick={onRetry}>
              {t('clients.retry')}
            </button>
          )}
        </div>
      ) : (
        <Table columns={columns} data={filteredData} getRowKey={(r) => r.id} emptyMessage={t('customerServices.empty')} />
      )}
    </div>
  )
}
