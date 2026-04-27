import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2, MapPin, Clock, CalendarDays, DollarSign, FileText, Truck } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { getStoredToken } from '../../Login'
import { listPricingFreightUnitTypes } from '../../../api/pricingFreightUnitTypes'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import OceanContainerTypeField from './OceanContainerTypeField'
import InlandTruckTypeAsyncSelect from './InlandTruckTypeAsyncSelect'
import StructuredDatePicker from '../../../components/StructuredDatePicker'
import { formatDate } from '../../../utils/dateUtils'

/** Canonical weekday names stored in API (`weekly_sailing_days` comma-separated); sort order Sat → Fri */
const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const WEEK_DAY_I18N_KEYS = {
  Saturday: 'pricing.weekdaySaturday',
  Sunday: 'pricing.weekdaySunday',
  Monday: 'pricing.weekdayMonday',
  Tuesday: 'pricing.weekdayTuesday',
  Wednesday: 'pricing.weekdayWednesday',
  Thursday: 'pricing.weekdayThursday',
  Friday: 'pricing.weekdayFriday',
}

function weekdayLabel(day, t) {
  const key = WEEK_DAY_I18N_KEYS[day]
  return key ? t(key, day) : day
}
const CURRENCIES = ['USD', 'EUR', 'EGP']

/** Default editable charge rows for ocean freight */
const DEFAULT_SEA_LINE_NAMES = ['Ocean Freight', 'THC', 'B/L Fee', 'Telex Release']

const EXTRA_LINE_NAMES = ['Power', 'Other Charges']

const BASE_LINE_ITEMS = [...DEFAULT_SEA_LINE_NAMES, ...EXTRA_LINE_NAMES]

/** Chip label for stored API dates (YYYY-MM-DD) without UTC shift */
function formatIsoDateDisplay(iso, locale) {
  if (!iso || typeof iso !== 'string') return ''
  const s = iso.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return iso
  const [y, m, d] = s.split('-').map(Number)
  return formatDate(new Date(y, m - 1, d), { locale })
}

/** Legacy inland keys when API list is empty */
const LEGACY_INLAND_ORDER = ['t20d', 't40d', 'p20x2', 't40r']

const INLAND_GOVERNORATES = ['القاهرة الكبرى', 'الإسكندرية', 'الدلتا']

const defaultInlandForm = () => ({
  inland_port: '',
  inland_gov: '',
  inland_area: '',
  shipping_line: '',
  truck_type: 't40d',
  price: '',
  currency: 'EGP',
  valid_from: '',
  valid_to: '',
  notes: '',
})

function inferInlandTruckFromPricing(pricing, inlandUnitTypes = []) {
  const p = pricing || {}
  const primaryOrder =
    inlandUnitTypes.length > 0
      ? [...inlandUnitTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((x) => x.slug)
      : LEGACY_INLAND_ORDER
  for (const code of primaryOrder) {
    const row = p[code]
    if (row != null && row.price != null && row.price !== '') return code
  }
  const keys = ['p20x1', 'p40hq', 'p40rf', 't40hq', 'generator', 't20r']
  for (const code of keys) {
    const row = p[code]
    if (row != null && row.price != null && row.price !== '') {
      if (code === 'p20x1') return 't20d'
      if (code === 'p40hq' || code === 't40hq') return 't40d'
      if (code === 'p40rf') return 't40r'
      if (code === 't20r') return 't20d'
      return 't40d'
    }
  }
  return primaryOrder[0] || 't40d'
}

function inlandPriceForTruck(pricing, truckId) {
  const p = pricing || {}
  const direct = p[truckId]
  if (direct?.price != null && direct.price !== '') return direct
  if (truckId === 't20d' && p.p20x1?.price != null) return p.p20x1
  if (truckId === 't40d' && (p.t40hq?.price != null || p.p40hq?.price != null)) return p.t40hq || p.p40hq
  if (truckId === 't40r' && p.p40rf?.price != null) return p.p40rf
  return direct
}

const defaultSeaForm = () => ({
  pricing_type: 'sea',
  pol: '',
  pod: '',
  shipping_line: '',
  container_preset: '',
  transit_time_days: '',
  pol_detention: '',
  pol_demurrage: '',
  pod_detention: '',
  pod_demurrage: '',
  sailing_tab: 'weekly',
  weekly_days: [],
  fixed_dates: [],
  valid_from: '',
  valid_to: '',
  notes: '',
})

const makeLineItem = (name = 'Ocean Freight') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name,
  description: '',
  amount: '',
  currency: 'USD',
})

