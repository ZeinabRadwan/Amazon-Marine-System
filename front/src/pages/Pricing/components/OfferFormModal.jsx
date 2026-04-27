import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2, Package, CalendarDays } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { getStoredToken } from '../../Login'
import { listPorts } from '../../../api/ports'
import { listShippingLines } from '../../../api/shippingLines'

const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const CURRENCIES = ['USD', 'EUR', 'EGP']
const BASE_LINE_ITEMS = ['Ocean Freight', 'THC', 'Power', 'B/L Fee', 'Telex Release', 'Other Charges']

const defaultHeader = {
  pricing_type: 'sea',
  pol: '',
  pod: '',
  shipping_line: '',
  container_type: 'Dry',
  container_size: '20',
  container_height: 'Standard',
  transit_time_days: '',
  free_time_days: '',
  available_sailings: [],
  valid_from: '',
  valid_to: '',
  notes: '',
}

const makeLineItem = (name = 'Ocean Freight') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name,
  description: '',
  amount: '',
  currency: 'USD',
})

function containerSpecLabel(type, size, height) {
  if (!type || !size) return ''
  const isHq = String(height).toLowerCase() === 'hq'
  const normalizedType = type === 'Reefer' ? 'Reefer' : 'Dry'
  if (isHq) return `${size} HQ ${normalizedType}`
  return `${size} ${normalizedType}`
}

function inferLegacyPricingCode(itemName, header, idx = 0) {
  const isReefer = header.container_type === 'Reefer'
  const size = header.container_size
  const isHq = header.container_height === 'HQ'
  if (itemName === 'Ocean Freight') {
    if (isReefer) return 'of40rf'
    if (size === '20') return 'of20'
    return 'of40'
  }
  if (itemName === 'THC') {
    if (isReefer) return 'thcRf'
    if (size === '20') return 'thc20'
    return 'thc40'
  }
  if (itemName === 'Power') return 'powerDay'
  if (itemName === 'B/L Fee') return 'blFee'
  if (itemName === 'Telex Release') return 'telex'
  return `otherCharge${idx + 1}`
}

