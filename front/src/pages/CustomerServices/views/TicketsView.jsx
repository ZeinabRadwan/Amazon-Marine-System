import { Bx } from '../components/BxIcon'
import { Table } from '../../../components/Table'
import Shimmer from '../../../components/Shimmer'

export function TicketsView({
  t,
  filters,
  setFilters,
  filteredData,
  columns,
  onNewTicket,
  loading = false,
  error = null,
  onRetry,
  ticketStats = null,
}) {
  return (
    <div className="cs-card">
      <div className="cs-card-header">
        <span className="cs-card-title">{t('customerServices.tickets.cardTitle')}</span>
        <button type="button" className="cs-btn cs-btn-primary cs-btn-sm" onClick={onNewTicket} disabled={loading}>
          <Bx name="bx-plus" className="cs-btn-icon" /> {t('customerServices.tickets.newTicket')}
        </button>
      </div>
      <p className="cs-card-desc">{t('customerServices.tickets.cardDesc')}</p>
      {ticketStats && (
        <div className="cs-stats-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span className="cs-text-muted cs-fs-sm">{t('customerServices.tickets.statsOpen')}: <strong>{ticketStats.open}</strong></span>
          <span className="cs-text-muted cs-fs-sm">{t('customerServices.tickets.statsPending')}: <strong>{ticketStats.pending}</strong></span>
          <span className="cs-text-muted cs-fs-sm">{t('customerServices.tickets.statsResolvedToday')}: <strong>{ticketStats.resolved_today}</strong></span>
          <span className="cs-text-muted cs-fs-sm">{t('customerServices.tickets.statsSlaPct')}: <strong>{ticketStats.sla_response_pct}%</strong></span>
        </div>
      )}
      <div className="cs-filter-bar">
        <input
          type="text"
          className="cs-input"
          placeholder={t('customerServices.tickets.searchPlaceholder')}
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          disabled={loading}
        />
        <select className="cs-select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} disabled={loading}>
          <option value="">{t('customerServices.tickets.type')}</option>
          <option value="inquiry">{t('customerServices.tickets.typeInquiry')}</option>
          <option value="complaint">{t('customerServices.tickets.typeComplaint')}</option>
          <option value="request">{t('customerServices.tickets.typeRequest')}</option>
        </select>
        <select className="cs-select" value={filters.assigned} onChange={(e) => setFilters((f) => ({ ...f, assigned: e.target.value }))} disabled={loading}>
          <option value="">{t('customerServices.tickets.assignedTo')}</option>
          <option value="cs">{t('customerServices.tickets.assignedCs')}</option>
          <option value="operations">{t('customerServices.tickets.assignedOperations')}</option>
          <option value="sales">{t('customerServices.tickets.assignedSales')}</option>
          <option value="accounting">{t('customerServices.tickets.assignedAccounting')}</option>
        </select>
        <select className="cs-select" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} disabled={loading}>
          <option value="">{t('customerServices.fields.status')}</option>
          <option value="open">{t('customerServices.statusOpen')}</option>
          <option value="in_progress">{t('customerServices.tickets.statusInProgress')}</option>
          <option value="waiting">{t('customerServices.tickets.statusWaiting')}</option>
          <option value="closed">{t('customerServices.statusClosed')}</option>
        </select>
        <select className="cs-select" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} disabled={loading}>
          <option value="">{t('customerServices.tickets.priority')}</option>
          <option value="low">{t('customerServices.tickets.priorityLow')}</option>
          <option value="medium">{t('customerServices.tickets.priorityMedium')}</option>
          <option value="high">{t('customerServices.tickets.priorityHigh')}</option>
        </select>
        <button type="button" className="cs-btn cs-btn-icon-only" onClick={() => setFilters({ q: '', type: '', assigned: '', status: '', priority: '' })} aria-label={t('customerServices.clearFilters')} disabled={loading}>
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
