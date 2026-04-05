import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  Calendar,
  BarChart3,
  DollarSign,
  Users as UsersIcon,
  UserSquare2,
  Truck,
  ClipboardCheck,
  FileText,
  TriangleAlert,
} from 'lucide-react'
import Login from './pages/Login'
import AuthenticatedLayout from './components/AuthenticatedLayout'
import { Container } from './components/Container'
import { StatsCard } from './components/StatsCard'
import { LineChart, BarChart, PieChart } from './components/Charts'
import Table from './components/Table/Table'
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
import AdminNotifications from './pages/AdminNotifications/AdminNotifications'
import Settings from './pages/Settings'
import Reports from './pages/Reports/Reports'
import Documents from './pages/Documents/Documents'
import { getStoredToken } from './pages/Login'
import FollowUpWorkloadWidgets from './components/FollowUpWorkloadWidgets'
import {
  getDashboardAdminOverview,
  getDashboardSalesManager,
  getDashboardSalesEmployee,
  getDashboardAccountant,
  getDashboardPricingTeam,
  getDashboardOperationsEmployee,
  getDashboardSupportEmployee,
} from './api/dashboard'
import { getFollowUpMySummary } from './api/clients'
import { useAuthAccess } from './hooks/useAuthAccess'
import RequirePageAccess from './components/RequirePageAccess'
import RequireAdmin from './components/RequireAdmin'
import './App.css'
import './pages/Clients/Clients.css'

function SignupPlaceholder() {
  const { t } = useTranslation()
  return (
    <Container size="lg">
      <div className="home-page">{t('signup.comingSoon')}</div>
    </Container>
  )
}

function RequireAdminOnly({ children }) {
  const { isAdminRole } = useAuthAccess()
  if (!isAdminRole) return <Navigate to="/" replace />
  return children
}

function Home() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthAccess()
  const token = getStoredToken()
  const [dashboardState, setDashboardState] = useState({ loading: true, error: null, data: null, roleKey: 'admin' })
  const [salesFollowUpSummary, setSalesFollowUpSummary] = useState({ loading: false, error: null, data: null })
  const [salesSummaryRefreshKey, setSalesSummaryRefreshKey] = useState(0)
  const displayName = user?.name || t('common.user', 'User')
  const role = String(user?.primary_role ?? user?.roles?.[0]?.name ?? user?.roles?.[0] ?? t('common.user', 'user'))
  const roleKey = resolveDashboardRole(user)
  const roleFetcher = dashboardFetcherForRole(roleKey)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setDashboardState({ loading: false, error: t('common.error', 'Something went wrong'), data: null, roleKey })
      return () => {
        cancelled = true
      }
    }
    setDashboardState({ loading: true, error: null, data: null, roleKey })
    roleFetcher(token)
      .then((data) => {
        if (!cancelled) setDashboardState({ loading: false, error: null, data, roleKey })
      })
      .catch((e) => {
        if (!cancelled) setDashboardState({ loading: false, error: e?.message || t('common.error', 'Something went wrong'), data: null, roleKey })
      })

    return () => {
      cancelled = true
    }
  }, [token, roleKey, roleFetcher, t])

  useEffect(() => {
    if (roleKey !== 'sales' || !token) {
      setSalesFollowUpSummary({ loading: false, error: null, data: null })
      return
    }
    let cancelled = false
    setSalesFollowUpSummary((prev) => ({ ...prev, loading: true, error: null }))
    getFollowUpMySummary(token)
      .then((data) => {
        if (!cancelled) setSalesFollowUpSummary({ loading: false, error: null, data })
      })
      .catch((e) => {
        if (!cancelled) setSalesFollowUpSummary({ loading: false, error: e?.message || t('common.error', 'Something went wrong'), data: null })
      })
    return () => {
      cancelled = true
    }
  }, [token, roleKey, salesSummaryRefreshKey, t])

  useEffect(() => {
    const onFollowUpsChanged = () => setSalesSummaryRefreshKey((k) => k + 1)
    window.addEventListener('am:followups:changed', onFollowUpsChanged)
    return () => window.removeEventListener('am:followups:changed', onFollowUpsChanged)
  }, [])

  const dateOnly = new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <Container size="xl">
      <div className="clients-page home-page">
        <section className="welcome-banner" aria-label={t('dashboardModule.welcomeAria', 'Welcome')}>
          <div className="welcome-banner__main">
            <h2 className="welcome-banner__title">{t('home.welcomeBack', { name: displayName })}</h2>
            <p className="welcome-banner__subtitle">{t('home.loggedInAsRole', { role })}</p>
          </div>
          <div className="welcome-banner__quote-wrap">
            <Calendar className="welcome-banner__date-icon" aria-hidden />
            <p className="welcome-banner__quote">{dateOnly}</p>
          </div>
        </section>

        <section className="space-y-4">
          <RoleDashboardSection state={dashboardState} roleKey={roleKey} salesFollowUpSummary={salesFollowUpSummary} />
        </section>
      </div>
    </Container>
  )
}

