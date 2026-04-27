import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Save,
  Plus,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Ship,
  Truck,
} from 'lucide-react'
import '../../Shipments/Shipments.css'
import { useMutateOffer } from '../../../hooks/usePricing'
import { getStoredToken } from '../../Login'
import { listPricingFreightUnitTypes } from '../../../api/pricingFreightUnitTypes'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import PricingRegionAsyncSelect from './PricingRegionAsyncSelect'
import OceanContainerTypeAsyncSelect from './OceanContainerTypeAsyncSelect'
import InlandTruckTypeAsyncSelect from './InlandTruckTypeAsyncSelect'
import DatePicker from '../../../components/DatePicker'
import { formatDate, UI_DATE_FORMAT } from '../../../utils/dateUtils'

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

/** Chip label for stored API dates (YYYY-MM-DD) without UTC shift */
function formatIsoDateDisplay(iso, locale) {
  if (!iso || typeof iso !== 'string') return ''
  const s = iso.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return iso
  const [y, m, d] = s.split('-').map(Number)
  return formatDate(new Date(y, m - 1, d), { locale })
}

/** Same styling as SD Form `DateInput` for flatpickr (primary input hidden; alt shows d/m/Y). */
const OFFER_DATE_PICKER_CLASS =
  'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500'

/** Legacy inland keys when API list is empty */
const LEGACY_INLAND_ORDER = ['t20d', 't40d', 'p20x2', 't40r']

const INLAND_GOVERNORATES = ['القاهرة الكبرى', 'الإسكندرية', 'الدلتا']

const defaultInlandForm = () => ({
  inland_port: '',
  inland_gov: '',
  inland_area: '',
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
  region: '',
  shipping_line: '',
  container_preset: '',
  transit_time_days: '',
  pol_detention: '0',
  pol_demurrage: '0',
  pod_detention: '0',
  pod_demurrage: '0',
  sailing_tab: 'weekly',
  weekly_days: [],
  fixed_dates: [],
  valid_from: '',
  valid_to: '',
  notes: '',
})

const makeSeaCoreRow = (name) => ({ name, amount: '0', currency: 'USD' })

const initialSeaCoreLines = () => DEFAULT_SEA_LINE_NAMES.map((name) => makeSeaCoreRow(name))

const makeCustomChargeItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  amount: '0',
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

const CORE_LINE_ABBR = {
  'Ocean Freight': 'OF',
  THC: 'THC',
  'B/L Fee': 'B/L',
  'Telex Release': 'Telex',
  Power: 'Power',
}

function SeaCoreLineFieldLabel({ name, t }) {
  const k = CANONICAL_SEA_LINE_KEYS[name]
  const abbr = CORE_LINE_ABBR[name] || name
  return (
    <div className="mb-1.5 text-[13px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
      <span lang="ar">{k ? t(`pricing.${k}`, name) : name}</span>
      <span lang="en" className="font-semibold text-blue-700 dark:text-blue-300">
        {' '}
        ({abbr})
      </span>
    </div>
  )
}

/** Shipment Financials–style section: `shipment-fin-card` + static `shipment-fin-card__head` + `__body`. */
function PricingFinCard({ icon: Icon, title, subtitle, headMeta = null, children }) {
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
      <div className="shipment-fin-card__body">{children}</div>
    </div>
  )
}

/**
 * Pricing field labels: Arabic + English/abbreviation in parentheses, e.g. ميناء التحميل (POL).
 * @param {'label'|'p'|'div'|'h4'|'span'} as - wrapper element; use label when htmlFor is set.
 */
function PricingBilingualFieldLabel({
  as: Tag = 'label',
  htmlFor,
  arabicKey,
  arabicDefault,
  englishAbbrKey,
  englishAbbrDefault,
  className = 'mb-1.5 block text-[13px] font-semibold leading-snug text-gray-900 dark:text-gray-100',
}) {
  const { t } = useTranslation()
  const inner = (
    <>
      <span lang="ar">{t(arabicKey, arabicDefault)}</span>
      <span lang="en" className="text-blue-700 dark:text-blue-300 font-semibold">
        {' '}
        ({t(englishAbbrKey, englishAbbrDefault)})
      </span>
    </>
  )
  if (Tag === 'label') {
    return (
      <label htmlFor={htmlFor} className={className}>
        {inner}
      </label>
    )
  }
  return createElement(Tag, { className }, inner)
}

function inferPresetFromPricing(offer) {
  const p = offer?.pricing || {}
  if (p.of20rf?.price != null || p.thc20rf?.price != null) return '20-reefer'
  if (p.of20?.price != null || p.thc20?.price != null) return '20-dry-std'
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
    '20-reefer': { type: 'Reefer', size: '20', height: 'Standard' },
    '40-reefer': { type: 'Reefer', size: '40', height: 'Standard' },
    'flat-rack': { type: 'Dry', size: '40', height: 'Standard' },
    'open-top': { type: 'Dry', size: '40', height: 'Standard' },
  }
  return fb[presetSlug] || fb['40-dry-hq']
}

