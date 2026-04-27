import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import { getStoredToken } from '../../Login'
import { listClients } from '../../../api/clients'
import { listOffers } from '../../../api/pricing'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import StructuredDatePicker from '../../../components/StructuredDatePicker'
import '../Pricing.css'
import { formatLocaleMoney, mergeCurrencyAmountMaps, sortCurrencyCodes } from '../../../utils/dateUtils'

const QUICK_SELECT_CODES = ['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER']

/** Aligns with PricingCard inland keys — pick first priced line as default cost */
const INLAND_OFFER_KEYS = ['t20d', 't40d', 'p20x2', 't40r', 't40hq', 't40d', 'p40hq', 'p40rf', 'p20x1']

const DEFAULT_CUSTOMS_CERT_SELLING = '150'
const DEFAULT_HANDLING = ''

const WEEK_DAYS_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

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

/** Build editable ocean rows from selected sea offer */
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
    })
  })
  return rows
}

function inferContainerFromOffer(offer) {
  const notes = String(offer?.notes || '')
  const specMatch = notes.match(/Container Specification:\s*([^\n]+)/i)
  if (specMatch?.[1]) return specMatch[1].trim()
  if (offer?.pricing?.of40rf || offer?.pricing?.thcRf || offer?.pricing?.powerDay) return '40 Reefer'
  return '40HQ Dry'
}

function formatOfferSailing(offer, locale = 'en') {
  if (!offer) return '—'
  const w = offer.weekly_sailing_days
  if (w && String(w).trim()) {
    const parts = String(w)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) {
      return parts.sort((a, b) => WEEK_DAYS_ORDER.indexOf(a) - WEEK_DAYS_ORDER.indexOf(b)).join(', ')
    }
  }
  const dates = offer.sailing_dates
  if (Array.isArray(dates) && dates.length) {
    return dates
      .map((d) => {
        try {
          return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short' })
        } catch {
          return String(d)
        }
      })
      .join(locale === 'ar' ? ' ، ' : ', ')
  }
  return '—'
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
  for (const k of INLAND_OFFER_KEYS) {
    const row = p[k]
    if (row != null && row.price != null && row.price !== '') {
      return { amount: Number(row.price) || 0, currency: row.currency || 'EGP', key: k }
    }
  }
  return { amount: 0, currency: 'EGP', key: null }
}

function parseNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function sumLineSellingByCurrency(lines) {
  const m = {}
  if (!Array.isArray(lines)) return m
  for (const line of lines) {
    const cur = line.currency || 'USD'
    const n = parseNum(line.selling_amount)
    if (n === 0) continue
    m[cur] = (m[cur] || 0) + n
  }
  return m
}

