/**
 * Customer Services feature – constants and seed data.
 */

export const TRACKING_STATUS_KEYS = {
  booking_confirmed: 'customerServices.tracking.statusBookingConfirmed',
  container_allocation: 'customerServices.tracking.statusContainerAllocation',
  loading_in_progress: 'customerServices.tracking.statusLoadingInProgress',
  vessel_departed: 'customerServices.tracking.statusVesselDeparted',
  in_transit: 'customerServices.tracking.statusInTransit',
  customs_clearance: 'customerServices.tracking.statusCustomsClearance',
  ready_for_delivery: 'customerServices.tracking.statusReadyForDelivery',
  delivered: 'customerServices.tracking.statusDelivered',
}

export const TRACKING_TEMPLATE_KEYS = { ...TRACKING_STATUS_KEYS }

export const SEED_TRACKING = [
  { id: 't1', bl_number: 'BL-2026-0248', client: 'Mansour & Partners', route: 'Alexandria → Jeddah', status: 'in_transit', last_update: '25/02 — Shipment at sea heading to Jeddah' },
  { id: 't2', bl_number: 'BL-2026-0247', client: 'Al Eman Foods', route: 'Damietta → Dubai', status: 'booking_confirmed', last_update: '24/02 — Booking confirmed' },
  { id: 't3', bl_number: 'BL-2026-0245', client: 'Taha Textiles', route: 'Sokhna → Hamburg', status: 'customs_clearance', last_update: '26/02 — Port arrival — clearance started' },
  { id: 't4', bl_number: 'BL-2026-0244', client: 'Nile Craft Egypt', route: 'Port Said → Marseille', status: 'vessel_departed', last_update: '26/02 — Departed port' },
]

export const SEED_TICKETS = [
  { id: 'tk1', ticket_number: '#TKT-2026-1042', client: 'Mansour & Partners', shipment: 'BL-2026-0248', type: 'inquiry', priority: 'medium', assigned_to: 'cs', status: 'open', date: '2026-02-26' },
  { id: 'tk2', ticket_number: '#TKT-2026-1041', client: 'Al Eman Foods', shipment: '—', type: 'inquiry', priority: 'low', assigned_to: 'accounting', status: 'closed', date: '2026-02-25' },
  { id: 'tk3', ticket_number: '#TKT-2026-1040', client: 'Taha Textiles', shipment: 'BL-2026-0245', type: 'complaint', priority: 'high', assigned_to: 'operations', status: 'in_progress', date: '2026-02-25' },
]

export const COMMS_TYPES = {
  call: 'customerServices.comms.typeCall',
  whatsapp: 'customerServices.comms.typeWhatsapp',
  email: 'customerServices.comms.typeEmail',
  meeting: 'customerServices.comms.typeMeeting',
  note: 'customerServices.comms.typeNote',
}

export const SEED_COMMS = [
  { id: 'c1', date_time: '26/02/2026 10:30', type: 'call', related_to: 'Mansour & Partners (Client)', subject: 'Inquiry about BL-2026-0248 ETA', agent: 'Support Agent' },
  { id: 'c2', date_time: '25/02/2026 14:00', type: 'email', related_to: '#TKT-2026-1041 (Ticket)', subject: 'Reply to invoice inquiry', agent: 'Support Agent' },
  { id: 'c3', date_time: '25/02/2026 09:15', type: 'note', related_to: 'BL-2026-0245 (Shipment)', subject: 'Client notified of customs clearance start', agent: 'Support Agent' },
]

export const TICKET_STATUS_KEYS = {
  open: 'customerServices.statusOpen',
  in_progress: 'customerServices.tickets.statusInProgress',
  waiting: 'customerServices.tickets.statusWaiting',
  closed: 'customerServices.statusClosed',
}

export const TICKET_TYPE_KEYS = {
  inquiry: 'customerServices.tickets.typeInquiry',
  complaint: 'customerServices.tickets.typeComplaint',
  request: 'customerServices.tickets.typeRequest',
}

export const TICKET_PRIORITY_KEYS = {
  low: 'customerServices.tickets.priorityLow',
  medium: 'customerServices.tickets.priorityMedium',
  high: 'customerServices.tickets.priorityHigh',
}

/** Static list for create-ticket form (backend has no list endpoint; IDs from seeder). */
export const TICKET_PRIORITIES = [
  { id: 1, name: 'low', label_ar: 'منخفض' },
  { id: 2, name: 'medium', label_ar: 'متوسط' },
  { id: 3, name: 'high', label_ar: 'عالي' },
]

export const TICKET_ASSIGNED_KEYS = {
  cs: 'customerServices.tickets.assignedCs',
  operations: 'customerServices.tickets.assignedOperations',
  sales: 'customerServices.tickets.assignedSales',
  accounting: 'customerServices.tickets.assignedAccounting',
}

export const COMMS_TYPE_ICONS = {
  call: 'bx-phone',
  email: 'bx-envelope',
  note: 'bx-note',
  meeting: 'bx-group',
  whatsapp: 'bxl-whatsapp',
}

export const CLIENT_OPTIONS = [
  'Mansour & Partners',
  'Al Eman Foods',
  'Taha Textiles',
  'Nile Craft Egypt',
]
