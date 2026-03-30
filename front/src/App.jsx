import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Package, Users as UsersIcon, DollarSign, ChevronDown, RefreshCw, Calendar } from 'lucide-react'
import Login from './pages/Login'
import AuthenticatedLayout from './components/AuthenticatedLayout'
import { Container } from './components/Container'
import { StatsCard } from './components/StatsCard'
import { DropdownMenu } from './components/DropdownMenu'
import Tabs from './components/Tabs'
import Profile from './pages/Profile'
import Users from './pages/Users'
import RolesPermissions from './pages/RolesPermissions'
import Clients from './pages/Clients'
import Accountings from './pages/Accountings'
import Treasury from './pages/Treasury'
import Expenses from './pages/Expenses'
import Vendors from './pages/Vendors'
import Visits from './pages/Visits'
import ClientLookups from './pages/ClientLookups'
import CustomerServices from './pages/CustomerServices'
import Attendance from './pages/Attendance'
import SDForms from './pages/SDForms'
import ShipmentDeclarationForm from './pages/SDForms/ShipmentDeclarationForm'
import Shipments from './pages/Shipments/Shipments'
import Pricing from './pages/Pricing/Pricing'
import Invoices from './pages/Invoices/Invoices'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import { getStoredToken } from './pages/Login'
import { getFollowUpMySummary, getClientStats } from './api/clients'
import { getDashboardOverview } from './api/dashboard'
import FollowUpWorkloadWidgets from './components/FollowUpWorkloadWidgets'
import { useAuthAccess } from './hooks/useAuthAccess'
import RequirePageAccess from './components/RequirePageAccess'
import { LineChart, BarChart } from './components/Charts'
import { getTicketStats } from './api/customerServices'
import { getVisitStats, visitableTypeForStatsQuery } from './api/visits'
import './App.css'

function SignupPlaceholder() {
  const { t } = useTranslation()
  return (
    <Container size="lg">
      <div className="home-page">{t('signup.comingSoon')}</div>
    </Container>
  )
}

