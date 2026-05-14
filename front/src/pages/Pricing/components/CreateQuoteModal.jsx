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
} from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import { getStoredToken } from '../../Login'
import { listClients } from '../../../api/clients'
import { listOffers } from '../../../api/pricing'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import '../../Shipments/Shipments.css'
import '../Pricing.css'
import { formatLocaleMoney, formatPricingDecimal, mergeCurrencyAmountMaps, sortCurrencyCodes } from '../../../utils/dateUtils'

const QUICK_SELECT_CODES = ['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER']

const INLAND_OFFER_KEYS = ['t20d', 't40d', 'p20x2', 't40r', 't40hq', 't40d', 'p40hq', 'p40rf', 'p20x1']

const ADMIN_CUSTOMS_CERT_AMOUNT = 150
const ADMIN_CUSTOMS_CERT_CURRENCY = 'USD'
const ADMIN_HANDLING_FEE_AMOUNT = 50
const ADMIN_HANDLING_FEE_CURRENCY = 'USD'

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

function mapOfferPricingToOceanLines(offer, resolveQuoteName) {
  const pricing = offer?.pricing || {}
  const rows = []
  Object.entries(pricing).forEach(([sourceCode, item]) => {
    const price = item?.price
    if (price == null || price === '') return
    const qCode = normalizeOfferCodeToQuoteCode(sourceCode)
    const cost = Number(price) || 0
    const currency = item?.currency || 'USD'
    rows.push({
      sourceKey: sourceCode,
      code: qCode,
      name: resolveQuoteName(qCode),
      description: '',
      cost_amount: cost,
      selling_amount: cost ? String(cost) : '',
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

function primaryInlandCostFromOffer(offer) {
  const p = offer?.pricing || {}
  let truck = { amount: 0, currency: 'EGP', key: null }
  for (const k of INLAND_OFFER_KEYS) {
    const row = p[k]
    if (row != null && row.price != null && row.price !== '') {
      truck = { amount: Number(row.price) || 0, currency: row.currency || 'EGP', key: k }
      break
    }
  }
  const gen = p.generator
  const generator =
    gen && gen.price != null && gen.price !== ''
      ? { amount: Number(gen.price) || 0, currency: gen.currency || truck.currency || 'EGP' }
      : null
  return { ...truck, generator }
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

function QuoteFinCard({ icon: Icon, title, subtitle, headMeta = null, children }) {
  return (
    <div className="shipment-fin-card">
      <div className="shipment-fin-card__head" role="group" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="shipment-fin-card__head-main">
          <Icon className="shipment-fin-card__icon" aria-hidden />
          <div>
            <div className="shipment-fin-card__title">{title}</div>
            {subtitle ? <div className="shipment-fin-card__sub">{subtitle}</div> : null}
          </div>
        </div>
        {headMeta != null && headMeta !== false ? (
          <div className="shipment-fin-card__head-meta">{headMeta}</div>
        ) : null}
      </div>
      {children != null ? <div className="shipment-fin-card__body">{children}</div> : null}
    </div>
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

  const [form, setForm] = useState({
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
  })

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

  const [customsEnabled, setCustomsEnabled] = useState(false)
  const [customsExtras, setCustomsExtras] = useState([])
  const [customsExtraName, setCustomsExtraName] = useState('')
  const [customsExtraAmount, setCustomsExtraAmount] = useState('')
  const [customsExtraCurrency, setCustomsExtraCurrency] = useState('EGP')
  const [customsCertSelling, setCustomsCertSelling] = useState(String(ADMIN_CUSTOMS_CERT_AMOUNT))
  const [customsCertCurrency, setCustomsCertCurrency] = useState('USD')
  const [officialReceiptsNote, setOfficialReceiptsNote] = useState('')

  const [handlingFees, setHandlingFees] = useState(String(ADMIN_HANDLING_FEE_AMOUNT))
  const [handlingCurrency, setHandlingCurrency] = useState('USD')

  const [showCarrierOnPdf, setShowCarrierOnPdf] = useState(true)
  const [quickModeReason, setQuickModeReason] = useState('')
  const [pricingTeamConfirmed, setPricingTeamConfirmed] = useState(false)

  const [quickInlandPort, setQuickInlandPort] = useState('')
  const [quickInlandGov, setQuickInlandGov] = useState('')
  const [quickInlandZone, setQuickInlandZone] = useState('')
  const [quickInlandVehicle, setQuickInlandVehicle] = useState('')

  const [clients, setClients] = useState([])
  const [clientQuery, setClientQuery] = useState('')

  const applySeaOffer = useCallback(
    (offer) => {
      if (!offer) return
      const lines = mapOfferPricingToOceanLines(offer, quoteCodeLabel)
      setOceanLines(lines.length ? lines : [])
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
        sailing_dates: Array.isArray(offer.sailing_dates) ? [...offer.sailing_dates] : [],
        notes: offer.notes || '',
      }))
    },
    [quoteCodeLabel]
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
    const token = getStoredToken()
    if (!token) return
    listClients(token, { q: clientQuery, per_page: 50, page: 1 })
      .then((res) => setClients(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setClients([]))
  }, [isOpen, clientQuery])

  useEffect(() => {
    if (!isOpen) return
    setOfficialReceiptsNote('')
    setQuickModeReason('')
    setPricingTeamConfirmed(false)
    setInlandEnabled(false)
    setInlandOfferId('')
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
    setCustomsCertSelling(String(ADMIN_CUSTOMS_CERT_AMOUNT))
    setCustomsCertCurrency('USD')
    setShowCarrierOnPdf(true)
    setQuickInlandPort('')
    setQuickInlandGov('')
    setQuickInlandZone('')
    setQuickInlandVehicle('')
    const mode = initialOffer ? 'pricing' : initialQuickMode ? 'quick' : 'manual'
    if (mode === 'pricing' && initialOffer) {
      setHandlingFees('')
      setHandlingCurrency(ADMIN_HANDLING_FEE_CURRENCY)
      applySeaOffer(initialOffer)
    } else {
      setHandlingFees(String(ADMIN_HANDLING_FEE_AMOUNT))
      setHandlingCurrency('USD')
      setForm({
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
      })
      setOceanLines(mode === 'quick' ? makeQuickOceanLines() : makeStarterOceanLines())
    }
  }, [isOpen, initialOffer, initialQuickMode, makeStarterOceanLines, makeQuickOceanLines, applySeaOffer])

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
    if (!inlandEnabled || !selectedInlandOffer) return
    const row = primaryInlandCostFromOffer(selectedInlandOffer)
    setInlandCost(String(row.amount))
    setInlandSelling(String(row.amount))
    setInlandCurrency(row.currency)
    if (row.generator && row.generator.amount > 0) {
      setInlandGenCost(String(row.generator.amount))
      setInlandGenSelling(String(row.generator.amount))
      setInlandGenCurrency(row.generator.currency || row.currency)
    } else {
      setInlandGenCost('')
      setInlandGenSelling('')
      setInlandGenCurrency(row.currency || 'EGP')
    }
  }, [inlandEnabled, selectedInlandOffer])

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

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

  const isPricing = entryMode === 'pricing'
  const isQuick = entryMode === 'quick'
  const isRouteLocked = isPricing && Boolean(form.pricing_offer_id && (selectedSeaOffer || initialOffer))
  const routeDisplayOffer = selectedSeaOffer || (initialOffer && String(initialOffer.id) === String(form.pricing_offer_id) ? initialOffer : null)

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
    const base =
      isPricing
        ? { [ADMIN_CUSTOMS_CERT_CURRENCY]: ADMIN_CUSTOMS_CERT_AMOUNT }
        : (() => {
            const n = parseNum(customsCertSelling)
            if (!n) return {}
            const c = customsCertCurrency || 'USD'
            return { [c]: n }
          })()
    return mergeCurrencyAmountMaps(base, customsExtrasByCurrency)
  }, [customsEnabled, isPricing, customsCertSelling, customsCertCurrency, customsExtrasByCurrency])

  const inlandProfit = useMemo(() => parseNum(inlandSelling) - parseNum(inlandCost), [inlandSelling, inlandCost])

  const inlandGenProfit = useMemo(
    () => parseNum(inlandGenSelling) - parseNum(inlandGenCost),
    [inlandGenSelling, inlandGenCost]
  )

  const pricingLinesProfitByCurrency = useMemo(() => sumProfitsByCurrency(oceanLines), [oceanLines])

  const quoteProfitByCurrency = useMemo(() => {
    const map = { ...pricingLinesProfitByCurrency }
    if (inlandEnabled && parseNum(inlandSelling) > 0) {
      const c = inlandCurrency || 'EGP'
      map[c] = (map[c] || 0) + inlandProfit
    }
    if (inlandEnabled && parseNum(inlandGenSelling) > 0) {
      const c = inlandGenCurrency || inlandCurrency || 'EGP'
      map[c] = (map[c] || 0) + inlandGenProfit
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
    inlandCurrency,
    inlandProfit,
    inlandSelling,
    inlandGenSelling,
    inlandGenCost,
    inlandGenCurrency,
    inlandGenProfit,
    customsEnabled,
    customsExtras,
  ])

  const handlingTotal = useMemo(() => {
    if (isPricing) return ADMIN_HANDLING_FEE_AMOUNT
    return parseNum(handlingFees)
  }, [isPricing, handlingFees])

  const handlingCurrencyResolved = isPricing ? ADMIN_HANDLING_FEE_CURRENCY : handlingCurrency || 'USD'

  const grandSellingByCurrency = useMemo(() => {
    const inlandPart =
      !inlandEnabled || parseNum(inlandSelling) === 0
        ? {}
        : { [inlandCurrency || 'EGP']: parseNum(inlandSelling) }
    const inlandGenPart =
      !inlandEnabled || parseNum(inlandGenSelling) <= 0
        ? {}
        : { [inlandGenCurrency || inlandCurrency || 'EGP']: parseNum(inlandGenSelling) }
    const handlingPart = handlingTotal > 0 ? { [handlingCurrencyResolved]: handlingTotal } : {}
    return mergeCurrencyAmountMaps(
      oceanSellingByCurrency,
      customsSellingByCurrency,
      inlandPart,
      inlandGenPart,
      handlingPart
    )
  }, [
    oceanSellingByCurrency,
    customsSellingByCurrency,
    inlandEnabled,
    inlandSelling,
    inlandCurrency,
    inlandGenSelling,
    inlandGenCurrency,
    handlingTotal,
    handlingCurrencyResolved,
  ])

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === String(form.client_id)) || null,
    [clients, form.client_id]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    const salesUserId = user?.id ? Number(user.id) : null
    const isQuickSubmit = entryMode === 'quick'
    if (inlandEnabled && !isQuickSubmit && !inlandOfferId) return
    if (entryMode === 'manual' && !String(form.valid_to || '').trim()) return
    if (isQuickSubmit && !pricingTeamConfirmed) return

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
        name: line.code === 'OTHER' ? (line.name || '').trim() || quoteCodeLabel('OTHER') : line.name || quoteCodeLabel(line.code),
        description: descTrim || null,
        amount: sell,
        currency: line.currency || 'USD',
        cost_amount: costAmountForLine(line),
        visible_to_client: true,
      })
    })

    if (inlandEnabled && parseNum(inlandSelling) > 0) {
      items.push({
        code: 'INLAND',
        name: t('pricing.inlandTransport', 'Inland Transport'),
        description: isQuickSubmit ? quickInlandDescription() : inlandOfferId ? `inland_offer_id=${inlandOfferId}` : null,
        amount: parseNum(inlandSelling),
        currency: inlandCurrency || 'EGP',
        cost_amount: parseNum(inlandCost) > 0 ? parseNum(inlandCost) : null,
        visible_to_client: true,
      })
    }

    if (inlandEnabled && parseNum(inlandGenSelling) > 0) {
      const baseDesc = isQuickSubmit ? quickInlandDescription() : inlandOfferId ? `inland_offer_id=${inlandOfferId}` : null
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
      const amt = isPricing ? ADMIN_CUSTOMS_CERT_AMOUNT : parseNum(customsCertSelling)
      const cur = isPricing ? ADMIN_CUSTOMS_CERT_CURRENCY : customsCertCurrency || 'USD'
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

    if (handlingTotal > 0) {
      items.push({
        code: 'HANDLING',
        name: t('pricing.handlingFees', 'Handling fees'),
        description: null,
        amount: handlingTotal,
        currency: handlingCurrencyResolved,
        cost_amount: null,
        visible_to_client: true,
      })
    }

    if (!items.length) return

    const payload = {
      ...form,
      client_id: form.client_id ? Number(form.client_id) : null,
      sales_user_id: salesUserId,
      pricing_offer_id: isQuickSubmit ? null : form.pricing_offer_id ? Number(form.pricing_offer_id) : null,
      quick_mode: isQuickSubmit,
      is_quick_quotation: isQuickSubmit,
      quick_mode_reason: isQuickSubmit ? (quickModeReason.trim() || 'Quick Quotation') : null,
      qty: form.qty ? Number(form.qty) : null,
      sailing_dates: (form.sailing_dates || []).filter(Boolean),
      schedule_type: 'fixed',
      container_spec: {
        type: String(form.container_type || '').toLowerCase().includes('reefer') ? 'reefer' : 'dry',
        size: String(form.container_type || '').includes('20') ? '20' : '40',
        height: String(form.container_type || '').toLowerCase().includes('hq') ? 'hq' : 'standard',
      },
      free_time_data: null,
      show_carrier_on_pdf: showCarrierOnPdf,
      official_receipts_note: officialReceiptsNote.trim() || null,
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
    isQuick && inlandEnabled && String(form.container_type || '').toLowerCase().includes('reefer')

  const headerSub =
    entryMode === 'pricing'
      ? t('pricing.createQuoteFromPricingSub', 'Linked price sheet — route read-only; choose charges to include.')
      : entryMode === 'quick'
        ? t(
            'pricing.createQuoteQuickSub',
            'Manual numbers only — confirm with Pricing Team before saving. Valid-to date is optional.'
          )
        : t('pricing.createQuoteManualSub', 'Manual entry — optional price sheet; full route and pricing control.')

  const seaSheetSubtitle = t('pricing.quoteSourceSeaOfferSubUnified', 'Optional unless opened from a price sheet.')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <h2 className="text-xl font-bold">
                {isQuick ? t('pricing.createQuickQuotation', 'Quick quotation') : t('pricing.createQuote', 'Create Quotation')}
              </h2>
              {isQuick ? (
                <span className="pricing-quick-badge shrink-0">{t('pricing.quickModeBadgeShort', 'Quick Mode')}</span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{headerSub}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="pricing-quote-modal__body flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">{error}</div>
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
            <QuoteFinCard
              icon={User}
              title={t('pricing.quoteSectionClient', 'Client info')}
              subtitle={t('pricing.quoteSectionClientSub', 'Select the client for this quotation.')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.client', 'Client')}</label>
                  <input
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                    placeholder={t('pricing.searchClient', 'Search client...')}
                  />
                  <select
                    value={form.client_id}
                    onChange={(e) => setField('client_id', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                    required
                  >
                    <option value="">{t('common.select', 'Select')}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c.name || c.company_name) + (c.company_name && c.name ? ` - ${c.company_name}` : '')}
                      </option>
                    ))}
                  </select>
                  {user?.name ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('pricing.salespersonAuto', 'Salesperson')}:{' '}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{user.name}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </QuoteFinCard>

            {!isQuick ? (
              <QuoteFinCard
                icon={Ship}
                title={t('pricing.quoteSourceSeaOffer', 'Sea price sheet')}
                subtitle={isPricing ? t('pricing.quoteSourceLockedSub', 'Locked to this price sheet.') : seaSheetSubtitle}
              >
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">{t('pricing.offerSeaRate')}</label>
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
              </QuoteFinCard>
            ) : null}

            <QuoteFinCard
              icon={MapPin}
              title={t('pricing.quoteSectionRoute', 'Route summary')}
              subtitle={
                isRouteLocked
                  ? t('pricing.quoteRouteReadOnly', 'Read-only from price sheet.')
                  : isQuick
                    ? t('pricing.quickRouteManualLabel', 'Enter route details manually')
                    : t('pricing.quoteRouteEditable', 'Edit shipment route details.')
              }
              headMeta={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {t('pricing.showShippingLine', 'Carrier on PDF')}
                  </span>
                  {carrierToggleButton(showCarrierOnPdf, () => setShowCarrierOnPdf((v) => !v), t('pricing.showShippingLine', 'Carrier on PDF'))}
                </div>
              }
            >
              {isRouteLocked ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.detailRoute', 'Route')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {routeDisplayOffer?.pol || form.pol || '—'} → {routeDisplayOffer?.pod || routeDisplayOffer?.region || form.pod || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.detailCarrier', 'Carrier')}</span>
                    <p
                      className={`font-semibold ${showCarrierOnPdf ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}
                    >
                      {showCarrierOnPdf
                        ? routeDisplayOffer?.shipping_line || form.shipping_line || '—'
                        : t('pricing.shippingLineHiddenPreview', 'Hidden from client')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.filterContainerType', 'Container')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {routeDisplayOffer ? inferContainerFromOffer(routeDisplayOffer) : form.container_type || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.transitTime', 'Transit')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{routeDisplayOffer?.transit_time || form.transit_time || '—'}</p>
                  </div>
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
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.shippingLine', 'Carrier')}</label>
                      <ShippingLineNameAsyncSelect
                        serviceScope="ocean"
                        value={form.shipping_line}
                        onChange={(v) => setField('shipping_line', v)}
                        placeholder={t('pricing.filterAllShippingLines', 'Carrier')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.containerType', 'Container')}</label>
                      <input
                        value={form.container_type}
                        onChange={(e) => setField('container_type', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.transitTime', 'Transit')}</label>
                      <input
                        value={form.transit_time}
                        onChange={(e) => setField('transit_time', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
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

            <QuoteFinCard
              icon={DollarSign}
              title={t('pricing.quoteSectionPricing', 'Pricing breakdown')}
              subtitle={
                isPricing
                  ? t('pricing.quotePricingSelectableSub', 'Include or exclude each charge; adjust selling where needed.')
                  : isQuick
                    ? t('pricing.quickOceanManualHint', 'Enter cost and selling for each line manually.')
                    : t('pricing.quotePricingEditableSub', 'Add lines, set cost and selling, and include or exclude each charge.')
              }
            >
              {oceanLines.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                  {t('pricing.quoteNoPricedLines', 'No line items yet. Add a row or link a sea price sheet.')}
                </p>
              ) : (
                <div className="space-y-3">
                  {isQuick ? (
                    <div className="pricing-quick-ocean-hint text-[11px] font-semibold text-amber-900/90 dark:text-amber-100/95 rounded-lg px-3 py-2 border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/95 dark:bg-amber-950/40">
                      {t('pricing.quickOceanManualHint', 'Enter cost and selling for each line manually.')}
                    </div>
                  ) : null}
                  <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-bold uppercase text-gray-500 px-1">
                    <span className="md:col-span-1">{t('pricing.include', 'Incl.')}</span>
                    <span className="md:col-span-2">{t('pricing.item', 'Item')}</span>
                    <span className="md:col-span-2">{t('pricing.cost', 'Cost')}</span>
                    <span className="md:col-span-2">{t('pricing.sellingPrice', 'Selling')}</span>
                    <span className="md:col-span-2">{t('pricing.profit', 'Profit')}</span>
                    <span className="md:col-span-1">{t('pricing.currency', 'Cur.')}</span>
                    <span className="md:col-span-2">{t('pricing.rowActions', 'Actions')}</span>
                  </div>
                  {oceanLines.map((line, idx) => {
                    const included = line.included !== false
                    const profit = parseNum(line.selling_amount) - parseNum(line.cost_amount)
                    const costReadOnly = isPricing
                    return (
                      <div
                        key={line.sourceKey || `line-${idx}`}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-2 items-start rounded-lg border p-3 ${
                          included
                            ? 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30'
                            : 'border-gray-200/60 dark:border-gray-700/50 bg-gray-100/40 dark:bg-gray-900/20 opacity-70'
                        }`}
                      >
                        <label className="md:col-span-1 flex items-center gap-2 cursor-pointer pt-2">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 dark:border-gray-600"
                            checked={included}
                            onChange={(e) => updateOceanLine(idx, { included: e.target.checked })}
                            aria-label={t('pricing.includeLine', 'Include in quotation')}
                          />
                        </label>
                        <div className="md:col-span-2 space-y-1">
                          {isPricing ? (
                            <div className="font-medium text-sm text-gray-900 dark:text-white pt-2">{line.name}</div>
                          ) : (
                            <select
                              className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                              value={line.code}
                              onChange={(e) => {
                                const code = e.target.value
                                updateOceanLine(idx, {
                                  code,
                                  name: code === 'OTHER' ? line.name || '' : quoteCodeLabel(code),
                                })
                              }}
                            >
                              {QUICK_SELECT_CODES.map((code) => (
                                <option key={code} value={code}>
                                  {quoteCodeLabel(code)}
                                </option>
                              ))}
                              <option value="OTHER">{t('pricing.otherCharge', 'Other')}</option>
                            </select>
                          )}
                          {!isPricing && line.code === 'OTHER' ? (
                            <input
                              className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                              placeholder={t('pricing.itemName', 'Item name')}
                              value={line.name || ''}
                              onChange={(e) => updateOceanLine(idx, { name: e.target.value })}
                            />
                          ) : null}
                        </div>
                        <input
                          type="number"
                          readOnly={costReadOnly}
                          className={`md:col-span-2 px-3 py-2 rounded-lg border text-sm ${
                            costReadOnly
                              ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                          }`}
                          value={line.cost_amount}
                          onChange={(e) => {
                            if (costReadOnly) return
                            updateOceanLine(idx, { cost_amount: e.target.value })
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!included}
                          className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm disabled:opacity-50"
                          value={line.selling_amount}
                          onChange={(e) => updateOceanLine(idx, { selling_amount: e.target.value })}
                        />
                        <div
                          className={`md:col-span-2 text-sm font-semibold tabular-nums pt-2 ${
                            profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {moneySymbol(line.currency)} {formatPricingDecimal(profit)}
                        </div>
                        <select
                          className="md:col-span-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={line.currency}
                          disabled={isPricing}
                          onChange={(e) => updateOceanLine(idx, { currency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="EGP">EGP</option>
                          <option value="EUR">EUR</option>
                        </select>
                        <div className="md:col-span-2 flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={isPricing || (isQuick && line.quickCore)}
                            onClick={() => removeOceanLine(idx)}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                            aria-label={t('common.remove', 'Remove')}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/40 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 mb-2">
                      {t('pricing.totalLineProfit', 'Total profit (pricing lines)')}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {sortedProfitKeys(pricingLinesProfitByCurrency).every((k) => Math.abs(pricingLinesProfitByCurrency[k]) <= 1e-9) ? (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      ) : (
                        sortedProfitKeys(pricingLinesProfitByCurrency)
                          .filter((k) => Math.abs(pricingLinesProfitByCurrency[k]) > 1e-9)
                          .map((cur) => {
                            const amt = pricingLinesProfitByCurrency[cur]
                            return (
                              <span
                                key={cur}
                                className={`text-sm font-bold tabular-nums ${
                                  amt >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {moneySymbol(cur)} {formatPricingDecimal(amt)}{' '}
                                <span className="text-xs font-normal opacity-80">{cur}</span>
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
              title={t('pricing.quoteSectionInland', 'Inland transport')}
              subtitle={t('pricing.quoteOptionalSection', 'Optional')}
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
                      placeholder={t('pricing.cost', 'Cost')}
                      value={inlandCost}
                      onChange={(e) => setInlandCost(e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      placeholder={t('pricing.sellingPrice', 'Selling')}
                      value={inlandSelling}
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
                        placeholder={t('pricing.cost', 'Cost')}
                        value={inlandGenCost}
                        onChange={(e) => setInlandGenCost(e.target.value)}
                        aria-label={t('pricing.inlandGeneratorCost', 'Generator cost')}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder={t('pricing.sellingPrice', 'Selling')}
                        value={inlandGenSelling}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={inlandOfferId}
                    onChange={(e) => setInlandOfferId(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 md:col-span-2"
                    required={inlandEnabled}
                  >
                    <option value="">{t('pricing.selectInlandOffer', 'Select inland rate…')}</option>
                    {inlandOffers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.inland_port || '—'} → {o.destination || o.region || '—'}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    readOnly
                    className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
                    placeholder={t('pricing.cost', 'Cost')}
                    value={inlandCost}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    placeholder={t('pricing.sellingPrice', 'Selling')}
                    value={inlandSelling}
                    onChange={(e) => setInlandSelling(e.target.value)}
                  />
                  <select
                    value={inlandCurrency}
                    onChange={(e) => setInlandCurrency(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <div
                    className={`px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-sm font-semibold ${
                      inlandProfit >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {t('pricing.profit', 'Profit')}: {moneySymbol(inlandCurrency)} {formatPricingDecimal(inlandProfit)}
                  </div>
                  {parseNum(inlandGenCost) > 0 ? (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 mt-1 border-t border-gray-200 dark:border-gray-600">
                      <div className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('pricing.inlandGeneratorLine', 'Generator (inland)')}
                      </div>
                      <input
                        type="number"
                        readOnly
                        className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
                        placeholder={t('pricing.cost', 'Cost')}
                        value={inlandGenCost}
                        aria-label={t('pricing.inlandGeneratorCost', 'Generator cost')}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder={t('pricing.sellingPrice', 'Selling')}
                        value={inlandGenSelling}
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
              )}
            </QuoteFinCard>

            <QuoteFinCard
              icon={Package}
              title={t('pricing.quoteSectionCustoms', 'Customs clearance')}
              subtitle={t('pricing.quoteOptionalSection', 'Optional')}
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
                        {formatLocaleMoney(ADMIN_CUSTOMS_CERT_AMOUNT, ADMIN_CUSTOMS_CERT_CURRENCY, i18n.language)}
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
                          value={customsExtraAmount}
                          onChange={(e) => setCustomsExtraAmount(e.target.value)}
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

            <QuoteFinCard
              icon={DollarSign}
              title={t('pricing.handlingFees', 'Handling fees')}
              subtitle={
                isPricing
                  ? t('pricing.quoteHandlingFixedSub', 'Fixed admin rate — included in grand total.')
                  : t('pricing.quoteHandlingEditableSub', 'Set handling charge — included in grand total.')
              }
            >
              {isPricing ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/25 px-3 py-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('pricing.summaryHandling', 'Handling fees')}</span>
                  <span className="text-base font-extrabold tabular-nums text-blue-700 dark:text-blue-300">
                    {formatLocaleMoney(ADMIN_HANDLING_FEE_AMOUNT, ADMIN_HANDLING_FEE_CURRENCY, i18n.language)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 items-center rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/25 px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-32 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold tabular-nums"
                    value={handlingFees}
                    onChange={(e) => setHandlingFees(e.target.value)}
                    aria-label={t('pricing.handlingFees', 'Handling fees')}
                  />
                  <select
                    value={handlingCurrency}
                    onChange={(e) => setHandlingCurrency(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold"
                  >
                    <option value="USD">USD</option>
                    <option value="EGP">EGP</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <span className="text-sm font-bold tabular-nums text-blue-800 dark:text-blue-200">
                    = {formatLocaleMoney(handlingTotal, handlingCurrencyResolved, i18n.language)}
                  </span>
                </div>
              )}
            </QuoteFinCard>

            <QuoteFinCard icon={Receipt} title={t('pricing.quoteSectionSummary', 'Summary')} subtitle={null}>
              <div className="space-y-3">
                <div className="flex justify-between gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-600 dark:text-gray-400 shrink-0">{t('pricing.summaryOcean', 'Ocean freight total')}</span>
                  <div className="flex flex-col items-end gap-0.5 font-bold tabular-nums text-right">
                    {(() => {
                      const keys = sortCurrencyCodes(
                        Object.keys(oceanSellingByCurrency).filter((c) => Math.abs(oceanSellingByCurrency[c] || 0) > 1e-9)
                      )
                      if (!keys.length) return <span>{t('common.dash')}</span>
                      return keys.map((cur) => (
                        <span key={cur}>{formatLocaleMoney(oceanSellingByCurrency[cur], cur, i18n.language)}</span>
                      ))
                    })()}
                  </div>
                </div>
                <div className="flex justify-between gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-600 dark:text-gray-400 shrink-0">{t('pricing.summaryInland', 'Inland transport total')}</span>
                  <div className="flex flex-col items-end gap-0.5 font-bold tabular-nums text-right">
                    {!inlandEnabled ? (
                      <span>{t('common.dash')}</span>
                    ) : (
                      <>
                        {parseNum(inlandSelling) > 0 ? (
                          <span>{formatLocaleMoney(parseNum(inlandSelling), inlandCurrency, i18n.language)}</span>
                        ) : null}
                        {parseNum(inlandGenSelling) > 0 ? (
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            + {t('pricing.inlandGeneratorLine', 'Generator')}:{' '}
                            {formatLocaleMoney(parseNum(inlandGenSelling), inlandGenCurrency || inlandCurrency, i18n.language)}
                          </span>
                        ) : null}
                        {!parseNum(inlandSelling) && !parseNum(inlandGenSelling) ? <span>{t('common.dash')}</span> : null}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-600 dark:text-gray-400 shrink-0">{t('pricing.summaryCustoms', 'Customs total')}</span>
                  <div className="flex flex-col items-end gap-0.5 font-bold tabular-nums text-right">
                    {!customsEnabled ? (
                      <span>{t('common.dash')}</span>
                    ) : (
                      (() => {
                        const keys = sortCurrencyCodes(
                          Object.keys(customsSellingByCurrency).filter((c) => Math.abs(customsSellingByCurrency[c] || 0) > 1e-9)
                        )
                        if (!keys.length) return <span>{t('common.dash')}</span>
                        return keys.map((cur) => (
                          <span key={cur}>{formatLocaleMoney(customsSellingByCurrency[cur], cur, i18n.language)}</span>
                        ))
                      })()
                    )}
                  </div>
                </div>
                {officialReceiptsNote.trim() ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/40 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{t('pricing.officialReceipts', 'Official Receipts')}</span>
                    <span className="mx-1">·</span>
                    {officialReceiptsNote.trim()}
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-600 dark:text-gray-400 shrink-0">{t('pricing.summaryHandling', 'Handling fees')}</span>
                  <span className="font-bold tabular-nums text-right">
                    {formatLocaleMoney(handlingTotal, handlingCurrencyResolved, i18n.language)}
                  </span>
                </div>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/45 bg-emerald-50/85 dark:bg-emerald-950/30 p-4 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    {t('pricing.totalProfitQuote', 'Total profit (selling − cost)')}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
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
                  </div>
                </div>
                <div className="flex justify-between items-start gap-4 pt-2 text-base">
                  <span className="font-bold text-gray-900 dark:text-white shrink-0">{t('pricing.grandTotal', 'Grand total')}</span>
                  <div className="flex flex-col items-end gap-1 font-extrabold text-blue-600 dark:text-blue-400 tabular-nums text-right">
                    {(() => {
                      const keys = sortCurrencyCodes(
                        Object.keys(grandSellingByCurrency).filter((c) => Math.abs(grandSellingByCurrency[c] || 0) > 1e-9)
                      )
                      if (!keys.length) {
                        return <span className="text-gray-500 dark:text-gray-400 font-bold">{t('common.dash')}</span>
                      }
                      return keys.map((cur) => (
                        <span key={cur} className="text-xl tabular-nums">
                          {formatLocaleMoney(grandSellingByCurrency[cur], cur, i18n.language)}
                        </span>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </QuoteFinCard>

            <div
              className="rounded-xl border border-amber-300/90 bg-amber-50/95 dark:bg-amber-950/35 dark:border-amber-700/60 p-4 space-y-3"
              role="region"
              aria-label={t('pricing.pricingTeamConfirmTitle', 'Pricing team confirmation')}
            >
              <div className="text-sm font-bold text-amber-950 dark:text-amber-100">
                {t('pricing.pricingTeamConfirmTitle', 'Confirm with Pricing Team before sending')}
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

            <QuoteFinCard
              icon={Calendar}
              title={t('pricing.quoteSectionValidityNotes', 'Validity & notes')}
              subtitle={t('pricing.quoteValidityNotesSub', 'Quote validity and internal or client-facing notes.')}
            >
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

            {selectedClient ? (
              <p className="text-xs text-gray-500">
                {t('pricing.selectedClient', 'Selected client')}: {selectedClient.name || selectedClient.company_name}
              </p>
            ) : null}
          </form>
        </div>

        <div className="pricing-quote-modal__actions px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            form="quoteForm"
            disabled={
              loading ||
              (!isQuick && inlandEnabled && !inlandOfferId) ||
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
    </div>
  )
}
