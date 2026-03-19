import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Search, RotateCcw, ArrowUpDown, ChevronDown, ChevronUp, FileSpreadsheet, Inbox, Clock, CheckCircle, Percent } from 'lucide-react'
import { Container } from '../../components/Container'
import { StatsCard } from '../../components/StatsCard'
import Tabs from '../../components/Tabs'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { Table } from '../../components/Table'
import Pagination from '../../components/Pagination'
import { useCustomerServicesState } from './hooks/useCustomerServicesState'
import {
  AddShipmentUpdateModal,
  SendToClientModal,
  ViewShipmentModal,
  NewTicketModal,
  ReplyTicketModal,
  AddCommsLogModal,
} from './components/modals'
import { TRACKING_STATUS_KEYS } from './constants'
import '../../components/LoaderDots/LoaderDots.css'
import '../../components/Tabs/Tabs.css'
import '../../components/PageHeader/PageHeader.css'
import '../Clients/Clients.css'
import './styles/CustomerServices.css'
import '../Clients/ClientDetailModal.css'

export default function CustomerServices() {
  const { i18n } = useTranslation()
  const [showSortTracking, setShowSortTracking] = useState(false)
  const [showSortTickets, setShowSortTickets] = useState(false)
  const [showSortComms, setShowSortComms] = useState(false)

  const state = useCustomerServicesState()
  const {
    t,
    activeTab,
    setActiveTab,
    alert,
    setAlert,
    csTabs,
    isBusy,
    // Tracking
    trackingLoading,
    trackingError,
    refetchTracking,
    trackingFilters,
    setTrackingFilters,
    paginatedTracking,
    trackingPagination,
    trackingColumns,
    showAddUpdate,
    setShowAddUpdate,
    addUpdateRow,
    setAddUpdateRow,
    addUpdateBl,
    setAddUpdateBl,
    addUpdateText,
    setAddUpdateText,
    openAddUpdate,
    showSendToClient,
    setShowSendToClient,
    sendToClientRow,
    setSendToClientRow,
    sendChannel,
    setSendChannel,
    sendTemplate,
    setSendTemplate,
    sendMessage,
    setSendMessage,
    handleSaveAddUpdate,
    handleSendToClient,
    trackingSubmitting,
    viewShipmentRow,
    viewTrackingUpdates,
    viewTrackingLoading,
    closeViewShipment,
    // Tickets
    ticketsLoading,
    ticketsError,
    refetchTickets,
    ticketFilters,
    setTicketFilters,
    paginatedTickets,
    ticketPagination,
    ticketColumns,
    ticketTypes,
    ticketStats,
    clientsForTicket,
    usersForTicket,
    clientShipmentsForTicket,
    showNewTicket,
    setShowNewTicket,
    newTicketForm,
    setNewTicketForm,
    handleCreateTicket,
    showReplyTicket,
    setShowReplyTicket,
    setReplyTicketId,
    replyTicket,
    replyForm,
    setReplyForm,
    handleReplyTicket,
    handleDeleteTicket,
    handleDeleteTicketConfirm,
    deleteTicketId,
    setDeleteTicketId,
    deleteTicketSubmitting,
    ticketSubmitting,
    ticketExportLoading,
    handleExportTickets,
    ticketStatusKey,
    // Comms
    commsLoading,
    commsError,
    refetchComms,
    commsFilters,
    setCommsFilters,
    paginatedComms,
    commsPagination,
    commsColumns,
    showAddComms,
    setShowAddComms,
    commsForm,
    setCommsForm,
    handleSaveCommsLog,
    commsSubmitting,
    clientsForComms,
  } = state

  const closeAddUpdate = () => {
    setShowAddUpdate(false)
    setAddUpdateRow(null)
  }
  const closeSendToClient = () => {
    setShowSendToClient(false)
    setSendToClientRow(null)
  }
  const closeReplyTicket = () => {
    setShowReplyTicket(false)
    setReplyTicketId(null)
  }

  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

  const renderTrackingPanel = () => {
    const loading = trackingLoading
    const error = trackingError
    const list = paginatedTracking
    const pagination = trackingPagination
    const filters = trackingFilters
    const setFilters = setTrackingFilters

    return (
      <>
        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={dir}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('customerServices.tracking.searchBl')}
                value={filters.qBl}
                onChange={(e) => setFilters((f) => ({ ...f, qBl: e.target.value, page: 1 }))}
                className="clients-input clients-filters__search"
                aria-label={t('customerServices.tracking.searchBl')}
              />
            </div>
            <div className="clients-filters__fields">
              <input
                type="text"
                placeholder={t('customerServices.tracking.searchClient')}
                value={filters.qClient}
                onChange={(e) => setFilters((f) => ({ ...f, qClient: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.tracking.client')}
              />
              <select
                value={filters.status ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.tracking.statusLabel')}
              >
                <option value="">{t('customerServices.tracking.statusLabel')}</option>
                {Object.keys(TRACKING_STATUS_KEYS).map((k) => (
                  <option key={k} value={k}>{t(TRACKING_STATUS_KEYS[k])}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={() => setFilters({ qBl: '', qClient: '', status: '', sort: 'bl_number', direction: 'asc', page: 1, per_page: filters.per_page })}
              aria-label={t('customerServices.clearFilters')}
              title={t('customerServices.clearFilters')}
            >
              <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            <button
              type="button"
              className="clients-filters__sort-toggle clients-filters__btn-icon"
              onClick={() => setShowSortTracking((v) => !v)}
              aria-expanded={showSortTracking}
              aria-controls="cs-tracking-sort-panel"
              id="cs-tracking-sort-toggle"
              title={t('clients.sortBy', 'Sort by')}
            >
              <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
              {showSortTracking ? <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />}
            </button>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={() => openAddUpdate(null)}
                disabled={loading}
              >
                {t('customerServices.tracking.addUpdate')}
              </button>
            </div>
          </div>
          <div
            id="cs-tracking-sort-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="cs-tracking-sort-toggle"
            hidden={!showSortTracking}
          >
            <div className="clients-filters__sort-group">
              <label className="clients-filters__sort-label" htmlFor="cs-tracking-sort-by">
                {t('clients.sortBy', 'Sort by')}
              </label>
              <select
                id="cs-tracking-sort-by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
                className="clients-select"
                aria-label={t('clients.sortBy', 'Sort by')}
              >
                <option value="bl_number">{t('customerServices.tracking.blNumber')}</option>
                <option value="client">{t('customerServices.tracking.client')}</option>
                <option value="route">{t('customerServices.tracking.route')}</option>
                <option value="status">{t('customerServices.tracking.statusCustomerView')}</option>
                <option value="last_update">{t('customerServices.tracking.lastUpdate')}</option>
              </select>
              <select
                value={filters.direction}
                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value, page: 1 }))}
                className="clients-select clients-filters__direction"
                aria-label={t('clients.sortOrder', 'Sort order')}
              >
                <option value="asc">{t('clients.directionAsc', 'Ascending')}</option>
                <option value="desc">{t('clients.directionDesc', 'Descending')}</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="cs-loading-wrap">
            <LoaderDots />
          </div>
        ) : error ? (
          <div className="clients-error">
            <p>{error}</p>
            <button type="button" className="clients-btn" onClick={refetchTracking}>
              {t('clients.retry', 'Retry')}
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="clients-empty">{t('customerServices.empty')}</p>
        ) : (
          <>
            <Table
              columns={trackingColumns}
              data={list}
              getRowKey={(r) => r.id}
              emptyMessage={t('customerServices.empty')}
              sortKey={filters.sort}
              sortDirection={filters.direction}
              onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction, page: 1 }))}
            />
            {pagination.last_page > 0 && (
              <div className="clients-pagination">
                <div className="clients-pagination__left">
                  <span className="clients-pagination__total">
                    {t('clients.total', 'Total')}: {pagination.total}
                  </span>
                  <label className="clients-pagination__per-page">
                    <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
                    <select
                      value={filters.per_page}
                      onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                      className="clients-select clients-pagination__select"
                      aria-label={t('clients.perPage', 'Per page')}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={Math.max(1, pagination.last_page)}
                  onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                />
              </div>
            )}
          </>
        )}
      </>
    )
  }

  const renderTicketsPanel = () => {
    const loading = ticketsLoading
    const error = ticketsError
    const list = paginatedTickets
    const pagination = ticketPagination
    const filters = ticketFilters
    const setFilters = setTicketFilters

    return (
      <>
        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={dir}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('customerServices.tickets.searchPlaceholder')}
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
                className="clients-input clients-filters__search"
                aria-label={t('customerServices.search', 'Search')}
              />
            </div>
            <div className="clients-filters__fields">
              <select
                value={filters.type ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.tickets.type')}
              >
                <option value="">{t('customerServices.tickets.type')}</option>
                <option value="inquiry">{t('customerServices.tickets.typeInquiry')}</option>
                <option value="complaint">{t('customerServices.tickets.typeComplaint')}</option>
                <option value="request">{t('customerServices.tickets.typeRequest')}</option>
              </select>
              <select
                value={filters.assigned_to_id ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, assigned_to_id: e.target.value ? Number(e.target.value) : '', page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.tickets.assignedTo')}
              >
                <option value="">{t('customerServices.tickets.assignedTo')}</option>
                {(usersForTicket || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email ?? `#${u.id}`}
                  </option>
                ))}
              </select>
              <select
                value={filters.client_id ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value ? Number(e.target.value) : '', page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.tickets.client', 'Client')}
              >
                <option value="">{t('customerServices.tickets.client', 'Client')}</option>
                {(clientsForTicket || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.company_name ?? c.email ?? `#${c.id}`}
                  </option>
                ))}
              </select>
              <select
                value={filters.status ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.fields.status')}
              >
                <option value="">{t('customerServices.fields.status')}</option>
                <option value="open">{t('customerServices.statusOpen')}</option>
                <option value="in_progress">{t('customerServices.tickets.statusInProgress')}</option>
                <option value="waiting">{t('customerServices.tickets.statusWaiting')}</option>
                <option value="closed">{t('customerServices.statusClosed')}</option>
              </select>
              <select
                value={filters.priority ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.tickets.priority')}
              >
                <option value="">{t('customerServices.tickets.priority')}</option>
                <option value="low">{t('customerServices.tickets.priorityLow')}</option>
                <option value="medium">{t('customerServices.tickets.priorityMedium')}</option>
                <option value="high">{t('customerServices.tickets.priorityHigh')}</option>
              </select>
            </div>
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={() => setFilters({ q: '', type: '', assigned: '', status: '', priority: '', client_id: '', assigned_to_id: '', sort: 'date', direction: 'desc', page: 1, per_page: filters.per_page })}
              aria-label={t('customerServices.clearFilters')}
              title={t('customerServices.clearFilters')}
            >
              <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            <button
              type="button"
              className="clients-filters__sort-toggle clients-filters__btn-icon"
              onClick={() => setShowSortTickets((v) => !v)}
              aria-expanded={showSortTickets}
              aria-controls="cs-tickets-sort-panel"
              id="cs-tickets-sort-toggle"
              title={t('clients.sortBy', 'Sort by')}
            >
              <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
              {showSortTickets ? <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />}
            </button>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={handleExportTickets}
                disabled={ticketExportLoading}
                aria-label={t('pageHeader.export', 'Export')}
                title={t('pageHeader.export', 'Export')}
              >
                {ticketExportLoading ? (
                  <span className="clients-filters__export-spinner" aria-hidden />
                ) : (
                  <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={() => setShowNewTicket(true)}
                disabled={loading}
              >
                {t('customerServices.tickets.newTicket')}
              </button>
            </div>
          </div>
          <div
            id="cs-tickets-sort-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="cs-tickets-sort-toggle"
            hidden={!showSortTickets}
          >
            <div className="clients-filters__sort-group">
              <label className="clients-filters__sort-label" htmlFor="cs-tickets-sort-by">
                {t('clients.sortBy', 'Sort by')}
              </label>
              <select
                id="cs-tickets-sort-by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
                className="clients-select"
                aria-label={t('clients.sortBy', 'Sort by')}
              >
                <option value="ticket_number">{t('customerServices.tickets.ticketNumber')}</option>
                <option value="client">{t('customerServices.tracking.client')}</option>
                <option value="date">{t('customerServices.tickets.date')}</option>
                <option value="status">{t('customerServices.fields.status')}</option>
              </select>
              <select
                value={filters.direction}
                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value, page: 1 }))}
                className="clients-select clients-filters__direction"
                aria-label={t('clients.sortOrder', 'Sort order')}
              >
                <option value="asc">{t('clients.directionAsc', 'Ascending')}</option>
                <option value="desc">{t('clients.directionDesc', 'Descending')}</option>
              </select>
            </div>
          </div>
        </div>

        {ticketStats && typeof ticketStats === 'object' && (
          <div className="clients-stats-grid" style={{ marginBottom: '1.5rem' }}>
            <StatsCard
              title={t('customerServices.tickets.statsOpen')}
              value={ticketStats.open ?? 0}
              icon={<Inbox className="h-6 w-6" />}
              variant="blue"
            />
            <StatsCard
              title={t('customerServices.tickets.statsPending')}
              value={ticketStats.pending ?? 0}
              icon={<Clock className="h-6 w-6" />}
              variant="amber"
            />
            <StatsCard
              title={t('customerServices.tickets.statsResolvedToday')}
              value={ticketStats.resolved_today ?? 0}
              icon={<CheckCircle className="h-6 w-6" />}
              variant="green"
            />
            <StatsCard
              title={t('customerServices.tickets.statsSlaPct')}
              value={ticketStats.sla_response_pct != null ? `${ticketStats.sla_response_pct}%` : '—'}
              icon={<Percent className="h-6 w-6" />}
              variant="default"
            />
          </div>
        )}

        {loading ? (
          <div className="cs-loading-wrap">
            <LoaderDots />
          </div>
        ) : error ? (
          <div className="clients-error">
            <p>{error}</p>
            <button type="button" className="clients-btn" onClick={refetchTickets}>
              {t('clients.retry', 'Retry')}
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="clients-empty">{t('customerServices.empty')}</p>
        ) : (
          <>
            <Table
              columns={ticketColumns}
              data={list}
              getRowKey={(r) => r.id}
              emptyMessage={t('customerServices.empty')}
              sortKey={filters.sort}
              sortDirection={filters.direction}
              onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction, page: 1 }))}
            />
            {pagination.last_page > 0 && (
              <div className="clients-pagination">
                <div className="clients-pagination__left">
                  <span className="clients-pagination__total">
                    {t('clients.total', 'Total')}: {pagination.total}
                  </span>
                  <label className="clients-pagination__per-page">
                    <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
                    <select
                      value={filters.per_page}
                      onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                      className="clients-select clients-pagination__select"
                      aria-label={t('clients.perPage', 'Per page')}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={Math.max(1, pagination.last_page)}
                  onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                />
              </div>
            )}
          </>
        )}
      </>
    )
  }

  const renderCommsPanel = () => {
    const loading = commsLoading
    const error = commsError
    const list = paginatedComms
    const pagination = commsPagination
    const filters = commsFilters
    const setFilters = setCommsFilters

    return (
      <>
        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={dir}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('customerServices.comms.searchPlaceholder')}
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
                className="clients-input clients-filters__search"
                aria-label={t('customerServices.search', 'Search')}
              />
            </div>
            <div className="clients-filters__fields">
              <select
                value={filters.type ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.comms.commsType')}
              >
                <option value="">{t('customerServices.comms.commsType')}</option>
                <option value="call">{t('customerServices.comms.typeCall')}</option>
                <option value="whatsapp">{t('customerServices.comms.typeWhatsapp')}</option>
                <option value="email">{t('customerServices.comms.typeEmail')}</option>
                <option value="meeting">{t('customerServices.comms.typeMeeting')}</option>
                <option value="note">{t('customerServices.comms.typeNote')}</option>
              </select>
              <select
                value={filters.related ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, related: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('customerServices.comms.relatedTo')}
              >
                <option value="">{t('customerServices.comms.relatedTo')}</option>
                <option value="client">{t('customerServices.comms.relatedClient')}</option>
                <option value="shipment">{t('customerServices.comms.relatedShipment')}</option>
                <option value="ticket">{t('customerServices.comms.relatedTicket')}</option>
              </select>
            </div>
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={() => setFilters({ q: '', type: '', related: '', client_id: '', sort: 'date_time', direction: 'desc', page: 1, per_page: filters.per_page })}
              aria-label={t('customerServices.clearFilters')}
              title={t('customerServices.clearFilters')}
            >
              <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            <button
              type="button"
              className="clients-filters__sort-toggle clients-filters__btn-icon"
              onClick={() => setShowSortComms((v) => !v)}
              aria-expanded={showSortComms}
              aria-controls="cs-comms-sort-panel"
              id="cs-comms-sort-toggle"
              title={t('clients.sortBy', 'Sort by')}
            >
              <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
              {showSortComms ? <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />}
            </button>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={() => setShowAddComms(true)}
                disabled={loading}
              >
                {t('customerServices.comms.addLog')}
              </button>
            </div>
          </div>
          <div
            id="cs-comms-sort-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="cs-comms-sort-toggle"
            hidden={!showSortComms}
          >
            <div className="clients-filters__sort-group">
              <label className="clients-filters__sort-label" htmlFor="cs-comms-sort-by">
                {t('clients.sortBy', 'Sort by')}
              </label>
              <select
                id="cs-comms-sort-by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
                className="clients-select"
                aria-label={t('clients.sortBy', 'Sort by')}
              >
                <option value="date_time">{t('customerServices.comms.dateTime')}</option>
                <option value="type">{t('customerServices.comms.commsType')}</option>
                <option value="subject">{t('customerServices.comms.subjectSummary')}</option>
              </select>
              <select
                value={filters.direction}
                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value, page: 1 }))}
                className="clients-select clients-filters__direction"
                aria-label={t('clients.sortOrder', 'Sort order')}
              >
                <option value="asc">{t('clients.directionAsc', 'Ascending')}</option>
                <option value="desc">{t('clients.directionDesc', 'Descending')}</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="cs-loading-wrap">
            <LoaderDots />
          </div>
        ) : error ? (
          <div className="clients-error">
            <p>{error}</p>
            <button type="button" className="clients-btn" onClick={refetchComms}>
              {t('clients.retry', 'Retry')}
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="clients-empty">{t('customerServices.empty')}</p>
        ) : (
          <>
            <Table
              columns={commsColumns}
              data={list}
              getRowKey={(r) => r.id}
              emptyMessage={t('customerServices.empty')}
              sortKey={filters.sort}
              sortDirection={filters.direction}
              onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction, page: 1 }))}
            />
            {pagination.last_page > 0 && (
              <div className="clients-pagination">
                <div className="clients-pagination__left">
                  <span className="clients-pagination__total">
                    {t('clients.total', 'Total')}: {pagination.total}
                  </span>
                  <label className="clients-pagination__per-page">
                    <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
                    <select
                      value={filters.per_page}
                      onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                      className="clients-select clients-pagination__select"
                      aria-label={t('clients.perPage', 'Per page')}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={Math.max(1, pagination.last_page)}
                  onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                />
              </div>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <Container size="xl">
      <div className="customer-services-page cs-page-enter">
        {isBusy && (
          <div className="customer-services-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <div className="cs-tabs-wrap">
          <Tabs tabs={csTabs} activeTab={activeTab} onChange={setActiveTab} className="cs-tabs" />
        </div>

        {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <div role="tabpanel" id="panel-tracking" aria-labelledby="tab-tracking" className={`cs-tab-panel ${activeTab === 'tracking' ? 'cs-tab-panel--active' : ''}`}>
          {activeTab === 'tracking' && renderTrackingPanel()}
        </div>

        <div role="tabpanel" id="panel-tickets" aria-labelledby="tab-tickets" className={`cs-tab-panel ${activeTab === 'tickets' ? 'cs-tab-panel--active' : ''}`}>
          {activeTab === 'tickets' && renderTicketsPanel()}
        </div>

        <div role="tabpanel" id="panel-comms" aria-labelledby="tab-comms" className={`cs-tab-panel ${activeTab === 'comms' ? 'cs-tab-panel--active' : ''}`}>
          {activeTab === 'comms' && renderCommsPanel()}
        </div>
      </div>

      {/* Modals portaled to document.body so position:fixed and layout are never affected by page CSS (e.g. transform on .cs-page-enter). Wrapper sets dir/lang so portaled content follows locale (RTL/LTR). */}
      {createPortal(
        <div dir={i18n.dir()} lang={i18n.language} style={{ isolation: 'isolate' }}>
          <ViewShipmentModal
            open={!!viewShipmentRow}
            shipment={viewShipmentRow}
            trackingUpdates={viewTrackingUpdates}
            loading={viewTrackingLoading}
            onClose={closeViewShipment}
            t={t}
          />
          <AddShipmentUpdateModal
            open={showAddUpdate}
            onClose={closeAddUpdate}
            addUpdateRow={addUpdateRow}
            addUpdateBl={addUpdateBl}
            setAddUpdateBl={setAddUpdateBl}
            addUpdateText={addUpdateText}
            setAddUpdateText={setAddUpdateText}
            onSubmit={handleSaveAddUpdate}
            submitting={trackingSubmitting}
            t={t}
          />
          <SendToClientModal
            open={showSendToClient}
            row={sendToClientRow}
            onClose={closeSendToClient}
            sendChannel={sendChannel}
            setSendChannel={setSendChannel}
            sendTemplate={sendTemplate}
            setSendTemplate={setSendTemplate}
            sendMessage={sendMessage}
            setSendMessage={setSendMessage}
            onSubmit={handleSendToClient}
            submitting={trackingSubmitting}
            t={t}
          />
          <NewTicketModal
            open={showNewTicket}
            onClose={() => setShowNewTicket(false)}
            form={newTicketForm}
            setForm={setNewTicketForm}
            onSubmit={handleCreateTicket}
            submitting={ticketSubmitting}
            t={t}
            ticketTypes={ticketTypes}
            clients={clientsForTicket}
            users={usersForTicket}
            clientShipments={clientShipmentsForTicket}
          />
          <ReplyTicketModal
            open={showReplyTicket}
            ticket={replyTicket}
            onClose={closeReplyTicket}
            replyForm={replyForm}
            setReplyForm={setReplyForm}
            onSubmit={handleReplyTicket}
            submitting={ticketSubmitting}
            t={t}
            ticketStatusKey={ticketStatusKey}
          />
          <AddCommsLogModal
            open={showAddComms}
            onClose={() => setShowAddComms(false)}
            form={commsForm}
            setForm={setCommsForm}
            onSubmit={handleSaveCommsLog}
            submitting={commsSubmitting}
            t={t}
            clients={clientsForComms}
          />
          {/* Delete confirm modal (same style as Clients page) */}
          {deleteTicketId != null && (
            <div className="clients-modal" role="dialog" aria-modal="true">
              <div className="clients-modal-backdrop" onClick={() => setDeleteTicketId(null)} />
              <div className="clients-modal-content">
                <h2>{t('customerServices.deleteConfirm')}</h2>
                <p>{t('customerServices.deleteConfirmMessage', 'Are you sure you want to delete this ticket? This action cannot be undone.')}</p>
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => setDeleteTicketId(null)} disabled={deleteTicketSubmitting}>
                    {t('clients.cancel')}
                  </button>
                  <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteTicketConfirm} disabled={deleteTicketSubmitting}>
                    {deleteTicketSubmitting ? t('clients.deleting') : t('clients.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </Container>
  )
}
