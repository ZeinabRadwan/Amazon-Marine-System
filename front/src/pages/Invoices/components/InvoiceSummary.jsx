import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { getInvoicesSummary } from '../../../api/invoices'
import { LineChart, DonutChart } from '../../../components/Charts'
import { StatsCard } from '../../../components/StatsCard'
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
  return new Date(y, m - 1, 1).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
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

  const [monthsLine, setMonthsLine] = useState(6)
  const [monthsDonut, setMonthsDonut] = useState(6)

  const [loadingLine, setLoadingLine] = useState(false)
  const [loadingDonut, setLoadingDonut] = useState(false)
  const [errorLine, setErrorLine] = useState(null)
  const [errorDonut, setErrorDonut] = useState(null)
  const [dataLine, setDataLine] = useState(null)
  const [dataDonut, setDataDonut] = useState(null)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    setLoadingLine(true)
    setErrorLine(null)
    getInvoicesSummary(token, { months: monthsLine })
      .then((res) => setDataLine(res.data ?? res))
      .catch((e) => setErrorLine(e.message || 'Failed to load invoice summary'))
      .finally(() => setLoadingLine(false))
  }, [monthsLine, refreshKey])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    setLoadingDonut(true)
    setErrorDonut(null)
    getInvoicesSummary(token, { months: monthsDonut })
      .then((res) => setDataDonut(res.data ?? res))
      .catch((e) => setErrorDonut(e.message || 'Failed to load invoice summary'))
      .finally(() => setLoadingDonut(false))
  }, [monthsDonut, refreshKey])

  const cards = dataLine?.cards
  const paid = cards?.paid_amount ?? 0
  const partial = cards?.partial_amount ?? 0
  const unpaid = cards?.unpaid_amount ?? 0
  const totalCount = cards?.total_count

  const monthlyChartData = useMemo(() => {
    const m = dataLine?.monthly
    if (!m?.labels?.length) return []
    return m.labels.map((label, i) => ({
      label: formatMonthLabel(label, locale),
      paid: Number(m.paid?.[i]) || 0,
    }))
  }, [dataLine, locale])

  const donutData = useMemo(() => {
    const bs = dataDonut?.by_status
    if (!bs?.labels?.length) return []
    return bs.labels.map((label, i) => ({
      name: statusChartLabel(label, t),
      value: Number(bs.values?.[i]) || 0,
    }))
  }, [dataDonut, t])

  const totalDisplay =
    totalCount != null && totalCount !== ''
      ? typeof totalCount === 'number'
        ? new Intl.NumberFormat(i18n.language).format(totalCount)
        : String(totalCount)
      : '—'

  const periodSelect = (id, value, onChange) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="clients-input invoices-chart-card__period min-w-[140px]"
      aria-label={t('invoices.chartPeriod', 'Chart period')}
    >
      <option value={6}>{t('invoices.months6', '6 months')}</option>
      <option value={12}>{t('invoices.months12', '12 months')}</option>
    </select>
  )

  return (
    <>
      <div className="clients-stats-grid invoices-stats-grid">
        <StatsCard
          title={t('invoices.stats.total', 'Total invoices')}
          value={totalDisplay}
          icon={<Receipt className="h-6 w-6" />}
          variant="blue"
        />
        <StatsCard
          title={t('invoices.stats.paid', 'Paid')}
          value={formatMoney(paid, 'USD')}
          icon={<CheckCircle className="h-6 w-6" />}
          variant="green"
        />
        <StatsCard
          title={t('invoices.stats.partial', 'Partial')}
          value={formatMoney(partial, 'USD')}
          icon={<Clock className="h-6 w-6" />}
          variant="amber"
        />
        <StatsCard
          title={t('invoices.stats.unpaid', 'Unpaid')}
          value={formatMoney(unpaid, 'USD')}
          icon={<AlertCircle className="h-6 w-6" />}
          variant="red"
        />
      </div>

      <div className="clients-extra-panel clients-charts-panel mb-4">
        <div className="clients-charts-grid">
          <div className="clients-chart-wrap">
            <div className="chart-wrap">
              <div className="invoices-chart-card-head">
                <h4 className="chart-title invoices-chart-card-head__title">
                  {t('invoices.charts.monthlyPaid', 'Monthly revenue (paid)')}
                </h4>
                {periodSelect('invoices-chart-months-line', monthsLine, setMonthsLine)}
              </div>
              {errorLine && <p className="text-sm text-red-600 dark:text-red-400">{errorLine}</p>}
              {loadingLine && !monthlyChartData.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.loading')}</p>
              ) : monthlyChartData.length ? (
                <LineChart
                  className="chart--nested"
                  data={monthlyChartData}
                  xKey="label"
                  lines={[
                    {
                      dataKey: 'paid',
                      name: t('invoices.charts.seriesPaid', 'Paid amount'),
                      stroke: '#22c55e',
                    },
                  ]}
                  height={260}
                  allowDecimals
                />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.chartsNoData', 'No chart data')}</p>
              )}
            </div>
          </div>
          <div className="clients-chart-wrap">
            <div className="chart-wrap">
              <div className="invoices-chart-card-head">
                <h4 className="chart-title invoices-chart-card-head__title">
                  {t('invoices.charts.byStatus', 'Invoices by status')}
                </h4>
                {periodSelect('invoices-chart-months-donut', monthsDonut, setMonthsDonut)}
              </div>
              {errorDonut && <p className="text-sm text-red-600 dark:text-red-400">{errorDonut}</p>}
              {loadingDonut && !donutData.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.loading')}</p>
              ) : donutData.length ? (
                <DonutChart
                  className="chart--nested"
                  data={donutData}
                  nameKey="name"
                  valueKey="value"
                  valueLabel={t('invoices.charts.amount', 'Amount')}
                  title=""
                  height={260}
                />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.chartsNoData', 'No chart data')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
