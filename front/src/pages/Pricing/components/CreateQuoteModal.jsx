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
  Calendar,
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
  QuotePillToggle,
  QuoteSummaryBadge,
} from './quoteFormLayout'
import QuotePricingLinesTable from './QuotePricingLinesTable'
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

function currencyCodePill(code) {
  const raw = String(code ?? '')
    .trim()
    .toUpperCase()
  const display = raw || '—'
  let variant = 'alt'
  if (display === 'EGP') variant = 'egp'
  else if (display === 'USD') variant = 'usd'
  else if (display === 'EUR') variant = 'eur'
  else if (display === '—') variant = 'muted'
  return <span className={`shipment-fin-cur-pill shipment-fin-cur-pill--${variant}`}>{display}</span>
}

function QuoteSummaryMoney({ amounts, i18n, t, withPills = false }) {
  const keys = sortCurrencyCodes(Object.keys(amounts).filter((c) => Math.abs(amounts[c] || 0) > 1e-9))
  if (!keys.length) return <span>{t('common.dash')}</span>
  return keys.map((cur, i) => (
    <span key={cur} className="pricing-quote-inline-money-part">
      {i > 0 ? <span className="pricing-quote-inline-money__sep"> · </span> : null}
      {withPills ? (
        <span className="inline-flex items-center gap-1">
          {currencyCodePill(cur)}
          {formatLocaleMoney(amounts[cur], cur, i18n.language)}
        </span>
      ) : (
        formatLocaleMoney(amounts[cur], cur, i18n.language)
      )}
    </span>
  ))
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

const PROFIT_CUR_ORDER = ['USD', 'EUR', 'EGP']

function sortedProfitKeys(map) {
  return Object.keys(map).sort((a, b) => {
    const ia = PROFIT_CUR_ORDER.indexOf(a)
    const ib = PROFIT_CUR_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b)
  })
}

