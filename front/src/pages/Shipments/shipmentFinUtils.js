/**
 * Shared logic and definitions for Shipment Financials and Attachments
 */

/** Matches draft client invoice line used for handling / service fee. */
export const HANDLING_FEE_DESCRIPTION = 'Handling Fee'

export const BUCKET_DEFS = [
  {
    id: 'shipping',
    titleKey: 'shipments.fin.bucketShippingTitle',
    subKey: 'shipments.fin.bucketShippingSub',
    matchers: [/ship|line|ocean|freight|thc|b\/?l|telex|courier|dhl|container|of\b|بحري|ملاحي|شحن/i],
  },
  {
    id: 'inland',
    titleKey: 'shipments.fin.bucketInlandTitle',
    subKey: 'shipments.fin.bucketInlandSub',
    matchers: [/inland|transport|truck|haul|genset|overnight|receipt|داخلي|نقل|برّي/i],
  },
  {
    id: 'customs',
    titleKey: 'shipments.fin.bucketCustomsTitle',
    subKey: 'shipments.fin.bucketCustomsSub',
    matchers: [/custom|clearance|declar|duty|جمرك|تخليص/i],
  },
  {
    id: 'insurance',
    titleKey: 'shipments.fin.bucketInsuranceTitle',
    subKey: 'shipments.fin.bucketInsuranceSub',
    matchers: [/insur|premium|تأمين/i],
  },
]

export function expenseBucket(expense) {
  if (expense?.bucket_id && String(expense.bucket_id).trim() !== '') {
    return expense.bucket_id
  }
  const rawDesc = (expense.description || '').trim()
  if (/^other\s*\(shipping\)/i.test(rawDesc) || /^Other Charges:/i.test(rawDesc)) return 'shipping'
  if (/^other\s*\(inland\)/i.test(rawDesc) || /^Other Expenses:/i.test(rawDesc)) return 'inland'
  if (/^other\s*\(customs\)/i.test(rawDesc) || /^Other Customs Expenses:/i.test(rawDesc)) return 'customs'
  if (/^other\s*\(insurance\)/i.test(rawDesc)) return 'insurance'
  
  const hay = `${expense.category_name || ''} ${expense.description || ''}`.toLowerCase()
  for (const b of BUCKET_DEFS) {
    if (b.matchers.some((re) => re.test(hay))) return b.id
  }
  return 'other'
}

export const LINE_TEMPLATES = {
  shipping: [
    {
      id: 'of',
      labelKey: 'shipments.fin.lines.oceanFreight',
      matchers: [/ocean\s*freight|^\s*of\s|شحن\s*بحري|^freight\b|sea\s*freight|خط\s*ملاحي|فريت/i],
    },
    { id: 'thc', labelKey: 'shipments.fin.lines.thc', matchers: [/\bthc\b/i] },
    {
      id: 'power',
      labelKey: 'shipments.fin.lines.powerCharge',
      reeferOnly: true,
      matchers: [/power\s*charg|reefer.*power|كهر|ريفير.*كهرب/i],
    },
    {
      id: 'bl',
      labelKey: 'shipments.fin.lines.blFee',
      matchers: [/b\/?l\s*fee|^bl\s|bill of lading|رسوم.*\bb\/l\b|بي.?إل/i],
    },
    { id: 'telex', labelKey: 'shipments.fin.lines.telex', matchers: [/telex|تيلكس/i] },
    { id: 'dhl', labelKey: 'shipments.fin.lines.dhl', optional: true, matchers: [/\bdhl\b|courier|سريع|بريد/i] },
  ],
  inland: [
    {
      id: 'inlandFreight',
      labelKey: 'shipments.fin.lines.inlandFreight',
      matchers: [/inland|internal\s*transport|truck|haul|نقل\s*داخلي|برّي|سيارات/i],
    },
    { id: 'genset', labelKey: 'shipments.fin.lines.genset', reeferOnly: true, matchers: [/genset|مولد|جينسيت/i] },
    {
      id: 'receipts',
      labelKey: 'shipments.fin.lines.officialReceipts',
      matchers: [/official\s*receipt|receipts?\s*cost|إيصال\s*رسمي|إيصالات|فواتير/i],
    },
    {
      id: 'overnight',
      labelKey: 'shipments.fin.lines.overnight',
      optional: true,
      matchers: [/overnight|مبيت|إقامة\s*ليل/i],
    },
  ],
  customs: [
    {
      id: 'decl',
      labelKey: 'shipments.fin.lines.customsDeclaration',
      matchers: [/declaration\s*opening|فتح\s*ملف|أجور\s*فتح|تصريح\s*جمركي/i],
    },
    {
      id: 'custReceipts',
      labelKey: 'shipments.fin.lines.customsReceipts',
      matchers: [/customs.*receipt|clearance.*receipt|جمرك.*إيصال|تخليص.*إيصال/i],
    },
  ],
  insurance: [{ id: 'premium', labelKey: 'shipments.fin.lines.insurancePremium', matchers: [/premium|تأمين|insurance|قسط/i] }],
}

