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

export const COMMS_TYPES = {
  call: 'customerServices.comms.typeCall',
  whatsapp: 'customerServices.comms.typeWhatsapp',
  email: 'customerServices.comms.typeEmail',
  meeting: 'customerServices.comms.typeMeeting',
  note: 'customerServices.comms.typeNote',
} 
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

/** Icons for ticket type column (النوع) */
export const TICKET_TYPE_ICONS = {
  inquiry: 'bx-help-circle',
  complaint: 'bx-error-circle',
  request: 'bx-file-blank',
} 