function RoleDashboardSection({ state, roleKey, salesFollowUpSummary }) {
  const { t } = useTranslation()

  return (
    <article className="clients-filters-card">
      <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">{dashboardTitle(roleKey, t)}</h3>
      {state?.loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
      ) : state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : (
        <RoleDashboardContent roleKey={roleKey} payload={extractPayload(state?.data)} salesFollowUpSummary={salesFollowUpSummary} />
      )}
    </article>
  )
}

function RoleDashboardContent({ roleKey, payload, salesFollowUpSummary }) {
  if (roleKey === 'admin') return <AdminDashboardBlock payload={payload} />
  if (roleKey === 'sales_manager') return <SalesManagerDashboardBlock payload={payload} />
  if (roleKey === 'sales') return <SalesEmployeeDashboardBlock payload={payload} followUpSummaryState={salesFollowUpSummary} />
  if (roleKey === 'accountant') return <AccountantDashboardBlock payload={payload} />
  if (roleKey === 'pricing') return <PricingDashboardBlock payload={payload} />
  if (roleKey === 'operations') return <OperationsDashboardBlock payload={payload} />
  if (roleKey === 'support') return <SupportDashboardBlock payload={payload} />
  return <div className="text-sm text-gray-600 dark:text-gray-400">—</div>
}

function AdminDashboardBlock({ payload }) {
  const { t } = useTranslation()
  const usersByRole = payload?.users_by_role || {}
  const clients = payload?.clients || {}
  const attendance = payload?.attendance || {}
  const system = payload?.system || {}
  const financial = Array.isArray(payload?.financial) ? payload.financial : []
  const shipments = normalizeSeries(payload?.shipments?.shipments_by_status)
  const employeePerf = Array.isArray(payload?.charts?.employee_performance_bar) ? payload.charts.employee_performance_bar : []

  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title={t('dashboardModule.labels.totalUsersSales', 'Sales Users')} value={asNumber(usersByRole.sales)} icon={<UsersIcon className="h-6 w-6" />} variant="blue" />
        <StatsCard title={t('dashboardModule.labels.totalUsersOperations', 'Operations Users')} value={asNumber(usersByRole.operations)} icon={<UsersIcon className="h-6 w-6" />} variant="amber" />
        <StatsCard title={t('dashboardModule.labels.totalUsersSupport', 'Support Users')} value={asNumber(usersByRole.support)} icon={<UsersIcon className="h-6 w-6" />} variant="green" />
        <StatsCard title={t('dashboardModule.labels.totalUsersAccountants', 'Accountants')} value={asNumber(usersByRole.accountants)} icon={<UsersIcon className="h-6 w-6" />} variant="red" />
      </div>
      <div className="clients-stats-grid">
        <StatsCard title={t('dashboardModule.labels.totalClients')} value={asNumber(clients.total_clients)} icon={<UsersIcon className="h-6 w-6" />} variant="blue" />
        <StatsCard title={t('dashboardModule.labels.newClientsPeriod')} value={asNumber(clients.new_clients)} icon={<UsersIcon className="h-6 w-6" />} variant="green" />
        <StatsCard title={t('dashboardModule.labels.conversionRate')} value={asNumber(clients.conversion_rate_pct)} icon={<BarChart3 className="h-6 w-6" />} variant="amber" />
        <StatsCard title={t('dashboardModule.labels.totalShipments')} value={asNumber(payload?.shipments?.total_shipments)} icon={<Truck className="h-6 w-6" />} variant="red" />
      </div>
      <div className="clients-stats-grid">
        <StatsCard title={t('dashboardModule.labels.avgAttendance')} value={asNumber(attendance.avg_attendance_pct)} icon={<ClipboardCheck className="h-6 w-6" />} variant="green" />
        <StatsCard title={t('dashboardModule.labels.absentCount')} value={asNumber(attendance.absents)} icon={<UserSquare2 className="h-6 w-6" />} variant="amber" />
        <StatsCard title={t('dashboardModule.labels.lateCount')} value={asNumber(attendance.late)} icon={<TriangleAlert className="h-6 w-6" />} variant="red" />
        <StatsCard title={t('dashboardModule.labels.systemErrors', 'System Errors')} value={asNumber(system.errors_count)} icon={<TriangleAlert className="h-6 w-6" />} variant="red" />
      </div>
      <div className="clients-charts-grid">
        <PieChart data={shipments} nameKey="name" valueKey="value" showLabel={false} height={260} />
        <LineChart data={financial} xKey="month" lines={[{ dataKey: 'revenue', name: t('dashboardModule.labels.totalRevenue') }, { dataKey: 'cost', name: t('dashboardModule.labels.totalCost') }, { dataKey: 'profit', name: t('dashboardModule.labels.totalProfit') }]} height={260} />
        <BarChart data={employeePerf.map((r) => ({ name: r.employee, value: asNumber(r.revenue) }))} xKey="name" yKey="value" height={260} />
      </div>
      <PartnersReportBlock payload={{ rows: payload?.top_partners || [] }} />
    </div>
  )
}

