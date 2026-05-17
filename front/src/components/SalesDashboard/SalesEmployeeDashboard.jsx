import { useMemo, useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Truck,
  CheckCircle2,
  FileText,
  Percent,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { StatsCard } from '../StatsCard'
import { LineChart, BarChart } from '../Charts'
import FollowUpWorkloadWidgets from '../FollowUpWorkloadWidgets'
import { getStoredToken } from '../../pages/Login'
import { getDashboardSalesEmployee } from '../../api/dashboard'
import { formatShipmentsNumber } from '../../utils/westernNumerals'
import { formatDate } from '../../utils/dateUtils'
import './SalesEmployeeDashboard.css'

function asNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(v, locale) {
  const n = asNumber(v)
  return new Intl.NumberFormat(locale?.startsWith('ar') ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(n)
}

function extractPayload(res) {
  return res?.data ?? res ?? {}
}

export default function SalesEmployeeDashboard({
  user,
  followUpSummaryState,
  refreshKey = 0,
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()
  const displayName = user?.name || user?.email || t('dashboardModule.salesEmployee', 'Sales')

  const [completedPeriod, setCompletedPeriod] = useState('current_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)

  const loadDashboard = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    const params = { completed_period: completedPeriod }
    if (completedPeriod === 'custom') {
      if (customFrom) params.completed_from = customFrom
      if (customTo) params.completed_to = customTo
    }
    getDashboardSalesEmployee(token, params)
      .then((res) => setPayload(extractPayload(res)))
      .catch((e) => setError(e?.message || t('common.error', 'Something went wrong')))
      .finally(() => setLoading(false))
  }, [token, completedPeriod, customFrom, customTo, t])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard, refreshKey])

  const kpis = payload?.kpis ?? {}
  const charts = payload?.charts ?? {}

  const revenueLine = useMemo(
    () => (Array.isArray(charts.monthly_revenue_profit_line) ? charts.monthly_revenue_profit_line : []),
    [charts.monthly_revenue_profit_line],
  )
  const quotesBar = useMemo(
    () => (Array.isArray(charts.quotations_sent_bar) ? charts.quotations_sent_bar : []),
    [charts.quotations_sent_bar],
  )
  const conversionLine = useMemo(
    () => (Array.isArray(charts.conversion_rate_line) ? charts.conversion_rate_line : []),
    [charts.conversion_rate_line],
  )

  const completedCount = useMemo(() => {
    if (completedPeriod === 'last_2_months') return asNumber(kpis.completed_shipments_last_2_months)
    if (completedPeriod === 'custom') return asNumber(kpis.completed_shipments)
    return asNumber(kpis.completed_shipments_current_month ?? kpis.completed_shipments)
  }, [completedPeriod, kpis])

  const onClientClick = useCallback(
    (clientId) => {
      if (clientId != null) navigate(`/clients?client_id=${encodeURIComponent(clientId)}`)
    },
    [navigate],
  )

  const todayLabel = formatDate(new Date(), i18n.language)

  return (
    <div className="sales-dash">
      <header className="sales-dash__hero">
        <div>
          <p className="sales-dash__eyebrow">{todayLabel}</p>
          <h2 className="sales-dash__title">{t('salesDashboard.greeting', { name: displayName })}</h2>
          <p className="sales-dash__subtitle">{t('salesDashboard.subtitle')}</p>
        </div>
        <Calendar className="sales-dash__hero-icon" aria-hidden />
      </header>

      {error && (
        <p className="sales-dash__error" role="alert">
          {error}
        </p>
      )}

      <section className="sales-dash__panel" aria-labelledby="sales-followups-heading">
        <h3 id="sales-followups-heading" className="sales-dash__panel-title">
          {t('salesDashboard.followUps.title')}
        </h3>
        <FollowUpWorkloadWidgets
          summary={followUpSummaryState?.data}
          loading={!!followUpSummaryState?.loading}
          error={followUpSummaryState?.error}
          onClientClick={onClientClick}
          className="sales-dash__followups"
        />
      </section>

      <div className="sales-dash__kpi-grid">
        <StatsCard
          title={t('salesDashboard.kpi.activeCustomers')}
          value={formatShipmentsNumber(asNumber(kpis.active_customers))}
          icon={<Users className="h-6 w-6" />}
          variant="blue"
        />
        <StatsCard
          title={t('salesDashboard.kpi.openShipments')}
          value={formatShipmentsNumber(asNumber(kpis.open_shipments))}
          icon={<Truck className="h-6 w-6" />}
          variant="amber"
        />
        <StatsCard
          title={t('salesDashboard.kpi.quotationsMonth')}
          value={formatShipmentsNumber(asNumber(kpis.quotations_sent_month))}
          icon={<FileText className="h-6 w-6" />}
          variant="green"
        />
        <StatsCard
          title={t('salesDashboard.kpi.conversionRate')}
          value={`${formatShipmentsNumber(asNumber(kpis.conversion_rate_pct))}%`}
          icon={<Percent className="h-6 w-6" />}
          variant="red"
          change={t('salesDashboard.kpi.conversionHint', {
            converted: asNumber(kpis.converted_shipments_range),
            quotes: asNumber(kpis.quotations_sent_range),
          })}
        />
        <StatsCard
          title={t('salesDashboard.kpi.totalRevenue')}
          value={formatMoney(kpis.total_revenue, i18n.language)}
          icon={<DollarSign className="h-6 w-6" />}
          variant="green"
        />
        <StatsCard
          title={t('salesDashboard.kpi.netProfit')}
          value={formatMoney(kpis.net_profit, i18n.language)}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="blue"
        />
      </div>

      <section className="sales-dash__panel sales-dash__panel--completed" aria-labelledby="sales-completed-heading">
        <div className="sales-dash__panel-head">
          <h3 id="sales-completed-heading" className="sales-dash__panel-title">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {t('salesDashboard.completed.title')}
          </h3>
          <div className="sales-dash__period-tools">
            <select
              className="clients-select sales-dash__period-select"
              value={completedPeriod}
              onChange={(e) => setCompletedPeriod(e.target.value)}
              aria-label={t('salesDashboard.completed.period')}
            >
              <option value="current_month">{t('salesDashboard.completed.currentMonth')}</option>
              <option value="last_2_months">{t('salesDashboard.completed.last2Months')}</option>
              <option value="custom">{t('salesDashboard.completed.custom')}</option>
            </select>
            {completedPeriod === 'custom' && (
              <>
                <input
                  type="date"
                  className="clients-input sales-dash__date-input"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label={t('salesDashboard.completed.from')}
                />
                <input
                  type="date"
                  className="clients-input sales-dash__date-input"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label={t('salesDashboard.completed.to')}
                />
                <button type="button" className="clients-btn clients-btn--primary clients-btn--sm" onClick={loadDashboard}>
                  {t('salesDashboard.completed.apply')}
                </button>
              </>
            )}
          </div>
        </div>
        <p className="sales-dash__completed-value">
          {loading ? '…' : formatShipmentsNumber(completedCount)}
          <span className="sales-dash__completed-label">{t('salesDashboard.completed.shipments')}</span>
        </p>
      </section>

      <div className="sales-dash__charts clients-charts-grid">
        <LineChart
          data={revenueLine}
          xKey="month"
          title={t('salesDashboard.charts.revenueProfit')}
          lines={[
            { dataKey: 'revenue', name: t('salesDashboard.charts.revenue') },
            { dataKey: 'profit', name: t('salesDashboard.charts.profit') },
          ]}
          height={280}
        />
        <BarChart
          data={quotesBar}
          xKey="month"
          yKey="quotations"
          title={t('salesDashboard.charts.quotations')}
          height={280}
          name={t('salesDashboard.charts.quotations')}
        />
        <LineChart
          data={conversionLine}
          xKey="month"
          title={t('salesDashboard.charts.conversionTrend')}
          lines={[{ dataKey: 'rate_pct', name: t('salesDashboard.charts.conversionPct') }]}
          height={280}
        />
      </div>
    </div>
  )
}
