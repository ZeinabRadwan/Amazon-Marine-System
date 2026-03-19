import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../../../pages/Login'
import { listShipments, postShipmentTrackingUpdate, getShipmentTrackingUpdates } from '../../../api/shipments'
import {
  listTickets,
  exportTickets,
  listCommunicationLogs,
  createCommunicationLog,
  listTicketTypes,
  listTicketPriorities,
  listTicketStatuses,
  listCommunicationLogTypes,
  getTicketStats,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
} from '../../../api/customerServices'
import { listClients } from '../../../api/clients'
import { listUsers } from '../../../api/users'
import { getClientShipments } from '../../../api/clients'
import { listShipmentStatuses } from '../../../api/settings'
import {
  COMMS_TYPE_ICONS,
  TICKET_TYPE_ICONS,
} from '../constants'
import { Eye, Pencil, Send, Trash2, MessageSquare } from 'lucide-react'
import { Bx } from '../components/BxIcon'
import { IconActionButton } from '../../../components/Table'

/** Normalize Laravel-style pagination meta from API response */
function normalizeMeta(meta, fallback = {}) {
  return {
    total: Number(meta?.total ?? fallback.total ?? 0),
    last_page: Math.max(1, Number(meta?.last_page ?? fallback.last_page ?? 1)),
    current_page: Math.max(1, Number(meta?.current_page ?? meta?.page ?? fallback.current_page ?? 1)),
    per_page: Math.max(1, Number(meta?.per_page ?? fallback.per_page ?? 50)),
  }
}

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

const COMMS_TYPE_ID_TO_NAME = { 1: 'call', 2: 'whatsapp', 3: 'email', 4: 'meeting', 5: 'note' }

function mapCommsLogToRow(log, formatDateTime) {
  const related = log.client
    ? `${log.client.company_name || log.client.name} (Client)`
    : log.shipment
      ? `${log.shipment.bl_number} (Shipment)`
      : log.ticket
        ? `${log.ticket.ticket_number} (Ticket)`
        : '—'
  const typeName = log.type?.name ?? (log.communication_log_type_id && COMMS_TYPE_ID_TO_NAME[log.communication_log_type_id]) ?? 'note'
  return {
    id: log.id,
    date_time: formatDateTime(log.occurred_at) || formatDateTime(log.created_at) || '—',
    type: typeName,
    related_to: related,
    subject: log.subject ?? '—',
    agent: log.created_by?.name ?? '—',
  }
}

function deriveStatusKeyFromName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeShipmentStatusKey(statusKey) {
  // Backend/seed data uses `booked`, while UI conventions use `booking_confirmed`.
  // We treat them as the same for labels + CSS.
  if (statusKey === 'booked') return 'booking_confirmed'
  return statusKey
}

