import { Bx } from '../components/BxIcon'
import { Table } from '../../../components/Table'
import Shimmer from '../../../components/Shimmer'

export function CommsView({
  t,
  filters,
  setFilters,
  filteredData,
  columns,
  onAddComms,
  loading = false,
  error = null,
  onRetry,
}) {
  return (
    <div className="cs-card">
      <div className="cs-card-header">
        <span className="cs-card-title">{t('customerServices.comms.cardTitle')}</span>
        <button type="button" className="cs-btn cs-btn-primary cs-btn-sm" onClick={onAddComms} disabled={loading}>
          <Bx name="bx-plus" className="cs-btn-icon" /> {t('customerServices.comms.addLog')}
        </button>
      </div>
      <div className="cs-filter-bar">
        <input
          type="text"
          className="cs-input"
          placeholder={t('customerServices.comms.searchPlaceholder')}
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          disabled={loading}
        />
        <select className="cs-select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} disabled={loading}>
          <option value="">{t('customerServices.comms.commsType')}</option>
          <option value="call">{t('customerServices.comms.typeCall')}</option>
          <option value="whatsapp">{t('customerServices.comms.typeWhatsapp')}</option>
          <option value="email">{t('customerServices.comms.typeEmail')}</option>
          <option value="meeting">{t('customerServices.comms.typeMeeting')}</option>
          <option value="note">{t('customerServices.comms.typeNote')}</option>
        </select>
        <select className="cs-select" value={filters.related} onChange={(e) => setFilters((f) => ({ ...f, related: e.target.value }))} disabled={loading}>
          <option value="">{t('customerServices.comms.relatedTo')}</option>
          <option value="client">{t('customerServices.comms.relatedClient')}</option>
          <option value="shipment">{t('customerServices.comms.relatedShipment')}</option>
          <option value="ticket">{t('customerServices.comms.relatedTicket')}</option>
        </select>
        <button type="button" className="cs-btn cs-btn-icon-only" onClick={() => setFilters({ q: '', type: '', related: '' })} aria-label={t('customerServices.clearFilters')} disabled={loading}>
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