function SalesManagerDashboardBlock({ payload }) {
  const team = Array.isArray(payload?.team_performance) ? payload.team_performance : []
  const leads = Array.isArray(payload?.lead_sources) ? payload.lead_sources : []
  const pipeline = payload?.sales_pipeline || {}
  const monthlyRevenue = Array.isArray(payload?.charts?.monthly_revenue_line) ? payload.charts.monthly_revenue_line : []
  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title="Open Deals" value={asNumber(pipeline.open_deals)} icon={<BarChart3 className="h-6 w-6" />} variant="amber" />
        <StatsCard title="Closed Deals" value={asNumber(pipeline.closed_deals)} icon={<BarChart3 className="h-6 w-6" />} variant="green" />
      </div>
      <div className="clients-charts-grid">
        <BarChart data={leads.map((x) => ({ name: x.source, value: asNumber(x.count) }))} xKey="name" yKey="value" height={260} />
        <BarChart data={team.map((x) => ({ name: x.employee, value: asNumber(x.revenue) }))} xKey="name" yKey="value" height={260} />
        <LineChart data={monthlyRevenue} xKey="month" lines={[{ dataKey: 'revenue', name: 'Revenue' }]} height={260} />
      </div>
      <Table columns={[{ key: 'employee', label: 'Employee' }, { key: 'clients_count', label: 'Clients' }, { key: 'sd_forms_count', label: 'SD Forms' }, { key: 'shipments_count', label: 'Shipments' }, { key: 'revenue', label: 'Revenue' }, { key: 'conversion_rate_pct', label: 'Conversion %' }]} data={team} getRowKey={(r) => r.employee_id ?? r.employee} />
    </div>
  )
}

