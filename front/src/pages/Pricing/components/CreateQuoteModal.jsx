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
} from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import { getStoredToken } from '../../Login'
import { listClients } from '../../../api/clients'
import { listOffers } from '../../../api/pricing'
import { notifyPricingError, PRICING_ACTIONS } from '../utils/pricingFeedback'
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
  buildSailingScheduleFromOffer,
  formatSailingScheduleFromForm,
  formatSailingScheduleFromOffer,
  sailingFieldsFromOffer,
} from '../utils/sailingSchedule'
import { QuickAddClientModal } from '../../Clients/QuickAddClientModal'
import QuoteSailingScheduleDisplay from './QuoteSailingScheduleDisplay'
import QuoteFinCard from './quoteFinCard'
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
import QuoteReeferDeferredFootnote from './QuoteReeferDeferredFootnote'
import QuoteOwsDeferredFootnote from './QuoteOwsDeferredFootnote'
import {
  buildReeferFreeTimeDataPayload,
  extractReeferDeferredFromOffer,
  filterBillableOceanLines,
  isReeferContainerSpec,
  isReeferDeferredOceanLine,
  isReeferDeferredQuoteCode,
  shouldShowReeferDeferredPowerFootnote,
} from '../utils/reeferQuoteCharges'
import {
  buildOwsFreeTimeDataPayload,
  extractOwsFromOffer,
  stripOwsFromNotes,
  shouldShowOwsFootnote,
} from '../utils/owsQuoteCharges'
import { sortSeaOceanQuoteLines, sortSeaPricingCodeEntries } from '../utils/seaPricingOrder'
import QuoteInlandTransportSection from './QuoteInlandTransportSection'
import QuoteCustomsClearanceSection, { buildCustomsOfficialReceiptsNote } from './QuoteCustomsClearanceSection'
import QuoteHandlingFeesSection from './QuoteHandlingFeesSection'
import QuickQuoteForm from './quick/QuickQuoteForm'
import { inlandRouteFromOffer, shouldShowQuoteRouteSummary } from '../utils/quotePricingType'
import { createQuickOceanCoreRows } from '../utils/quickQuoteConstants'
import {
  isOtherChargePricingCode,
  parseOtherChargeLabels,
  resolvePricingBreakdownLabel,
} from '../utils/pricingDisplay'

const QUICK_SELECT_CODES = ['OF', 'THC', 'BL', 'TELEX', 'PTI', 'POWER']

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
    container_type: "40' Dry",
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

