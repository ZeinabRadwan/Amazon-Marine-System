import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Save,
  User,
  MapPin,
  DollarSign,
  Truck,
  Package,
  Receipt,
  Ship,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import { getStoredToken } from '../../Login'
import { listClients } from '../../../api/clients'
import { listOffers } from '../../../api/pricing'
import { getSettings } from '../../../api/settings'
import AsyncSelect from '../../../components/AsyncSelect'
import '../../Clients/ClientDetailModal.css'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import '../../Shipments/Shipments.css'
import '../Pricing.css'
import { formatLocaleMoney, formatPricingDecimal, mergeCurrencyAmountMaps, sortCurrencyCodes } from '../../../utils/dateUtils'
import { displayNumericInputValue, priceToFormString } from '../utils/pricingFormNumeric'
import {
  clearPricingQuoteDraft,
  getQuoteDraftScope,
  isQuoteDraftMeaningful,
  readPricingQuoteDraft,
  writePricingQuoteDraft,
} from '../utils/pricingQuoteDraftStorage'
import {
  buildSailingScheduleFromOffer,
  parseWeeklySailingDays,
  sanitizeSelectedSailingDate,
} from '../utils/sailingSchedule'
import { QuickAddClientModal } from '../../Clients/QuickAddClientModal'
import QuoteSailingDateSelector from './QuoteSailingDateSelector'
import {
  QuoteInlineDivider,
  QuoteInlineItem,
  QuoteInlineStrip,
  QuoteSummaryBadge,
  ShippingLineSummaryBadge,
} from './quoteFormLayout'
import {
  QuoteGrandSummaryPanel,
  QuoteSummaryCurrencyText,
  QuoteSummaryRow,
} from './quoteSummaryUi'
import QuotePricingLinesTable from './QuotePricingLinesTable'
import QuoteOceanLinesSummary from './QuoteOceanLinesSummary'
import QuoteInlandTransportSection from './QuoteInlandTransportSection'
import QuoteCustomsClearanceSection, { buildCustomsOfficialReceiptsNote } from './QuoteCustomsClearanceSection'
import QuoteHandlingFeesSection from './QuoteHandlingFeesSection'
import {
  isOtherChargePricingCode,
  parseOtherChargeLabels,
  resolvePricingBreakdownLabel,
} from '../utils/pricingDisplay'

const QUICK_SELECT_CODES = ['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER']

const ADMIN_HANDLING_FEE_AMOUNT = 50
const ADMIN_HANDLING_FEE_CURRENCY = 'USD'

const CURRENCY_OPTIONS = ['EGP', 'USD', 'EUR']

function defaultQuoteForm() {
  return {
    client_id: '',
    pricing_offer_id: '',
    pol: '',
    pod: '',
    shipping_line: '',
    container_type: '40HQ Dry',
    qty: 1,
    transit_time: '',
    free_time: '',
    valid_from: '',
    valid_to: '',
    notes: '',
    sailing_dates: [],
    schedule_type: null,
    sailing_weekdays: [],
  }
}

function inlandPricingKeyLabel(key) {
  const k = String(key || '')
  if (k === 'generator') return 'Generator'
  if (k === 'powerDay') return 'Power (day)'
  if (k === 't20d') return "20' Dry truck"
  if (k === 't40d') return "40' Dry truck"
  if (k === 't40r' || k === 'p40rf') return "40' Reefer truck"
  if (k === 't40hq' || k === 'p40hq') return "40' HQ truck"
  if (k === 'p20x1' || k === 'p20x2') return '20′ truck variants'
  return k
}

function resolveInlandLineName(sourceKey, offer, t) {
  if (isOtherChargePricingCode(sourceKey)) {
    const labels = parseOtherChargeLabels(offer?.other_charges)
    const resolved = resolvePricingBreakdownLabel(sourceKey, t, labels)
    if (resolved && resolved !== sourceKey && !/^otherCharge\d+$/i.test(resolved)) return resolved
    const idx = parseInt(String(sourceKey).replace(/\D/g, ''), 10) - 1
    if (idx >= 0 && labels[idx]) return labels[idx]
  }
  return inlandPricingKeyLabel(sourceKey)
}

function buildInlandRowsFromOffer(offer, t) {
  const p = offer?.pricing || {}
  const rows = []
  Object.entries(p).forEach(([sourceKey, item]) => {
    if (item == null || item.price == null || item.price === '') return
    const costStr = priceToFormString(item.price)
    rows.push({
      sourceKey,
      name: resolveInlandLineName(sourceKey, offer, t),
      cost_amount: costStr,
      selling_amount: costStr,
      currency: item.currency || 'EGP',
      included: true,
    })
  })
  rows.sort((a, b) => String(a.sourceKey).localeCompare(String(b.sourceKey)))
  return rows
}

function moneySymbol(currency) {
  if (currency === 'EUR') return '€'
  if (currency === 'EGP') return 'E£'
  return '$'
}

function normalizeOfferCodeToQuoteCode(sourceCode) {
  const lower = String(sourceCode || '').toLowerCase()
  if (lower.includes('of') || lower === 'of20' || lower === 'of40' || lower === 'of40rf') return 'OF'
  if (lower.includes('thc')) return 'THC'
  if (lower.includes('power')) return 'POWER'
  if (lower.includes('pti')) return 'PTI'
  if (lower.includes('bl')) return 'BL'
  if (lower.includes('telex')) return 'TELEX'
  if (lower.includes('isps')) return 'ISPS'
  return 'OTHER'
}

function resolveOceanLineName(sourceCode, qCode, offer, t, resolveQuoteName) {
  if (isOtherChargePricingCode(sourceCode)) {
    const labels = parseOtherChargeLabels(offer?.other_charges)
    const resolved = resolvePricingBreakdownLabel(sourceCode, t, labels)
    if (resolved && resolved !== sourceCode && !/^otherCharge\d+$/i.test(resolved)) return resolved
    const idx = parseInt(String(sourceCode).replace(/\D/g, ''), 10) - 1
    if (idx >= 0 && labels[idx]) return labels[idx]
  }
  return resolveQuoteName(qCode)
}

function mapOfferPricingToOceanLines(offer, resolveQuoteName, t) {
  const pricing = offer?.pricing || {}
  const rows = []
  Object.entries(pricing).forEach(([sourceCode, item]) => {
    const price = item?.price
    if (price == null || price === '') return
    const qCode = normalizeOfferCodeToQuoteCode(sourceCode)
    const costStr = priceToFormString(price)
    const currency = item?.currency || 'USD'
    rows.push({
      sourceKey: sourceCode,
      code: qCode,
      name: resolveOceanLineName(sourceCode, qCode, offer, t, resolveQuoteName),
      description: '',
      cost_amount: costStr,
      selling_amount: costStr,
      currency,
      included: true,
    })
  })
  return rows
}

function inferContainerFromOffer(offer) {
  const notes = String(offer?.notes || '')
  const specMatch = notes.match(/Container Specification:\s*([^\n]+)/i)
  if (specMatch?.[1]) return specMatch[1].trim()
  if (offer?.pricing?.of20rf || offer?.pricing?.thc20rf) return '20 Reefer'
  if (offer?.pricing?.of40rf || offer?.pricing?.thcRf || offer?.pricing?.powerDay) return '40 Reefer'
  return '40HQ Dry'
}

