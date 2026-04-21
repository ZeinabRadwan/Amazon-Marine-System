import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2, Ship, Truck } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { listClients, createClient } from '../../../api/clients'
import { listUsers } from '../../../api/users'
import { listPorts, createPort } from '../../../api/ports'
import { listShippingLines, createShippingLine } from '../../../api/shippingLines'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'

// A single reusable modal for both Create and Edit, switching between Sea/Inland form fields.
export default function OfferFormModal({ isOpen, onClose, onSuccess, offerToEdit }) {
  const { t } = useTranslation()
  const { create, update, loading, error } = useMutateOffer()

  const SEA_PRICE_KEYS = [
    { key: 'of20', label: "OF 20'DC", defaultCurrency: 'USD', icon: 'bx-dollar-circle' },
    { key: 'of40', label: "OF 40'HQ", defaultCurrency: 'USD', icon: 'bx-dollar-circle' },
    { key: 'thc20', label: "THC 20'DC", defaultCurrency: 'USD' },
    { key: 'thc40', label: "THC 40'HQ", defaultCurrency: 'USD' },
    { key: 'of40rf', label: "OF 40'RF (Reefer)", defaultCurrency: 'USD', isReefer: true },
    { key: 'thcRf', label: "THC 40'RF", defaultCurrency: 'USD', isReefer: true },
    { key: 'powerDay', label: "Power/day (Reefer)", defaultCurrency: 'USD', isReefer: true },
    { key: 'pti', label: "PTI (Reefer)", defaultCurrency: 'USD', isReefer: true },
  ]

  const INLAND_PRICE_KEYS = [
    { key: 't20d', label: "Truck - 1 x 20' Dry", defaultCurrency: 'EGP' },
    { key: 't20dx2', label: "Truck - 2 x 20' Dry", defaultCurrency: 'EGP' },
    { key: 't40d', label: "Truck - 1 x 40' Dry", defaultCurrency: 'EGP' },
    { key: 't40hq', label: "Truck - 1 x 40' High Cube", defaultCurrency: 'EGP' },
    { key: 't20r', label: "Truck - 1 x 20' Reefer", defaultCurrency: 'EGP', isReefer: true },
    { key: 't40r', label: "Truck - 1 x 40' Reefer", defaultCurrency: 'EGP', isReefer: true },
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

  const loadPortOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listPorts(token, { q, active: true })
      return (res.data || []).map(p => ({ value: p.name, label: p.name }))
    } catch {
      return []
    }
  }

  const handleCreatePort = async (name) => {
    const token = getStoredToken()
    if (!token) return null
    try {
      const res = await createPort(token, { name, active: true })
      const newPort = res.data ?? res
      return { value: newPort.name, label: newPort.name }
    } catch {
      return null
    }
  }

  const loadShippingLineOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listShippingLines(token, { q, active: true })
      return (res.data || []).map(l => ({ value: l.name, label: l.name }))
    } catch {
      return []
    }
  }

  const handleCreateShippingLine = async (name) => {
    const token = getStoredToken()
    if (!token) return null
    try {
      const res = await createShippingLine(token, { name, active: true })
      const newLine = res.data ?? res
      return { value: newLine.name, label: newLine.name }
    } catch {
      return null
    }
  }

  const loadRegionOptions = async (q) => {
    const defaultRegions = ["البحر الأحمر", "البحر المتوسط", "الخليج", "أوروبا", "أمريكا الشمالية"]
    const filtered = defaultRegions.filter(r => r.includes(q || ''))
    return filtered.map(r => ({ value: r, label: r }))
  }

  const handleCreateRegion = async (name) => {
    return { value: name, label: name }
  }

  const loadGovOptions = async (q) => {
    const filtered = GOVERNORATES.filter(g => g.toLowerCase().includes((q || '').toLowerCase()))
    return filtered.map(g => ({ value: g, label: g }))
  }

  const handleCreateGov = async (name) => {
    return { value: name, label: name }
  }

  const loadDestinationOptions = async (q) => {
    // We don't have a destination API yet, but we allow creating new ones
    return []
  }

  const handleCreateDestination = async (name) => {
    return { value: name, label: name }
  }

  const loadClientOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listClients(token, { q, active: true })
      return (res.data || []).map(c => ({ value: c.id, label: c.name || c.id }))
    } catch {
      return []
    }
  }

  const handleCreateClient = async (name) => {
    const token = getStoredToken()
    if (!token) return null
    try {
      const res = await createClient(token, { name, client_type: 'client' })
      const newClient = res.data ?? res
      return { value: newClient.id, label: newClient.name || newClient.id }
    } catch {
      return null
    }
  }

  const loadUserOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listUsers(token, { q })
      const data = res.data ?? res
      return (Array.isArray(data) ? data : []).map(u => ({ value: u.id, label: u.name || u.id }))
    } catch {
      return []
    }
  }

  useEffect(() => {
    if (offerToEdit && isOpen) {
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
        notes: offerToEdit.notes || '',
        sailing_dates: offerToEdit.sailing_dates || [],
        available_sailing_days: offerToEdit.available_sailing_days || [],
        weekly_sailings: offerToEdit.weekly_sailings || '',
        inland_port: offerToEdit.inland_port || '',
        destination: offerToEdit.destination || '',
        inland_gov: offerToEdit.inland_gov || '',
        inland_city: offerToEdit.inland_city || '',
        client_id: offerToEdit.client_id || '',
        sales_person_id: offerToEdit.sales_person_id || '',
        client_id: offerToEdit.client_id || '',
        sales_person_id: offerToEdit.sales_person_id || '',
        pricing: offerToEdit.pricing || {}
      })
    } else if (isOpen && !offerToEdit) {
      setFormData({
        pricing_type: 'sea',
        region: '', pod: '', shipping_line: '', pol: '', dnd: '', transit_time: '', free_time: '', 
        valid_from: '', valid_to: '', other_charges: '', notes: '', 
        sailing_dates: [], available_sailing_days: [], weekly_sailings: '',
        inland_port: '', destination: '', inland_gov: '', inland_city: '', 
        pricing: {}
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const pricingPayload = { ...formData.pricing }

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
                      <AsyncSelect
                        value={formData.pol ? { value: formData.pol, label: formData.pol } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, pol: opt?.value || '' }))}
                        loadOptions={loadPortOptions}
                        onCreate={handleCreatePort}
                        placeholder={t('pricing.pol', 'POL (Port of Loading)')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.pod', 'POD (Port of Discharge)')}</label>
                      <AsyncSelect
                        value={formData.pod ? { value: formData.pod, label: formData.pod } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, pod: opt?.value || '' }))}
                        loadOptions={loadPortOptions}
                        onCreate={handleCreatePort}
                        placeholder={t('pricing.pod', 'POD (Port of Discharge)')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.shippingLine', 'Shipping Line')}</label>
                      <AsyncSelect
                        value={formData.shipping_line ? { value: formData.shipping_line, label: formData.shipping_line } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, shipping_line: opt?.value || '' }))}
                        loadOptions={loadShippingLineOptions}
                        onCreate={handleCreateShippingLine}
                        placeholder={t('pricing.shippingLine', 'Shipping Line')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.region', 'Region / المنطقة')}</label>
                      <AsyncSelect
                        value={formData.region ? { value: formData.region, label: formData.region } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, region: opt?.value || '' }))}
                        loadOptions={loadRegionOptions}
                        onCreate={handleCreateRegion}
                        placeholder={t('pricing.region', 'Region / المنطقة')}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.inlandGov', 'Inland Governorate / المحافظة')}</label>
                      <AsyncSelect
                        value={formData.inland_gov ? { value: formData.inland_gov, label: formData.inland_gov } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, inland_gov: opt?.value || '' }))}
                        loadOptions={loadGovOptions}
                        onCreate={handleCreateGov}
                        placeholder={t('pricing.inlandGov', 'Inland Governorate / المحافظة')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.port', 'Inland Port')}</label>
                      <AsyncSelect
                        value={formData.inland_port ? { value: formData.inland_port, label: formData.inland_port } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, inland_port: opt?.value || '' }))}
                        loadOptions={loadPortOptions}
                        onCreate={handleCreatePort}
                        placeholder={t('pricing.port', 'Inland Port')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.destination', 'Destination / الوجهة')}</label>
                      <AsyncSelect
                        value={formData.destination ? { value: formData.destination, label: formData.destination } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, destination: opt?.value || '' }))}
                        loadOptions={loadDestinationOptions}
                        onCreate={handleCreateDestination}
                        placeholder={t('pricing.destination', 'Destination / الوجهة')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{t('pricing.inlandCity', 'Inland City / المدينة')}</label>
                      <AsyncSelect
                        value={formData.inland_city ? { value: formData.inland_city, label: formData.inland_city } : null}
                        onChange={(opt) => setFormData(p => ({ ...p, inland_city: opt?.value || '' }))}
                        loadOptions={loadDestinationOptions}
                        onCreate={handleCreateDestination}
                        placeholder={t('pricing.inlandCity', 'Inland City / المدينة')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: SPEC & SCHEDULE */}
              <div className="space-y-4">
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
                    return (
                      <div key={row.key} className={`flex items-center gap-2 p-2 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-colors ${row.isReefer ? 'bg-cyan-50/50 dark:bg-cyan-900/20' : 'bg-gray-50/50 dark:bg-gray-900/30'}`}>
                        <div className="flex-1 min-w-0">
                          <label className={`text-[10px] font-bold uppercase block truncate mb-1 ${row.isReefer ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500'}`}>
                            {row.label}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={formData.pricing?.[row.key]?.price ?? ''}
                              onChange={(e) => handlePriceChange(row.key, 'price', e.target.value)}
                              className="w-full bg-transparent font-bold text-sm outline-none"
                              placeholder="0"
                              step="0.01"
                              min="0"
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.otherCharges', 'Other Charges')}</label>
                    <input name="other_charges" value={formData.other_charges} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder={t('pricing.otherChargesPlaceholder', 'e.g., specific destination fees')} />
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
    </div>
  )
}