const CANONICAL_SEA_LINE_KEYS = {
  'Ocean Freight': 'defaultLineOceanFreight',
  THC: 'defaultLineThc',
  'B/L Fee': 'defaultLineBlFee',
  'Telex Release': 'defaultLineTelex',
  Power: 'defaultLinePower',
  'Other Charges': 'defaultLineOther',
}

function seaLineOptionLabel(name, t) {
  const k = CANONICAL_SEA_LINE_KEYS[name]
  return k ? t(`pricing.${k}`) : name
}

function inferPresetFromPricing(offer) {
  const p = offer?.pricing || {}
  if (p.of20?.price != null) return '20-dry-std'
  if (p.of40rf?.price != null || p.thcRf?.price != null) return '40-reefer'
  if (p.of40?.price != null || p.thc40?.price != null) return '40-dry-hq'
  return '40-dry-hq'
}

function resolveOceanMeta(presetSlug, oceanUnitTypes) {
  const row = oceanUnitTypes.find((x) => x.slug === presetSlug)
  const m = row?.meta
  if (m?.type && m?.size && m?.height) {
    return { type: m.type, size: m.size, height: m.height }
  }
  const fb = {
    '20-dry-std': { type: 'Dry', size: '20', height: 'Standard' },
    '40-dry-std': { type: 'Dry', size: '40', height: 'Standard' },
    '40-dry-hq': { type: 'Dry', size: '40', height: 'HQ' },
    '40-reefer': { type: 'Reefer', size: '40', height: 'Standard' },
  }
  return fb[presetSlug] || fb['40-dry-hq']
}

function inferLegacyPricingCode(itemName, presetSlug, oceanUnitTypes, idx = 0) {
  const def = resolveOceanMeta(presetSlug, oceanUnitTypes)
  const type = def.type
  const size = def.size
  if (itemName === 'Ocean Freight') {
    if (type === 'Reefer') return 'of40rf'
    if (size === '20') return 'of20'
    return 'of40'
  }
  if (itemName === 'THC') {
    if (type === 'Reefer') return 'thcRf'
    if (size === '20') return 'thc20'
    return 'thc40'
  }
  if (itemName === 'Power') return 'powerDay'
  if (itemName === 'B/L Fee') return 'blFee'
  if (itemName === 'Telex Release') return 'telex'
  return `otherCharge${idx + 1}`
}

function encodeFreeTimeDnd({ pol_detention, pol_demurrage, pod_detention, pod_demurrage }) {
  const lines = []
  if (pol_detention || pol_demurrage) {
    lines.push(
      `POL Detention: ${pol_detention?.trim() || '—'} | Demurrage: ${pol_demurrage?.trim() || '—'}`
    )
  }
  if (pod_detention || pod_demurrage) {
    lines.push(
      `POD Detention: ${pod_detention?.trim() || '—'} | Demurrage: ${pod_demurrage?.trim() || '—'}`
    )
  }
  return lines.join('\n')
}

function parseFreeTimeFromDnd(dnd) {
  const empty = {
    pol_detention: '',
    pol_demurrage: '',
    pod_detention: '',
    pod_demurrage: '',
  }
  if (!dnd?.trim()) return empty
  const lines = String(dnd).split('\n').filter(Boolean)
  lines.forEach((line) => {
    const upper = line.toUpperCase()
    const detMatch = line.match(/Detention:\s*([^|]+)/i)
    const demMatch = line.match(/Demurrage:\s*(.+)/i)
    const det = detMatch?.[1]?.trim().replace(/^—$/, '') ?? ''
    const dem = demMatch?.[1]?.trim().replace(/^—$/, '') ?? ''
    if (upper.includes('POL')) {
      empty.pol_detention = det
      empty.pol_demurrage = dem
    }
    if (upper.includes('POD')) {
      empty.pod_detention = det
      empty.pod_demurrage = dem
    }
  })
  return empty
}

