import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Snowflake, Zap, CheckCircle2 } from 'lucide-react'
import '../../Clients/ClientDetailModal.css'
import '../../Shipments/Shipments.css'
import { useMutateOffer } from '../../../hooks/usePricing'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import PricingRegionAsyncSelect from './PricingRegionAsyncSelect'
import { DEFAULT_INLAND_TRUCK_PRESETS } from './inlandVehiclePresets'
import InlandLocationAsyncSelect from './InlandLocationAsyncSelect'
import DatePicker from '../../../components/DatePicker'
import { formatDate, UI_DATE_FORMAT } from '../../../utils/dateUtils'
import {
  displayNumericInputValue,
  formatOptionalNonNegativeInt,
  parseOptionalAmount,
  priceToFormString,
} from '../utils/pricingFormNumeric'
import {
  clearPricingOfferDraft,
  readPricingOfferDraft,
  writePricingOfferDraft,
} from '../utils/pricingOfferDraftStorage'

/** Canonical weekday names stored in API (`weekly_sailing_days` comma-separated); sort order Sat → Fri */
const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

/**
 * Fixed container presets for sea freight offers (slugs align with `resolveOceanMeta` fallbacks
 * and `inferPresetFromPricing`).
 */
const SEA_OCEAN_UNIT_TYPES = Object.freeze([
  { slug: '20-dry-std', label: "20' Dry" },
  { slug: '40-dry-std', label: "40' Dry" },
  { slug: '40-dry-hq', label: "40' High Cube" },
  { slug: '20-reefer', label: "20' Reefer" },
  { slug: '40-reefer', label: "40' Reefer" },
  { slug: 'flat-rack', label: 'Flat Rack' },
  { slug: 'open-top', label: 'Open Top' },
])

const CURRENCIES = ['EGP', 'USD', 'EUR']

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

/** Legacy inland keys when API list is empty */
const LEGACY_INLAND_ORDER = ['t20d', 't40d', 'p20x2', 't40r']

/** Legacy `pricing` keys that may still appear on saved inland offers */
const LEGACY_INLAND_TRUCK_KEYS = new Set([
  ...LEGACY_INLAND_ORDER,
  'p20x1',
  'p40hq',
  'p40rf',
  't40hq',
  't20r',
  'reefer-container-20',
])

const defaultInlandForm = () => ({
  inland_port: '',
  inland_gov: '',
  inland_area: '',
  truck_type: DEFAULT_INLAND_TRUCK_PRESETS[0].slug,
  price: '',
  currency: 'EGP',
  generator_price: '',
  generator_currency: 'EGP',
  valid_from: '',
  valid_to: '',
  notes: '',
})

function inferInlandTruckFromPricing(pricing, mergedInlandTypes = []) {
  const p = pricing || {}
  const order = (mergedInlandTypes || []).map((x) => x.slug)
  for (const slug of order) {
    const row = p[slug]
    if (row != null && row.price != null && row.price !== '') return slug
  }
  const legacyReefer = p['reefer-container-20']
  if (legacyReefer != null && legacyReefer.price != null && legacyReefer.price !== '') return 'reefer-container-40'
  for (const code of LEGACY_INLAND_ORDER) {
    const row = p[code]
    if (row != null && row.price != null && row.price !== '') return code
  }
  const keys = ['p20x1', 'p40hq', 'p40rf', 't40hq', 't20r']
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
  return order[0] || DEFAULT_INLAND_TRUCK_PRESETS[0].slug
}

function inlandPriceForTruck(pricing, truckId) {
  const p = pricing || {}
  const direct = p[truckId]
  if (direct?.price != null && direct.price !== '') return direct
  if (truckId === 'reefer-container-40') {
    const legacy = p['reefer-container-20']
    if (legacy?.price != null && legacy.price !== '') return legacy
  }
  if (truckId === 't20d' && p.p20x1?.price != null) return p.p20x1
  if (truckId === 't40d' && (p.t40hq?.price != null || p.p40hq?.price != null)) return p.t40hq || p.p40hq
  if (truckId === 't40r' && p.p40rf?.price != null) return p.p40rf
  return direct
}

function isInlandReeferTruck(truckId, inlandTypes = []) {
  const s = String(truckId || '').toLowerCase()
  if (s === 't40r' || s === 'p40rf' || s === 't20r') return true
  if (s.includes('reefer') || s.includes('refrigerated')) return true
  const row = inlandTypes.find((x) => String(x.slug) === String(truckId))
  if (row) {
    if (/reefer|refrigerat/i.test(String(row.label || ''))) return true
    const mt = row.meta?.type != null ? String(row.meta.type).toLowerCase() : ''
    if (mt === 'reefer' || mt === 'refrigerated') return true
  }
  return false
}

/** 40′ Reefer preset — generator add-on is not shown or submitted. */
function isInland40ReeferContainer(truckId) {
  return String(truckId || '') === 'reefer-container-40'
}

/** Legacy / other reefer slugs still use generator fields when applicable. */
function inlandTruckNeedsGeneratorFields(truckId, inlandTypes) {
  return isInlandReeferTruck(truckId, inlandTypes) && !isInland40ReeferContainer(truckId)
}

const defaultSeaForm = () => ({
  pricing_type: 'sea',
  pol: '',
  pod: '',
  region: '',
  shipping_line: '',
  container_preset: '',
  transit_time_days: '',
  pol_detention: '',
  pol_demurrage: '',
  pod_detention: '',
  pod_demurrage: '',
  sailing_tab: 'fixed',
  weekly_days: [],
  fixed_dates: [],
  valid_from: '',
  valid_to: '',
  notes: '',
})

const makeSeaCoreRow = (name) => ({ name, amount: '', currency: 'USD' })

const initialSeaCoreLines = () => DEFAULT_SEA_LINE_NAMES.map((name) => makeSeaCoreRow(name))

const makeCustomChargeItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  amount: '',
  currency: 'USD',
})

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
  if (itemName === 'PTI') return 'pti'
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

/** Embedded in offer notes — free power days for reefers (no DB column). */