function SalesEmployeeDashboardBlock({ payload, followUpSummaryState }) {
  const perf = payload?.personal_performance || {}
  const followUps = Array.isArray(payload?.customers_needing_follow_up) ? payload.customers_needing_follow_up : []
  const pending = Array.isArray(payload?.pending_sd_forms) ? payload.pending_sd_forms : []
  const monthly = Array.isArray(payload?.charts?.monthly_performance_line) ? payload.charts.monthly_performance_line : []
  const statusPie = normalizeSeries(payload?.charts?.clients_by_status_pie)
  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title="Clients" value={asNumber(perf.clients)} icon={<UsersIcon className="h-6 w-6" />} variant="blue" />
        <StatsCard title="Shipments" value={asNumber(perf.shipments)} icon={<Truck className="h-6 w-6" />} variant="green" />
        <StatsCard title="Revenue" value={asNumber(perf.revenue)} icon={<DollarSign className="h-6 w-6" />} variant="amber" />
        <StatsCard title="Conversion %" value={asNumber(perf.conversion_rate_pct)} icon={<BarChart3 className="h-6 w-6" />} variant="red" />
      </div>
      <div className="clients-charts-grid">
        <PieChart data={statusPie} nameKey="name" valueKey="value" showLabel={false} height={260} />
        <LineChart data={monthly} xKey="month" lines={[{ dataKey: 'qualified', name: 'Qualified' }, { dataKey: 'converted', name: 'Converted' }]} height={260} />
      </div>
      <div className="clients-extra-panel">
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">My follow-up summary</p>
        <FollowUpWorkloadWidgets
          summary={followUpSummaryState?.data}
          loading={!!followUpSummaryState?.loading}
          error={followUpSummaryState?.error}
        />
      </div>
      <Table columns={[{ key: 'client', label: 'Client' }, { key: 'next_follow_up_at', label: 'Next Follow-up' }, { key: 'summary', label: 'Summary' }]} data={followUps} getRowKey={(r) => `${r.client}-${r.next_follow_up_at}`} emptyMessage="No follow-ups." />
      <Table columns={[{ key: 'sd_number', label: 'SD Number' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Created At' }]} data={pending} getRowKey={(r) => r.id ?? r.sd_number} emptyMessage="No pending SD forms." />
    </div>
  )
}

function AccountantDashboardBlock({ payload }) {
  const totals = payload?.totals || {}
  const invoices = payload?.invoices || {}
  const line = Array.isArray(payload?.charts?.revenue_vs_cost_line) ? payload.charts.revenue_vs_cost_line : []
  const byClient = Array.isArray(payload?.revenue_by_client) ? payload.revenue_by_client : []
  const byOps = Array.isArray(payload?.cost_by_operations) ? payload.cost_by_operations : []
  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title="Total Revenue" value={asNumber(totals.total_revenue)} icon={<DollarSign className="h-6 w-6" />} variant="green" />
        <StatsCard title="Total Cost" value={asNumber(totals.total_cost)} icon={<DollarSign className="h-6 w-6" />} variant="red" />
        <StatsCard title="Total Profit" value={asNumber(totals.total_profit)} icon={<BarChart3 className="h-6 w-6" />} variant="blue" />
        <StatsCard title="Paid Invoices" value={asNumber(invoices.paid)} icon={<FileText className="h-6 w-6" />} variant="amber" />
      </div>
      <div className="clients-charts-grid">
        <LineChart data={line} xKey="month" lines={[{ dataKey: 'revenue', name: 'Revenue' }, { dataKey: 'cost', name: 'Cost' }]} height={260} />
        <PieChart data={byClient.map((r) => ({ name: r.client, value: asNumber(r.revenue) }))} nameKey="name" valueKey="value" showLabel={false} height={260} />
        <BarChart data={byOps.map((r) => ({ name: r.operation, value: asNumber(r.cost) }))} xKey="name" yKey="value" height={260} />
      </div>
    </div>
  )
}

function PricingDashboardBlock({ payload }) {
  const open = normalizeSeries(payload?.open_requests_by_status)
  const profit = Array.isArray(payload?.expected_profit_per_request) ? payload.expected_profit_per_request : []
  const price = Array.isArray(payload?.price_comparison) ? payload.price_comparison : []
  const priority = Array.isArray(payload?.priority_requests) ? payload.priority_requests : []
  return (
    <div className="space-y-4">
      <div className="clients-charts-grid">
        <BarChart data={profit.map((r) => ({ name: r.request, value: asNumber(r.profit) }))} xKey="name" yKey="value" height={260} />
        <LineChart data={price} xKey="month" lines={[{ dataKey: 'proposed_avg', name: 'Proposed' }, { dataKey: 'actual_avg', name: 'Actual' }, { dataKey: 'monthly_revenue', name: 'Revenue' }]} height={260} />
        <PieChart data={open} nameKey="name" valueKey="value" showLabel={false} height={260} />
      </div>
      <Table columns={[{ key: 'quote_no', label: 'Request' }, { key: 'client', label: 'Client' }, { key: 'status', label: 'Status' }, { key: 'expected_profit', label: 'Expected Profit' }, { key: 'priority', label: 'Priority' }]} data={priority} getRowKey={(r) => r.quote_no} />
    </div>
  )
}

function OperationsDashboardBlock({ payload }) {
  const overview = payload?.shipments_overview || {}
  const status = normalizeSeries(payload?.charts?.shipments_by_status_pie)
  const completed = Array.isArray(payload?.charts?.monthly_completed_shipments_line) ? payload.charts.monthly_completed_shipments_line : []
  const assigned = Array.isArray(payload?.assigned_shipments) ? payload.assigned_shipments : []
  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title="Assigned Shipments" value={asNumber(overview.total_assigned)} icon={<Truck className="h-6 w-6" />} variant="blue" />
        <StatsCard title="Delayed Shipments" value={asNumber(overview.delayed_shipments)} icon={<TriangleAlert className="h-6 w-6" />} variant="red" />
        <StatsCard title="Avg Processing (h)" value={asNumber(overview.avg_processing_time_hours)} icon={<BarChart3 className="h-6 w-6" />} variant="amber" />
      </div>
      <div className="clients-charts-grid">
        <PieChart data={status} nameKey="name" valueKey="value" showLabel={false} height={260} />
        <LineChart data={completed} xKey="month" lines={[{ dataKey: 'completed', name: 'Completed' }]} height={260} />
      </div>
      <Table columns={[{ key: 'shipment_ref', label: 'Shipment' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }, { key: 'deadline', label: 'Deadline' }, { key: 'task_status', label: 'Task Status' }]} data={assigned} getRowKey={(r) => `${r.shipment_id}-${r.deadline}`} />
    </div>
  )
}