export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit }) {
  const { t } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()
  const [ports, setPorts] = useState([])
  const [shippingLines, setShippingLines] = useState([])
  const [header, setHeader] = useState(defaultHeader)
  const [lineItems, setLineItems] = useState([makeLineItem('Ocean Freight'), makeLineItem('THC')])

  useEffect(() => {
    if (!isOpen) return
    const token = getStoredToken()
    if (!token) return
    listPorts(token, { active: true })
      .then((res) => setPorts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setPorts([]))
    listShippingLines(token, { active: true })
      .then((res) => setShippingLines(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setShippingLines([]))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!offerToEdit) {
      setHeader(defaultHeader)
      setLineItems([makeLineItem('Ocean Freight'), makeLineItem('THC')])
      return
    }

    setHeader((prev) => ({
      ...prev,
      pricing_type: offerToEdit.pricing_type || 'sea',
      pol: offerToEdit.pol || '',
      pod: offerToEdit.pod || '',
      shipping_line: offerToEdit.shipping_line || '',
      transit_time_days: String(offerToEdit.transit_time || '').replace(/\D+/g, ''),
      free_time_days: String(offerToEdit.dnd || '').replace(/\D+/g, ''),
      valid_to: offerToEdit.valid_to || '',
      notes: offerToEdit.notes || '',
    }))

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
    setLineItems(mapped.length ? mapped : [makeLineItem('Ocean Freight')])
  }, [offerToEdit, isOpen])

  const allowedItemNames = useMemo(() => {
    if (header.container_type === 'Reefer') return BASE_LINE_ITEMS
    return BASE_LINE_ITEMS.filter((x) => x !== 'Power')
  }, [header.container_type])

  const selectedSpec = containerSpecLabel(header.container_type, header.container_size, header.container_height)

  const updateHeader = (key, value) => setHeader((prev) => ({ ...prev, [key]: value }))

  const toggleSailingDay = (day) => {
    setHeader((prev) => {
      const has = prev.available_sailings.includes(day)
      return {
        ...prev,
        available_sailings: has ? prev.available_sailings.filter((d) => d !== day) : [...prev.available_sailings, day],
      }
    })
  }

  const addLineItem = () => setLineItems((prev) => [...prev, makeLineItem('Other Charges')])
  const removeLineItem = (id) => setLineItems((prev) => prev.filter((x) => x.id !== id))
  const patchLineItem = (id, patch) => setLineItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const parsedItems = lineItems
      .map((row, idx) => {
        const amount = Number(row.amount)
        if (Number.isNaN(amount) || amount < 0) return null
        if (row.name === 'Power' && header.container_type !== 'Reefer') return null
        if (row.name === 'Other Charges' && !(row.description || '').trim()) return null
        const code = inferLegacyPricingCode(row.name, header, idx)
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

    const detailsLines = [
      `Container Specification: ${selectedSpec || '-'}`,
      `Available Sailings: ${header.available_sailings.join(', ') || '-'}`,
      `Valid From: ${header.valid_from || '-'}`,
      `Free Time Days: ${header.free_time_days || '-'}`,
    ]
    const notePrefix = detailsLines.join('\n')
    const mergedNotes = header.notes ? `${notePrefix}\n${header.notes}` : notePrefix

    const payload = {
      pricing_type: 'sea',
      region: header.pod || header.pol || 'Sea',
      pol: header.pol,
      pod: header.pod,
      shipping_line: header.shipping_line,
      transit_time: header.transit_time_days ? `${header.transit_time_days} days` : '',
      dnd: header.free_time_days || '',
      valid_to: header.valid_to || null,
      sailing_dates: [],
      notes: mergedNotes,
      other_charges: parsedItems
        .filter((x) => x.name === 'Other Charges')
        .map((x) => x.description)
        .filter(Boolean)
        .join(' | '),
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold">{offerToEdit ? t('pricing.editOffer', 'Edit Offer') : t('pricing.addOffer', 'Add New Offer')}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error ? <div className="mb-4 p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">{error}</div> : null}

          <form id="offerForm" onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">{t('pricing.offerHeader', 'Offer Header')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold">POL</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={header.pol} onChange={(e) => updateHeader('pol', e.target.value)} required>
                    <option value="">{t('common.select', 'Select')}</option>
                    {ports.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">POD</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={header.pod} onChange={(e) => updateHeader('pod', e.target.value)} required>
                    <option value="">{t('common.select', 'Select')}</option>
                    {ports.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.shippingLine', 'Shipping Line')}</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={header.shipping_line} onChange={(e) => updateHeader('shipping_line', e.target.value)} required>
                    <option value="">{t('common.select', 'Select')}</option>
                    {shippingLines.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.containerType', 'Container Type')}</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={header.container_type} onChange={(e) => updateHeader('container_type', e.target.value)}>
                    <option value="Dry">Dry</option>
                    <option value="Reefer">Reefer</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.containerSize', 'Container Size')}</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={header.container_size} onChange={(e) => updateHeader('container_size', e.target.value)}>
                    <option value="20">20</option>
                    <option value="40">40</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.containerHeight', 'Container Height')}</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={header.container_height} onChange={(e) => updateHeader('container_height', e.target.value)}>
                    <option value="Standard">Standard</option>
                    <option value="HQ">HQ</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.transitTime', 'Transit Time (days)')}</label>
                  <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg" value={header.transit_time_days} onChange={(e) => updateHeader('transit_time_days', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.freeTime', 'Free Time (days)')}</label>
                  <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg" value={header.free_time_days} onChange={(e) => updateHeader('free_time_days', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.validFrom', 'Valid From')}</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" value={header.valid_from} onChange={(e) => updateHeader('valid_from', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('pricing.validTo', 'Valid To')}</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" value={header.valid_to} onChange={(e) => updateHeader('valid_to', e.target.value)} required />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-semibold">{t('pricing.availableSailings', 'Available Sailings')}</label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {WEEK_DAYS.map((day) => (
                      <label key={day} className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={header.available_sailings.includes(day)} onChange={() => toggleSailingDay(day)} />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-semibold">{t('pricing.notes', 'Notes')}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                    value={header.notes}
                    onChange={(e) => updateHeader('notes', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 text-xs font-semibold text-blue-700">
                  {t('pricing.containerSpecification', 'Container Specification')}: {selectedSpec || '-'}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">{t('pricing.offerLineItems', 'Offer Line Items')}</h3>
                </div>
                <button type="button" onClick={addLineItem} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border">
                  <Plus className="h-4 w-4" /> {t('common.add', 'Add')}
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                    <div className="md:col-span-3">
                      <select
                        className="w-full px-3 py-2 border rounded-lg"
                        value={row.name}
                        onChange={(e) => patchLineItem(row.id, { name: e.target.value })}
                      >
                        {allowedItemNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <input
                        className="w-full px-3 py-2 border rounded-lg"
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
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder={t('pricing.amount', 'Amount')}
                        value={row.amount}
                        onChange={(e) => patchLineItem(row.id, { amount: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <select className="w-full px-3 py-2 border rounded-lg" value={row.currency} onChange={(e) => patchLineItem(row.id, { currency: e.target.value })}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeLineItem(row.id)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" form="offerForm" disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save Offer')}
          </button>
        </div>
      </div>
    </div>
  )
}
