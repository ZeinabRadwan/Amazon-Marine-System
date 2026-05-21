import { ExternalLink, PanelRight } from 'lucide-react'
import { treasuryAccountDisplayName } from '../../utils/treasuryAccountDisplay'
import { expenseBucket, LINE_TEMPLATES } from '../Shipments/shipmentFinUtils'

/** Paid / partial / unpaid from currency maps (customer balances or partner settlement). */
export const EPS = 0.0001

/**
 * Client-side guard before vendor_payment with a bank account (same currency leg only).
 * FX auto-convert flows skip this — the API enforces converted ledger amounts.
 *
 * @param {{ bankId: string|number, currencyCode: string, amount: number, treasuryBanks: unknown[] }} p
 * @returns {{ ok: boolean }}
 */
export function validateWithdrawalAgainstTreasuryBank(p) {
  const banks = Array.isArray(p?.treasuryBanks) ? p.treasuryBanks : []
  const bid = Number(p?.bankId)
  if (!Number.isFinite(bid) || bid <= 0) return { ok: true }
  const amt = Number(p?.amount)
  if (!Number.isFinite(amt) || amt <= 0) return { ok: true }
  const bank = banks.find((b) => Number(b?.id) === bid)
  const map = bank?.balance_by_currency
  if (!bank || !map || typeof map !== 'object') return { ok: true }
  const c = String(p?.currencyCode || '').toUpperCase()
  const avail = Number(map[c] ?? map[String(c)] ?? 0)
  if (amt > avail + EPS) return { ok: false }
  return { ok: true }
}

/** Prefer API `account_status`; fall back to currency maps (legacy rows). */
export function resolveCustomerAccountStatus(row) {
  const fromApi = String(row?.account_status || '').toLowerCase().trim()
  if (fromApi) return fromApi
  return rowPaymentStatus(row?.paid_amount, row?.remaining_balance)
}

export function rowPaymentStatus(paidMap, remainingMap) {
  const currencies = new Set([
    ...Object.keys(paidMap || {}),
    ...Object.keys(remainingMap || {}),
  ])
  let anyRemaining = false
  let anyPaid = false
  for (const c of currencies) {
    const r = Number(remainingMap?.[c]) || 0
    const p = Number(paidMap?.[c]) || 0
    if (r > EPS) anyRemaining = true
    if (p > EPS) anyPaid = true
  }
  if (!anyRemaining) return 'paid'
  if (anyPaid && anyRemaining) return 'partial'
  return 'unpaid'
}

/**
 * Whether a vendor_payment applies to a shipment: direct shipment_id or via vendor bill.
 * Do not rely on shipment_id alone — many payments are linked only through vendor_bill_id.
 */
export function vendorPaymentMatchesShipment(p, shipmentId) {
  const sid = Number(shipmentId)
  if (!Number.isFinite(sid) || sid <= 0) return false
  const direct = p?.shipment_id ?? p?.shipment?.id
  if (Number(direct) === sid) return true
  const bill = p?.vendor_bill ?? p?.vendorBill
  const billSid = bill?.shipment_id ?? bill?.shipment?.id
  if (Number(billSid) === sid) return true
  return false
}

/** True if any currency in the map has a strictly positive amount (partner paid / allocated). */
export function currencyMapHasPositivePaid(map, threshold = EPS) {
  if (!map || typeof map !== 'object') return false
  for (const v of Object.values(map)) {
    if ((Number(v) || 0) > threshold) return true
  }
  return false
}

const COST_BUCKET_I18N_KEYS = {
  shipping: 'accountings.costBucketShipping',
  inland: 'accountings.costBucketInland',
  customs: 'accountings.costBucketCustoms',
  insurance: 'accountings.costBucketInsurance',
  other: 'accountings.costBucketOther',
}

/**
 * Display label for a partner statement cost line (aligned with shipment financial cost items).
 * Priority: saved name/label → template_id → matcher on title/description → text fields → bucket.
 */
