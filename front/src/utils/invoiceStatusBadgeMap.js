export function normalizeInvoiceStatus(status) {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'partially_paid') return 'partial'
  if (s === 'issued') return 'unpaid'
  return s || 'draft'
}

export function getInvoiceStatusBadgeMeta(status, t) {
  const normalized = normalizeInvoiceStatus(status)
  const map = {
    paid: {
      tone: 'paid',
      label: t('invoices.status.paid', { defaultValue: 'Paid' }),
      icon: 'check',
    },
    partial: {
      tone: 'partial',
      label: t('invoices.status.partial', { defaultValue: 'Partially Paid' }),
      icon: 'clock',
    },
    unpaid: {
      tone: 'unpaid',
      label: t('invoices.status.unpaid', { defaultValue: 'Unpaid' }),
      icon: 'alert',
    },
    draft: {
      tone: 'draft',
      label: t('invoices.status.draft', { defaultValue: 'Draft' }),
      icon: 'dot',
    },
    overdue: {
      tone: 'overdue',
      label: t('invoices.status.overdue', { defaultValue: 'Overdue' }),
      icon: 'alert_octagon',
    },
    cancelled: {
      tone: 'draft',
      label: t('invoices.status.cancelled', { defaultValue: 'Cancelled' }),
      icon: 'dot',
    },
  }
  return map[normalized] || {
    tone: 'draft',
    label: status || t('common.unknown', { defaultValue: 'Unknown' }),
    icon: 'dot',
  }
}

