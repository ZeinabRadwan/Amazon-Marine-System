import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../../../pages/Login'
import { listShipments, postShipmentTrackingUpdate } from '../../../api/shipments'
import {
  listTickets,
  listCommunicationLogs,
  listTicketTypes,
  getTicketStats,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
} from '../../../api/customerServices'
import { listClients } from '../../../api/clients'
import { listUsers } from '../../../api/users'
import { getClientShipments } from '../../../api/clients'
import {
  TRACKING_STATUS_KEYS,
  TRACKING_TEMPLATE_KEYS,
  COMMS_TYPES,
  TICKET_STATUS_KEYS,
  TICKET_TYPE_KEYS,
  TICKET_PRIORITY_KEYS,
  TICKET_PRIORITIES,
  COMMS_TYPE_ICONS,
} from '../constants'
import { Bx } from '../components/BxIcon'

function mapShipmentToRow(shipment, formatDate) {
  const latest = shipment.latest_tracking_update
  const route = [shipment.origin_port?.name, shipment.destination_port?.name].filter(Boolean).join(' → ') || shipment.route_text || '—'
  return {
    id: shipment.id,
    bl_number: shipment.bl_number ?? '—',
    client: shipment.client?.company_name ?? shipment.client?.name ?? '—',
    route,
    status: shipment.status ?? 'booking_confirmed',
    last_update: latest ? `${formatDate(latest.created_at)} — ${latest.update_text || ''}`.trim() : '—',
  }
}

function mapTicketToRow(t) {
  return {
    id: t.id,
    ticket_number: t.ticket_number ?? '—',
    client: t.client?.company_name ?? t.client?.name ?? '—',
    shipment: t.shipment?.bl_number ?? '—',
    type: t.ticket_type?.name ?? 'inquiry',
    priority: t.priority?.name ?? 'medium',
    assigned_to: t.assigned_to?.name ?? '—',
    assigned_to_id: t.assigned_to_id,
    status: t.status ?? 'open',
    date: t.created_at,
  }
}

function mapCommsLogToRow(log, formatDateTime) {
  const related = log.client
    ? `${log.client.company_name || log.client.name} (Client)`
    : log.shipment
      ? `${log.shipment.bl_number} (Shipment)`
      : log.ticket
        ? `${log.ticket.ticket_number} (Ticket)`
        : '—'
  return {
    id: log.id,
    date_time: formatDateTime(log.occurred_at) || formatDateTime(log.created_at) || '—',
    type: log.type?.name ?? 'note',
    related_to: related,
    subject: log.subject ?? '—',
    agent: log.created_by?.name ?? '—',
  }
}

