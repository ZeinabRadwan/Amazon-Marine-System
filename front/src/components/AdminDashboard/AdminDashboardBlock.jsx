import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Banknote,
  TrendingUp,
  Truck,
  Wallet,
  Receipt,
  HandCoins,
  Building2,
  FileText,
  AlarmClock,
  CalendarClock,
  ListTodo,
} from 'lucide-react'
import { StatsCard } from '../StatsCard'
import Table from '../Table/Table'
import { CurrencyMapBadges } from '../../pages/Accountings/CurrencyMapBadges'
import '../../pages/Accountings/CurrencyMapBadges.css'
import './AdminDashboard.css'

function mapFromApi(raw) {
  if (!raw || typeof raw !== 'object') return {}
  if (Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v != null && Number.isFinite(Number(v))),
  )
}

function formatChangePct(pct, t) {
  if (pct == null || !Number.isFinite(Number(pct))) return null
  const n = Number(pct)
  const sign = n > 0 ? '+' : ''
  return {
    change: t('dashboardModule.admin.changeVsPrevMonth', {
      change: `${sign}${n}%`,
      defaultValue: '{{change}} عن الشهر السابق',
    }),
    trend: n >= 0 ? 'up' : 'down',
  }
}

function AdminKpiCard({ title, value, footnote, change, trend, icon, variant = 'blue' }) {
  const pill = footnote ?? change
  return (
    <StatsCard
      className="admin-dashboard-kpi-card"
      title={title}
      value={value}
      change={pill}
      trend={footnote ? undefined : trend}
      icon={icon}
      variant={variant}
    />
  )
}