export function useCustomerServicesState() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('tracking')
  const [alert, setAlert] = useState(null)

  const [trackingList, setTrackingList] = useState([])
  const [trackingPaginationState, setTrackingPaginationState] = useState({ total: 0, last_page: 1, current_page: 1, per_page: 50 })
  const [trackingLoading, setTrackingLoading] = useState(true)
  const [trackingError, setTrackingError] = useState(null)
  const [trackingStatuses, setTrackingStatuses] = useState([])
  const [trackingStatusesLoading, setTrackingStatusesLoading] = useState(true)
  const [trackingStatusesError, setTrackingStatusesError] = useState(null)
  // Some seed data uses `booked` instead of `booking_confirmed`. Detect once and alias filter requests.
  const [useApiBookedAlias, setUseApiBookedAlias] = useState(false)
  const [trackingFilters, setTrackingFilters] = useState({
    qBl: '',
    qClient: '',
    status: '',
    sort: 'bl_number',
    direction: 'asc',
    page: 1,
    per_page: 50,
  })
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
  const [viewShipmentRow, setViewShipmentRow] = useState(null)
  const [viewTrackingUpdates, setViewTrackingUpdates] = useState([])
  const [viewTrackingLoading, setViewTrackingLoading] = useState(false)

  const [ticketFilters, setTicketFilters] = useState({
    q: '',
    type: '',
    assigned: '',
    status: '',
    priority: '',
    client_id: '',
    assigned_to_id: '',
    sort: 'date',
    direction: 'desc',
    page: 1,
    per_page: 50,
  })
  const [tickets, setTickets] = useState([])
  const [ticketPaginationState, setTicketPaginationState] = useState({ total: 0, last_page: 1, current_page: 1, per_page: 50 })
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState(null)
  const [replyTicket, setReplyTicket] = useState(null)
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
  const [ticketExportLoading, setTicketExportLoading] = useState(false)

  const [commsFilters, setCommsFilters] = useState({
    q: '',
    type: '',
    related: '',
    client_id: '',
    sort: 'date_time',
    direction: 'desc',
    page: 1,
    per_page: 50,
  })
  const [comms, setComms] = useState([])
  const [commsPaginationState, setCommsPaginationState] = useState({ total: 0, last_page: 1, current_page: 1, per_page: 50 })
  const [commsLoading, setCommsLoading] = useState(true)
  const [commsError, setCommsError] = useState(null)
  const [commsTypes, setCommsTypes] = useState([])
  const [ticketPriorities, setTicketPriorities] = useState([])
  const [ticketStatuses, setTicketStatuses] = useState([])
  const [showAddComms, setShowAddComms] = useState(false)
  const [commsForm, setCommsForm] = useState({ client_id: '', type: 'call', related: 'client', ref: '', subject: '', client_said: '', issue: '', reply: '' })
  const [commsSubmitting, setCommsSubmitting] = useState(false)
  const [clientsForComms, setClientsForComms] = useState([])

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const isArabicLang = i18n.language === 'ar'
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

  const trackingStatusByKey = useMemo(() => {
    const map = {}
    for (const s of trackingStatuses || []) {
      if (s?.key) map[s.key] = s
    }
    return map
  }, [trackingStatuses])

  const ticketTypeIdByName = useMemo(() => {
    const map = {}
    for (const tt of ticketTypes || []) {
      if (tt?.name != null && tt?.id != null) map[tt.name] = tt.id
    }
    return map
  }, [ticketTypes])

  const ticketPriorityIdByName = useMemo(() => {
    const map = {}
    for (const p of ticketPriorities || []) {
      if (p?.name != null && p?.id != null) map[p.name] = p.id
    }
    return map
  }, [ticketPriorities])

  const ticketTypeLabelByName = useMemo(() => {
    const map = {}
    for (const tt of ticketTypes || []) {
      if (!tt?.name) continue
      map[tt.name] = isArabicLang && tt?.label_ar ? tt.label_ar : (tt?.name ?? '')
    }
    return map
  }, [ticketTypes, isArabicLang])

  const ticketPriorityLabelByName = useMemo(() => {
    const map = {}
    for (const p of ticketPriorities || []) {
      if (!p?.name) continue
      map[p.name] = isArabicLang && p?.label_ar ? p.label_ar : (p?.name ?? '')
    }
    return map
  }, [ticketPriorities, isArabicLang])

  const ticketStatusLabelByKey = useMemo(() => {
    const map = {}
    for (const s of ticketStatuses || []) {
      if (!s?.key) continue
      map[s.key] = isArabicLang ? (s?.label_ar || s?.label_en || s.key) : (s?.label_en || s?.label_ar || s.key)
    }
    return map
  }, [ticketStatuses, isArabicLang])

  const commsTypeIdByName = useMemo(() => {
    const map = {}
    for (const t of commsTypes || []) {
      if (t?.name != null && t?.id != null) map[t.name] = t.id
    }
    return map
  }, [commsTypes])

  const commsTypeLabelByName = useMemo(() => {
    const map = {}
    for (const t of commsTypes || []) {
      if (!t?.name) continue
      map[t.name] = isArabicLang && t?.label_ar ? t.label_ar : (t?.name ?? '')
    }
    return map
  }, [commsTypes, isArabicLang])

  const loadShipmentStatuses = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setTrackingStatusesError(t('customerServices.errorLoad') || 'Not authenticated')
      setTrackingStatuses([])
      setTrackingStatusesLoading(false)
      return
    }

    setTrackingStatusesLoading(true)
    setTrackingStatusesError(null)

    listShipmentStatuses(token)
      .then((res) => {
        const raw = res?.data ?? []
        const list = (Array.isArray(raw) ? raw : [])
          .map((s) => {
            const key = deriveStatusKeyFromName(s?.name_en) || deriveStatusKeyFromName(s?.name_ar) || ''
            if (!key) return null
            return {
              key,
              name_ar: s?.name_ar ?? '',
              name_en: s?.name_en ?? '',
              color: s?.color ?? '',
              description: s?.description ?? '',
              active: s?.active !== false,
              sort_order: s?.sort_order ?? 0,
            }
          })
          .filter(Boolean)

        setTrackingStatuses(list)
      })
      .catch((err) => {
        setTrackingStatusesError(err.message || 'Failed to load shipment statuses')
        setTrackingStatuses([])
      })
      .finally(() => setTrackingStatusesLoading(false))
  }, [t])

  const loadTracking = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setTrackingError(t('clients.trackingUpdatesError') || 'Not authenticated')
      setTrackingLoading(false)
      return
    }
    setTrackingLoading(true)
    setTrackingError(null)
    const { page, per_page, sort, direction, status, qBl, qClient } = trackingFilters
    const apiSort = sort === 'bl_number' ? 'bl' : (sort === 'client' ? 'client' : 'created_at')
    const params = {
      page,
      per_page,
      sort: apiSort,
      direction: (direction || 'asc') === 'asc' ? 'asc' : 'desc',
      include: 'latest_tracking_update',
    }
    const uiStatus = status
    // Alias: if backend uses `booked`, map UI `booking_confirmed` to `booked`.
    const apiStatus = uiStatus && uiStatus === 'booking_confirmed' && useApiBookedAlias ? 'booked' : uiStatus
    if (apiStatus) params.status = apiStatus
    if (qBl) params.bl_number = qBl
    if (qClient) params.search = qClient
    listShipments(token, params)
      .then((res) => {
        const raw = res.data ?? res.shipments ?? []
        const rows = (Array.isArray(raw) ? raw : []).map((s) => mapShipmentToRow(s, formatDate))
        setTrackingList(rows)
        setTrackingPaginationState(normalizeMeta(res.meta ?? res.pagination, { per_page }))

        // Detect which key the backend uses for the "booking confirmed" state.
        if (!uiStatus) {
          const hasBooked = rows.some((r) => r.status === 'booked')
          const hasBookingConfirmed = rows.some((r) => r.status === 'booking_confirmed')
          if (hasBooked && !hasBookingConfirmed) setUseApiBookedAlias(true)
        }
      })
      .catch((err) => {
        setTrackingError(err.message || t('clients.trackingUpdatesError') || 'Failed to load shipments')
        setTrackingList([])
      })
      .finally(() => setTrackingLoading(false))
  }, [formatDate, t, trackingFilters.page, trackingFilters.per_page, trackingFilters.sort, trackingFilters.direction, trackingFilters.status, trackingFilters.qBl, trackingFilters.qClient, useApiBookedAlias])

  useEffect(() => {
    loadShipmentStatuses()
  }, [loadShipmentStatuses])

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
    const { page, per_page, q, status, type, priority, client_id, assigned_to_id, sort, direction } = ticketFilters
    const params = { page, per_page, sort: sort || 'date', direction: direction || 'desc' }
    if (q) params.search = q
    if (status) params.status = status
    if (type && ticketTypeIdByName[type] != null) params.ticket_type_id = ticketTypeIdByName[type]
    if (priority && ticketPriorityIdByName[priority] != null) params.priority_id = ticketPriorityIdByName[priority]
    if (client_id) params.client_id = client_id
    if (assigned_to_id) params.assigned_to_id = assigned_to_id
    listTickets(token, params)
      .then((res) => {
        const raw = res.data ?? res.tickets ?? []
        const rows = (Array.isArray(raw) ? raw : []).map(mapTicketToRow)
        setTickets(rows)
        setTicketPaginationState(normalizeMeta(res.meta ?? res.pagination, { per_page }))
      })
      .catch((err) => {
        setTicketsError(err.message || t('customerServices.errorLoad') || 'Failed to load tickets')
        setTickets([])
      })
      .finally(() => setTicketsLoading(false))
  }, [t, ticketFilters.page, ticketFilters.per_page, ticketFilters.q, ticketFilters.status, ticketFilters.type, ticketFilters.priority, ticketFilters.client_id, ticketFilters.assigned_to_id, ticketFilters.sort, ticketFilters.direction, ticketTypeIdByName, ticketPriorityIdByName])

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

  const loadTicketPriorities = useCallback(() => {
    const token = getStoredToken()
    if (!token) return
    listTicketPriorities(token)
      .then((res) => setTicketPriorities(res.data ?? []))
      .catch(() => setTicketPriorities([]))
  }, [])

  const loadTicketStatuses = useCallback(() => {
    const token = getStoredToken()
    if (!token) return
    listTicketStatuses(token)
      .then((res) => setTicketStatuses(res.data ?? []))
      .catch(() => setTicketStatuses([]))
  }, [])

  const loadCommsTypes = useCallback(() => {
    const token = getStoredToken()
    if (!token) return
    listCommunicationLogTypes(token)
      .then((res) => setCommsTypes(res.data ?? []))
      .catch(() => setCommsTypes([]))
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
    loadTicketPriorities()
  }, [loadTicketPriorities])

  useEffect(() => {
    loadTicketStatuses()
  }, [loadTicketStatuses])

  useEffect(() => {
    loadCommsTypes()
  }, [loadCommsTypes])

  useEffect(() => {
    loadTicketStats()
  }, [loadTicketStats])

  /** Load clients and users for Tickets tab (New ticket modal + filters: Assigned to, Client) */
  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    Promise.all([
      listClients(token, { per_page: 500 }),
      listUsers(token, { per_page: 500 }),
    ]).then(([clientsRes, usersRes]) => {
      const clients = clientsRes.data ?? clientsRes.clients ?? []
      const users = usersRes.data ?? usersRes.users ?? (Array.isArray(usersRes) ? usersRes : [])
      setClientsForTicket(Array.isArray(clients) ? clients : [])
      setUsersForTicket(Array.isArray(users) ? users : [])
    }).catch(() => {
      setClientsForTicket([])
      setUsersForTicket([])
    })
  }, [])

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
    const { page, per_page, q, type, related, client_id, sort, direction } = commsFilters
    const params = { page, per_page, sort: sort || 'date_time', direction: direction || 'desc' }
    if (q) params.search = q
    if (type && commsTypeIdByName[type] != null) params.communication_log_type_id = commsTypeIdByName[type]
    if (related) params.related = related
    if (client_id) params.client_id = client_id
    listCommunicationLogs(token, params)
      .then((res) => {
        const raw = res.data ?? res.communication_logs ?? []
        const rows = (Array.isArray(raw) ? raw : []).map((log) => mapCommsLogToRow(log, formatDateTime))
        setComms(rows)
        setCommsPaginationState(normalizeMeta(res.meta ?? res.pagination, { per_page }))
      })
      .catch((err) => {
        setCommsError(err.message || t('customerServices.errorLoad') || 'Failed to load communication logs')
        setComms([])
      })
      .finally(() => setCommsLoading(false))
  }, [formatDateTime, t, commsFilters.page, commsFilters.per_page, commsFilters.q, commsFilters.type, commsFilters.related, commsFilters.client_id, commsFilters.sort, commsFilters.direction, commsTypeIdByName])

  useEffect(() => {
    loadComms()
  }, [loadComms])

  /** Load full ticket when reply modal is opened (for server-side pagination we may not have it in current page) */
  useEffect(() => {
    if (!replyTicketId || !getStoredToken()) {
      setReplyTicket(null)
      return
    }
    getTicket(getStoredToken(), replyTicketId)
      .then((data) => {
        const raw = data.ticket ?? data.data ?? data
        setReplyTicket(raw ? mapTicketToRow(raw) : null)
      })
      .catch(() => setReplyTicket(null))
  }, [replyTicketId])

  /** Load clients when Add Comms modal opens */
  useEffect(() => {
    if (!showAddComms) return
    const token = getStoredToken()
    if (!token) return
    listClients(token, { per_page: 500 })
      .then((res) => setClientsForComms(res.data ?? []))
      .catch(() => setClientsForComms([]))
  }, [showAddComms])

  const openViewShipment = useCallback((row) => {
    if (!row?.id) return
    setViewShipmentRow(row)
    setViewTrackingUpdates([])
    const token = getStoredToken()
    if (!token) return
    setViewTrackingLoading(true)
    getShipmentTrackingUpdates(token, row.id)
      .then((res) => {
        const list = res.data ?? []
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
        const fmt = (d) => {
          if (!d) return '—'
          try {
            return new Date(d).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
          } catch {
            return d
          }
        }
        setViewTrackingUpdates(
          list.map((u) => ({
            id: u.id,
            update_text: u.update_text,
            date_time: fmt(u.created_at),
            created_at: u.created_at,
            created_by: u.created_by,
          }))
        )
      })
      .catch(() => setViewTrackingUpdates([]))
      .finally(() => setViewTrackingLoading(false))
  }, [i18n.language])

  const closeViewShipment = useCallback(() => {
    setViewShipmentRow(null)
    setViewTrackingUpdates([])
  }, [])

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
    setReplyTicket(ticket)
    setReplyForm({ text: '' })
    setShowReplyTicket(true)
  }, [])

  const handleReplyTicket = useCallback((e) => {
    e.preventDefault()
    if (!replyTicketId) return
    const token = getStoredToken()
    if (!token) return
    setTicketSubmitting(true)
    const statusToKeep = replyTicket?.status ?? 'open'
    updateTicket(token, replyTicketId, { status: statusToKeep })
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
  }, [replyTicketId, replyTicket?.status, t, loadTickets, loadTicketStats])

  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  const handleUpdateTicketStatus = useCallback((ticketId, newStatus) => {
    const token = getStoredToken()
    if (!token || !newStatus) return
    setUpdatingStatusId(ticketId)
    updateTicket(token, ticketId, { status: newStatus })
      .then(() => {
        setAlert({ type: 'success', message: t('customerServices.tickets.statusUpdated', 'Status updated.') })
        loadTickets()
        loadTicketStats()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tickets.updateError') || 'Failed to update ticket' })
      })
      .finally(() => setUpdatingStatusId(null))
  }, [t, loadTickets, loadTicketStats])

  const [deleteTicketId, setDeleteTicketIdState] = useState(null)
  const [deleteTicketSubmitting, setDeleteTicketSubmitting] = useState(false)

  const handleDeleteTicket = useCallback((ticketId) => {
    setDeleteTicketIdState(ticketId)
    if (replyTicketId === ticketId) {
      setShowReplyTicket(false)
      setReplyTicketId(null)
    }
  }, [replyTicketId])

  const handleDeleteTicketConfirm = useCallback(() => {
    const ticketId = deleteTicketId
    if (!ticketId) return
    const token = getStoredToken()
    if (!token) return
    setAlert(null)
    setDeleteTicketSubmitting(true)
    deleteTicket(token, ticketId)
      .then(() => {
        setDeleteTicketIdState(null)
        setAlert({ type: 'success', message: t('customerServices.tickets.deleted') || 'Ticket deleted.' })
        loadTickets()
        loadTicketStats()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.tickets.deleteError') || 'Failed to delete ticket' })
      })
      .finally(() => setDeleteTicketSubmitting(false))
  }, [deleteTicketId, t, loadTickets, loadTicketStats])

  const handleExportTickets = useCallback(() => {
    const token = getStoredToken()
    if (!token) return
    setTicketExportLoading(true)
    setAlert(null)
    const params = {}
    if (ticketFilters.status) params.status = ticketFilters.status
    if (ticketFilters.priority && ticketPriorityIdByName[ticketFilters.priority] != null) params.priority_id = ticketPriorityIdByName[ticketFilters.priority]
    if (ticketFilters.client_id) params.client_id = ticketFilters.client_id
    exportTickets(token, params)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        setAlert({ type: 'success', message: t('customerServices.tickets.exportSuccess', 'Tickets exported.') })
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('customerServices.errorExport', 'Export failed.') }))
      .finally(() => setTicketExportLoading(false))
  }, [ticketFilters.status, ticketFilters.priority, ticketFilters.client_id, t, ticketPriorityIdByName])

  const handleSaveCommsLog = useCallback((e) => {
    e.preventDefault()
    const token = getStoredToken()
    if (!token) {
      setAlert({ type: 'error', message: t('customerServices.errorLoad') || 'Not authenticated' })
      return
    }
    const clientId = Number(commsForm.client_id)
    if (!clientId) {
      setAlert({ type: 'error', message: t('customerServices.comms.selectClient', 'Please select a client.') })
      return
    }
    setCommsSubmitting(true)
    const body = {
      client_id: clientId,
      communication_log_type_id: commsTypeIdByName[commsForm.type] ?? 1,
      subject: commsForm.subject?.trim() || null,
      client_said: commsForm.client_said?.trim() || null,
      issue: commsForm.issue?.trim() || null,
      reply: commsForm.reply?.trim() || null,
    }
    createCommunicationLog(token, body)
      .then(() => {
        setCommsForm({ client_id: '', type: 'call', related: 'client', ref: '', subject: '', client_said: '', issue: '', reply: '' })
        setShowAddComms(false)
        setAlert({ type: 'success', message: t('customerServices.comms.addLog') })
        loadComms()
      })
      .catch((err) => {
        setAlert({ type: 'error', message: err.message || t('customerServices.errorCreate') || 'Failed to add log' })
      })
      .finally(() => setCommsSubmitting(false))
  }, [commsForm, t, loadComms, commsTypeIdByName])

  const ticketStatusLabel = (s) => ticketStatusLabelByKey[s] ?? s
  const commsTypeIcon = (type) => <Bx name={COMMS_TYPE_ICONS[type] || 'bx-note'} className="cs-btn-icon" />

  const trackingColumns = useMemo(() => [
    { key: 'bl_number', label: t('customerServices.tracking.blNumber'), render: (_, r) => <span className="cs-fw-600">{r.bl_number}</span> },
    { key: 'client', label: t('customerServices.tracking.client'), render: (_, r) => r.client },
    { key: 'route', label: t('customerServices.tracking.route'), render: (_, r) => r.route },
    {
      key: 'status',
      label: t('customerServices.tracking.statusCustomerView'),
      render: (_, r) => {
        const displayKey = normalizeShipmentStatusKey(r.status)
        const statusInfo = trackingStatusByKey[displayKey]
        const label = statusInfo ? (isArabicLang ? statusInfo.name_ar : statusInfo.name_en) : displayKey
        const badgeKind = displayKey === 'in_transit' || displayKey === 'vessel_departed'
          ? 'in-transit'
          : displayKey === 'booking_confirmed'
            ? 'booked'
            : 'pending'
        return <span className={`cs-status-badge cs-status-badge--${badgeKind}`}>{label}</span>
      },
    },
    { key: 'last_update', label: t('customerServices.tracking.lastUpdate'), render: (_, r) => <span className="cs-text-muted cs-fs-sm">{r.last_update}</span> },
    {
      key: 'actions',
      label: t('customerServices.actions'),
      sortable: false,
      render: (_, r) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('customerServices.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('customerServices.view')}
            onClick={() => openViewShipment(r)}
          />
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('customerServices.tracking.addUpdate')}
            onClick={() => openAddUpdate(r)}
          />
          <IconActionButton
            icon={<Send className="h-4 w-4" />}
            label={t('customerServices.tracking.sendToClient')}
            onClick={() => openSendToClient(r)}
          />
        </div>
      ),
    },
  ], [t, openAddUpdate, openSendToClient, openViewShipment, trackingStatusByKey, isArabicLang])

  const ticketTypeIcon = (type) => <Bx name={TICKET_TYPE_ICONS[type] || 'bx-message-alt-detail'} className="cs-ticket-type-icon" aria-hidden />

  const ticketColumns = useMemo(() => [
    { key: 'ticket_number', label: t('customerServices.tickets.ticketNumber'), render: (_, r) => r.ticket_number },
    { key: 'client', label: t('customerServices.tracking.client'), render: (_, r) => r.client },
    { key: 'shipment', label: t('customerServices.tickets.shipment'), render: (_, r) => r.shipment },
    { key: 'type', label: t('customerServices.tickets.type'), render: (_, r) => (
      <span className="cs-ticket-type-cell">
        {ticketTypeIcon(r.type)}
        <span>{ticketTypeLabelByName[r.type] || r.type}</span>
      </span>
    ) },
    { key: 'priority', label: t('customerServices.tickets.priority'), render: (_, r) => {
      const p = r.priority || 'medium'
      return (
        <span className={`cs-priority-badge cs-priority-badge--${p}`} title={ticketPriorityLabelByName[p] || p}>
          {ticketPriorityLabelByName[p] || p}
        </span>
      )
    } },
    { key: 'assigned_to', label: t('customerServices.tickets.assignedTo'), render: (_, r) => r.assigned_to ?? '—' },
    { key: 'status', label: t('customerServices.fields.status'), render: (_, r) => <span className={`cs-status-badge cs-status-badge--${r.status}`}>{ticketStatusLabel(r.status)}</span> },
    { key: 'date', label: t('customerServices.tickets.date'), render: (_, r) => formatDate(r.date) },
    {
      key: 'actions',
      label: t('customerServices.actions'),
      sortable: false,
      render: (_, r) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end items-center" role="group" aria-label={t('customerServices.actions')}>
          <IconActionButton
            icon={<MessageSquare className="h-4 w-4" />}
            label={t('customerServices.tickets.sendReply')}
            onClick={() => openReplyTicket(r)}
          />
          <select
            className="clients-select cs-status-select"
            value={r.status ?? 'open'}
            onChange={(e) => handleUpdateTicketStatus(r.id, e.target.value)}
            disabled={updatingStatusId === r.id}
            aria-label={t('customerServices.tickets.updateStatusLabel')}
            title={t('customerServices.tickets.updateStatusLabel')}
          >
            {(ticketStatuses || [])
              .filter((s) => s?.active !== false)
              .map((s) => (
                <option key={s.key} value={s.key}>{ticketStatusLabelByKey[s.key] || s.key}</option>
              ))}
          </select>
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('customerServices.delete')}
            onClick={() => handleDeleteTicket(r.id)}
            variant="danger"
          />
        </div>
      ),
    },
  ], [t, formatDate, ticketTypeLabelByName, ticketPriorityLabelByName, ticketStatusLabelByKey, openReplyTicket, handleUpdateTicketStatus, handleDeleteTicket, updatingStatusId])

  const commsColumns = useMemo(() => [
    { key: 'date_time', label: t('customerServices.comms.dateTime'), render: (_, r) => <span className="cs-text-muted cs-fs-sm">{r.date_time}</span> },
    { key: 'type', label: t('customerServices.comms.commsType'), render: (_, r) => <>{commsTypeIcon(r.type)} {commsTypeLabelByName[r.type] || r.type}</> },
    { key: 'related_to', label: t('customerServices.comms.relatedTo'), render: (_, r) => r.related_to },
    { key: 'subject', label: t('customerServices.comms.subjectSummary'), render: (_, r) => r.subject },
    { key: 'agent', label: t('customerServices.comms.agent'), render: (_, r) => r.agent },
  ], [t, commsTypeLabelByName])

  const csTabs = useMemo(() => [
    { id: 'tracking', label: t('customerServices.tabTracking'), icon: <Bx name="bx-package" /> },
    { id: 'tickets', label: t('customerServices.tabTickets'), icon: <Bx name="bx-message-alt-detail" /> },
    { id: 'comms', label: t('customerServices.tabComms'), icon: <Bx name="bx-chat" /> },
  ], [t])

  return {
    t,
    activeTab,
    setActiveTab,
    alert,
    setAlert,
    csTabs,
    formatDate,
    ticketStatusLabel,
    // Tracking
    trackingLoading,
    trackingError,
    trackingStatuses,
    trackingStatusesLoading,
    trackingStatusesError,
    refetchTracking: loadTracking,
    trackingFilters,
    setTrackingFilters,
    paginatedTracking: trackingList,
    trackingPagination: trackingPaginationState,
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
    openViewShipment,
    closeViewShipment,
    // Tickets
    ticketsLoading,
    ticketsError,
    refetchTickets: loadTickets,
    ticketFilters,
    setTicketFilters,
    tickets,
    paginatedTickets: tickets,
    ticketPagination: ticketPaginationState,
    ticketColumns,
    ticketTypes,
    ticketPriorities,
    ticketStatuses,
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
    handleUpdateTicketStatus,
    updatingStatusId,
    handleDeleteTicket,
    handleDeleteTicketConfirm,
    deleteTicketId,
    setDeleteTicketId: setDeleteTicketIdState,
    deleteTicketSubmitting,
    ticketSubmitting,
    ticketExportLoading,
    handleExportTickets,
    // Comms
    commsLoading,
    commsError,
    refetchComms: loadComms,
    commsFilters,
    setCommsFilters,
    paginatedComms: comms,
    commsPagination: commsPaginationState,
    commsColumns,
    commsTypes,
    showAddComms,
    setShowAddComms,
    commsForm,
    setCommsForm,
    handleSaveCommsLog,
    commsSubmitting,
    clientsForComms,
    // Busy
    isBusy: trackingSubmitting || ticketSubmitting || commsSubmitting || ticketExportLoading || deleteTicketSubmitting,
  }
}
