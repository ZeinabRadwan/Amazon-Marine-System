import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import '../../Shipments/Shipments.css'
import { useMutateOffer } from '../../../hooks/usePricing'
import { getStoredToken } from '../../Login'
import { listPricingFreightUnitTypes } from '../../../api/pricingFreightUnitTypes'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from './ShippingLineNameAsyncSelect'
import PricingRegionAsyncSelect from './PricingRegionAsyncSelect'
import OceanContainerTypeAsyncSelect from './OceanContainerTypeAsyncSelect'
import InlandTruckTypeAsyncSelect from './InlandTruckTypeAsyncSelect'
import InlandLocationAsyncSelect from './InlandLocationAsyncSelect'
import DatePicker from '../../../components/DatePicker'
import { formatDate, UI_DATE_FORMAT } from '../../../utils/dateUtils'

/** Canonical weekday names stored in API (`weekly_sailing_days` comma-separated); sort order Sat → Fri */
const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

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

const defaultInlandForm = () => ({
  inland_port: '',
  inland_gov: '',
  inland_area: '',
  truck_type: 't40d',
  price: '',
  currency: 'EGP',
  generator_price: '',
  generator_currency: 'EGP',
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

function isInlandReeferTruck(truckId) {
  const s = String(truckId || '').toLowerCase()
  return s.includes('reefer') || s.includes('rf') || s.includes('refrigerated') || s === 't40r'
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
  sailing_tab: 'fixed',
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (effectiveMode === 'inland') {
      const gov = inlandForm.inland_gov.trim()
      const port = inlandForm.inland_port.trim()
      const amount = Number(inlandForm.price)
      if (!gov || !port || Number.isNaN(amount) || amount < 0) return

      const searchPod = [port, inlandForm.inland_area.trim(), gov].filter(Boolean).join(' ')
      const inlandPricing = {
        [inlandForm.truck_type]: {
          price: amount,
          currency: inlandForm.currency || 'EGP',
        },
      }
      const generatorAmount = Number(inlandForm.generator_price)
      if (isInlandReeferTruck(inlandForm.truck_type) && inlandForm.generator_price !== '' && !Number.isNaN(generatorAmount) && generatorAmount >= 0) {
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
                ? 'تعديل سعر نقل داخلي / Edit Inland Rate'
                : 'إضافة سعر نقل داخلي / Add Inland Rate'
              : offerToEdit
                ? 'تعديل عرض سعر شحن بحري / Edit Rate Sea Freight'
                : 'إضافة عرض سعر جديد شحن بحري / Add New Rate Sea Freight'}
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
            <div className="sea-rate-form" role="region" aria-label="Sea freight rate">
              <div className="sea-rate-section-title">المسار والخط الملاحي / Route & Carrier</div>
              <div className="sea-rate-grid-4">
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
                  <OceanContainerTypeAsyncSelect
                    id="offer-container-type"
                    types={oceanUnitTypes}
                    value={form.container_preset}
                    onChange={(v) => {
                      updateForm({ container_preset: v })
                      syncSeaCoreLinesForPreset(v)
                    }}
                    onTypesUpdated={loadOceanTypes}
                    placeholder="اختر النوع"
                  />
                </div>
                <div>
                  <label htmlFor="offer-transit-time" className="sea-rate-label">مدة العبور / Transit Time</label>
                  <input
                    id="offer-transit-time"
                    type="number"
                    min="0"
                    step="1"
                    className="sea-rate-input"
                    value={form.transit_time_days}
                    onChange={(e) => updateForm({ transit_time_days: e.target.value })}
                    placeholder="0"
                    aria-label={t('pricing.oceanRouteTransitTimeAria', 'Transit time (days)')}
                  />
                </div>
              </div>

              <div className="sea-rate-section-title">أيام الـ Free Time / Free Time Detention &amp; Demurrage</div>
              <div className="sea-rate-grid-2">
                <div className="sea-rate-freetime-box sea-rate-freetime-pol">
                  <div className="sea-rate-freetime-title">ميناء التحميل / POL Free Time</div>
                  <div className="sea-rate-field-gap">
                    <label htmlFor="offer-pol-detention" className="sea-rate-label">Detention (أيام)</label>
                    <input
                      id="offer-pol-detention"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="sea-rate-input"
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
                    <label htmlFor="offer-pol-demurrage" className="sea-rate-label">Demurrage (أيام)</label>
                    <input
                      id="offer-pol-demurrage"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="sea-rate-input"
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
                <div className="sea-rate-freetime-box sea-rate-freetime-pod">
                  <div className="sea-rate-freetime-title">ميناء الوصول / POD Free Time</div>
                  <div className="sea-rate-field-gap">
                    <label htmlFor="offer-pod-detention" className="sea-rate-label">Detention (أيام)</label>
                    <input
                      id="offer-pod-detention"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="sea-rate-input"
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
                    <label htmlFor="offer-pod-demurrage" className="sea-rate-label">Demurrage (أيام)</label>
                    <input
                      id="offer-pod-demurrage"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="sea-rate-input"
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

              <div className="sea-rate-section-title">مواعيد الإبحار / Sailing Schedule</div>
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
                <div className="sea-rate-sub-section">
                  <div className="sea-rate-hint">في حالة تواريخ محددة — أضف تواريخ الإبحار:</div>
                  <div className="sea-rate-date-row">
                    <DatePicker
                      key={`fixed-sail-${offerToEdit?.id ?? 'new'}-${form.sailing_tab}`}
                      id="offer-sailing-fixed-draft"
                      className="sea-rate-date-input"
                      value={draftFixedSailingDate}
                      onChange={setDraftFixedSailingDate}
                      locale={i18n.language}
                      placeholder={UI_DATE_FORMAT}
                    />
                    <button
                      type="button"
                      className="sea-rate-btn"
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
                  {form.fixed_dates.length > 0 ? (
                    <div className="sea-rate-tags">
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
                  ) : null}
                </div>
              ) : (
                <div className="sea-rate-sub-section sea-rate-weekly-section">
                  <div className="sea-rate-hint">في حالة رحلة أسبوعية — اختر اليوم:</div>
                  <div className="sea-rate-day-selector" role="group">
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

              <div className="sea-rate-section-title">بنود التسعير / Pricing Items</div>
              <div className="sea-rate-hint">البنود الأساسية (لكل عرض سعر):</div>
              <div className="sea-rate-grid-4 sea-rate-pricing-grid">
                {seaCoreLines.map((row) => (
                  <div key={row.name}>
                    <label className="sea-rate-label">{row.name === 'Ocean Freight' ? 'Ocean freight (OF)' : row.name === 'B/L Fee' ? 'B/L fee (بوليصة)' : row.name}</label>
                    <div className="sea-rate-input-group">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="sea-rate-input"
                        value={row.amount}
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
                        value={seaCustomLines[0]?.amount || '0'}
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
                          {(row.name || 'Charge')}: {row.amount || 0} {row.currency || 'USD'} ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="sea-rate-section-title">الصلاحية والملاحظات / Validity &amp; Notes</div>
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
            </div>
            ) : (
            <div className="inland-rate-form" role="region" aria-label="Inland transport rate">
              <div className="inland-rate-section-title">القسم 1: المسار / Route</div>
              <div className="inland-rate-grid inland-rate-grid-3">
                <div>
                  <label htmlFor="offer-inland-port" className="inland-rate-label">الميناء / Port</label>
                  <PortNameAsyncSelect
                    id="offer-inland-port"
                    value={inlandForm.inland_port}
                    onChange={(v) => updateInlandForm({ inland_port: v })}
                    placeholder="اختر الميناء"
                  />
                </div>
                <div>
                  <label htmlFor="offer-inland-gov" className="inland-rate-label">المحافظة / Governorate</label>
                  <InlandLocationAsyncSelect
                    id="offer-inland-gov"
                    dataset="inland_governorate"
                    value={inlandForm.inland_gov}
                    onChange={(v) => updateInlandForm({ inland_gov: v })}
                    placeholder="اختر المحافظة"
                    aria-label={t('pricing.governorate', 'Governorate')}
                  />
                </div>
                <div>
                  <label htmlFor="offer-inland-area" className="inland-rate-label">المنطقة / Zone (اختياري)</label>
                  <InlandLocationAsyncSelect
                    id="offer-inland-area"
                    dataset="inland_region"
                    value={inlandForm.inland_area}
                    onChange={(v) => updateInlandForm({ inland_area: v })}
                    placeholder="مثال: التجمع الخامس، العاشر من رمضان..."
                    aria-label={t('pricing.inlandAreaEnglishAbbr', 'Area')}
                  />
                </div>
              </div>

              <div className="inland-rate-section-title">القسم 2: نوع العربية والسعر / Vehicle Type &amp; Rate</div>
              <div className="inland-rate-grid inland-rate-grid-2 inland-rate-vehicle-grid">
                <div className="inland-rate-control">
                  <label htmlFor="offer-inland-truck-type" className="inland-rate-label">نوع العربية / Vehicle Type</label>
                  <InlandTruckTypeAsyncSelect
                    id="offer-inland-truck-type"
                    className="inland-rate-async-select"
                    types={inlandUnitTypes}
                    value={inlandForm.truck_type}
                    onChange={(v) => updateInlandForm({ truck_type: v })}
                    onTypesUpdated={loadInlandTypes}
                    placeholder="اختر نوع العربية"
                  />
                </div>
                <div className="inland-rate-control">
                  <label htmlFor="offer-inland-price" className="inland-rate-label">السعر / Rate</label>
                  <div className="inland-rate-input-group">
                    <input
                      id="offer-inland-price"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="inland-rate-input"
                      value={inlandForm.price}
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

              {isInlandReeferTruck(inlandForm.truck_type) ? (
                <div className="inland-rate-reefer-section">
                  <div className="inland-rate-hint">في حالة عربية 40' Reefer فقط — سعر المولد:</div>
                  <div className="inland-rate-grid inland-rate-grid-2">
                    <div>
                      <label htmlFor="offer-inland-generator-price" className="inland-rate-label">سعر المولد / Generator (per trip)</label>
                      <div className="inland-rate-input-group">
                        <input
                          id="offer-inland-generator-price"
                          type="number"
                          min="0"
                          step="0.01"
                          className="inland-rate-input"
                          value={inlandForm.generator_price}
                          onChange={(e) => updateInlandForm({ generator_price: e.target.value })}
                          placeholder="0"
                        />
                        <select
                          className="inland-rate-select"
                          value={inlandForm.generator_currency}
                          onChange={(e) => updateInlandForm({ generator_currency: e.target.value })}
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
                  <div className="inland-rate-reefer-note">⚠ يظهر فقط عند اختيار عربية 40' Reefer</div>
                </div>
              ) : null}

              <div className="inland-rate-section-title">القسم 3: الصلاحية / Validity</div>
              <div className="inland-rate-grid inland-rate-grid-2">
                <div>
                  <label className="inland-rate-label">صالح من / Valid From</label>
                  <DatePicker
                    key={`in-vf-${offerToEdit?.id ?? 'new'}`}
                    id="offer-inland-valid-from"
                    className="inland-rate-date-input"
                    value={inlandForm.valid_from}
                    onChange={(v) => updateInlandForm({ valid_from: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
                <div>
                  <label className="inland-rate-label">صالح حتى / Valid To (اختياري)</label>
                  <DatePicker
                    key={`in-vt-${offerToEdit?.id ?? 'new'}`}
                    id="offer-inland-valid-to"
                    className="inland-rate-date-input"
                    value={inlandForm.valid_to}
                    onChange={(v) => updateInlandForm({ valid_to: v })}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                </div>
              </div>

              <div className="inland-rate-sub-section inland-rate-sub-section-start">
                لو مفيش تاريخ انتهاء — السعر يفضل سارياً لحد ما يتعدل أو يتحذف يدوياً
              </div>

              <div className="inland-rate-notes">
                <label htmlFor="offer-inland-notes" className="inland-rate-label">ملاحظات / Notes (اختياري)</label>
                <textarea
                  id="offer-inland-notes"
                  className="inland-rate-textarea"
                  value={inlandForm.notes}
                  onChange={(e) => updateInlandForm({ notes: e.target.value })}
                  placeholder="أي ملاحظات خاصة بالمسار أو السعر..."
                />
              </div>
            </div>
            )}
          </form>
          </div>
        </div>

        <div className={effectiveMode === 'sea' ? 'sea-rate-actions shrink-0' : effectiveMode === 'inland' ? 'inland-rate-actions shrink-0' : 'px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0'}>
          <button type="button" onClick={onClose} className={effectiveMode === 'sea' ? 'sea-rate-btn sea-rate-btn-footer' : effectiveMode === 'inland' ? 'inland-rate-btn inland-rate-btn-footer' : 'px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors'}>
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
