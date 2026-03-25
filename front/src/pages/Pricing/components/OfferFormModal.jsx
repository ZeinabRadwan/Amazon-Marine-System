import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, FileText, Ship, Truck } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'

// A single reusable modal for both Create and Edit, switching between Sea/Inland form fields.
export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit }) {
  const { t } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()
  
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (offerToEdit?.id) {
        await update(offerToEdit.id, formData)
      } else {
        await create(formData)
      }
      onSuccess?.()
      onClose()
    } catch(err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  const isSea = formData.pricing_type === 'sea'

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
                    <input type="text" name="shipping_line" value={formData.shipping_line} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Transit Time</label>
                    <input type="text" name="transit_time" placeholder="e.g. 5 days" value={formData.transit_time} onChange={handleChange} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-xl" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-widest">Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-12 shrink-0">OF 20'</span>
                      <input type="number" placeholder="Price" value={formData.pricing?.of20?.price || ''} onChange={e => handlePriceChange('of20', 'price', Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                      <input type="text" placeholder="USD" value={formData.pricing?.of20?.currency || 'USD'} onChange={e => handlePriceChange('of20', 'currency', e.target.value)} className="w-16 px-3 py-1.5 border rounded-lg text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-12 shrink-0">OF 40'</span>
                      <input type="number" placeholder="Price" value={formData.pricing?.of40?.price || ''} onChange={e => handlePriceChange('of40', 'price', Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                       <input type="text" placeholder="USD" value={formData.pricing?.of40?.currency || 'USD'} onChange={e => handlePriceChange('of40', 'currency', e.target.value)} className="w-16 px-3 py-1.5 border rounded-lg text-sm" />
                    </div>
                  </div>
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
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-widest">Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-16 shrink-0">20' Dry</span>
                      <input type="number" placeholder="Price" value={formData.pricing?.t20d?.price || ''} onChange={e => handlePriceChange('t20d', 'price', Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                      <input type="text" placeholder="EGP" value={formData.pricing?.t20d?.currency || 'EGP'} onChange={e => handlePriceChange('t20d', 'currency', e.target.value)} className="w-16 px-3 py-1.5 border rounded-lg text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-16 shrink-0">40' HQ/Dry</span>
                      <input type="number" placeholder="Price" value={formData.pricing?.t40d?.price || ''} onChange={e => handlePriceChange('t40d', 'price', Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                       <input type="text" placeholder="EGP" value={formData.pricing?.t40d?.currency || 'EGP'} onChange={e => handlePriceChange('t40d', 'currency', e.target.value)} className="w-16 px-3 py-1.5 border rounded-lg text-sm" />
                    </div>
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