function QuoteFinCard({ icon: Icon, title, subtitle: _subtitleIgnored, headMeta = null, children }) {
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

function ShippingLineCustomerToggle({ enabled, onToggle, t }) {
  const stateLabel = enabled
    ? t('pricing.shippingLineShowToClientBadge', 'إظهار للعميل')
    : t('pricing.shippingLineHideFromClientBadge', 'غير ظاهر للعميل')
  return (
    <span className="pricing-quote-visibility-badge" role="group" aria-label={stateLabel}>
      <span
        className={`pricing-quote-visibility-badge__state ${enabled ? 'is-on' : 'is-off'}`}
        aria-live="polite"
      >
        {stateLabel}
      </span>
      <QuotePillToggle enabled={enabled} onToggle={onToggle} ariaLabel={stateLabel} />
    </span>
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

  const [inlandEnabled, setInlandEnabled] = useState(false)
  const [inlandOfferId, setInlandOfferId] = useState('')
  const [inlandCost, setInlandCost] = useState('')
  const [inlandSelling, setInlandSelling] = useState('')
  const [inlandCurrency, setInlandCurrency] = useState('EGP')
  const [inlandGenCost, setInlandGenCost] = useState('')
  const [inlandGenSelling, setInlandGenSelling] = useState('')
  const [inlandGenCurrency, setInlandGenCurrency] = useState('EGP')

  const [inlandLineRows, setInlandLineRows] = useState([])

  const [customsEnabled, setCustomsEnabled] = useState(false)
  const [customsExtras, setCustomsExtras] = useState([])
  const [customsExtraName, setCustomsExtraName] = useState('')
  const [customsExtraAmount, setCustomsExtraAmount] = useState('')
  const [customsExtraCurrency, setCustomsExtraCurrency] = useState('EGP')
  const [customsCertSelling, setCustomsCertSelling] = useState('250')
  const [customsCertCurrency, setCustomsCertCurrency] = useState('EGP')
  const [officialReceiptsNote, setOfficialReceiptsNote] = useState('')

  const [handlingLines, setHandlingLines] = useState([{ id: 'h-init', name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), currency: 'USD' }])

  const [showCarrierOnPdf, setShowCarrierOnPdf] = useState(true)
  const [quickModeReason, setQuickModeReason] = useState('')
  const [pricingTeamConfirmed, setPricingTeamConfirmed] = useState(false)
  const [municipality, setMunicipality] = useState('')
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
      inlandEnabled,
      inlandOfferId,
      inlandCost,
      inlandSelling,
      inlandCurrency,
      inlandGenCost,
      inlandGenSelling,
      inlandGenCurrency,
      inlandLineRows,
      customsEnabled,
      customsExtras,
      customsExtraName,
      customsExtraAmount,
      customsExtraCurrency,
      customsCertSelling,
      customsCertCurrency,
      officialReceiptsNote,
      handlingLines,
      showCarrierOnPdf,
      quickModeReason,
      pricingTeamConfirmed,
      municipality,
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
      inlandEnabled,
      inlandOfferId,
      inlandCost,
      inlandSelling,
      inlandCurrency,
      inlandGenCost,
      inlandGenSelling,
      inlandGenCurrency,
      inlandLineRows,
      customsEnabled,
      customsExtras,
      customsExtraName,
      customsExtraAmount,
      customsExtraCurrency,
      customsCertSelling,
      customsCertCurrency,
      officialReceiptsNote,
      handlingLines,
      showCarrierOnPdf,
      quickModeReason,
      pricingTeamConfirmed,
      municipality,
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
      let certAmt = 250
      let certCur = 'EGP'
      try {
        const token = getStoredToken()
        if (token) {
          const res = await getSettings(token)
          const fee = res?.data?.quotation?.customs_certificate_fee
          if (fee) {
            certAmt = Number(fee.amount) || 250
            certCur = fee.currency || 'EGP'
          }
        }
      } catch {
        /* keep defaults */
      }
      if (cancelled) return

      const saved = readPricingQuoteDraft(draftScope)
      if (saved && isQuoteDraftMeaningful(saved)) {
        setForm({ ...defaultQuoteForm(), ...(saved.form || {}) })
        setOceanLines(Array.isArray(saved.oceanLines) ? saved.oceanLines : [])
        setInlandEnabled(Boolean(saved.inlandEnabled))
        setInlandOfferId(saved.inlandOfferId || '')
        setInlandCost(saved.inlandCost ?? '')
        setInlandSelling(saved.inlandSelling ?? '')
        setInlandCurrency(saved.inlandCurrency || 'EGP')
        setInlandGenCost(saved.inlandGenCost ?? '')
        setInlandGenSelling(saved.inlandGenSelling ?? '')
        setInlandGenCurrency(saved.inlandGenCurrency || 'EGP')
        setInlandLineRows(Array.isArray(saved.inlandLineRows) ? saved.inlandLineRows : [])
        setCustomsEnabled(Boolean(saved.customsEnabled))
        setCustomsExtras(Array.isArray(saved.customsExtras) ? saved.customsExtras : [])
        setCustomsExtraName(saved.customsExtraName ?? '')
        setCustomsExtraAmount(saved.customsExtraAmount ?? '')
        setCustomsExtraCurrency(saved.customsExtraCurrency || 'EGP')
        setCustomsCertSelling(saved.customsCertSelling != null ? String(saved.customsCertSelling) : String(certAmt))
        setCustomsCertCurrency(saved.customsCertCurrency || certCur)
        setOfficialReceiptsNote(saved.officialReceiptsNote ?? '')
        setHandlingLines(
          Array.isArray(saved.handlingLines) && saved.handlingLines.length
            ? saved.handlingLines
            : [{ id: `h-${Date.now()}`, name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), currency: 'USD' }]
        )
        setShowCarrierOnPdf(saved.showCarrierOnPdf !== false)
        setQuickModeReason(saved.quickModeReason ?? '')
        setPricingTeamConfirmed(Boolean(saved.pricingTeamConfirmed))
        setMunicipality(saved.municipality ?? '')
        setClientAsync(saved.clientAsync?.value ? saved.clientAsync : null)
        setQuickInlandPort(saved.quickInlandPort ?? '')
        setQuickInlandGov(saved.quickInlandGov ?? '')
        setQuickInlandZone(saved.quickInlandZone ?? '')
        setQuickInlandVehicle(saved.quickInlandVehicle ?? '')
        setDraftRestoredBanner(true)
        return
      }

      setOfficialReceiptsNote('')
      setQuickModeReason('')
      setPricingTeamConfirmed(false)
      setMunicipality('')
      setClientAsync(null)
      setInlandEnabled(false)
      setInlandOfferId('')
      setInlandLineRows([])
      setInlandCost('')
      setInlandSelling('')
      setInlandCurrency('EGP')
      setInlandGenCost('')
      setInlandGenSelling('')
      setInlandGenCurrency('EGP')
      setCustomsEnabled(false)
      setCustomsExtras([])
      setCustomsExtraName('')
      setCustomsExtraAmount('')
      setCustomsExtraCurrency('EGP')
      setCustomsCertSelling(String(certAmt))
      setCustomsCertCurrency(certCur)
      setShowCarrierOnPdf(true)
      setQuickInlandPort('')
      setQuickInlandGov('')
      setQuickInlandZone('')
      setQuickInlandVehicle('')
      const mode = initialOffer ? 'pricing' : initialQuickMode ? 'quick' : 'manual'
      if (mode === 'pricing' && initialOffer) {
        setHandlingLines([
          { id: `h-${Date.now()}`, name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), currency: ADMIN_HANDLING_FEE_CURRENCY },
        ])
        applySeaOffer(initialOffer)
      } else {
        setHandlingLines([{ id: `h-${Date.now()}`, name: 'Handling Fees', amount: String(ADMIN_HANDLING_FEE_AMOUNT), currency: 'USD' }])
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
    if (!inlandEnabled || entryMode === 'quick') return
    if (!selectedInlandOffer) {
      setInlandLineRows([])
      return
    }
    setInlandLineRows(buildInlandRowsFromOffer(selectedInlandOffer, t))
  }, [inlandEnabled, entryMode, selectedInlandOffer, t])

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

  const addOceanLine = () => {
    setOceanLines((prev) => [
      ...prev,
      {
        sourceKey: `m-${Date.now()}`,
        code: 'OTHER',
        name: '',
        description: '',
        cost_amount: '',
        selling_amount: '',
        currency: 'USD',
        included: true,
        quickCore: false,
      },
    ])
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

  const addHandlingLine = () => {
    setHandlingLines((prev) => [...prev, { id: `h-${Date.now()}`, name: 'Handling Fees', amount: '', currency: 'USD' }])
  }

  const removeHandlingLine = (id) => {
    setHandlingLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
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

  const customsExtrasByCurrency = useMemo(() => {
    const m = {}
    if (!customsEnabled) return m
    ;(customsExtras || []).forEach((row) => {
      const n = parseNum(row.amount)
      if (n <= 0) return
      const c = row.currency || 'EGP'
      m[c] = (m[c] || 0) + n
    })
    return m
  }, [customsEnabled, customsExtras])

  const customsSellingByCurrency = useMemo(() => {
    if (!customsEnabled) return {}
    const n = parseNum(customsCertSelling)
    if (!n) return mergeCurrencyAmountMaps({}, customsExtrasByCurrency)
    const c = customsCertCurrency || 'EGP'
    const base = { [c]: n }
    return mergeCurrencyAmountMaps(base, customsExtrasByCurrency)
  }, [customsEnabled, customsCertSelling, customsCertCurrency, customsExtrasByCurrency])

  const inlandProfit = useMemo(() => parseNum(inlandSelling) - parseNum(inlandCost), [inlandSelling, inlandCost])

  const inlandGenProfit = useMemo(
    () => parseNum(inlandGenSelling) - parseNum(inlandGenCost),
    [inlandGenSelling, inlandGenCost]
  )

  const inlandLinesProfitByCurrency = useMemo(() => {
    const map = {}
    if (!inlandEnabled || entryMode === 'quick' || !inlandLineRows.length) return map
    inlandLineRows.forEach((row) => {
      if (row.included === false) return
      const cur = row.currency || 'EGP'
      const p = parseNum(row.selling_amount) - parseNum(row.cost_amount)
      map[cur] = (map[cur] || 0) + p
    })
    return map
  }, [inlandEnabled, entryMode, inlandLineRows])

  const pricingLinesProfitByCurrency = useMemo(() => sumProfitsByCurrency(oceanLines), [oceanLines])

  const quoteProfitByCurrency = useMemo(() => {
    const map = { ...pricingLinesProfitByCurrency }
    if (inlandEnabled && entryMode === 'quick' && parseNum(inlandSelling) > 0) {
      const c = inlandCurrency || 'EGP'
      map[c] = (map[c] || 0) + inlandProfit
    }
    if (inlandEnabled && entryMode === 'quick' && parseNum(inlandGenSelling) > 0) {
      const c = inlandGenCurrency || inlandCurrency || 'EGP'
      map[c] = (map[c] || 0) + inlandGenProfit
    }
    if (inlandEnabled && entryMode !== 'quick') {
      Object.entries(inlandLinesProfitByCurrency).forEach(([c, v]) => {
        map[c] = (map[c] || 0) + v
      })
    }
    if (customsEnabled) {
      const cert = parseNum(customsCertSelling)
      if (cert > 0) {
        const c = customsCertCurrency || 'EGP'
        if (!isPricing) map[c] = (map[c] || 0) + cert
      }
    }
    if (customsEnabled && customsExtras.length) {
      customsExtras.forEach((row) => {
        const n = parseNum(row.amount)
        if (n <= 0) return
        const c = row.currency || 'EGP'
        map[c] = (map[c] || 0) + n
      })
    }
    return map
  }, [
    pricingLinesProfitByCurrency,
    inlandEnabled,
    entryMode,
    inlandCurrency,
    inlandProfit,
    inlandSelling,
    inlandGenSelling,
    inlandGenCost,
    inlandGenCurrency,
    inlandGenProfit,
    inlandLinesProfitByCurrency,
    customsEnabled,
    customsExtras,
    customsCertSelling,
    customsCertCurrency,
    isPricing,
  ])

  const handlingSellingByCurrency = useMemo(() => {
    const m = {}
    ;(handlingLines || []).forEach((row) => {
      const n = parseNum(row.amount)
      if (n <= 0) return
      const c = row.currency || 'USD'
      m[c] = (m[c] || 0) + n
    })
    return m
  }, [handlingLines])

  const grandSellingByCurrency = useMemo(() => {
    const inlandPart = {}
    if (inlandEnabled && entryMode !== 'quick') {
      inlandLineRows.forEach((row) => {
        if (row.included === false) return
        const n = parseNum(row.selling_amount)
        if (n <= 0) return
        const c = row.currency || 'EGP'
        inlandPart[c] = (inlandPart[c] || 0) + n
      })
    } else if (inlandEnabled && entryMode === 'quick') {
      if (parseNum(inlandSelling) > 0) {
        const c = inlandCurrency || 'EGP'
        inlandPart[c] = (inlandPart[c] || 0) + parseNum(inlandSelling)
      }
      if (parseNum(inlandGenSelling) > 0) {
        const c = inlandGenCurrency || inlandCurrency || 'EGP'
        inlandPart[c] = (inlandPart[c] || 0) + parseNum(inlandGenSelling)
      }
    }
    return mergeCurrencyAmountMaps(
      oceanSellingByCurrency,
      customsSellingByCurrency,
      inlandPart,
      handlingSellingByCurrency
    )
  }, [
    oceanSellingByCurrency,
    customsSellingByCurrency,
    inlandEnabled,
    entryMode,
    inlandLineRows,
    inlandSelling,
    inlandGenSelling,
    inlandCurrency,
    inlandGenCurrency,
    handlingSellingByCurrency,
  ])

  const inlandNonQuickSellingByCurrency = useMemo(() => {
    const m = {}
    if (!inlandEnabled || entryMode === 'quick') return m
    inlandLineRows.forEach((row) => {
      const n = parseNum(row.selling_amount)
      if (n <= 0) return
      const c = row.currency || 'EGP'
      m[c] = (m[c] || 0) + n
    })
    return m
  }, [inlandEnabled, entryMode, inlandLineRows])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const salesUserId = user?.id ? Number(user.id) : null
    const isQuickSubmit = entryMode === 'quick'
    if (inlandEnabled && !isQuickSubmit && !inlandOfferId) return
    if (entryMode === 'manual' && !String(form.valid_to || '').trim()) return
    if (!isQuickSubmit && sailingSchedule && !selectedSailingDate) return
    if (isQuickSubmit && !pricingTeamConfirmed) return
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

    if (inlandEnabled && !isQuickSubmit && inlandLineRows.length) {
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

    if (inlandEnabled && isQuickSubmit && parseNum(inlandSelling) > 0) {
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

    if (inlandEnabled && isQuickSubmit && parseNum(inlandGenSelling) > 0) {
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
      const amt = parseNum(customsCertSelling)
      const cur = customsCertCurrency || 'EGP'
      if (amt > 0) {
        items.push({
          code: 'OTHER',
          name: t('pricing.customsCertFee', 'Customs Certificate Fee'),
          description: null,
          amount: amt,
          currency: cur,
          cost_amount: isPricing ? amt : null,
          visible_to_client: true,
        })
      }
    }

    customsExtras.forEach((row) => {
      const amt = parseNum(row.amount)
      const label = (row.name || '').trim()
      if (!customsEnabled || amt <= 0 || !label) return
      items.push({
        code: 'OTHER',
        name: label,
        description: null,
        amount: amt,
        currency: row.currency || 'EGP',
        cost_amount: null,
        visible_to_client: true,
      })
    })

    ;(handlingLines || []).forEach((row) => {
      const amt = parseNum(row.amount)
      if (amt <= 0) return
      const nm = (row.name || '').trim() || 'Handling Fees'
      items.push({
        code: 'HANDLING',
        name: nm,
        description: null,
        amount: amt,
        currency: row.currency || 'USD',
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
      official_receipts_note: officialReceiptsNote.trim() || null,
      municipality: municipality.trim() || null,
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
    isQuick && inlandEnabled && String(form.container_type || '').toLowerCase().includes('reefer')

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
                <div className="pricing-quote-shipment-summary">
                  <div className="pricing-quote-shipment-badges">
                    <QuoteSummaryBadge label={t('pricing.quoteBadgeRoute', 'المسار')}>
                      {routeDisplayOffer?.pol || form.pol || '—'} →{' '}
                      {routeDisplayOffer?.pod || routeDisplayOffer?.region || form.pod || '—'}
                    </QuoteSummaryBadge>
                    <QuoteSummaryBadge label={t('pricing.quoteBadgeShippingLine', 'الخط الملاحي')}>
                      <span className={showCarrierOnPdf ? '' : 'pricing-quote-summary-badge__value--muted'}>
                        {showCarrierOnPdf
                          ? routeDisplayOffer?.shipping_line || form.shipping_line || '—'
                          : '—'}
                      </span>
                    </QuoteSummaryBadge>
                    <ShippingLineCustomerToggle
                      enabled={showCarrierOnPdf}
                      onToggle={() => setShowCarrierOnPdf((v) => !v)}
                      t={t}
                    />
                    <QuoteSummaryBadge label={t('pricing.quoteBadgeContainer', 'نوع الحاوية')}>
                      {routeDisplayOffer ? inferContainerFromOffer(routeDisplayOffer) : form.container_type || '—'}
                    </QuoteSummaryBadge>
                    <QuoteSummaryBadge label={t('pricing.quoteBadgeTransit', 'مدة العبور')}>
                      {routeDisplayOffer?.transit_time || form.transit_time || '—'}
                    </QuoteSummaryBadge>
                  </div>
                  {sailingSchedule ? (
                    <div className="pricing-quote-sailing-row">
                      <QuoteSailingDateSelector
                        inline
                        schedule={sailingSchedule}
                        value={selectedSailingDate}
                        onChange={setSelectedSailingDate}
                      />
                    </div>
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
                        <ShippingLineCustomerToggle
                          enabled={showCarrierOnPdf}
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
                  <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/40 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 mb-2">
                      {t('pricing.totalLineProfit', 'Total profit (pricing lines)')}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                      {sortedProfitKeys(pricingLinesProfitByCurrency).every((k) => Math.abs(pricingLinesProfitByCurrency[k]) <= 1e-9) ? (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      ) : (
                        sortedProfitKeys(pricingLinesProfitByCurrency)
                          .filter((k) => Math.abs(pricingLinesProfitByCurrency[k]) > 1e-9)
                          .map((cur) => {
                            const amt = pricingLinesProfitByCurrency[cur]
                            return (
                              <span key={cur} className="inline-flex items-center gap-2">
                                {currencyCodePill(cur)}
                                <span
                                  className={`text-sm font-bold tabular-nums ${
                                    amt >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {formatPricingDecimal(amt)}
                                </span>
                              </span>
                            )
                          })
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPricing}
                    onClick={addOceanLine}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border disabled:opacity-40 ${
                      isQuick
                        ? 'pricing-quick-ocean-add border-amber-200/90 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/35 text-amber-950 dark:text-amber-100'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Plus className="h-4 w-4" />{' '}
                    {isQuick ? t('pricing.quickOceanAddChargeTitle', 'Add extra ocean charge') : t('common.add', 'Add line')}
                  </button>
                </div>
              )}
            </QuoteFinCard>

            <QuoteFinCard
              icon={Truck}
              title={t('pricing.quoteSectionInland', 'القسم 2: النقل الداخلي / Inland transport')}
              headMeta={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{t('common.enable', 'Enable')}</span>
                  {carrierToggleButton(inlandEnabled, () => setInlandEnabled((v) => !v), t('pricing.quoteInlandToggle', 'Inland transport'))}
                </div>
              }
            >
              {!inlandEnabled ? (
                isQuick ? (
                  <div className="pricing-quick-inland-empty rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/30 px-6 py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 m-0">
                      {t('pricing.quickInlandEmpty', 'No inland transport added for this quotation.')}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100"
                      onClick={() => {
                        setInlandOfferId('')
                        setInlandEnabled(true)
                      }}
                    >
                      {t('pricing.quickInlandManualBtn', 'Manual entry')}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('pricing.quoteInlandOff', 'Inland transport is not included.')}</p>
                )
              ) : isQuick ? (
                <div className="pricing-quick-section space-y-3">
                  <div className="text-sm font-bold text-amber-950 dark:text-amber-100">
                    {t('pricing.quickInlandManualHeading', 'Manual inland entry')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.port', 'Port')}</label>
                      <input
                        value={quickInlandPort}
                        onChange={(e) => setQuickInlandPort(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder={t('pricing.inlandPortPlaceholder', 'Port')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.governorate', 'Governorate')}</label>
                      <input
                        value={quickInlandGov}
                        onChange={(e) => setQuickInlandGov(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder={t('pricing.inlandGovPlaceholder', 'Governorate')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.inlandAreaField', 'Zone')}</label>
                      <input
                        value={quickInlandZone}
                        onChange={(e) => setQuickInlandZone(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder={t('pricing.inlandAreaPlaceholder', 'Zone')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.inlandVehicleTypeAria', 'Vehicle')}</label>
                      <input
                        value={quickInlandVehicle}
                        onChange={(e) => setQuickInlandVehicle(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder={t('pricing.inlandTruckRate', 'Truck')}
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      placeholder="0"
                      value={displayNumericInputValue(inlandCost)}
                      onChange={(e) => setInlandCost(e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      placeholder="0"
                      value={displayNumericInputValue(inlandSelling)}
                      onChange={(e) => setInlandSelling(e.target.value)}
                    />
                    <select
                      value={inlandCurrency}
                      onChange={(e) => setInlandCurrency(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 md:col-span-2 max-w-xs"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <div
                      className={`px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-sm font-semibold md:col-span-2 ${
                        inlandProfit >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {t('pricing.profit', 'Profit')}: {moneySymbol(inlandCurrency)} {formatPricingDecimal(inlandProfit)}
                    </div>
                  </div>
                  {showQuickInlandGenerator ? (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 mt-1 border-t border-amber-200/70 dark:border-amber-800/50">
                      <div className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                        {t('pricing.inlandGeneratorLine', 'Generator (inland)')}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder="0"
                        value={displayNumericInputValue(inlandGenCost)}
                        onChange={(e) => setInlandGenCost(e.target.value)}
                        aria-label={t('pricing.inlandGeneratorCost', 'Generator cost')}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder="0"
                        value={displayNumericInputValue(inlandGenSelling)}
                        onChange={(e) => setInlandGenSelling(e.target.value)}
                      />
                      <select
                        value={inlandGenCurrency}
                        onChange={(e) => setInlandGenCurrency(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <div
                        className={`px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-sm font-semibold ${
                          inlandGenProfit >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {t('pricing.profit', 'Profit')}: {moneySymbol(inlandGenCurrency)} {formatPricingDecimal(inlandGenProfit)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {t('pricing.inlandPriceSheet', 'Inland price sheet')}
                    </label>
                    <select
                      value={inlandOfferId}
                      onChange={(e) => setInlandOfferId(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      required={inlandEnabled}
                    >
                      <option value="">{t('pricing.selectInlandOffer', 'Select inland rate…')}</option>
                      {inlandOffers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.inland_port || '—'} → {o.destination || o.region || '—'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!inlandLineRows.length ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                      {t('pricing.inlandRowsEmpty', 'Select an inland price sheet to load pricing lines.')}
                    </p>
                  ) : (
                    <QuotePricingLinesTable
                      lines={inlandLineRows}
                      onUpdateLine={updateInlandRow}
                      readOnlyCost
                      readOnlyCurrency
                      readOnlyName
                      variant="inland"
                    />
                  )}
                </div>
              )}
            </QuoteFinCard>

            <QuoteFinCard
              icon={Package}
              title={t('pricing.quoteSectionCustoms', 'القسم 3: التخليص الجمركي / Customs clearance')}
              headMeta={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{t('common.enable', 'Enable')}</span>
                  {carrierToggleButton(customsEnabled, () => setCustomsEnabled((v) => !v), t('pricing.quoteCustomsToggle', 'Customs clearance'))}
                </div>
              }
            >
              {customsEnabled ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 px-3 py-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {t('pricing.customsCertFee', 'Customs Certificate Fee')}
                    </span>
                    {isPricing ? (
                      <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                        {formatLocaleMoney(parseNum(customsCertSelling), customsCertCurrency || 'EGP', i18n.language)}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold"
                          value={customsCertSelling}
                          onChange={(e) => setCustomsCertSelling(e.target.value)}
                        />
                        <select
                          value={customsCertCurrency}
                          onChange={(e) => setCustomsCertCurrency(e.target.value)}
                          className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        >
                          <option value="USD">USD</option>
                          <option value="EGP">EGP</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('pricing.officialReceipts', 'Official Receipts')}
                    </label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      placeholder={t('pricing.officialReceiptsPlaceholder', 'Note for the client (no charge)')}
                      value={officialReceiptsNote}
                      onChange={(e) => setOfficialReceiptsNote(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('pricing.customsExtrasTitle', 'Additional customs charges')}
                    </div>
                    {customsExtras.length > 0 ? (
                      <ul className="space-y-2 list-none m-0 p-0">
                        {customsExtras.map((row, idx) => (
                          <li
                            key={row.id}
                            className="flex flex-wrap justify-between gap-2 items-center rounded-md border border-gray-100 dark:border-gray-700 px-2 py-2"
                          >
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{row.name}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold tabular-nums">
                                {formatLocaleMoney(parseNum(row.amount), row.currency, i18n.language)}
                              </span>
                              <button
                                type="button"
                                className="text-xs font-bold text-red-600 hover:underline"
                                onClick={() => setCustomsExtras((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                {t('common.remove', 'Remove')}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[140px] space-y-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t('pricing.customsExtraName', 'Charge name')}
                        </label>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={customsExtraName}
                          onChange={(e) => setCustomsExtraName(e.target.value)}
                          placeholder={t('pricing.customsExtraNamePh', 'e.g. inspection fee')}
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t('pricing.customsExtraAmount', 'Amount')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={displayNumericInputValue(customsExtraAmount)}
                          onChange={(e) => setCustomsExtraAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t('pricing.currency', 'Cur.')}
                        </label>
                        <select
                          className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={customsExtraCurrency}
                          onChange={(e) => setCustomsExtraCurrency(e.target.value)}
                        >
                          <option value="EGP">EGP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-bold bg-white dark:bg-gray-900 shrink-0"
                        onClick={() => {
                          const name = customsExtraName.trim()
                          const amt = parseNum(customsExtraAmount)
                          if (!name || amt <= 0) return
                          setCustomsExtras((prev) => [
                            ...prev,
                            { id: `ce-${Date.now()}`, name, amount: String(amt), currency: customsExtraCurrency || 'EGP' },
                          ])
                          setCustomsExtraName('')
                          setCustomsExtraAmount('')
                          setCustomsExtraCurrency('EGP')
                        }}
                      >
                        {t('common.add', 'Add')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('pricing.quoteCustomsOff', 'Customs clearance fees are not included.')}</p>
              )}
            </QuoteFinCard>

            <QuoteFinCard icon={DollarSign} title={t('pricing.quoteSectionHandling', 'القسم 4: Handling Fees')}>
              <div className="shipment-fin-table-wrap">
                <table className="shipment-fin-line-table shipment-fin-line-table--client-invoice">
                  <thead>
                    <tr>
                      <th>{t('pricing.item', 'Item')}</th>
                      <th className="shipment-fin-num">{t('shipments.expColAmount', 'Amount')}</th>
                      <th className="shipment-fin-cur-cell">{t('pricing.currency', 'Cur.')}</th>
                      <th className="shipment-fin-actions">{t('pricing.rowActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handlingLines.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="text"
                            className="w-full min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                            value={row.name}
                            onChange={(e) => updateHandlingLine(row.id, { name: e.target.value })}
                            placeholder={t('pricing.quoteHandlingLineDefault', 'Handling Fees')}
                          />
                        </td>
                        <td className="shipment-fin-num">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm tabular-nums"
                            value={displayNumericInputValue(row.amount)}
                            onChange={(e) => updateHandlingLine(row.id, { amount: e.target.value })}
                            placeholder="0"
                          />
                        </td>
                        <td className="shipment-fin-cur-cell">
                          <div className="flex flex-wrap items-center gap-2">
                            {currencyCodePill(row.currency)}
                            <select
                              value={row.currency}
                              onChange={(e) => updateHandlingLine(row.id, { currency: e.target.value })}
                              className="text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-1.5 py-0.5"
                              aria-label={t('pricing.currency', 'Currency')}
                            >
                              {CURRENCY_OPTIONS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="shipment-fin-actions">
                          <button
                            type="button"
                            className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                            onClick={() => removeHandlingLine(row.id)}
                            aria-label={t('common.remove', 'Remove')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addHandlingLine}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <Plus className="h-4 w-4" /> {t('common.add', 'Add line')}
                </button>
                <div className="flex flex-wrap gap-2 ml-auto">
                  {sortCurrencyCodes(
                    Object.keys(handlingSellingByCurrency).filter((c) => Math.abs(handlingSellingByCurrency[c] || 0) > 1e-9)
                  ).map((cur) => (
                    <span
                      key={cur}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 px-2 py-1"
                    >
                      {currencyCodePill(cur)}
                      <span className="text-sm font-bold tabular-nums text-blue-900 dark:text-blue-100">
                        {formatLocaleMoney(handlingSellingByCurrency[cur], cur, i18n.language)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </QuoteFinCard>

            <QuoteFinCard icon={Receipt} title={t('pricing.quoteSectionSummary', 'ملخص / Summary')} subtitle={null}>
              <div className="pricing-quote-summary-block">
                <QuoteInlineStrip className="pricing-quote-summary-line">
                  <QuoteInlineItem label={t('pricing.summaryOcean', 'Ocean freight total')}>
                    <span className="font-bold tabular-nums">
                      <QuoteSummaryMoney amounts={oceanSellingByCurrency} i18n={i18n} t={t} />
                    </span>
                  </QuoteInlineItem>
                </QuoteInlineStrip>
                <QuoteInlineStrip className="pricing-quote-summary-line">
                  <QuoteInlineItem label={t('pricing.summaryInland', 'Inland transport total')}>
                    <span className="font-bold tabular-nums">
                      {!inlandEnabled ? (
                        <span>{t('common.dash')}</span>
                      ) : entryMode === 'quick' ? (
                        <>
                          {parseNum(inlandSelling) > 0 ? (
                            <span>{formatLocaleMoney(parseNum(inlandSelling), inlandCurrency, i18n.language)}</span>
                          ) : null}
                          {parseNum(inlandGenSelling) > 0 ? (
                            <>
                              {parseNum(inlandSelling) > 0 ? (
                                <span className="pricing-quote-inline-money__sep"> · </span>
                              ) : null}
                              <span>
                                {t('pricing.inlandGeneratorLine', 'Generator')}:{' '}
                                {formatLocaleMoney(
                                  parseNum(inlandGenSelling),
                                  inlandGenCurrency || inlandCurrency,
                                  i18n.language
                                )}
                              </span>
                            </>
                          ) : null}
                          {!parseNum(inlandSelling) && !parseNum(inlandGenSelling) ? (
                            <span>{t('common.dash')}</span>
                          ) : null}
                        </>
                      ) : (
                        <QuoteSummaryMoney
                          amounts={inlandNonQuickSellingByCurrency}
                          i18n={i18n}
                          t={t}
                          withPills
                        />
                      )}
                    </span>
                  </QuoteInlineItem>
                </QuoteInlineStrip>
                <QuoteInlineStrip className="pricing-quote-summary-line">
                  <QuoteInlineItem label={t('pricing.summaryCustoms', 'Customs total')}>
                    <span className="font-bold tabular-nums">
                      {!customsEnabled ? (
                        <span>{t('common.dash')}</span>
                      ) : (
                        <QuoteSummaryMoney amounts={customsSellingByCurrency} i18n={i18n} t={t} />
                      )}
                    </span>
                  </QuoteInlineItem>
                </QuoteInlineStrip>
                {officialReceiptsNote.trim() ? (
                  <QuoteInlineStrip className="pricing-quote-summary-line">
                    <QuoteInlineItem label={t('pricing.officialReceipts', 'Official Receipts')}>
                      {officialReceiptsNote.trim()}
                    </QuoteInlineItem>
                  </QuoteInlineStrip>
                ) : null}
                <QuoteInlineStrip className="pricing-quote-summary-line">
                  <QuoteInlineItem label={t('pricing.summaryHandling', 'Handling fees')}>
                    <span className="font-bold tabular-nums">
                      <QuoteSummaryMoney amounts={handlingSellingByCurrency} i18n={i18n} t={t} withPills />
                    </span>
                  </QuoteInlineItem>
                </QuoteInlineStrip>
                <QuoteInlineStrip className="pricing-quote-summary-line pricing-quote-summary-line--profit">
                  <QuoteInlineItem label={t('pricing.totalProfitQuote', 'Total profit (selling − cost)')}>
                    <span className="pricing-quote-summary-profit-values">
                    {sortedProfitKeys(quoteProfitByCurrency).every((k) => Math.abs(quoteProfitByCurrency[k]) <= 1e-9) ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                    ) : (
                      sortedProfitKeys(quoteProfitByCurrency)
                        .filter((k) => Math.abs(quoteProfitByCurrency[k]) > 1e-9)
                        .map((cur) => {
                          const amt = quoteProfitByCurrency[cur]
                          return (
                            <span
                              key={cur}
                              className={`text-base font-extrabold tabular-nums ${
                                amt >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {moneySymbol(cur)} {formatPricingDecimal(amt)}{' '}
                              <span className="text-sm font-semibold opacity-85">{cur}</span>
                            </span>
                          )
                        })
                    )}
                    </span>
                  </QuoteInlineItem>
                </QuoteInlineStrip>
                <QuoteInlineStrip className="pricing-quote-summary-line pricing-quote-summary-line--grand">
                  <QuoteInlineItem label={t('pricing.grandTotal', 'Grand total')}>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums text-base">
                      <QuoteSummaryMoney amounts={grandSellingByCurrency} i18n={i18n} t={t} />
                    </span>
                  </QuoteInlineItem>
                </QuoteInlineStrip>
              </div>
            </QuoteFinCard>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/95 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4 shadow-sm">
                <label className="text-sm font-bold text-gray-800 dark:text-gray-100 block mb-2">
                  {t('pricing.municipality', 'Municipality')}
                </label>
                <input
                  type="text"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-sm"
                  placeholder={t('pricing.municipalityPlaceholder', 'Enter municipality (if applicable)')}
                  autoComplete="address-level2"
                />
              </div>

              <div
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  pricingTeamConfirmed
                    ? 'border-emerald-400/80 bg-emerald-50/90 dark:border-emerald-700/60 dark:bg-emerald-950/30'
                    : 'border-amber-300/90 bg-amber-50/95 dark:border-amber-700/60 dark:bg-amber-950/35'
                }`}
                role="region"
                aria-label={t('pricing.pricingTeamConfirmTitle', 'Pricing team confirmation')}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
                  <div className="text-sm font-bold text-amber-950 dark:text-gray-100">
                    {t('pricing.pricingTeamConfirmTitle', 'Confirm with Pricing Team before sending')}
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wide rounded-full px-2.5 py-1 ${
                      pricingTeamConfirmed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {pricingTeamConfirmed ? t('pricing.confirmStateYes', 'Confirmed') : t('pricing.confirmStateNo', 'Not confirmed')}
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

            <QuoteFinCard icon={Calendar} title={t('pricing.quoteSectionValidityNotes', 'الصلاحية والملاحظات / Validity & notes')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.validFrom', 'Valid from')}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 disabled:opacity-70"
                    value={form.valid_from || ''}
                    onChange={(e) => setField('valid_from', e.target.value)}
                    disabled={isRouteLocked}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.validTo', 'Valid to')}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 disabled:opacity-70"
                    value={form.valid_to || ''}
                    onChange={(e) => setField('valid_to', e.target.value)}
                    disabled={isRouteLocked}
                    required={entryMode === 'manual'}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.notes', 'Notes')}</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                  />
                </div>
                {entryMode === 'quick' ? (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {t('pricing.quickQuotationNoteOptional', 'Optional note')}
                    </label>
                    <input
                      value={quickModeReason}
                      onChange={(e) => setQuickModeReason(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      placeholder={t('pricing.quickQuotationNotePlaceholder', 'Recorded on the quotation (defaults if empty)')}
                    />
                  </div>
                ) : null}
              </div>
            </QuoteFinCard>

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
            disabled={
              loading ||
              (!isQuick && !clientAsync?.value) ||
              (!isQuick && inlandEnabled && !inlandOfferId) ||
              (!isQuick && sailingSchedule && !selectedSailingDate) ||
              (entryMode === 'manual' && !String(form.valid_to || '').trim()) ||
              (isQuick && !pricingTeamConfirmed)
            }
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