function SupportDashboardBlock({ payload }) {
  const overview = payload?.tickets_overview || {}
  const types = Array.isArray(payload?.charts?.tickets_by_type_bar) ? payload.charts.tickets_by_type_bar : []
  const resolution = Array.isArray(payload?.charts?.monthly_avg_resolution_line) ? payload.charts.monthly_avg_resolution_line : []
  const csat = Array.isArray(payload?.charts?.csat_ratings_pie) ? payload.charts.csat_ratings_pie : []
  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title="Open Tickets" value={asNumber(overview.open)} icon={<FileText className="h-6 w-6" />} variant="amber" />
        <StatsCard title="Closed Tickets" value={asNumber(overview.closed)} icon={<FileText className="h-6 w-6" />} variant="green" />
        <StatsCard title="Overdue Tickets" value={asNumber(overview.overdue)} icon={<TriangleAlert className="h-6 w-6" />} variant="red" />
        <StatsCard title="CSAT" value={asNumber(payload?.csat)} icon={<UsersIcon className="h-6 w-6" />} variant="blue" />
      </div>
      <div className="clients-charts-grid">
        <BarChart data={types.map((r) => ({ name: r.type, value: asNumber(r.value) }))} xKey="name" yKey="value" height={260} />
        <LineChart data={resolution} xKey="month" lines={[{ dataKey: 'avg_resolution_hours', name: 'Avg Resolution (h)' }]} height={260} />
        <PieChart data={csat.map((r) => ({ name: r.rating, value: asNumber(r.value) }))} nameKey="name" valueKey="value" showLabel={false} height={260} />
      </div>
    </div>
  )
}

function DashboardOverviewBlock({ payload }) {
  const { t } = useTranslation()
  const shipments = normalizeSeries(payload?.shipments_by_status)
  const sdForms = normalizeSeries(payload?.sd_forms_by_status)
  const monthly = normalizeRcpByMonth(payload?.revenue_cost_profit_by_month)
  const latest = monthly[monthly.length - 1] || { month: '—', revenue: 0, cost: 0, profit: 0 }
  const cards = [
    {
      title: t('dashboardModule.labels.totalShipments'),
      value: asNumber(payload?.total_shipments),
      icon: <Truck className="h-6 w-6" />,
      variant: 'blue',
    },
    {
      title: t('dashboardModule.labels.totalSdForms'),
      value: asNumber(payload?.total_sd_forms),
      icon: <FileText className="h-6 w-6" />,
      variant: 'amber',
    },
    ...shipments.map((item) => ({
      title: t('dashboardModule.labels.shipmentsStatus', { status: item.name }),
      value: item.value,
      icon: <Truck className="h-6 w-6" />,
      variant: 'blue',
    })),
    ...sdForms.map((item) => ({
      title: t('dashboardModule.labels.sdFormsStatus', { status: item.name }),
      value: item.value,
      icon: <FileText className="h-6 w-6" />,
      variant: 'amber',
    })),
    { title: t('dashboardModule.labels.revenueMonth', { month: latest.month }), value: latest.revenue, icon: <DollarSign className="h-6 w-6" />, variant: 'green' },
    { title: t('dashboardModule.labels.costMonth', { month: latest.month }), value: latest.cost, icon: <DollarSign className="h-6 w-6" />, variant: 'red' },
    { title: t('dashboardModule.labels.profitMonth', { month: latest.month }), value: latest.profit, icon: <BarChart3 className="h-6 w-6" />, variant: 'green' },
  ]

  return (
    <div className="clients-stats-grid">
      {cards.map((item, idx) => (
        <StatsCard key={`${item.title}-${idx}`} title={item.title} value={item.value} icon={item.icon} variant={item.variant} />
      ))}
    </div>
  )
}

