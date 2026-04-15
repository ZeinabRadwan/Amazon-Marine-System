import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2, Ship, Truck } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { getStoredToken } from '../../Login'
import { listPorts } from '../../../api/ports'
import { listShippingLines } from '../../../api/shippingLines'

// A single reusable modal for both Create and Edit, switching between Sea/Inland form fields.
export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit }) {
  const { t } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()

  const SEA_PRICE_KEYS = [
    { key: 'ocean', label: "Ocean Freight", defaultCurrency: 'USD' },
    { key: 'thc', label: "THC", defaultCurrency: 'USD' },
    { key: 'power', label: 'Power', defaultCurrency: 'USD' },
    { key: 'bl', label: 'B/L Fee', defaultCurrency: 'USD' },
    { key: 'telex', label: 'Telex Release', defaultCurrency: 'USD' },
  ]

  const INLAND_PRICE_KEYS = [
    { key: 'inland', label: "Inland Rate", defaultCurrency: 'EGP' },
    { key: 'generator', label: 'Generator', defaultCurrency: 'EGP' },
  ]

  const GOVERNORATES = [
    "Cairo", "Alexandria", "Giza", "Suez", "Port Said", "Damietta", "Sharqia", "Dakahlia", "Kafr El Sheikh", "Gharbia", "Monufia", "Beheira", "Ismailia", "Beni Suef", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Red Sea", "New Valley", "Matrouh", "North Sinai", "South Sinai", "Qalyubia", "Fayoum"
  ]

  const WEEK_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  
  const [formData, setFormData] = useState({
    pricing_type: 'sea',
    container_type: 'Dry',
    container_size: '20',
    container_height: 'Standard',
    region: '',
    pod: '',
    shipping_line: '',
    pol: '',
    dnd: '',
    transit_time: '',
    free_time: '',
    valid_from: '',
    valid_to: '',
    other_charges: '',
    other_chars_list: [], // [{ name, description, amount, currency }]
    notes: '',
    sailing_dates: [],
    available_sailing_days: [],
    weekly_sailings: '',
    inland_port: '',
    destination: '',
    inland_gov: '',
    inland_city: '',
    pricing: {}
  })

  // Prefill when editing
  const [ports, setPorts] = useState([])
  const [shippingLines, setShippingLines] = useState([])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    listPorts(token).then(res => setPorts(res.data || []))
    listShippingLines(token).then(res => setShippingLines(res.data || []))
  }, [])

  useEffect(() => {
    if (offerToEdit && isOpen) {
      // Extract other charges from pricing object
      const otherList = []
      const pricing = offerToEdit.pricing || {}
      Object.keys(pricing).forEach(k => {
        if (k.startsWith('other_')) {
          otherList.push({
            name: pricing[k].name,
            description: pricing[k].description,
            price: pricing[k].price,
            currency: pricing[k].currency
          })
        }
      })

      setFormData({
        pricing_type: offerToEdit.pricing_type || 'sea',
        container_type: offerToEdit.container_type || 'Dry',
        container_size: offerToEdit.container_size || '20',
        container_height: offerToEdit.container_height || 'Standard',
        region: offerToEdit.region || '',
        pod: offerToEdit.pod || '',
        shipping_line: offerToEdit.shipping_line || '',
        pol: offerToEdit.pol || '',
        dnd: offerToEdit.dnd || '',
        transit_time: offerToEdit.transit_time || '',
        free_time: offerToEdit.free_time || '',
        valid_from: offerToEdit.valid_from || '',
        valid_to: offerToEdit.valid_to || '',
        other_charges: offerToEdit.other_charges || '',
        other_chars_list: otherList,
        notes: offerToEdit.notes || '',
        sailing_dates: offerToEdit.sailing_dates || [],
        available_sailing_days: offerToEdit.available_sailing_days || [],
        weekly_sailings: offerToEdit.weekly_sailings || '',
        inland_port: offerToEdit.inland_port || '',
        destination: offerToEdit.destination || '',
        inland_gov: offerToEdit.inland_gov || '',
        inland_city: offerToEdit.inland_city || '',
        pricing: offerToEdit.pricing || {}
      })
    } else if (isOpen && !offerToEdit) {
      setFormData({
        pricing_type: 'sea',
        container_type: 'Dry', container_size: '20', container_height: 'Standard',
        region: '', pod: '', shipping_line: '', pol: '', dnd: '', transit_time: '', free_time: '', 
        valid_from: '', valid_to: '', other_charges: '', other_chars_list: [], notes: '', 
        sailing_dates: [], available_sailing_days: [], weekly_sailings: '',
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

  const toggleSailingDay = (day) => {
    setFormData(p => {
      const days = [...(p.available_sailing_days || [])]
      const idx = days.indexOf(day)
      if (idx > -1) days.splice(idx, 1)
      else days.push(day)
      return { ...p, available_sailing_days: days }
    })
  }

  const addOtherCharge = () => {
    setFormData(p => ({
      ...p,
      other_chars_list: [...(p.other_chars_list || []), { name: '', description: '', price: '', currency: 'USD' }]
    }))
  }

  const updateOtherCharge = (idx, field, val) => {
    setFormData(p => {
      const list = [...(p.other_chars_list || [])]
      list[idx] = { ...list[idx], [field]: val }
      return { ...p, other_chars_list: list }
    })
  }

  const removeOtherCharge = (idx) => {
    setFormData(p => {
      const list = [...(p.other_chars_list || [])]
      list.splice(idx, 1)
      return { ...p, other_chars_list: list }
    })
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
      const pricingPayload = { ...formData.pricing }
      // Add other charges to pricing
      formData.other_chars_list.forEach((item, idx) => {
        if (!item.name || !item.price) return
        pricingPayload[`other_${idx}`] = {
          name: item.name,
          description: item.description,
          price: Number(item.price),
          currency: item.currency || 'USD'
        }
      })

      const cleaned = {
        ...formData,
        pricing: pricingPayload,
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
            
            {!offerToEdit && (
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, pricing_type: 'sea'}))}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${isSea ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Ship className="h-4 w-4" /> {t('pricing.shippingLines', 'Sea Freight')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, pricing_type: 'inland'}))}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${!isSea ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Truck className="h-4 w-4" /> {t('pricing.inlandTransport', 'Inland')}
                </button>
              </div>
            )}

            <div className="space-y-6">
              {/* SECTION: ROUTE & LOGISTICS */}
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <span className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700"></span> 
                  {t('pricing.route', 'Route & Logistics')}
                </h4>
                
                {isSea ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.pol', 'POL (Port of Loading)')}</label>
                      <input required type="text" list="portList" name="pol" value={formData.pol} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.pod', 'POD (Port of Discharge)')}</label>
                      <input required type="text" list="portList" name="pod" value={formData.pod} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.shippingLine', 'Shipping Line')}</label>
                      <input required type="text" list="lineList" name="shipping_line" value={formData.shipping_line} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.region', 'Region')}</label>
                      <input required type="text" name="region" value={formData.region} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.inlandGov', 'Inland Governorate')}</label>
                      <select required name="inland_gov" value={formData.inland_gov} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20">
                        <option value="">{t('pricing.selectGov', 'Select Governorate')}</option>
                        {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.port', 'Inland Port')}</label>
                      <input required type="text" list="portList" name="inland_port" value={formData.inland_port} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.destination', 'Destination')}</label>
                      <input required type="text" name="destination" value={formData.destination} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.inlandCity', 'Inland City')}</label>
                      <input type="text" name="inland_city" value={formData.inland_city} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: SPEC & SCHEDULE */}
              <div className="space-y-4">
                {/* CONTAINER SPEC */}
                <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                    <span className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700"></span> 
                    {t('pricing.containerSpec', 'Container Spec')}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-3 gap-2">
                       <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.type', 'Type')}</label>
                        <select name="container_type" value={formData.container_type} onChange={handleChange} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none">
                          <option value="Dry">Dry</option>
                          <option value="Reefer">Reefer</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.size', 'Size')}</label>
                        <select name="container_size" value={formData.container_size} onChange={handleChange} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none">
                          <option value="20">20'</option>
                          <option value="40">40'</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.height', 'Height')}</label>
                        <select name="container_height" value={formData.container_height} onChange={handleChange} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none">
                          <option value="Standard">Std</option>
                          <option value="HQ">HQ</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCHEDULE */}
                <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                    <span className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700"></span> 
                    {t('pricing.availableSailings', 'Sailing Schedule')}
                  </h4>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {WEEK_DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleSailingDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${formData.available_sailing_days?.includes(day) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-transparent text-gray-400 border-gray-100 dark:border-gray-700 hover:border-gray-300'}`}
                      >
                        {t(`common.days.${day}`, day)}
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="max-w-[100%] grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                          {t('pricing.transitTime', 'Transit / مدة الرحلة')}
                        </label>
                        <input 
                          type="number" 
                          name="transit_time"
                          placeholder="0" 
                          value={formData.transit_time} 
                          onChange={handleChange}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                          {t('pricing.freeTime', 'Free Time / فترة السماح')}
                        </label>
                        <input 
                          type="number" 
                          name="free_time"
                          placeholder="0" 
                          value={formData.free_time} 
                          onChange={handleChange}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none" 
                        />
                      </div>
                    </div>
                    <div className="max-w-[200px] space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                        {t('pricing.sailingsPerWeek', 'Sailings per week / عدد مرات الإبحار أسبوعياً')}
                      </label>
                      <input 
                        type="number" 
                        name="weekly_sailings"
                        placeholder="0" 
                        value={formData.weekly_sailings} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-black text-blue-600 outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: PRICING */}
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <span className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700"></span> 
                  {t('pricing.basePricing', 'Pricing Details')}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {priceKeys.map((row) => {
                    if (formData.container_type === 'Dry' && (row.key === 'power' || row.key === 'pti')) return null;
                    return (
                      <div key={row.key} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block truncate mb-1">{row.label}</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={formData.pricing?.[row.key]?.price ?? ''}
                              onChange={(e) => handlePriceChange(row.key, 'price', e.target.value)}
                              className="w-full bg-transparent font-bold text-sm outline-none"
                              placeholder="0.00"
                            />
                            <select
                              value={formData.pricing?.[row.key]?.currency || row.defaultCurrency}
                              onChange={(e) => handlePriceChange(row.key, 'currency', e.target.value)}
                              className="bg-transparent text-[10px] font-bold text-blue-500 cursor-pointer outline-none"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="EGP">EGP</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SECTION: OTHER CHARGES */}
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700"></span> 
                    {t('pricing.otherCharges', 'Other Charges')}
                  </h4>
                  <button type="button" onClick={addOtherCharge} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Plus className="h-3 w-3" /> {t('common.add', 'Add Charge')}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {formData.other_chars_list?.map((item, idx) => (
                    <div key={idx} className="p-3 border border-gray-100 dark:border-gray-700/50 rounded-xl bg-gray-50/30 space-y-2 relative group">
                      <button type="button" onClick={() => removeOtherCharge(idx)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder={t('common.name', 'Name')} value={item.name} onChange={e => updateOtherCharge(idx, 'name', e.target.value)} className="px-3 py-1.5 bg-white dark:bg-gray-900 border rounded-lg text-xs" />
                        <div className="flex items-center gap-2 border rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5">
                          <input placeholder={t('pricing.price', 'Price')} type="number" value={item.price} onChange={e => updateOtherCharge(idx, 'price', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none" />
                          <select value={item.currency} onChange={e => updateOtherCharge(idx, 'currency', e.target.value)} className="bg-transparent text-[10px] font-bold text-blue-500 outline-none">
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="EGP">EGP</option>
                          </select>
                        </div>
                      </div>
                      <input placeholder={t('common.description', 'Description')} value={item.description} onChange={e => updateOtherCharge(idx, 'description', e.target.value)} className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border rounded-lg text-xs" />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: VALIDITY & NOTES */}
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <span className="w-8 h-[1px] bg-gray-200 dark:bg-gray-700"></span> 
                  {t('pricing.validity', 'Validity & Notes')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.validFrom', 'Valid From')}</label>
                    <input type="date" name="valid_from" value={formData.valid_from} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.validTo', 'Valid To')}</label>
                    <input required type="date" name="valid_to" value={formData.valid_to} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.notes', 'General Notes')}</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 h-20" placeholder={t('pricing.notesPlaceholder', 'Additional terms, vessel info...')}></textarea>
                  </div>
                </div>
              </div>
            </div>

            
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

      <datalist id="portList">
        {ports.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      <datalist id="lineList">
        {shippingLines.map(sl => <option key={sl.id} value={sl.name} />)}
      </datalist>
    </div>
  )
}