export function partnerCostLineDisplayLabel(line, t, opts = {}) {
  const isReefer = Boolean(opts.isReefer)

  const bucket =
    line.bucket_id != null && String(line.bucket_id).trim() !== ''
      ? String(line.bucket_id).toLowerCase()
      : expenseBucket(line)

  const explicit = [line.label, line.name].map((x) => String(x ?? '').trim()).filter(Boolean)
  if (explicit.length > 0) {
    return [...new Set(explicit)].join(' · ')
  }

  const templates = LINE_TEMPLATES[bucket]
  const tplId = line.template_id != null && line.template_id !== '' ? String(line.template_id) : ''

  if (templates && tplId) {
    const tpl = templates.find((x) => x.id === tplId)
    if (tpl?.labelKey && (!tpl.reeferOnly || isReefer)) {
      const lab = t(tpl.labelKey)
      if (lab) return lab
    }
  }

  const hay = `${line.description || ''} ${line.title || ''} ${line.category_name || ''}`.toLowerCase()
  if (templates) {
    for (const tpl of templates) {
      if (tpl.reeferOnly && !isReefer) continue
      if (tpl.matchers?.some((re) => re.test(hay))) {
        return t(tpl.labelKey)
      }
    }
  }

  const rest = [line.title, line.category_name, line.description]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
  const uniqRest = [...new Set(rest)]
  if (uniqRest.length > 0) return uniqRest.join(' · ')

  let key = COST_BUCKET_I18N_KEYS[bucket]
  if (!key && bucket.startsWith('custom_')) {
    key = 'accountings.costBucketCustomSection'
  }
  if (!key) key = COST_BUCKET_I18N_KEYS.other
  return t(key)
}

/**
 * Split vendor-level paid/remaining per currency across cost lines proportionally by line amount
 * (no line-level settlement in DB — display-only allocation).
 */
export function enrichPartnerCostLines(lines, paidMap, remainingMap) {
  const list = Array.isArray(lines) ? [...lines] : []
  const byCur = {}
  for (const line of list) {
    const c = String(line.currency_code || 'USD').toUpperCase()
    if (!byCur[c]) byCur[c] = []
    byCur[c].push(line)
  }
  return list.map((line, idx) => {
    const c = String(line.currency_code || 'USD').toUpperCase()
    const siblings = byCur[c] || []
    const sumAmt = siblings.reduce((s, l) => s + Math.max(0, Number(l.amount) || 0), 0)
    const paidCur = Number(paidMap?.[c]) || 0
    const remCur = Number(remainingMap?.[c]) || 0
    const lineAmt = Math.max(0, Number(line.amount) || 0)
    const frac = sumAmt > 0 ? lineAmt / sumAmt : 0
    const linePaid = paidCur * frac
    const lineRemaining = sumAmt > 0 ? remCur * frac : lineAmt
    const st = rowPaymentStatus({ [c]: linePaid }, { [c]: lineRemaining })
    const key =
      line.id != null && line.id !== ''
        ? `cost-${line.id}`
        : `cost-${line.shipment_id ?? 'x'}-${idx}-${lineAmt}-${c}`
    return {
      ...line,
      _rowKey: key,
      _alloc_paid: linePaid,
      _alloc_remaining: lineRemaining,
      _alloc_status: st,
    }
  })
}

export function bankAccountLabel(acc, locale) {
  if (!acc) return null
  const base = treasuryAccountDisplayName(acc, locale)
  if (!base) return null
  const cur = Array.isArray(acc.supported_currencies) ? acc.supported_currencies.join('/') : ''
  return cur ? `${base} (${cur})` : base
}

/** True if payment currency is allowed for this bank wallet (empty supported list = no restriction). */
export function bankSupportsCurrency(bank, currencyCode) {
  const list = bank?.supported_currencies
  if (!Array.isArray(list) || list.length === 0) return true
  const c = String(currencyCode || '')
    .toUpperCase()
    .trim()
  if (!c) return false
  return list.some((x) => String(x || '').toUpperCase().trim() === c)
}

export function partnerVendorPaymentSettlementNote(t) {
  return t('accountings.vendorPaymentReducesPayable', 'Reduces amount owed to this partner')
}

export const ACCOUNTINGS_PAYMENT_CURRENCIES = ['USD', 'EUR', 'EGP']

export function normalizeAccountingsPaymentCurrency(code) {
  const c = String(code || 'USD').toUpperCase().trim()
  return ACCOUNTINGS_PAYMENT_CURRENCIES.includes(c) ? c : 'USD'
}

