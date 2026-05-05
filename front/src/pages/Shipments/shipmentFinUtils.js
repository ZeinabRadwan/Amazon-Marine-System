/**
 * Shared logic and definitions for Shipment Financials and Attachments
 */

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
    if (tpl.reeferOnly && !isReefer) {
      sections.push({ tpl, matched: [] })
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
