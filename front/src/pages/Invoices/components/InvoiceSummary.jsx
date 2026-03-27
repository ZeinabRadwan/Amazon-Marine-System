import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { getInvoicesSummary } from '../../../api/invoices'
import { LineChart, DonutChart } from '../../../components/Charts'
import '../../../components/Charts/Charts.css'

function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${n} ${currency}`
  }
}

function formatMonthLabel(ym, locale) {
  if (!ym || typeof ym !== 'string') return ym
  const parts = ym.split('-')
  if (parts.length < 2) return ym
  const y = Number(parts[0])
  const m = Number(parts[1])
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    year: '2-digit',
  })
}

function statusChartLabel(key, t) {
  const k = String(key || '').toLowerCase()
  const map = {
    paid: 'invoices.chartStatus.paid',
    partial: 'invoices.chartStatus.partial',
    unpaid: 'invoices.chartStatus.unpaid',
    overdue: 'invoices.chartStatus.overdue',
  }
  return t(map[k] || 'invoices.chartStatus.other', { defaultValue: k })
}

export default function InvoiceSummary({ refreshKey }) {
  const { t, i18n } = useTranslation()
  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
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

  const monthlyChartData = useMemo(() => {
    const m = data?.monthly
    if (!m?.labels?.length) return []
    return m.labels.map((label, i) => ({
      label: formatMonthLabel(label, locale),
      paid: Number(m.paid?.[i]) || 0,
    }))
  }, [data, locale])

  const donutData = useMemo(() => {
    const bs = data?.by_status
    if (!bs?.labels?.length) return []
    return bs.labels.map((label, i) => ({
      name: statusChartLabel(label, t),
      value: Number(bs.values?.[i]) || 0,
    }))
  }, [data, t])

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
          aria-label={t('invoices.chartPeriod', 'Chart period')}
        >
          <option value={6}>{t('invoices.months6', '6 months')}</option>
          <option value={12}>{t('invoices.months12', '12 months')}</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {t('invoices.charts.monthlyPaid', 'Monthly revenue (paid)')}
          </div>
          {loading && !monthlyChartData.length ? (
            <div className="text-sm text-gray-500 py-8 text-center">{t('common.loading', 'Loading...')}</div>
          ) : monthlyChartData.length ? (
            <LineChart
              data={monthlyChartData}
              xKey="label"
              lines={[
                {
                  dataKey: 'paid',
                  name: t('invoices.charts.seriesPaid', 'Paid amount'),
                  stroke: '#22c55e',
                },
              ]}
              height={240}
              allowDecimals
            />
          ) : (
            <div className="text-sm text-gray-500 py-8 text-center">{t('invoices.chartsNoData', 'No chart data')}</div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {t('invoices.charts.byStatus', 'Invoices by status')}
          </div>
          {loading && !donutData.length ? (
            <div className="text-sm text-gray-500 py-8 text-center">{t('common.loading', 'Loading...')}</div>
          ) : donutData.length ? (
            <DonutChart
              data={donutData}
              nameKey="name"
              valueKey="value"
              valueLabel={t('invoices.charts.amount', 'Amount')}
              title=""
              height={260}
            />
          ) : (
            <div className="text-sm text-gray-500 py-8 text-center">{t('invoices.chartsNoData', 'No chart data')}</div>
          )}
        </div>
      </div>
    </section>
  )
}