export function StatementShipmentMeta({
  shipmentId,
  blNumber,
  shipmentType,
  bookingNumber,
  acidNumber,
  bookingDate,
  locale,
  t,
  compact = false,
}) {
  const top = []
  const idNum = Number(shipmentId)
  if (Number.isFinite(idNum) && idNum > 0) top.push(`#${idNum}`)
  if (blNumber) top.push(String(blNumber))
  const acid = acidNumber != null && String(acidNumber).trim() !== '' ? String(acidNumber).trim() : ''
  const sub = [
    shipmentType,
    bookingNumber ? `${t('accountings.bookingShort', 'Bk')}: ${bookingNumber}` : null,
    acid ? `${t('accountings.shipmentAcidRef', 'ACID')}: ${acid}` : null,
    bookingDate ? `${t('accountings.bookingDateShort', 'Booking date')}: ${formatStatementDetailDate(bookingDate, locale)}` : null,
  ].filter(Boolean)
  return (
    <div className={`accountings-statement-ship-meta${compact ? ' accountings-statement-ship-meta--compact' : ''}`}>
      <div className="accountings-statement-ship-meta__primary accountings-wire-mono">
        {top.length ? top.join(' · ') : '—'}
      </div>
      {sub.length > 0 && (
        <div className="accountings-statement-ship-meta__sub text-xs text-gray-500 dark:text-gray-400">{sub.join(' · ')}</div>
      )}
    </div>
  )
}

