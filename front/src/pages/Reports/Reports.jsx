import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  exportTeamPerformanceCsv,
  exportAttendanceReportCsv,
  exportClientsReportCsv,
  exportPartnerStatementsCsv,
  getAttendanceReport,
  getClientsReport,
  getPartnerStatementsReport,
  getReportsFinance,
  getReportsShipments,
  getSalesPerformance,
  getTeamPerformance,
} from '../../api/reports'
import { Container } from '../../components/Container'
import { StatsCard } from '../../components/StatsCard'
import { BarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/PageHeader/PageHeader.css'
import '../Clients/Clients.css'
import './Reports.css'
import {
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
  Package,
  Percent,
} from 'lucide-react'

function ymd(d) {
  return new Date(d).toISOString().slice(0, 10)
}

function startOfMonthYmd() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return ymd(d)
}

function todayYmd() {
  return ymd(new Date())
}

function asNum(v) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function formatCompact(n, locale) {
  const num = asNum(n)
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(num)
  } catch {
    return String(Math.round(num))
  }
}

function formatMoney(n, locale, currency = 'USD') {
  const num = asNum(n)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(num)
  } catch {
    return `$${Math.round(num).toLocaleString()}`
  }
}

function modalTitleForType(t, type, param) {
  if (type === 'sales')
    return t('reports.drillDown.sales', { name: param ?? '', defaultValue: `Sales details: ${param ?? ''}` })
  if (type === 'shipments') return t('reports.drillDown.shipments', 'Shipments details')
  if (type === 'finance') return t('reports.drillDown.finance', 'Financial report')
  if (type === 'clients') return t('reports.drillDown.clients', 'Clients & conversion')
  return t('reports.drillDown.details', 'Report details')
}