function formatOfferValidity(offer) {
  if (!offer) return '—'
  const from = offer.valid_from ? String(offer.valid_from).slice(0, 10) : ''
  const to = offer.valid_to ? String(offer.valid_to).slice(0, 10) : ''
  if (from && to) return `${from} → ${to}`
  if (to) return to
  if (from) return from
  return '—'
}

function parseNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function sumLineSellingByCurrency(lines) {
  const m = {}
  if (!Array.isArray(lines)) return m
  for (const line of lines) {
    if (line.included === false) continue
    const cur = line.currency || 'USD'
    const n = parseNum(line.selling_amount)
    if (n === 0) continue
    m[cur] = (m[cur] || 0) + n
  }
  return m
}

function sumLineCostByCurrency(lines) {
  const m = {}
  if (!Array.isArray(lines)) return m
  for (const line of lines) {
    if (line.included === false) continue
    const cur = line.currency || 'USD'
    const n = parseNum(line.cost_amount)
    if (n === 0) continue
    m[cur] = (m[cur] || 0) + n
  }
  return m
}

function sumProfitsByCurrency(lines) {
  const map = {}
  if (!Array.isArray(lines)) return map
  for (const line of lines) {
    if (line.included === false) continue
    const cur = line.currency || 'USD'
    const p = parseNum(line.selling_amount) - parseNum(line.cost_amount)
    map[cur] = (map[cur] || 0) + p
  }
  return map
}

function sumCustomsCostByCurrency(clearanceFee, extraItems, enabled) {
  if (!enabled) return {}
  const m = {}
  const baseAmt = Number(clearanceFee?.amount) || 0
  const baseCur = String(clearanceFee?.currency || 'EGP').toUpperCase()
  if (baseAmt > 0) m[baseCur] = (m[baseCur] || 0) + baseAmt
  for (const row of extraItems || []) {
    const amt = parseNum(row.amount)
    if (amt <= 0) continue
    const cur = String(row.currency || 'EGP').toUpperCase()
    m[cur] = (m[cur] || 0) + amt
  }
  return m
}

const PROFIT_CUR_ORDER = ['USD', 'EUR', 'EGP']

function sortedProfitKeys(map) {
  return Object.keys(map).sort((a, b) => {
    const ia = PROFIT_CUR_ORDER.indexOf(a)
    const ib = PROFIT_CUR_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b)
  })
}

function QuoteFinCard({ icon: Icon, title, subtitle: _subtitleIgnored, headMeta = null, children, fixed = false }) {
  if (fixed) {
    return <div className="pricing-quote-fin-section--fixed">{children}</div>
  }
  return (
    <details className="shipment-fin-card pricing-fin-section pricing-quote-collapsible">
      <summary className="shipment-fin-card__head pricing-fin-section__summary pricing-quote-collapsible__summary">
        <div className="shipment-fin-card__head-main">
          {Icon ? <Icon className="shipment-fin-card__icon" aria-hidden /> : null}
          <div className="shipment-fin-card__title">{title}</div>
        </div>
        {headMeta != null && headMeta !== false ? (
          <div className="shipment-fin-card__head-meta">{headMeta}</div>
        ) : null}
        <span className="pricing-fin-section__chev pricing-quote-collapsible__chev" aria-hidden />
      </summary>
      <div className="shipment-fin-card__body pricing-fin-section__body">{children}</div>
    </details>
  )
}

