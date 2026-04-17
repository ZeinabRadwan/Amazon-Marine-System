import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'
import { getStoredToken } from '../../Login'
import { listClients, createClient } from '../../../api/clients'
import { listUsers } from '../../../api/users'
import { listPorts, createPort } from '../../../api/ports'
import { listShippingLines, createShippingLine } from '../../../api/shippingLines'
import AsyncSelect from '../../../components/AsyncSelect'

const CONTAINER_TYPES = ['20 Dry', '40 Dry', '40HQ Dry', '20 Reefer', '40 Reefer']

function moneySymbol(currency) {
  if (currency === 'EUR') return '€'
  if (currency === 'EGP') return 'E£'
  return '$'
}

function calcTotal(items) {
  return (items || []).reduce((acc, it) => {
    const cur = it.currency || 'USD'
    acc[cur] = (acc[cur] || 0) + (Number(it.amount) || 0)
    return acc
  }, {})
}

export default function CreateQuoteModal({ isOpen, onClose, onSuccess, sourceOffer }) {
  const { t } = useTranslation()
  const { create, loading, error } = useMutateQuote()

  const [form, setForm] = useState({
    client_id: '', sales_user_id: '', pricing_offer_id: '',
    pol: '', pod: '', shipping_line: '',
    container_type: 'Dry',
    container_size: '40',
    container_height: 'HQ',
    available_sailing_days: [],
    weekly_sailings: '',
    qty: 1, transit_time: '', free_time: '', valid_from: '', valid_to: '',
    notes: '', sailing_dates: [],
    items: [
      { code: 'ocean', name: 'Ocean Freight', description: '', cost: 0, amount: '', currency: 'USD' },
      { code: 'thc', name: 'THC', description: '', cost: 0, amount: '', currency: 'USD' },
    ],
  })
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    const token = getStoredToken()
    if (!token || !isOpen) return
    listClients(token).then(res => setClients(res.data || []))
    listUsers(token).then(res => setUsers(res.data || []))
  }, [isOpen])

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
    if (!isOpen) return

    if (sourceOffer) {
      const containerSpec = trimSpec(sourceOffer)
      const offerItems = []
      if (sourceOffer.pricing) {
        Object.keys(sourceOffer.pricing).forEach(code => {
          const it = sourceOffer.pricing[code]
          if (it.price > 0 || it.name) {
            offerItems.push({
              code: code,
              name: it.name || getDefaultItemName(code),
              description: it.description || '',
              cost: it.price || 0,
              amount: '',
              currency: it.currency || 'USD'
            })
          }
        })
      }

      setForm({
        client_id: '',
        sales_user_id: '',
        pricing_offer_id: sourceOffer.id,
        pol: sourceOffer.pol || '',
        pod: sourceOffer.pod || '',
        shipping_line: sourceOffer.shipping_line || '',
        container_type: sourceOffer.container_type || 'Dry',
        container_size: sourceOffer.container_size || '40',
        container_height: sourceOffer.container_height || 'HQ',
        available_sailing_days: sourceOffer.available_sailing_days || [],
        weekly_sailings: sourceOffer.weekly_sailings || '',
        qty: 1,
        transit_time: sourceOffer.transit_time || '',
        free_time: sourceOffer.free_time || '',
        valid_from: sourceOffer.valid_from || '',
        valid_to: sourceOffer.valid_to || '',
        notes: sourceOffer.notes || '',
        sailing_dates: sourceOffer.sailing_dates || [],
        items: offerItems.length > 0 ? offerItems : [
          { code: 'ocean', name: 'Ocean Freight', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'thc', name: 'THC', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'power', name: 'Power', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'bl', name: 'B/L Fee', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'telex', name: 'Telex Release', description: '', cost: 0, amount: '', currency: 'USD' },
        ],
      })
    } else {
      setForm({
        client_id: '',
        sales_user_id: '',
        pricing_offer_id: '',
        pol: '',
        pod: '',
        shipping_line: '',
        container_type: 'Dry',
        container_size: '40',
        container_height: 'HQ',
        available_sailing_days: [],
        weekly_sailings: '',
        qty: 1,
        transit_time: '',
        free_time: '',
        valid_from: '',
        valid_to: '',
        notes: '',
        sailing_dates: [],
        items: [
          { code: 'ocean', name: 'Ocean Freight', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'thc', name: 'THC', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'power', name: 'Power', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'bl', name: 'B/L Fee', description: '', cost: 0, amount: '', currency: 'USD' },
          { code: 'telex', name: 'Telex Release', description: '', cost: 0, amount: '', currency: 'USD' },
        ],
      })
    }
  }, [isOpen, sourceOffer])

  const trimSpec = (o) => {
    return [o.container_size, o.container_height === 'Standard' ? '' : o.container_height, o.container_type]
      .filter(Boolean).join(' ')
  }

  const getFullContainerSpec = (f) => {
    return [f.container_size, f.container_height === 'Standard' ? '' : f.container_height, f.container_type]
      .filter(Boolean).join(' ')
  }

  const getDefaultItemName = (code) => {
    const map = {
      ocean: 'Ocean Freight',
      thc: 'THC',
      power: 'Power',
      bl: 'B/L Fee',
      telex: 'Telex Release'
    }
    return map[code.toLowerCase()] || code
  }

  const isReefer = useMemo(() => (form.container_type || '').toLowerCase().includes('reefer'), [form.container_type])

  const total = useMemo(() => calcTotal(form.items), [form.items])

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const toggleSailingDay = (day) => {
    setForm(p => {
      const current = p.available_sailing_days || []
      const next = current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day]
      return { ...p, available_sailing_days: next }
    })
  }

  const WEEK_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

  const addItem = () => {
    setForm((p) => ({
      ...p,
      items: [...(p.items || []), { code: '', name: '', description: '', amount: '', currency: 'USD' }],
    }))
  }

  const updateItem = (idx, patch) => {
    setForm((p) => {
      const next = [...(p.items || [])]
      next[idx] = { ...next[idx], ...patch }
      return { ...p, items: next }
    })
  }

  const removeItem = (idx) => {
    setForm((p) => {
      const next = [...(p.items || [])]
      next.splice(idx, 1)
      return { ...p, items: next }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      ...form,
      client_id: form.client_id ? Number(form.client_id) : null,
      sales_user_id: form.sales_user_id ? Number(form.sales_user_id) : null,
      pricing_offer_id: form.pricing_offer_id ? Number(form.pricing_offer_id) : null,
      container_type: getFullContainerSpec(form),
      qty: form.qty ? Number(form.qty) : null,
      sailing_dates: (form.sailing_dates || []).filter(Boolean),
      items: (form.items || [])
        .filter((it) => it.name && String(it.name).trim().length > 0)
        .map((it) => ({
          code: it.code || null,
          name: it.name,
          description: it.description || null,
          amount: Number(it.amount) || 0,
          currency: it.currency || 'USD',
        })),
    }

    try {
      await create(payload)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold">{t('pricing.createQuote', 'Create Quote')}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/40 dark:text-red-300">
              {error}
            </div>
          )}

          <form id="quoteForm" onSubmit={handleSubmit} className="space-y-8">
            {/* SECTION 1: METRICS & HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.client', 'Client / العميل')}</label>
                <AsyncSelect
                  value={(() => {
                    const c = clients.find(x => String(x.id) === String(form.client_id))
                    return c ? { value: c.id, label: c.name } : null
                  })()}
                  onChange={(opt) => setField('client_id', opt?.value || '')}
                  loadOptions={loadClientOptions}
                  onCreate={handleCreateClient}
                  placeholder={t('pricing.client', 'Client / العميل')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.salesUser', 'Sales Person / المسؤول')}</label>
                <AsyncSelect
                  value={(() => {
                    const u = users.find(x => String(x.id) === String(form.sales_user_id))
                    return u ? { value: u.id, label: u.name } : null
                  })()}
                  onChange={(opt) => setField('sales_user_id', opt?.value || '')}
                  loadOptions={loadUserOptions}
                  placeholder={t('pricing.salesUser', 'Sales Person / المسؤول')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.quoteNo', 'Quote No')}</label>
                <div className="px-3 py-2 bg-white/50 dark:bg-gray-900/50 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl font-mono text-xs">
                  {t('pricing.autoGenerated', 'AUTO-GEN')}
                </div>
              </div>
              {form.pricing_offer_id && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.offerId', 'Ref Offer')}</label>
                  <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded-xl font-bold text-xs">
                    #{form.pricing_offer_id}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.validFrom', 'Valid From / صالح من')}</label>
                <input type="date" value={form.valid_from} onChange={(e) => setField('valid_from', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.validTo', 'Valid To / صالح حتى')}</label>
                <input type="date" value={form.valid_to} onChange={(e) => setField('valid_to', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.qty', 'Qty / الكمية')}</label>
                <input type="number" value={form.qty} onChange={(e) => setField('qty', e.target.value)} className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl text-sm font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20" min={1} />
              </div>
            </div>

            {/* SECTION 2: ROUTE & SPEC */}
            <div className="space-y-4">
              {/* ROUTE INFO */}
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-6 h-[1px] bg-gray-200 dark:bg-gray-700"></span>
                  {t('pricing.route', 'Route Info / المسار واللوجستيات')}
                </h4>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 flex items-center gap-3 w-full">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.pol', 'POL / التحميل')}</label>
                      <AsyncSelect
                        value={form.pol ? { value: form.pol, label: form.pol } : null}
                        onChange={(opt) => setField('pol', opt?.value || '')}
                        loadOptions={loadPortOptions}
                        onCreate={handleCreatePort}
                        placeholder={t('pricing.pol', 'POL / التحميل')}
                      />
                    </div>
                    <div className="text-gray-300 mt-5">→</div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.pod', 'POD / الوصول')}</label>
                      <AsyncSelect
                        value={form.pod ? { value: form.pod, label: form.pod } : null}
                        onChange={(opt) => setField('pod', opt?.value || '')}
                        loadOptions={loadPortOptions}
                        onCreate={handleCreatePort}
                        placeholder={t('pricing.pod', 'POD / الوصول')}
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.shippingLine', 'Shipping Line / الخط الملاحي')}</label>
                    <AsyncSelect
                      value={form.shipping_line ? { value: form.shipping_line, label: form.shipping_line } : null}
                      onChange={(opt) => setField('shipping_line', opt?.value || '')}
                      loadOptions={loadShippingLineOptions}
                      onCreate={handleCreateShippingLine}
                      placeholder={t('pricing.shippingLine', 'Shipping Line / الخط الملاحي')}
                    />
                  </div>
                </div>
              </div>

              {/* CONTAINER SPEC */}
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-6 h-[1px] bg-gray-200 dark:bg-gray-700"></span>
                  {t('pricing.containerSpec', 'Container Spec / مواصفات الحاوية')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.type', 'Type / النوع')}</label>
                    <select value={form.container_type} onChange={(e) => setField('container_type', e.target.value)} className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none">
                      <option value="Dry">Dry</option>
                      <option value="Reefer">Reefer</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.size', 'Size / المقاس')}</label>
                    <select value={form.container_size} onChange={(e) => setField('container_size', e.target.value)} className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none">
                      <option value="20">20'</option>
                      <option value="40">40'</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('pricing.height', 'Height / الارتفاع')}</label>
                    <select value={form.container_height} onChange={(e) => setField('container_height', e.target.value)} className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none">
                      <option value="Standard">Std</option>
                      <option value="HQ">HQ</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: SAILING SCHEDULE (TRUE SEPARATE LINE) */}
            <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <span className="w-6 h-[1px] bg-gray-200 dark:bg-gray-700"></span>
                {t('pricing.availableSailings', 'Available Sailings')}
              </h4>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {WEEK_DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleSailingDay(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${form.available_sailing_days?.includes(day) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-transparent text-gray-400 border-gray-100 dark:border-gray-700 hover:border-gray-300'}`}
                  >
                    {t(`common.days.${day}`, day)}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                       {t('pricing.transitTime', 'Transit / مدة الرحلة')}
                    </label>
                    <input 
                      value={form.transit_time} 
                      onChange={(e) => setField('transit_time', e.target.value)} 
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none" 
                      placeholder="Days" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                       {t('pricing.freeTime', 'Free Time / فترة السماح')}
                    </label>
                    <input 
                      value={form.free_time} 
                      onChange={(e) => setField('free_time', e.target.value)} 
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none" 
                      placeholder="Days" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                      {t('pricing.sailingsPerWeek', 'Sailings per week / عدد مرات الإبحار أسبوعياً')}
                    </label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={form.weekly_sailings} 
                      onChange={(e) => setField('weekly_sailings', e.target.value)} 
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-black text-blue-600 outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: FINANCIAL ITEMS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  <span className="w-6 h-[1px] bg-gray-200 dark:bg-gray-700"></span>
                  {t('pricing.items', 'Financial Breakdown')}
                </h3>
                <button type="button" onClick={addItem} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Plus className="h-4 w-4" /> {t('common.add', 'Add Item')}
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 dark:border-gray-700/50">
                  <div className="col-span-2">Ref</div>
                  <div className="col-span-5">{t('common.name', 'Item Name')}</div>
                  <div className="col-span-3">{t('pricing.amount', 'Amount')}</div>
                  <div className="col-span-1 text-center">{t('pricing.currency', 'Curr')}</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(form.items || []).map((it, idx) => {
                    if (!isReefer && it.code === 'power') return null

                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                        <div className="col-span-2">
                          <input className="w-full bg-transparent text-xs font-mono text-gray-400 outline-none" placeholder="code" value={it.code} onChange={(e) => updateItem(idx, { code: e.target.value })} />
                        </div>
                        <div className="col-span-5">
                          <input className="w-full bg-transparent text-sm font-bold placeholder-gray-300 outline-none" placeholder={t('common.name', 'Name')} value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                          <input className="w-full bg-transparent text-[10px] text-gray-400 outline-none mt-0.5" placeholder={t('common.description', 'Optional description')} value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                        </div>

                        <div className="col-span-3 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-transparent focus-within:ring-blue-500/30 transition-shadow">
                          <span className="text-[10px] font-bold text-blue-400">{moneySymbol(it.currency)}</span>
                          <input type="number" className="w-full bg-transparent text-sm font-bold text-blue-700 dark:text-blue-400 outline-none" value={it.amount} onChange={(e) => updateItem(idx, { amount: e.target.value })} placeholder="0.00" />
                        </div>

                        <div className="col-span-1 text-center">
                          <select className="bg-transparent text-xs font-bold text-gray-500 outline-none cursor-pointer" value={it.currency} onChange={(e) => updateItem(idx, { currency: e.target.value })}>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="EGP">EGP</option>
                          </select>
                        </div>

                        <div className="col-span-1 text-right">
                          <button type="button" onClick={() => removeItem(idx)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 5: SUMMARY & NOTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.notes', 'Notes')}</label>
                <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm h-24" placeholder={t('pricing.notesPlaceholder', 'Write special instructions here...')}></textarea>
              </div>

              <div className="flex flex-col gap-3 justify-end">
                {Object.entries(total).map(([curr, val]) => (
                  <div key={curr} className="bg-gray-900 dark:bg-blue-600 rounded-2xl p-5 text-white shadow-xl shadow-blue-500/10">
                    <div className="flex items-center justify-between opacity-60 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t('pricing.approxTotal', 'Selling Total')}</span>
                      <span className="text-xs font-bold">{curr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-black italic tracking-tighter">
                        {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-bold uppercase p-1.5 bg-white/10 rounded-lg">{moneySymbol(curr)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
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

