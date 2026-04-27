import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus, Trash2, Eye } from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'

const CONTAINER_TYPES = ['20 Dry', '40 Dry', '40HQ Dry', '20 Reefer', '40 Reefer']

function moneySymbol(currency) {
  if (currency === 'EUR') return '€'
  if (currency === 'EGP') return 'E£'
  return '$'
}

function calcTotal(items) {
  return (items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
}

export default function CreateQuoteModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation()
  const { create, loading, error } = useMutateQuote()

  const [form, setForm] = useState({
    client_id: '',
    sales_user_id: '',
    pricing_offer_id: '',
    pol: '',
    pod: '',
    shipping_line: '',
    container_type: '40HQ Dry',
    qty: 1,
    transit_time: '',
    free_time: '',
    valid_from: '',
    valid_to: '',
    notes: '',
    sailing_dates: [],
    items: [
      { code: 'ocean', name: 'Ocean Freight', description: '', amount: '', currency: 'USD' },
      { code: 'thc', name: 'THC', description: '', amount: '', currency: 'USD' },
    ],
  })

  useEffect(() => {
    if (!isOpen) return
    setForm((p) => ({ ...p }))
  }, [isOpen])

  const isReefer = useMemo(() => (form.container_type || '').toLowerCase().includes('reefer'), [form.container_type])

  const total = useMemo(() => calcTotal(form.items), [form.items])

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

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

          <form id="quoteForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.clientId', 'Client ID')}</label>
                <input value={form.client_id} onChange={(e) => setField('client_id', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" placeholder="e.g. 1" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.salesUserId', 'Sales User ID')}</label>
                <input value={form.sales_user_id} onChange={(e) => setField('sales_user_id', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" placeholder="e.g. 1" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.offerId', 'Offer ID (optional)')}</label>
                <input value={form.pricing_offer_id} onChange={(e) => setField('pricing_offer_id', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" placeholder="e.g. 12" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">POL</label>
                <input value={form.pol} onChange={(e) => setField('pol', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">POD</label>
                <input value={form.pod} onChange={(e) => setField('pod', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.shippingLine', 'Shipping line')}</label>
                <input value={form.shipping_line} onChange={(e) => setField('shipping_line', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.containerType', 'Container')}</label>
                <select value={form.container_type} onChange={(e) => setField('container_type', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none">
                  {CONTAINER_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.qty', 'Qty')}</label>
                <input type="number" value={form.qty} onChange={(e) => setField('qty', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" min={1} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.transitTime', 'Transit time')}</label>
                <input value={form.transit_time} onChange={(e) => setField('transit_time', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" placeholder="e.g. 5 days" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.freeTime', 'Free time')}</label>
                <input value={form.free_time} onChange={(e) => setField('free_time', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" placeholder="e.g. 7 days" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.validTo', 'Valid to')}</label>
                <input type="date" value={form.valid_to} onChange={(e) => setField('valid_to', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700 dark:text-gray-200">
                  {t('pricing.items', 'Items')}
                </h3>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <Plus className="h-4 w-4" /> {t('common.add', 'Add')}
                </button>
              </div>

              <div className="space-y-3">
                {(form.items || []).map((it, idx) => {
                  const hiddenForReefer = !isReefer && (it.code === 'power' || it.code === 'pti')
                  if (hiddenForReefer) return null
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <input className="md:col-span-2 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900" placeholder="code" value={it.code} onChange={(e) => updateItem(idx, { code: e.target.value })} />
                      <input className="md:col-span-3 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900" placeholder="name" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                      <input className="md:col-span-4 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900" placeholder="description" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                      <input type="number" className="md:col-span-2 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900" placeholder="amount" value={it.amount} onChange={(e) => updateItem(idx, { amount: e.target.value })} />
                      <select className="md:col-span-1 px-2 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900" value={it.currency} onChange={(e) => updateItem(idx, { currency: e.target.value })}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="EGP">EGP</option>
                      </select>
                      <button type="button" onClick={() => removeItem(idx)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-12 md:justify-self-end w-fit">
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-5 py-3">
              <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('pricing.total', 'Total')}</div>
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                {moneySymbol('USD')} {total.toLocaleString('en-US')}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.notes', 'Notes')}</label>
              <input value={form.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" />
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