export default function Reports() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const { user } = useAuthAccess()

  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
  const role = (user?.primary_role ?? user?.roles?.[0] ?? 'user')?.toString?.().toLowerCase?.() || 'user'

  const isAdmin = role === 'admin'
  const isSales = role === 'sales'
  const isSalesManager = role === 'sales_manager'
  const isAccounting = role === 'accounting'
  const isPricing = role === 'pricing'

  const showAdminDashboard = isAdmin || isSalesManager

  const [from, setFrom] = useState(startOfMonthYmd)
  const [to, setTo] = useState(todayYmd)
  const [chartPeriodDays, setChartPeriodDays] = useState(30)

  const [shipments, setShipments] = useState(null)
  const [finance, setFinance] = useState(null)
  const [salesPerf, setSalesPerf] = useState([])
  const [teamPerf, setTeamPerf] = useState([])
  const [clientsReport, setClientsReport] = useState(null)
  const [partnersReport, setPartnersReport] = useState(null)
  const [attendanceReport, setAttendanceReport] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastSyncAt, setLastSyncAt] = useState(null)

  const [teamSearch, setTeamSearch] = useState('')
  const [teamSort, setTeamSort] = useState('revenue')

  const [drillDown, setDrillDown] = useState(null) // { type, param }
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const loadAll = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)

    const pShip = getReportsShipments(token).then(setShipments)
    const pFin = getReportsFinance(token).then(setFinance)
    const pSales = getSalesPerformance(token, { from, to }).then((res) => setSalesPerf(Array.isArray(res?.data) ? res.data : []))
    const pTeam = getTeamPerformance(token, { from, to, search: teamSearch || undefined, sort: teamSort }).then((res) =>
      setTeamPerf(Array.isArray(res?.data) ? res.data : []),
    )
    const pClients = getClientsReport(token, { from, to }).then(setClientsReport)
    const pPartners = getPartnerStatementsReport(token).then(setPartnersReport)
    const pAttendance = getAttendanceReport(token, { from, to }).then(setAttendanceReport)

    Promise.all([pShip, pFin, pSales, pTeam, pClients, pPartners, pAttendance])
      .then(() => setLastSyncAt(new Date()))
      .catch((e) => {
        setError(e?.message || t('common.error', 'Something went wrong'))
      })
      .finally(() => setLoading(false))
  }, [token, from, to, teamSearch, teamSort, t])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const kpi = useMemo(() => {
    const revenue = asNum(finance?.total_revenue)
    const cost = asNum(finance?.total_cost)
    const profit = asNum(finance?.total_profit)
    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0
    const shipmentsTotal = salesPerf.reduce((acc, r) => acc + asNum(r?.shipments_count), 0)
    return { revenue, cost, profit, marginPct, shipmentsTotal }
  }, [finance, salesPerf])

  const myTeamRow = useMemo(() => {
    const uid = user?.id
    if (!uid) return null
    return teamPerf.find((r) => String(r?.user_id) === String(uid)) ?? null
  }, [teamPerf, user?.id])

  const shipmentsByDirectionChart = useMemo(() => {
    const rows = Array.isArray(shipments?.by_direction) ? shipments.by_direction : []
    return rows
      .map((r) => ({
        name: String(r?.shipment_direction ?? t('reports.unknown', 'Unknown')),
        value: asNum(r?.count),
      }))
      .filter((x) => x.value > 0)
  }, [shipments, t])

  const salesPerfBar = useMemo(() => {
    return (Array.isArray(salesPerf) ? salesPerf : [])
      .filter((r) => (r?.name ?? '').toString().trim() !== '')
      .map((r) => ({
        rep: String(r.name),
        revenue: asNum(r.total_sales),
      }))
  }, [salesPerf])

  const teamAlerts = useMemo(() => {
    const out = []
    if (kpi.marginPct > 0 && kpi.marginPct < 20) {
      out.push({ id: 'margin', kind: 'info', text: t('reports.alert.marginLow', 'Profit margin close to minimum'), type: 'finance' })
    }
    return out.slice(0, 3)
  }, [teamPerf, kpi.marginPct, t])

  const handleExportTeamCsv = async () => {
    if (!token) return
    try {
      const blob = await exportTeamPerformanceCsv(token, { from, to, search: teamSearch || undefined, sort: teamSort })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `team-performance-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      window.alert(e?.message || t('reports.exportError', 'Export failed.'))
    }
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportClientsCsv = async () => {
    if (!token) return
    try {
      const blob = await exportClientsReportCsv(token, { from, to })
      downloadBlob(blob, `clients-report-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (e) {
      window.alert(e?.message || t('reports.exportError', 'Export failed.'))
    }
  }

  const handleExportPartnersCsv = async () => {
    if (!token) return
    try {
      const blob = await exportPartnerStatementsCsv(token, {})
      downloadBlob(blob, `partner-statements-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (e) {
      window.alert(e?.message || t('reports.exportError', 'Export failed.'))
    }
  }

  const handleExportAttendanceCsv = async () => {
    if (!token) return
    try {
      const blob = await exportAttendanceReportCsv(token, { from, to })
      downloadBlob(blob, `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (e) {
      window.alert(e?.message || t('reports.exportError', 'Export failed.'))
    }
  }

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return t('reports.lastSyncNever', 'Last sync: —')
    try {
      return t('reports.lastSyncAt', {
        ts: lastSyncAt.toLocaleString(locale),
        defaultValue: `Last sync: ${lastSyncAt.toLocaleString(locale)}`,
      })
    } catch {
      return t('reports.lastSyncAt', { ts: String(lastSyncAt), defaultValue: `Last sync: ${String(lastSyncAt)}` })
    }
  }, [lastSyncAt, locale, t])

  return (
    <Container size="xl">
      <div className="reports-page">
        {error && (
          <div className="reports-error" role="alert">
            {error}
          </div>
        )}

        {/* Sales: My performance only */}
        {isSales && (
          <section className="reports-section">
            <div className="reports-card">
              <div className="reports-card__head">
                <h2 className="reports-card__title">{t('reports.myPerformance', 'My performance only')}</h2>
              </div>
              <p className="reports-muted">
                {t(
                  'reports.myPerformanceHint',
                  'Visits, conversion, revenue, and shipments for your own portfolio in the selected period.',
                )}
              </p>
              <div className="reports-kpis">
                <StatsCard
                  title={t('reports.kpi.visits', 'My visits')}
                  value={asNum(myTeamRow?.visits_count)}
                  icon={<Clock className="h-6 w-6" />}
                  variant="blue"
                />
                <StatsCard
                  title={t('reports.kpi.conversion', 'Conversion')}
                  value={`${asNum(myTeamRow?.conversion_rate_pct)}%`}
                  icon={<Percent className="h-6 w-6" />}
                  variant="green"
                />
                <StatsCard
                  title={t('reports.kpi.revenue', 'Revenue')}
                  value={formatMoney(asNum(myTeamRow?.revenue), locale)}
                  icon={<Wallet className="h-6 w-6" />}
                  variant="amber"
                />
                <StatsCard
                  title={t('reports.kpi.shipments', 'Shipments')}
                  value={asNum(myTeamRow?.shipments_count)}
                  icon={<Package className="h-6 w-6" />}
                  variant="default"
                />
              </div>
              <div className="reports-actions">
                <Link to="/visits" className="reports-btn reports-btn--ghost">
                  {t('reports.openVisits', 'Visit log')}
                </Link>
                <Link to="/shipments" className="reports-btn reports-btn--ghost">
                  {t('reports.openShipments', 'My shipments')}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Accounting: Financial reports only */}
        {isAccounting && (
          <section className="reports-section">
            <div className="reports-card">
              <div className="reports-card__head">
                <h2 className="reports-card__title">{t('reports.financeOnly', 'Financial reports')}</h2>
              </div>
              <p className="reports-muted">{t('reports.financeOnlyHint', 'Invoices, payments, balances, and cash flow.')}</p>
              <div className="reports-kpis">
                <StatsCard
                  title={t('reports.kpi.totalRevenue', 'Total revenue')}
                  value={formatMoney(kpi.revenue, locale)}
                  icon={<TrendingUp className="h-6 w-6" />}
                  variant="amber"
                />
                <StatsCard
                  title={t('reports.kpi.totalCost', 'Total cost')}
                  value={formatMoney(kpi.cost, locale)}
                  icon={<TrendingDown className="h-6 w-6" />}
                  variant="red"
                />
                <StatsCard
                  title={t('reports.kpi.totalProfit', 'Total profit')}
                  value={formatMoney(kpi.profit, locale)}
                  icon={<Wallet className="h-6 w-6" />}
                  variant="green"
                />
                <StatsCard
                  title={t('reports.kpi.margin', 'Profit margin')}
                  value={`${kpi.marginPct}%`}
                  icon={<BarChart3 className="h-6 w-6" />}
                  variant="blue"
                />
              </div>
              <div className="reports-actions">
                <Link to="/invoices" className="reports-btn reports-btn--ghost">
                  {t('reports.openInvoices', 'Invoices')}
                </Link>
                <Link to="/accountings" className="reports-btn reports-btn--ghost">
                  {t('reports.openAccounting', 'Accounts')}
                </Link>
                <Link to="/treasury" className="reports-btn reports-btn--ghost">
                  {t('reports.openTreasury', 'Treasury')}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Pricing: Pricing reports only */}
        {isPricing && (
          <section className="reports-section">
            <div className="reports-card">
              <div className="reports-card__head">
                <h2 className="reports-card__title">{t('reports.pricingOnly', 'Pricing reports')}</h2>
              </div>
              <p className="reports-muted">{t('reports.pricingOnlyHint', 'Price history, discount approvals, and changes.')}</p>
              <div className="reports-actions">
                <Link to="/pricing" className="reports-btn reports-btn--ghost">
                  {t('reports.openPricing', 'Pricing')}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Admin / sales manager dashboard */}
        {showAdminDashboard && (
          <section className="reports-section">
            <div className="reports-card mb-4">
              <div className="reports-range">
                <div className="reports-range__title">
                  <Calendar className="h-4 w-4 opacity-80" aria-hidden />
                  <span>{t('reports.reportPeriod', 'Report period')}</span>
                </div>
                <div className="reports-range__controls">
                  <input type="date" className="clients-input reports-date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <input type="date" className="clients-input reports-date" value={to} onChange={(e) => setTo(e.target.value)} />
                  <button type="button" className="reports-btn reports-btn--primary" onClick={loadAll} disabled={loading}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> {t('pageHeader.refresh', 'Refresh')}
                  </button>
                </div>
              </div>
            </div>

            {teamAlerts.length > 0 && (
              <div className="reports-card mb-4">
                <div className="reports-card__head reports-card__head--split">
                  <h3 className="reports-card__title">{t('reports.kpiAlerts', 'KPI alerts')}</h3>
                  <span className="reports-muted">{t('reports.alertsCount', { count: teamAlerts.length, defaultValue: `${teamAlerts.length} alerts` })}</span>
                </div>
                <ul className="reports-alerts">
                  {teamAlerts.map((a) => (
                    <li key={a.id} className={`reports-alert reports-alert--${a.kind}`}>
                      <span className="reports-alert__text">{a.text}</span>
                      <button type="button" className="reports-link" onClick={() => setDrillDown({ type: a.type, param: null })}>
                        {t('reports.viewDetails', 'View details')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="reports-kpis mb-4">
              <button type="button" className="reports-kpi-btn" onClick={() => setDrillDown({ type: 'shipments', param: null })}>
                <StatsCard
                  title={t('reports.kpi.totalShipments', 'Total shipments')}
                  value={kpi.shipmentsTotal}
                  icon={<Package className="h-6 w-6" />}
                  variant="blue"
                />
              </button>
              <button type="button" className="reports-kpi-btn" onClick={() => setDrillDown({ type: 'finance', param: null })}>
                <StatsCard
                  title={t('reports.kpi.totalRevenue', 'Total revenue')}
                  value={formatMoney(kpi.revenue, locale)}
                  icon={<Wallet className="h-6 w-6" />}
                  variant="amber"
                />
              </button>
              <button type="button" className="reports-kpi-btn" onClick={() => setDrillDown({ type: 'finance', param: null })}>
                <StatsCard
                  title={t('reports.kpi.totalProfit', 'Total profit')}
                  value={formatMoney(kpi.profit, locale)}
                  icon={<TrendingUp className="h-6 w-6" />}
                  variant="green"
                />
              </button>
              <button type="button" className="reports-kpi-btn" onClick={() => setDrillDown({ type: 'finance', param: null })}>
                <StatsCard
                  title={t('reports.kpi.margin', 'Profit margin')}
                  value={`${kpi.marginPct}%`}
                  icon={<BarChart3 className="h-6 w-6" />}
                  variant="default"
                />
              </button>
            </div>

            <div className="reports-card mb-4">
              <div className="reports-card__head reports-card__head--split">
                <h3 className="reports-card__title">{t('reports.liveModuleData', 'Live module data')}</h3>
                <span className="reports-muted">{lastSyncLabel}</span>
                <div className="reports-live-actions">
                  <Link to="/clients" className="reports-btn reports-btn--ghost">
                    <Users className="h-4 w-4" aria-hidden /> {t('reports.crm', 'CRM')}
                  </Link>
                  <Link to="/accountings" className="reports-btn reports-btn--ghost">
                    <Wallet className="h-4 w-4" aria-hidden /> {t('sidebar.menu.accounts', 'Accounts')}
                  </Link>
                  <Link to="/shipments" className="reports-btn reports-btn--ghost">
                    <Package className="h-4 w-4" aria-hidden /> {t('sidebar.menu.shipments', 'Shipments')}
                  </Link>
                  <Link to="/invoices" className="reports-btn reports-btn--ghost">
                    <FileText className="h-4 w-4" aria-hidden /> {t('sidebar.menu.invoices', 'Invoices')}
                  </Link>
                  <button type="button" className="reports-btn reports-btn--primary" onClick={loadAll} disabled={loading}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> {t('reports.syncNow', 'Sync now')}
                  </button>
                </div>
              </div>
            </div>

            <div className="reports-card mb-6">
              <div className="reports-card__head reports-card__head--split">
                <h3 className="reports-card__title">{t('reports.interactiveDashboard', 'Interactive dashboard')}</h3>
                <select
                  className="clients-input min-w-[120px]"
                  value={chartPeriodDays}
                  onChange={(e) => setChartPeriodDays(Number(e.target.value))}
                  aria-label={t('reports.chartPeriod', 'Chart period')}
                >
                  <option value={7}>{t('reports.days7', '7 days')}</option>
                  <option value={30}>{t('reports.days30', '30 days')}</option>
                  <option value={90}>{t('reports.days90', '90 days')}</option>
                </select>
              </div>

              <div className="reports-charts">
                <div className="reports-chart">
                  <p className="reports-chart__label">{t('reports.shipmentsByDirection', 'Shipments by direction')}</p>
                  {shipmentsByDirectionChart.length ? (
                    <DonutChart
                      data={shipmentsByDirectionChart}
                      nameKey="name"
                      valueKey="value"
                      valueLabel={t('common.count', 'Count')}
                      height={240}
                      innerRadius={56}
                      outerRadius={86}
                      showLabel={false}
                    />
                  ) : (
                    <p className="reports-muted">{t('common.noData', 'No data')}</p>
                  )}
                </div>

                <div className="reports-chart">
                  <p className="reports-chart__label">{t('reports.salesRevenue', 'Sales performance (revenue)')}</p>
                  {salesPerfBar.length ? (
                    <BarChart
                      data={salesPerfBar}
                      xKey="rep"
                      yKey="revenue"
                      yLabel={t('reports.revenue', 'Revenue')}
                      height={240}
                      allowDecimals={false}
                      barColor="rgba(30, 42, 90, 0.7)"
                    />
                  ) : (
                    <p className="reports-muted">{t('common.noData', 'No data')}</p>
                  )}
                </div>
              </div>

              <p className="reports-muted mt-3">
                {t(
                  'reports.chartNote',
                  'Note: the current backend provides aggregated report endpoints; more time-series charts can be added when the API exposes month/week breakdowns.',
                )}
              </p>
            </div>

            <div className="reports-available-head">
              <h3 className="reports-available-title">{t('reports.availableReports', 'Available reports')}</h3>
              <button type="button" className="reports-btn reports-btn--ghost" onClick={() => setTemplatesOpen(true)}>
                <FileText className="h-4 w-4" aria-hidden /> {t('reports.templates', 'Report templates')}
              </button>
            </div>

            <div className="reports-grid">
              <div className="reports-card reports-card--tight">
                <div className="reports-card__head reports-card__head--split">
                  <h4 className="reports-card__title">{t('reports.salesReport', 'Sales report')}</h4>
                  <button type="button" className="reports-btn reports-btn--ghost" onClick={handleExportTeamCsv} disabled={loading}>
                    <Download className="h-4 w-4" aria-hidden /> {t('reports.csv', 'CSV')}
                  </button>
                </div>
                <p className="reports-muted">{t('reports.salesReportHint', 'Team performance — click a rep for details')}</p>

                <div className="reports-team-tools">
                  <div className="reports-team-search" dir={locale.startsWith('ar') ? 'rtl' : 'ltr'}>
                    <Search className="reports-team-search__icon" aria-hidden />
                    <input
                      type="search"
                      className="clients-input reports-team-search__input"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder={t('reports.searchRep', 'Search rep…')}
                    />
                  </div>
                  <select className="clients-input min-w-[170px]" value={teamSort} onChange={(e) => setTeamSort(e.target.value)}>
                    <option value="revenue">{t('reports.sortRevenue', 'Sort: revenue')}</option>
                    <option value="conversion">{t('reports.sortConversion', 'Sort: conversion')}</option>
                    <option value="visits">{t('reports.sortVisits', 'Sort: visits')}</option>
                  </select>
                  <button type="button" className="reports-btn reports-btn--primary" onClick={loadAll} disabled={loading}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> {t('reports.apply', 'Apply')}
                  </button>
                </div>

                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>{t('reports.colRep', 'Rep')}</th>
                        <th>{t('reports.colShipments', 'Shipments')}</th>
                        <th>{t('reports.colRevenue', 'Revenue')}</th>
                        <th>{t('reports.colConversion', 'Conversion')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={4} className="reports-empty">
                            {t('common.loading', 'Loading...')}
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        teamPerf.slice(0, 8).map((r) => (
                          <tr key={r.user_id} className="reports-row-link" onClick={() => setDrillDown({ type: 'sales', param: r.name })}>
                            <td className="reports-td-strong">{r.name || '—'}</td>
                            <td>{asNum(r.shipments_count)}</td>
                            <td>{formatMoney(asNum(r.revenue), locale)}</td>
                            <td className={asNum(r.conversion_rate_pct) >= 75 ? 'reports-td-good' : 'reports-td-warn'}>
                              {asNum(r.conversion_rate_pct)}%
                            </td>
                          </tr>
                        ))}
                      {!loading && teamPerf.length === 0 && (
                        <tr>
                          <td colSpan={4} className="reports-empty">
                            {t('common.noData', 'No data')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="reports-card reports-card--tight">
                <div className="reports-card__head">
                  <h4 className="reports-card__title">{t('reports.shipmentsReport', 'Shipments report')}</h4>
                </div>
                <p className="reports-muted">{t('reports.shipmentsReportHint', 'Distribution overview')}</p>
                <div className="reports-mini">
                  {shipmentsByDirectionChart.map((x) => (
                    <div key={x.name} className="reports-mini-row">
                      <span className="reports-linklike">{x.name}</span>
                      <span className="reports-mini-val">{formatCompact(x.value, locale)}</span>
                    </div>
                  ))}
                  {!shipmentsByDirectionChart.length && <p className="reports-muted">{t('common.noData', 'No data')}</p>}
                </div>
                <Link to="/shipments" className="reports-btn reports-btn--ghost mt-3">
                  {t('reports.openShipments', 'Open shipments')}
                </Link>
              </div>

              <div className="reports-card reports-card--tight">
                <div className="reports-card__head">
                  <h4 className="reports-card__title">{t('reports.financialReport', 'Financial report')}</h4>
                </div>
                <p className="reports-muted">{t('reports.financialReportHint', 'Revenue, cost, profit summary')}</p>
                <div className="reports-mini">
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.totalRevenue', 'Total revenue')}:</span>
                    <span className="reports-mini-val">{formatMoney(kpi.revenue, locale)}</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.totalCost', 'Total cost')}:</span>
                    <span className="reports-mini-val reports-td-bad">{formatMoney(kpi.cost, locale)}</span>
                  </div>
                  <div className="reports-mini-row reports-mini-row--top">
                    <span className="reports-td-good reports-td-strong">{t('reports.totalProfit', 'Net profit')}:</span>
                    <span className="reports-mini-val reports-td-good">{formatMoney(kpi.profit, locale)}</span>
                  </div>
                </div>
                <Link to="/accountings" className="reports-btn reports-btn--ghost mt-3">
                  {t('reports.openAccounting', 'Open accounts')}
                </Link>
              </div>

              <div className="reports-card reports-card--tight">
                <div className="reports-card__head reports-card__head--split">
                  <h4 className="reports-card__title">{t('reports.clientsReport', 'Clients report')}</h4>
                  <button type="button" className="reports-btn reports-btn--ghost" onClick={handleExportClientsCsv} disabled={loading}>
                    <Download className="h-4 w-4" aria-hidden /> {t('reports.csv', 'CSV')}
                  </button>
                </div>
                <p className="reports-muted">{t('reports.clientsReportHint', 'CRM indicators and conversion')}</p>
                <div className="reports-mini">
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.clients.total', 'Total clients')}:</span>
                    <span className="reports-mini-val">{clientsReport?.total_clients ?? '—'}</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.clients.newInPeriod', 'New (period)')}:</span>
                    <span className="reports-mini-val">{clientsReport?.new_clients_in_period ?? '—'}</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.clients.conversion', 'Conversion')}:</span>
                    <span className="reports-mini-val reports-td-good">{clientsReport?.conversion_rate_pct ?? '—'}%</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.clients.topSource', 'Top source')}:</span>
                    <span className="reports-mini-val">{clientsReport?.top_lead_source ?? '—'}</span>
                  </div>
                </div>
                <Link to="/clients" className="reports-btn reports-btn--ghost mt-3">
                  {t('reports.openClients', 'Open clients')}
                </Link>
              </div>

              <div className="reports-card reports-card--tight">
                <div className="reports-card__head reports-card__head--split">
                  <h4 className="reports-card__title">{t('reports.partnerStatement', 'Partner statements')}</h4>
                  <button type="button" className="reports-btn reports-btn--ghost" onClick={handleExportPartnersCsv} disabled={loading}>
                    <Download className="h-4 w-4" aria-hidden /> {t('reports.csv', 'CSV')}
                  </button>
                </div>
                <p className="reports-muted">{t('reports.partnerStatementHint', 'Partner balances (accounts)')}</p>
                <div className="reports-mini">
                  {(Array.isArray(partnersReport?.top_partners) ? partnersReport.top_partners : []).slice(0, 4).map((p) => (
                    <div key={p.partner_id} className="reports-mini-row">
                      <span className="reports-linklike">{p.partner_name}</span>
                      <span className="reports-mini-val reports-td-bad">
                        {formatMoney(p.balance, locale, p.currency || 'USD')}
                      </span>
                    </div>
                  ))}
                  {(!partnersReport?.top_partners || partnersReport.top_partners.length === 0) && (
                    <p className="reports-muted">{t('common.noData', 'No data')}</p>
                  )}
                </div>
                <Link to="/accountings" className="reports-btn reports-btn--ghost mt-3">
                  {t('reports.openAccounting', 'Open accounts')}
                </Link>
              </div>

              <div className="reports-card reports-card--tight">
                <div className="reports-card__head reports-card__head--split">
                  <h4 className="reports-card__title">{t('reports.attendanceReport', 'Attendance report')}</h4>
                  <button type="button" className="reports-btn reports-btn--ghost" onClick={handleExportAttendanceCsv} disabled={loading}>
                    <Download className="h-4 w-4" aria-hidden /> {t('reports.csv', 'CSV')}
                  </button>
                </div>
                <p className="reports-muted">{t('reports.attendanceReportHint', 'HR attendance summary')}</p>
                <div className="reports-mini">
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.attendance.totalEmployees', 'Total employees')}:</span>
                    <span className="reports-mini-val">{attendanceReport?.total_employees ?? '—'}</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.attendance.avgAttendance', 'Avg attendance')}:</span>
                    <span className="reports-mini-val reports-td-good">{attendanceReport?.avg_attendance_pct ?? '—'}%</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.attendance.lateCount', 'Late count')}:</span>
                    <span className="reports-mini-val reports-td-warn">{attendanceReport?.late_count ?? '—'}</span>
                  </div>
                  <div className="reports-mini-row">
                    <span className="reports-muted">{t('reports.attendance.absentCount', 'Absent count')}:</span>
                    <span className="reports-mini-val reports-td-bad">{attendanceReport?.absent_count ?? '—'}</span>
                  </div>
                </div>
                <Link to="/attendance" className="reports-btn reports-btn--ghost mt-3">
                  <Clock className="h-4 w-4" aria-hidden /> {t('sidebar.menu.attendance', 'Attendance')}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Drill-down modal */}
        {drillDown && (
          <div className="reports-modal" role="dialog" aria-modal="true" aria-labelledby="reports-drill-title">
            <button type="button" className="reports-modal__backdrop" onClick={() => setDrillDown(null)} aria-label={t('common.cancel', 'Cancel')} />
            <div className="reports-modal__content">
              <div className="reports-modal__head">
                <h3 id="reports-drill-title" className="reports-modal__title">
                  {modalTitleForType(t, drillDown.type, drillDown.param)}
                </h3>
                <button type="button" className="reports-btn reports-btn--icon" onClick={() => setDrillDown(null)} aria-label={t('reports.close', 'Close')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="reports-modal__body">
                {drillDown.type === 'sales' ? (
                  <>
                    <p className="reports-muted">
                      {t(
                        'reports.drillDown.salesHint',
                        'Shipments, revenue and conversion for the selected rep in the chosen period.',
                      )}
                    </p>
                    <Link to="/clients" className="reports-link">
                      {t('reports.openClients', 'Open clients')}
                    </Link>
                  </>
                ) : drillDown.type === 'shipments' ? (
                  <>
                    <p className="reports-muted">{t('reports.drillDown.shipmentsHint', 'See shipment breakdown in the Shipments module.')}</p>
                    <Link to="/shipments" className="reports-link">
                      {t('reports.openShipments', 'Open shipments')}
                    </Link>
                  </>
                ) : drillDown.type === 'finance' ? (
                  <>
                    <p className="reports-muted">{t('reports.drillDown.financeHint', 'Finance summary from invoices and vendor bills.')}</p>
                    <Link to="/accountings" className="reports-link">
                      {t('reports.openAccounting', 'Open accounts')}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="reports-muted">{t('reports.drillDown.clientsHint', 'Conversion insights are derived from SD forms and linked shipments.')}</p>
                    <Link to="/clients" className="reports-link">
                      {t('reports.openClients', 'Open clients')}
                    </Link>
                  </>
                )}
              </div>
              <div className="reports-modal__foot">
                <button type="button" className="reports-btn reports-btn--ghost" onClick={() => setDrillDown(null)}>
                  {t('reports.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates modal */}
        {templatesOpen && (
          <div className="reports-modal" role="dialog" aria-modal="true" aria-labelledby="reports-templates-title">
            <button type="button" className="reports-modal__backdrop" onClick={() => setTemplatesOpen(false)} aria-label={t('common.cancel', 'Cancel')} />
            <div className="reports-modal__content">
              <div className="reports-modal__head">
                <h3 id="reports-templates-title" className="reports-modal__title">
                  {t('reports.templates', 'Report templates')}
                </h3>
                <button type="button" className="reports-btn reports-btn--icon" onClick={() => setTemplatesOpen(false)} aria-label={t('reports.close', 'Close')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="reports-modal__body">
                <p className="reports-muted">
                  {t(
                    'reports.templatesHint',
                    'Create a custom report template: choose type, sections, and schedule (server-side wiring later).',
                  )}
                </p>
                <div className="reports-form">
                  <label className="reports-label">
                    {t('reports.template.type', 'Report type')}
                    <select className="clients-input mt-1">
                      <option>{t('reports.salesReport', 'Sales report')}</option>
                      <option>{t('reports.shipmentsReport', 'Shipments report')}</option>
                      <option>{t('reports.financialReport', 'Financial report')}</option>
                      <option>{t('reports.clientsReport', 'Clients report')}</option>
                      <option>{t('reports.partnerStatement', 'Partner statements')}</option>
                      <option>{t('reports.attendanceReport', 'Attendance report')}</option>
                    </select>
                  </label>
                  <label className="reports-label">
                    {t('reports.template.format', 'Export format')}
                    <select className="clients-input mt-1">
                      <option>{t('reports.template.formatExcelCsv', 'Excel (CSV)')}</option>
                      <option>{t('reports.template.formatPdf', 'PDF')}</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="reports-modal__foot">
                <button type="button" className="reports-btn reports-btn--ghost" onClick={() => setTemplatesOpen(false)}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  className="reports-btn reports-btn--primary"
                  onClick={() => window.alert(t('reports.templatesSaveSoon', 'Saving templates will be available in a future update.'))}
                >
                  <Download className="h-4 w-4" aria-hidden /> {t('reports.saveTemplate', 'Save template')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