function carrierToggleButton(enabled, onClick, ariaLabel) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`relative h-9 w-14 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-800 ${
        enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function CreateQuoteModal({ isOpen, onClose, onSuccess, initialOffer = null, initialQuickMode = false }) {
  const { t, i18n } = useTranslation()

  const entryMode = useMemo(() => {
    if (initialOffer) return 'pricing'
    if (initialQuickMode) return 'quick'
    return 'manual'
  }, [initialOffer, initialQuickMode])

  const draftScope = useMemo(
    () => getQuoteDraftScope(initialOffer, initialQuickMode),
    [initialOffer, initialQuickMode]
  )

  const quoteCodeLabel = useCallback(
    (code) => {
      const keyMap = {
        OF: 'quoteCodeOF',
        THC: 'quoteCodeTHC',
        BL: 'quoteCodeBL',
        TELEX: 'quoteCodeTELEX',
        ISPS: 'quoteCodeISPS',
        PTI: 'quoteCodePTI',
        POWER: 'quoteCodePOWER',
        OTHER: 'quoteCodeOTHER',
      }
      const lk = keyMap[code] || 'quoteCodeOTHER'
      return t(`pricing.${lk}`)
    },
    [t]
  )

  const makeStarterOceanLines = useCallback(() => {
    const ts = Date.now()
    return [
      {
        sourceKey: `m-${ts}-0`,
        code: 'OF',
        name: quoteCodeLabel('OF'),
        description: '',
        cost_amount: '',
        selling_amount: '',
        currency: 'USD',
        included: true,
      },
      {
        sourceKey: `m-${ts}-1`,
        code: 'THC',
        name: quoteCodeLabel('THC'),
        description: '',
        cost_amount: '',
        selling_amount: '',
        currency: 'USD',
        included: true,
      },
    ]
  }, [quoteCodeLabel])

  const makeQuickOceanLines = useCallback(() => {
    const ts = Date.now()
    const row = (code, name, included = true) => ({
      sourceKey: `q-${ts}-${code}`,
      code,
      name,
      description: '',
      cost_amount: '',
      selling_amount: '',
      currency: 'USD',
      included,
      quickCore: true,
    })
    return [
      row('OF', t('pricing.quickOceanOF', 'Ocean freight (OF)'), true),
      row('THC', quoteCodeLabel('THC'), true),
      row('BL', t('pricing.quickOceanBL', 'B/L fee'), true),
      row('TELEX', quoteCodeLabel('TELEX'), true),
      row('ISPS', quoteCodeLabel('ISPS'), false),
    ]
  }, [t, quoteCodeLabel])

  const { user } = useAuthAccess()
  const { create, loading, error } = useMutateQuote()

  const [form, setForm] = useState(defaultQuoteForm)
  const [draftRestoredBanner, setDraftRestoredBanner] = useState(false)

  const [oceanLines, setOceanLines] = useState([])
  const [seaOffers, setSeaOffers] = useState([])
  const [inlandOffers, setInlandOffers] = useState([])

  const [inlandOfferId, setInlandOfferId] = useState('')
  const [inlandCost, setInlandCost] = useState('')
  const [inlandSelling, setInlandSelling] = useState('')
  const [inlandCurrency, setInlandCurrency] = useState('EGP')
  const [inlandGenCost, setInlandGenCost] = useState('')
  const [inlandGenSelling, setInlandGenSelling] = useState('')
  const [inlandGenCurrency, setInlandGenCurrency] = useState('EGP')

  const [inlandLineRows, setInlandLineRows] = useState([])

  const [customsEnabled, setCustomsEnabled] = useState(false)
  const [customsClearanceFee, setCustomsClearanceFee] = useState({ amount: 2500, currency: 'EGP' })
  const [customsExtraItems, setCustomsExtraItems] = useState([])

  const [handlingCurrency, setHandlingCurrency] = useState(ADMIN_HANDLING_FEE_CURRENCY)
  const [handlingLines, setHandlingLines] = useState([
    { id: 'h-default', name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), isDefault: true },
  ])

  const [showCarrierOnPdf, setShowCarrierOnPdf] = useState(true)
  const [quickModeReason, setQuickModeReason] = useState('')
  const [pricingTeamConfirmed, setPricingTeamConfirmed] = useState(false)
  const [clientAsync, setClientAsync] = useState(null)
  const [showAddClientModal, setShowAddClientModal] = useState(false)

  const [quickInlandPort, setQuickInlandPort] = useState('')
  const [quickInlandGov, setQuickInlandGov] = useState('')
  const [quickInlandZone, setQuickInlandZone] = useState('')
  const [quickInlandVehicle, setQuickInlandVehicle] = useState('')

  const draftPayload = useMemo(
    () => ({
      entryMode,
      pricingOfferId: initialOffer?.id != null ? String(initialOffer.id) : '',
      form,
      oceanLines,
      inlandOfferId,
      inlandCost,
      inlandSelling,
      inlandCurrency,
      inlandGenCost,
      inlandGenSelling,
      inlandGenCurrency,
      inlandLineRows,
      customsEnabled,
      customsExtraItems,
      handlingCurrency,
      handlingLines,
      showCarrierOnPdf,
      quickModeReason,
      pricingTeamConfirmed,
      clientAsync: clientAsync
        ? { value: clientAsync.value, label: clientAsync.label }
        : null,
      quickInlandPort,
      quickInlandGov,
      quickInlandZone,
      quickInlandVehicle,
    }),
    [
      entryMode,
      initialOffer?.id,
      form,
      oceanLines,
      inlandOfferId,
      inlandCost,
      inlandSelling,
      inlandCurrency,
      inlandGenCost,
      inlandGenSelling,
      inlandGenCurrency,
      inlandLineRows,
      customsEnabled,
      customsExtraItems,
      handlingCurrency,
      handlingLines,
      showCarrierOnPdf,
      quickModeReason,
      pricingTeamConfirmed,
      clientAsync,
      quickInlandPort,
      quickInlandGov,
      quickInlandZone,
      quickInlandVehicle,
    ]
  )

  useEffect(() => {
    if (!isOpen) {
      setDraftRestoredBanner(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!draftRestoredBanner || !isOpen) return
    const timer = setTimeout(() => setDraftRestoredBanner(false), 6000)
    return () => clearTimeout(timer)
  }, [draftRestoredBanner, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      writePricingQuoteDraft(draftScope, draftPayload)
    }, 450)
    return () => clearTimeout(timer)
  }, [isOpen, draftScope, draftPayload])

  const flushQuoteDraft = useCallback(() => {
    writePricingQuoteDraft(draftScope, draftPayload)
  }, [draftScope, draftPayload])

  const handleDismiss = useCallback(() => {
    flushQuoteDraft()
    onClose?.()
  }, [flushQuoteDraft, onClose])

  const applySeaOffer = useCallback(
    (offer) => {
      if (!offer) return
      const lines = mapOfferPricingToOceanLines(offer, quoteCodeLabel, t)
      setOceanLines(lines.length ? lines : [])
      const schedule = buildSailingScheduleFromOffer(offer)
      const mode = schedule?.mode || null
      setForm((prev) => {
        const kept = sanitizeSelectedSailingDate(prev.sailing_dates?.[0], schedule)
        return {
          ...prev,
          pricing_offer_id: String(offer.id || ''),
          pol: offer.pol || '',
          pod: offer.pod || '',
          shipping_line: offer.shipping_line || '',
          container_type: inferContainerFromOffer(offer),
          transit_time: offer.transit_time || '',
          free_time: offer.dnd || '',
          valid_from: offer.valid_from ? String(offer.valid_from).slice(0, 10) : '',
          valid_to: offer.valid_to ? String(offer.valid_to).slice(0, 10) : '',
          sailing_dates: kept ? [kept] : [],
          schedule_type: mode,
          sailing_weekdays: mode === 'weekly' ? parseWeeklySailingDays(offer) : [],
          notes: offer.notes || '',
        }
      })
    },
    [quoteCodeLabel, t]
  )

  useEffect(() => {
    if (!isOpen) return
    const token = getStoredToken()
    if (!token) return
    listOffers(token, { per_page: 300, page: 1 })
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : []
        setSeaOffers(rows.filter((o) => o.pricing_type === 'sea'))
        setInlandOffers(rows.filter((o) => o.pricing_type === 'inland'))
      })
      .catch(() => {
        setSeaOffers([])
        setInlandOffers([])
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      let certAmt = 2500
      let certCur = 'EGP'
      try {
        const token = getStoredToken()
        if (token) {
          const res = await getSettings(token)
          const fee = res?.data?.quotation?.customs_certificate_fee
          if (fee) {
            certAmt = Number(fee.amount) || 2500
            certCur = fee.currency || 'EGP'
          }
        }
      } catch {
        /* keep defaults */
      }
      if (cancelled) return

      setCustomsClearanceFee({ amount: certAmt, currency: certCur })

      const saved = readPricingQuoteDraft(draftScope)
      if (saved && isQuoteDraftMeaningful(saved)) {
        setForm({ ...defaultQuoteForm(), ...(saved.form || {}) })
        setOceanLines(Array.isArray(saved.oceanLines) ? saved.oceanLines : [])
        setInlandOfferId(saved.inlandOfferId || '')
        setInlandCost(saved.inlandCost ?? '')
        setInlandSelling(saved.inlandSelling ?? '')
        setInlandCurrency(saved.inlandCurrency || 'EGP')
        setInlandGenCost(saved.inlandGenCost ?? '')
        setInlandGenSelling(saved.inlandGenSelling ?? '')
        setInlandGenCurrency(saved.inlandGenCurrency || 'EGP')
        setInlandLineRows(Array.isArray(saved.inlandLineRows) ? saved.inlandLineRows : [])
        setCustomsEnabled(Boolean(saved.customsEnabled))
        setCustomsExtraItems(Array.isArray(saved.customsExtraItems) ? saved.customsExtraItems : [])
        setHandlingCurrency(saved.handlingCurrency || ADMIN_HANDLING_FEE_CURRENCY)
        setHandlingLines(
          Array.isArray(saved.handlingLines) && saved.handlingLines.length
            ? saved.handlingLines.map((row, i) => ({
                ...row,
                isDefault: row.isDefault ?? i === 0,
              }))
            : [{ id: 'h-default', name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), isDefault: true }]
        )
        setShowCarrierOnPdf(saved.showCarrierOnPdf !== false)
        setQuickModeReason(saved.quickModeReason ?? '')
        setPricingTeamConfirmed(Boolean(saved.pricingTeamConfirmed))
        setClientAsync(saved.clientAsync?.value ? saved.clientAsync : null)
        setQuickInlandPort(saved.quickInlandPort ?? '')
        setQuickInlandGov(saved.quickInlandGov ?? '')
        setQuickInlandZone(saved.quickInlandZone ?? '')
        setQuickInlandVehicle(saved.quickInlandVehicle ?? '')
        setDraftRestoredBanner(true)
        return
      }

      setQuickModeReason('')
      setPricingTeamConfirmed(false)
      setClientAsync(null)
      setInlandOfferId('')
      setInlandLineRows([])
      setInlandCost('')
      setInlandSelling('')
      setInlandCurrency('EGP')
      setInlandGenCost('')
      setInlandGenSelling('')
      setInlandGenCurrency('EGP')
      setCustomsEnabled(false)
      setCustomsExtraItems([])
      setShowCarrierOnPdf(true)
      setQuickInlandPort('')
      setQuickInlandGov('')
      setQuickInlandZone('')
      setQuickInlandVehicle('')
      const mode = initialOffer ? 'pricing' : initialQuickMode ? 'quick' : 'manual'
      if (mode === 'pricing' && initialOffer) {
        setHandlingCurrency(ADMIN_HANDLING_FEE_CURRENCY)
        setHandlingLines([
          { id: 'h-default', name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), isDefault: true },
        ])
        applySeaOffer(initialOffer)
      } else {
        setHandlingCurrency(ADMIN_HANDLING_FEE_CURRENCY)
        setHandlingLines([{ id: 'h-default', name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), isDefault: true }])
        setForm(defaultQuoteForm())
        setOceanLines(mode === 'quick' ? makeQuickOceanLines() : makeStarterOceanLines())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, draftScope, initialOffer, initialQuickMode, makeStarterOceanLines, makeQuickOceanLines, applySeaOffer])

  const selectedSeaOffer = useMemo(() => {
    if (!form.pricing_offer_id) return null
    const fromList = seaOffers.find((o) => String(o.id) === String(form.pricing_offer_id))
    if (fromList) return fromList
    if (initialOffer && String(initialOffer.id) === String(form.pricing_offer_id)) return initialOffer
    return null
  }, [seaOffers, form.pricing_offer_id, initialOffer])

  const selectedInlandOffer = useMemo(() => {
    if (!inlandOfferId) return null
    return inlandOffers.find((o) => String(o.id) === String(inlandOfferId)) || null
  }, [inlandOffers, inlandOfferId])

  useEffect(() => {
    if (entryMode === 'quick') return
    if (!selectedInlandOffer) {
      setInlandLineRows([])
      return
    }
    setInlandLineRows(buildInlandRowsFromOffer(selectedInlandOffer, t))
  }, [entryMode, selectedInlandOffer, t])

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const loadClientOptions = useCallback(async (q) => {
    const token = getStoredToken()
    if (!token) return []
    const res = await listClients(token, { q: q || '', per_page: 30, page: 1 })
    const data = Array.isArray(res?.data) ? res.data : []
    return data.map((c) => ({
      value: c.id,
      label: [c.company_name, c.name].filter(Boolean).join(' — ') || `ID ${c.id}`,
    }))
  }, [])

  useEffect(() => {
    if (clientAsync?.value != null) setForm((p) => ({ ...p, client_id: String(clientAsync.value) }))
    else setForm((p) => ({ ...p, client_id: '' }))
  }, [clientAsync])

  const updateOceanLine = (idx, patch) => {
    setOceanLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const removeOceanLine = (idx) => {
    setOceanLines((prev) => {
      if (prev[idx]?.quickCore) return prev
      return prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
    })
  }

  const updateInlandRow = (idx, patch) => {
    setInlandLineRows((prev) => {
      const next = [...prev]
      if (!next[idx]) return prev
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const removeInlandRow = (idx) => {
    setInlandLineRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  const updateHandlingLine = (id, patch) => {
    setHandlingLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const setHandlingSectionCurrency = (cur) => {
    const code = String(cur || ADMIN_HANDLING_FEE_CURRENCY).toUpperCase()
    setHandlingCurrency(code)
  }

  const addHandlingItem = (item) => {
    setHandlingLines((prev) => [...prev, { ...item, isDefault: false }])
  }

  const removeHandlingItem = (id) => {
    setHandlingLines((prev) => prev.filter((r) => r.isDefault || r.id !== id))
  }

  const addCustomsExtraItem = (item) => {
    setCustomsExtraItems((prev) => [...prev, item])
  }

  const updateCustomsExtraItem = (id, patch) => {
    setCustomsExtraItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const removeCustomsExtraItem = (id) => {
    setCustomsExtraItems((prev) => prev.filter((row) => row.id !== id))
  }

  const handleRemoveCustoms = () => {
    setCustomsEnabled(false)
    setCustomsExtraItems([])
  }

  const isPricing = entryMode === 'pricing'
  const isQuick = entryMode === 'quick'
  const isRouteLocked = isPricing && Boolean(form.pricing_offer_id && (selectedSeaOffer || initialOffer))
  const routeDisplayOffer = selectedSeaOffer || (initialOffer && String(initialOffer.id) === String(form.pricing_offer_id) ? initialOffer : null)

  const sailingSchedule = useMemo(() => buildSailingScheduleFromOffer(routeDisplayOffer), [routeDisplayOffer])

  const selectedSailingDate = String(form.sailing_dates?.[0] || '').trim().slice(0, 10)

  const setSelectedSailingDate = useCallback((iso) => {
    const d = String(iso || '').trim().slice(0, 10)
    setForm((p) => ({ ...p, sailing_dates: d ? [d] : [] }))
  }, [])

  useEffect(() => {
    if (!sailingSchedule) return
    const clean = sanitizeSelectedSailingDate(selectedSailingDate, sailingSchedule)
    if (clean !== selectedSailingDate) {
      setForm((p) => ({ ...p, sailing_dates: clean ? [clean] : [] }))
    }
  }, [sailingSchedule, selectedSailingDate, form.pricing_offer_id])

  const oceanSellingByCurrency = useMemo(() => sumLineSellingByCurrency(oceanLines), [oceanLines])
  const oceanCostByCurrency = useMemo(() => sumLineCostByCurrency(oceanLines), [oceanLines])

  const customsSellingByCurrency = useMemo(
    () => sumCustomsCostByCurrency(customsClearanceFee, customsExtraItems, customsEnabled),
    [customsEnabled, customsClearanceFee, customsExtraItems]
  )

  const pricingLinesProfitByCurrency = useMemo(() => sumProfitsByCurrency(oceanLines), [oceanLines])

  const inlandSectionCostByCurrency = useMemo(() => {
    if (isQuick) {
      const m = {}
      const cost = parseNum(inlandCost)
      if (cost > 0) {
        const cur = inlandCurrency || 'EGP'
        m[cur] = (m[cur] || 0) + cost
      }
      const genCost = parseNum(inlandGenCost)
      if (genCost > 0) {
        const cur = inlandGenCurrency || inlandCurrency || 'EGP'
        m[cur] = (m[cur] || 0) + genCost
      }
      return m
    }
    return sumLineCostByCurrency(inlandLineRows)
  }, [isQuick, inlandCost, inlandCurrency, inlandGenCost, inlandGenCurrency, inlandLineRows])

  const inlandSectionProfitByCurrency = useMemo(() => {
    if (isQuick) {
      const m = {}
      if (parseNum(inlandSelling) > 0 || parseNum(inlandCost) > 0) {
        const cur = inlandCurrency || 'EGP'
        m[cur] = (m[cur] || 0) + (parseNum(inlandSelling) - parseNum(inlandCost))
      }
      if (parseNum(inlandGenSelling) > 0 || parseNum(inlandGenCost) > 0) {
        const cur = inlandGenCurrency || inlandCurrency || 'EGP'
        m[cur] = (m[cur] || 0) + (parseNum(inlandGenSelling) - parseNum(inlandGenCost))
      }
      return m
    }
    return sumProfitsByCurrency(inlandLineRows)
  }, [
    isQuick,
    inlandSelling,
    inlandCost,
    inlandCurrency,
    inlandGenSelling,
    inlandGenCost,
    inlandGenCurrency,
    inlandLineRows,
  ])

  const inlandSectionSellingByCurrency = useMemo(() => {
    if (isQuick) {
      const m = {}
      const sell = parseNum(inlandSelling)
      if (sell > 0) {
        const cur = inlandCurrency || 'EGP'
        m[cur] = (m[cur] || 0) + sell
      }
      const genSell = parseNum(inlandGenSelling)
      if (genSell > 0) {
        const cur = inlandGenCurrency || inlandCurrency || 'EGP'
        m[cur] = (m[cur] || 0) + genSell
      }
      return m
    }
    return sumLineSellingByCurrency(inlandLineRows)
  }, [isQuick, inlandSelling, inlandCurrency, inlandGenSelling, inlandGenCurrency, inlandLineRows])

  const quoteProfitByCurrency = useMemo(() => {
    const map = { ...pricingLinesProfitByCurrency }
    Object.entries(inlandSectionProfitByCurrency).forEach(([c, v]) => {
      map[c] = (map[c] || 0) + v
    })
    return map
  }, [pricingLinesProfitByCurrency, inlandSectionProfitByCurrency])

  const handlingSellingByCurrency = useMemo(() => {
    let total = 0
    for (const row of handlingLines || []) {
      const n = parseNum(row.amount)
      if (n > 0) total += n
    }
    if (total <= 0) return {}
    const c = String(handlingCurrency || ADMIN_HANDLING_FEE_CURRENCY).toUpperCase()
    return { [c]: total }
  }, [handlingLines, handlingCurrency])

  const quoteHasBillableItems = useMemo(() => {
    const hasOcean = oceanLines.some(
      (line) => line.included !== false && parseNum(line.selling_amount) > 0 && line.code
    )
    const hasInland = isQuick
      ? parseNum(inlandSelling) > 0 || parseNum(inlandGenSelling) > 0
      : inlandLineRows.some((row) => row.included !== false && parseNum(row.selling_amount) > 0)
    const hasCustoms =
      customsEnabled &&
      (Object.values(customsSellingByCurrency).some((v) => Math.abs(Number(v) || 0) > 1e-9) ||
        (Number(customsClearanceFee?.amount) || 0) > 0)
    const hasHandling = handlingLines.some((row) => parseNum(row.amount) > 0)
    return hasOcean || hasInland || hasCustoms || hasHandling
  }, [
    oceanLines,
    isQuick,
    inlandSelling,
    inlandGenSelling,
    inlandLineRows,
    customsEnabled,
    customsSellingByCurrency,
    customsClearanceFee,
    handlingLines,
  ])

  const canSaveQuote = useMemo(() => {
    if (!pricingTeamConfirmed || !quoteHasBillableItems) return false
    if (!isQuick && !clientAsync?.value) return false
    if (!isQuick && sailingSchedule && !selectedSailingDate) return false
    return true
  }, [
    pricingTeamConfirmed,
    quoteHasBillableItems,
    isQuick,
    clientAsync,
    sailingSchedule,
    selectedSailingDate,
  ])

  const grandSellingByCurrency = useMemo(() => {
    return mergeCurrencyAmountMaps(
      oceanSellingByCurrency,
      customsSellingByCurrency,
      inlandSectionSellingByCurrency,
      handlingSellingByCurrency
    )
  }, [oceanSellingByCurrency, customsSellingByCurrency, inlandSectionSellingByCurrency, handlingSellingByCurrency])

  const hasInlandQuoteData = useMemo(() => {
    if (isQuick) return parseNum(inlandSelling) > 0 || parseNum(inlandGenSelling) > 0
    return inlandLineRows.some((row) => row.included !== false && parseNum(row.selling_amount) > 0)
  }, [isQuick, inlandSelling, inlandGenSelling, inlandLineRows])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const salesUserId = user?.id ? Number(user.id) : null
    const isQuickSubmit = entryMode === 'quick'
    if (!isQuickSubmit && sailingSchedule && !selectedSailingDate) return
    if (!pricingTeamConfirmed) return
    if (!isQuickSubmit && !clientAsync?.value) return

    const items = []

    const costAmountForLine = (line) => {
      const c = parseNum(line.cost_amount)
      return c > 0 ? c : null
    }

    const quickInlandDescription = () => {
      const parts = ['quick_inland_manual']
      if (quickInlandPort.trim()) parts.push(`port=${quickInlandPort.trim()}`)
      if (quickInlandGov.trim()) parts.push(`gov=${quickInlandGov.trim()}`)
      if (quickInlandZone.trim()) parts.push(`zone=${quickInlandZone.trim()}`)
      if (quickInlandVehicle.trim()) parts.push(`vehicle=${quickInlandVehicle.trim()}`)
      return parts.length > 1 ? parts.join('|') : null
    }

    oceanLines.forEach((line) => {
      if (line.included === false) return
      const sell = parseNum(line.selling_amount)
      if (sell <= 0 || !line.code) return
      const descTrim = (line.description || '').trim()
      items.push({
        code: line.code,
        name: (line.name || '').trim() || quoteCodeLabel(line.code),
        description: descTrim || null,
        amount: sell,
        currency: line.currency || 'USD',
        cost_amount: costAmountForLine(line),
        visible_to_client: true,
      })
    })

    if (!isQuickSubmit && inlandLineRows.length) {
      inlandLineRows.forEach((row) => {
        if (row.included === false) return
        if (parseNum(row.selling_amount) <= 0) return
        items.push({
          code: 'INLAND',
          name: row.name || row.sourceKey,
          description: inlandOfferId ? `inland_offer_id=${inlandOfferId};key=${row.sourceKey}` : null,
          amount: parseNum(row.selling_amount),
          currency: row.currency || 'EGP',
          cost_amount: parseNum(row.cost_amount) > 0 ? parseNum(row.cost_amount) : null,
          visible_to_client: true,
        })
      })
    }

    if (isQuickSubmit && parseNum(inlandSelling) > 0) {
      items.push({
        code: 'INLAND',
        name: t('pricing.inlandTransport', 'Inland Transport'),
        description: quickInlandDescription(),
        amount: parseNum(inlandSelling),
        currency: inlandCurrency || 'EGP',
        cost_amount: parseNum(inlandCost) > 0 ? parseNum(inlandCost) : null,
        visible_to_client: true,
      })
    }

    if (isQuickSubmit && parseNum(inlandGenSelling) > 0) {
      const baseDesc = quickInlandDescription()
      items.push({
        code: 'INLAND',
        name: t('pricing.inlandGeneratorLine', 'Generator (inland)'),
        description: baseDesc ? `${baseDesc};generator` : 'generator',
        amount: parseNum(inlandGenSelling),
        currency: inlandGenCurrency || inlandCurrency || 'EGP',
        cost_amount: parseNum(inlandGenCost) > 0 ? parseNum(inlandGenCost) : null,
        visible_to_client: true,
      })
    }

    if (customsEnabled) {
      const baseAmt = Number(customsClearanceFee?.amount) || 0
      const baseCur = String(customsClearanceFee?.currency || 'EGP').toUpperCase()
      if (baseAmt > 0) {
        items.push({
          code: 'OTHER',
          name: t('pricing.customsClearanceFeeRow', 'Customs clearance fee'),
          description: null,
          amount: baseAmt,
          currency: baseCur,
          cost_amount: baseAmt,
          visible_to_client: true,
        })
      }
      ;(customsExtraItems || []).forEach((row) => {
        const amt = parseNum(row.amount)
        if (amt <= 0) return
        const nm = (row.name || '').trim()
        if (!nm) return
        items.push({
          code: 'OTHER',
          name: nm,
          description: (row.notes || '').trim() || null,
          amount: amt,
          currency: String(row.currency || 'EGP').toUpperCase(),
          cost_amount: amt,
          visible_to_client: true,
        })
      })
    }

    ;(handlingLines || []).forEach((row) => {
      const amt = parseNum(row.amount)
      if (amt <= 0) return
      const nm = (row.name || '').trim() || 'Handling Fees'
      items.push({
        code: 'HANDLING',
        name: nm,
        description: null,
        amount: amt,
        currency: handlingCurrency || ADMIN_HANDLING_FEE_CURRENCY,
        cost_amount: null,
        visible_to_client: true,
      })
    })

    if (!items.length) return

    const payload = {
      ...form,
      client_id: clientAsync?.value ? Number(clientAsync.value) : null,
      sales_user_id: salesUserId,
      pricing_offer_id: isQuickSubmit ? null : form.pricing_offer_id ? Number(form.pricing_offer_id) : null,
      quick_mode: isQuickSubmit,
      is_quick_quotation: isQuickSubmit,
      quick_mode_reason: isQuickSubmit ? (quickModeReason.trim() || 'Quick Quotation') : null,
      qty: form.qty ? Number(form.qty) : null,
      sailing_dates: selectedSailingDate ? [selectedSailingDate] : [],
      schedule_type: sailingSchedule?.mode || (selectedSailingDate ? 'fixed' : null),
      sailing_weekdays:
        sailingSchedule?.mode === 'weekly' && sailingSchedule.weeklyWeekdays?.length
          ? sailingSchedule.weeklyWeekdays
          : null,
      container_spec: {
        type: String(form.container_type || '').toLowerCase().includes('reefer') ? 'reefer' : 'dry',
        size: String(form.container_type || '').includes('20') ? '20' : '40',
        height: String(form.container_type || '').toLowerCase().includes('hq') ? 'hq' : 'standard',
      },
      free_time_data: null,
      show_carrier_on_pdf: showCarrierOnPdf,
      official_receipts_note: customsEnabled ? buildCustomsOfficialReceiptsNote(t) : null,
      municipality: null,
      pricing_team_confirmed: pricingTeamConfirmed,
      items,
    }

    try {
      await create(payload)
      clearPricingQuoteDraft(draftScope)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  const showQuickInlandGenerator =
    isQuick && String(form.container_type || '').toLowerCase().includes('reefer')

  const headerTitle = isQuick
    ? t('pricing.createQuickQuotation', 'Quick quotation')
    : t('pricing.createStandardQuotationTitle', 'إنشاء عرض سعر / Create Standard Quotation')

  return (
    <div
      className="client-detail-modal shipments-no-print shipment-fin-modal-root pricing-fin-modal-root pricing-quote-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-create-quote-title"
    >
      <div className="client-detail-modal__backdrop" onClick={handleDismiss} aria-hidden="true" />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-fin-modal__box pricing-fin-form-modal__box max-w-5xl w-full max-h-[92vh] flex flex-col">
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="shipment-fin-modal__header-main min-w-0">
            <div className="ship-bar">
              <div>
                <div id="pricing-create-quote-title" className="ship-ref pricing-fin-ship-ref--title" role="heading" aria-level={2}>
                  {headerTitle}
                </div>
              </div>
              <div className="ship-metas">
                {isQuick ? (
                  <>
                    <div>
                      <div className="ship-meta-val">{t('pricing.quickModeBadgeShort', 'Quick Mode')}</div>
                      <div className="ship-meta-lbl">{t('pricing.finHeaderMode', 'Mode')}</div>
                    </div>
                    <div className="ship-meta-divider" aria-hidden />
                  </>
                ) : null}
                <div>
                  <div className="ship-meta-val">
                    {entryMode === 'pricing'
                      ? t('pricing.finHeaderModeSea', 'Ocean')
                      : entryMode === 'quick'
                        ? t('pricing.quickQuotation', 'Quick')
                        : t('pricing.quoteManualModeShort', 'Manual')}
                  </div>
                  <div className="ship-meta-lbl">{t('pricing.finHeaderMode', 'Mode')}</div>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="client-detail-modal__close shipment-fin-modal__header-close"
            onClick={handleDismiss}
            aria-label={t('common.close', 'Close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="client-detail-modal__body client-detail-modal__body--form shipment-fin-modal__body flex-1 min-h-0">
          <div className="client-detail-modal__body-inner h-full min-h-0">
            <div className="shipment-fin-panel shipment-fin-panel--enter shipment-fin-panel--expenses pricing-quote-modal__panel">
          {error ? (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">{error}</div>
          ) : null}

          {draftRestoredBanner ? (
            <div
              className="pricing-offer-draft-banner shipment-fin-flash shipment-fin-flash--success mb-4"
              role="status"
            >
              <CheckCircle2 className="pricing-offer-draft-banner__icon" aria-hidden />
              <span className="pricing-offer-draft-banner__text">{t('pricing.draftRestored')}</span>
              <button
                type="button"
                className="pricing-offer-draft-banner__dismiss"
                onClick={() => setDraftRestoredBanner(false)}
                aria-label={t('common.dismiss', 'Dismiss')}
              >
                ×
              </button>
            </div>
          ) : null}

          <form id="quoteForm" onSubmit={handleSubmit} className="shipment-fin-panel shipment-fin-panel--enter space-y-6">
            {isQuick ? (
              <div className="pricing-quick-banner" role="status">
                <strong>{t('pricing.quickQuotation', 'Quick Quotation')}:</strong>{' '}
                {t(
                  'pricing.quickQuotationBanner',
                  'Rates are not linked to a CRM price sheet — enter all figures manually. This quotation is stored as a Quick Quotation only.'
                )}
              </div>
            ) : null}
            <QuoteFinCard icon={User} title={t('pricing.quoteSectionClient', 'بيانات العميل / Client Info')}>
              <div className="pricing-quote-client-block">
                <div className="pricing-quote-client-search-line">
                  <span className="pricing-quote-inline-item__label">{t('pricing.client', 'Client')}</span>
                  <span className="pricing-quote-inline-item__sep" aria-hidden>
                    :
                  </span>
                  <div className="pricing-quote-client-row">
                    <AsyncSelect
                      loadOptions={loadClientOptions}
                      value={clientAsync}
                      onChange={(opt) => setClientAsync(opt || null)}
                      placeholder={t('pricing.searchClient', 'Search client...')}
                      isClearable
                      className="pricing-quote-async-select"
                      disabled={isQuick}
                    />
                    <button
                      type="button"
                      className="pricing-quote-add-client-btn"
                      onClick={() => setShowAddClientModal(true)}
                      aria-label={t('pricing.addClient', 'إضافة عميل / Add Client')}
                      title={t('pricing.addClient', 'إضافة عميل / Add Client')}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                {isQuick ? (
                  <p className="pricing-quote-client-note text-xs text-amber-800/90 dark:text-amber-200/90 m-0">
                    {t('pricing.quickClientOptionalNote', 'Client is optional for quick quotations.')}
                  </p>
                ) : null}
                {user?.name ? (
                  <QuoteInlineStrip className="pricing-quote-client-meta">
                    <QuoteInlineItem label={t('pricing.salespersonAuto', 'Salesperson')}>
                      {user.name}
                    </QuoteInlineItem>
                  </QuoteInlineStrip>
                ) : null}
              </div>
            </QuoteFinCard>

            <QuoteFinCard icon={MapPin} title={t('pricing.quoteSectionRoute', 'ملخص المسار / Route summary')}>
              {isRouteLocked ? (
                <div className="pricing-quote-shipment-badges">
                  <QuoteSummaryBadge label={t('pricing.quoteBadgeRoute', 'المسار')}>
                    {routeDisplayOffer?.pol || form.pol || '—'} →{' '}
                    {routeDisplayOffer?.pod || routeDisplayOffer?.region || form.pod || '—'}
                  </QuoteSummaryBadge>
                  <ShippingLineSummaryBadge
                    line={routeDisplayOffer?.shipping_line || form.shipping_line || '—'}
                    visible={showCarrierOnPdf}
                    onToggle={() => setShowCarrierOnPdf((v) => !v)}
                    t={t}
                  />
                  <QuoteSummaryBadge label={t('pricing.quoteBadgeContainer', 'نوع الحاوية')}>
                    {routeDisplayOffer ? inferContainerFromOffer(routeDisplayOffer) : form.container_type || '—'}
                  </QuoteSummaryBadge>
                  <QuoteSummaryBadge label={t('pricing.quoteBadgeTransit', 'مدة العبور')}>
                    {routeDisplayOffer?.transit_time || form.transit_time || '—'}
                  </QuoteSummaryBadge>
                  {sailingSchedule ? (
                    <QuoteSailingDateSelector
                      badgeGroup
                      schedule={sailingSchedule}
                      value={selectedSailingDate}
                      onChange={setSelectedSailingDate}
                    />
                  ) : null}
                </div>
              ) : (
                <div className={isQuick ? 'pricing-quick-section' : ''}>
                  {isQuick ? (
                    <div className="pricing-quick-section-label">{t('pricing.quickRouteManualLabel', 'Enter route details manually')}</div>
                  ) : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.pol', 'POL')}</label>
                      <PortNameAsyncSelect
                        value={form.pol}
                        onChange={(v) => setField('pol', v)}
                        placeholder={t('pricing.filterAllPol', 'POL')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.podShort', 'POD')}</label>
                      <PortNameAsyncSelect
                        value={form.pod}
                        onChange={(v) => setField('pod', v)}
                        placeholder={t('pricing.filterAllPod', 'POD')}
                      />
                    </div>
                    <div className="md:col-span-2 pricing-quote-carrier-edit-row">
                      <div className="pricing-quote-shipment-badges pricing-quote-shipment-badges--edit">
                        <ShippingLineSummaryBadge
                          line={form.shipping_line || '—'}
                          visible={showCarrierOnPdf}
                          onToggle={() => setShowCarrierOnPdf((v) => !v)}
                          t={t}
                        />
                      </div>
                      <ShippingLineNameAsyncSelect
                        serviceScope="ocean"
                        value={form.shipping_line}
                        onChange={(v) => setField('shipping_line', v)}
                        placeholder={t('pricing.filterAllShippingLines', 'All shipping lines')}
                      />
                    </div>
                    <div className="md:col-span-2 pricing-quote-field-chips-row">
                      <label className="pricing-quote-field-chip">
                        <span className="pricing-quote-field-chip__label">{t('pricing.containerType', 'Container')}</span>
                        <input
                          value={form.container_type}
                          onChange={(e) => setField('container_type', e.target.value)}
                          className="pricing-quote-field-chip__input"
                        />
                      </label>
                      <label className="pricing-quote-field-chip">
                        <span className="pricing-quote-field-chip__label">{t('pricing.transitTime', 'Transit')}</span>
                        <input
                          value={form.transit_time}
                          onChange={(e) => setField('transit_time', e.target.value)}
                          className="pricing-quote-field-chip__input"
                        />
                      </label>
                    </div>
                    {sailingSchedule && !isQuick ? (
                      <QuoteSailingDateSelector
                        inline
                        schedule={sailingSchedule}
                        value={selectedSailingDate}
                        onChange={setSelectedSailingDate}
                      />
                    ) : null}
                    {isQuick ? (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {t('pricing.quickSailingDate', 'Sailing date')}
                        </label>
                        <input
                          type="date"
                          className="w-full max-w-xs px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          value={form.sailing_dates?.[0] || ''}
                          onChange={(e) => setField('sailing_dates', e.target.value ? [e.target.value] : [])}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </QuoteFinCard>

            <QuoteFinCard icon={Ship} title={t('pricing.quoteSectionOcean', 'القسم 1: الشحن البحري / Ocean freight')}>
              {!isQuick ? (
                <div className="space-y-2 pb-4 mb-4 border-b border-slate-200/90 dark:border-slate-700">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.offerSeaRate')}</label>
                  <select
                    value={form.pricing_offer_id}
                    disabled={isPricing}
                    onChange={(e) => {
                      const id = e.target.value
                      setField('pricing_offer_id', id)
                      if (!id) {
                        setOceanLines(makeStarterOceanLines())
                        return
                      }
                      const offer = seaOffers.find((o) => String(o.id) === String(id))
                      if (offer) applySeaOffer(offer)
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none disabled:opacity-70"
                  >
                    {!isPricing ? <option value="">{t('pricing.quoteSeaSheetNone', 'None (manual route & pricing)')}</option> : null}
                    {initialOffer &&
                    isPricing &&
                    !seaOffers.some((o) => String(o.id) === String(initialOffer.id)) ? (
                      <option value={initialOffer.id}>
                        {initialOffer.pol || '—'} → {initialOffer.pod || initialOffer.region || '—'} · {initialOffer.shipping_line || '—'} (
                        {inferContainerFromOffer(initialOffer)})
                      </option>
                    ) : null}
                    {seaOffers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.pol || '—'} → {o.pod || o.region || '—'} · {o.shipping_line || '—'} ({inferContainerFromOffer(o)})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {oceanLines.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                  {t('pricing.quoteNoPricedLines', 'No line items yet. Add a row or link a sea price sheet.')}
                </p>
              ) : (
                <div className="space-y-4">
                  {isQuick ? (
                    <div className="pricing-quick-ocean-hint text-[11px] font-semibold text-amber-900/90 dark:text-amber-100/95 rounded-lg px-3 py-2 border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/95 dark:bg-amber-950/40">
                      {t('pricing.quickOceanManualHint', 'Enter cost and selling for each line manually.')}
                    </div>
                  ) : null}
                  <div className="pricing-quote-ocean-table-block">
                    <QuotePricingLinesTable
                      lines={oceanLines}
                      onUpdateLine={updateOceanLine}
                      readOnlyCost={!isQuick}
                      readOnlyCurrency={isPricing}
                      readOnlyName={isPricing}
                      allowOceanCodeEdit={!isPricing}
                      quoteCodeLabel={quoteCodeLabel}
                      quickSelectCodes={QUICK_SELECT_CODES}
                      variant="ocean"
                    />
                  </div>
                  <QuoteOceanLinesSummary
                    costByCurrency={oceanCostByCurrency}
                    profitByCurrency={pricingLinesProfitByCurrency}
                    sellingByCurrency={oceanSellingByCurrency}
                  />
                </div>
              )}
            </QuoteFinCard>

            <QuoteFinCard icon={Truck} title={t('pricing.quoteSectionInland', 'Section 2: Inland transport')}>
              <QuoteInlandTransportSection
                isQuick={isQuick}
                inlandOffers={inlandOffers}
                inlandOfferId={inlandOfferId}
                onInlandOfferIdChange={setInlandOfferId}
                inlandLineRows={inlandLineRows}
                onUpdateInlandRow={updateInlandRow}
                costByCurrency={inlandSectionCostByCurrency}
                profitByCurrency={inlandSectionProfitByCurrency}
                sellingByCurrency={inlandSectionSellingByCurrency}
                quickInlandPort={quickInlandPort}
                onQuickInlandPortChange={setQuickInlandPort}
                quickInlandGov={quickInlandGov}
                onQuickInlandGovChange={setQuickInlandGov}
                quickInlandZone={quickInlandZone}
                onQuickInlandZoneChange={setQuickInlandZone}
                quickInlandVehicle={quickInlandVehicle}
                onQuickInlandVehicleChange={setQuickInlandVehicle}
                inlandCost={inlandCost}
                onInlandCostChange={setInlandCost}
                inlandSelling={inlandSelling}
                onInlandSellingChange={setInlandSelling}
                inlandCurrency={inlandCurrency}
                onInlandCurrencyChange={setInlandCurrency}
                showQuickInlandGenerator={showQuickInlandGenerator}
                inlandGenCost={inlandGenCost}
                onInlandGenCostChange={setInlandGenCost}
                inlandGenSelling={inlandGenSelling}
                onInlandGenSellingChange={setInlandGenSelling}
                inlandGenCurrency={inlandGenCurrency}
                onInlandGenCurrencyChange={setInlandGenCurrency}
              />
            </QuoteFinCard>

            <QuoteFinCard icon={Package} title={t('pricing.quoteSectionCustoms', 'Section 3: Customs clearance')}>
              <QuoteCustomsClearanceSection
                customsActive={customsEnabled}
                onEnable={() => setCustomsEnabled(true)}
                onRemove={handleRemoveCustoms}
                clearanceFee={customsClearanceFee}
                extraItems={customsExtraItems}
                onAddItem={addCustomsExtraItem}
                onUpdateItem={updateCustomsExtraItem}
                onRemoveItem={removeCustomsExtraItem}
                totalCostByCurrency={customsSellingByCurrency}
              />
            </QuoteFinCard>

            <QuoteFinCard icon={DollarSign} title={t('pricing.quoteSectionHandling', 'Section 4: Handling fees')}>
              <QuoteHandlingFeesSection
                lines={handlingLines}
                currency={handlingCurrency}
                onCurrencyChange={setHandlingSectionCurrency}
                onAddItem={addHandlingItem}
                onUpdateItem={updateHandlingLine}
                onRemoveItem={removeHandlingItem}
                totalByCurrency={handlingSellingByCurrency}
              />
            </QuoteFinCard>

            <QuoteGrandSummaryPanel title={t('pricing.quoteSectionSummary', 'Summary')}>
              <QuoteSummaryRow label={t('pricing.summaryOcean', 'Ocean freight total')}>
                <QuoteSummaryCurrencyText amounts={oceanSellingByCurrency} dash={t('common.dash', '—')} />
              </QuoteSummaryRow>
              <QuoteSummaryRow label={t('pricing.summaryInland', 'Inland transport total')}>
                {hasInlandQuoteData ? (
                  <QuoteSummaryCurrencyText amounts={inlandSectionSellingByCurrency} dash={t('common.dash', '—')} />
                ) : (
                  <span className="pricing-quote-summary-currency">{t('common.dash', '—')}</span>
                )}
              </QuoteSummaryRow>
              <QuoteSummaryRow label={t('pricing.summaryCustoms', 'Customs total')}>
                {customsEnabled ? (
                  <QuoteSummaryCurrencyText amounts={customsSellingByCurrency} dash={t('common.dash', '—')} />
                ) : (
                  <span className="pricing-quote-summary-currency">{t('common.dash', '—')}</span>
                )}
              </QuoteSummaryRow>
              <QuoteSummaryRow label={t('pricing.summaryHandling', 'Handling fees')}>
                <QuoteSummaryCurrencyText amounts={handlingSellingByCurrency} dash={t('common.dash', '—')} />
              </QuoteSummaryRow>
              <QuoteSummaryRow
                label={t('pricing.totalProfitQuote', 'Total profit (selling − cost)')}
                rowClass="pricing-quote-summary-row--profit"
              >
                <QuoteSummaryCurrencyText
                  amounts={quoteProfitByCurrency}
                  dash={t('common.dash', '—')}
                  allowNegative
                />
              </QuoteSummaryRow>
              <QuoteSummaryRow
                label={t('pricing.grandTotal', 'Grand total')}
                rowClass="pricing-quote-summary-row--grand"
              >
                <QuoteSummaryCurrencyText amounts={grandSellingByCurrency} dash={t('common.dash', '—')} />
              </QuoteSummaryRow>
            </QuoteGrandSummaryPanel>

            <div className="space-y-4">
              <div
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  pricingTeamConfirmed
                    ? 'border-emerald-400/80 bg-emerald-50/90 dark:border-emerald-700/60 dark:bg-emerald-950/30'
                    : 'border-amber-300/90 bg-amber-50/95 dark:border-amber-700/60 dark:bg-amber-950/35'
                }`}
                role="region"
                aria-label={t('pricing.pricingTeamConfirmTitle', 'Pricing team confirmation')}
              >
                <div className="text-sm font-bold text-amber-950 dark:text-gray-100">
                  {t('pricing.pricingTeamConfirmTitle', 'Confirm with Pricing Team before sending')}
                </div>
                <div className="pricing-quote-confirm-status-row">
                  <span className="pricing-quote-confirm-status-row__label">
                    {t('pricing.quoteConfirmStatusLabel', 'Status')}
                  </span>
                  <span
                    className={`pricing-quote-confirm-status-row__value ${
                      pricingTeamConfirmed
                        ? 'pricing-quote-confirm-status-row__value--yes'
                        : 'pricing-quote-confirm-status-row__value--no'
                    }`}
                  >
                    {pricingTeamConfirmed
                      ? t('pricing.confirmStateYes', 'Confirmed')
                      : t('pricing.confirmStateNo', 'Not confirmed')}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed m-0">
                  {t(
                    'pricing.pricingTeamConfirmBody',
                    'Make sure Pricing Team confirms the underlying rates are still valid before you send this quotation to the client.'
                  )}
                </p>
                <label className="flex items-start gap-2 cursor-pointer border-t border-amber-300/70 dark:border-amber-800/60 pt-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-amber-600 text-amber-700 focus:ring-amber-500"
                    checked={pricingTeamConfirmed}
                    onChange={(e) => setPricingTeamConfirmed(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                    {t('pricing.pricingTeamConfirmCheckbox', 'I confirmed with Pricing Team — this quotation is ready to send')}
                  </span>
                </label>
              </div>
            </div>

          </form>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 shrink-0 border-t border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            form="quoteForm"
            disabled={loading || !canSaveQuote}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </div>
      </div>

      <QuickAddClientModal
        open={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onCreated={(option) => {
          setClientAsync(option)
          setShowAddClientModal(false)
          writePricingQuoteDraft(draftScope, {
            ...draftPayload,
            clientAsync: { value: option.value, label: option.label },
          })
        }}
      />
    </div>
  )
}