function inferLegacyPricingCode(itemName, presetSlug, oceanUnitTypes, idx = 0) {
  const def = resolveOceanMeta(presetSlug, oceanUnitTypes)
  const type = def.type
  const size = def.size
  if (itemName === 'Ocean Freight') {
    if (type === 'Reefer') return size === '20' ? 'of20rf' : 'of40rf'
    if (size === '20') return 'of20'
    return 'of40'
  }
  if (itemName === 'THC') {
    if (type === 'Reefer') return size === '20' ? 'thc20rf' : 'thcRf'
    if (size === '20') return 'thc20'
    return 'thc40'
  }
  if (itemName === 'Power') return 'powerDay'
  if (itemName === 'B/L Fee') return 'blFee'
  if (itemName === 'Telex Release') return 'telex'
  return `otherCharge${idx + 1}`
}

/** Format free-time cell for DND storage (numeric days + legacy free text). */
function formatFreeTimeDndCell(v) {
  const s = String(v ?? '').trim()
  if (!s || s === '0') return '0 days'
  if (/^\d+(\.\d+)?$/.test(s)) return `${s} days`
  return s
}

function encodeFreeTimeDnd({ pol_detention, pol_demurrage, pod_detention, pod_demurrage }) {
  const lines = []
  lines.push(
    `POL Detention: ${formatFreeTimeDndCell(pol_detention)} | Demurrage: ${formatFreeTimeDndCell(pol_demurrage)}`
  )
  lines.push(
    `POD Detention: ${formatFreeTimeDndCell(pod_detention)} | Demurrage: ${formatFreeTimeDndCell(pod_demurrage)}`
  )
  return lines.join('\n')
}

function parseFreeTimeDigits(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/^—$/, '')
  if (!s) return '0'
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? String(Number(m[1])) : '0'
}

