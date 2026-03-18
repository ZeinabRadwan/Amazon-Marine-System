import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { useCustomerServicesState } from './hooks/useCustomerServicesState'
import { TrackingView, TicketsView, CommsView } from './views'
import {
  AddShipmentUpdateModal,
  SendToClientModal,
  NewTicketModal,
  ReplyTicketModal,
  AddCommsLogModal,
} from './components/modals'
import '../../components/LoaderDots/LoaderDots.css'
import '../../components/Tabs/Tabs.css'
import './styles/CustomerServices.css'

export default function CustomerServices() {
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
    filteredTracking,
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
    // Tickets
    ticketsLoading,
    ticketsError,
    refetchTickets,
    ticketFilters,
    setTicketFilters,
    filteredTickets,
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
    // openReplyTicket,
    handleReplyTicket,
    handleCloseTicket,
    handleDeleteTicket,
    ticketSubmitting,
    ticketStatusKey,
    // Comms
    commsLoading,
    commsError,
    refetchComms,
    commsFilters,
    setCommsFilters,
    filteredComms,
    commsColumns,
    showAddComms,
    setShowAddComms,
    commsForm,
    setCommsForm,
    handleSaveCommsLog,
    commsSubmitting,
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

  return (
    <Container size="xl">
      <div className="customer-services-page cs-page-enter">
        {isBusy && (
          <div className="customer-services-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <div className="customer-services-header">
          <h1>{t('customerServices.title')}</h1>
        </div>
        <p className="cs-intro">{t('customerServices.intro')}</p>

        <div className="cs-tabs-wrap">
          <Tabs tabs={csTabs} activeTab={activeTab} onChange={setActiveTab} className="cs-tabs" />
        </div>

        {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <div role="tabpanel" id="panel-tracking" aria-labelledby="tab-tracking" className={`cs-tab-panel ${activeTab === 'tracking' ? 'cs-tab-panel--active' : ''}`}>
          <TrackingView
            t={t}
            filters={trackingFilters}
            setFilters={setTrackingFilters}
            filteredData={filteredTracking}
            columns={trackingColumns}
            onOpenAddUpdateStandalone={() => openAddUpdate(null)}
            loading={trackingLoading}
            error={trackingError}
            onRetry={refetchTracking}
          />
        </div>

        <div role="tabpanel" id="panel-tickets" aria-labelledby="tab-tickets" className={`cs-tab-panel ${activeTab === 'tickets' ? 'cs-tab-panel--active' : ''}`}>
          <TicketsView
            t={t}
            filters={ticketFilters}
            setFilters={setTicketFilters}
            filteredData={filteredTickets}
            columns={ticketColumns}
            onNewTicket={() => setShowNewTicket(true)}
            loading={ticketsLoading}
            error={ticketsError}
            onRetry={refetchTickets}
            ticketStats={ticketStats}
          />
        </div>

        <div role="tabpanel" id="panel-comms" aria-labelledby="tab-comms" className={`cs-tab-panel ${activeTab === 'comms' ? 'cs-tab-panel--active' : ''}`}>
          <CommsView
            t={t}
            filters={commsFilters}
            setFilters={setCommsFilters}
            filteredData={filteredComms}
            columns={commsColumns}
            onAddComms={() => setShowAddComms(true)}
            loading={commsLoading}
            error={commsError}
            onRetry={refetchComms}
          />
        </div>

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
          onCloseTicket={handleCloseTicket}
          onDeleteTicket={handleDeleteTicket}
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
        />
      </div>
    </Container>
  )
}
