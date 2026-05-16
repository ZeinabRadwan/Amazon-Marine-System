import { expenseBucket, expenseHaystack, LINE_TEMPLATES } from './shipmentFinUtils'

const OTHER_DESC_PREFIX = {
  shipping: 'Other Charges',
  inland: 'Other Expenses',
  customs: 'Other Customs Expenses',
  insurance: 'Other Insurance Expenses',
}

const LEGACY_MANUAL_EXTRA_BUCKET = 'manual_extra'

function extractUserDescription(stored, prefix) {
  if (!stored || typeof stored !== 'string') return ''
  const p = `${prefix}:`
  const s = stored.trim()
  if (s.startsWith(p)) return s.slice(p.length).trim()
  return s
}

function isManualInvoiceLineRow(row) {
  return Boolean(row?.is_manual_invoice_line) || String(row?.bucket_id || '') === LEGACY_MANUAL_EXTRA_BUCKET
}

/** Non-template lines (orphans / “Other”) — title same rules as cost-items display fallback. */
function orphanOrCustomFeeTitle(ex, bucket, t) {
  const base = OTHER_DESC_PREFIX[bucket] || 'Other'
  const fromDesc = extractUserDescription(ex.description || '', base)
  const title = String(ex.title || '').trim()
  return (
    title ||
    fromDesc ||
    String(ex.description || '').trim() ||
    t('shipments.fin.customItemFallback', { defaultValue: 'Custom Item' })
  )
}

/**
 * Fee title shown on Selling tab must match Shipment Cost Items:
 * template label keys first, then matchers (same order as partitionBucketRows), then orphan/custom title.
 */
export function resolveCostItemStyleFeeNameFromExpense(ex, t, isReefer) {
  const bucket = ex.bucket_id || expenseBucket(ex)
  const tid = String(ex.template_id || '').trim().toLowerCase()
  const templates = LINE_TEMPLATES[bucket] || []

  if (tid && tid !== 'other') {
    const tpl = templates.find((x) => x.id === tid)
    if (tpl) return t(tpl.labelKey)
  }

  const hay = expenseHaystack(ex)
  for (const tpl of templates) {
    if (tpl.reeferOnly && !isReefer) continue
    if (tpl.matchers.some((re) => re.test(hay))) {
      return t(tpl.labelKey)
    }
  }

  if (tid === 'other') {
    return orphanOrCustomFeeTitle(ex, bucket, t)
  }

  return orphanOrCustomFeeTitle(ex, bucket, t)
}

export function resolveCostItemStyleFeeNameFromRow(row, t, isReefer) {
  if (isManualInvoiceLineRow(row)) {
    const name = String(row.description || row.label || row.expense_title || '').trim()

    return name || t('shipments.fin.customItemFallback', { defaultValue: 'Custom Item' })
  }
  if (String(row.expenseId || '').startsWith('tmp-')) {
    return t('shipments.fin.customItemFallback', { defaultValue: 'Custom Item' })
  }
  const syntheticEx = {
    template_id: row.template_id,
    bucket_id: row.bucket_id,
    title: row.expense_title,
    description:
      row.expense_description != null && row.expense_description !== ''
        ? row.expense_description
        : row.description,
    category_name: row.category_name,
    invoice_number: row.invoice_number,
  }
  return resolveCostItemStyleFeeNameFromExpense(syntheticEx, t, isReefer)
}