function ShipmentsReportBlock({ payload }) {
  const byDirection = normalizeSeries(payload?.by_direction)
  const byLineVendor = normalizeSeries(payload?.by_line_vendor)
  const byOriginPort = normalizeSeries(payload?.by_origin_port)

  return (
    <div className="clients-charts-grid">
      <BarChart data={byDirection} xKey="name" yKey="value" height={260} />
      <PieChart data={byLineVendor} nameKey="name" valueKey="value" height={260} showLabel={false} />
      <PieChart data={byOriginPort} nameKey="name" valueKey="value" height={260} showLabel={false} />
    </div>
  )
}

function FinanceReportBlock({ payload }) {
  const { t } = useTranslation()
  return (
    <div className="clients-stats-grid">
      <StatsCard title={t('dashboardModule.labels.totalRevenue')} value={asNumber(payload?.total_revenue ?? payload?.revenue)} icon={<DollarSign className="h-6 w-6" />} variant="green" />
      <StatsCard title={t('dashboardModule.labels.totalCost')} value={asNumber(payload?.total_cost ?? payload?.cost)} icon={<DollarSign className="h-6 w-6" />} variant="red" />
      <StatsCard title={t('dashboardModule.labels.totalProfit')} value={asNumber(payload?.total_profit ?? payload?.profit)} icon={<BarChart3 className="h-6 w-6" />} variant="blue" />
      <StatsCard title={t('dashboardModule.labels.invoicesCount')} value={asNumber(payload?.invoices_count)} icon={<FileText className="h-6 w-6" />} variant="amber" />
      <StatsCard title={t('dashboardModule.labels.vendorBillsCount')} value={asNumber(payload?.vendor_bills_count)} icon={<UserSquare2 className="h-6 w-6" />} variant="amber" />
    </div>
  )
}

function ClientsReportBlock({ payload }) {
  const { t } = useTranslation()
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  const columns = [
    { key: 'client_name', label: t('dashboardModule.table.client') },
    { key: 'shipments_count', label: t('dashboardModule.table.shipments') },
    { key: 'revenue', label: t('dashboardModule.table.revenue') },
    { key: 'created_at', label: t('dashboardModule.table.createdAt') },
  ]
  const metricCards = [
    { title: t('dashboardModule.labels.totalClients'), value: asNumber(payload?.total_clients), icon: <UsersIcon className="h-6 w-6" />, variant: 'blue' },
    { title: t('dashboardModule.labels.newClientsPeriod'), value: asNumber(payload?.new_clients_in_period), icon: <UsersIcon className="h-6 w-6" />, variant: 'green' },
    { title: t('dashboardModule.labels.conversionRate'), value: asNumber(payload?.conversion_rate_pct), icon: <BarChart3 className="h-6 w-6" />, variant: 'amber' },
    { title: t('dashboardModule.labels.topLeadSourceCount'), value: asNumber(payload?.top_lead_source_count), icon: <FileText className="h-6 w-6" />, variant: 'red' },
  ]

  return (
    <div className="space-y-4">
      {metricCards.length > 0 ? (
        <div className="clients-stats-grid">
          {metricCards.map((item, idx) => (
            <StatsCard key={`${item.title}-${idx}`} title={item.title} value={item.value} icon={item.icon} variant={item.variant} />
          ))}
        </div>
      ) : null}
      <Table
        columns={columns}
        data={rows.map((r, i) => ({ ...r, __rowKey: `row-${i}` }))}
        getRowKey={(row) => row.id ?? row._id ?? row.__rowKey}
      />
    </div>
  )
}

