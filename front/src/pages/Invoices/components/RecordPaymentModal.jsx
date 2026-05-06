import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { recordInvoicePayment } from '../../../api/invoices'
import { listBankAccounts } from '../../../api/accountings'

export default function RecordPaymentModal({ isOpen, invoiceId, currencyCode, onClose, onSuccess }) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_transfer')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [bankAccounts, setBankAccounts] = useState([])

  useEffect(() => {
    if (!isOpen) return
    const token = getStoredToken()
    if (!token) return
    listBankAccounts(token)
      .then((res) => setBankAccounts(Array.isArray(res?.data) ? res.data.filter((a) => a?.is_active !== false) : []))
      .catch(() => setBankAccounts([]))
  }, [isOpen])

  const selectedBank = useMemo(
    () => bankAccounts.find((acc) => Number(acc.id) === Number(sourceAccountId)),
    [bankAccounts, sourceAccountId]
  )

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = getStoredToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await recordInvoicePayment(token, invoiceId, {
        amount: Number(amount),
        currency_code: currencyCode,
        method,
        source_account_id: sourceAccountId ? Number(sourceAccountId) : undefined,
        paid_at: paidAt,
        reference: reference || undefined,
        notes: notes || undefined,
      })
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">{t('invoices.recordPayment', 'Record payment')}</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.payment.amount', 'Amount')}</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.payment.currency', 'Currency')}</label>
              <input
                value={currencyCode || ''}
                readOnly
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.payment.method', 'Method')}</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none">
                <option value="bank_transfer">bank_transfer</option>
                <option value="cash">cash</option>
                <option value="cheque">cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.payment.date', 'Date')}</label>
              <input value={paidAt} onChange={(e) => setPaidAt(e.target.value)} type="date" className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('payments.bankAccount', 'Bank account')}</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none"
            >
              <option value="">{t('payments.bankAccountOptional', 'Bank account (optional)')}</option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_name} - {bank.account_name || bank.account_number || bank.id}
                </option>
              ))}
            </select>
            {selectedBank?.supported_currencies?.length ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('settings.bankAccounts.currencies', 'Currencies')}: {selectedBank.supported_currencies.join(', ')}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('invoices.payment.reference', 'Reference')}</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('common.notes', 'Notes')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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

