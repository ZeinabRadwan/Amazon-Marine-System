import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2, Ship, Truck } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'

// A single reusable modal for both Create and Edit, switching between Sea/Inland form fields.
export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit }) {
  const { t } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()

  const SEA_PRICE_KEYS = [
    { key: 'of20', label: "OF 20'DC", defaultCurrency: 'USD' },
    { key: 'of40', label: "OF 40'HQ", defaultCurrency: 'USD' },
    { key: 'thc20', label: "THC 20'DC", defaultCurrency: 'USD' },
    { key: 'thc40', label: "THC 40'HQ", defaultCurrency: 'USD' },
    { key: 'of40rf', label: "OF 40'RF (Reefer)", defaultCurrency: 'USD' },
    { key: 'thcRf', label: "THC 40'RF", defaultCurrency: 'USD' },
    { key: 'powerDay', label: 'Power/day (Reefer)', defaultCurrency: 'USD' },
    { key: 'pti', label: 'PTI (Reefer)', defaultCurrency: 'USD' },
  ]

  const INLAND_PRICE_KEYS = [
    { key: 't20d', label: "20' Dry", defaultCurrency: 'EGP' },
    { key: 't40d', label: "40' Dry", defaultCurrency: 'EGP' },
    { key: 't40hq', label: "40' HQ", defaultCurrency: 'EGP' },
    { key: 't20r', label: "20' Reefer", defaultCurrency: 'EGP' },
    { key: 't40r', label: "40' Reefer", defaultCurrency: 'EGP' },
    { key: 'generator', label: 'Generator', defaultCurrency: 'EGP' },
  ]
  
  const [formData, setFormData] = useState({
    pricing_type: 'sea',
    region: '',
    pod: '',
    shipping_line: '',
    pol: '',
    dnd: '',
    transit_time: '',
    valid_to: '',
    other_charges: '',
    notes: '',
    sailing_dates: [],
    inland_port: '',
    destination: '',
    inland_gov: '',
    inland_city: '',
    pricing: {}
  })

  // Prefill when editing
  useEffect(() => {
    if (offerToEdit && isOpen) {
      setFormData({
        pricing_type: offerToEdit.pricing_type || 'sea',
        region: offerToEdit.region || '',
        pod: offerToEdit.pod || '',
        shipping_line: offerToEdit.shipping_line || '',
        pol: offerToEdit.pol || '',
        dnd: offerToEdit.dnd || '',
        transit_time: offerToEdit.transit_time || '',
        valid_to: offerToEdit.valid_to || '',
        other_charges: offerToEdit.other_charges || '',
        notes: offerToEdit.notes || '',
        sailing_dates: offerToEdit.sailing_dates || [],
        inland_port: offerToEdit.inland_port || '',
        destination: offerToEdit.destination || '',
        inland_gov: offerToEdit.inland_gov || '',
        inland_city: offerToEdit.inland_city || '',
        pricing: offerToEdit.pricing || {}
      })
    } else if (isOpen && !offerToEdit) {
      // Reset form on new open
      setFormData({
        pricing_type: 'sea',
        region: '', pod: '', shipping_line: '', pol: '', dnd: '', transit_time: '', valid_to: '', other_charges: '', notes: '', sailing_dates: [],
        inland_port: '', destination: '', inland_gov: '', inland_city: '', pricing: {}
      })
    }
  }, [offerToEdit, isOpen])

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  const handlePriceChange = (key, field, val) => {
    setFormData(p => ({
      ...p,
      pricing: {
        ...p.pricing,
        [key]: {
          ...p.pricing[key],
          [field]: val
        }
      }
    }))
  }

  const addSailingDate = () => {
    setFormData(p => ({ ...p, sailing_dates: [...(p.sailing_dates || []), ''] }))
  }

  const updateSailingDate = (idx, value) => {
    setFormData(p => {
      const next = [...(p.sailing_dates || [])]
      next[idx] = value
      return { ...p, sailing_dates: next }
    })
  }

  const removeSailingDate = (idx) => {
    setFormData(p => {
      const next = [...(p.sailing_dates || [])]
      next.splice(idx, 1)
      return { ...p, sailing_dates: next }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const cleaned = {
        ...formData,
        sailing_dates: (formData.sailing_dates || []).filter(Boolean),
      }
      if (offerToEdit?.id) {
        await update(offerToEdit.id, cleaned)
      } else {
        await create(cleaned)
      }
      onSuccess?.()
      onClose()
    } catch(err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  const isSea = formData.pricing_type === 'sea'
  const priceKeys = isSea ? SEA_PRICE_KEYS : INLAND_PRICE_KEYS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {offerToEdit ? t('pricing.editOffer', 'Edit Offer') : t('pricing.addOffer', 'Add New Offer')}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">
              {error}
            </div>
          )}

          <form id="offerForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Form Fields depend on pricing_type */}
            {!offerToEdit && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, pricing_type: 'sea'}))}
                  className={`p-4 border rounded-xl flex items-center gap-3 font-semibold transition-all ${isSea ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'}`}
                >
                  <Ship className="h-5 w-5" /> Sea Freight
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, pricing_type: 'inland'}))}
                  className={`p-4 border rounded-xl flex items-center gap-3 font-semibold transition-all ${!isSea ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'}`}
                >
                  <Truck className="h-5 w-5" /> Inland Transport
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Valid To</label>
                <input required type="date" name="valid_to" value={formData.valid_to} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Notes</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {isSea ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Region</label>
                    <input required type="text" name="region" value={formData.region} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">POD (Port of Discharge)</label>
                    <input required type="text" name="pod" value={formData.pod} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Shipping Line</label>
                    <input required type="text" name="shipping_line" value={formData.shipping_line} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">POL</label>
                    <input required type="text" name="pol" value={formData.pol} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Transit Time</label>
                    <input type="text" name="transit_time" placeholder="e.g. 5 days" value={formData.transit_time} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">D&D / Free Days</label>
                    <input type="text" name="dnd" value={formData.dnd} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Other Charges</label>
                    <input type="text" name="other_charges" value={formData.other_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-widest">Pricing</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {priceKeys.map((row) => (
                      <div key={row.key} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-32 shrink-0">{row.label}</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={formData.pricing?.[row.key]?.price ?? ''}
                          onChange={(e) => handlePriceChange(row.key, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        />
                        <select
                          value={formData.pricing?.[row.key]?.currency || row.defaultCurrency}
                          onChange={(e) => handlePriceChange(row.key, 'currency', e.target.value)}
                          className="w-20 px-2 py-1.5 border rounded-lg text-sm"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="EGP">EGP</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-widest">
                      {t('pricing.sailingDates', 'Sailing Dates')}
                    </h4>
                    <button type="button" onClick={addSailingDate} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <Plus className="h-4 w-4" /> {t('common.add', 'Add')}
                    </button>
                  </div>

                  {(formData.sailing_dates || []).length === 0 ? (
                    <div className="text-sm text-gray-500">{t('pricing.noSailingDates', 'No sailing dates added')}</div>
                  ) : (
                    <div className="space-y-2">
                      {(formData.sailing_dates || []).map((d, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="date"
                            value={d || ''}
                            onChange={(e) => updateSailingDate(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900"
                          />
                          <button type="button" onClick={() => removeSailingDate(idx)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Inland Governorate</label>
                    <input required type="text" name="inland_gov" value={formData.inland_gov} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Inland Port</label>
                    <input required type="text" name="inland_port" value={formData.inland_port} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Destination</label>
                    <input required type="text" name="destination" value={formData.destination} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Inland City</label>
                    <input type="text" name="inland_city" value={formData.inland_city} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-widest">Pricing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {priceKeys.map((row) => (
                      <div key={row.key} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-32 shrink-0">{row.label}</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={formData.pricing?.[row.key]?.price ?? ''}
                          onChange={(e) => handlePriceChange(row.key, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        />
                        <select
                          value={formData.pricing?.[row.key]?.currency || row.defaultCurrency}
                          onChange={(e) => handlePriceChange(row.key, 'currency', e.target.value)}
                          className="w-20 px-2 py-1.5 border rounded-lg text-sm"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="EGP">EGP</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
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
