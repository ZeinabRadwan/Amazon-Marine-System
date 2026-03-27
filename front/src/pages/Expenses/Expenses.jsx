import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { getStoredToken } from '../Login'
import {
  getExpensesSummary,
  listShipmentExpenses,
  listGeneralExpenses,
  listExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  exportExpensesCsv,
  uploadExpenseReceipt,
} from '../../api/expenses'
import { listShipments } from '../../api/shipments'
import { listVendors } from '../../api/vendors'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import { LineChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import { StatsCard } from '../../components/StatsCard'
import Tabs from '../../components/Tabs'
import {
  Package,
  Building2,
  Download,
  Plus,
  Search,
  Pencil,
  Trash2,
  Paperclip,
  TrendingUp,
} from 'lucide-react'
import '../Accountings/Accountings.css'
import './Expenses.css'


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

function formatAmount(amount, currency, locale) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  const cur = currency || 'USD'
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n} ${cur}`
  }
}

function formatCompactNumber(n, locale) {
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(x)
}

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

const defaultMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Expenses() {
  const { t, i18n } = useTranslation()
  const { user, permissions = [] } = useOutletContext() || {}
  const token = getStoredToken()
  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
  const isAr = locale.startsWith('ar')

  const isAdminRole = (user?.primary_role ?? user?.roles?.[0] ?? '').toString().toLowerCase() === 'admin'
  const canViewAccounting =
    isAdminRole || (Array.isArray(permissions) && permissions.includes('accounting.view'))
  const canManageAccounting =
    isAdminRole || (Array.isArray(permissions) && permissions.includes('accounting.manage'))

  const [chartMonths, setChartMonths] = useState(6)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('shipment')

  const [shipSearch, setShipSearch] = useState('')
  const debouncedShipSearch = useDebounced(shipSearch, 400)
  const [shipBl, setShipBl] = useState('')
  const [shipCategory, setShipCategory] = useState('')
  const [shipCurrency, setShipCurrency] = useState('')
  const [shipMonth, setShipMonth] = useState(defaultMonth)
  const [shipSort, setShipSort] = useState('date')

  const [genSearch, setGenSearch] = useState('')
  const debouncedGenSearch = useDebounced(genSearch, 400)
  const [genCategory, setGenCategory] = useState('')
  const [genCurrency, setGenCurrency] = useState('')
  const [genMonth, setGenMonth] = useState(defaultMonth)
  const [genSort, setGenSort] = useState('date')

  const [shipRows, setShipRows] = useState([])
  const [shipLoading, setShipLoading] = useState(false)
  const [shipError, setShipError] = useState(null)

  const [genRows, setGenRows] = useState([])
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState(null)

  const [categories, setCategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [shipmentOptions, setShipmentOptions] = useState([])
  const [shipmentSearch, setShipmentSearch] = useState('')

  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const receiptInputRef = useRef(null)
  const [receiptExpenseId, setReceiptExpenseId] = useState(null)

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const loadSummary = useCallback(() => {
    if (!token || !canViewAccounting) return
    setSummaryLoading(true)
    getExpensesSummary(token, { months: chartMonths })
      .then((data) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [token, chartMonths, canViewAccounting])

  const loadShip = useCallback(() => {
    if (!token || !canViewAccounting) return
    setShipLoading(true)
    setShipError(null)
    listShipmentExpenses(token, {
      search: debouncedShipSearch || undefined,
      bl: shipBl || undefined,
      category: shipCategory || undefined,
      currency: shipCurrency || undefined,
      month: shipMonth || undefined,
      sort: shipSort || 'date',
    })
      .then((r) => setShipRows(Array.isArray(r.data) ? r.data : []))
      .catch((e) => {
        setShipError(e?.message || 'Error')
        setShipRows([])
      })
      .finally(() => setShipLoading(false))
  }, [token, debouncedShipSearch, shipBl, shipCategory, shipCurrency, shipMonth, shipSort, canViewAccounting])

  const loadGen = useCallback(() => {
    if (!token || !canViewAccounting) return
    setGenLoading(true)
    setGenError(null)
    listGeneralExpenses(token, {
      search: debouncedGenSearch || undefined,
      category: genCategory || undefined,
      currency: genCurrency || undefined,
      month: genMonth || undefined,
      sort: genSort || 'date',
    })
      .then((r) => setGenRows(Array.isArray(r.data) ? r.data : []))
      .catch((e) => {
        setGenError(e?.message || 'Error')
        setGenRows([])
      })
      .finally(() => setGenLoading(false))
  }, [token, debouncedGenSearch, genCategory, genCurrency, genMonth, genSort, canViewAccounting])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadShip()
  }, [loadShip])

  useEffect(() => {
    loadGen()
  }, [loadGen])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listExpenseCategories(token)
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]))
  }, [token, canViewAccounting])

  useEffect(() => {
    if (!token || !canManageAccounting) return
    listVendors(token, { per_page: 200 })
      .then((data) => {
        const rows = data?.data ?? data?.vendors ?? data ?? []
        setVendors(Array.isArray(rows) ? rows : [])
      })
      .catch(() => setVendors([]))
  }, [token, canManageAccounting])

  useEffect(() => {
    if (!token || !modal || modal.mode !== 'create' || modal.tab !== 'shipment') return
    const q = shipmentSearch.trim()
    listShipments(token, { per_page: 50, search: q || undefined, bl_number: q || undefined })
      .then((json) => {
        const rows = json.data ?? []
        setShipmentOptions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => setShipmentOptions([]))
  }, [token, modal, shipmentSearch])

  const cards = summary?.cards ?? {}
  const totalMonth = Number(cards.total_month) || 0
  const shipPct = totalMonth > 0 ? Math.round((Number(cards.shipment_month) / totalMonth) * 100) : 0
  const genPct = totalMonth > 0 ? Math.round((Number(cards.general_month) / totalMonth) * 100) : 0

  const monthlyChartData = useMemo(() => {
    const m = summary?.monthly
    if (!m?.labels?.length) return []
    return m.labels.map((label, i) => ({
      label: formatMonthLabel(label, locale),
      total: Number(m.totals?.[i]) || 0,
    }))
  }, [summary, locale])

  const donutData = useMemo(() => {
    const bc = summary?.by_category
    if (!Array.isArray(bc) || !bc.length) return []
    return bc.map((c) => ({
      name: c.label || '—',
      value: Number(c.total) || 0,
    }))
  }, [summary])

  const openCreate = () => {
    setShipmentSearch('')
    setModal({
      mode: 'create',
      tab: activeTab === 'general' ? 'general' : 'shipment',
      expense_category_id: '',
      description: '',
      amount: '',
      currency_code: 'USD',
      expense_date: todayStr,
      payment_method: '',
      invoice_number: '',
      vendor_id: '',
      shipment_id: '',
    })
  }

  const openEdit = (row, tab) => {
    setModal({
      mode: 'edit',
      tab,
      id: row.id,
      expense_category_id:
        row.expense_category_id != null ? String(row.expense_category_id) : '',
      description: row.description || '',
      amount: String(row.amount ?? ''),
      currency_code: row.currency_code || 'USD',
      expense_date: row.expense_date || todayStr,
      payment_method: row.payment_method || '',
      invoice_number: row.invoice_number || '',
      vendor_id: row.vendor_id != null ? String(row.vendor_id) : '',
      shipment_id: row.shipment_id != null ? String(row.shipment_id) : '',
      bl_number: row.bl_number || '',
    })
  }

  const submitModal = async () => {
    if (!token || !modal) return
    setSaving(true)
    try {
      const amount = Number(modal.amount)
      const catId = Number(modal.expense_category_id)
      if (!catId || !modal.description?.trim() || Number.isNaN(amount) || amount < 0) {
        window.alert(t('expensesPage.validation'))
        return
      }
      if (modal.mode === 'create') {
        const body = {
          type: modal.tab === 'shipment' ? 'shipment' : 'general',
          expense_category_id: catId,
          description: modal.description.trim(),
          amount,
          currency_code: modal.currency_code,
          expense_date: modal.expense_date,
          payment_method: modal.payment_method || undefined,
          invoice_number: modal.invoice_number || undefined,
          vendor_id: modal.vendor_id ? Number(modal.vendor_id) : undefined,
        }
        if (modal.tab === 'shipment') {
          const sid = Number(modal.shipment_id)
          if (!sid) {
            window.alert(t('expensesPage.shipmentRequired'))
            return
          }
          body.shipment_id = sid
        }
        await createExpense(token, body)
      } else {
        const body = {
          expense_category_id: catId,
          description: modal.description.trim(),
          amount,
          currency_code: modal.currency_code,
          expense_date: modal.expense_date,
          payment_method: modal.payment_method || undefined,
          invoice_number: modal.invoice_number || undefined,
          vendor_id: modal.vendor_id ? Number(modal.vendor_id) : undefined,
        }
        if (modal.tab === 'shipment') {
          body.type = 'shipment'
          const sid = Number(modal.shipment_id)
          if (sid) body.shipment_id = sid
        } else {
          body.type = 'general'
        }
        await updateExpense(token, modal.id, body)
      }
      setModal(null)
      loadSummary()
      loadShip()
      loadGen()
    } catch (e) {
      window.alert(e?.message || t('expensesPage.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    if (!token || !canManageAccounting) return
    if (!window.confirm(t('expensesPage.confirmDelete'))) return
    try {
      await deleteExpense(token, row.id)
      loadSummary()
      loadShip()
      loadGen()
    } catch (e) {
      window.alert(e?.message || t('expensesPage.errorDelete'))
    }
  }

  const handleExport = async () => {
    if (!token) return
    setExportBusy(true)
    try {
      const type = activeTab === 'shipment' ? 'shipment' : activeTab === 'general' ? 'general' : 'all'
      const params =
        activeTab === 'shipment'
          ? {
              type,
              search: debouncedShipSearch || undefined,
              month: shipMonth || undefined,
              currency: shipCurrency || undefined,
            }
          : {
              type,
              search: debouncedGenSearch || undefined,
              month: genMonth || undefined,
              currency: genCurrency || undefined,
            }
      const blob = await exportExpensesCsv(token, params)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `expenses-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      window.alert(e?.message || t('expensesPage.exportError'))
    } finally {
      setExportBusy(false)
    }
  }

  const triggerReceipt = (id) => {
    setReceiptExpenseId(id)
    requestAnimationFrame(() => receiptInputRef.current?.click())
  }

  const onReceiptFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !token || !receiptExpenseId) return
    try {
      await uploadExpenseReceipt(token, receiptExpenseId, file)
      loadShip()
      loadGen()
      loadSummary()
    } catch (err) {
      window.alert(err?.message || t('expensesPage.receiptError'))
    } finally {
      setReceiptExpenseId(null)
    }
  }

  if (!canViewAccounting) {
    return (
      <Container size="xl" className="expenses-page">
        <p className="expenses-muted">{t('expensesPage.noPermission')}</p>
      </Container>
    )
  }

  return (
    <Container size="xl" className="expenses-page">
      <input
        ref={receiptInputRef}
        type="file"
        className="expenses-hidden-input"
        accept="image/jpeg,image/png,application/pdf"
        onChange={onReceiptFile}
        aria-hidden
      />

      <p className="expenses-disclaimer">{t('expensesPage.disclaimer')}</p>

      <div className="accountings-stats-grid expenses-stats">
        <StatsCard
          title={t('expensesPage.stats.totalMonth')}
          value={formatCompactNumber(cards.total_month, locale)}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="blue"
        />
        <StatsCard
          title={t('expensesPage.stats.shipmentMonth')}
          value={formatCompactNumber(cards.shipment_month, locale)}
          change={totalMonth > 0 ? `${shipPct}%` : null}
          trend="up"
          icon={<Package className="h-6 w-6" />}
          variant="green"
        />
        <StatsCard
          title={t('expensesPage.stats.generalMonth')}
          value={formatCompactNumber(cards.general_month, locale)}
          change={totalMonth > 0 ? `${genPct}%` : null}
          trend="up"
          icon={<Building2 className="h-6 w-6" />}
          variant="amber"
        />
        <StatsCard
          title={t('expensesPage.stats.netProfit')}
          value={formatCompactNumber(cards.net_profit, locale)}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="green"
        />
      </div>

      <div className="accountings-chart-card accountings-extra-panel mb-4">
        <div className="accountings-chart-card__header">
          <span className="accountings-chart-card__title">{t('expensesPage.chartsTitle')}</span>
          <select
            className="accountings-select accountings-chart-card__months"
            value={chartMonths}
            onChange={(e) => setChartMonths(Number(e.target.value))}
            aria-label={t('expensesPage.chartPeriod')}
          >
            <option value={6}>{t('expensesPage.months6')}</option>
            <option value={12}>{t('expensesPage.months12')}</option>
          </select>
        </div>
        <div className="accountings-charts-grid accountings-charts-grid--padded expenses-charts-grid">
          <div className="accountings-chart-wrap">
            <p className="accountings-chart-subtitle">{t('expensesPage.monthlyTrend')}</p>
            {summaryLoading && !monthlyChartData.length ? (
              <div className="expenses-chart-empty">{t('expensesPage.loadingCharts')}</div>
            ) : monthlyChartData.length ? (
              <LineChart
                data={monthlyChartData}
                xKey="label"
                lines={[{ dataKey: 'total', name: t('expensesPage.seriesTotal'), stroke: '#3b82f6' }]}
                height={240}
                allowDecimals
              />
            ) : (
              <div className="expenses-chart-empty">{t('expensesPage.chartsNoData')}</div>
            )}
          </div>
          <div className="accountings-chart-wrap">
            <p className="accountings-chart-subtitle">{t('expensesPage.byCategory')}</p>
            {summaryLoading && !donutData.length ? (
              <div className="expenses-chart-empty">{t('expensesPage.loadingCharts')}</div>
            ) : donutData.length ? (
              <DonutChart
                data={donutData}
                nameKey="name"
                valueKey="value"
                valueLabel={t('expensesPage.seriesTotal')}
                title=""
                height={260}
              />
            ) : (
              <div className="expenses-chart-empty">{t('expensesPage.chartsNoData')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="accountings-tabs-row mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            {
              id: 'shipment',
              label: t('expensesPage.tabShipment'),
              icon: <Package className="h-4 w-4" />,
            },
            {
              id: 'general',
              label: t('expensesPage.tabGeneral'),
              icon: <Building2 className="h-4 w-4" />,
            },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="accountings-btn accountings-btn--small"
            disabled={exportBusy}
            onClick={handleExport}
          >
            <Download className="inline h-3.5 w-3.5" /> {t('expensesPage.export')}
          </button>
          {canManageAccounting && (
            <button
              type="button"
              className="accountings-btn accountings-btn--small accountings-btn--primary"
              onClick={openCreate}
            >
              <Plus className="inline h-3.5 w-3.5" /> {t('expensesPage.add')}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'shipment' && (
        <div className="accountings-table-section">
          <div className="accountings-filters-card">
            <div className="accountings-filters__row accountings-filters__row--main">
              <div className="accountings-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
                <Search className="accountings-filters__search-icon" aria-hidden />
                <input
                  type="search"
                  className="accountings-input accountings-filters__search"
                  placeholder={t('expensesPage.searchPlaceholder')}
                  value={shipSearch}
                  onChange={(e) => setShipSearch(e.target.value)}
                />
              </div>
              <div className="accountings-filters__fields">
                <input
                  type="text"
                  className="accountings-input"
                  placeholder={t('expensesPage.filterBl')}
                  value={shipBl}
                  onChange={(e) => setShipBl(e.target.value)}
                  aria-label={t('expensesPage.filterBl')}
                />
                <select
                  className="accountings-select"
                  value={shipCategory}
                  onChange={(e) => setShipCategory(e.target.value)}
                >
                  <option value="">{t('expensesPage.allCategories')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="accountings-select"
                  value={shipCurrency}
                  onChange={(e) => setShipCurrency(e.target.value)}
                >
                  <option value="">{t('expensesPage.allCurrencies')}</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="EGP">EGP</option>
                </select>
                <input
                  type="month"
                  className="accountings-input"
                  value={shipMonth}
                  onChange={(e) => setShipMonth(e.target.value)}
                />
                <select
                  className="accountings-select"
                  value={shipSort}
                  onChange={(e) => setShipSort(e.target.value)}
                >
                  <option value="date">{t('expensesPage.sortDate')}</option>
                  <option value="amount">{t('expensesPage.sortAmount')}</option>
                  <option value="category">{t('expensesPage.sortCategory')}</option>
                  <option value="bl">{t('expensesPage.sortBl')}</option>
                </select>
              </div>
            </div>
          </div>
          {shipError && <div className="accountings-error mb-3">{shipError}</div>}
          <div className="accountings-table-wrap">
            <table className="accountings-table">
              <thead>
                <tr>
                  <th>{t('expensesPage.colDate')}</th>
                  <th>{t('expensesPage.colBl')}</th>
                  <th>{t('expensesPage.colCategory')}</th>
                  <th>{t('expensesPage.colDescription')}</th>
                  <th>{t('expensesPage.colAmount')}</th>
                  <th>{t('expensesPage.colVendor')}</th>
                  <th>{t('expensesPage.colReceipt')}</th>
                  {canManageAccounting && <th>{t('expensesPage.colActions')}</th>}
                </tr>
              </thead>
              <tbody>
                {shipLoading && (
                  <tr>
                    <td colSpan={canManageAccounting ? 8 : 7}>
                      <LoaderDots />
                    </td>
                  </tr>
                )}
                {!shipLoading &&
                  shipRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.expense_date}</td>
                      <td>{row.bl_number || '—'}</td>
                      <td>{row.category_name}</td>
                      <td>{row.description}</td>
                      <td>{formatAmount(row.amount, row.currency_code, locale)}</td>
                      <td>{row.vendor_name || '—'}</td>
                      <td>
                        {row.has_receipt ? (
                          <span className="text-emerald-600">{t('expensesPage.hasReceipt')}</span>
                        ) : (
                          <span className="text-gray-500">{t('expensesPage.noReceipt')}</span>
                        )}
                      </td>
                      {canManageAccounting && (
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small mr-1"
                            onClick={() => triggerReceipt(row.id)}
                            title={t('expensesPage.uploadReceipt')}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small mr-1"
                            onClick={() => openEdit(row, 'shipment')}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small accountings-btn--danger"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                {!shipLoading && shipRows.length === 0 && (
                  <tr>
                    <td colSpan={canManageAccounting ? 8 : 7} className="accountings-empty">
                      {t('expensesPage.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="accountings-table-section">
          <div className="accountings-filters-card">
            <div className="accountings-filters__row accountings-filters__row--main">
              <div className="accountings-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
                <Search className="accountings-filters__search-icon" aria-hidden />
                <input
                  type="search"
                  className="accountings-input accountings-filters__search"
                  placeholder={t('expensesPage.searchPlaceholder')}
                  value={genSearch}
                  onChange={(e) => setGenSearch(e.target.value)}
                />
              </div>
              <div className="accountings-filters__fields">
                <select
                  className="accountings-select"
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                >
                  <option value="">{t('expensesPage.allCategories')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="accountings-select"
                  value={genCurrency}
                  onChange={(e) => setGenCurrency(e.target.value)}
                >
                  <option value="">{t('expensesPage.allCurrencies')}</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="EGP">EGP</option>
                </select>
                <input
                  type="month"
                  className="accountings-input"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                />
                <select
                  className="accountings-select"
                  value={genSort}
                  onChange={(e) => setGenSort(e.target.value)}
                >
                  <option value="date">{t('expensesPage.sortDate')}</option>
                  <option value="amount">{t('expensesPage.sortAmount')}</option>
                  <option value="category">{t('expensesPage.sortCategory')}</option>
                </select>
              </div>
            </div>
          </div>
          {genError && <div className="accountings-error mb-3">{genError}</div>}
          <div className="accountings-table-wrap">
            <table className="accountings-table">
              <thead>
                <tr>
                  <th>{t('expensesPage.colDate')}</th>
                  <th>{t('expensesPage.colCategory')}</th>
                  <th>{t('expensesPage.colDescription')}</th>
                  <th>{t('expensesPage.colAmount')}</th>
                  <th>{t('expensesPage.colPayment')}</th>
                  <th>{t('expensesPage.colReceipt')}</th>
                  {canManageAccounting && <th>{t('expensesPage.colActions')}</th>}
                </tr>
              </thead>
              <tbody>
                {genLoading && (
                  <tr>
                    <td colSpan={canManageAccounting ? 7 : 6}>
                      <LoaderDots />
                    </td>
                  </tr>
                )}
                {!genLoading &&
                  genRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.expense_date}</td>
                      <td>{row.category_name}</td>
                      <td>{row.description}</td>
                      <td>{formatAmount(row.amount, row.currency_code, locale)}</td>
                      <td>{row.payment_method || '—'}</td>
                      <td>
                        {row.has_receipt ? (
                          <span className="text-emerald-600">{t('expensesPage.hasReceipt')}</span>
                        ) : (
                          <span className="text-gray-500">{t('expensesPage.noReceipt')}</span>
                        )}
                      </td>
                      {canManageAccounting && (
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small mr-1"
                            onClick={() => triggerReceipt(row.id)}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small mr-1"
                            onClick={() => openEdit(row, 'general')}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small accountings-btn--danger"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                {!genLoading && genRows.length === 0 && (
                  <tr>
                    <td colSpan={canManageAccounting ? 7 : 6} className="accountings-empty">
                      {t('expensesPage.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="accountings-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="accountings-modal-backdrop"
            onClick={() => !saving && setModal(null)}
            aria-label={t('expensesPage.close')}
          />
          <div className="accountings-modal-content accountings-modal-content--wide">
            <h2>
              {modal.mode === 'create'
                ? t('expensesPage.modalCreate')
                : t('expensesPage.modalEdit')}
            </h2>
            {modal.mode === 'create' && (
              <div className="accountings-field accountings-field--full mb-3">
                <label>{t('expensesPage.expenseType')}</label>
                <select
                  className="accountings-input"
                  value={modal.tab}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, tab: e.target.value === 'general' ? 'general' : 'shipment' }))
                  }
                >
                  <option value="shipment">{t('expensesPage.tabShipment')}</option>
                  <option value="general">{t('expensesPage.tabGeneral')}</option>
                </select>
              </div>
            )}
            {modal.mode === 'edit' && modal.tab === 'shipment' && modal.bl_number && (
              <p className="accountings-chart-subtitle mb-3">
                {t('expensesPage.blLabel')}: {modal.bl_number}
              </p>
            )}
            <div className="accountings-form">
              <div className="accountings-form-scroll">
                <div className="accountings-form-grid">
                  {modal.mode === 'create' && modal.tab === 'shipment' && (
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.shipment')}</label>
                      <input
                        type="search"
                        className="accountings-input mb-2"
                        placeholder={t('expensesPage.shipmentSearch')}
                        value={shipmentSearch}
                        onChange={(e) => setShipmentSearch(e.target.value)}
                      />
                      <select
                        className="accountings-input"
                        value={modal.shipment_id}
                        onChange={(e) => setModal((m) => ({ ...m, shipment_id: e.target.value }))}
                      >
                        <option value="">{t('expensesPage.selectShipment')}</option>
                        {shipmentOptions.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {(s.bl_number || s.id) + (s.reference ? ` — ${s.reference}` : '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="accountings-field accountings-field--full">
                    <label>{t('expensesPage.category')}</label>
                    <select
                      className="accountings-input"
                      value={modal.expense_category_id}
                      onChange={(e) => setModal((m) => ({ ...m, expense_category_id: e.target.value }))}
                    >
                      <option value="">{t('expensesPage.selectCategory')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {modal.tab === 'shipment' && (
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.vendorOptional')}</label>
                      <select
                        className="accountings-input"
                        value={modal.vendor_id}
                        onChange={(e) => setModal((m) => ({ ...m, vendor_id: e.target.value }))}
                      >
                        <option value="">{t('expensesPage.noVendor')}</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="accountings-field accountings-field--full">
                    <label>{t('expensesPage.description')}</label>
                    <input
                      type="text"
                      className="accountings-input"
                      value={modal.description}
                      onChange={(e) => setModal((m) => ({ ...m, description: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field">
                    <label>{t('expensesPage.amount')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="accountings-input"
                      value={modal.amount}
                      onChange={(e) => setModal((m) => ({ ...m, amount: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field">
                    <label>{t('expensesPage.currency')}</label>
                    <select
                      className="accountings-input"
                      value={modal.currency_code}
                      onChange={(e) => setModal((m) => ({ ...m, currency_code: e.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="EGP">EGP</option>
                    </select>
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('expensesPage.expenseDate')}</label>
                    <input
                      type="date"
                      className="accountings-input"
                      value={modal.expense_date}
                      onChange={(e) => setModal((m) => ({ ...m, expense_date: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('expensesPage.paymentMethod')}</label>
                    <input
                      type="text"
                      className="accountings-input"
                      value={modal.payment_method}
                      onChange={(e) => setModal((m) => ({ ...m, payment_method: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('expensesPage.invoiceNumber')}</label>
                    <input
                      type="text"
                      className="accountings-input"
                      value={modal.invoice_number}
                      onChange={(e) => setModal((m) => ({ ...m, invoice_number: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" disabled={saving} onClick={() => setModal(null)}>
                  {t('expensesPage.cancel')}
                </button>
                <button
                  type="button"
                  className="accountings-btn accountings-btn--primary"
                  disabled={saving}
                  onClick={submitModal}
                >
                  {saving ? t('expensesPage.saving') : t('expensesPage.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