function Home() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { hasPageAccess, user } = useAuthAccess()
  const token = getStoredToken()
  const canClientsView = hasPageAccess('clients')
  const [activeTab, setActiveTab] = useState('overview')
  const [dashFollowUpSummary, setDashFollowUpSummary] = useState(null)
  const [dashFollowUpLoading, setDashFollowUpLoading] = useState(false)
  const [dashFollowUpError, setDashFollowUpError] = useState(null)
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState(null)
  const [clientStats, setClientStats] = useState(null)
  const [ticketStats, setTicketStats] = useState(null)
  const [visitStats, setVisitStats] = useState(null)
  const displayName = user?.name || 'User'

  useEffect(() => {
    if (!token || !canClientsView) return
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (cancelled) return
        setDashFollowUpLoading(true)
        setDashFollowUpError(null)
        return getFollowUpMySummary(token)
      })
      .then((res) => {
        if (!cancelled) setDashFollowUpSummary(res)
      })
      .catch((e) => {
        if (!cancelled) {
          setDashFollowUpSummary(null)
          setDashFollowUpError(e?.message || t('clients.followUpWorkloadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setDashFollowUpLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, canClientsView, t])
  const role = (user?.primary_role ?? user?.roles?.[0] ?? 'user')?.toLowerCase?.() || 'user'

  useEffect(() => {
    if (!token) return
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (cancelled) return
        setOverviewLoading(true)
        setOverviewError(null)
        return getDashboardOverview(token)
      })
      .then((data) => {
        if (!cancelled) setOverview(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setOverview(null)
          setOverviewError(e?.message || t('common.error', 'Something went wrong'))
        }
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, t])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const safe = (p, setter) =>
      p
        .then((res) => {
          if (!cancelled) setter(res?.data ?? res)
        })
        .catch(() => {
          if (!cancelled) setter(null)
        })

    if (canClientsView) safe(getClientStats(token), setClientStats)

    if (role === 'support' || role === 'admin') {
      safe(getTicketStats(token), setTicketStats)
    }

    if (role === 'sales' || role === 'sales_manager' || role === 'support' || role === 'admin') {
      safe(getVisitStats(token, { visitable_type: visitableTypeForStatsQuery('client') }), setVisitStats)
    }

    return () => {
      cancelled = true
    }
  }, [token, canClientsView, role])

  const overviewTabs = (() => {
    const tabs = [{ id: 'overview', label: t('pageHeader.overview', 'Overview') }]
    if (role === 'admin' || role === 'accounting') tabs.push({ id: 'finance', label: t('reports.finance', 'Finance') })
    if (role === 'operations' || role === 'admin') tabs.push({ id: 'operations', label: t('sidebar.sections.operations', 'Operations') })
    if (role === 'sales' || role === 'sales_manager' || role === 'admin') tabs.push({ id: 'crm', label: t('sidebar.sections.clients', 'Clients') })
    if (role === 'pricing' || role === 'admin') tabs.push({ id: 'pricing', label: t('pricing.title', 'Pricing') })
    if (role === 'support' || role === 'admin') tabs.push({ id: 'support', label: t('sidebar.sections.customerService', 'Customer Service') })
    return tabs
  })()

  const safeActiveTab = overviewTabs.some((x) => x.id === activeTab) ? activeTab : overviewTabs[0]?.id ?? 'overview'

  const shipmentsTotal = sumCounts(overview?.shipments_by_status)
  const revenueTotal = sumNumber(overview?.revenue_cost_profit_by_month, 'revenue')
  const profitTotal = sumNumber(overview?.revenue_cost_profit_by_month, 'profit')
  const lastTwo = lastTwoMonths(overview?.revenue_cost_profit_by_month)
  const revenueMoM = lastTwo ? pctChange(lastTwo.prev.revenue, lastTwo.curr.revenue) : null
  const profitMoM = lastTwo ? pctChange(lastTwo.prev.profit, lastTwo.curr.profit) : null

  const financeChartData =
    Array.isArray(overview?.revenue_cost_profit_by_month)
      ? overview.revenue_cost_profit_by_month.map((m) => ({
          month: String(m.month ?? '').slice(0, 7),
          revenue: Number(m.revenue ?? 0),
          cost: Number(m.cost ?? 0),
          profit: Number(m.profit ?? 0),
        }))
      : []

  const opsStatusData =
    Array.isArray(overview?.shipments_by_operations_status)
      ? overview.shipments_by_operations_status.map((row) => ({
          label: String(row.operations_status ?? 'unknown'),
          count: Number(row.count ?? 0),
        }))
      : []

  const shipmentsStatusData =
    Array.isArray(overview?.shipments_by_status)
      ? overview.shipments_by_status.map((row) => ({
          label: String(row.status ?? 'unknown'),
          count: Number(row.count ?? 0),
        }))
      : []
  const dateOnly = new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Container size="xl" className="home-page">
      <section className="welcome-banner" aria-label="Welcome">
        <div className="welcome-banner__main">
          <h2 className="welcome-banner__title">{t('home.welcomeBack', { name: displayName })}</h2>
          <p className="welcome-banner__subtitle">{t('home.loggedInAsRole', { role })}</p>
        </div>
        <div className="welcome-banner__quote-wrap">
          <Calendar className="welcome-banner__date-icon" aria-hidden />
          <p className="welcome-banner__quote">{dateOnly}</p>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('statsCard.totalShipments', 'Total Shipments')}
          value={shipmentsTotal}
          icon={<Package className="h-6 w-6" />}
          change={null}
          trend={null}
          variant="blue"
        />
        <StatsCard
          title={t('statsCard.activeClients', 'Active Clients')}
          value={clientStats?.active_clients ?? 0}
          icon={<UsersIcon className="h-6 w-6" />}
          change={clientStats?.active_clients_trend_pct ?? null}
          trend={trendFromDirection(clientStats?.active_clients_trend_direction)}
          variant="green"
        />
        <StatsCard
          title={t('statsCard.revenueToDate', 'Revenue (to date)')}
          value={formatMoney(revenueTotal, i18n.language)}
          icon={<DollarSign className="h-6 w-6" />}
          change={revenueMoM}
          trend={revenueMoM == null ? null : revenueMoM >= 0 ? 'up' : 'down'}
          variant="amber"
        />
        <StatsCard
          title={t('statsCard.netProfit', 'Net Profit')}
          value={formatMoney(profitTotal, i18n.language)}
          icon={<DollarSign className="h-6 w-6" />}
          change={profitMoM}
          trend={profitMoM == null ? null : profitMoM >= 0 ? 'up' : 'down'}
          variant="green"
        />
      </div>

      {overviewLoading ? (
        <div className="mt-4 text-start text-sm text-gray-600 dark:text-gray-400">
          {t('common.loading', 'Loading...')}
        </div>
      ) : overviewError ? (
        <div className="mt-4 text-start text-sm text-red-600 dark:text-red-400">
          {overviewError}
        </div>
      ) : null}

      {canClientsView ? (
        <section className="mt-8 text-start" aria-labelledby="home-followup-workload-heading">
          <h2 id="home-followup-workload-heading" className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('clients.followUpWorkloadTitle')}
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]">
            <FollowUpWorkloadWidgets
              summary={dashFollowUpSummary}
              loading={dashFollowUpLoading}
              error={dashFollowUpError}
              onClientClick={(cid) => navigate('/clients', { state: { focusClientId: cid } })}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="dashboard-tabs-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-start">
          <h2 id="dashboard-tabs-heading" className="text-lg font-semibold">
            {t('pageHeader.overview')}
          </h2>
          <DropdownMenu
            align="end"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {t('pageHeader.actions')}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            }
            items={[
              {
                label: t('pageHeader.refresh'),
                icon: <RefreshCw className="h-4 w-4" />,
                onClick: () => window.location.reload(),
              },
            ]}
          />
        </div>
        <Tabs
          tabs={overviewTabs}
          activeTab={safeActiveTab}
          onChange={setActiveTab}
          className="mb-4"
        />
        <div
          role="tabpanel"
          id="panel-overview"
          aria-labelledby="tab-overview"
          hidden={safeActiveTab !== 'overview'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200/70 bg-white p-4 dark:border-gray-700/70 dark:bg-gray-800/40">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('shipments.title', 'Shipments')} — {t('common.byStatus', 'By status')}
              </h3>
              <BarChart data={shipmentsStatusData} xKey="label" yKey="count" height={260} yLabel={t('common.count', 'Count')} />
            </div>
            <div className="rounded-lg border border-gray-200/70 bg-white p-4 dark:border-gray-700/70 dark:bg-gray-800/40">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('pageHeader.overview', 'Overview')} — {t('common.quickStats', 'Quick stats')}
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  <span className="font-semibold">{t('statsCard.totalShipments', 'Total Shipments')}:</span> {shipmentsTotal}
                </li>
                {clientStats?.total_clients != null ? (
                  <li>
                    <span className="font-semibold">{t('statsCard.totalClients', 'Total Clients')}:</span> {clientStats.total_clients}
                  </li>
                ) : null}
                <li>
                  <span className="font-semibold">{t('statsCard.revenueToDate', 'Revenue (to date)')}:</span> {formatMoney(revenueTotal, i18n.language)}
                </li>
                <li>
                  <span className="font-semibold">{t('statsCard.netProfit', 'Net Profit')}:</span> {formatMoney(profitTotal, i18n.language)}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          role="tabpanel"
          id="panel-finance"
          aria-labelledby="tab-finance"
          hidden={safeActiveTab !== 'finance'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <LineChart
            data={financeChartData}
            xKey="month"
            lines={[
              { dataKey: 'revenue', name: t('reports.revenue', 'Revenue') },
              { dataKey: 'cost', name: t('reports.cost', 'Cost') },
              { dataKey: 'profit', name: t('reports.profit', 'Profit') },
            ]}
            height={320}
          />
        </div>
        <div
          role="tabpanel"
          id="panel-operations"
          aria-labelledby="tab-operations"
          hidden={safeActiveTab !== 'operations'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <BarChart data={opsStatusData} xKey="label" yKey="count" height={320} yLabel={t('common.count', 'Count')} />
        </div>

        <div
          role="tabpanel"
          id="panel-crm"
          aria-labelledby="tab-crm"
          hidden={safeActiveTab !== 'crm'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200/70 bg-white p-4 dark:border-gray-700/70 dark:bg-gray-800/40">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('clients.title', 'Clients')} — {t('common.stats', 'Stats')}
              </h3>
              {clientStats ? (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>
                    <span className="font-semibold">{t('statsCard.totalClients', 'Total Clients')}:</span> {clientStats.total_clients}
                  </li>
                  <li>
                    <span className="font-semibold">{t('statsCard.activeClients', 'Active Clients')}:</span> {clientStats.active_clients}
                  </li>
                  <li>
                    <span className="font-semibold">{t('clients.newClientsThisMonth', 'New clients (this month)')}:</span>{' '}
                    {clientStats.new_clients_this_month}
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.noData', 'No data')}</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200/70 bg-white p-4 dark:border-gray-700/70 dark:bg-gray-800/40">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('visits.title', 'Visits')} — {t('common.quickStats', 'Quick stats')}
              </h3>
              {visitStats ? (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>
                    <span className="font-semibold">{t('visits.total', 'Total visits')}:</span> {visitStats.total_visits ?? 0}
                  </li>
                  <li>
                    <span className="font-semibold">{t('visits.successful', 'Successful')}:</span> {visitStats.successful_count ?? 0}
                  </li>
                  <li>
                    <span className="font-semibold">{t('visits.newClientsFromVisits', 'New clients from visits')}:</span>{' '}
                    {visitStats.new_clients_from_visits ?? 0}
                  </li>
                  {visitStats.top_rep?.name ? (
                    <li>
                      <span className="font-semibold">{t('visits.topRep', 'Top rep')}:</span> {visitStats.top_rep.name}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.noData', 'No data')}</p>
              )}
            </div>
          </div>
        </div>

        <div
          role="tabpanel"
          id="panel-pricing"
          aria-labelledby="tab-pricing"
          hidden={safeActiveTab !== 'pricing'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <div className="text-start">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('pricing.title', 'Pricing')}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t('pricing.overviewHint', 'Quick links to offers and quotes.')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('pricing.goToPricing', 'Go to Pricing')}
              </button>
              {canClientsView ? (
                <button
                  type="button"
                  onClick={() => navigate('/clients')}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {t('clients.title', 'Clients')}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div
          role="tabpanel"
          id="panel-support"
          aria-labelledby="tab-support"
          hidden={safeActiveTab !== 'support'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          {ticketStats ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard title={t('tickets.open', 'Open')} value={ticketStats.open ?? 0} icon={<Package className="h-6 w-6" />} variant="red" />
              <StatsCard title={t('tickets.pending', 'Pending')} value={ticketStats.pending ?? 0} icon={<Package className="h-6 w-6" />} variant="amber" />
              <StatsCard
                title={t('tickets.resolvedToday', 'Resolved Today')}
                value={ticketStats.resolved_today ?? 0}
                icon={<Package className="h-6 w-6" />}
                variant="green"
              />
              <StatsCard title={t('tickets.sla', 'SLA %')} value={ticketStats.sla_response_pct ?? 0} icon={<Package className="h-6 w-6" />} variant="blue" />
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.noData', 'No data')}</p>
          )}
        </div>
      </section>
    </Container>
  )
}

function sumCounts(rows) {
  if (!Array.isArray(rows)) return 0
  return rows.reduce((acc, r) => acc + Number(r?.count ?? 0), 0)
}

function sumNumber(rows, key) {
  if (!Array.isArray(rows)) return 0
  return rows.reduce((acc, r) => acc + Number(r?.[key] ?? 0), 0)
}

function lastTwoMonths(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null
  const curr = rows[rows.length - 1] ?? {}
  const prev = rows[rows.length - 2] ?? {}
  return {
    prev: { revenue: Number(prev.revenue ?? 0), profit: Number(prev.profit ?? 0) },
    curr: { revenue: Number(curr.revenue ?? 0), profit: Number(curr.profit ?? 0) },
  }
}

function pctChange(prev, curr) {
  const p = Number(prev ?? 0)
  const c = Number(curr ?? 0)
  if (p === 0) return null
  return Math.round(((c - p) / p) * 100)
}

function trendFromDirection(direction) {
  if (direction === 'up') return 'up'
  if (direction === 'down') return 'down'
  return null
}

function formatMoney(amount, locale) {
  const n = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat(locale || 'en', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `$${Math.round(n).toLocaleString()}`
  }
}

function App() {
  const basename =
    import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route
            path="/"
            element={
              <RequirePageAccess pageKey="dashboard">
                <Home />
              </RequirePageAccess>
            }
          />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/users"
            element={
              <RequirePageAccess pageKey="users">
                <Users />
              </RequirePageAccess>
            }
          />
          <Route
            path="/roles-permissions"
            element={
              <RequirePageAccess pageKey="roles_permissions">
                <RolesPermissions />
              </RequirePageAccess>
            }
          />
          <Route
            path="/clients"
            element={
              <RequirePageAccess pageKey="clients">
                <Clients />
              </RequirePageAccess>
            }
          />
          <Route
            path="/accountings"
            element={
              <RequirePageAccess pageKey="accounting">
                <Accountings />
              </RequirePageAccess>
            }
          />
          <Route
            path="/treasury"
            element={
              <RequirePageAccess pageKey="treasury">
                <Treasury />
              </RequirePageAccess>
            }
          />
          <Route
            path="/expenses"
            element={
              <RequirePageAccess pageKey="expenses">
                <Expenses />
              </RequirePageAccess>
            }
          />
          <Route
            path="/vendors"
            element={
              <RequirePageAccess pageKey="partners">
                <Vendors />
              </RequirePageAccess>
            }
          />
          <Route
            path="/visits"
            element={
              <RequirePageAccess pageKey="visits">
                <Visits />
              </RequirePageAccess>
            }
          />
          <Route path="/client-lookups" element={<ClientLookups />} />
          <Route
            path="/customer-services"
            element={
              <RequirePageAccess pageKey="customer_service">
                <CustomerServices />
              </RequirePageAccess>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequirePageAccess pageKey="attendance">
                <Attendance />
              </RequirePageAccess>
            }
          />
          <Route
            path="/sd-forms"
            element={
              <RequirePageAccess pageKey="sd_forms">
                <SDForms />
              </RequirePageAccess>
            }
          />
          <Route
            path="/sd-forms/declaration"
            element={
              <RequirePageAccess pageKey="sd_forms">
                <ShipmentDeclarationForm />
              </RequirePageAccess>
            }
          />
          <Route
            path="/shipments"
            element={
              <RequirePageAccess pageKey="shipments">
                <Shipments />
              </RequirePageAccess>
            }
          />
          <Route
            path="/pricing"
            element={
              <RequirePageAccess pageKey="pricing">
                <Pricing />
              </RequirePageAccess>
            }
          />
          <Route
            path="/invoices"
            element={
              <RequirePageAccess pageKey="invoices">
                <Invoices />
              </RequirePageAccess>
            }
          />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/settings"
            element={
              <RequirePageAccess pageKey="settings">
                <Settings />
              </RequirePageAccess>
            }
          />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupPlaceholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