export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit, pricingMode = 'sea' }) {
  const { t, i18n } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()
  const [form, setForm] = useState(defaultSeaForm)
  const [inlandForm, setInlandForm] = useState(defaultInlandForm)
  const [lineItems, setLineItems] = useState(() => DEFAULT_SEA_LINE_NAMES.map((n) => makeLineItem(n)))
  const [oceanUnitTypes, setOceanUnitTypes] = useState([])
  const [inlandUnitTypes, setInlandUnitTypes] = useState([])
  const [draftSailingDate, setDraftSailingDate] = useState('')
  const [fixedDatePickerKey, setFixedDatePickerKey] = useState(0)

  const loadOceanTypes = useCallback(async () => {
    const token = getStoredToken()
    if (!token) return
    try {
      const res = await listPricingFreightUnitTypes(token, { dataset: 'ocean_container' })
      const data = res?.data ?? res
      setOceanUnitTypes(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadInlandTypes = useCallback(async () => {
    const token = getStoredToken()
    if (!token) return
    try {
      const res = await listPricingFreightUnitTypes(token, { dataset: 'inland_truck' })
      const data = res?.data ?? res
      setInlandUnitTypes(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  const effectiveMode = useMemo(
    () => offerToEdit?.pricing_type ?? pricingMode ?? 'sea',
    [offerToEdit?.pricing_type, pricingMode]
  )

  useEffect(() => {
    if (!isOpen) return
    const mode = offerToEdit?.pricing_type ?? pricingMode ?? 'sea'
    if (mode === 'sea') loadOceanTypes()
    else loadInlandTypes()
  }, [isOpen, offerToEdit?.pricing_type, pricingMode, loadOceanTypes, loadInlandTypes])

  useEffect(() => {
    if (!isOpen) setDraftSailingDate('')
  }, [isOpen])

  useEffect(() => {
    if (form.sailing_tab !== 'fixed') setDraftSailingDate('')
  }, [form.sailing_tab])

  useEffect(() => {
    if (effectiveMode !== 'sea' || !oceanUnitTypes.length) return
    setForm((f) => {
      const slugs = new Set(oceanUnitTypes.map((x) => x.slug))
      if (f.container_preset && slugs.has(f.container_preset)) return f
      return { ...f, container_preset: oceanUnitTypes[0].slug }
    })
  }, [effectiveMode, oceanUnitTypes])

  useEffect(() => {
    if (effectiveMode !== 'inland' || !inlandUnitTypes.length) return
    setInlandForm((f) => {
      const slugs = new Set(inlandUnitTypes.map((x) => x.slug))
      if (slugs.has(f.truck_type)) return f
      return { ...f, truck_type: inlandUnitTypes[0].slug }
    })
  }, [effectiveMode, inlandUnitTypes])

  useEffect(() => {
    if (!isOpen) return
    const mode = offerToEdit?.pricing_type ?? pricingMode ?? 'sea'
    if (mode !== 'inland') return

    if (!offerToEdit) {
      setInlandForm(defaultInlandForm())
      return
    }
    const truckId = inferInlandTruckFromPricing(offerToEdit.pricing, inlandUnitTypes)
    const row = inlandPriceForTruck(offerToEdit.pricing, truckId)
    setInlandForm({
      inland_port: offerToEdit.inland_port || '',
      inland_gov: offerToEdit.inland_gov || offerToEdit.region || '',
      inland_area: offerToEdit.inland_city || offerToEdit.destination || '',
      shipping_line: offerToEdit.shipping_line || '',
      truck_type: truckId,
      price: row?.price != null && row.price !== '' ? String(row.price) : '',
      currency: row?.currency || 'EGP',
      valid_from: offerToEdit.valid_from ? String(offerToEdit.valid_from).slice(0, 10) : '',
      valid_to: offerToEdit.valid_to ? String(offerToEdit.valid_to).slice(0, 10) : '',
      notes: offerToEdit.notes || '',
    })
  }, [offerToEdit, isOpen, pricingMode, inlandUnitTypes])

  useEffect(() => {
    if (!isOpen) return
    const mode = offerToEdit?.pricing_type ?? pricingMode ?? 'sea'
    if (mode !== 'sea') return

    if (!offerToEdit) {
      setForm(defaultSeaForm())
      setLineItems(DEFAULT_SEA_LINE_NAMES.map((n) => makeLineItem(n)))
      return
    }

    const weeklyFromApi = offerToEdit.weekly_sailing_days
      ? String(offerToEdit.weekly_sailing_days)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const fixedFromApi = Array.isArray(offerToEdit.sailing_dates) ? [...offerToEdit.sailing_dates] : []

    const ft = parseFreeTimeFromDnd(offerToEdit.dnd)

    setForm({
      ...defaultSeaForm(),
      pol: offerToEdit.pol || '',
      pod: offerToEdit.pod || '',
      shipping_line: offerToEdit.shipping_line || '',
      container_preset: inferPresetFromPricing(offerToEdit),
      transit_time_days: String(offerToEdit.transit_time || '').replace(/\D+/g, ''),
      ...ft,
      sailing_tab: weeklyFromApi.length ? 'weekly' : fixedFromApi.length ? 'fixed' : 'weekly',
      weekly_days: weeklyFromApi.length ? weeklyFromApi : [],
      fixed_dates: fixedFromApi,
      valid_from: offerToEdit.valid_from ? String(offerToEdit.valid_from).slice(0, 10) : '',
      valid_to: offerToEdit.valid_to ? String(offerToEdit.valid_to).slice(0, 10) : '',
      notes: offerToEdit.notes || '',
    })

    const pricing = offerToEdit.pricing || {}
    const mapped = Object.entries(pricing).map(([code, item], idx) => {
      const lower = String(code).toLowerCase()
      let name = 'Other Charges'
      if (lower.includes('of')) name = 'Ocean Freight'
      else if (lower.includes('thc')) name = 'THC'
      else if (lower.includes('power')) name = 'Power'
      else if (lower.includes('bl')) name = 'B/L Fee'
      else if (lower.includes('telex')) name = 'Telex Release'
      return {
        id: `${Date.now()}-${idx}`,
        name,
        description: '',
        amount: item?.price ?? '',
        currency: item?.currency || 'USD',
      }
    })
    setLineItems(mapped.length ? mapped : DEFAULT_SEA_LINE_NAMES.map((n) => makeLineItem(n)))
  }, [offerToEdit, isOpen, pricingMode])

  const oceanMeta = useMemo(
    () => resolveOceanMeta(form.container_preset, oceanUnitTypes),
    [form.container_preset, oceanUnitTypes]
  )

  const selectedSpec = useMemo(() => {
    if (!oceanMeta.type || !oceanMeta.size) return ''
    const typeL = oceanMeta.type === 'Reefer' ? t('pricing.reefer') : t('pricing.dry')
    const heightL =
      String(oceanMeta.height).toLowerCase() === 'hq' ? t('pricing.containerHeightHq') : t('pricing.standard')
    return `${oceanMeta.size} ${heightL} ${typeL}`
  }, [oceanMeta.type, oceanMeta.size, oceanMeta.height, t])

  const allowedItemNames = useMemo(() => {
    if (oceanMeta.type === 'Reefer') return BASE_LINE_ITEMS
    return BASE_LINE_ITEMS.filter((x) => x !== 'Power')
  }, [oceanMeta.type])

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))
  const updateInlandForm = (patch) => setInlandForm((prev) => ({ ...prev, ...patch }))

  const toggleWeeklyDay = (day) => {
    setForm((prev) => {
      const has = prev.weekly_days.includes(day)
      return {
        ...prev,
        weekly_days: has ? prev.weekly_days.filter((d) => d !== day) : [...prev.weekly_days, day],
      }
    })
  }

  const clearAllWeeklyDays = () => setForm((prev) => ({ ...prev, weekly_days: [] }))

  const weeklySummaryPhrase = useMemo(() => {
    if (!form.weekly_days.length) return ''
    const sep = ` ${t('pricing.weekdayJoiner', '+')} `
    return [...form.weekly_days]
      .sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b))
      .map((d) => weekdayLabel(d, t))
      .join(sep)
  }, [form.weekly_days, t])

  const addFixedDate = (dateStr) => {
    if (!dateStr) return
    setForm((prev) =>
      prev.fixed_dates.includes(dateStr) ? prev : { ...prev, fixed_dates: [...prev.fixed_dates, dateStr].sort() }
    )
  }

  const removeFixedDate = (dateStr) => {
    setForm((prev) => ({ ...prev, fixed_dates: prev.fixed_dates.filter((d) => d !== dateStr) }))
  }

  const clearAllFixedDates = () => {
    setForm((prev) => ({ ...prev, fixed_dates: [] }))
    setDraftSailingDate('')
    setFixedDatePickerKey((k) => k + 1)
  }

  const draftIsDuplicate = Boolean(draftSailingDate && form.fixed_dates.includes(draftSailingDate))

  const addLineItem = () => setLineItems((prev) => [...prev, makeLineItem('Other Charges')])
  const removeLineItem = (id) => setLineItems((prev) => prev.filter((x) => x.id !== id))
  const patchLineItem = (id, patch) => setLineItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (effectiveMode === 'inland') {
      const gov = inlandForm.inland_gov.trim()
      const port = inlandForm.inland_port.trim()
      const amount = Number(inlandForm.price)
      if (!gov || !port || Number.isNaN(amount) || amount < 0) return

      const searchPod = [port, inlandForm.inland_area.trim(), gov].filter(Boolean).join(' ')
      const payload = {
        pricing_type: 'inland',
        region: gov,
        pod: searchPod || port,
        pol: '',
        shipping_line: inlandForm.shipping_line?.trim() || '',
        dnd: null,
        transit_time: null,
        valid_from: inlandForm.valid_from || null,
        valid_to: inlandForm.valid_to || null,
        weekly_sailing_days: null,
        sailing_dates: [],
        notes: inlandForm.notes?.trim() || null,
        other_charges: null,
        inland_port: port,
        inland_gov: gov,
        inland_city: inlandForm.inland_area.trim() || null,
        destination: inlandForm.inland_area.trim() || null,
        pricing: {
          [inlandForm.truck_type]: {
            price: amount,
            currency: inlandForm.currency || 'EGP',
          },
        },
      }

      try {
        if (offerToEdit?.id) await update(offerToEdit.id, payload)
        else await create(payload)
        onSuccess?.()
        onClose()
      } catch (err) {
        console.error(err)
      }
      return
    }

    const parsedItems = lineItems
      .map((row, idx) => {
        const amount = Number(row.amount)
        if (Number.isNaN(amount) || amount < 0) return null
        if (row.name === 'Power' && oceanMeta.type !== 'Reefer') return null
        if (row.name === 'Other Charges' && !(row.description || '').trim()) return null
        const code = inferLegacyPricingCode(row.name, form.container_preset, oceanUnitTypes, idx)
        return {
          code,
          name: row.name,
          description: (row.description || '').trim(),
          amount,
          currency: row.currency || 'USD',
        }
      })
      .filter(Boolean)

    if (!parsedItems.length) return

    const pricing = {}
    parsedItems.forEach((row) => {
      pricing[row.code] = { price: row.amount, currency: row.currency }
    })

    const dndEncoded = encodeFreeTimeDnd(form)

    const sailing_dates =
      form.sailing_tab === 'fixed' ? [...form.fixed_dates].filter(Boolean).sort() : []

    const weekly_sailing_days =
      form.sailing_tab === 'weekly' && form.weekly_days.length
        ? [...form.weekly_days].sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b)).join(',')
        : null

    const payload = {
      pricing_type: 'sea',
      region: form.pod || form.pol || 'Sea',
      pol: form.pol,
      pod: form.pod,
      shipping_line: form.shipping_line,
      transit_time: form.transit_time_days ? `${form.transit_time_days} days` : '',
      dnd: dndEncoded || null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      weekly_sailing_days,
      sailing_dates,
      notes: form.notes?.trim() || null,
      other_charges: parsedItems
        .filter((x) => x.name === 'Other Charges')
        .map((x) => x.description)
        .filter(Boolean)
        .join(' | ') || null,
      pricing,
      inland_port: '',
      destination: '',
      inland_gov: '',
      inland_city: '',
    }

    try {
      if (offerToEdit?.id) await update(offerToEdit.id, payload)
      else await create(payload)
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  const sectionTitle = (Icon, title) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">{title}</h3>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {effectiveMode === 'inland'
              ? offerToEdit
                ? t('pricing.editInlandOffer', 'Edit Inland Transport Rate')
                : t('pricing.addInlandOffer', 'Inland Transport Price')
              : offerToEdit
                ? t('pricing.editOceanOffer', 'Edit Ocean Freight Rate')
                : t('pricing.addOceanOffer', 'Ocean Freight Price')}
          </h2>
          <button type="button" onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error ? <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">{error}</div> : null}

          <form id="offerForm" onSubmit={handleSubmit} className="space-y-8">
            {effectiveMode === 'sea' ? (
            <>
            {/* Section 1 */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50/50 dark:bg-gray-900/20">
              {sectionTitle(MapPin, t('pricing.formSectionRouteCarrier', 'Route & Carrier'))}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="offer-pol">
                    {t('pricing.pol', 'POL')}
                  </label>
                  <PortNameAsyncSelect
                    id="offer-pol"
                    value={form.pol}
                    onChange={(v) => updateForm({ pol: v })}
                    placeholder={t('pricing.filterAllPol', 'All POL')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="offer-pod">
                    {t('pricing.pod', 'POD')}
                  </label>
                  <PortNameAsyncSelect
                    id="offer-pod"
                    value={form.pod}
                    onChange={(v) => updateForm({ pod: v })}
                    placeholder={t('pricing.filterAllPod', 'All POD')}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="offer-shipping-line">
                    {t('pricing.shippingLine', 'Shipping line')}
                  </label>
                  <ShippingLineNameAsyncSelect
                    id="offer-shipping-line"
                    serviceScope="ocean"
                    value={form.shipping_line}
                    onChange={(v) => updateForm({ shipping_line: v })}
                    placeholder={t('pricing.filterAllShippingLines', 'All shipping lines')}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('pricing.shippingLineOceanHint', 'Ocean carriers only. Add new names to save them for next time.')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('pricing.filterContainerType', 'Container Type')}
                  </label>
                  <OceanContainerTypeField
                    id="offer-container-type"
                    types={oceanUnitTypes}
                    value={form.container_preset}
                    onChange={(v) => updateForm({ container_preset: v })}
                    onReload={loadOceanTypes}
                  />
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mt-2">{selectedSpec}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.transitTime', 'Transit Time')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      value={form.transit_time_days}
                      onChange={(e) => updateForm({ transit_time_days: e.target.value })}
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{t('pricing.days', 'days')}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              {sectionTitle(Clock, t('pricing.formSectionFreeTime', 'Free Time'))}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('pricing.pol', 'POL')}</p>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('pricing.detention', 'Detention')}</label>
                      <input
                        className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        value={form.pol_detention}
                        onChange={(e) => updateForm({ pol_detention: e.target.value })}
                        placeholder={t('pricing.freeDaysPlaceholder', 'e.g. 7 days')}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('pricing.demurrage', 'Demurrage')}</label>
                      <input
                        className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        value={form.pol_demurrage}
                        onChange={(e) => updateForm({ pol_demurrage: e.target.value })}
                        placeholder={t('pricing.freeDaysPlaceholder', 'e.g. 14 days')}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('pricing.pod', 'POD')}</p>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('pricing.detention', 'Detention')}</label>
                      <input
                        className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        value={form.pod_detention}
                        onChange={(e) => updateForm({ pod_detention: e.target.value })}
                        placeholder={t('pricing.freeDaysPlaceholder', 'e.g. 7 days')}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('pricing.demurrage', 'Demurrage')}</label>
                      <input
                        className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        value={form.pod_demurrage}
                        onChange={(e) => updateForm({ pod_demurrage: e.target.value })}
                        placeholder={t('pricing.freeDaysPlaceholder', 'e.g. 14 days')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              {sectionTitle(CalendarDays, t('pricing.formSectionSailingDatesLong'))}
              <div className="flex gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${form.sailing_tab === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  onClick={() => updateForm({ sailing_tab: 'weekly' })}
                >
                  {t('pricing.sailingTabWeekly', 'Weekly')}
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${form.sailing_tab === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  onClick={() => updateForm({ sailing_tab: 'fixed' })}
                >
                  {t('pricing.sailingTabFixed', 'Fixed Dates')}
                </button>
              </div>

              {form.sailing_tab === 'weekly' ? (
                <div className="space-y-4">
                  <p id="offer-weekly-sailing-hint" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(
                      'pricing.weeklySailingMultiHint',
                      'Select one or more weekdays (for example Monday and Thursday). Sailings repeat every week on each selected day.'
                    )}
                  </p>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        {t('pricing.weeklySelectedDaysHeading', 'Days each week')}
                        {form.weekly_days.length > 0 ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                            {form.weekly_days.length}
                          </span>
                        ) : null}
                      </h4>
                      {form.weekly_days.length > 0 ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={clearAllWeeklyDays}
                        >
                          {t('pricing.clearWeeklyDays', 'Clear selection')}
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
                      role="group"
                      aria-describedby="offer-weekly-sailing-hint"
                    >
                      {WEEK_DAYS.map((day) => {
                        const selected = form.weekly_days.includes(day)
                        return (
                          <label
                            key={day}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100'
                                : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selected}
                              onChange={() => toggleWeeklyDay(day)}
                              aria-label={t('pricing.toggleWeekdayAria', 'Toggle {{day}}', {
                                day: weekdayLabel(day, t),
                              })}
                            />
                            <span>{weekdayLabel(day, t)}</span>
                          </label>
                        )
                      })}
                    </div>
                    {form.weekly_days.length > 0 ? (
                      <p className="mt-3 text-sm font-semibold text-blue-800 dark:text-blue-200">
                        {t('pricing.weeklyRepeatsOn', 'Repeats weekly on: {{days}}', { days: weeklySummaryPhrase })}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        {t('pricing.noWeeklyDaysSelected', 'No weekdays selected yet — choose one or more above.')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p id="offer-fixed-dates-hint" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(
                      'pricing.fixedDatesMultiHint',
                      'Choose Day, Month, and Year, then tap Add. Repeat to add multiple sailing dates. Remove dates from the list anytime.'
                    )}
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[min(100%,280px)] flex-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="offer-fixed-date-picker">
                        {t('pricing.addFixedDate', 'Add date')}
                      </label>
                      <StructuredDatePicker
                        id="offer-fixed-date-picker"
                        key={fixedDatePickerKey}
                        className="mt-1"
                        value={draftSailingDate}
                        onChange={setDraftSailingDate}
                        aria-describedby="offer-fixed-dates-hint"
                      />
                    </div>
                    <button
                      type="button"
                      className="mb-0.5 shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
                      disabled={!draftSailingDate || draftIsDuplicate}
                      title={
                        draftIsDuplicate
                          ? t('pricing.fixedDateAlreadyAdded', 'This date is already in the list')
                          : undefined
                      }
                      onClick={() => {
                        if (!draftSailingDate || draftIsDuplicate) return
                        addFixedDate(draftSailingDate)
                        setDraftSailingDate('')
                        setFixedDatePickerKey((k) => k + 1)
                      }}
                    >
                      {t('common.add', 'Add')}
                    </button>
                  </div>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        {t('pricing.selectedFixedDatesHeading', 'Selected sailing dates')}
                        {form.fixed_dates.length > 0 ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                            {form.fixed_dates.length}
                          </span>
                        ) : null}
                      </h4>
                      {form.fixed_dates.length > 0 ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={clearAllFixedDates}
                        >
                          {t('pricing.removeAllFixedDates', 'Remove all')}
                        </button>
                      ) : null}
                    </div>
                    {form.fixed_dates.length > 0 ? (
                      <ul className="flex flex-wrap gap-2" role="list">
                        {form.fixed_dates.map((d) => (
                          <li
                            key={d}
                            role="listitem"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/50 text-sm font-medium text-blue-900 dark:text-blue-100 shadow-sm"
                          >
                            <span title={d}>{formatIsoDateDisplay(d, i18n.language)}</span>
                            <button
                              type="button"
                              className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40"
                              onClick={() => removeFixedDate(d)}
                              aria-label={t('pricing.removeFixedDateAria', 'Remove {{date}}', {
                                date: formatIsoDateDisplay(d, i18n.language),
                              })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('pricing.noFixedDates', 'No fixed dates yet — add one or more above.')}</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Section 4 */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">{t('pricing.pricing', 'Pricing')}</h3>
                </div>
                <button type="button" onClick={addLineItem} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Plus className="h-4 w-4" /> {t('common.add', 'Add')}
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                    <div className="md:col-span-3">
                      <select
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        value={row.name}
                        onChange={(e) => patchLineItem(row.id, { name: e.target.value })}
                      >
                        {allowedItemNames.map((name) => (
                          <option key={name} value={name}>
                            {seaLineOptionLabel(name, t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <input
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        placeholder={row.name === 'Other Charges' ? t('pricing.otherChargeDescription', 'Description (required)') : t('pricing.description', 'Description')}
                        value={row.description}
                        onChange={(e) => patchLineItem(row.id, { description: e.target.value })}
                        required={row.name === 'Other Charges'}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        placeholder={t('pricing.amount', 'Amount')}
                        value={row.amount}
                        onChange={(e) => patchLineItem(row.id, { amount: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" value={row.currency} onChange={(e) => patchLineItem(row.id, { currency: e.target.value })}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeLineItem(row.id)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 5 */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">{t('pricing.formSectionValidityNotes', 'Validity & Notes')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.validFrom', 'Valid From')}</label>
                  <StructuredDatePicker
                    key={`sea-vf-${offerToEdit?.id ?? 'new'}`}
                    value={form.valid_from}
                    onChange={(v) => updateForm({ valid_from: v })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.validTo', 'Valid To')}</label>
                  <StructuredDatePicker
                    key={`sea-vt-${offerToEdit?.id ?? 'new'}`}
                    value={form.valid_to}
                    onChange={(v) => updateForm({ valid_to: v })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.notes', 'Notes')}</label>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} placeholder={t('pricing.notesPlaceholder', 'Internal notes…')} />
                </div>
              </div>
            </section>
            </>
            ) : (
            <>
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50/50 dark:bg-gray-900/20">
              {sectionTitle(MapPin, t('pricing.formSectionInlandLocation', 'Location'))}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="offer-inland-port">
                    {t('pricing.port', 'Port')}
                  </label>
                  <PortNameAsyncSelect
                    id="offer-inland-port"
                    value={inlandForm.inland_port}
                    onChange={(v) => updateInlandForm({ inland_port: v })}
                    placeholder={t('pricing.filterAllPorts', 'All ports')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.governorate', 'Governorate')}</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    value={inlandForm.inland_gov}
                    onChange={(e) => updateInlandForm({ inland_gov: e.target.value })}
                    required
                  >
                    <option value="">{t('common.select', 'Select')}</option>
                    {INLAND_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="offer-inland-provider">
                    {t('pricing.inlandTransportProvider', 'Transport provider')}
                  </label>
                  <ShippingLineNameAsyncSelect
                    id="offer-inland-provider"
                    serviceScope="inland"
                    value={inlandForm.shipping_line}
                    onChange={(v) => updateInlandForm({ shipping_line: v })}
                    placeholder={t('pricing.filterAllInlandProviders', 'All inland providers')}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('pricing.inlandProviderHint', 'Inland / trucking providers only.')}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.areaOptional', 'Area')}</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    value={inlandForm.inland_area}
                    onChange={(e) => updateInlandForm({ inland_area: e.target.value })}
                    placeholder={t('pricing.areaPlaceholder', 'Optional')}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              {sectionTitle(Truck, t('pricing.formSectionTruckPrice', 'Truck Type & Price'))}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.truckType', 'Truck type')}</label>
                  <InlandTruckTypeAsyncSelect
                    id="offer-inland-truck-type"
                    value={inlandForm.truck_type}
                    onChange={(v) => updateInlandForm({ truck_type: v })}
                    placeholder={t('pricing.filterAllTruckTypes', 'All truck types')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.amount', 'Amount')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    value={inlandForm.price}
                    onChange={(e) => updateInlandForm({ price: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.currency', 'Currency')}</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    value={inlandForm.currency}
                    onChange={(e) => updateInlandForm({ currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">{t('pricing.formSectionValidityNotes', 'Validity & Notes')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.validFrom', 'Valid From')}</label>
                  <StructuredDatePicker
                    key={`in-vf-${offerToEdit?.id ?? 'new'}`}
                    value={inlandForm.valid_from}
                    onChange={(v) => updateInlandForm({ valid_from: v })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.validTo', 'Valid To')}</label>
                  <StructuredDatePicker
                    key={`in-vt-${offerToEdit?.id ?? 'new'}`}
                    value={inlandForm.valid_to}
                    onChange={(v) => updateInlandForm({ valid_to: v })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('pricing.notes', 'Notes')}</label>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={inlandForm.notes} onChange={(e) => updateInlandForm({ notes: e.target.value })} placeholder={t('pricing.notesPlaceholder', 'Internal notes…')} />
                </div>
              </div>
            </section>
            </>
            )}
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" form="offerForm" disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </div>
      </div>

    </div>
  )
}