function inlandPricingKeyLabel(key, t) {
  const k = String(key || '')
  if (k === 'generator') return t('pricing.inlandGensetLabel', 'Genset')
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
  return inlandPricingKeyLabel(sourceKey, t)
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
  if (lower.includes('dthc')) return 'DTHC'
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
  sortSeaPricingCodeEntries(Object.entries(pricing)).forEach(([sourceCode, item]) => {
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
  return sortSeaOceanQuoteLines(rows)
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

  const quoteCodeLabel = useCallback(
    (code) => {
      const keyMap = {
        OF: 'quoteCodeOF',
        DTHC: 'quoteCodeDTHC',
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

  const makeQuickOceanLines = useCallback(
    () => createQuickOceanCoreRows(t, quoteCodeLabel),
    [t, quoteCodeLabel]
  )

  const { user } = useAuthAccess()
  const { create, loading, error } = useMutateQuote()

  const [form, setForm] = useState(defaultQuoteForm)

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

  const [handlingLines, setHandlingLines] = useState([
    {
      id: 'h-default',
      name: 'Handling Fees',
      amount: String(ADMIN_HANDLING_FEE_AMOUNT),
      currency: ADMIN_HANDLING_FEE_CURRENCY,
      isDefault: true,
    },
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
  const [quickSailingDates, setQuickSailingDates] = useState([])
  const [inlandManualOpen, setInlandManualOpen] = useState(false)
  const [reeferDeferred, setReeferDeferred] = useState(null)
  const [owsDeferred, setOwsDeferred] = useState(null)

  const handleDismiss = useCallback(() => {
    onClose?.()
  }, [onClose])

  const applySeaOffer = useCallback(
    (offer) => {
      if (!offer) return
      const isReefer = inferContainerFromOffer(offer).toLowerCase().includes('reefer')
      const allLines = mapOfferPricingToOceanLines(offer, quoteCodeLabel, t)
      const lines = isReefer ? filterBillableOceanLines(allLines, true) : allLines
      setReeferDeferred(isReefer ? extractReeferDeferredFromOffer(offer) : null)
      setOwsDeferred(extractOwsFromOffer(offer))
      setOceanLines(lines.length ? lines : [])
      const sailingFields = sailingFieldsFromOffer(offer)
      setForm((prev) => ({
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
        ...sailingFields,
        notes: stripOwsFromNotes(offer.notes || ''),
      }))
    },
    [quoteCodeLabel, t]
  )

  const handleInlandOfferIdChange = useCallback((id) => {
    setInlandOfferId(String(id || ''))
    if (!id) {
      setInlandLineRows([])
      setQuickInlandPort('')
      setQuickInlandGov('')
      setQuickInlandZone('')
    }
  }, [])

  useEffect(() => {
    if (!isOpen || entryMode === 'quick') return
    const token = getStoredToken()
    if (!token) return
    Promise.all([
      listOffers(token, { pricing_type: 'sea', per_page: 300, page: 1, quotable: 1 }),
      listOffers(token, { pricing_type: 'inland', per_page: 300, page: 1, quotable: 1 }),
    ])
      .then(([seaRes, inlandRes]) => {
        setSeaOffers(Array.isArray(seaRes?.data) ? seaRes.data : [])
        setInlandOffers(Array.isArray(inlandRes?.data) ? inlandRes.data : [])
      })
      .catch((err) => {
        setSeaOffers([])
        setInlandOffers([])
        notifyPricingError(PRICING_ACTIONS.OFFER_LIST, err)
      })
  }, [isOpen, entryMode])

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
      setHandlingLines([
        {
          id: 'h-default',
          name: 'Handling Fees',
          amount: String(ADMIN_HANDLING_FEE_AMOUNT),
          currency: ADMIN_HANDLING_FEE_CURRENCY,
          isDefault: true,
        },
      ])
      setForm(defaultQuoteForm())
      setQuickSailingDates([])
      setInlandManualOpen(false)
      setReeferDeferred(null)

      if (initialQuickMode) {
        setOceanLines(createQuickOceanCoreRows(t, quoteCodeLabel))
      } else {
        setOceanLines([])
      }

      if (initialOffer && !initialQuickMode) {
        const inlandSheet = initialOffer.pricing_type === 'inland'
        if (inlandSheet) {
          setInlandOfferId(String(initialOffer.id || ''))
          const route = inlandRouteFromOffer(initialOffer)
          setQuickInlandPort(route.port)
          setQuickInlandGov(route.governorate)
          setQuickInlandZone(route.address)
          setInlandLineRows(buildInlandRowsFromOffer(initialOffer, t))
        } else {
          applySeaOffer(initialOffer)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, initialOffer, initialQuickMode, applySeaOffer, t, quoteCodeLabel])

  const selectedSeaOffer = useMemo(() => {
    if (!form.pricing_offer_id) return null
    const fromList = seaOffers.find((o) => String(o.id) === String(form.pricing_offer_id))
    if (fromList) return fromList
    if (initialOffer && String(initialOffer.id) === String(form.pricing_offer_id)) return initialOffer
    return null
  }, [seaOffers, form.pricing_offer_id, initialOffer])

  const selectedInlandOffer = useMemo(() => {
    if (!inlandOfferId) return null
    const fromList = inlandOffers.find((o) => String(o.id) === String(inlandOfferId))
    if (fromList) return fromList
    if (
      initialOffer?.pricing_type === 'inland' &&
      String(initialOffer.id) === String(inlandOfferId)
    ) {
      return initialOffer
    }
    return null
  }, [inlandOffers, inlandOfferId, initialOffer])

  useEffect(() => {
    if (entryMode === 'quick') return
    if (!selectedInlandOffer) {
      setInlandLineRows([])
      return
    }
    const route = inlandRouteFromOffer(selectedInlandOffer)
    setQuickInlandPort(route.port)
    setQuickInlandGov(route.governorate)
    setQuickInlandZone(route.address)
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

  const addOceanLine = useCallback((line) => {
    setOceanLines((prev) => [...prev, line])
  }, [])

  const addInlandLine = useCallback((line) => {
    setInlandLineRows((prev) => [...prev, line])
  }, [])

  const updateHandlingLine = (id, patch) => {
    setHandlingLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
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
  const isReeferOcean = useMemo(
    () => isReeferContainerSpec(form.container_type),
    [form.container_type]
  )
  const showReeferDeferredPowerFootnote = useMemo(
    () => shouldShowReeferDeferredPowerFootnote(isReeferOcean, reeferDeferred),
    [isReeferOcean, reeferDeferred]
  )

  const showOwsDeferredFootnote = useMemo(
    () => shouldShowOwsFootnote(selectedSeaOffer, owsDeferred),
    [selectedSeaOffer, owsDeferred]
  )
  const oceanQuickSelectCodes = useMemo(
    () =>
      QUICK_SELECT_CODES.filter((code) => !isReeferOcean || !isReeferDeferredQuoteCode(code)),
    [isReeferOcean]
  )

  useEffect(() => {
    if (!isReeferOcean) {
      setReeferDeferred(null)
      return
    }
    setOceanLines((prev) => {
      const deferredLines = prev.filter(isReeferDeferredOceanLine)
      if (!deferredLines.length) return prev

      const powerLine = deferredLines.find((l) => l.code === 'POWER')
      if (powerLine) {
        const fromLines = extractReeferDeferredFromOffer({
          pricing: {
            powerDay: { price: powerLine.cost_amount, currency: powerLine.currency },
          },
          notes: '',
        })
        setReeferDeferred((current) =>
          current?.showPowerFootnote
            ? {
                ...fromLines,
                showPowerFootnote: true,
                powerPerDay: current.powerPerDay || fromLines.powerPerDay,
                freePowerDays: current?.freePowerDays ?? fromLines.freePowerDays,
              }
            : fromLines
        )
      }
      return filterBillableOceanLines(prev, true)
    })
  }, [isReeferOcean])
  const routeDisplayOffer = selectedSeaOffer
  const routeDisplayInlandOffer = selectedInlandOffer
  const isRouteLocked = Boolean(form.pricing_offer_id && routeDisplayOffer)
  const derivedRouteSummary = useMemo(() => {
    if (isRouteLocked && routeDisplayOffer) {
      return `${routeDisplayOffer.pol || form.pol || '—'} → ${routeDisplayOffer.pod || routeDisplayOffer.region || form.pod || '—'}`
    }
    if (form.pol || form.pod) return `${form.pol || '—'} → ${form.pod || '—'}`
    return t('common.dash', '—')
  }, [isRouteLocked, routeDisplayOffer, form.pol, form.pod, t])

  const hasOceanLineData = useMemo(
    () => oceanLines.some((line) => line.included !== false && parseNum(line.selling_amount) > 0 && line.code),
    [oceanLines]
  )
  const showOceanPricing = oceanLines.length > 0
  const showRouteSummary = useMemo(
    () =>
      shouldShowQuoteRouteSummary({
        isQuick,
        seaOfferId: form.pricing_offer_id,
        hasOceanLines: oceanLines.length > 0,
        hasBillableOceanLines: hasOceanLineData,
      }),
    [isQuick, form.pricing_offer_id, oceanLines.length, hasOceanLineData]
  )
  const hasInlandLineData = useMemo(() => {
    if (isQuick) {
      if (inlandLineRows.length > 0) {
        return inlandLineRows.some((row) => row.included !== false && parseNum(row.selling_amount) > 0)
      }
      return parseNum(inlandSelling) > 0 || parseNum(inlandGenSelling) > 0
    }
    return inlandLineRows.some((row) => row.included !== false && parseNum(row.selling_amount) > 0)
  }, [isQuick, inlandSelling, inlandGenSelling, inlandLineRows])
  const showInlandPricing = isQuick ? hasInlandLineData : Boolean(inlandOfferId) && inlandLineRows.length > 0
  const sailingSchedule = useMemo(() => buildSailingScheduleFromOffer(routeDisplayOffer), [routeDisplayOffer])

  const sailingScheduleDisplayText = useMemo(() => {
    if (routeDisplayOffer) return formatSailingScheduleFromOffer(routeDisplayOffer, t('common.dash', '—'))
    return formatSailingScheduleFromForm(form, t('common.dash', '—'))
  }, [routeDisplayOffer, form, t])

  const oceanSellingByCurrency = useMemo(() => sumLineSellingByCurrency(oceanLines), [oceanLines])
  const oceanCostByCurrency = useMemo(() => sumLineCostByCurrency(oceanLines), [oceanLines])

  const customsSellingByCurrency = useMemo(
    () => sumCustomsCostByCurrency(customsClearanceFee, customsExtraItems, customsEnabled),
    [customsEnabled, customsClearanceFee, customsExtraItems]
  )

  const hasCustomsPricing = useMemo(
    () =>
      customsEnabled &&
      (Object.values(customsSellingByCurrency).some((v) => Math.abs(Number(v) || 0) > 1e-9) ||
        (Number(customsClearanceFee?.amount) || 0) > 0),
    [customsEnabled, customsSellingByCurrency, customsClearanceFee]
  )
  const hasAnySectionPricing = hasOceanLineData || hasInlandLineData || hasCustomsPricing

  const pricingLinesProfitByCurrency = useMemo(() => sumProfitsByCurrency(oceanLines), [oceanLines])

  const inlandSectionCostByCurrency = useMemo(() => {
    if (isQuick && inlandLineRows.length > 0) {
      return sumLineCostByCurrency(inlandLineRows)
    }
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
    if (isQuick && inlandLineRows.length > 0) {
      return sumProfitsByCurrency(inlandLineRows)
    }
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
    if (isQuick && inlandLineRows.length > 0) {
      return sumLineSellingByCurrency(inlandLineRows)
    }
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
    const m = {}
    for (const row of handlingLines || []) {
      const n = parseNum(row.amount)
      if (n <= 0) continue
      const c = String(row.currency || ADMIN_HANDLING_FEE_CURRENCY).toUpperCase()
      m[c] = (m[c] || 0) + n
    }
    return m
  }, [handlingLines])

  const quoteHasBillableItems = useMemo(() => {
    const hasHandling = handlingLines.some((row) => parseNum(row.amount) > 0)
    return hasOceanLineData || hasInlandLineData || hasCustomsPricing || hasHandling
  }, [hasOceanLineData, hasInlandLineData, hasCustomsPricing, handlingLines])

  const canSaveQuote = useMemo(() => {
    if (!pricingTeamConfirmed || !quoteHasBillableItems) return false
    if (!clientAsync?.value) return false
    return true
  }, [pricingTeamConfirmed, quoteHasBillableItems, clientAsync])

  const grandSellingByCurrency = useMemo(() => {
    const maps = [handlingSellingByCurrency]
    if (hasOceanLineData) maps.unshift(oceanSellingByCurrency)
    if (hasInlandLineData) maps.unshift(inlandSectionSellingByCurrency)
    if (hasCustomsPricing) maps.unshift(customsSellingByCurrency)
    return mergeCurrencyAmountMaps(...maps)
  }, [
    hasOceanLineData,
    hasInlandLineData,
    hasCustomsPricing,
    oceanSellingByCurrency,
    customsSellingByCurrency,
    inlandSectionSellingByCurrency,
    handlingSellingByCurrency,
  ])

  const inferSubmitPricingType = (billableItems) => {
    const hasInland = billableItems.some((i) => i.code === 'INLAND')
    const hasOcean = billableItems.some((i) => {
      const code = String(i.code || '').toUpperCase()
      return code && code !== 'INLAND' && code !== 'HANDLING'
    })
    if (hasInland && !hasOcean) return 'inland'
    return 'sea'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const salesUserId = user?.id ? Number(user.id) : null
    const isQuickSubmit = entryMode === 'quick'
    if (!pricingTeamConfirmed) return
    if (!clientAsync?.value) return

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
      if (isReeferOcean && isReeferDeferredOceanLine(line)) return
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

    if (isQuickSubmit && inlandLineRows.length > 0) {
      inlandLineRows.forEach((row) => {
        if (row.included === false) return
        if (parseNum(row.selling_amount) <= 0) return
        const baseDesc = quickInlandDescription()
        const rowDesc = row.description
          ? baseDesc
            ? `${baseDesc}|${row.description}`
            : row.description
          : baseDesc
        items.push({
          code: 'INLAND',
          name: row.name || t('pricing.inlandTransport', 'Inland Transport'),
          description: rowDesc,
          amount: parseNum(row.selling_amount),
          currency: row.currency || 'EGP',
          cost_amount: parseNum(row.cost_amount) > 0 ? parseNum(row.cost_amount) : null,
          visible_to_client: true,
        })
      })
    } else if (isQuickSubmit && parseNum(inlandSelling) > 0) {
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
          description: null,
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
        currency: String(row.currency || ADMIN_HANDLING_FEE_CURRENCY).toUpperCase(),
        cost_amount: null,
        visible_to_client: true,
      })
    })

    if (!items.length) return

    const submitPricingType = inferSubmitPricingType(items)
    const hasOceanRoute = Boolean(form.pol || form.pod || form.pricing_offer_id)
    const hasInlandRoute = Boolean(
      inlandOfferId || quickInlandPort.trim() || quickInlandGov.trim() || quickInlandZone.trim()
    )

    const linkedOfferId = isQuickSubmit
      ? null
      : form.pricing_offer_id
        ? Number(form.pricing_offer_id)
        : inlandOfferId
          ? Number(inlandOfferId)
          : null

    const payload = {
      ...form,
      pricing_type: submitPricingType,
      client_id: clientAsync?.value ? Number(clientAsync.value) : null,
      sales_user_id: salesUserId,
      pricing_offer_id: linkedOfferId,
      inland_port: hasInlandRoute
        ? quickInlandPort.trim() || routeDisplayInlandOffer?.inland_port || null
        : null,
      inland_address: hasInlandRoute
        ? quickInlandZone.trim() || routeDisplayInlandOffer?.destination || null
        : null,
      municipality: hasInlandRoute
        ? quickInlandGov.trim() || routeDisplayInlandOffer?.region || routeDisplayInlandOffer?.inland_gov || null
        : null,
      pol: hasOceanRoute ? form.pol || null : null,
      pod: hasOceanRoute ? form.pod || null : null,
      shipping_line: hasOceanRoute ? form.shipping_line || null : null,
      transit_time: hasOceanRoute ? form.transit_time || null : null,
      quick_mode: isQuickSubmit,
      is_quick_quotation: isQuickSubmit,
      quick_mode_reason: isQuickSubmit ? (quickModeReason.trim() || 'Quick Quotation') : null,
      valid_from: String(form.valid_from || '').trim() || null,
      valid_to: String(form.valid_to || '').trim() || null,
      sailing_dates:
        isQuickSubmit && quickSailingDates.length
          ? [...quickSailingDates].filter(Boolean).sort()
          : hasOceanRoute && Array.isArray(form.sailing_dates)
            ? form.sailing_dates
            : [],
      schedule_type: hasOceanRoute ? form.schedule_type || null : null,
      sailing_weekdays: hasOceanRoute && Array.isArray(form.sailing_weekdays) ? form.sailing_weekdays : [],
      container_spec: hasOceanRoute
        ? {
            type: String(form.container_type || '').toLowerCase().includes('reefer') ? 'reefer' : 'dry',
            size: String(form.container_type || '').includes('20') ? '20' : '40',
            height: String(form.container_type || '').toLowerCase().includes('hq') ? 'hq' : 'standard',
          }
        : null,
      container_type: hasOceanRoute ? form.container_type : null,
      qty: hasOceanRoute ? (form.qty ? Number(form.qty) : null) : null,
      free_time_data: (() => {
        const reefer = isReeferOcean ? buildReeferFreeTimeDataPayload(reeferDeferred) : null
        const ows = owsDeferred ? buildOwsFreeTimeDataPayload(owsDeferred) : null
        if (!reefer && !ows) return null
        return { ...(reefer || {}), ...(ows || {}) }
      })(),
      show_carrier_on_pdf: hasOceanRoute ? (isQuickSubmit ? true : showCarrierOnPdf) : false,
      official_receipts_note: customsEnabled ? buildCustomsOfficialReceiptsNote(t) : null,
      pricing_team_confirmed: pricingTeamConfirmed,
      items,
    }

    try {
      await create(payload)
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
    ? t('pricing.quickQuotationTitle', 'انشاء عرض سعر سريع / Create Quick Quotation')
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
                      <div className="ship-meta-val">{t('pricing.quickModeBadgeShort', 'Quick')}</div>
                      <div className="ship-meta-lbl">{t('pricing.finHeaderMode', 'Mode')}</div>
                    </div>
                    <div className="ship-meta-divider" aria-hidden />
                  </>
                ) : null}
                <div>
                  <div className="ship-meta-val">
                    {entryMode === 'quick'
                      ? t('pricing.quickQuotation', 'Quick')
                      : t('pricing.createStandardQuotationShort', 'Standard')}
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

          <form id="quoteForm" onSubmit={handleSubmit} className="shipment-fin-panel shipment-fin-panel--enter space-y-6">
            {isQuick ? (
              <QuickQuoteForm
                form={form}
                setField={setField}
                quickSailingDates={quickSailingDates}
                onQuickSailingDatesChange={setQuickSailingDates}
                oceanLines={oceanLines}
                updateOceanLine={updateOceanLine}
                onAddOceanLine={addOceanLine}
                oceanCostByCurrency={oceanCostByCurrency}
                pricingLinesProfitByCurrency={pricingLinesProfitByCurrency}
                oceanSellingByCurrency={oceanSellingByCurrency}
                hasOceanLineData={hasOceanLineData}
                inlandManualOpen={inlandManualOpen}
                onInlandManualOpen={(starterRows) => {
                  setInlandManualOpen(true)
                  setInlandLineRows(starterRows)
                }}
                onInlandManualClose={() => {
                  setInlandManualOpen(false)
                  setInlandLineRows([])
                  setQuickInlandPort('')
                  setQuickInlandGov('')
                  setQuickInlandZone('')
                  setQuickInlandVehicle('')
                }}
                quickInlandPort={quickInlandPort}
                onQuickInlandPortChange={setQuickInlandPort}
                quickInlandGov={quickInlandGov}
                onQuickInlandGovChange={setQuickInlandGov}
                quickInlandZone={quickInlandZone}
                onQuickInlandZoneChange={setQuickInlandZone}
                quickInlandVehicle={quickInlandVehicle}
                onQuickInlandVehicleChange={setQuickInlandVehicle}
                inlandLineRows={inlandLineRows}
                updateInlandRow={updateInlandRow}
                onAddInlandLine={addInlandLine}
                inlandSectionCostByCurrency={inlandSectionCostByCurrency}
                inlandSectionProfitByCurrency={inlandSectionProfitByCurrency}
                inlandSectionSellingByCurrency={inlandSectionSellingByCurrency}
                hasInlandLineData={hasInlandLineData}
                clientAsync={clientAsync}
                setClientAsync={setClientAsync}
                loadClientOptions={loadClientOptions}
                onShowAddClient={() => setShowAddClientModal(true)}
                customsEnabled={customsEnabled}
                onEnableCustoms={() => setCustomsEnabled(true)}
                onRemoveCustoms={handleRemoveCustoms}
                customsClearanceFee={customsClearanceFee}
                customsExtraItems={customsExtraItems}
                onAddCustomsItem={addCustomsExtraItem}
                onUpdateCustomsItem={updateCustomsExtraItem}
                onRemoveCustomsItem={removeCustomsExtraItem}
                customsSellingByCurrency={customsSellingByCurrency}
                handlingLines={handlingLines}
                onAddHandlingItem={addHandlingItem}
                onUpdateHandlingLine={updateHandlingLine}
                onRemoveHandlingItem={removeHandlingItem}
                handlingSellingByCurrency={handlingSellingByCurrency}
                hasAnySectionPricing={hasAnySectionPricing}
                hasCustomsPricing={hasCustomsPricing}
                quoteProfitByCurrency={quoteProfitByCurrency}
                grandSellingByCurrency={grandSellingByCurrency}
                showReeferDeferredPowerFootnote={showReeferDeferredPowerFootnote}
                reeferPowerPerDay={reeferDeferred?.powerPerDay}
                reeferFreePowerDays={reeferDeferred?.freePowerDays}
                showRouteSummary={showRouteSummary}
              />
            ) : (
            <>
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
              </div>
            </QuoteFinCard>

            {showRouteSummary ? (
            <QuoteFinCard icon={MapPin} title={t('pricing.quoteSectionRoute', 'ملخص المسار / Route summary')}>
              {isRouteLocked ? (
                <div className="pricing-quote-shipment-badges">
                  <QuoteSummaryBadge label={t('pricing.quoteBadgeRoute', 'المسار')}>
                    {derivedRouteSummary}
                  </QuoteSummaryBadge>
                  {isRouteLocked ? (
                    <>
                      <ShippingLineSummaryBadge
                        line={routeDisplayOffer?.shipping_line || form.shipping_line || '—'}
                        visible={showCarrierOnPdf}
                        onToggle={() => setShowCarrierOnPdf((v) => !v)}
                        t={t}
                      />
                      <QuoteSummaryBadge label={t('pricing.quoteBadgeContainer', 'نوع الحاوية')}>
                        {routeDisplayOffer ? inferContainerFromOffer(routeDisplayOffer) : form.container_type || '—'}
                      </QuoteSummaryBadge>
                      <QuoteSummaryBadge label={t('pricing.quoteBadgeTransit', 'Transit Time')}>
                        {routeDisplayOffer?.transit_time || form.transit_time || '—'}
                      </QuoteSummaryBadge>
                      {sailingSchedule || sailingScheduleDisplayText !== t('common.dash', '—') ? (
                        <QuoteSailingScheduleDisplay text={sailingScheduleDisplayText} />
                      ) : null}
                    </>
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
                        <span className="pricing-quote-field-chip__label">{t('pricing.transitTime', 'Transit Time')}</span>
                        <input
                          value={form.transit_time}
                          onChange={(e) => setField('transit_time', e.target.value)}
                          className="pricing-quote-field-chip__input"
                        />
                      </label>
                    </div>
                    {!isQuick && (sailingSchedule || sailingScheduleDisplayText !== t('common.dash', '—')) ? (
                      <div className="md:col-span-2">
                        <QuoteSailingScheduleDisplay text={sailingScheduleDisplayText} asBadge={false} />
                      </div>
                    ) : null}
                    {isQuick && sailingScheduleDisplayText !== t('common.dash', '—') ? (
                      <div className="md:col-span-2">
                        <QuoteSailingScheduleDisplay text={sailingScheduleDisplayText} asBadge={false} />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </QuoteFinCard>
            ) : null}

            <QuoteFinCard icon={Ship} title={t('pricing.quoteSectionOcean', 'القسم 1: الشحن البحري / Ocean freight')}>
              {!isQuick ? (
                <div className="space-y-2 pb-4 mb-4 border-b border-slate-200/90 dark:border-slate-700">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.offerSeaRate')}</label>
                  <select
                    value={form.pricing_offer_id}
                    onChange={(e) => {
                      const id = e.target.value
                      setField('pricing_offer_id', id)
                      if (!id) {
                        setOceanLines([])
                        setReeferDeferred(null)
                        setForm((prev) => ({
                          ...prev,
                          pricing_offer_id: '',
                          pol: '',
                          pod: '',
                          shipping_line: '',
                          transit_time: '',
                          container_type: defaultQuoteForm().container_type,
                          sailing_dates: [],
                          schedule_type: null,
                          sailing_weekdays: [],
                        }))
                        return
                      }
                      const offer = seaOffers.find((o) => String(o.id) === String(id))
                      if (offer) applySeaOffer(offer)
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                  >
                    <option value="">{t('pricing.quoteNoneSelected', 'None selected / لا يوجد اختيار')}</option>
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

              {showOceanPricing ? (
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
                      readOnlyCurrency={isPricing && Boolean(form.pricing_offer_id)}
                      readOnlyName={isPricing && Boolean(form.pricing_offer_id)}
                      allowOceanCodeEdit={!isPricing || !form.pricing_offer_id}
                      quoteCodeLabel={quoteCodeLabel}
                      quickSelectCodes={oceanQuickSelectCodes}
                      variant="ocean"
                    />
                  </div>
                  {hasOceanLineData ? (
                    <QuoteOceanLinesSummary
                      costByCurrency={oceanCostByCurrency}
                      profitByCurrency={pricingLinesProfitByCurrency}
                      sellingByCurrency={oceanSellingByCurrency}
                      footer={
                        showReeferDeferredPowerFootnote || showOwsDeferredFootnote ? (
                          <div className="pricing-quote-deferred-footnotes">
                            {showReeferDeferredPowerFootnote ? (
                              <QuoteReeferDeferredFootnote
                                powerPerDay={reeferDeferred?.powerPerDay}
                                freePowerDays={reeferDeferred?.freePowerDays}
                              />
                            ) : null}
                            {showOwsDeferredFootnote ? (
                              <QuoteOwsDeferredFootnote ows={owsDeferred?.ows} />
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  ) : showReeferDeferredPowerFootnote || showOwsDeferredFootnote ? (
                    <div className="pricing-quote-deferred-footnotes">
                      {showReeferDeferredPowerFootnote ? (
                        <QuoteReeferDeferredFootnote
                          powerPerDay={reeferDeferred?.powerPerDay}
                          freePowerDays={reeferDeferred?.freePowerDays}
                        />
                      ) : null}
                      {showOwsDeferredFootnote ? (
                        <QuoteOwsDeferredFootnote ows={owsDeferred?.ows} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : isQuick ? (
                <div className="pricing-quote-section-empty">
                  <button
                    type="button"
                    className="pricing-quote-section-empty__action"
                    onClick={() => setOceanLines(makeQuickOceanLines())}
                  >
                    {t('pricing.quickStartOceanEntry', 'Enter ocean charges manually')}
                  </button>
                </div>
              ) : null}
            </QuoteFinCard>

            <QuoteFinCard icon={Truck} title={t('pricing.quoteSectionInland', 'Section 2: Inland transport')}>
              <QuoteInlandTransportSection
                isQuick={isQuick}
                inlandOffers={inlandOffers}
                inlandOfferId={inlandOfferId}
                onInlandOfferIdChange={handleInlandOfferIdChange}
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
                initialOffer={initialOffer}
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
                onAddItem={addHandlingItem}
                onUpdateItem={updateHandlingLine}
                onRemoveItem={removeHandlingItem}
                totalByCurrency={handlingSellingByCurrency}
              />
            </QuoteFinCard>

            {hasAnySectionPricing ? (
              <QuoteGrandSummaryPanel title={t('pricing.quoteSectionSummary', 'Summary')}>
                {hasOceanLineData ? (
                  <QuoteSummaryRow label={t('pricing.summaryOcean', 'Ocean freight total')}>
                    <QuoteSummaryCurrencyText amounts={oceanSellingByCurrency} dash={t('common.dash', '—')} />
                  </QuoteSummaryRow>
                ) : null}
                {hasInlandLineData ? (
                  <QuoteSummaryRow label={t('pricing.summaryInland', 'Inland transport total')}>
                    <QuoteSummaryCurrencyText amounts={inlandSectionSellingByCurrency} dash={t('common.dash', '—')} />
                  </QuoteSummaryRow>
                ) : null}
                {hasCustomsPricing ? (
                  <QuoteSummaryRow label={t('pricing.summaryCustoms', 'Customs total')}>
                    <QuoteSummaryCurrencyText amounts={customsSellingByCurrency} dash={t('common.dash', '—')} />
                  </QuoteSummaryRow>
                ) : null}
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
            ) : null}

            </>
            )}

            <section
              className={`pricing-quote-confirmation-card ${
                pricingTeamConfirmed ? 'pricing-quote-confirmation-card--confirmed' : 'pricing-quote-confirmation-card--pending'
              }`}
              role="region"
              aria-label={t('pricing.pricingTeamConfirmTitle', 'Pricing team confirmation')}
            >
              <div className="pricing-quote-confirmation-card__head">
                <h4 className="pricing-quote-confirmation-card__title">
                  {t('pricing.pricingTeamConfirmTitle', 'Confirm with Pricing Team before sending')}
                </h4>
                <span
                  className={`pricing-quote-confirm-status-badge ${
                    pricingTeamConfirmed
                      ? 'pricing-quote-confirm-status-badge--yes'
                      : 'pricing-quote-confirm-status-badge--no'
                  }`}
                  role="status"
                  aria-label={`${t('pricing.quoteConfirmStatusLabel', 'Status')}: ${
                    pricingTeamConfirmed
                      ? t('pricing.confirmStateYes', 'Confirmed')
                      : t('pricing.confirmStateNo', 'Not confirmed')
                  }`}
                >
                  {pricingTeamConfirmed
                    ? t('pricing.confirmStateYes', 'Confirmed')
                    : t('pricing.confirmStateNo', 'Not confirmed')}
                </span>
              </div>
              <p className="pricing-quote-confirmation-card__body">
                {t(
                  'pricing.pricingTeamConfirmBody',
                  'Make sure Pricing Team confirms the underlying rates are still valid before you send this quotation to the client.'
                )}
              </p>
              <label className="pricing-quote-confirmation-card__check">
                <input
                  type="checkbox"
                  className="pricing-quote-confirmation-card__checkbox"
                  checked={pricingTeamConfirmed}
                  onChange={(e) => setPricingTeamConfirmed(e.target.checked)}
                />
                <span className="pricing-quote-confirmation-card__check-label">
                  {t('pricing.pricingTeamConfirmCheckbox', 'I confirmed with Pricing Team — this quotation is ready to send')}
                </span>
              </label>
            </section>

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
        }}
      />
    </div>
  )
}