function stripPowerFreeDaysFromNotes(notes) {
  let s = String(notes || '')
  s = s.replace(/\n\n__REEFER_POWER_FREE_DAYS__=\d+__/g, '')
  s = s.replace(/^__REEFER_POWER_FREE_DAYS__=\d+__(\n\n|\n)?/m, '')
  return s.trim()
}

function extractPowerFreeDaysFromNotes(notes) {
  const m = String(notes || '').match(/__REEFER_POWER_FREE_DAYS__=(\d+)__/)
  return m ? m[1] : ''
}

function mergePowerFreeDaysIntoNotes(notes, daysRaw) {
  const base = stripPowerFreeDaysFromNotes(notes)
  const d = String(daysRaw ?? '').trim()
  const n = d === '' ? 0 : Math.max(0, Math.floor(Number(d) || 0))
  if (!n) return base
  const marker = `__REEFER_POWER_FREE_DAYS__=${n}__`
  return base ? `${base}\n\n${marker}` : marker
}

function parseFreeTimeDigits(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/^—$/, '')
  if (!s) return ''
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? String(Number(m[1])) : ''
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
      amount: priceToFormString(item?.price),
      currency: item?.currency || 'USD',
    }
  })
  const usedCodes = new Set(
    coreNames.map((name) => inferLegacyPricingCode(name, preset, oceanUnitTypes, 0))
  )
  if (meta.type === 'Reefer') {
    usedCodes.add('pti')
  }
  const extras = Object.entries(pricing)
    .filter(([code]) => !usedCodes.has(code))
    .sort(([a], [b]) => a.localeCompare(b))
  const descParts = offer?.other_charges ? String(offer.other_charges).split(/\s*\|\s*/) : []
  const seaCustomLines = extras.map(([code, item], idx) => ({
    id: `loaded-${code}-${idx}`,
    name: (descParts[idx] && descParts[idx].trim()) || '',
    amount: priceToFormString(item?.price),
    currency: item?.currency || 'USD',
  }))
  return { seaCoreLines, seaCustomLines }
}

const defaultReeferExtras = () => ({
  pti_amount: '',
  pti_currency: 'USD',
  power_free_days: '',
})

/** Collapsible section — shipment-fin-card parity (details default open). */
function PricingFinSection({ title, subtitle, children }) {
  return (
    <details className="shipment-fin-card pricing-fin-section" open>
      <summary className="shipment-fin-card__head pricing-fin-section__summary">
        <div className="shipment-fin-card__title">{title}</div>
        {subtitle ? <div className="shipment-fin-card__sub">{subtitle}</div> : null}
      </summary>
      <div className="shipment-fin-card__body pricing-fin-section__body">{children}</div>
    </details>
  )
}