export function useCustomerServicesState() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('tracking')
  const [alert, setAlert] = useState(null)

  const [trackingList, setTrackingList] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(true)
  const [trackingError, setTrackingError] = useState(null)
  const [trackingFilters, setTrackingFilters] = useState({ qBl: '', qClient: '', status: '' })
  const [showAddUpdate, setShowAddUpdate] = useState(false)
  const [showSendToClient, setShowSendToClient] = useState(false)
  const [addUpdateBl, setAddUpdateBl] = useState('')
  const [addUpdateRow, setAddUpdateRow] = useState(null)
  const [addUpdateText, setAddUpdateText] = useState('')
  const [sendToClientRow, setSendToClientRow] = useState(null)
  const [sendChannel, setSendChannel] = useState('email')
  const [sendTemplate, setSendTemplate] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [trackingSubmitting, setTrackingSubmitting] = useState(false)

  const [ticketFilters, setTicketFilters] = useState({ q: '', type: '', assigned: '', status: '', priority: '' })
  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [ticketStats, setTicketStats] = useState(null)
  const [clientsForTicket, setClientsForTicket] = useState([])
  const [usersForTicket, setUsersForTicket] = useState([])
  const [clientShipmentsForTicket, setClientShipmentsForTicket] = useState([])
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [showReplyTicket, setShowReplyTicket] = useState(false)
  const [replyTicketId, setReplyTicketId] = useState(null)
  const [newTicketForm, setNewTicketForm] = useState({
    client_id: '',
    ticket_type_id: 1,
    priority_id: 2,
    subject: '',
    description: '',
    shipment_id: null,
    assigned_to_id: null,
  })
  const [replyForm, setReplyForm] = useState({ text: '', status: 'open' })
  const [ticketSubmitting, setTicketSubmitting] = useState(false)

  const [commsFilters, setCommsFilters] = useState({ q: '', type: '', related: '' })
  const [comms, setComms] = useState([])
  const [commsLoading, setCommsLoading] = useState(true)
  const [commsError, setCommsError] = useState(null)
  const [showAddComms, setShowAddComms] = useState(false)
  const [commsForm, setCommsForm] = useState({ type: 'call', related: 'client', ref: '', subject: '', client_said: '', issue: '', reply: '' })
  const [commsSubmitting, setCommsSubmitting] = useState(false)

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const formatDate = useCallback((d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString(locale, { dateStyle: 'short' })
    } catch {
      return d
    }
  }, [locale])

  const formatDateTime = useCallback((d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return d
    }
  }, [locale])

  const loadTracking = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setTrackingError(t('clients.trackingUpdatesError') || 'Not authenticated')
      setTrackingLoading(false)
      return
    }
    setTrackingLoading(true)
    setTrackingError(null)
    listShipments(token, { include: 'latest_tracking_update', per_page: 100 })
      .then((res) => {
        const raw = res.data ?? res.shipments ?? []
        const rows = raw.map((s) => mapShipmentToRow(s, formatDate))
        setTrackingList(rows)
      })
      .catch((err) => {
        setTrackingError(err.message || t('clients.trackingUpdatesError') || 'Failed to load shipments')
        setTrackingList([])
      })
      .finally(() => setTrackingLoading(false))
  }, [formatDate, t])

  useEffect(() => {
    loadTracking()
  }, [loadTracking])

  const loadTickets = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setTicketsError(t('customerServices.errorLoad') || 'Not authenticated')
      setTicketsLoading(false)
      return
    }
    setTicketsLoading(true)
    setTicketsError(null)
    listTickets(token, { per_page: 100 })
      .then((res) => {
        const raw = res.data ?? res.tickets ?? []
        setTickets(raw.map(mapTicketToRow))
      })
      .catch((err) => {
        setTicketsError(err.message || t('customerServices.errorLoad') || 'Failed to load tickets')
        setTickets([])
      })
      .finally(() => setTicketsLoading(false))
  }, [t])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const loadTicketTypes = useCallback(() => {
    const token = getStoredToken()
    if (!token) return
    listTicketTypes(token)
      .then((res) => setTicketTypes(res.data ?? []))
      .catch(() => setTicketTypes([]))
  }, [])

  const loadTicketStats = useCallback(() => {
    const token = getStoredToken()
    if (!token) return
    getTicketStats(token)
      .then((res) => setTicketStats(res.data ?? null))
      .catch(() => setTicketStats(null))
  }, [])

  useEffect(() => {
    loadTicketTypes()
  }, [loadTicketTypes])

  useEffect(() => {
    loadTicketStats()
  }, [loadTicketStats])

  useEffect(() => {
    if (!showNewTicket) return
    const token = getStoredToken()
    if (!token) return
    Promise.all([
      listClients(token, { per_page: 500 }),
      listUsers(token),
    ]).then(([clientsRes, usersRes]) => {
      setClientsForTicket(clientsRes.data ?? [])
      setUsersForTicket(usersRes.data ?? usersRes.users ?? [])
    }).catch(() => {
      setClientsForTicket([])
      setUsersForTicket([])
    })
  }, [showNewTicket])

  useEffect(() => {
    const clientId = newTicketForm.client_id ? Number(newTicketForm.client_id) : null
    if (!clientId || !showNewTicket) {
      setClientShipmentsForTicket([])
      return
    }
    const token = getStoredToken()
    if (!token) return
    getClientShipments(token, clientId, { per_page: 100 })
      .then((res) => setClientShipmentsForTicket(res.data ?? []))
      .catch(() => setClientShipmentsForTicket([]))
  }, [newTicketForm.client_id, showNewTicket])

  const loadComms = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setCommsError(t('customerServices.errorLoad') || 'Not authenticated')
      setCommsLoading(false)
      return
    }
    setCommsLoading(true)
    setCommsError(null)
    listCommunicationLogs(token, { per_page: 100 })
      .then((res) => {
        const raw = res.data ?? res.communication_logs ?? []
        setComms(raw.map((log) => mapCommsLogToRow(log, formatDateTime)))
      })
      .catch((err) => {
        setCommsError(err.message || t('customerServices.errorLoad') || 'Failed to load communication logs')
        setComms([])
      })
      .finally(() => setCommsLoading(false))
  }, [formatDateTime, t])

  useEffect(() => {
    loadComms()
  }, [loadComms])

  const filteredTracking = useMemo(() => {
    return trackingList.filter((row) => {
      if (trackingFilters.qBl && !String(row.bl_number).toLowerCase().includes(trackingFilters.qBl.toLowerCase())) return false
      if (trackingFilters.qClient && !String(row.client).toLowerCase().includes(trackingFilters.qClient.toLowerCase())) return false
      if (trackingFilters.status && row.status !== trackingFilters.status) return false
      return true
    })
  }, [trackingList, trackingFilters])

  const filteredTickets = useMemo(() => {
    return tickets.filter((row) => {
      const q = ticketFilters.q.toLowerCase()
      if (ticketFilters.q && !row.ticket_number.toLowerCase().includes(q) && !row.client.toLowerCase().includes(q)) return false
      if (ticketFilters.type && row.type !== ticketFilters.type) return false
      if (ticketFilters.assigned && row.assigned_to !== ticketFilters.assigned) return false
      if (ticketFilters.status && row.status !== ticketFilters.status) return false
      if (ticketFilters.priority && row.priority !== ticketFilters.priority) return false
      return true
    })
  }, [tickets, ticketFilters])

  const filteredComms = useMemo(() => {
    return comms.filter((row) => {
      const q = commsFilters.q.toLowerCase()
      if (commsFilters.q && !row.related_to.toLowerCase().includes(q) && !row.subject.toLowerCase().includes(q)) return false
      if (commsFilters.type && row.type !== commsFilters.type) return false
      if (commsFilters.related) {
        const r = commsFilters.related
        if (r === 'client' && !row.related_to.includes('Client')) return false
        if (r === 'shipment' && !row.related_to.includes('BL-')) return false
        if (r === 'ticket' && !row.related_to.includes('TKT-')) return false
      }
      return true
    })
  }, [comms, commsFilters])

  const openAddUpdate = useCallback((row) => {
    setAddUpdateRow(row)
    setAddUpdateBl(row?.bl_number ?? '')
    setAddUpdateText('')
    setShowAddUpdate(true)
  }, [])

  const openSendToClient = useCallback((row) => {
    setSendToClientRow(row)
    setSendTemplate('')
    setSendMessage('')
    setSendChannel('email')
    setShowSendToClient(true)
  }, [])

  const handleSaveAddUpdate = useCallback((e) => {
    e.preventDefault()
    const shipmentId = addUpdateRow?.id
    if (!shipmentId) {
      setAlert({ type: 'error', message: t('customerServices.tracking.selectShipmentFirst', 'Select a shipment from the table to add an update.') })
      return
    }
    const token = getStoredToken()
    if (!token) {
      setAlert({ type: 'error', message: t('clients.trackingUpdatesError') })
      return
    }
    setTrackingSubmitting(true)
    postShipmentTrackingUpdate(token, shipmentId, { update_text: addUpdateText })
      .then(() => {
        setAlert({ type: 'success', message: t('customerServices.tracking.saveUpdate') })
        setShowAddUpdate(false)
        setAddUpdateRow(null)
        setAddUpdateText('')
        loadTracking()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tracking.saveUpdateError', 'Failed to save update') })
      })
      .finally(() => setTrackingSubmitting(false))
  }, [t, addUpdateRow?.id, addUpdateText, loadTracking])

  const handleSendToClient = useCallback((e) => {
    e.preventDefault()
    setTrackingSubmitting(true)
    setTimeout(() => {
      setAlert({ type: 'success', message: t('customerServices.tracking.send') })
      setShowSendToClient(false)
      setSendToClientRow(null)
      setTrackingSubmitting(false)
    }, 400)
  }, [t])

  const handleCreateTicket = useCallback((e) => {
    e.preventDefault()
    const token = getStoredToken()
    if (!token) {
      setAlert({ type: 'error', message: t('customerServices.errorLoad') || 'Not authenticated' })
      return
    }
    const clientId = Number(newTicketForm.client_id)
    if (!clientId) {
      setAlert({ type: 'error', message: t('customerServices.tickets.clientPlaceholder') || 'Select a client' })
      return
    }
    if (!String(newTicketForm.subject).trim()) {
      setAlert({ type: 'error', message: t('customerServices.tickets.subjectRequired') || 'Subject is required' })
      return
    }
    setTicketSubmitting(true)
    const body = {
      client_id: clientId,
      ticket_type_id: Number(newTicketForm.ticket_type_id) || 1,
      priority_id: Number(newTicketForm.priority_id) || 2,
      subject: String(newTicketForm.subject).trim(),
      description: newTicketForm.description ? String(newTicketForm.description).trim() : null,
      shipment_id: newTicketForm.shipment_id ? Number(newTicketForm.shipment_id) : null,
      assigned_to_id: newTicketForm.assigned_to_id ? Number(newTicketForm.assigned_to_id) : null,
    }
    createTicket(token, body)
      .then(() => {
        setNewTicketForm({ client_id: '', ticket_type_id: 1, priority_id: 2, subject: '', description: '', shipment_id: null, assigned_to_id: null })
        setShowNewTicket(false)
        setAlert({ type: 'success', message: t('customerServices.tickets.newTicket') })
        loadTickets()
        loadTicketStats()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tickets.createError') || 'Failed to create ticket' })
      })
      .finally(() => setTicketSubmitting(false))
  }, [newTicketForm, t, loadTickets, loadTicketStats])

  const openReplyTicket = useCallback((ticket) => {
    setReplyTicketId(ticket.id)
    setReplyForm({ text: '', status: ticket.status })
    setShowReplyTicket(true)
  }, [])

  const handleReplyTicket = useCallback((e) => {
    e.preventDefault()
    if (!replyTicketId) return
    const token = getStoredToken()
    if (!token) return
    setTicketSubmitting(true)
    updateTicket(token, replyTicketId, { status: replyForm.status })
      .then(() => {
        setShowReplyTicket(false)
        setReplyTicketId(null)
        setAlert({ type: 'success', message: t('customerServices.tickets.sendReply') })
        loadTickets()
        loadTicketStats()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tickets.updateError') || 'Failed to update ticket' })
      })
      .finally(() => setTicketSubmitting(false))
  }, [replyTicketId, replyForm.status, t, loadTickets, loadTicketStats])

  const handleCloseTicket = useCallback(() => {
    if (!replyTicketId) return
    const token = getStoredToken()
    if (!token) return
    setTicketSubmitting(true)
    updateTicket(token, replyTicketId, { status: 'closed' })
      .then(() => {
        setShowReplyTicket(false)
        setReplyTicketId(null)
        setAlert({ type: 'success', message: t('customerServices.tickets.closeTicket') })
        loadTickets()
        loadTicketStats()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tickets.updateError') || 'Failed to update ticket' })
      })
      .finally(() => setTicketSubmitting(false))
  }, [replyTicketId, t, loadTickets, loadTicketStats])

  const handleDeleteTicket = useCallback((ticketId) => {
    if (!window.confirm(t('customerServices.deleteConfirm') || 'Delete this ticket?')) return
    const token = getStoredToken()
    if (!token) return
    setTicketSubmitting(true)
    deleteTicket(token, ticketId)
      .then(() => {
        if (replyTicketId === ticketId) {
          setShowReplyTicket(false)
          setReplyTicketId(null)
        }
        setAlert({ type: 'success', message: t('customerServices.tickets.deleted') || 'Ticket deleted.' })
        loadTickets()
        loadTicketStats()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tickets.deleteError') || 'Failed to delete ticket' })
      })
      .finally(() => setTicketSubmitting(false))
  }, [replyTicketId, t, loadTickets, loadTicketStats])

  const handleSaveCommsLog = useCallback((e) => {
    e.preventDefault()
    setCommsSubmitting(true)
    const relatedLabel = commsForm.related === 'shipment' ? t('customerServices.comms.relatedShipment') : commsForm.related === 'ticket' ? t('customerServices.comms.relatedTicket') : t('customerServices.comms.relatedClient')
    const newLog = {
      id: `c-${Date.now()}`,
      date_time: new Date().toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }),
      type: commsForm.type,
      related_to: commsForm.ref ? `${commsForm.ref} (${relatedLabel})` : relatedLabel,
      subject: commsForm.subject || '—',
      agent: 'Support Agent',
    }
    setTimeout(() => {
      setComms((prev) => [newLog, ...prev])
      setCommsForm({ type: 'call', related: 'client', ref: '', subject: '', client_said: '', issue: '', reply: '' })
      setShowAddComms(false)
      setAlert({ type: 'success', message: t('customerServices.comms.addLog') })
      setCommsSubmitting(false)
    }, 400)
  }, [commsForm, locale, t])

  const ticketStatusKey = (s) => TICKET_STATUS_KEYS[s] || TICKET_STATUS_KEYS.open
  const commsTypeIcon = (type) => <Bx name={COMMS_TYPE_ICONS[type] || 'bx-note'} className="cs-btn-icon" />

  const trackingColumns = useMemo(() => [
    { key: 'bl_number', label: t('customerServices.tracking.blNumber'), render: (_, r) => <span className="cs-fw-600">{r.bl_number}</span> },
    { key: 'client', label: t('customerServices.tracking.client'), render: (_, r) => r.client },
    { key: 'route', label: t('customerServices.tracking.route'), render: (_, r) => r.route },
    {
      key: 'status',
      label: t('customerServices.tracking.statusCustomerView'),
      render: (_, r) => {
        const key = TRACKING_STATUS_KEYS[r.status] || 'customerServices.tracking.statusInTransit'
        return <span className={`cs-status-badge cs-status-badge--${r.status === 'in_transit' || r.status === 'vessel_departed' ? 'in-transit' : r.status === 'booking_confirmed' ? 'booked' : 'pending'}`}>{t(key)}</span>
      },
    },
    { key: 'last_update', label: t('customerServices.tracking.lastUpdate'), render: (_, r) => <span className="cs-text-muted cs-fs-sm">{r.last_update}</span> },
    {
      key: 'actions',
      label: t('customerServices.actions'),
      sortable: false,
      render: (_, r) => (
        <div className="cs-table-actions">
          <button type="button" className="cs-btn cs-btn-outline cs-btn-sm" onClick={() => openAddUpdate(r)}>
            <Bx name="bx-edit" className="cs-btn-icon" /> {t('customerServices.tracking.addUpdate')}
          </button>
          <button type="button" className="cs-btn cs-btn-outline cs-btn-sm" onClick={() => openSendToClient(r)}>
            <Bx name="bx-send" className="cs-btn-icon" /> {t('customerServices.tracking.sendToClient')}
          </button>
          <Link to="/shipments" className="cs-btn cs-btn-outline cs-btn-sm">
            <Bx name="bx-show" className="cs-btn-icon" /> {t('customerServices.view')}
          </Link>
        </div>
      ),
    },
  ], [t, openAddUpdate, openSendToClient])

  const ticketColumns = useMemo(() => [
    { key: 'ticket_number', label: t('customerServices.tickets.ticketNumber'), render: (_, r) => r.ticket_number },
    { key: 'client', label: t('customerServices.tracking.client'), render: (_, r) => r.client },
    { key: 'shipment', label: t('customerServices.tickets.shipment'), render: (_, r) => r.shipment },
    { key: 'type', label: t('customerServices.tickets.type'), render: (_, r) => t(TICKET_TYPE_KEYS[r.type] || '') },
    { key: 'priority', label: t('customerServices.tickets.priority'), render: (_, r) => t(TICKET_PRIORITY_KEYS[r.priority] || '') },
    { key: 'assigned_to', label: t('customerServices.tickets.assignedTo'), render: (_, r) => r.assigned_to ?? '—' },
    { key: 'status', label: t('customerServices.fields.status'), render: (_, r) => <span className={`cs-status-badge cs-status-badge--${r.status}`}>{t(ticketStatusKey(r.status))}</span> },
    { key: 'date', label: t('customerServices.tickets.date'), render: (_, r) => formatDate(r.date) },
    {
      key: 'actions',
      label: t('customerServices.actions'),
      sortable: false,
      render: (_, r) => (
        <div className="cs-table-actions">
          <button type="button" className="cs-btn cs-btn-outline cs-btn-sm" onClick={() => openReplyTicket(r)}>
            {t('customerServices.tickets.sendReply')}
          </button>
          <button type="button" className="cs-btn cs-btn-outline cs-btn-sm cs-btn-danger" onClick={() => handleDeleteTicket(r.id)}>
            {t('customerServices.delete')}
          </button>
        </div>
      ),
    },
  ], [t, formatDate, openReplyTicket, handleDeleteTicket])

  const commsColumns = useMemo(() => [
    { key: 'date_time', label: t('customerServices.comms.dateTime'), render: (_, r) => <span className="cs-text-muted cs-fs-sm">{r.date_time}</span> },
    { key: 'type', label: t('customerServices.comms.commsType'), render: (_, r) => <>{commsTypeIcon(r.type)} {t(COMMS_TYPES[r.type] || COMMS_TYPES.note)}</> },
    { key: 'related_to', label: t('customerServices.comms.relatedTo'), render: (_, r) => r.related_to },
    { key: 'subject', label: t('customerServices.comms.subjectSummary'), render: (_, r) => r.subject },
    { key: 'agent', label: t('customerServices.comms.agent'), render: (_, r) => r.agent },
  ], [t])

  const csTabs = useMemo(() => [
    { id: 'tracking', label: t('customerServices.tabTracking'), icon: <Bx name="bx-package" /> },
    { id: 'tickets', label: t('customerServices.tabTickets'), icon: <Bx name="bx-message-alt-detail" /> },
    { id: 'comms', label: t('customerServices.tabComms'), icon: <Bx name="bx-chat" /> },
  ], [t])

  const replyTicket = useMemo(() => tickets.find((tk) => tk.id === replyTicketId) ?? null, [tickets, replyTicketId])

  return {
    t,
    activeTab,
    setActiveTab,
    alert,
    setAlert,
    csTabs,
    formatDate,
    ticketStatusKey,
    // Tracking
    trackingLoading,
    trackingError,
    refetchTracking: loadTracking,
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
    refetchTickets: loadTickets,
    ticketFilters,
    setTicketFilters,
    tickets,
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
    replyTicketId,
    setReplyTicketId,
    replyTicket,
    replyForm,
    setReplyForm,
    openReplyTicket,
    handleReplyTicket,
    handleCloseTicket,
    handleDeleteTicket,
    ticketSubmitting,
    // Comms
    commsLoading,
    commsError,
    refetchComms: loadComms,
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
    // Busy
    isBusy: trackingSubmitting || ticketSubmitting || commsSubmitting,
  }
}