export default function AdminDashboardBlock({ payload }) {
  const { t } = useTranslation()
  const cards = payload?.kpi_cards || {}
  const bankAccounts = Array.isArray(payload?.bank_accounts) ? payload.bank_accounts : []
  const salesTeam = Array.isArray(payload?.sales_team) ? payload.sales_team : []
  const ops = payload?.operations || {}

  const monthlyRevenue = mapFromApi(cards.monthly_revenue?.by_currency)
  const revenueChange = formatChangePct(cards.monthly_revenue?.change_pct, t)

  const shipmentCosts = mapFromApi(cards.shipment_costs?.by_currency)
  const shipmentCount = Number(cards.shipment_costs?.shipment_count) || 0

  const shipmentProfit = mapFromApi(cards.shipment_net_profit?.by_currency)
  const marginPct = cards.shipment_net_profit?.margin_pct

  const companyProfit = mapFromApi(cards.company_net_profit?.by_currency)
  const customerDebts = mapFromApi(cards.customer_debts?.by_currency)
  const partnerObligations = mapFromApi(cards.partner_obligations?.by_currency)

  const salesColumns = useMemo(
    () => [
      { key: 'employee', label: t('dashboardModule.admin.salesColEmployee', 'الموظف') },
      { key: 'shipments_count', label: t('dashboardModule.admin.salesColShipments', 'شحنات') },
      { key: 'profit_display', label: t('dashboardModule.admin.salesColProfit', 'ربح') },
    ],
    [t],
  )

  const salesRows = useMemo(
    () =>
      salesTeam.map((row) => ({
        ...row,
        profit_display: (
          <CurrencyMapBadges value={mapFromApi(row.profit_by_currency)} size="sm" amountFirst emptyLabel="—" />
        ),
      })),
    [salesTeam],
  )

  const opsItems = [
    {
      key: 'active_shipments',
      label: t('dashboardModule.admin.opsActiveShipments', 'شحنات نشطة'),
      value: ops.active_shipments ?? 0,
      icon: <Truck className="h-6 w-6" />,
      variant: 'blue',
    },
    {
      key: 'sd_forms_awaiting_booking',
      label: t('dashboardModule.admin.opsSdAwaitingBooking', 'SD Forms تنتظر booking'),
      value: ops.sd_forms_awaiting_booking ?? 0,
      icon: <FileText className="h-6 w-6" />,
      variant: 'amber',
    },
    {
      key: 'overdue_tasks',
      label: t('dashboardModule.admin.opsOverdueTasks', 'Tasks متأخرة'),
      value: ops.overdue_tasks ?? 0,
      icon: <AlarmClock className="h-6 w-6" />,
      variant: 'red',
    },
    {
      key: 'near_cutoff_shipments',
      label: t('dashboardModule.admin.opsNearCutoff', 'شحنات قريبة من CUT-OFF'),
      value: ops.near_cutoff_shipments ?? 0,
      icon: <CalendarClock className="h-6 w-6" />,
      variant: 'amber',
    },
    {
      key: 'today_tasks',
      label: t('dashboardModule.admin.opsTodayTasks', 'Tasks اليوم'),
      value: ops.today_tasks ?? 0,
      icon: <ListTodo className="h-6 w-6" />,
      variant: 'green',
    },
  ]

  return (
    <div className="admin-dashboard space-y-6">
      <div className="admin-dashboard-kpi-grid" role="region" aria-label={t('dashboardModule.admin.kpiRegion', 'Financial overview')}>
        <AdminKpiCard
          title={t('dashboardModule.admin.monthlyRevenue', 'إيرادات الشهر')}
          value={<CurrencyMapBadges value={monthlyRevenue} size="sm" amountFirst emptyLabel="—" />}
          change={revenueChange?.change}
          trend={revenueChange?.trend}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="green"
        />
        <AdminKpiCard
          title={t('dashboardModule.admin.shipmentCosts', 'تكاليف الشحنات')}
          value={<CurrencyMapBadges value={shipmentCosts} size="sm" amountFirst emptyLabel="—" />}
          footnote={
            shipmentCount > 0
              ? t('dashboardModule.admin.fromShipments', {
                  count: shipmentCount,
                  defaultValue: 'من {{count}} شحنات',
                })
              : null
          }
          icon={<Receipt className="h-6 w-6" />}
          variant="red"
        />
        <AdminKpiCard
          title={t('dashboardModule.admin.shipmentNetProfit', 'صافي ربح الشحنات')}
          value={<CurrencyMapBadges value={shipmentProfit} size="sm" amountFirst emptyLabel="—" />}
          footnote={
            marginPct != null && Number.isFinite(Number(marginPct))
              ? t('dashboardModule.admin.marginPct', {
                  pct: marginPct,
                  defaultValue: 'هامش {{pct}}%',
                })
              : null
          }
          icon={<Wallet className="h-6 w-6" />}
          variant="blue"
        />
        <AdminKpiCard
          title={t('dashboardModule.admin.companyNetProfit', 'صافي ربح الشركة')}
          value={<CurrencyMapBadges value={companyProfit} size="sm" amountFirst emptyLabel="—" />}
          footnote={t('dashboardModule.admin.afterExpenses', 'بعد المصاريف')}
          icon={<Banknote className="h-6 w-6" />}
          variant="green"
        />
        <AdminKpiCard
          title={t('dashboardModule.admin.customerDebts', 'مديونيات العملاء')}
          value={<CurrencyMapBadges value={customerDebts} size="sm" amountFirst emptyLabel="—" />}
          footnote={t('dashboardModule.admin.uncollected', 'غير محصلة')}
          icon={<HandCoins className="h-6 w-6" />}
          variant="amber"
        />
        <AdminKpiCard
          title={t('dashboardModule.admin.partnerObligations', 'التزامات الشركاء')}
          value={<CurrencyMapBadges value={partnerObligations} size="sm" amountFirst emptyLabel="—" />}
          footnote={t('dashboardModule.admin.unpaid', 'غير مسددة')}
          icon={<Building2 className="h-6 w-6" />}
          variant="red"
        />
      </div>

      {bankAccounts.length > 0 ? (
        <section className="admin-dashboard-section" aria-labelledby="admin-bank-heading">
          <h4 id="admin-bank-heading" className="admin-dashboard-section__title">
            {t('dashboardModule.admin.bankAccounts', 'الحسابات البنكية')}
          </h4>
          <div className="admin-dashboard-banks-grid">
            {bankAccounts.map((acct) => (
              <article key={acct.id} className="admin-dashboard-bank-card">
                <div className="admin-dashboard-bank-card__head">
                  <Building2 className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="admin-dashboard-bank-card__name">{acct.label || acct.account_name || '—'}</p>
                    {acct.account_number ? (
                      <p className="admin-dashboard-bank-card__meta">{acct.account_number}</p>
                    ) : null}
                  </div>
                </div>
                <CurrencyMapBadges
                  value={mapFromApi(acct.balance_by_currency)}
                  size="sm"
                  amountFirst
                  emptyLabel="—"
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="admin-dashboard-section" aria-labelledby="admin-sales-heading">
        <h4 id="admin-sales-heading" className="admin-dashboard-section__title">
          {t('dashboardModule.admin.salesTeam', 'أداء فريق السيلز')}
        </h4>
        <Table
          columns={salesColumns}
          data={salesRows}
          getRowKey={(r) => r.employee_id ?? r.employee}
          emptyMessage={t('dashboardModule.admin.salesEmpty', 'لا يوجد موظفي مبيعات.')}
        />
      </section>

      <section className="admin-dashboard-section" aria-labelledby="admin-ops-heading">
        <h4 id="admin-ops-heading" className="admin-dashboard-section__title">
          {t('dashboardModule.admin.operations', 'العمليات')}
        </h4>
        <div className="admin-dashboard-ops-grid">
          {opsItems.map((item) => (
            <StatsCard
              key={item.key}
              title={item.label}
              value={item.value}
              icon={item.icon}
              variant={item.variant}
              className="admin-dashboard-ops-card"
            />
          ))}
        </div>
      </section>
    </div>
  )
}