export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit, pricingMode = 'sea' }) {
  const { t, i18n } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()
  const [form, setForm] = useState(defaultSeaForm)
  const [inlandForm, setInlandForm] = useState(defaultInlandForm)
  const [seaCoreLines, setSeaCoreLines] = useState(initialSeaCoreLines)
  const [seaCustomLines, setSeaCustomLines] = useState([])
  const [reeferExtras, setReeferExtras] = useState(() => defaultReeferExtras())
  /** Single sailing date pending add (ISO YYYY-MM-DD from DatePicker) */
  const [draftFixedSailingDate, setDraftFixedSailingDate] = useState('')
  const [draftRestoredBanner, setDraftRestoredBanner] = useState(false)

  const mergedInlandUnitTypes = useMemo(
    () => DEFAULT_INLAND_TRUCK_PRESETS.map((p) => ({ slug: p.slug, label: p.label, sort_order: 0 })),
    [],
  )

  const effectiveMode = useMemo(
    () => offerToEdit?.pricing_type ?? pricingMode ?? 'sea',
    [offerToEdit?.pricing_type, pricingMode]
  )

  useEffect(() => {
    if (!isOpen) {
      setDraftFixedSailingDate('')
      setDraftRestoredBanner(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!draftRestoredBanner || !isOpen) return
    const timer = setTimeout(() => setDraftRestoredBanner(false), 6000)
    return () => clearTimeout(timer)
  }, [draftRestoredBanner, isOpen])

  useEffect(() => {
    if (form.sailing_tab !== 'fixed') setDraftFixedSailingDate('')
  }, [form.sailing_tab])

  useEffect(() => {
    if (effectiveMode !== 'sea') return
    setForm((f) => {
      const slugs = new Set(SEA_OCEAN_UNIT_TYPES.map((x) => x.slug))
      if (f.container_preset && slugs.has(f.container_preset)) return f
      return { ...f, container_preset: SEA_OCEAN_UNIT_TYPES[0].slug }
    })
  }, [effectiveMode])

  useEffect(() => {
    if (effectiveMode !== 'inland' || !mergedInlandUnitTypes.length) return
    setInlandForm((f) => {
      const tt = f.truck_type === 'reefer-container-20' ? 'reefer-container-40' : f.truck_type
      const slugs = new Set(mergedInlandUnitTypes.map((x) => x.slug))
      if (slugs.has(tt) || LEGACY_INLAND_TRUCK_KEYS.has(tt)) {
        if (tt === f.truck_type) return f
        return { ...f, truck_type: tt }
      }
      return { ...f, truck_type: mergedInlandUnitTypes[0].slug }
    })
  }, [effectiveMode, mergedInlandUnitTypes])

  useEffect(() => {
    if (!isOpen) return
    const mode = offerToEdit?.pricing_type ?? pricingMode ?? 'sea'
    if (mode !== 'inland') return

    if (!offerToEdit) {
      const saved = readPricingOfferDraft('inland')
      if (saved?.inlandForm) {
        setInlandForm({ ...defaultInlandForm(), ...saved.inlandForm })
        setDraftRestoredBanner(true)
        return
      }
      setInlandForm(defaultInlandForm())
      return
    }
    const truckId = inferInlandTruckFromPricing(offerToEdit.pricing, mergedInlandUnitTypes)
    const row = inlandPriceForTruck(offerToEdit.pricing, truckId)
    const generator = offerToEdit.pricing?.generator
    setInlandForm({
      inland_port: offerToEdit.inland_port || '',
      inland_gov: offerToEdit.inland_gov || offerToEdit.region || '',
      inland_area: offerToEdit.inland_city || offerToEdit.destination || '',
      truck_type: truckId,
      price: row?.price != null && row.price !== '' ? String(row.price) : '',
      currency: row?.currency || 'EGP',
      generator_price: generator?.price != null && generator.price !== '' ? String(generator.price) : '',
      generator_currency: generator?.currency || 'EGP',
      valid_from: offerToEdit.valid_from ? String(offerToEdit.valid_from).slice(0, 10) : '',
      valid_to: offerToEdit.valid_to ? String(offerToEdit.valid_to).slice(0, 10) : '',
      notes: offerToEdit.notes || '',
    })
  }, [offerToEdit, isOpen, pricingMode, mergedInlandUnitTypes])

  useEffect(() => {
    if (!isOpen) return
    const mode = offerToEdit?.pricing_type ?? pricingMode ?? 'sea'
    if (mode !== 'sea') return

    if (!offerToEdit) {
      const saved = readPricingOfferDraft('sea')
      if (saved?.form) {
        setForm({ ...defaultSeaForm(), ...saved.form })
        setSeaCoreLines(
          Array.isArray(saved.seaCoreLines) && saved.seaCoreLines.length
            ? saved.seaCoreLines
            : initialSeaCoreLines()
        )
        setSeaCustomLines(Array.isArray(saved.seaCustomLines) ? saved.seaCustomLines : [])
        setReeferExtras({ ...defaultReeferExtras(), ...(saved.reeferExtras || {}) })
        setDraftFixedSailingDate(saved.draftFixedSailingDate || '')
        setDraftRestoredBanner(true)
        return
      }
      setForm(defaultSeaForm())
      setSeaCoreLines(initialSeaCoreLines())
      setSeaCustomLines([])
      setReeferExtras(defaultReeferExtras())
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

    const rawNotes = offerToEdit.notes || ''
    const pti = offerToEdit.pricing?.pti
    setReeferExtras({
      pti_amount: priceToFormString(pti?.price),
      pti_currency: pti?.currency || 'USD',
      power_free_days: extractPowerFreeDaysFromNotes(rawNotes) || '',
    })

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
      notes: stripPowerFreeDaysFromNotes(rawNotes),
    })

    const { seaCoreLines: loadedCore, seaCustomLines: loadedCustom } = buildSeaPricingStateFromOffer(
      offerToEdit,
      SEA_OCEAN_UNIT_TYPES
    )
    setSeaCoreLines(loadedCore.length ? loadedCore : initialSeaCoreLines())
    setSeaCustomLines(loadedCustom)
  }, [offerToEdit, isOpen, pricingMode])

  const oceanMeta = useMemo(
    () => resolveOceanMeta(form.container_preset, SEA_OCEAN_UNIT_TYPES),
    [form.container_preset]
  )

  const seaPowerRow = useMemo(() => seaCoreLines.find((r) => r.name === 'Power'), [seaCoreLines])

  const syncSeaCoreLinesForPreset = useCallback(
    (presetSlug) => {
      const meta = resolveOceanMeta(presetSlug, SEA_OCEAN_UNIT_TYPES)
      setSeaCoreLines((prev) => {
        const byName = Object.fromEntries(prev.map((r) => [r.name, r]))
        const base = DEFAULT_SEA_LINE_NAMES.map((name) => ({
          name,
          amount: byName[name]?.amount ?? '',
          currency: byName[name]?.currency ?? 'USD',
        }))
        if (meta.type === 'Reefer') {
          const p = byName.Power || { amount: '', currency: 'USD' }
          return [...base, { name: 'Power', amount: p.amount, currency: p.currency }]
        }
        return base
      })
    },
    []
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

  const removeFixedDate = (dateStr) => {
    setForm((prev) => ({ ...prev, fixed_dates: prev.fixed_dates.filter((d) => d !== dateStr) }))
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

  const draftPayload = useMemo(() => {
    if (effectiveMode === 'inland') {
      return { inlandForm }
    }
    return {
      form,
      seaCoreLines,
      seaCustomLines,
      reeferExtras,
      draftFixedSailingDate,
    }
  }, [effectiveMode, form, inlandForm, seaCoreLines, seaCustomLines, reeferExtras, draftFixedSailingDate])

  useEffect(() => {
    if (!isOpen || offerToEdit) return
    const timer = setTimeout(() => {
      writePricingOfferDraft(effectiveMode, draftPayload)
    }, 450)
    return () => clearTimeout(timer)
  }, [isOpen, offerToEdit, effectiveMode, draftPayload])

  const handleDismiss = useCallback(() => {
    onClose()
  }, [onClose])

  const handleCancel = useCallback(() => {
    clearPricingOfferDraft(effectiveMode)
    setDraftRestoredBanner(false)
    onClose()
  }, [effectiveMode, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (effectiveMode === 'inland') {
      const gov = inlandForm.inland_gov.trim()
      const port = inlandForm.inland_port.trim()
      const amount = parseOptionalAmount(inlandForm.price)
      if (!gov || !port || amount == null || amount < 0) return

      const needsGenerator = inlandTruckNeedsGeneratorFields(inlandForm.truck_type, mergedInlandUnitTypes)
      if (needsGenerator) {
        const generatorAmount = parseOptionalAmount(inlandForm.generator_price)
        if (generatorAmount == null || generatorAmount < 0) return
      }

      const searchPod = [port, inlandForm.inland_area.trim(), gov].filter(Boolean).join(' ')
      const inlandPricing = {
        [inlandForm.truck_type]: {
          price: amount,
          currency: inlandForm.currency || 'EGP',
        },
      }
      if (needsGenerator) {
        const generatorAmount = parseOptionalAmount(inlandForm.generator_price)
        inlandPricing.generator = {
          price: generatorAmount,
          currency: inlandForm.generator_currency || 'EGP',
        }
      }

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
        pricing: inlandPricing,
      }

      try {
        if (offerToEdit?.id) await update(offerToEdit.id, payload)
        else await create(payload)
        clearPricingOfferDraft('inland')
        onSuccess?.()
        onClose()
      } catch (err) {
        console.error(err)
      }
      return
    }

    const parsedCore = seaCoreLines
      .map((row) => {
        const amount = parseOptionalAmount(row.amount)
        if (amount == null || amount < 0) return null
        if (row.name === 'Power' && oceanMeta.type !== 'Reefer') return null
        const code = inferLegacyPricingCode(row.name, form.container_preset, SEA_OCEAN_UNIT_TYPES, 0)
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
        const amount = parseOptionalAmount(row.amount)
        if (amount == null || amount < 0) return null
        const label = (row.name || '').trim()
        if (!label) return null
        const code = inferLegacyPricingCode('Other Charges', form.container_preset, SEA_OCEAN_UNIT_TYPES, otherIdx)
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

    if (oceanMeta.type === 'Reefer') {
      const ptiAmt = parseOptionalAmount(reeferExtras.pti_amount)
      if (ptiAmt != null && ptiAmt >= 0) {
        parsedItems.push({
          code: 'pti',
          name: 'PTI',
          description: '',
          amount: ptiAmt,
          currency: reeferExtras.pti_currency || 'USD',
        })
      }
    }

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
      notes:
        mergePowerFreeDaysIntoNotes(
          form.notes?.trim() || '',
          oceanMeta.type === 'Reefer' ? reeferExtras.power_free_days : ''
        ).trim() || null,
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
      clearPricingOfferDraft('sea')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  const formTitle =
    effectiveMode === 'inland'
      ? offerToEdit
        ? 'تعديل سعر نقل داخلي / Edit Inland Rate'
        : 'إضافة سعر نقل داخلي / Add Inland Rate'
      : offerToEdit
        ? 'تعديل عرض سعر شحن بحري / Edit Rate Sea Freight'
        : 'إضافة عرض سعر جديد شحن بحري / Add New Rate Sea Freight'

  return (
    <div
      className="client-detail-modal shipments-no-print shipment-fin-modal-root pricing-fin-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-offer-form-title"
    >
      <div className="client-detail-modal__backdrop" onClick={handleDismiss} aria-hidden="true" />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-fin-modal__box pricing-fin-form-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="shipment-fin-modal__header-main">
            <div className="ship-bar">
              <div>
                <div id="pricing-offer-form-title" className="ship-ref pricing-fin-ship-ref--title" role="heading" aria-level={2}>
                  {formTitle}
                </div>
              </div>
              <div className="ship-metas">
                {offerToEdit?.id ? (
                  <>
                    <div>
                      <div className="ship-meta-val">#{offerToEdit.id}</div>
                      <div className="ship-meta-lbl">{t('pricing.finHeaderId', 'ID')}</div>
                    </div>
                    <div className="ship-meta-divider" aria-hidden />
                  </>
                ) : null}
                <div>
                  <div className="ship-meta-val">
                    {effectiveMode === 'sea'
                      ? t('pricing.finHeaderModeSea', 'Ocean')
                      : t('pricing.finHeaderModeInland', 'Inland')}
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

        <div className="client-detail-modal__body client-detail-modal__body--form shipment-fin-modal__body">
          <div className="client-detail-modal__body-inner">
            <div className="shipment-fin-panel shipment-fin-panel--enter shipment-fin-panel--expenses">
            {error ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 shipment-fin-flash shipment-fin-flash--error">
                {error}
              </div>
            ) : null}

            {!offerToEdit && draftRestoredBanner ? (
              <div
                className="pricing-offer-draft-banner shipment-fin-flash shipment-fin-flash--success mb-3"
                role="status"
              >
                <CheckCircle2 className="pricing-offer-draft-banner__icon" aria-hidden />
                <span className="pricing-offer-draft-banner__text">
                  {t('pricing.draftRestored')}
                </span>
                <button
                  type="button"
                  className="pricing-offer-draft-banner__dismiss"
                  onClick={() => setDraftRestoredBanner(false)}
                  aria-label={t('common.dismiss', 'Dismiss')}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}

            <form id="offerForm" onSubmit={handleSubmit}>
            {effectiveMode === 'sea' ? (
            <div className="sea-rate-form" role="region" aria-label="Sea freight rate">
              <PricingFinSection title="قسم 1: المسار والخط الملاحي / Route & carrier">
              <div className="sea-rate-grid-4 sea-rate-section1-grid">
                <div>
                  <label htmlFor="offer-pol" className="sea-rate-label">ميناء التحميل / POL</label>
                  <PortNameAsyncSelect
                    id="offer-pol"
                    value={form.pol}
                    onChange={(v) => updateForm({ pol: v })}
                    placeholder="اختر الميناء"
                    aria-label={t('pricing.oceanRoutePolAria', 'Port of loading (POL)')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-pod" className="sea-rate-label">ميناء الوصول / POD</label>
                  <PortNameAsyncSelect
                    id="offer-pod"
                    value={form.pod}
                    onChange={(v) => updateForm({ pod: v })}
                    placeholder="ابحث عن الميناء..."
                    aria-label={t('pricing.oceanRoutePodAria', 'Port of discharge (POD)')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-sea-region" className="sea-rate-label">المنطقة / Region</label>
                  <PricingRegionAsyncSelect
                    id="offer-sea-region"
                    value={form.region}
                    onChange={(v) => updateForm({ region: v })}
                    placeholder="اختر المنطقة"
                    aria-label={t('pricing.oceanRouteRegionAria', 'Region')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-shipping-line" className="sea-rate-label">الخط الملاحي / Shipping Line</label>
                  <ShippingLineNameAsyncSelect
                    id="offer-shipping-line"
                    serviceScope="ocean"
                    value={form.shipping_line}
                    onChange={(v) => updateForm({ shipping_line: v })}
                    placeholder="اختر الخط"
                    aria-label={t('pricing.oceanRouteCarrierAria', 'Shipping line — ocean freight carriers only')}
                  />
                </div>
              </div>
              <div className="sea-rate-grid-4 sea-rate-grid-compact">
                <div>
                  <label htmlFor="offer-container-type" className="sea-rate-label">نوع الحاوية / Container Type</label>
                  <select
                    id="offer-container-type"
                    className="sea-rate-input"
                    value={form.container_preset}
                    onChange={(e) => {
                      const v = e.target.value
                      updateForm({ container_preset: v })
                      syncSeaCoreLinesForPreset(v)
                    }}
                    aria-label={t('pricing.offerFormContainerType', 'Container type')}
                  >
                    {SEA_OCEAN_UNIT_TYPES.map((opt) => (
                      <option key={opt.slug} value={opt.slug}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="offer-transit-time" className="sea-rate-label">مدة العبور / Transit Time</label>
                  <input
                    id="offer-transit-time"
                    type="number"
                    min="0"
                    step="1"
                    className="sea-rate-input"
                    value={displayNumericInputValue(form.transit_time_days)}
                    onChange={(e) => updateForm({ transit_time_days: e.target.value })}
                    placeholder="0"
                    aria-label={t('pricing.oceanRouteTransitTimeAria', 'Transit time (days)')}
                  />
                </div>
              </div>
              </PricingFinSection>

              <PricingFinSection title="قسم 2: أيام الفري / Free time (Detention & Demurrage)">
              <div className="sea-rate-grid-2 sea-rate-freetime-outer-grid">
                <div className="sea-rate-freetime-box sea-rate-freetime-pol">
                  <div className="sea-rate-freetime-title">ميناء التحميل / POL Free Time</div>
                  <div className="sea-rate-freetime-field-rows">
                    <div className="sea-rate-freetime-field-row">
                      <label htmlFor="offer-pol-detention" className="sea-rate-label sea-rate-label--inline">
                        Detention (أيام)
                      </label>
                      <input
                        id="offer-pol-detention"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="sea-rate-input"
                        value={displayNumericInputValue(form.pol_detention)}
                        onChange={(e) =>
                          updateForm({
                            pol_detention: formatOptionalNonNegativeInt(e.target.value),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="sea-rate-freetime-field-row">
                      <label htmlFor="offer-pol-demurrage" className="sea-rate-label sea-rate-label--inline">
                        Demurrage (أيام)
                      </label>
                      <input
                        id="offer-pol-demurrage"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="sea-rate-input"
                        value={displayNumericInputValue(form.pol_demurrage)}
                        onChange={(e) =>
                          updateForm({
                            pol_demurrage: formatOptionalNonNegativeInt(e.target.value),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="sea-rate-freetime-box sea-rate-freetime-pod">
                  <div className="sea-rate-freetime-title">ميناء الوصول / POD Free Time</div>
                  <div className="sea-rate-freetime-field-rows">
                    <div className="sea-rate-freetime-field-row">
                      <label htmlFor="offer-pod-detention" className="sea-rate-label sea-rate-label--inline">
                        Detention (أيام)
                      </label>
                      <input
                        id="offer-pod-detention"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="sea-rate-input"
                        value={displayNumericInputValue(form.pod_detention)}
                        onChange={(e) =>
                          updateForm({
                            pod_detention: formatOptionalNonNegativeInt(e.target.value),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="sea-rate-freetime-field-row">
                      <label htmlFor="offer-pod-demurrage" className="sea-rate-label sea-rate-label--inline">
                        Demurrage (أيام)
                      </label>
                      <input
                        id="offer-pod-demurrage"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="sea-rate-input"
                        value={displayNumericInputValue(form.pod_demurrage)}
                        onChange={(e) =>
                          updateForm({
                            pod_demurrage: formatOptionalNonNegativeInt(e.target.value),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
              </PricingFinSection>

              <PricingFinSection title="قسم 3: مواعيد الإبحار / Sailing schedule">
              <div className="sea-rate-schedule-type">
                <label className="sea-rate-label">نوع الجدول / Schedule Type</label>
                <div className="sea-rate-toggle-group">
                  <button
                    type="button"
                    className={`sea-rate-toggle-btn ${form.sailing_tab === 'fixed' ? 'active' : ''}`}
                    onClick={() => updateForm({ sailing_tab: 'fixed' })}
                  >
                    تواريخ محددة / Fixed Dates
                  </button>
                  <button
                    type="button"
                    className={`sea-rate-toggle-btn ${form.sailing_tab === 'weekly' ? 'active' : ''}`}
                    onClick={() => updateForm({ sailing_tab: 'weekly' })}
                  >
                    رحلة أسبوعية / Weekly Schedule
                  </button>
                </div>
              </div>
              {form.sailing_tab === 'fixed' ? (
                <div className="sea-rate-sub-section sea-rate-sailing-fixed">
                  <div className="sea-rate-hint">في حالة تواريخ محددة — أضف تواريخ الإبحار:</div>
                  <div className="sea-rate-sailing-date-picker-row">
                    <label htmlFor="offer-sailing-fixed-draft" className="sea-rate-label sea-rate-label--inline">
                      {t('pricing.seaSailingPickDateLabel', 'Pick date / اختر التاريخ')}
                    </label>
                    <div className="sea-rate-sailing-date-picker-controls">
                      <DatePicker
                        key={`fixed-sail-${offerToEdit?.id ?? 'new'}-${form.sailing_tab}`}
                        id="offer-sailing-fixed-draft"
                        className="sea-rate-date-input sea-rate-date-input--sailing"
                        value={draftFixedSailingDate}
                        onChange={setDraftFixedSailingDate}
                        locale={i18n.language}
                        placeholder={UI_DATE_FORMAT}
                      />
                      <button
                        type="button"
                        className="sea-rate-btn sea-rate-btn--add-date"
                        disabled={!canAddDraftFixedSailingDate}
                        title={
                          draftFixedSailingDate &&
                          form.fixed_dates.includes(String(draftFixedSailingDate).trim())
                            ? t('pricing.sailingDateAlreadyAdded', 'This date is already listed')
                            : undefined
                        }
                        onClick={addDraftFixedSailingDate}
                      >
                        + أضف تاريخ
                      </button>
                    </div>
                  </div>
                  {form.fixed_dates.length > 0 ? (
                    <div className="sea-rate-selected-dates-block">
                      <div className="sea-rate-selected-dates-block__title">
                        {t('pricing.seaSelectedSailingDatesTitle', 'Selected sailing dates / التواريخ المحددة')}
                      </div>
                      <div className="sea-rate-tags sea-rate-tags--in-block">
                        {form.fixed_dates.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className="sea-rate-tag sea-rate-tag-blue"
                            onClick={() => removeFixedDate(d)}
                            aria-label={t('pricing.removeFixedDateAria', 'Remove {{date}}', {
                              date: formatIsoDateDisplay(d, i18n.language),
                            })}
                          >
                            {formatIsoDateDisplay(d, i18n.language)} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="sea-rate-sub-section sea-rate-weekly-section">
                  <div className="sea-rate-hint">في حالة رحلة أسبوعية — اختر اليوم:</div>
                  <div className="sea-rate-day-selector sea-rate-day-selector--week-7" role="group">
                    {WEEK_DAYS.map((day) => {
                      const selected = form.weekly_days.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`sea-rate-day-btn ${selected ? 'active' : ''}`}
                          onClick={() => toggleWeeklyDay(day)}
                          aria-pressed={selected}
                        >
                          {day.slice(0, 3)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              </PricingFinSection>

              <PricingFinSection title="قسم 4: بنود التسعير / Pricing conditions">
              <div className="sea-rate-grid-4 sea-rate-pricing-grid">
                {(oceanMeta.type === 'Reefer' ? seaCoreLines.filter((row) => row.name !== 'Power') : seaCoreLines).map((row) => (
                  <div key={row.name}>
                    <label className="sea-rate-label">{row.name === 'Ocean Freight' ? 'Ocean freight (OF)' : row.name === 'B/L Fee' ? 'B/L fee (بوليصة)' : row.name}</label>
                    <div className="sea-rate-input-group">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="sea-rate-input"
                        value={displayNumericInputValue(row.amount)}
                        onChange={(e) => patchSeaCoreLine(row.name, { amount: e.target.value })}
                        placeholder="0"
                      />
                      <select
                        className="sea-rate-select"
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
                ))}
              </div>
              {oceanMeta.type === 'Reefer' ? (
                <div
                  key={`reefer-${form.container_preset}`}
                  className="sea-rate-reefer-charges sea-rate-reefer-charges--enter"
                  aria-live="polite"
                >
                  <div className="sea-rate-reefer-charges__head">
                    <span className="sea-rate-reefer-charges__icon" aria-hidden>
                      <Snowflake className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="sea-rate-reefer-charges__head-text">
                      <div className="sea-rate-reefer-charges__title">
                        {t('pricing.seaReeferChargesTitle', "Reefer-only Charges / بنود إضافية للحاويات المبردة فقط")}
                      </div>
                      <div className="sea-rate-reefer-charges__subtitle">
                        {t(
                          'pricing.seaReeferChargesSubtitle',
                          "PTI plus port electricity (power) priced per day after free power days — see note below."
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sea-rate-reefer-charges__pti">
                    <label htmlFor="offer-sea-reefer-pti" className="sea-rate-label">
                      {t('pricing.seaReeferPtiLabel', 'PTI')}
                    </label>
                    <div className="sea-rate-input-group sea-rate-reefer-charges__pti-input">
                      <input
                        id="offer-sea-reefer-pti"
                        type="number"
                        min={0}
                        step="0.01"
                        className="sea-rate-input"
                        value={displayNumericInputValue(reeferExtras.pti_amount)}
                        onChange={(e) => setReeferExtras((prev) => ({ ...prev, pti_amount: e.target.value }))}
                        placeholder="0"
                      />
                      <select
                        className="sea-rate-select"
                        value={reeferExtras.pti_currency}
                        onChange={(e) => setReeferExtras((prev) => ({ ...prev, pti_currency: e.target.value }))}
                        aria-label={t('pricing.currencyAria', 'Currency')}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sea-rate-reefer-power-card">
                    <div className="sea-rate-reefer-power-card__head">
                      <Zap className="sea-rate-reefer-power-card__zap" aria-hidden />
                      <span>{t('pricing.seaReeferPowerPortElectricity', 'Power (port electricity)')}</span>
                    </div>
                    <div className="sea-rate-reefer-power-card__hint">
                      {t('pricing.seaReeferPowerCardHint', 'Daily rate at the port and how many days are free before billing starts.')}
                    </div>
                    <div className="sea-rate-reefer-power-card__grid">
                      {seaPowerRow ? (
                        <div>
                          <label htmlFor="offer-sea-reefer-power" className="sea-rate-label">
                            {t('pricing.seaReeferPowerPricePerDay', 'Power price / day')}
                          </label>
                          <div className="sea-rate-input-group">
                            <input
                              id="offer-sea-reefer-power"
                              type="number"
                              min={0}
                              step="0.01"
                              className="sea-rate-input"
                              value={displayNumericInputValue(seaPowerRow.amount)}
                              onChange={(e) => patchSeaCoreLine('Power', { amount: e.target.value })}
                              placeholder="0"
                            />
                            <select
                              className="sea-rate-select"
                              value={seaPowerRow.currency}
                              onChange={(e) => patchSeaCoreLine('Power', { currency: e.target.value })}
                              aria-label={t('pricing.currencyAria', 'Currency')}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : null}
                      <div>
                        <label htmlFor="offer-sea-reefer-power-free" className="sea-rate-label">
                          {t('pricing.seaReeferPowerFreeDays', 'Free power days')}
                        </label>
                        <input
                          id="offer-sea-reefer-power-free"
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="sea-rate-input"
                          value={displayNumericInputValue(reeferExtras.power_free_days)}
                          onChange={(e) =>
                            setReeferExtras((prev) => ({
                              ...prev,
                              power_free_days: formatOptionalNonNegativeInt(e.target.value),
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="sea-rate-reefer-alert" role="note">
                      <p className="sea-rate-reefer-alert__lead">
                        {t('pricing.seaReeferSalesNoteLead', 'Note for sales:')}
                      </p>
                      <p className="sea-rate-reefer-alert__body">
                        {t(
                          'pricing.seaReeferPowerSalesNote',
                          'Power charges are NOT included in the total quotation price. They are calculated separately based on actual port stay days after deducting free power days. Example: if free power days = 3, daily power price = USD 25, and the container stayed 5 days, then: (5 − 3) × 25 = USD 50.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="sea-rate-custom-charges">
                <div className="sea-rate-hint">بنود إضافية (حسب الخط الملاحي) / Custom Charges:</div>
                <div className="sea-rate-sub-section">
                  <div className="sea-rate-custom-entry">
                    <div className="sea-rate-custom-name">
                      <label className="sea-rate-label">اسم البند / Charge Name</label>
                      <input
                        type="text"
                        className="sea-rate-input"
                        placeholder="e.g. ISPS, EBS, BAF..."
                        value={seaCustomLines[0]?.name || ''}
                        onChange={(e) => {
                          if (!seaCustomLines[0]) addCustomCharge()
                          setSeaCustomLines((prev) => {
                            const first = prev[0] || makeCustomChargeItem()
                            return [{ ...first, name: e.target.value }, ...prev.slice(1)]
                          })
                        }}
                      />
                    </div>
                    <div className="sea-rate-custom-amount">
                      <label className="sea-rate-label">المبلغ / Amount</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="sea-rate-input"
                        placeholder="0"
                        value={displayNumericInputValue(seaCustomLines[0]?.amount)}
                        onChange={(e) => {
                          if (!seaCustomLines[0]) addCustomCharge()
                          setSeaCustomLines((prev) => {
                            const first = prev[0] || makeCustomChargeItem()
                            return [{ ...first, amount: e.target.value }, ...prev.slice(1)]
                          })
                        }}
                      />
                    </div>
                    <div className="sea-rate-custom-currency">
                      <label className="sea-rate-label">العملة</label>
                      <select
                        className="sea-rate-select"
                        value={seaCustomLines[0]?.currency || 'USD'}
                        onChange={(e) => {
                          if (!seaCustomLines[0]) addCustomCharge()
                          setSeaCustomLines((prev) => {
                            const first = prev[0] || makeCustomChargeItem()
                            return [{ ...first, currency: e.target.value }, ...prev.slice(1)]
                          })
                        }}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" className="sea-rate-btn" onClick={addCustomCharge}>
                      + أضف بند
                    </button>
                  </div>
                  {seaCustomLines.length > 0 ? (
                    <div className="sea-rate-tags">
                      {seaCustomLines.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className="sea-rate-tag sea-rate-tag-amber"
                          onClick={() => removeCustomCharge(row.id)}
                        >
                          {(row.name || 'Charge')}: {row.amount !== '' && row.amount != null ? row.amount : '—'} {row.currency || 'USD'} ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              </PricingFinSection>

              <PricingFinSection title="قسم 5: الصلاحية والملاحظات / Validity &amp; Notes">
              <div className="sea-rate-validity-grid">
                <div>
                  <label className="sea-rate-label">صالح من / Valid From</label>
                  <DatePicker
                    key={`sea-vf-${offerToEdit?.id ?? 'new'}`}
                    id="offer-sea-valid-from"
                    className="sea-rate-date-input"
                    value={form.valid_from}
                    onChange={(v) => updateForm({ valid_from: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
                <div>
                  <label className="sea-rate-label">صالح حتى / Valid To</label>
                  <DatePicker
                    key={`sea-vt-${offerToEdit?.id ?? 'new'}`}
                    id="offer-sea-valid-to"
                    className="sea-rate-date-input"
                    value={form.valid_to}
                    onChange={(v) => updateForm({ valid_to: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
              </div>
              <div className="sea-rate-notes">
                <label htmlFor="offer-sea-notes" className="sea-rate-label">ملاحظات / Notes</label>
                <textarea
                  id="offer-sea-notes"
                  className="sea-rate-textarea"
                  value={form.notes}
                  onChange={(e) => updateForm({ notes: e.target.value })}
                  placeholder="أضف أي ملاحظات أو شروط إضافية..."
                />
              </div>
              </PricingFinSection>
            </div>
            ) : (
            <div className="inland-rate-form inland-rate-form--modal" role="region" aria-label="Inland transport rate">
              <PricingFinSection title="قسم 1: المسار / Route">
              <div className="inland-rate-grid inland-rate-grid-3">
                <div>
                  <label htmlFor="offer-inland-port" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandPortField', 'Port / الميناء')}
                  </label>
                  <PortNameAsyncSelect
                    id="offer-inland-port"
                    className="inland-rate-async-select"
                    value={inlandForm.inland_port}
                    onChange={(v) => updateInlandForm({ inland_port: v })}
                    placeholder={t('pricing.inlandPortPlaceholder', 'اختر الميناء')}
                    aria-label={t('pricing.inlandPortField', 'Port / الميناء')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-inland-gov" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.governorate', 'Governorate')}
                  </label>
                  <InlandLocationAsyncSelect
                    id="offer-inland-gov"
                    className="inland-rate-async-select"
                    dataset="inland_governorate"
                    value={inlandForm.inland_gov}
                    onChange={(v) => updateInlandForm({ inland_gov: v })}
                    placeholder={t('pricing.inlandGovPlaceholder', 'اختر المحافظة')}
                    aria-label={t('pricing.governorate', 'Governorate')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-inland-area" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandAreaField', 'Zone (optional) / المنطقة')}
                  </label>
                  <InlandLocationAsyncSelect
                    id="offer-inland-area"
                    className="inland-rate-async-select"
                    dataset="inland_region"
                    value={inlandForm.inland_area}
                    onChange={(v) => updateInlandForm({ inland_area: v })}
                    placeholder={t('pricing.inlandAreaPlaceholder', 'مثال: التجمع الخامس، العاشر من رمضان...')}
                    aria-label={t('pricing.inlandAreaEnglishAbbr', 'Area')}
                  />
                </div>
              </div>
              </PricingFinSection>

              <PricingFinSection title="قسم 2: نوع العربية والسعر / Vehicle Type &amp; Rate">
              <div className="inland-rate-grid inland-rate-grid-2 inland-rate-vehicle-grid inland-rate-vehicle-grid--stacked">
                <div className="inland-rate-control">
                  <label htmlFor="offer-inland-truck-type" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandVehicleTypeAria', 'Vehicle type')}
                  </label>
                  <select
                    id="offer-inland-truck-type"
                    className="inland-rate-select"
                    value={inlandForm.truck_type}
                    onChange={(e) => {
                      const v = e.target.value
                      setInlandForm((prev) => {
                        const reefer = isInlandReeferTruck(v, mergedInlandUnitTypes)
                        const hideGen = !reefer || isInland40ReeferContainer(v)
                        return {
                          ...prev,
                          truck_type: v,
                          ...(hideGen ? { generator_price: '', generator_currency: 'EGP' } : {}),
                        }
                      })
                    }}
                    aria-label={t('pricing.inlandVehicleTypeAria', 'Vehicle type')}
                  >
                    {DEFAULT_INLAND_TRUCK_PRESETS.map((opt) => (
                      <option key={opt.slug} value={opt.slug}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inland-rate-control">
                  <label htmlFor="offer-inland-price" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandRateAmountAria', 'Rate amount')}
                  </label>
                  <div className="inland-rate-input-group inland-rate-input-group--full">
                    <input
                      id="offer-inland-price"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="inland-rate-input"
                      value={displayNumericInputValue(inlandForm.price)}
                      onChange={(e) => updateInlandForm({ price: e.target.value })}
                      placeholder="0"
                      required
                      aria-label={t('pricing.inlandPriceAria', 'Inland transport price or rate')}
                    />
                    <select
                      id="offer-inland-currency"
                      className="inland-rate-select"
                      value={inlandForm.currency}
                      onChange={(e) => updateInlandForm({ currency: e.target.value })}
                      aria-label={t('pricing.currencyAria', 'Currency')}
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

              {inlandTruckNeedsGeneratorFields(inlandForm.truck_type, mergedInlandUnitTypes) ? (
                <div className="inland-rate-generator-inline">
                  <label htmlFor="offer-inland-generator-price" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandGeneratorAmountAria', 'Generator cost amount')}
                  </label>
                  <div className="inland-rate-input-group inland-rate-input-group--full">
                    <input
                      id="offer-inland-generator-price"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="inland-rate-input"
                      value={displayNumericInputValue(inlandForm.generator_price)}
                      onChange={(e) => updateInlandForm({ generator_price: e.target.value })}
                      placeholder="0"
                      required
                      aria-label={t('pricing.inlandGeneratorAmountAria', 'Generator cost amount')}
                    />
                    <select
                      id="offer-inland-generator-currency"
                      className="inland-rate-select"
                      value={inlandForm.generator_currency}
                      onChange={(e) => updateInlandForm({ generator_currency: e.target.value })}
                      aria-label={t('pricing.inlandGeneratorCurrencyAria', 'Generator cost currency')}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
              </PricingFinSection>

              <PricingFinSection title="قسم 3: الصلاحية / Validity">
              <div className="inland-rate-grid inland-rate-grid-2 inland-rate-validity-grid--stacked">
                <div>
                  <label htmlFor="offer-inland-valid-from" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandValidFromAria', 'Valid from')}
                  </label>
                  <DatePicker
                    key={`in-vf-${offerToEdit?.id ?? 'new'}`}
                    id="offer-inland-valid-from"
                    className="inland-rate-date-input"
                    value={inlandForm.valid_from}
                    onChange={(v) => updateInlandForm({ valid_from: v })}
                    locale={i18n.language}
                    placeholder={t('pricing.inlandValidFromPlaceholder', 'صالح من / Valid from')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-inland-valid-to" className="inland-rate-label inland-rate-label--sr-only">
                    {t('pricing.inlandValidToAria', 'Valid to (optional)')}
                  </label>
                  <DatePicker
                    key={`in-vt-${offerToEdit?.id ?? 'new'}`}
                    id="offer-inland-valid-to"
                    className="inland-rate-date-input"
                    value={inlandForm.valid_to}
                    onChange={(v) => updateInlandForm({ valid_to: v })}
                    locale={i18n.language}
                    placeholder={t('pricing.inlandValidToPlaceholder', 'صالح حتى / Valid to (optional)')}
                  />
                </div>
              </div>

              <div className="inland-rate-notes">
                <label htmlFor="offer-inland-notes" className="inland-rate-label inland-rate-label--sr-only">
                  {t('pricing.notes', 'Notes')}
                </label>
                <textarea
                  id="offer-inland-notes"
                  className="inland-rate-textarea"
                  value={inlandForm.notes}
                  onChange={(e) => updateInlandForm({ notes: e.target.value })}
                  placeholder={t('pricing.inlandNotesPlaceholder', 'ملاحظات (اختياري) / Notes')}
                  aria-label={t('pricing.notes', 'Notes')}
                />
              </div>
              </PricingFinSection>
            </div>
            )}
          </form>
            </div>
          </div>
        </div>

        <div className={`pricing-fin-modal__footer ${effectiveMode === 'sea' ? 'pricing-fin-modal__footer--sea' : effectiveMode === 'inland' ? 'pricing-fin-modal__footer--inland' : ''}`}>
          <button type="button" onClick={handleCancel} className={effectiveMode === 'sea' ? 'sea-rate-btn sea-rate-btn-footer' : effectiveMode === 'inland' ? 'inland-rate-btn inland-rate-btn-footer' : 'px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors'}>
            {effectiveMode === 'sea' || effectiveMode === 'inland' ? 'إلغاء / Cancel' : t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" form="offerForm" disabled={loading} className={effectiveMode === 'sea' ? 'sea-rate-btn sea-rate-btn-primary sea-rate-btn-footer' : effectiveMode === 'inland' ? 'inland-rate-btn inland-rate-btn-primary inland-rate-btn-footer' : 'px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50'}>
            {effectiveMode === 'sea' || effectiveMode === 'inland' ? (loading ? t('common.saving', 'Saving...') : 'حفظ / Save') : loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </div>
      </div>

    </div>
  )
}
