import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2 } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { createInvoice, listCurrencies, listItems } from '../../../api/invoices'
import { listClients } from '../../../api/clients'
import { listShipments } from '../../../api/shipments'
import AsyncSelect from '../../../components/AsyncSelect'

function money(amount, currency) {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${n} ${currency || ''}`.trim()
  }
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation()
  const [invoiceType, setInvoiceType] = useState('client') // client | partner
  const [clientId, setClientId] = useState(null) // {value, label}
  const [shipmentId, setShipmentId] = useState(null) // {value, label}
  const [currencyId, setCurrencyId] = useState('')
  const [currencies, setCurrencies] = useState([])
  const [isVatInvoice, setIsVatInvoice] = useState(false)
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, item_id: null }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setLoading(false)

    const token = getStoredToken()
    if (token) {
      listCurrencies(token)
        .then(setCurrencies)
        .catch(() => setCurrencies([]))
    }
  }, [isOpen])

  const selectedCurrencyCode = useMemo(() => {
    const c = currencies.find(curr => String(curr.id) === String(currencyId))
    return c?.code || 'USD'
  }, [currencies, currencyId])

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
    const tax = isVatInvoice ? subtotal * 0.14 : 0
    return { subtotal, tax, total: subtotal + tax }
  }, [items, isVatInvoice])

  if (!isOpen) return null

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, item_id: null }])
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const loadClientOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    const res = await listClients(token, { search: q, per_page: 20 })
    const data = res.data ?? res.clients ?? []
    return data.map(c => ({
      value: c.id,
      label: c.company_name || c.name,
      sublabel: c.tax_id ? `${t('clients.fields.tax_id')}: ${c.tax_id}` : null
    }))
  }

  const loadShipmentOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    const res = await listShipments(token, { search: q, per_page: 20 })
    const data = res.data ?? res.shipments ?? []
    return data.map(s => ({
      value: s.id,
      label: s.bl_number || s.booking_number || `ID: ${s.id}`,
      sublabel: s.client?.company_name || s.client?.name
    }))
  }

  const loadItemCatalogOptions = async (q) => {
    const token = getStoredToken()
    if (!token) return []
    const data = await listItems(token, q)
    return data.map(it => ({
      value: it.id,
      label: it.name,
      price: it.default_price,
      description: it.description
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = getStoredToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const invoiceTypeId = invoiceType === 'partner' ? 1 : 0
      const payload = {
        invoice_type_id: invoiceTypeId,
        client_id: clientId?.value,
        shipment_id: shipmentId?.value,
        currency_id: Number(currencyId),
        issue_date: issueDate,
        due_date: dueDate || undefined,
        is_vat_invoice: !!isVatInvoice,
        notes: notes || undefined,
        items: items
          .filter((it) => String(it.description || '').trim().length > 0)
          .map((it) => ({
            item_id: it.item_id,
            description: it.description,
            quantity: Number(it.quantity) || 0,
            unit_price: Number(it.unit_price) || 0,
          })),
      }
      await createInvoice(token, payload)
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">{t('invoices.create', 'Create Invoice')}</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.invoiceType', 'Invoice type')}</label>
              <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none">
                <option value="client">{t('invoices.tabs.client', 'Client')}</option>
                <option value="partner">{t('invoices.tabs.partner', 'Partner')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.party', 'Client/Partner')}</label>
              <AsyncSelect
                value={clientId}
                onChange={setClientId}
                loadOptions={loadClientOptions}
                placeholder={t('invoices.placeholders.client')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.shipment', 'Shipment')}</label>
              <AsyncSelect
                value={shipmentId}
                onChange={setShipmentId}
                loadOptions={loadShipmentOptions}
                placeholder={t('invoices.placeholders.shipment')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.currency', 'Currency')}</label>
              <select 
                value={currencyId} 
                onChange={(e) => setCurrencyId(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none"
                required
              >
                <option value="">{t('common.select')}</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.issueDate', 'Issue date')}</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.dueDate', 'Due date')}</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={isVatInvoice} onChange={(e) => setIsVatInvoice(e.target.checked)} />
                {t('invoices.vatInvoice', 'VAT invoice')}
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/20 flex items-center justify-between">
              <div className="text-sm font-bold">{t('invoices.items', 'Items')}</div>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <Plus className="h-4 w-4" /> {t('common.add', 'Add')}
              </button>
            </div>
            <div className="p-4 space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.item.description', 'Description')}</label>
                    <AsyncSelect
                      value={it.item_id ? { value: it.item_id, label: it.description } : null}
                      onChange={(opt) => updateItem(idx, { 
                        item_id: opt?.value || null, 
                        description: opt?.label || '',
                        unit_price: opt?.price || it.unit_price
                      })}
                      loadOptions={loadItemCatalogOptions}
                      placeholder={t('invoices.item.placeholder')}
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.item.qty', 'Qty')}</label>
                    <input type="number" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.item.unitPrice', 'Unit price')}</label>
                    <input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.item.total', 'Total')}</div>
                    <div className="text-sm font-extrabold">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), selectedCurrencyCode)}</div>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('common.notes', 'Notes')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('invoices.subtotal', 'Subtotal')}</span>
              <span className="font-semibold">{money(totals.subtotal, selectedCurrencyCode)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('invoices.tax', 'Tax')}</span>
              <span className="font-semibold">{money(totals.tax, selectedCurrencyCode)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
              <span className="font-bold">{t('invoices.total', 'Total')}</span>
              <span className="text-lg font-extrabold">{money(totals.total, selectedCurrencyCode)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold">
              {t('common.cancel', 'Cancel')}
            </button>
            <button disabled={loading} type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold">
              {loading ? t('common.loading', 'Loading...') : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

