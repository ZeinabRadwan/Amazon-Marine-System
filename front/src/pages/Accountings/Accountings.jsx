import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../Login'
import {
  getAccountingsStats,
  getAccountingsCharts,
  getAccountingsClientAccounts,
  getAccountingsPartnerAccounts,
  exportAccountingsClients,
  exportAccountingsPartners,
} from '../../api/accountings'
import { getTreasuryEntries } from '../../api/treasury'
import { listVendorPartnerTypes } from '../../api/clientLookups'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import { GroupedBarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import { StatsCard } from '../../components/StatsCard'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
  Bell,
  Users,
  Building2,
  Landmark,
  FileSpreadsheet,
  Download,
  ChevronDown,
  Printer,
  X,
  Search,
} from 'lucide-react'
import Tabs from '../../components/Tabs'
import { DropdownMenu } from '../../components/DropdownMenu'
import '../../components/PageHeader/PageHeader.css'
import './Accountings.css'

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

function formatAccountingAmount(amount, currency, locale) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  if (currency == null || currency === '') {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n)
  }
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n} ${currency}`
  }
}

function partnerTypeDisplay(code, types, langKey) {
  if (code == null || code === '') return '—'
  const row = types.find((t) => t.code === code)
  if (!row) return String(code)
  return String(langKey ?? '').toLowerCase().startsWith('ar') ? row.name_ar : row.name_en
}

function aggregateBankByCurrency(entries) {
  const byCurrency = new Map()
  const labelByCurrency = new Map()
  for (const e of entries) {
    const src = e.source || ''
    if (src.startsWith('cash-')) continue
    const cur = e.currency_code || 'USD'
    const amt = Number(e.amount) || 0
    byCurrency.set(cur, (byCurrency.get(cur) || 0) + amt)
    if (!labelByCurrency.has(cur) && src) labelByCurrency.set(cur, src)
  }
  return Array.from(byCurrency.entries()).map(([currency, balance]) => ({
    currency,
    balance,
    sourceLabel: labelByCurrency.get(currency) || '',
  }))
}

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function Accountings() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
  const isAr = locale.startsWith('ar')

  const [chartMonths, setChartMonths] = useState(6)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('clients')

  const [clientSearch, setClientSearch] = useState('')
  const debouncedClientSearch = useDebounced(clientSearch, 400)
  const [clientCurrency, setClientCurrency] = useState('')
  const [clientSort, setClientSort] = useState('balance')
  const [clientRows, setClientRows] = useState([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError] = useState(null)

  const [partnerSearch, setPartnerSearch] = useState('')
  const debouncedPartnerSearch = useDebounced(partnerSearch, 400)
  const [partnerType, setPartnerType] = useState('')
  const [partnerCurrency, setPartnerCurrency] = useState('')
  const [partnerSort, setPartnerSort] = useState('balance')
  const [partnerRows, setPartnerRows] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [partnersError, setPartnersError] = useState(null)
  const [vendorPartnerTypeOptions, setVendorPartnerTypeOptions] = useState([])

  const [treasuryEntries, setTreasuryEntries] = useState([])
  const [treasuryLoading, setTreasuryLoading] = useState(false)

  const [selectedClients, setSelectedClients] = useState(() => new Set())
  const [selectedPartners, setSelectedPartners] = useState(() => new Set())
  const [exportBusy, setExportBusy] = useState(false)

  const [ledgerModal, setLedgerModal] = useState(null)

  const [chartsBootDone, setChartsBootDone] = useState(false)

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getAccountingsStats(token, { months: chartMonths })
      .then((data) => setStats(data.data ?? data.stats ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token, chartMonths])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getAccountingsCharts(token, { months: chartMonths })
      .then((data) => setCharts(data.data ?? data.charts ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token, chartMonths])

  const loadClients = useCallback(() => {
    if (!token) return
    setClientsLoading(true)
    setClientsError(null)
    const sortKey =
      clientSort === 'sales'
        ? 'total_sales'
        : clientSort === 'lastPayment'
          ? 'last_payment_date'
          : clientSort === 'client'
            ? 'client_name'
            : clientSort
    getAccountingsClientAccounts(token, {
      search: debouncedClientSearch || undefined,
      currency: clientCurrency || undefined,
      sort: sortKey || undefined,
    })
      .then((data) => {
        const rows = data.data ?? data ?? []
        setClientRows(Array.isArray(rows) ? rows : [])
      })
      .catch((e) => {
        setClientsError(e?.message || 'Error')
        setClientRows([])
      })
      .finally(() => setClientsLoading(false))
  }, [token, debouncedClientSearch, clientCurrency, clientSort])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const loadPartners = useCallback(() => {
    if (!token) return
    setPartnersLoading(true)
    setPartnersError(null)
    const sortKey =
      partnerSort === 'total'
        ? 'total_due'
        : partnerSort === 'partner'
          ? 'partner_name'
          : partnerSort
    getAccountingsPartnerAccounts(token, {
      search: debouncedPartnerSearch || undefined,
      currency: partnerCurrency || undefined,
      partner_type: partnerType || undefined,
      sort: sortKey || undefined,
    })
      .then((data) => {
        const rows = data.data ?? data ?? []
        setPartnerRows(Array.isArray(rows) ? rows : [])
      })
      .catch((e) => {
        setPartnersError(e?.message || 'Error')
        setPartnerRows([])
      })
      .finally(() => setPartnersLoading(false))
  }, [token, debouncedPartnerSearch, partnerCurrency, partnerType, partnerSort])

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    if (!token) return
    listVendorPartnerTypes(token)
      .then((data) => {
        const list = data.data ?? data ?? []
        setVendorPartnerTypeOptions(Array.isArray(list) ? list : [])
      })
      .catch(() => setVendorPartnerTypeOptions([]))
  }, [token])

  useEffect(() => {
    if (!token) return
    setTreasuryLoading(true)
    getTreasuryEntries(token)
      .then((data) => {
        const rows = data.data ?? data ?? []
        setTreasuryEntries(Array.isArray(rows) ? rows : [])
      })
      .catch(() => setTreasuryEntries([]))
      .finally(() => setTreasuryLoading(false))
  }, [token])

  useEffect(() => {
    if (!statsLoading && !chartsLoading) setChartsBootDone(true)
  }, [statsLoading, chartsLoading])

  const clientCurrencies = useMemo(() => {
    const s = new Set()
    clientRows.forEach((row) => {
      if (row.currency) s.add(row.currency)
    })
    if (stats && Array.isArray(stats.currencies)) {
      stats.currencies.forEach((c) => {
        if (c) s.add(c)
      })
    }
    return Array.from(s).sort()
  }, [clientRows, stats])

  const partnerCurrencies = useMemo(() => {
    const s = new Set()
    partnerRows.forEach((row) => {
      if (row.currency) s.add(row.currency)
    })
    if (charts?.balance_by_currency?.length) {
      charts.balance_by_currency.forEach((item) => {
        if (item?.currency) s.add(item.currency)
      })
    }
    return Array.from(s).sort()
  }, [partnerRows, charts])

  const bankCards = useMemo(() => aggregateBankByCurrency(treasuryEntries), [treasuryEntries])

  const accountingAlerts = useMemo(() => {
    const out = []
    const now = Date.now()
    const clientCandidates = []
    for (const c of clientRows) {
      if (c.balance <= 0 || !c.last_payment_date) continue
      const days = Math.floor((now - new Date(c.last_payment_date).getTime()) / 86400000)
      if (days >= 7) clientCandidates.push(c)
    }
    clientCandidates.sort((a, b) => b.balance - a.balance)
    for (const c of clientCandidates.slice(0, 5)) {
      out.push({ id: `c-${c.client_id}`, kind: 'warning', client: c })
    }
    const partnerCandidates = partnerRows
      .filter((p) => p.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3)
    for (const p of partnerCandidates) {
      out.push({ id: `p-${p.partner_id}`, kind: 'info', partner: p })
    }
    return out.slice(0, 8)
  }, [clientRows, partnerRows])

  const bulkTotal = selectedClients.size + selectedPartners.size

  const toggleClient = (id, checked) => {
    setSelectedClients((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const togglePartner = (id, checked) => {
    setSelectedPartners((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectAllClients = (checked, visibleIds) => {
    if (!checked) {
      setSelectedClients(new Set())
      return
    }
    setSelectedClients(new Set(visibleIds))
  }

  const selectAllPartners = (checked, visibleIds) => {
    if (!checked) {
      setSelectedPartners(new Set())
      return
    }
    setSelectedPartners(new Set(visibleIds))
  }

  const clearBulk = () => {
    setSelectedClients(new Set())
    setSelectedPartners(new Set())
  }

  const handleExportMenu = async (kind) => {
    if (!token) return
    if (kind === 'summary_pdf') {
      window.alert(t('accountings.exportPdfSoon', 'PDF export will be available in a future update.'))
      return
    }
    setExportBusy(true)
    try {
      const day = new Date().toISOString().slice(0, 10)
      if (kind === 'clients') {
        const ids = selectedClients.size ? [...selectedClients] : undefined
        const blob = await exportAccountingsClients(token, ids?.length ? { ids } : {})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accounting-clients-${day}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const ids = selectedPartners.size ? [...selectedPartners] : undefined
        const blob = await exportAccountingsPartners(token, ids?.length ? { ids } : {})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accounting-partners-${day}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      window.alert(e?.message || t('accountings.exportError', 'Export failed.'))
    } finally {
      setExportBusy(false)
    }
  }

  const handleBulkExport = async () => {
    if (!bulkTotal || !token) return
    setExportBusy(true)
    try {
      const day = new Date().toISOString().slice(0, 10)
      if (selectedClients.size) {
        const blob = await exportAccountingsClients(token, { ids: [...selectedClients] })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accounting-clients-selected-${day}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      if (selectedPartners.size) {
        const blob = await exportAccountingsPartners(token, { ids: [...selectedPartners] })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accounting-partners-selected-${day}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      window.alert(e?.message || t('accountings.exportError', 'Export failed.'))
    } finally {
      setExportBusy(false)
    }
  }

  const receivablesPayablesData = useMemo(() => {
    if (!charts?.receivables_payables?.labels?.length) return []
    const { labels, receivables, payables } = charts.receivables_payables
    return labels.map((ym, index) => ({
      label: formatMonthLabel(ym, i18n.language),
      receivables: receivables[index] ?? 0,
      payables: payables[index] ?? 0,
    }))
  }, [charts, i18n.language])

  const statsCardsConfig = useMemo(
    () => [
      {
        key: 'receivables',
        variant: 'green',
        icon: <TrendingUp className="h-6 w-6" />,
        trend: undefined,
        change: t('accountings.stats.receivablesHint', 'Clients'),
      },
      {
        key: 'payables',
        variant: 'red',
        icon: <TrendingDown className="h-6 w-6" />,
        trend: undefined,
        change: t('accountings.stats.payablesHint', 'Partners'),
      },
      {
        key: 'net',
        variant: 'amber',
        icon: <Wallet className="h-6 w-6" />,
        trend: undefined,
        change: undefined,
      },
      {
        key: 'currencies',
        variant: 'default',
        icon: <ArrowLeftRight className="h-6 w-6" />,
        isCurrencies: true,
      },
    ],
    [t],
  )

  const pageBootLoading = !chartsBootDone && (statsLoading || chartsLoading)

  return (
    <Container size="xl">
      <div className="accountings-page">
        {pageBootLoading && (
          <div className="accountings-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        {stats && typeof stats === 'object' && (
          <div className="accountings-stats-grid">
            {statsCardsConfig.map((cfg) => {
              let value
              let change = cfg.change
              if (cfg.isCurrencies) {
                const cur = stats.currencies
                const list = Array.isArray(cur) ? cur : []
                value = list.length
                change =
                  list.length > 0
                    ? list.slice(0, 4).join(' / ')
                    : undefined
              } else {
                const raw = stats[cfg.key]
                value =
                  typeof raw === 'number'
                    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(raw)
                    : String(raw ?? '—')
              }
              const title = t(`accountings.stats.${cfg.key}`, { defaultValue: cfg.key })
              return (
                <StatsCard
                  key={cfg.key}
                  title={title}
                  value={value}
                  icon={cfg.icon}
                  variant={cfg.variant}
                  trend={cfg.trend}
                  change={change}
                />
              )
            })}
          </div>
        )}

        <div className="accountings-chart-card accountings-extra-panel mb-4">
          <div className="accountings-chart-card__header">
            <span className="accountings-chart-card__title">
              {t('accountings.chartsTrendTitle', 'Receivables & payables trend')}
            </span>
            <select
              className="accountings-select accountings-chart-card__months"
              value={chartMonths}
              onChange={(e) => setChartMonths(Number(e.target.value))}
              aria-label={t('accountings.chartPeriod', 'Chart period')}
            >
              <option value={6}>{t('accountings.months6', '6 months')}</option>
              <option value={12}>{t('accountings.months12', '12 months')}</option>
            </select>
          </div>
          <div className="accountings-charts-grid accountings-charts-grid--padded">
            {chartsLoading && (
              <div className="accountings-chart-wrap flex min-h-[200px] items-center justify-center text-sm text-gray-500">
                {t('accountings.loadingCharts', 'Loading charts…')}
              </div>
            )}
            {!chartsLoading &&
              receivablesPayablesData.length > 0 &&
              charts?.balance_by_currency?.length > 0 && (
                <>
                  <div className="accountings-chart-wrap">
                    <p className="accountings-chart-subtitle">
                      {t('accountings.chartsReceivablesPayablesSubtitle', 'Receivables (clients) vs payables (partners)')}
                    </p>
                    <GroupedBarChart
                      data={receivablesPayablesData}
                      xKey="label"
                      series={[
                        {
                          key: 'receivables',
                          color: '#10b981',
                          name: t('accountings.seriesReceivables', 'Receivables'),
                        },
                        {
                          key: 'payables',
                          color: '#ef4444',
                          name: t('accountings.seriesPayables', 'Payables'),
                        },
                      ]}
                      xLabel={t('accountings.chartsMonth', 'Month')}
                      yLabel={t('accountings.chartsAmount', 'Amount')}
                      title=""
                      height={240}
                    />
                  </div>
                  <div className="accountings-chart-wrap">
                    <p className="accountings-chart-subtitle">
                      {t('accountings.chartsBalanceByCurrencySubtitle', 'Net balance by currency')}
                    </p>
                    <DonutChart
                      data={charts.balance_by_currency.map((item) => ({
                        ...item,
                        displayName: item.currency,
                      }))}
                      nameKey="displayName"
                      valueKey="balance"
                      valueLabel={t('accountings.chartsBalance', 'Balance')}
                      title=""
                      height={240}
                    />
                  </div>
                </>
              )}
            {!chartsLoading &&
              !(receivablesPayablesData.length > 0 || charts?.balance_by_currency?.length > 0) &&
              charts && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.chartsNoData', 'No chart data')}</p>
              )}
          </div>
        </div>

        {accountingAlerts.length > 0 && (
          <div className="accountings-notifications card-like mb-4">
            <div className="accountings-notifications__header">
              <span className="accountings-notifications__title">
                <Bell className="inline h-4 w-4 opacity-80" aria-hidden />
                {t('accountings.alertsTitle', 'Accounting alerts')}
              </span>
              <span className="accountings-notifications__count text-sm text-gray-500">
                {t('accountings.alertsCount', { count: accountingAlerts.length })}
              </span>
            </div>
            <ul className="accountings-notif-list">
              {accountingAlerts.map((a) => {
                const isClient = !!a.client
                const row = a.client || a.partner
                const amount = formatAccountingAmount(row.balance, row.currency, locale)
                const variant = a.kind === 'warning' ? 'warning' : a.kind === 'danger' ? 'danger' : 'info'
                return (
                  <li key={a.id} className={`accountings-notif-item accountings-notif-item--${variant}`}>
                    <span className="accountings-notif-item__text">
                      {isClient
                        ? t('accountings.alertClientLine', {
                            name: row.client_name,
                            amount,
                            defaultValue: `Outstanding — ${row.client_name} (${amount})`,
                          })
                        : t('accountings.alertPartnerLine', {
                            name: row.partner_name,
                            amount,
                            defaultValue: `Partner balance — ${row.partner_name} (${amount})`,
                          })}
                    </span>
                    <button
                      type="button"
                      className="accountings-notif-item__link"
                      onClick={() =>
                        setLedgerModal(
                          isClient
                            ? { type: 'client', row }
                            : { type: 'partner', row },
                        )
                      }
                    >
                      {t('accountings.ledger', 'Statement')}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="accountings-tabs-row mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            className="min-w-0 flex-1"
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              {
                id: 'clients',
                label: t('accountings.tabClients', 'Client accounts'),
                icon: <Users className="h-4 w-4" aria-hidden />,
              },
              {
                id: 'partners',
                label: t('accountings.tabPartners', 'Partner accounts'),
                icon: <Building2 className="h-4 w-4" aria-hidden />,
              },
              {
                id: 'bank',
                label: t('accountings.tabBank', 'Bank accounts'),
                icon: <Landmark className="h-4 w-4" aria-hidden />,
              },
            ]}
          />
          <DropdownMenu
            align="end"
            portaled
            trigger={
              <button type="button" className="page-header__btn inline-flex items-center gap-1.5" disabled={exportBusy}>
                <Download className="h-4 w-4" />
                {t('accountings.export', 'Export')}
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
            }
            items={[
              {
                id: 'clients',
                label: t('accountings.exportClientsCsv', 'Export client accounts (CSV)'),
                onClick: () => handleExportMenu('clients'),
              },
              {
                id: 'partners',
                label: t('accountings.exportPartnersCsv', 'Export partner accounts (CSV)'),
                onClick: () => handleExportMenu('partners'),
              },
              {
                id: 'pdf',
                label: t('accountings.exportSummaryPdf', 'Export financial summary (PDF)'),
                onClick: () => handleExportMenu('summary_pdf'),
              },
            ]}
          />
        </div>

        {bulkTotal > 0 && (
          <div className="accountings-bulk-bar mb-4" role="region" aria-label={t('accountings.bulkRegion', 'Bulk actions')}>
            <span className="accountings-bulk-bar__count">
              {t('accountings.bulkSelected', { count: bulkTotal })}
            </span>
            <button type="button" className="accountings-btn accountings-btn--small" disabled={exportBusy} onClick={handleBulkExport}>
              <Download className="inline h-3.5 w-3.5" /> {t('accountings.bulkExport', 'Export selected')}
            </button>
            <button
              type="button"
              className="accountings-btn accountings-btn--small"
              onClick={() =>
                window.alert(t('accountings.bulkReminderSoon', 'Balance reminders will be available in a future update.'))
              }
            >
              {t('accountings.bulkReminder', 'Send balance reminder')}
            </button>
            <button type="button" className="accountings-btn accountings-btn--small" onClick={clearBulk}>
              {t('accountings.bulkClear', 'Clear selection')}
            </button>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="accountings-table-section" role="tabpanel" id="panel-clients">
            <div className="accountings-filters-card">
              <div className="accountings-filters__row accountings-filters__row--main">
                <div className="accountings-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
                  <Search className="accountings-filters__search-icon" aria-hidden />
                  <input
                    type="search"
                    className="accountings-input accountings-filters__search"
                    placeholder={t('accountings.clientSearchPlaceholder', 'Search by client…')}
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="accountings-filters__fields">
                  <select
                    className="accountings-select"
                    value={clientCurrency}
                    onChange={(e) => setClientCurrency(e.target.value)}
                    aria-label={t('accountings.filterCurrency', 'Currency')}
                  >
                    <option value="">{t('accountings.allCurrencies', 'All currencies')}</option>
                    {clientCurrencies.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                  <div className="accountings-filters__sort-group">
                    <span className="accountings-filters__sort-label">
                      {t('accountings.orderBy', 'Order by')}
                    </span>
                    <select
                      className="accountings-select"
                      value={clientSort}
                      onChange={(e) => setClientSort(e.target.value)}
                      aria-label={t('accountings.sortBy', 'Sort by')}
                    >
                      <option value="balance">{t('accountings.sortBalance', 'Outstanding balance')}</option>
                      <option value="sales">{t('accountings.sortSales', 'Total sales')}</option>
                      <option value="lastPayment">{t('accountings.sortLastPayment', 'Last payment')}</option>
                      <option value="client">{t('accountings.sortClientName', 'Client name')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {clientsError && <div className="accountings-error mb-3">{clientsError}</div>}
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        checked={
                          clientRows.length > 0 &&
                          clientRows.every((r) => selectedClients.has(r.client_id))
                        }
                        onChange={(e) => selectAllClients(e.target.checked, clientRows.map((r) => r.client_id))}
                        title={t('accountings.selectAll', 'Select all')}
                      />
                    </th>
                    <th>{t('accountings.colClient', 'Client')}</th>
                    <th>{t('accountings.colTotalSales', 'Total sales')}</th>
                    <th>{t('accountings.colPaid', 'Paid')}</th>
                    <th>{t('accountings.colBalance', 'Balance')}</th>
                    <th>{t('accountings.colCurrency', 'Currency')}</th>
                    <th>{t('accountings.colLastPayment', 'Last payment')}</th>
                    <th>{t('accountings.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientsLoading && (
                    <tr>
                      <td colSpan={8} className="accountings-empty py-8 text-center">
                        {t('accountings.loading', 'Loading…')}
                      </td>
                    </tr>
                  )}
                  {!clientsLoading &&
                    clientRows.map((row) => (
                      <tr key={row.client_id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedClients.has(row.client_id)}
                            onChange={(e) => toggleClient(row.client_id, e.target.checked)}
                          />
                        </td>
                        <td className="font-semibold">{row.client_name}</td>
                        <td>{formatAccountingAmount(row.total_sales, row.currency, locale)}</td>
                        <td className="text-emerald-700 dark:text-emerald-400">
                          {formatAccountingAmount(row.paid, row.currency, locale)}
                        </td>
                        <td
                          className={
                            row.balance > 0
                              ? 'font-bold text-red-700 dark:text-red-400'
                              : 'font-bold text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {formatAccountingAmount(row.balance, row.currency, locale)}
                        </td>
                        <td>{row.currency || '—'}</td>
                        <td className="text-sm text-gray-500">
                          {row.last_payment_date
                            ? new Date(row.last_payment_date).toLocaleDateString(locale)
                            : '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small"
                            onClick={() => setLedgerModal({ type: 'client', row })}
                          >
                            <FileSpreadsheet className="inline h-3.5 w-3.5" /> {t('accountings.ledger', 'Statement')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  {!clientsLoading && clientRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="accountings-empty py-8 text-center">
                        {t('accountings.emptyClients', 'No client accounts found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="accountings-table-section" role="tabpanel" id="panel-partners">
            <div className="accountings-filters-card">
              <div className="accountings-filters__row accountings-filters__row--main">
                <div className="accountings-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
                  <Search className="accountings-filters__search-icon" aria-hidden />
                  <input
                    type="search"
                    className="accountings-input accountings-filters__search"
                    placeholder={t('accountings.partnerSearchPlaceholder', 'Search by partner…')}
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                  />
                </div>
                <div className="accountings-filters__fields">
                  <select
                    className="accountings-select"
                    value={partnerType}
                    onChange={(e) => setPartnerType(e.target.value)}
                    aria-label={t('accountings.filterPartnerType', 'Partner type')}
                  >
                    <option value="">{t('accountings.allPartnerTypes', 'All types')}</option>
                    {vendorPartnerTypeOptions.map((pt) => (
                      <option key={pt.id ?? pt.code} value={pt.code}>
                        {isAr ? pt.name_ar : pt.name_en}
                      </option>
                    ))}
                  </select>
                  <select
                    className="accountings-select"
                    value={partnerCurrency}
                    onChange={(e) => setPartnerCurrency(e.target.value)}
                  >
                    <option value="">{t('accountings.allCurrencies', 'All currencies')}</option>
                    {partnerCurrencies.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                  <div className="accountings-filters__sort-group">
                    <span className="accountings-filters__sort-label">
                      {t('accountings.orderBy', 'Order by')}
                    </span>
                    <select
                      className="accountings-select"
                      value={partnerSort}
                      onChange={(e) => setPartnerSort(e.target.value)}
                    >
                      <option value="balance">{t('accountings.sortBalance', 'Outstanding balance')}</option>
                      <option value="total">{t('accountings.sortTotalDue', 'Total due')}</option>
                      <option value="partner">{t('accountings.sortPartnerName', 'Partner name')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {partnersError && <div className="accountings-error mb-3">{partnersError}</div>}
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        checked={
                          partnerRows.length > 0 &&
                          partnerRows.every((r) => selectedPartners.has(r.partner_id))
                        }
                        onChange={(e) => selectAllPartners(e.target.checked, partnerRows.map((r) => r.partner_id))}
                        title={t('accountings.selectAll', 'Select all')}
                      />
                    </th>
                    <th>{t('accountings.colPartner', 'Partner')}</th>
                    <th>{t('accountings.colType', 'Type')}</th>
                    <th>{t('accountings.colTotalDue', 'Total due')}</th>
                    <th>{t('accountings.colPaid', 'Paid')}</th>
                    <th>{t('accountings.colBalance', 'Balance')}</th>
                    <th>{t('accountings.colCurrency', 'Currency')}</th>
                    <th>{t('accountings.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {partnersLoading && (
                    <tr>
                      <td colSpan={8} className="accountings-empty py-8 text-center">
                        {t('accountings.loading', 'Loading…')}
                      </td>
                    </tr>
                  )}
                  {!partnersLoading &&
                    partnerRows.map((row) => (
                      <tr key={row.partner_id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedPartners.has(row.partner_id)}
                            onChange={(e) => togglePartner(row.partner_id, e.target.checked)}
                          />
                        </td>
                        <td className="font-semibold">{row.partner_name}</td>
                        <td>{partnerTypeDisplay(row.type, vendorPartnerTypeOptions, i18n.language)}</td>
                        <td>{formatAccountingAmount(row.total_due, row.currency, locale)}</td>
                        <td className="text-emerald-700 dark:text-emerald-400">
                          {formatAccountingAmount(row.paid, row.currency, locale)}
                        </td>
                        <td
                          className={
                            row.balance > 0
                              ? 'font-bold text-red-700 dark:text-red-400'
                              : 'font-bold text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {formatAccountingAmount(row.balance, row.currency, locale)}
                        </td>
                        <td>{row.currency || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small"
                            onClick={() => setLedgerModal({ type: 'partner', row })}
                          >
                            <FileSpreadsheet className="inline h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {!partnersLoading && partnerRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="accountings-empty py-8 text-center">
                        {t('accountings.emptyPartners', 'No partner accounts found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="accountings-bank-grid" role="tabpanel" id="panel-bank">
            {treasuryLoading && (
              <div className="accountings-empty py-12 text-center">{t('accountings.loading', 'Loading…')}</div>
            )}
            {!treasuryLoading && bankCards.length === 0 && (
              <div className="accountings-filters-card py-10 text-center text-gray-600">
                {t(
                  'accountings.bankEmpty',
                  'No non-cash treasury balances by currency yet. Record treasury entries to see bank totals here.',
                )}
              </div>
            )}
            {!treasuryLoading &&
              bankCards.map((b) => (
                <div key={b.currency} className="accountings-bank-card">
                  <div className="accountings-bank-card__icon" aria-hidden>
                    <Landmark className="h-8 w-8" />
                  </div>
                  <h3 className="accountings-bank-card__amount">
                    {formatAccountingAmount(b.balance, b.currency, locale)}
                  </h3>
                  <p className="accountings-bank-card__label">
                    {t('accountings.bankAccountCurrency', { currency: b.currency, defaultValue: `${b.currency} account` })}
                  </p>
                  {b.sourceLabel && (
                    <p className="accountings-bank-card__meta text-xs text-gray-500">{b.sourceLabel}</p>
                  )}
                </div>
              ))}
          </div>
        )}

        {ledgerModal && (
          <div className="accountings-modal" role="dialog" aria-modal="true" aria-labelledby="ledger-modal-title">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setLedgerModal(null)} aria-label={t('accountings.close', 'Close')} />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="flex items-start justify-between gap-3">
                <h2 id="ledger-modal-title" className="mb-0">
                  <FileSpreadsheet className="inline h-5 w-5 opacity-80" />{' '}
                  {ledgerModal.type === 'client'
                    ? t('accountings.ledgerModalClient', { name: ledgerModal.row.client_name })
                    : t('accountings.ledgerModalPartner', { name: ledgerModal.row.partner_name })}
                </h2>
                <button type="button" className="accountings-btn accountings-btn--small p-2" onClick={() => setLedgerModal(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="accountings-detail mt-4">
                <div className="accountings-detail-row">
                  <span className="accountings-detail-label">{t('accountings.currentBalance', 'Current balance')}</span>
                  <span className="accountings-detail-value font-bold text-red-700 dark:text-red-400">
                    {formatAccountingAmount(
                      ledgerModal.row.balance,
                      ledgerModal.row.currency,
                      locale,
                    )}
                  </span>
                </div>
                {ledgerModal.type === 'partner' && ledgerModal.row.type && (
                  <div className="accountings-detail-row">
                    <span className="accountings-detail-label">{t('accountings.colType', 'Type')}</span>
                    <span className="accountings-detail-value">{ledgerModal.row.type}</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t(
                    'accountings.ledgerModalHint',
                    'Detailed transaction history can be tracked from invoices and payments. Full ledger export is planned.',
                  )}
                </p>
                <Link to="/invoices" className="accountings-btn accountings-btn--primary inline-block text-center no-underline">
                  {t('accountings.openInvoices', 'Open invoices')}
                </Link>
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" onClick={() => setLedgerModal(null)}>
                  {t('accountings.close', 'Close')}
                </button>
                <button
                  type="button"
                  className="accountings-btn accountings-btn--primary"
                  onClick={() => window.print()}
                >
                  <Printer className="inline h-4 w-4" /> {t('accountings.print', 'Print')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