function AttendanceReportBlock({ payload }) {
  const { t } = useTranslation()
  const trendRows = normalizeAttendanceTrend(payload?.attendance_trends ?? payload?.trends ?? [])
  return (
    <div className="space-y-4">
      <div className="clients-stats-grid">
        <StatsCard title={t('dashboardModule.labels.totalEmployees')} value={asNumber(payload?.total_employees)} icon={<UsersIcon className="h-6 w-6" />} variant="blue" />
        <StatsCard title={t('dashboardModule.labels.avgAttendance')} value={asNumber(payload?.avg_attendance ?? payload?.avg_attendance_pct)} icon={<ClipboardCheck className="h-6 w-6" />} variant="green" />
        <StatsCard title={t('dashboardModule.labels.lateCount')} value={asNumber(payload?.late_count)} icon={<TriangleAlert className="h-6 w-6" />} variant="amber" />
        <StatsCard title={t('dashboardModule.labels.absentCount')} value={asNumber(payload?.absent_count)} icon={<UserSquare2 className="h-6 w-6" />} variant="red" />
      </div>
      <LineChart
        data={trendRows}
        xKey="name"
        lines={[
          { dataKey: 'present', name: t('dashboardModule.labels.present') },
          { dataKey: 'late', name: t('dashboardModule.labels.late') },
          { dataKey: 'absent', name: t('dashboardModule.labels.absent') },
        ]}
        height={260}
      />
    </div>
  )
}

function SalesPerformanceBlock({ payload }) {
  const { t } = useTranslation()
  const rows = Array.isArray(payload?.data) ? payload.data : []
  const columns = [
    { key: 'name', label: t('dashboardModule.table.salesRep') },
    { key: 'shipments_count', label: t('dashboardModule.table.shipments') },
    { key: 'total_sales', label: t('dashboardModule.table.totalSales') },
    { key: 'net_profit', label: t('dashboardModule.table.netProfit') },
    { key: 'avg_deal_size', label: t('dashboardModule.table.avgDealSize') },
  ]
  return (
    <Table
      columns={columns}
      data={rows.map((r, i) => ({ ...r, __rowKey: `sales-${i}` }))}
      getRowKey={(row) => row.user_id ?? row.__rowKey}
      emptyMessage={t('dashboardModule.empty.sales')}
    />
  )
}

function TeamPerformanceBlock({ payload }) {
  const { t } = useTranslation()
  const rows = Array.isArray(payload?.data) ? payload.data : []
  const columns = [
    { key: 'name', label: t('dashboardModule.table.teamMember') },
    { key: 'clients_count', label: t('dashboardModule.table.clients') },
    { key: 'sd_forms_count', label: t('dashboardModule.table.sdForms') },
    { key: 'shipments_count', label: t('dashboardModule.table.shipments') },
    { key: 'revenue', label: t('dashboardModule.table.revenue') },
    { key: 'conversion_rate_pct', label: t('dashboardModule.table.conversionRate') },
    { key: 'visits_count', label: t('dashboardModule.table.visits') },
  ]
  return (
    <Table
      columns={columns}
      data={rows.map((r, i) => ({ ...r, __rowKey: `team-${i}` }))}
      getRowKey={(row) => row.user_id ?? row.__rowKey}
      emptyMessage={t('dashboardModule.empty.team')}
    />
  )
}

function PartnersReportBlock({ payload }) {
  const { t } = useTranslation()
  const rows = Array.isArray(payload?.rows) ? payload.rows : extractTableRows(payload)
  const columns = [
    { key: 'partner_name', label: t('dashboardModule.table.partner') },
    { key: 'currency', label: t('dashboardModule.table.currency') },
    { key: 'total_due', label: t('dashboardModule.table.totalDue') },
    { key: 'paid', label: t('dashboardModule.table.paid') },
    { key: 'balance', label: t('dashboardModule.table.balance') },
    { key: 'bills_count', label: t('dashboardModule.table.bills') },
    { key: 'payments_count', label: t('dashboardModule.table.payments') },
  ]
  return (
    <Table
      columns={columns}
      data={rows.map((r, i) => ({ ...r, __rowKey: `partner-${i}` }))}
      getRowKey={(row) => row.partner_id ?? row.__rowKey}
      emptyMessage={t('dashboardModule.empty.partners')}
    />
  )
}

function extractPayload(data) {
  if (data == null) return null
  return data.data ?? data
}

function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeSeries(source) {
  if (Array.isArray(source)) {
    return source.map((item, i) => ({
      name: String(item?.label ?? item?.name ?? item?.status ?? item?.direction ?? item?.vendor ?? item?.port ?? `#${i + 1}`),
      value: asNumber(item?.value ?? item?.count ?? item?.total ?? item?.shipments ?? item?.amount),
    }))
  }
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([name, value]) => ({ name, value: asNumber(value) }))
  }
  return []
}