export function StatementShipmentNav({ shipmentId, navigate, t }) {
  const id = Number(shipmentId)
  if (!Number.isFinite(id) || id <= 0) {
    return <span className="text-gray-400 text-xs">—</span>
  }
  return (
    <div className="accountings-statement-ship-nav">
      <button
        type="button"
        className="accountings-action-icon-btn"
        title={t('accountings.viewShipmentModule', 'View Shipments')}
        aria-label={t('accountings.viewShipmentModule')}
        onClick={() => navigate('/shipments')}
      >
        <ExternalLink className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="accountings-action-icon-btn"
        title={t('accountings.openShipmentDetails', 'Open shipment details')}
        aria-label={t('accountings.openShipmentDetails')}
        onClick={() => navigate(`/shipments?shipment_id=${id}`)}
      >
        <PanelRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export function dominantBucketByAmount(lines) {
  const w = { shipping: 0, inland: 0, customs: 0, insurance: 0, other: 0 }
  for (const l of lines || []) {
    const b = String(l.bucket_id || 'other').toLowerCase()
    const a = Number(l.amount) || 0
    if (b === 'shipping') w.shipping += a
    else if (b === 'inland') w.inland += a
    else if (b === 'customs') w.customs += a
    else if (b === 'insurance') w.insurance += a
    else w.other += a
  }
  let maxK = 'other'
  let maxV = -1
  for (const [k, v] of Object.entries(w)) {
    if (v > maxV) {
      maxV = v
      maxK = k
    }
  }
  return maxK
}

/** Maps UI partner-type filter to a stable category key (vendor master + cost buckets). */
export function partnerCategoryKey(row, vendorTypes) {
  const vid = row.partner_id
  if (!vid) return 'other'
  const vt = vendorTypes?.[String(vid)] ?? vendorTypes?.[vid] ?? null
  if (vt === 'shipping') return 'shipping'
  if (vt === 'transport') return 'transport'
  if (vt === 'customs') return 'customs'
  if (vt === 'insurance') return 'insurance'
  const dom = dominantBucketByAmount(row.lines)
  if (dom === 'inland') return 'transport'
  if (dom === 'shipping') return 'shipping'
  if (dom === 'customs') return 'customs'
  if (dom === 'insurance') return 'insurance'
  return 'other'
}

/** Maps vendors.type / legacy codes → partnerLedger.categories keys (localized). */
const LEDGER_CATEGORY_KEYS = new Set(['shipping_line', 'inland_transport', 'customs_clearance', 'insurance'])

export function canonicalPartnerLedgerCategory(rawType) {
  if (rawType == null || String(rawType).trim() === '') return null
  const s = String(rawType).toLowerCase().trim()
  const alias = {
    shipping: 'shipping_line',
    shipping_line: 'shipping_line',
    transport: 'inland_transport',
    inland: 'inland_transport',
    inland_transport: 'inland_transport',
    customs: 'customs_clearance',
    customs_clearance: 'customs_clearance',
    insurance: 'insurance',
  }
  if (alias[s]) return alias[s]
  if (LEDGER_CATEGORY_KEYS.has(s)) return s
  return null
}

/** Inferred bucket category → partnerLedger.categories key. */
export function inferredCategoryToLedgerCategory(cat) {
  const m = {
    shipping: 'shipping_line',
    transport: 'inland_transport',
    customs: 'customs_clearance',
    insurance: 'insurance',
    other: null,
  }
  return m[cat] ?? null
}

/** Customer statement detail: dates, methods, exchange summaries. */
export function formatStatementDetailDate(value, locale) {
  if (!value) return '—'
  const s = String(value)
  const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s)
  if (Number.isNaN(d.getTime())) return s
  return new Intl.DateTimeFormat(locale || 'en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function paymentMethodLabel(method, t) {
  const m = String(method || '').toLowerCase().replace(/\s+/g, '_')
  if (m === 'bank_transfer') return t('invoices.payment.methodBankTransfer', 'Bank transfer')
  if (m === 'cash') return t('invoices.payment.methodCash', 'Cash')
  if (m === 'cheque' || m === 'check') return t('invoices.payment.methodCheque', 'Cheque')
  if (m === 'wallet') return t('invoices.payment.methodWallet', 'Wallet')
  return method && String(method).trim() ? String(method) : '—'
}

/** Vendor payment display date: paid_at from registration record, then created_at. */
export function vendorPaymentPostedAt(p) {
  return p?.paid_at ?? p?.created_at ?? null
}

/** Traceability: payment id + treasury entry link when present. */
export function vendorPaymentSettlementTrace(p) {
  const parts = []
  const pid = p?.id
  if (pid != null && pid !== '') parts.push(`PMT-${pid}`)
  const entries = p?.treasury_entries ?? p?.treasuryEntries
  const first = Array.isArray(entries) && entries.length > 0 ? entries[0] : null
  if (first?.id != null) parts.push(`TE-${first.id}`)
  const ref = first?.reference != null && String(first.reference).trim() !== '' ? String(first.reference).trim() : ''
  if (ref) parts.push(ref)
  return parts.length ? parts.join(' · ') : '—'
}

/** Plain amount then ISO code — avoids Intl currency style duplicating symbols (e.g. USD … US$). */
export function formatMoneyCodeSuffix(amount, currencyCode, locale) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  const code = String(currencyCode || 'USD').toUpperCase()
  const formatted = new Intl.NumberFormat(locale || undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return `${formatted} ${code}`
}

/** Customer payment detail: show direct conversion when payment currency matches invoice currency. */
export function customerPaymentExchangeRateLine(p, t) {
  const invCur = String(p.invoice_currency_code || '').toUpperCase()
  const payCur = String(p.currency_code || '').toUpperCase()
  if (!payCur || !invCur || payCur === invCur) {
    return t('accountings.exchangeRateDirect', 'Direct (no conversion)')
  }
  const rate = p.exchange_rate != null ? Number(p.exchange_rate) : NaN
  const tgt = String(p.target_currency_code || '').toUpperCase()
  if (Number.isFinite(rate) && rate > 0 && tgt && payCur) {
    return `1 ${tgt} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${payCur}`
  }
  return t('accountings.exchangeRateDirect', 'Direct (no conversion)')
}

export function formatMoneyPlain(amount, currencyCode, locale) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  const code = String(currencyCode || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${code}`
  }
}

export function getPartnerTypeDisplayLabel(row, vendorTypes, t) {
  if (!row?.partner_id) {
    return '—'
  }
  const vid = row.partner_id
  const raw = vendorTypes?.[String(vid)] ?? vendorTypes?.[vid]
  if (raw && String(raw).trim() !== '') {
    const ledgerKey = canonicalPartnerLedgerCategory(raw)
    if (ledgerKey) {
      return t(`partnerLedger.categories.${ledgerKey}`)
    }
    if (raw === 'other') {
      return t('vendors.types.other')
    }
  }
  const cat = partnerCategoryKey(row, vendorTypes)
  const ledgerKey = inferredCategoryToLedgerCategory(cat)
  if (ledgerKey) {
    return t(`partnerLedger.categories.${ledgerKey}`)
  }
  return t('vendors.types.other')
}

export function lineMatchesDateRange(line, dateFrom, dateTo) {
  const d = line.expense_date
  if (!d) return false
  const s = String(d).slice(0, 10)
  if (dateFrom && s < dateFrom) return false
  if (dateTo && s > dateTo) return false
  return true
}

export function partnerMatchesDateFilter(lines, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true
  const list = lines || []
  if (!list.length) return false
  return list.some((ln) => lineMatchesDateRange(ln, dateFrom, dateTo))
}

/** Partner Statement: only vendors with positive shipment-cost payables. */
export function hasPositivePayable(map) {
  if (!map || typeof map !== 'object') return false
  return Object.values(map).some((v) => Number(v) > EPS)
}

export function countDistinctShipmentsFromLines(lines) {
  const ids = new Set()
  for (const l of lines || []) {
    const sid = l?.shipment_id
    const n = Number(sid)
    if (Number.isFinite(n) && n > 0) {
      ids.add(n)
    }
  }
  return ids.size
}