/** Sums (selling − cost) per currency for quote line rows */
function sumProfitsByCurrency(lines) {
  const map = {}
  if (!Array.isArray(lines)) return map
  for (const line of lines) {
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

export default function CreateQuoteModal({
  isOpen,
  onClose,
  onSuccess,
  initialOffer = null,
  initialQuickMode = false,
}) {
  const { t, i18n } = useTranslation()
  const numberLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US'

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
  const [quickMode, setQuickMode] = useState(false)
  const [quickModeReason, setQuickModeReason] = useState('')

  const [seaOffers, setSeaOffers] = useState([])
  const [inlandOffers, setInlandOffers] = useState([])

  const [inlandMode, setInlandMode] = useState('none')
  const [inlandOfferId, setInlandOfferId] = useState('')
  const [inlandCost, setInlandCost] = useState('')
  const [inlandSelling, setInlandSelling] = useState('')
  const [inlandCurrency, setInlandCurrency] = useState('EGP')

  const [customsCertSelling, setCustomsCertSelling] = useState(DEFAULT_CUSTOMS_CERT_SELLING)
  const [customsCertCurrency, setCustomsCertCurrency] = useState('USD')
  const [officialReceiptsNote, setOfficialReceiptsNote] = useState('')
  const [customsExtra, setCustomsExtra] = useState([])

  const [handlingFees, setHandlingFees] = useState(DEFAULT_HANDLING)
  const [handlingCurrency, setHandlingCurrency] = useState('USD')

  const [showCarrierOnPdf, setShowCarrierOnPdf] = useState(true)

  const [quickLines, setQuickLines] = useState([
    { code: 'OF', name: '', cost_amount: '', selling_amount: '', currency: 'USD' },
    { code: 'THC', name: '', cost_amount: '', selling_amount: '', currency: 'USD' },
  ])

  const [clients, setClients] = useState([])
  const [clientQuery, setClientQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setQuickMode(Boolean(initialQuickMode))
    if (!initialQuickMode) setQuickModeReason('')
    setShowCarrierOnPdf(true)
  }, [isOpen, initialQuickMode])

  useEffect(() => {
    if (!isOpen) return
    setQuickLines((prev) =>
      prev.map((line) =>
        line.code === 'OTHER' ? line : { ...line, name: quoteCodeLabel(line.code) }
      )
    )
  }, [isOpen, i18n.language, quoteCodeLabel])

  const applySeaOffer = useCallback((offer) => {
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
  }, [quoteCodeLabel])

  useEffect(() => {
    if (!isOpen) return
    if (!initialOffer) return
    applySeaOffer(initialOffer)
  }, [isOpen, initialOffer, applySeaOffer])

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
    setCustomsCertSelling(DEFAULT_CUSTOMS_CERT_SELLING)
    setCustomsCertCurrency('USD')
    setOfficialReceiptsNote('')
    setCustomsExtra([])
    setHandlingFees(DEFAULT_HANDLING)
    setHandlingCurrency('USD')
    setInlandMode('none')
    setInlandOfferId('')
    setInlandCost('')
    setInlandSelling('')
    setInlandCurrency('EGP')
    setQuickLines([
      { code: 'OF', name: 'Ocean Freight', cost_amount: '', selling_amount: '', currency: 'USD' },
      { code: 'THC', name: 'THC', cost_amount: '', selling_amount: '', currency: 'USD' },
    ])
  }, [isOpen])

  const selectedSeaOffer = useMemo(() => {
    if (!form.pricing_offer_id) return null
    return seaOffers.find((o) => String(o.id) === String(form.pricing_offer_id)) || null
  }, [seaOffers, form.pricing_offer_id])

  const selectedInlandOffer = useMemo(() => {
    if (!inlandOfferId) return null
    return inlandOffers.find((o) => String(o.id) === String(inlandOfferId)) || null
  }, [inlandOffers, inlandOfferId])

  useEffect(() => {
    if (inlandMode !== 'from_offer' || !selectedInlandOffer) return
    const { amount, currency } = primaryInlandCostFromOffer(selectedInlandOffer)
    setInlandCost(String(amount))
    setInlandSelling(String(amount))
    setInlandCurrency(currency)
  }, [inlandMode, selectedInlandOffer])

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const updateOceanLine = (idx, patch) => {
    setOceanLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const addCustomsRow = () => {
    setCustomsExtra((prev) => [
      ...prev,
      { id: `${Date.now()}`, name: '', selling: '', currency: 'USD' },
    ])
  }

  const patchCustomsExtra = (id, patch) => {
    setCustomsExtra((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const removeCustomsExtra = (id) => {
    setCustomsExtra((prev) => prev.filter((r) => r.id !== id))
  }

  const updateQuickLine = (idx, patch) => {
    setQuickLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const addQuickLine = () => {
    setQuickLines((prev) => [
      ...prev,
      { code: 'OTHER', name: '', cost_amount: '', selling_amount: '', currency: 'USD' },
    ])
  }

  const oceanSellingByCurrency = useMemo(
    () => sumLineSellingByCurrency(quickMode ? quickLines : oceanLines),
    [quickMode, quickLines, oceanLines]
  )

  const customsSellingByCurrency = useMemo(() => {
    const m = {}
    const nCert = parseNum(customsCertSelling)
    if (nCert) {
      const c = customsCertCurrency || 'USD'
      m[c] = (m[c] || 0) + nCert
    }
    customsExtra.forEach((r) => {
      const n = parseNum(r.selling)
      if (!n) return
      const c = r.currency || 'USD'
      m[c] = (m[c] || 0) + n
    })
    return m
  }, [customsCertSelling, customsCertCurrency, customsExtra])

  const inlandProfit = useMemo(
    () => parseNum(inlandSelling) - parseNum(inlandCost),
    [inlandSelling, inlandCost]
  )

  const pricingLinesProfitByCurrency = useMemo(
    () => sumProfitsByCurrency(quickMode ? quickLines : oceanLines),
    [quickMode, quickLines, oceanLines]
  )

  const quoteProfitByCurrency = useMemo(() => {
    const map = { ...pricingLinesProfitByCurrency }
    if (inlandMode !== 'none') {
      const c = inlandCurrency || 'EGP'
      map[c] = (map[c] || 0) + inlandProfit
    }
    return map
  }, [pricingLinesProfitByCurrency, inlandMode, inlandCurrency, inlandProfit])

  const handlingTotal = useMemo(() => parseNum(handlingFees), [handlingFees])

  const inlandSellingTotal = useMemo(() => {
    if (inlandMode === 'none') return 0
    return parseNum(inlandSelling)
  }, [inlandMode, inlandSelling])

  const grandSellingByCurrency = useMemo(() => {
    const inlandPart =
      inlandMode === 'none' || parseNum(inlandSelling) === 0
        ? {}
        : { [inlandCurrency || 'EGP']: parseNum(inlandSelling) }
    const handlingPart =
      handlingTotal > 0 ? { [handlingCurrency || 'USD']: handlingTotal } : {}
    return mergeCurrencyAmountMaps(oceanSellingByCurrency, customsSellingByCurrency, inlandPart, handlingPart)
  }, [
    oceanSellingByCurrency,
    customsSellingByCurrency,
    inlandMode,
    inlandSelling,
    inlandCurrency,
    handlingTotal,
    handlingCurrency,
  ])

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === String(form.client_id)) || null,
    [clients, form.client_id]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()

    const salesUserId = user?.id ? Number(user.id) : null

    if (!quickMode && !form.pricing_offer_id) return

    const items = []

    if (quickMode) {
      quickLines.forEach((line) => {
        const sell = parseNum(line.selling_amount)
        if (sell <= 0 || !line.code) return
        const nm =
          line.code === 'OTHER'
            ? (line.name || '').trim() || quoteCodeLabel('OTHER')
            : line.name || quoteCodeLabel(line.code)
        items.push({
          code: line.code,
          name: nm,
          description: parseNum(line.cost_amount) > 0 ? `Cost: ${line.cost_amount} ${line.currency}` : null,
          amount: sell,
          currency: line.currency || 'USD',
        })
      })
    } else {
      oceanLines.forEach((line) => {
        const sell = parseNum(line.selling_amount)
        if (!line.code) return
        items.push({
          code: line.code,
          name: line.name || quoteCodeLabel(line.code),
          description: line.description || null,
          amount: sell,
          currency: line.currency || 'USD',
        })
      })
    }

    if (inlandMode !== 'none' && parseNum(inlandSelling) > 0) {
      items.push({
        code: 'INLAND',
        name: t('pricing.inlandTransport', 'Inland Transport'),
        description:
          inlandMode === 'from_offer' && inlandOfferId
            ? `Ref inland offer #${inlandOfferId}; cost ${inlandCost} ${inlandCurrency}`
            : inlandCost
              ? `Cost base: ${inlandCost} ${inlandCurrency}`
              : null,
        amount: parseNum(inlandSelling),
        currency: inlandCurrency || 'EGP',
      })
    }

    items.push({
      code: 'OTHER',
      name: t('pricing.customsCertFee', 'Customs Certificate Fee'),
      description: null,
      amount: parseNum(customsCertSelling),
      currency: customsCertCurrency || 'USD',
    })

    customsExtra.forEach((r) => {
      const sell = parseNum(r.selling)
      if (!r.name?.trim() && sell <= 0) return
      items.push({
        code: 'OTHER',
        name: r.name?.trim() || t('pricing.customsOther', 'Customs'),
        description: null,
        amount: sell,
        currency: r.currency || 'USD',
      })
    })

    if (handlingTotal > 0) {
      items.push({
        code: 'HANDLING',
        name: t('pricing.handlingFees', 'Handling fees'),
        description: null,
        amount: handlingTotal,
        currency: handlingCurrency || 'USD',
      })
    }

    if (!items.length) return

    const payload = {
      ...form,
      client_id: form.client_id ? Number(form.client_id) : null,
      sales_user_id: salesUserId,
      pricing_offer_id: quickMode ? null : form.pricing_offer_id ? Number(form.pricing_offer_id) : null,
      quick_mode: quickMode,
      is_quick_quotation: quickMode,
      quick_mode_reason: quickMode ? quickModeReason.trim() || 'Quick Quotation' : null,
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

  const routeSummaryOffer = quickMode ? null : selectedSeaOffer

  const sectionCard = (title, children) => (
    <section className="pricing-quote-modal__card rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
      {children}
    </section>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-xl font-bold">{t('pricing.createQuote', 'Create Quotation')}</h2>
            {quickMode ? (
              <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">{t('pricing.quickQuotationBadge', 'Quick Quotation · no price sheet')}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="pricing-quote-modal__body flex-1 overflow-y-auto p-6 space-y-6">
          {error ? (
            <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">{error}</div>
          ) : null}

          <form id="quoteForm" onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1 — Client */}
            {sectionCard(
              t('pricing.quoteSectionClient', 'Client info'),
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
                      {t('pricing.salespersonAuto', 'Salesperson')}: <span className="font-semibold text-gray-700 dark:text-gray-300">{user.name}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Quick Quotation — manual, no price sheet */}
            <div className="pricing-quote-modal__card rounded-xl border border-amber-200 dark:border-amber-800 p-5 space-y-3 bg-amber-50/40 dark:bg-amber-950/20">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 rounded border-amber-400" checked={quickMode} onChange={(e) => setQuickMode(e.target.checked)} />
                <span>
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">{t('pricing.quickQuotation', 'Quick Quotation')}</span>
                  <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('pricing.quickQuotationHelp', 'Create this quotation manually without selecting a price sheet. It will be marked as Quick Quotation.')}
                  </span>
                </span>
              </label>
              {quickMode ? (
                <div className="pl-8 space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('pricing.quickQuotationNoteOptional', 'Optional note')}</label>
                  <input
                    value={quickModeReason}
                    onChange={(e) => setQuickModeReason(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-xl outline-none text-sm"
                    placeholder={t('pricing.quickQuotationNotePlaceholder', 'Added to the quotation record (defaults to “Quick Quotation” if empty)')}
                  />
                </div>
              ) : null}
            </div>

            {/* Offer selection (standard) */}
            {!quickMode ? (
              <div className="pricing-quote-modal__card rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.offerSeaRate')}</label>
                <select
                  value={form.pricing_offer_id}
                  onChange={(e) => {
                    const id = e.target.value
                    setField('pricing_offer_id', id)
                    const offer = seaOffers.find((o) => String(o.id) === String(id))
                    if (offer) applySeaOffer(offer)
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                  required={!quickMode}
                >
                  <option value="">{t('common.select', 'Select')}</option>
                  {seaOffers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.pol || '—'} → {o.pod || o.region || '—'} · {o.shipping_line || '—'} ({inferContainerFromOffer(o)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="pricing-quote-modal__card grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="quick-quote-pol">
                    {t('pricing.pol', 'POL')}
                  </label>
                  <PortNameAsyncSelect
                    id="quick-quote-pol"
                    value={form.pol}
                    onChange={(v) => setField('pol', v)}
                    placeholder={t('common.select', 'Select')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="quick-quote-pod">
                    {t('pricing.podShort', 'POD')}
                  </label>
                  <PortNameAsyncSelect
                    id="quick-quote-pod"
                    value={form.pod}
                    onChange={(v) => setField('pod', v)}
                    placeholder={t('common.select', 'Select')}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="quick-quote-carrier">
                    {t('pricing.shippingLine', 'Carrier')}
                  </label>
                  <ShippingLineNameAsyncSelect
                    id="quick-quote-carrier"
                    serviceScope="ocean"
                    value={form.shipping_line}
                    onChange={(v) => setField('shipping_line', v)}
                    placeholder={t('pricing.searchOrAddCarrier', 'Search or add carrier…')}
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
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.validTo', 'Valid to')}</label>
                  <StructuredDatePicker
                    value={form.valid_to}
                    onChange={(v) => setField('valid_to', v)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Show shipping line — customer-facing preview + PDF (API: show_carrier_on_pdf) */}
            {sectionCard(
              t('pricing.quoteCustomerVisibility', 'Customer visibility'),
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{t('pricing.showShippingLine', 'Show Shipping Line')}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {t(
                        'pricing.showShippingLineHelp',
                        'When on, the shipping line appears in the route preview below and on the PDF. When off, it stays hidden from the client-facing quotation.'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showCarrierOnPdf}
                    aria-label={t('pricing.showShippingLine', 'Show Shipping Line')}
                    onClick={() => setShowCarrierOnPdf((v) => !v)}
                    className={`relative h-9 w-14 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-800 ${
                      showCarrierOnPdf ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                        showCarrierOnPdf ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {showCarrierOnPdf
                    ? t('pricing.showShippingLineStateOn', 'Shipping line: visible to client')
                    : t('pricing.showShippingLineStateOff', 'Shipping line: hidden from client view and PDF')}
                </p>
              </div>
            )}

            {/* Section 2 — Route summary */}
            {(routeSummaryOffer || quickMode) &&
              sectionCard(
                t('pricing.quoteSectionRoute', 'Route summary'),
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.detailRoute', 'Route')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {quickMode ? `${form.pol || '—'} → ${form.pod || '—'}` : `${routeSummaryOffer?.pol || '—'} → ${routeSummaryOffer?.pod || routeSummaryOffer?.region || '—'}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.detailCarrier', 'Carrier')}</span>
                    <p
                      className={`font-semibold ${showCarrierOnPdf ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}
                    >
                      {showCarrierOnPdf
                        ? quickMode
                          ? form.shipping_line || '—'
                          : routeSummaryOffer?.shipping_line || '—'
                        : t('pricing.shippingLineHiddenPreview', 'Hidden from client')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.filterContainerType', 'Container')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {quickMode ? form.container_type || '—' : inferContainerFromOffer(routeSummaryOffer)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.transitTime', 'Transit')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{quickMode ? form.transit_time || '—' : routeSummaryOffer?.transit_time || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.formSectionSailingDates', 'Sailing')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {quickMode ? '—' : formatOfferSailing(routeSummaryOffer, i18n.language)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('pricing.detailValidity', 'Validity')}</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{quickMode ? form.valid_to || '—' : formatOfferValidity(routeSummaryOffer)}</p>
                  </div>
                </div>
              )}

            {/* Section 3 — Ocean pricing */}
            {!quickMode && oceanLines.length > 0
              ? sectionCard(
                  t('pricing.quoteSectionPricing', 'Pricing (cost vs selling)'),
                  <div className="space-y-3">
                    <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-bold uppercase text-gray-500 px-1">
                      <span className="md:col-span-3">{t('pricing.item', 'Item')}</span>
                      <span className="md:col-span-2">{t('pricing.cost', 'Cost')}</span>
                      <span className="md:col-span-2">{t('pricing.sellingPrice', 'Selling')}</span>
                      <span className="md:col-span-2">{t('pricing.profit', 'Profit')}</span>
                      <span className="md:col-span-1">{t('pricing.currency', 'Cur.')}</span>
                    </div>
                    {oceanLines.map((line, idx) => {
                      const profit = parseNum(line.selling_amount) - parseNum(line.cost_amount)
                      return (
                        <div
                          key={`${line.sourceKey}-${idx}`}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-3"
                        >
                          <div className="md:col-span-3 font-medium text-sm text-gray-900 dark:text-white">{line.name}</div>
                          <input
                            type="number"
                            readOnly
                            className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm"
                            value={line.cost_amount}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                            value={line.selling_amount}
                            onChange={(e) => updateOceanLine(idx, { selling_amount: e.target.value })}
                          />
                          <div
                            className={`md:col-span-2 text-sm font-semibold tabular-nums ${
                              profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {moneySymbol(line.currency)}{' '}
                            {profit.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                          <span className="md:col-span-1 text-sm text-gray-600 dark:text-gray-400">{line.currency}</span>
                        </div>
                      )
                    })}
                    <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/40 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 mb-2">
                        {t('pricing.totalLineProfit', 'Total profit (pricing lines)')}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {sortedProfitKeys(pricingLinesProfitByCurrency).every(
                          (k) => Math.abs(pricingLinesProfitByCurrency[k]) <= 1e-9
                        ) ? (
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
                                  {moneySymbol(cur)}{' '}
                                  {amt.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-xs font-normal opacity-80">{cur}</span>
                                </span>
                              )
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )
              : null}

            {quickMode ? (
              sectionCard(
                t('pricing.quoteSectionPricing', 'Pricing (cost vs selling)'),
                <div className="space-y-3">
                  <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-bold uppercase text-gray-500 px-1">
                    <span className="md:col-span-2">{t('pricing.item', 'Item')}</span>
                    <span className="md:col-span-3">{t('pricing.cost', 'Cost')}</span>
                    <span className="md:col-span-3">{t('pricing.sellingPrice', 'Selling')}</span>
                    <span className="md:col-span-2">{t('pricing.profit', 'Profit')}</span>
                    <span className="md:col-span-1">{t('pricing.currency', 'Cur.')}</span>
                  </div>
                  {quickLines.map((line, idx) => {
                    const profit = parseNum(line.selling_amount) - parseNum(line.cost_amount)
                    return (
                      <div key={`q-${idx}`} className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <select
                          className="md:col-span-2 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={line.code}
                          onChange={(e) => {
                            const code = e.target.value
                            updateQuickLine(idx, {
                              code,
                              name: code === 'OTHER' ? (line.name || '') : quoteCodeLabel(code),
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
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="md:col-span-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={line.cost_amount}
                          onChange={(e) => updateQuickLine(idx, { cost_amount: e.target.value })}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="md:col-span-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={line.selling_amount}
                          onChange={(e) => updateQuickLine(idx, { selling_amount: e.target.value })}
                        />
                        <div
                          className={`md:col-span-2 text-sm font-semibold tabular-nums ${
                            profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {moneySymbol(line.currency)}{' '}
                          {profit.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                        <select
                          className="md:col-span-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          value={line.currency}
                          onChange={(e) => updateQuickLine(idx, { currency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="EGP">EGP</option>
                          <option value="EUR">EUR</option>
                        </select>
                        <button type="button" className="md:col-span-12 justify-self-end p-2 rounded-lg border border-gray-200 dark:border-gray-700 w-fit" onClick={() => setQuickLines((p) => p.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </button>
                        </div>
                        {line.code === 'OTHER' ? (
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                            placeholder={t('pricing.itemName', 'Item name')}
                            value={line.name || ''}
                            onChange={(e) => updateQuickLine(idx, { name: e.target.value })}
                          />
                        ) : null}
                      </div>
                    )
                  })}
                  <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/40 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 mb-2">
                      {t('pricing.totalLineProfit', 'Total profit (pricing lines)')}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {sortedProfitKeys(pricingLinesProfitByCurrency).every(
                        (k) => Math.abs(pricingLinesProfitByCurrency[k]) <= 1e-9
                      ) ? (
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
                                {moneySymbol(cur)}{' '}
                                {amt.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{' '}
                                <span className="text-xs font-normal opacity-80">{cur}</span>
                              </span>
                            )
                          })
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={addQuickLine} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700">
                    <Plus className="h-4 w-4" /> {t('common.add', 'Add line')}
                  </button>
                </div>
              )
            ) : null}

            {/* Section 4 — Inland */}
            {sectionCard(
              t('pricing.quoteSectionInland', 'Inland transport (optional)'),
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="inlandMode" checked={inlandMode === 'none'} onChange={() => setInlandMode('none')} />
                    {t('common.none', 'None')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="inlandMode" checked={inlandMode === 'from_offer'} onChange={() => setInlandMode('from_offer')} />
                    {t('pricing.inlandFromExisting', 'From existing inland rate')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="inlandMode" checked={inlandMode === 'manual'} onChange={() => setInlandMode('manual')} />
                    {t('pricing.inlandManual', 'Manual input')}
                  </label>
                </div>
                {inlandMode === 'from_offer' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={inlandOfferId}
                      onChange={(e) => setInlandOfferId(e.target.value)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 md:col-span-2"
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
                      {t('pricing.profit', 'Profit')}: {moneySymbol(inlandCurrency)}{' '}
                      {inlandProfit.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ) : null}
                {inlandMode === 'manual' ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="number"
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
                      {t('pricing.profit', 'Profit')}: {moneySymbol(inlandCurrency)}{' '}
                      {inlandProfit.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Section 5 — Customs */}
            {sectionCard(
              t('pricing.quoteSectionCustoms', 'Customs clearance'),
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('pricing.customsCertFee', 'Customs Certificate Fee')}</label>
                    <p className="text-xs text-gray-500">{t('pricing.customsCertFeeHint', 'Default fixed selling amount (editable)')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="min-w-[8rem] flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      value={customsCertSelling}
                      onChange={(e) => setCustomsCertSelling(e.target.value)}
                    />
                    <select
                      value={customsCertCurrency}
                      onChange={(e) => setCustomsCertCurrency(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold"
                      aria-label={t('pricing.currency', 'Currency')}
                    >
                      <option value="USD">USD</option>
                      <option value="EGP">EGP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('pricing.officialReceipts', 'Official Receipts')}</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      'pricing.officialReceiptsRuleHint',
                      'Always appears as an informational note on the quotation and PDF. It is never included in line totals or the grand total.'
                    )}
                  </p>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                    placeholder={t('pricing.officialReceiptsPlaceholder', 'Note for the client (no charge)')}
                    value={officialReceiptsNote}
                    onChange={(e) => setOfficialReceiptsNote(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.customItems', 'Custom items')}</span>
                    <button type="button" onClick={addCustomsRow} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Plus className="h-3.5 w-3.5" /> {t('common.add', 'Add')}
                    </button>
                  </div>
                  {customsExtra.map((r) => (
                    <div key={r.id} className="flex flex-wrap gap-2 items-center">
                      <input
                        className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder={t('pricing.itemName', 'Name')}
                        value={r.name}
                        onChange={(e) => patchCustomsExtra(r.id, { name: e.target.value })}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        placeholder={t('pricing.amount', 'Amount')}
                        value={r.selling}
                        onChange={(e) => patchCustomsExtra(r.id, { selling: e.target.value })}
                      />
                      <select
                        value={r.currency}
                        onChange={(e) => patchCustomsExtra(r.id, { currency: e.target.value })}
                        className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      >
                        <option value="USD">USD</option>
                        <option value="EGP">EGP</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <button type="button" onClick={() => removeCustomsExtra(r.id)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 6 — Summary */}
            {sectionCard(
              t('pricing.quoteSectionSummary', 'Summary'),
              <div className="space-y-4">
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
                    <span className="font-bold tabular-nums text-right">
                      {inlandMode === 'none'
                        ? t('common.dash')
                        : formatLocaleMoney(inlandSellingTotal, inlandCurrency, i18n.language)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                    <span className="text-gray-600 dark:text-gray-400 shrink-0">{t('pricing.summaryCustoms', 'Customs total')}</span>
                    <div className="flex flex-col items-end gap-0.5 font-bold tabular-nums text-right">
                      {(() => {
                        const keys = sortCurrencyCodes(
                          Object.keys(customsSellingByCurrency).filter((c) => Math.abs(customsSellingByCurrency[c] || 0) > 1e-9)
                        )
                        if (!keys.length) return <span>{t('common.dash')}</span>
                        return keys.map((cur) => (
                          <span key={cur}>{formatLocaleMoney(customsSellingByCurrency[cur], cur, i18n.language)}</span>
                        ))
                      })()}
                    </div>
                  </div>
                  {officialReceiptsNote.trim() ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/40 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{t('pricing.officialReceipts', 'Official Receipts')}</span>
                      <span className="mx-1">·</span>
                      {t('pricing.officialReceiptsSummaryTag', 'Note only — excluded from totals above')}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                    <div className="min-w-0">
                      <span className="block font-bold text-gray-900 dark:text-white">{t('pricing.summaryHandling', 'Handling fees')}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('pricing.summaryHandlingHint', 'Separate line; included in grand total below.')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold tabular-nums"
                        placeholder="0"
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
                      <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                        = {formatLocaleMoney(handlingTotal, handlingCurrency, i18n.language)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/45 bg-emerald-50/85 dark:bg-emerald-950/30 p-4 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                      {t('pricing.totalProfitQuote', 'Total profit (selling − cost)')}
                    </div>
                    <p className="text-[11px] leading-snug text-emerald-900/85 dark:text-emerald-300/90">
                      {t(
                        'pricing.totalProfitQuoteHint',
                        'Sum of profit on each pricing line, plus inland transport when enabled. Totals are per currency.'
                      )}
                    </p>
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
                                {moneySymbol(cur)}{' '}
                                {amt.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{' '}
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
                          <span key={cur}>{formatLocaleMoney(grandSellingByCurrency[cur], cur, i18n.language)}</span>
                        ))
                      })()}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('pricing.summaryTotalsByCurrencyNote', 'Amounts are never added across different currencies. Each line shows one currency.')}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.notes', 'Notes')}</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
              />
            </div>

            {selectedClient ? (
              <p className="text-xs text-gray-500">
                {t('pricing.selectedClient', 'Selected client')}: {selectedClient.name || selectedClient.company_name}
              </p>
            ) : null}
          </form>
        </div>

        <div className="pricing-quote-modal__actions px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" form="quoteForm" disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
