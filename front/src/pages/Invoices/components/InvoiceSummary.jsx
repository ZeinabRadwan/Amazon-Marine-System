import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { getInvoicesSummary } from '../../../api/invoices'

function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${n} ${currency}`
  }
}

export default function InvoiceSummary({ refreshKey }) {
  const { t } = useTranslation()
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    setLoading(true)
    setError(null)
    getInvoicesSummary(token, { months })
      .then((res) => setData(res.data ?? res))
      .catch((e) => setError(e.message || 'Failed to load invoice summary'))
      .finally(() => setLoading(false))
  }, [months, refreshKey])

  const cards = data?.cards
  const paid = cards?.paid_amount ?? 0
  const partial = cards?.partial_amount ?? 0
  const unpaid = cards?.unpaid_amount ?? 0

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{cards?.total_count ?? '—'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.stats.total', 'Total invoices')}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatMoney(paid, 'USD')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.stats.paid', 'Paid')}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatMoney(partial, 'USD')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.stats.partial', 'Partial')}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatMoney(unpaid, 'USD')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.stats.unpaid', 'Unpaid')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {t('invoices.charts.title', 'Invoice revenue & status')}
        </div>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value={6}>6</option>
          <option value={12}>12</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          {t('common.loading', 'Loading...')}
        </div>
      )}

      {/* Charts are intentionally left minimal here; we’ll plug Chart.js in wiring step if needed. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('invoices.charts.monthlyPaid', 'Monthly revenue (paid)')}</div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t('invoices.charts.placeholder', 'Chart will be rendered during wiring step.')}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('invoices.charts.byStatus', 'Invoices by status')}</div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t('invoices.charts.placeholder', 'Chart will be rendered during wiring step.')}
          </div>
        </div>
      </div>
    </section>
  )
}