function normalizeRcpByMonth(source) {
  const arr = Array.isArray(source) ? source : []
  return arr.map((item, i) => ({
    month: String(item?.month ?? item?.label ?? item?.name ?? `#${i + 1}`),
    revenue: asNumber(item?.revenue),
    cost: asNumber(item?.cost),
    profit: asNumber(item?.profit),
  }))
}

function normalizeAttendanceTrend(source) {
  const arr = Array.isArray(source) ? source : []
  return arr.map((item, i) => ({
    name: String(item?.date ?? item?.month ?? item?.day ?? item?.label ?? `#${i + 1}`),
    present: asNumber(item?.present ?? item?.attendance ?? item?.on_time),
    late: asNumber(item?.late),
    absent: asNumber(item?.absent),
  }))
}

function extractTableRows(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const direct = payload.rows ?? payload.data ?? payload.items ?? payload.list
  if (Array.isArray(direct) && direct.length && typeof direct[0] === 'object') return direct
  const nested = Object.values(payload).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object')
  return Array.isArray(nested) ? nested : []
}

function buildColumns(rows, limit = 6) {
  if (!rows.length) return []
  return Object.keys(rows[0]).slice(0, limit).map((key) => ({ key, label: humanizeKey(key) }))
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function roleNamesFromUser(user) {
  const raw = Array.isArray(user?.roles) ? user.roles : []
  const names = raw
    .map((r) => (typeof r === 'string' ? r : r?.name))
    .filter(Boolean)
    .map((x) => String(x).toLowerCase())
  const primary = String(user?.primary_role ?? user?.role?.name ?? '').toLowerCase()
  return Array.from(new Set([primary, ...names].filter(Boolean)))
}

function resolveDashboardRole(user) {
  const names = roleNamesFromUser(user)
  if (names.some((n) => n.includes('admin'))) return 'admin'
  if (names.some((n) => n.includes('sales_manager'))) return 'sales_manager'
  if (names.some((n) => n.includes('account') || n.includes('finance'))) return 'accountant'
  if (names.some((n) => n.includes('pricing'))) return 'pricing'
  if (names.some((n) => n.includes('operation'))) return 'operations'
  if (names.some((n) => n.includes('support'))) return 'support'
  if (names.some((n) => n.includes('sales'))) return 'sales'
  return 'admin'
}

function dashboardFetcherForRole(roleKey) {
  if (roleKey === 'admin') return getDashboardAdminOverview
  if (roleKey === 'sales_manager') return getDashboardSalesManager
  if (roleKey === 'sales') return getDashboardSalesEmployee
  if (roleKey === 'accountant') return getDashboardAccountant
  if (roleKey === 'pricing') return getDashboardPricingTeam
  if (roleKey === 'operations') return getDashboardOperationsEmployee
  if (roleKey === 'support') return getDashboardSupportEmployee
  return getDashboardAdminOverview
}

function dashboardTitle(roleKey, t) {
  const map = {
    admin: t('dashboardModule.endpoints.dashboardAdminOverview', 'Admin Overview'),
    sales_manager: t('dashboardModule.endpoints.dashboardSalesManager', 'Sales Manager'),
    sales: t('dashboardModule.endpoints.dashboardSalesEmployee', 'Sales Employee'),
    accountant: t('dashboardModule.endpoints.dashboardAccountant', 'Accountant'),
    pricing: t('dashboardModule.endpoints.dashboardPricingTeam', 'Pricing Team'),
    operations: t('dashboardModule.endpoints.dashboardOperationsEmployee', 'Operations Employee'),
    support: t('dashboardModule.endpoints.dashboardSupportEmployee', 'Support Employee'),
  }
  return map[roleKey] || t('dashboardModule.endpoints.dashboardOverview')
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
            path="/admin/notifications"
            element={
              <RequirePageAccess pageKey="users">
                <AdminNotifications />
              </RequirePageAccess>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAdminOnly>
                <Settings />
              </RequireAdminOnly>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAdmin>
                <Reports />
              </RequireAdmin>
            }
          />
          <Route
            path="/official-documents"
            element={
              <RequirePageAccess pageKey="official_documents">
                <Documents />
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