function parseFreeTimeFromDnd(dnd) {
  const empty = {
    pol_detention: '0',
    pol_demurrage: '0',
    pod_detention: '0',
    pod_demurrage: '0',
  }
  if (!dnd?.trim()) return empty
  const lines = String(dnd).split('\n').filter(Boolean)
  lines.forEach((line) => {
    const upper = line.toUpperCase()
    const detMatch = line.match(/Detention:\s*([^|]+)/i)
    const demMatch = line.match(/Demurrage:\s*(.+)/i)
    const det = parseFreeTimeDigits(detMatch?.[1])
    const dem = parseFreeTimeDigits(demMatch?.[1])
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

function buildSeaPricingStateFromOffer(offer, oceanUnitTypes) {
  const pricing = offer?.pricing || {}
  const preset = inferPresetFromPricing(offer || {})
  const meta = resolveOceanMeta(preset, oceanUnitTypes)
  const coreNames =
    meta.type === 'Reefer' ? [...DEFAULT_SEA_LINE_NAMES, 'Power'] : [...DEFAULT_SEA_LINE_NAMES]
  const seaCoreLines = coreNames.map((name) => {
    const code = inferLegacyPricingCode(name, preset, oceanUnitTypes, 0)
    const item = pricing[code]
    return {
      name,
      amount: item?.price != null && item.price !== '' ? String(item.price) : '0',
      currency: item?.currency || 'USD',
    }
  })
  const usedCodes = new Set(
    coreNames.map((name) => inferLegacyPricingCode(name, preset, oceanUnitTypes, 0))
  )
  const extras = Object.entries(pricing)
    .filter(([code]) => !usedCodes.has(code))
    .sort(([a], [b]) => a.localeCompare(b))
  const descParts = offer?.other_charges ? String(offer.other_charges).split(/\s*\|\s*/) : []
  const seaCustomLines = extras.map(([code, item], idx) => ({
    id: `loaded-${code}-${idx}`,
    name: (descParts[idx] && descParts[idx].trim()) || '',
    amount: item?.price != null && item.price !== '' ? String(item.price) : '0',
    currency: item?.currency || 'USD',
  }))
  return { seaCoreLines, seaCustomLines }
}

export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit, pricingMode = 'sea' }) {
  const { t, i18n } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()
  const [form, setForm] = useState(defaultSeaForm)
  const [inlandForm, setInlandForm] = useState(defaultInlandForm)
  const [seaCoreLines, setSeaCoreLines] = useState(initialSeaCoreLines)
  const [seaCustomLines, setSeaCustomLines] = useState([])
  const [oceanUnitTypes, setOceanUnitTypes] = useState([])
  const [inlandUnitTypes, setInlandUnitTypes] = useState([])
  /** Single sailing date pending add (ISO YYYY-MM-DD from DatePicker) */
  const [draftFixedSailingDate, setDraftFixedSailingDate] = useState('')

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
    if (!isOpen) setDraftFixedSailingDate('')
  }, [isOpen])

  useEffect(() => {
    if (form.sailing_tab !== 'fixed') setDraftFixedSailingDate('')
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
      setSeaCoreLines(initialSeaCoreLines())
      setSeaCustomLines([])
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
      region: offerToEdit.region || '',
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

    const { seaCoreLines: loadedCore, seaCustomLines: loadedCustom } = buildSeaPricingStateFromOffer(
      offerToEdit,
      oceanUnitTypes
    )
    setSeaCoreLines(loadedCore.length ? loadedCore : initialSeaCoreLines())
    setSeaCustomLines(loadedCustom)
  }, [offerToEdit, isOpen, pricingMode, oceanUnitTypes])

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

  const syncSeaCoreLinesForPreset = useCallback(
    (presetSlug) => {
      const meta = resolveOceanMeta(presetSlug, oceanUnitTypes)
      setSeaCoreLines((prev) => {
        const byName = Object.fromEntries(prev.map((r) => [r.name, r]))
        const base = DEFAULT_SEA_LINE_NAMES.map((name) => ({
          name,
          amount: byName[name]?.amount ?? '0',
          currency: byName[name]?.currency ?? 'USD',
        }))
        if (meta.type === 'Reefer') {
          const p = byName.Power || { amount: '0', currency: 'USD' }
          return [...base, { name: 'Power', amount: p.amount, currency: p.currency }]
        }
        return base
      })
    },
    [oceanUnitTypes]
  )

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

  const removeFixedDate = (dateStr) => {
    setForm((prev) => ({ ...prev, fixed_dates: prev.fixed_dates.filter((d) => d !== dateStr) }))
  }

  const clearAllFixedDates = () => {
    setForm((prev) => ({ ...prev, fixed_dates: [] }))
    setDraftFixedSailingDate('')
  }

  const canAddDraftFixedSailingDate = useMemo(() => {
    const d = String(draftFixedSailingDate || '').trim()
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
    return !form.fixed_dates.includes(d)
  }, [draftFixedSailingDate, form.fixed_dates])

  const addDraftFixedSailingDate = () => {
    if (!canAddDraftFixedSailingDate) return
    const d = String(draftFixedSailingDate).trim()
    setForm((prev) => ({ ...prev, fixed_dates: [...prev.fixed_dates, d].sort() }))
    setDraftFixedSailingDate('')
  }

  const patchSeaCoreLine = (name, patch) =>
    setSeaCoreLines((prev) => prev.map((row) => (row.name === name ? { ...row, ...patch } : row)))
  const addCustomCharge = () => setSeaCustomLines((prev) => [...prev, makeCustomChargeItem()])
  const removeCustomCharge = (id) => setSeaCustomLines((prev) => prev.filter((x) => x.id !== id))
  const patchCustomCharge = (id, patch) =>
    setSeaCustomLines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

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
        shipping_line: '',
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

    const parsedCore = seaCoreLines
      .map((row) => {
        const amount = Number(row.amount)
        if (Number.isNaN(amount) || amount < 0) return null
        if (row.name === 'Power' && oceanMeta.type !== 'Reefer') return null
        const code = inferLegacyPricingCode(row.name, form.container_preset, oceanUnitTypes, 0)
        return {
          code,
          name: row.name,
          description: '',
          amount,
          currency: row.currency || 'USD',
        }
      })
      .filter(Boolean)

    let otherIdx = 0
    const parsedCustom = seaCustomLines
      .map((row) => {
        const amount = Number(row.amount)
        if (Number.isNaN(amount) || amount < 0) return null
        const label = (row.name || '').trim()
        if (!label) return null
        const code = inferLegacyPricingCode('Other Charges', form.container_preset, oceanUnitTypes, otherIdx)
        otherIdx += 1
        return {
          code,
          name: 'Other Charges',
          description: label,
          amount,
          currency: row.currency || 'USD',
        }
      })
      .filter(Boolean)

    const parsedItems = [...parsedCore, ...parsedCustom]

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

    const regionTrim = (form.region && String(form.region).trim()) || ''
    const payload = {
      pricing_type: 'sea',
      region: regionTrim || form.pod || form.pol || 'Sea',
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

        <div className="flex-1 overflow-y-auto">
          <div className="shipment-fin-panel shipment-fin-panel--enter">
            {error ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <form id="offerForm" onSubmit={handleSubmit}>
            {effectiveMode === 'sea' ? (
            <div role="region" aria-label={t('pricing.oceanFormStepsAria', 'Ocean freight rate — steps')}>
            <PricingFinCard
              icon={MapPin}
              title={t('pricing.formSectionRouteCarrier', 'Route & Carrier')}
              subtitle={t(
                'pricing.oceanRouteSection1Sub',
                'POL, POD, region, carrier, container type, and transit time (days).'
              )}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0">
                    <PricingBilingualFieldLabel
                      htmlFor="offer-pol"
                      arabicKey="pricing.oceanRoutePolArabic"
                      arabicDefault="ميناء التحميل"
                      englishAbbrKey="pricing.oceanRoutePolEnglishAbbr"
                      englishAbbrDefault="POL"
                    />
                    <PortNameAsyncSelect
                      id="offer-pol"
                      value={form.pol}
                      onChange={(v) => updateForm({ pol: v })}
                      placeholder={t('pricing.selectOrCreatePol', 'Select or create port')}
                      aria-label={t('pricing.oceanRoutePolAria', 'Port of loading (POL)')}
                    />
                  </div>
                  <div className="min-w-0">
                    <PricingBilingualFieldLabel
                      htmlFor="offer-pod"
                      arabicKey="pricing.oceanRoutePodArabic"
                      arabicDefault="ميناء الوصول"
                      englishAbbrKey="pricing.oceanRoutePodEnglishAbbr"
                      englishAbbrDefault="POD"
                    />
                    <PortNameAsyncSelect
                      id="offer-pod"
                      value={form.pod}
                      onChange={(v) => updateForm({ pod: v })}
                      placeholder={t('pricing.selectOrCreatePod', 'Select or create port')}
                      aria-label={t('pricing.oceanRoutePodAria', 'Port of discharge (POD)')}
                    />
                  </div>
                  <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                    <PricingBilingualFieldLabel
                      htmlFor="offer-sea-region"
                      arabicKey="pricing.oceanRouteRegionArabic"
                      arabicDefault="المنطقة"
                      englishAbbrKey="pricing.oceanRouteRegionEnglishAbbr"
                      englishAbbrDefault="Region"
                    />
                    <PricingRegionAsyncSelect
                      id="offer-sea-region"
                      value={form.region}
                      onChange={(v) => updateForm({ region: v })}
                      placeholder={t('pricing.selectOrCreateRegion', 'Select or create region')}
                      aria-label={t('pricing.oceanRouteRegionAria', 'Region')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="min-w-0 xl:col-span-3">
                    <PricingBilingualFieldLabel
                      htmlFor="offer-shipping-line"
                      arabicKey="pricing.oceanRouteCarrierArabic"
                      arabicDefault="الخط الملاحي"
                      englishAbbrKey="pricing.oceanRouteCarrierEnglishAbbr"
                      englishAbbrDefault="Shipping Line"
                    />
                    <ShippingLineNameAsyncSelect
                      id="offer-shipping-line"
                      serviceScope="ocean"
                      value={form.shipping_line}
                      onChange={(v) => updateForm({ shipping_line: v })}
                      placeholder={t('pricing.selectOrCreateShippingLine', 'Select or create shipping line')}
                      aria-label={t('pricing.oceanRouteCarrierAria', 'Shipping line — ocean freight carriers only')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <PricingBilingualFieldLabel
                      htmlFor="offer-container-type"
                      arabicKey="pricing.oceanRouteContainerTypeArabic"
                      arabicDefault="نوع الحاوية"
                      englishAbbrKey="pricing.oceanRouteContainerTypeEnglishAbbr"
                      englishAbbrDefault="Container Type"
                    />
                    <OceanContainerTypeAsyncSelect
                      id="offer-container-type"
                      types={oceanUnitTypes}
                      value={form.container_preset}
                      onChange={(v) => {
                        updateForm({ container_preset: v })
                        syncSeaCoreLinesForPreset(v)
                      }}
                      onTypesUpdated={loadOceanTypes}
                    />
                    <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">{selectedSpec}</p>
                  </div>
                  <div className="min-w-0">
                    <PricingBilingualFieldLabel
                      htmlFor="offer-transit-time"
                      arabicKey="pricing.oceanRouteTransitTimeArabic"
                      arabicDefault="مدة العبور"
                      englishAbbrKey="pricing.oceanRouteTransitTimeEnglishAbbr"
                      englishAbbrDefault="Transit Time"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="offer-transit-time"
                        type="number"
                        min="0"
                        step="1"
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-blue-900/20"
                        value={form.transit_time_days}
                        onChange={(e) => updateForm({ transit_time_days: e.target.value })}
                        placeholder="0"
                        aria-label={t('pricing.oceanRouteTransitTimeAria', 'Transit time (days)')}
                      />
                      <span className="mt-1 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {t('pricing.days', 'days')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </PricingFinCard>

            <PricingFinCard
              icon={Clock}
              title={t('pricing.formSectionFreeTime', 'Free Time')}
              subtitle={t(
                'pricing.oceanFormStep2Desc',
                'Detention and demurrage allowances at POL and POD.'
              )}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/40">
                  <PricingBilingualFieldLabel
                    as="p"
                    className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400 mb-3"
                    arabicKey="pricing.freeTimePolSectionArabic"
                    arabicDefault="وقت الفراغ — ميناء التحميل"
                    englishAbbrKey="pricing.freeTimePolSectionEnglishAbbr"
                    englishAbbrDefault="POL"
                  />
                  <div className="grid gap-3">
                    <div>
                      <PricingBilingualFieldLabel
                        htmlFor="offer-pol-detention"
                        className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block"
                        arabicKey="pricing.freeTimeDetentionArabic"
                        arabicDefault="الاحتجاز"
                        englishAbbrKey="pricing.freeTimeDetentionEnglishAbbr"
                        englishAbbrDefault="Detention"
                      />
                      <input
                        id="offer-pol-detention"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        value={form.pol_detention}
                        onChange={(e) =>
                          updateForm({
                            pol_detention:
                              e.target.value === '' ? '0' : String(Math.max(0, Math.floor(Number(e.target.value) || 0))),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <PricingBilingualFieldLabel
                        htmlFor="offer-pol-demurrage"
                        className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block"
                        arabicKey="pricing.freeTimeDemurrageArabic"
                        arabicDefault="الرسوم الأرضية"
                        englishAbbrKey="pricing.freeTimeDemurrageEnglishAbbr"
                        englishAbbrDefault="Demurrage"
                      />
                      <input
                        id="offer-pol-demurrage"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        value={form.pol_demurrage}
                        onChange={(e) =>
                          updateForm({
                            pol_demurrage:
                              e.target.value === '' ? '0' : String(Math.max(0, Math.floor(Number(e.target.value) || 0))),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/40">
                  <PricingBilingualFieldLabel
                    as="p"
                    className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400 mb-3"
                    arabicKey="pricing.freeTimePodSectionArabic"
                    arabicDefault="وقت الفراغ — ميناء الوصول"
                    englishAbbrKey="pricing.freeTimePodSectionEnglishAbbr"
                    englishAbbrDefault="POD"
                  />
                  <div className="grid gap-3">
                    <div>
                      <PricingBilingualFieldLabel
                        htmlFor="offer-pod-detention"
                        className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block"
                        arabicKey="pricing.freeTimeDetentionArabic"
                        arabicDefault="الاحتجاز"
                        englishAbbrKey="pricing.freeTimeDetentionEnglishAbbr"
                        englishAbbrDefault="Detention"
                      />
                      <input
                        id="offer-pod-detention"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        value={form.pod_detention}
                        onChange={(e) =>
                          updateForm({
                            pod_detention:
                              e.target.value === '' ? '0' : String(Math.max(0, Math.floor(Number(e.target.value) || 0))),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <PricingBilingualFieldLabel
                        htmlFor="offer-pod-demurrage"
                        className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block"
                        arabicKey="pricing.freeTimeDemurrageArabic"
                        arabicDefault="الرسوم الأرضية"
                        englishAbbrKey="pricing.freeTimeDemurrageEnglishAbbr"
                        englishAbbrDefault="Demurrage"
                      />
                      <input
                        id="offer-pod-demurrage"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        value={form.pod_demurrage}
                        onChange={(e) =>
                          updateForm({
                            pod_demurrage:
                              e.target.value === '' ? '0' : String(Math.max(0, Math.floor(Number(e.target.value) || 0))),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PricingFinCard>

            <PricingFinCard
              icon={Ship}
              title={t('pricing.formSectionSailingSchedule', 'Sailing schedule')}
              subtitle={t('pricing.oceanFormStep3Desc', 'Weekly repeating sailings or fixed calendar dates.')}
            >
              <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-3 dark:border-gray-700">
                <button
                  type="button"
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${form.sailing_tab === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                  onClick={() => updateForm({ sailing_tab: 'fixed' })}
                >
                  {t('pricing.sailingTabFixedBilingual', 'تواريخ ثابتة (Fixed dates)')}
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${form.sailing_tab === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                  onClick={() => updateForm({ sailing_tab: 'weekly' })}
                >
                  {t('pricing.sailingTabWeeklyBilingual', 'أسبوعي (Weekly)')}
                </button>
              </div>

              {form.sailing_tab === 'weekly' ? (
                <div className="space-y-4">
                  <p id="offer-weekly-sailing-hint" className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(
                      'pricing.weeklySailingMultiHint',
                      'Select one or more weekdays (for example Monday and Thursday). Sailings repeat every week on each selected day.'
                    )}
                  </p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                        <PricingBilingualFieldLabel
                          as="span"
                          className="text-xs font-bold text-gray-600 dark:text-gray-400"
                          arabicKey="pricing.weeklySectionTitleArabic"
                          arabicDefault="أيام الإبحار الأسبوعية"
                          englishAbbrKey="pricing.weeklySectionTitleEnglishAbbr"
                          englishAbbrDefault="Weekly"
                        />
                        {form.weekly_days.length > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
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
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
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
                  <p id="offer-fixed-dates-hint" className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(
                      'pricing.fixedDatesMultiHint',
                      'Pick one sailing date at a time, then add it. You can add several dates; remove any chip below if needed.'
                    )}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 flex-1 sm:max-w-xs">
                      <PricingBilingualFieldLabel
                        htmlFor="offer-sailing-fixed-draft"
                        className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
                        arabicKey="pricing.sailingFixedSingleDateArabic"
                        arabicDefault="تاريخ الإبحار"
                        englishAbbrKey="pricing.sailingFixedSingleDateEnglishAbbr"
                        englishAbbrDefault="Sailing date"
                      />
                      <DatePicker
                        key={`fixed-sail-${offerToEdit?.id ?? 'new'}-${form.sailing_tab}`}
                        id="offer-sailing-fixed-draft"
                        className={OFFER_DATE_PICKER_CLASS}
                        value={draftFixedSailingDate}
                        onChange={setDraftFixedSailingDate}
                        locale={i18n.language}
                        placeholder={UI_DATE_FORMAT}
                      />
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canAddDraftFixedSailingDate}
                      title={
                        draftFixedSailingDate &&
                        form.fixed_dates.includes(String(draftFixedSailingDate).trim())
                          ? t('pricing.sailingDateAlreadyAdded', 'This date is already listed')
                          : undefined
                      }
                      onClick={addDraftFixedSailingDate}
                      aria-describedby="offer-fixed-dates-hint"
                    >
                      {t('pricing.addSailingDate', 'Add date')}
                    </button>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                        <PricingBilingualFieldLabel
                          as="span"
                          className="text-xs font-bold text-gray-600 dark:text-gray-400"
                          arabicKey="pricing.fixedDatesSelectedTitleArabic"
                          arabicDefault="مواعيد الإبحار المختارة"
                          englishAbbrKey="pricing.fixedDatesSelectedTitleEnglishAbbr"
                          englishAbbrDefault="Selected dates"
                        />
                        {form.fixed_dates.length > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
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
                            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 shadow-sm dark:border-blue-900/50 dark:bg-gray-800 dark:text-blue-100"
                          >
                            <span title={d}>{formatIsoDateDisplay(d, i18n.language)}</span>
                            <button
                              type="button"
                              className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40"
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('pricing.noFixedDates', 'No fixed dates yet — add one or more above.')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </PricingFinCard>

            <PricingFinCard
              icon={DollarSign}
              title={t('pricing.formSectionPricingBreakdown', 'Pricing breakdown')}
              subtitle={t(
                'pricing.oceanPricingBreakdownSub',
                'Core ocean charges and optional additional lines.'
              )}
              headMeta={
                <button
                  type="button"
                  onClick={addCustomCharge}
                  className="shipment-fin-btn shipment-fin-btn--secondary inline-flex items-center gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> {t('pricing.addCustomCharge', 'Add charge')}
                </button>
              }
            >
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('pricing.oceanPricingCoreTitle', 'Core charges')}
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {seaCoreLines.map((row) => (
                      <div
                        key={row.name}
                        className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/40"
                      >
                        <SeaCoreLineFieldLabel name={row.name} t={t} />
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5 sm:items-end">
                          <div className="sm:col-span-3">
                            <PricingBilingualFieldLabel
                              as="div"
                              className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                              arabicKey="pricing.lineAmountArabic"
                              arabicDefault="المبلغ"
                              englishAbbrKey="pricing.lineAmountEnglishAbbr"
                              englishAbbrDefault="Amount"
                            />
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={row.amount}
                              onChange={(e) => patchSeaCoreLine(row.name, { amount: e.target.value })}
                              placeholder="0"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <PricingBilingualFieldLabel
                              as="div"
                              className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                              arabicKey="pricing.lineCurrencyArabic"
                              arabicDefault="العملة"
                              englishAbbrKey="pricing.lineCurrencyEnglishAbbr"
                              englishAbbrDefault="Currency"
                            />
                            <select
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={row.currency}
                              onChange={(e) => patchSeaCoreLine(row.name, { currency: e.target.value })}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5 dark:border-gray-700">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('pricing.oceanPricingCustomTitle', 'Custom charges')}
                  </p>
                  {seaCustomLines.length === 0 ? (
                    <p className="shipment-fin-empty-inline m-0 text-sm">
                      {t('pricing.oceanPricingCustomEmpty', 'No extra charges — use Add charge if needed.')}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden gap-2 md:grid md:grid-cols-12 md:px-1">
                        <div className="md:col-span-4">
                          <PricingBilingualFieldLabel
                            as="div"
                            className="text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                            arabicKey="pricing.customChargeNameArabic"
                            arabicDefault="اسم الرسوم"
                            englishAbbrKey="pricing.customChargeNameEnglishAbbr"
                            englishAbbrDefault="Name"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <PricingBilingualFieldLabel
                            as="div"
                            className="text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                            arabicKey="pricing.lineAmountArabic"
                            arabicDefault="المبلغ"
                            englishAbbrKey="pricing.lineAmountEnglishAbbr"
                            englishAbbrDefault="Amount"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <PricingBilingualFieldLabel
                            as="div"
                            className="text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                            arabicKey="pricing.lineCurrencyArabic"
                            arabicDefault="العملة"
                            englishAbbrKey="pricing.lineCurrencyEnglishAbbr"
                            englishAbbrDefault="Currency"
                          />
                        </div>
                        <div className="md:col-span-2" aria-hidden />
                      </div>
                      {seaCustomLines.map((row) => (
                        <div key={row.id} className="grid grid-cols-1 items-start gap-2 md:grid-cols-12">
                          <div className="md:col-span-4">
                            <PricingBilingualFieldLabel
                              htmlFor={`custom-charge-name-${row.id}`}
                              className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400 md:hidden"
                              arabicKey="pricing.customChargeNameArabic"
                              arabicDefault="اسم الرسوم"
                              englishAbbrKey="pricing.customChargeNameEnglishAbbr"
                              englishAbbrDefault="Name"
                            />
                            <input
                              id={`custom-charge-name-${row.id}`}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                              placeholder={t('pricing.customChargeNamePlaceholder', 'Charge name')}
                              value={row.name}
                              onChange={(e) => patchCustomCharge(row.id, { name: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                              placeholder={t('pricing.amount', 'Amount')}
                              value={row.amount}
                              onChange={(e) => patchCustomCharge(row.id, { amount: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <select
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                              value={row.currency}
                              onChange={(e) => patchCustomCharge(row.id, { currency: e.target.value })}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex justify-end md:col-span-2">
                            <button
                              type="button"
                              onClick={() => removeCustomCharge(row.id)}
                              className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                              aria-label={t('pricing.removeCustomChargeAria', 'Remove charge')}
                            >
                              <Trash2 className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PricingFinCard>

            <PricingFinCard
              icon={FileText}
              title={t('pricing.formSectionValidityNotes', 'Validity & Notes')}
              subtitle={t(
                'pricing.oceanFormStep5Desc',
                'When this rate applies and any internal notes for your team.'
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <PricingBilingualFieldLabel
                    className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    as="div"
                    arabicKey="pricing.validityFromArabic"
                    arabicDefault="صالح من"
                    englishAbbrKey="pricing.validityFromEnglishAbbr"
                    englishAbbrDefault="Valid From"
                  />
                  <DatePicker
                    key={`sea-vf-${offerToEdit?.id ?? 'new'}`}
                    id="offer-sea-valid-from"
                    className={OFFER_DATE_PICKER_CLASS}
                    value={form.valid_from}
                    onChange={(v) => updateForm({ valid_from: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
                <div>
                  <PricingBilingualFieldLabel
                    className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    as="div"
                    arabicKey="pricing.validityToArabic"
                    arabicDefault="صالح حتى"
                    englishAbbrKey="pricing.validityToEnglishAbbr"
                    englishAbbrDefault="Valid To"
                  />
                  <DatePicker
                    key={`sea-vt-${offerToEdit?.id ?? 'new'}`}
                    id="offer-sea-valid-to"
                    className={OFFER_DATE_PICKER_CLASS}
                    value={form.valid_to}
                    onChange={(v) => updateForm({ valid_to: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
                <div className="md:col-span-2">
                  <PricingBilingualFieldLabel
                    htmlFor="offer-sea-notes"
                    className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    arabicKey="pricing.validityNotesArabic"
                    arabicDefault="ملاحظات"
                    englishAbbrKey="pricing.validityNotesEnglishAbbr"
                    englishAbbrDefault="Notes"
                  />
                  <textarea id="offer-sea-notes" rows={4} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} placeholder={t('pricing.notesPlaceholder', 'Internal notes…')} />
                </div>
              </div>
            </PricingFinCard>
            </div>
            ) : (
            <>
            <PricingFinCard
              icon={MapPin}
              title={t('pricing.formSectionInlandRoute', 'Route')}
              subtitle={t(
                'pricing.formSectionInlandRouteSub',
                'Port, governorate, and optional delivery area in one row.'
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="min-w-0">
                  <PricingBilingualFieldLabel
                    htmlFor="offer-inland-port"
                    arabicKey="pricing.inlandPortArabic"
                    arabicDefault="الميناء"
                    englishAbbrKey="pricing.inlandPortEnglishAbbr"
                    englishAbbrDefault="Port"
                  />
                  <PortNameAsyncSelect
                    id="offer-inland-port"
                    value={inlandForm.inland_port}
                    onChange={(v) => updateInlandForm({ inland_port: v })}
                    placeholder={t('pricing.filterAllPorts', 'All ports')}
                  />
                </div>
                <div className="min-w-0">
                  <PricingBilingualFieldLabel
                    htmlFor="offer-inland-gov"
                    arabicKey="pricing.inlandGovernorateArabic"
                    arabicDefault="المحافظة"
                    englishAbbrKey="pricing.inlandGovernorateEnglishAbbr"
                    englishAbbrDefault="Governorate"
                  />
                  <select
                    id="offer-inland-gov"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={inlandForm.inland_gov}
                    onChange={(e) => updateInlandForm({ inland_gov: e.target.value })}
                    required
                  >
                    <option value="">{t('common.select', 'Select')}</option>
                    {INLAND_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <PricingBilingualFieldLabel
                    htmlFor="offer-inland-area"
                    arabicKey="pricing.inlandAreaArabic"
                    arabicDefault="المنطقة"
                    englishAbbrKey="pricing.inlandAreaEnglishAbbr"
                    englishAbbrDefault="Area"
                  />
                  <input
                    id="offer-inland-area"
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={inlandForm.inland_area}
                    onChange={(e) => updateInlandForm({ inland_area: e.target.value })}
                    placeholder={t('pricing.areaPlaceholder', 'Optional')}
                  />
                </div>
              </div>
            </PricingFinCard>

            <PricingFinCard
              icon={Truck}
              title={t('pricing.formSectionInlandVehiclePricing', 'Vehicle & pricing')}
              subtitle={t(
                'pricing.formSectionInlandVehiclePricingSub',
                'Truck type and rate — default currency EGP; change if needed.'
              )}
            >
              <div className="space-y-5">
                <div className="min-w-0">
                  <PricingBilingualFieldLabel
                    htmlFor="offer-inland-truck-type"
                    arabicKey="pricing.inlandTruckTypeArabic"
                    arabicDefault="نوع الشاحنة"
                    englishAbbrKey="pricing.inlandTruckTypeEnglishAbbr"
                    englishAbbrDefault="Truck type"
                  />
                  <InlandTruckTypeAsyncSelect
                    id="offer-inland-truck-type"
                    value={inlandForm.truck_type}
                    onChange={(v) => updateInlandForm({ truck_type: v })}
                    placeholder={t('pricing.filterAllTruckTypes', 'All truck types')}
                  />
                </div>
                <div className="rounded-xl border-2 border-blue-200/90 bg-blue-50/50 p-4 dark:border-blue-800/60 dark:bg-blue-950/25">
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 flex-1 sm:min-w-[12rem]">
                      <PricingBilingualFieldLabel
                        htmlFor="offer-inland-price"
                        className="mb-1 text-[13px] font-bold text-blue-900 dark:text-blue-100"
                        arabicKey="pricing.inlandRateArabic"
                        arabicDefault="السعر / التعرفة"
                        englishAbbrKey="pricing.inlandRateEnglishAbbr"
                        englishAbbrDefault="Price / rate"
                      />
                      <input
                        id="offer-inland-price"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="w-full rounded-lg border-2 border-blue-300/80 bg-white px-4 py-3 text-2xl font-bold tabular-nums tracking-tight text-blue-950 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-blue-700/80 dark:bg-gray-900 dark:text-blue-50 dark:focus:border-blue-400"
                        value={inlandForm.price}
                        onChange={(e) => updateInlandForm({ price: e.target.value })}
                        placeholder="0"
                        required
                        aria-label={t('pricing.inlandPriceAria', 'Inland transport price or rate')}
                      />
                    </div>
                    <div className="w-full min-w-[7.5rem] sm:w-36">
                      <PricingBilingualFieldLabel
                        htmlFor="offer-inland-currency"
                        className="mb-1 text-[13px] font-semibold text-gray-800 dark:text-gray-200"
                        arabicKey="pricing.inlandCurrencyArabic"
                        arabicDefault="العملة"
                        englishAbbrKey="pricing.inlandCurrencyEnglishAbbr"
                        englishAbbrDefault="Currency"
                      />
                      <select
                        id="offer-inland-currency"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base font-semibold dark:border-gray-600 dark:bg-gray-800"
                        value={inlandForm.currency}
                        onChange={(e) => updateInlandForm({ currency: e.target.value })}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </PricingFinCard>

            <PricingFinCard
              icon={FileText}
              title={t('pricing.formSectionValidityNotes', 'Validity & Notes')}
              subtitle={t(
                'pricing.inlandValidityNotesSub',
                'Valid from is required; end date and notes are optional.'
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <PricingBilingualFieldLabel
                    as="div"
                    arabicKey="pricing.validityFromArabic"
                    arabicDefault="صالح من"
                    englishAbbrKey="pricing.validityFromEnglishAbbr"
                    englishAbbrDefault="Valid From"
                  />
                  <DatePicker
                    key={`in-vf-${offerToEdit?.id ?? 'new'}`}
                    id="offer-inland-valid-from"
                    className={OFFER_DATE_PICKER_CLASS}
                    value={inlandForm.valid_from}
                    onChange={(v) => updateInlandForm({ valid_from: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
                <div>
                  <PricingBilingualFieldLabel
                    as="div"
                    arabicKey="pricing.validityToArabic"
                    arabicDefault="صالح حتى"
                    englishAbbrKey="pricing.validityToEnglishAbbr"
                    englishAbbrDefault="Valid To"
                  />
                  <DatePicker
                    key={`in-vt-${offerToEdit?.id ?? 'new'}`}
                    id="offer-inland-valid-to"
                    className={OFFER_DATE_PICKER_CLASS}
                    value={inlandForm.valid_to}
                    onChange={(v) => updateInlandForm({ valid_to: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(
                      'pricing.inlandValidToOpenEndedHint',
                      'Leave Valid to empty to keep this price active with no end date.'
                    )}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <PricingBilingualFieldLabel
                    htmlFor="offer-inland-notes"
                    arabicKey="pricing.validityNotesArabic"
                    arabicDefault="ملاحظات"
                    englishAbbrKey="pricing.validityNotesEnglishAbbr"
                    englishAbbrDefault="Notes"
                  />
                  <textarea
                    id="offer-inland-notes"
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={inlandForm.notes}
                    onChange={(e) => updateInlandForm({ notes: e.target.value })}
                    placeholder={t('pricing.notesPlaceholder', 'Internal notes…')}
                  />
                </div>
              </div>
            </PricingFinCard>
            </>
            )}
          </form>
          </div>
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