export function expenseHaystack(ex) {
  return `${ex.category_name || ''} ${ex.description || ''} ${ex.invoice_number || ''}`.toLowerCase()
}

export function partitionBucketRows(bucketId, bucketRows, isReefer) {
  const templates = LINE_TEMPLATES[bucketId]
  if (!templates) {
    return { sections: [], orphans: bucketRows }
  }
  const templateById = Object.fromEntries(templates.map((tpl) => [tpl.id, tpl]))
  const used = new Set()
  const sections = []
  for (const tpl of templates) {
    // Reefer-only template rows still bind saved lines by explicit template_id from the API.
    // Otherwise a line saved as template_id "power" / "genset" would never be marked "used" when
    // the shipment is not flagged reefer, and would appear under "Recorded Custom Items".
    if (tpl.reeferOnly && !isReefer) {
      const matched = []
      for (const ex of bucketRows) {
        if (used.has(ex.id)) {
          continue
        }
        if (ex?.template_id && templateById[ex.template_id] && ex.template_id === tpl.id) {
          matched.push(ex)
          used.add(ex.id)
        }
      }
      sections.push({ tpl, matched })
      continue
    }
    const matched = []
    for (const ex of bucketRows) {
      if (used.has(ex.id)) continue
      if (ex?.template_id && templateById[ex.template_id] && ex.template_id === tpl.id) {
        matched.push(ex)
        used.add(ex.id)
        continue
      }
      if (tpl.matchers.some((re) => re.test(expenseHaystack(ex)))) {
        matched.push(ex)
        used.add(ex.id)
      }
    }
    sections.push({ tpl, matched })
  }
  const orphans = bucketRows.filter((ex) => !used.has(ex.id))
  return { sections, orphans }
}

export const ATTACHMENTS_MODAL_TITLE_KEY = 'shipments.tabs.attachments'

const OTHER_DESC_PREFIX = {
  shipping: 'Other Charges',
  inland: 'Other Expenses',
  customs: 'Other Customs Expenses',
  insurance: 'Other Insurance Expenses',
}

function extractUserDescription(stored, prefix) {
  if (!stored || typeof stored !== 'string') return ''
  const p = `${prefix}:`
  const s = stored.trim()
  if (s.startsWith(p)) return s.slice(p.length).trim()
  return s
}

function orphanOrCustomInvoiceFeeTitle(it, bucket, t) {
  const base = OTHER_DESC_PREFIX[bucket] || 'Other'
  const fromDesc = extractUserDescription(it.description || '', base)
  const title = String(it.title || '').trim()
  return (
    title ||
    fromDesc ||
    String(it.description || '').trim() ||
    t('shipments.fin.customItemFallback', { defaultValue: 'Custom Item' })
  )
}

/** Parse template id from client-invoice source_key, e.g. `shipping::of::draft::…` → `of`. */
export function parseTemplateIdFromInvoiceSourceKey(sourceKey) {
  const s = String(sourceKey || '').trim()
  if (!s) return ''
  const parts = s.split('::').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2 && ['shipping', 'inland', 'customs', 'insurance'].includes(parts[0])) {
    return parts[1].toLowerCase()
  }
  return ''
}

function invoiceItemBucket(it) {
  const sk = String(it.section_key || '').trim().toLowerCase()
  if (sk === 'shipping') return 'shipping'
  if (sk === 'inland') return 'inland'
  if (sk === 'customs') return 'customs'
  if (sk === 'insurance') return 'insurance'
  return expenseBucket({
    description: it.description,
    category_name: it.category_name,
    bucket_id: undefined,
  })
}

/**
 * Fee column label for persisted invoice lines — matches ShipmentFinancials selling grid (template keys + matchers).
 * @param {object} it Invoice line ({ description, title, section_key, source_key, category_name, invoice_number })
 * @param {(key: string, opts?: object) => string} t i18n `t`
 * @param {boolean} [isReefer]
 */
export function resolveInvoiceItemFeeDisplayName(it, t, isReefer = false) {
  const bucket = invoiceItemBucket(it)
  const templates = LINE_TEMPLATES[bucket] || []
  const tid =
    String(it.template_id || parseTemplateIdFromInvoiceSourceKey(it.source_key) || '')
      .trim()
      .toLowerCase()

  if (tid && tid !== 'other') {
    const tpl = templates.find((x) => x.id === tid)
    if (tpl) return t(tpl.labelKey)
  }

  const synthetic = {
    category_name: it.category_name,
    description: it.description,
    invoice_number: it.invoice_number,
    title: it.title,
  }
  const hay = expenseHaystack(synthetic)

  for (const tpl of templates) {
    if (tpl.reeferOnly && !isReefer) continue
    if (tpl.matchers.some((re) => re.test(hay))) {
      return t(tpl.labelKey)
    }
  }

  const descRaw = String(it.description || '').trim()
  const descLower = descRaw.toLowerCase()
  if (descLower && templates.some((x) => x.id === descLower)) {
    const tpl = templates.find((x) => x.id === descLower)
    if (tpl) return t(tpl.labelKey)
  }

  return orphanOrCustomInvoiceFeeTitle(it, bucket, t)
}
