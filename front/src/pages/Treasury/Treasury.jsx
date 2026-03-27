import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { getStoredToken } from '../Login'
import {
  getTreasurySummary,
  getTreasuryEntries,
  createTreasuryEntry,
  updateTreasuryEntry,
  deleteTreasuryEntry,
  createTreasuryTransfer,
  getTreasuryExpenses,
  createTreasuryExpense,
} from '../../api/treasury'
import { listExpenseCategories } from '../../api/expenses'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import { GroupedBarChart, LineChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import { StatsCard } from '../../components/StatsCard'
import {
  Wallet,
  Landmark,
  Receipt,
  Download,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react'
import '../Accountings/Accountings.css'
import './Treasury.css'

const SOURCE_GROUPS = [
  {
    labelKey: 'treasury.sourceGroup.cash',
    options: [
      { value: 'cash-egp', labelKey: 'treasury.source.cashEgp' },
      { value: 'cash-usd', labelKey: 'treasury.source.cashUsd' },
      { value: 'cash-eur', labelKey: 'treasury.source.cashEur' },
    ],
  },
  {
    labelKey: 'treasury.sourceGroup.bank',
    options: [
      { value: 'bank-cib-egp', labelKey: 'treasury.source.bankCibEgp' },
      { value: 'bank-cib-usd', labelKey: 'treasury.source.bankCibUsd' },
      { value: 'bank-qnb-egp', labelKey: 'treasury.source.bankQnbEgp' },
      { value: 'bank-nbe-egp', labelKey: 'treasury.source.bankNbeEgp' },
      { value: 'bank-nbe-usd', labelKey: 'treasury.source.bankNbeUsd' },
    ],
  },
]

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

function computeRunningBalances(rows) {
  const byCurrency = new Map()
  for (const r of rows) {
    const cur = r.currency_code || 'USD'
    if (!byCurrency.has(cur)) byCurrency.set(cur, [])
    byCurrency.get(cur).push(r)
  }
  const balanceById = new Map()
  for (const [, list] of byCurrency) {
    const sorted = [...list].sort((a, b) => {
      const da = a.entry_date || ''
      const db = b.entry_date || ''
      if (da !== db) return da.localeCompare(db)
      return (a.id ?? 0) - (b.id ?? 0)
    })
    let run = 0
    for (const r of sorted) {
      run += Number(r.amount) || 0
      balanceById.set(r.id, { running: run, currency: r.currency_code || 'USD' })
    }
  }
  return balanceById
}

function escapeCsvCell(s) {
  const t = String(s ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function Treasury() {
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

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 400)
  const [typeFilter, setTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortKey, setSortKey] = useState('date')

  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState(null)

  const [expenseRows, setExpenseRows] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  const [categories, setCategories] = useState([])

  const [txModal, setTxModal] = useState(null)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [reconStatement, setReconStatement] = useState('')
  const [reconLedger, setReconLedger] = useState('')
  const [reconChecks, setReconChecks] = useState(() => ({}))

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [expenseForm, setExpenseForm] = useState({
    expense_category_id: '',
    description: '',
    amount: '',
    currency_code: 'USD',
    expense_date: '',
  })

  const loadSummary = useCallback(() => {
    if (!token || !canViewAccounting) return
    setSummaryLoading(true)
    getTreasurySummary(token, { months: chartMonths })
      .then((data) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [token, chartMonths, canViewAccounting])

  const loadEntries = useCallback(() => {
    if (!token || !canViewAccounting) return
    setEntriesLoading(true)
    setEntriesError(null)
    getTreasuryEntries(token, {
      search: debouncedSearch || undefined,
      type: typeFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      sort: sortKey || 'date',
    })
      .then((res) => setEntries(Array.isArray(res.data) ? res.data : []))
      .catch((e) => {
        setEntriesError(e?.message || 'Error')
        setEntries([])
      })
      .finally(() => setEntriesLoading(false))
  }, [token, debouncedSearch, typeFilter, fromDate, toDate, sortKey, canViewAccounting])

  const loadExpenses = useCallback(() => {
    if (!token || !canViewAccounting) return
    setExpensesLoading(true)
    getTreasuryExpenses(token, {
      category_id: expenseCategoryId || undefined,
    })
      .then((res) => setExpenseRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExpenseRows([]))
      .finally(() => setExpensesLoading(false))
  }, [token, expenseCategoryId, canViewAccounting])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listExpenseCategories(token)
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]))
  }, [token, canViewAccounting])

  const runningById = useMemo(() => computeRunningBalances(entries), [entries])

  const cashFlowChartData = useMemo(() => {
    const cf = summary?.cash_flow
    if (!cf?.labels?.length) return []
    return cf.labels.map((label, i) => ({
      label: formatMonthLabel(label, locale),
      in: Number(cf.inbound?.[i]) || 0,
      out: Number(cf.outbound?.[i]) || 0,
    }))
  }, [summary, locale])

  const balanceChartData = useMemo(() => {
    const b = summary?.balance
    if (!b?.labels?.length) return []
    return b.labels.map((label, i) => ({
      label: formatMonthLabel(label, locale),
      balance: Number(b.balance?.[i]) || 0,
    }))
  }, [summary, locale])

  const totals = summary?.totals ?? {}

  const exportEntriesCsv = () => {
    const headers = [
      t('treasury.colDate'),
      t('treasury.colDescription'),
      t('treasury.colType'),
      t('treasury.colAmount'),
      t('treasury.colCurrency'),
      t('treasury.colSource'),
      t('treasury.colRunning'),
    ]
    const lines = [headers.map(escapeCsvCell).join(',')]
    for (const row of entries) {
      const rb = runningById.get(row.id)
      lines.push(
        [
          row.entry_date,
          row.description,
          row.entry_type === 'in' ? t('treasury.typeIn') : t('treasury.typeOut'),
          row.amount,
          row.currency_code,
          row.source,
          rb != null ? rb.running : '',
        ]
          .map(escapeCsvCell)
          .join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `treasury-movements-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportExpensesCsv = () => {
    const headers = [
      t('treasury.colDate'),
      t('treasury.colDescription'),
      t('treasury.expenseCategory'),
      t('treasury.colAmount'),
      t('treasury.colCurrency'),
    ]
    const lines = [headers.map(escapeCsvCell).join(',')]
    for (const row of expenseRows) {
      lines.push(
        [row.expense_date, row.description, row.category_name, row.amount, row.currency_code]
          .map(escapeCsvCell)
          .join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `treasury-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const openAddEntry = () => {
    setTxModal({
      kind: 'entry',
      mode: 'create',
      entry_type: 'in',
      source: '',
      amount: '',
      currency_code: 'USD',
      entry_date: todayStr,
      description: '',
      notes: '',
    })
  }

  const openEditEntry = (row) => {
    const abs = Math.abs(Number(row.amount) || 0)
    setTxModal({
      kind: 'entry',
      mode: 'edit',
      id: row.id,
      entry_type: row.entry_type === 'out' ? 'out' : 'in',
      source: row.source || '',
      amount: String(abs),
      currency_code: row.currency_code || 'USD',
      entry_date: row.entry_date || todayStr,
      description: row.description || '',
      notes: '',
    })
  }

  const openTransfer = () => {
    setTxModal({
      kind: 'transfer',
      from_account: '',
      to_account: '',
      from_amount: '',
      from_currency: 'USD',
      to_amount: '',
      to_currency: '',
      entry_date: todayStr,
      description: '',
    })
  }

  const submitEntry = async () => {
    if (!token || !txModal || txModal.kind !== 'entry') return
    setSaving(true)
    try {
      const amount = Number(txModal.amount)
      if (!txModal.source || Number.isNaN(amount) || amount < 0) {
        window.alert(t('treasury.validationEntry'))
        return
      }
      const body = {
        entry_type: txModal.entry_type,
        source: txModal.source,
        amount,
        currency_code: txModal.currency_code,
        entry_date: txModal.entry_date,
        description: txModal.description || undefined,
        notes: txModal.notes || undefined,
      }
      if (txModal.mode === 'create') {
        await createTreasuryEntry(token, body)
      } else {
        await updateTreasuryEntry(token, txModal.id, body)
      }
      setTxModal(null)
      loadEntries()
      loadSummary()
    } catch (e) {
      window.alert(e?.message || t('treasury.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const submitTransfer = async () => {
    if (!token || !txModal || txModal.kind !== 'transfer') return
    setSaving(true)
    try {
      const from_amount = Number(txModal.from_amount)
      if (
        !txModal.from_account ||
        !txModal.to_account ||
        Number.isNaN(from_amount) ||
        from_amount < 0 ||
        txModal.from_account === txModal.to_account
      ) {
        window.alert(t('treasury.validationTransfer'))
        return
      }
      const body = {
        from_account: txModal.from_account,
        to_account: txModal.to_account,
        from_amount,
        from_currency: txModal.from_currency,
        to_amount: txModal.to_amount ? Number(txModal.to_amount) : undefined,
        to_currency: txModal.to_currency || undefined,
        entry_date: txModal.entry_date,
        description: txModal.description || undefined,
      }
      await createTreasuryTransfer(token, body)
      setTxModal(null)
      loadEntries()
      loadSummary()
    } catch (e) {
      window.alert(e?.message || t('treasury.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (row) => {
    if (!token || !canManageAccounting) return
    if (!window.confirm(t('treasury.confirmDelete'))) return
    try {
      await deleteTreasuryEntry(token, row.id)
      loadEntries()
      loadSummary()
    } catch (e) {
      window.alert(e?.message || t('treasury.errorDelete'))
    }
  }

  const submitExpense = async () => {
    if (!token) return
    setSaving(true)
    try {
      const amount = Number(expenseForm.amount)
      const catId = Number(expenseForm.expense_category_id)
      if (!catId || !expenseForm.description?.trim() || Number.isNaN(amount) || amount < 0) {
        window.alert(t('treasury.validationExpense'))
        return
      }
      await createTreasuryExpense(token, {
        expense_category_id: catId,
        description: expenseForm.description.trim(),
        amount,
        currency_code: expenseForm.currency_code,
        expense_date: expenseForm.expense_date,
      })
      setExpenseModalOpen(false)
      setExpenseForm({
        expense_category_id: '',
        description: '',
        amount: '',
        currency_code: 'USD',
        expense_date: todayStr,
      })
      loadExpenses()
      loadSummary()
    } catch (e) {
      window.alert(e?.message || t('treasury.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const reconDiff = useMemo(() => {
    const a = Number(reconStatement)
    const b = Number(reconLedger)
    if (Number.isNaN(a) || Number.isNaN(b)) return null
    return a - b
  }, [reconStatement, reconLedger])

  const bankLedgerHint = useMemo(() => {
    let sum = 0
    for (const e of entries) {
      const src = e.source || ''
      if (src.startsWith('cash-')) continue
      sum += Number(e.amount) || 0
    }
    return sum
  }, [entries])

  if (!canViewAccounting) {
    return (
      <Container size="xl" className="treasury-page">
        <p className="treasury-muted">{t('treasury.noPermission')}</p>
      </Container>
    )
  }

  return (
    <Container size="xl" className="treasury-page">
      {summaryLoading && !summary && (
        <div className="accountings-page-loader" aria-live="polite" aria-busy="true">
          <LoaderDots />
        </div>
      )}

      <p className="treasury-disclaimer">{t('treasury.totalsDisclaimer')}</p>

      <div className="accountings-stats-grid treasury-stats">
        <StatsCard
          title={t('treasury.stats.cash')}
          value={formatCompactNumber(totals.cash_balance, locale)}
          icon={<Wallet className="h-6 w-6" />}
          variant="green"
        />
        <StatsCard
          title={t('treasury.stats.bank')}
          value={formatCompactNumber(totals.bank_balance, locale)}
          icon={<Landmark className="h-6 w-6" />}
          variant="blue"
        />
        <StatsCard
          title={t('treasury.stats.monthlyExpenses')}
          value={formatCompactNumber(totals.monthly_expenses, locale)}
          icon={<Receipt className="h-6 w-6" />}
          variant="amber"
        />
      </div>

      <div className="accountings-chart-card accountings-extra-panel mb-4">
        <div className="accountings-chart-card__header">
          <span className="accountings-chart-card__title">{t('treasury.cashFlowTitle')}</span>
          <select
            className="accountings-select accountings-chart-card__months"
            value={chartMonths}
            onChange={(e) => setChartMonths(Number(e.target.value))}
            aria-label={t('treasury.chartPeriod')}
          >
            <option value={6}>{t('treasury.months6')}</option>
            <option value={12}>{t('treasury.months12')}</option>
          </select>
        </div>
        <div className="accountings-charts-grid accountings-charts-grid--padded treasury-charts-grid">
          <div className="accountings-chart-wrap">
            <p className="accountings-chart-subtitle">{t('treasury.cashFlowInboundOutbound')}</p>
            {summaryLoading && !cashFlowChartData.length ? (
              <div className="treasury-chart-empty">{t('treasury.loadingCharts')}</div>
            ) : cashFlowChartData.length ? (
              <GroupedBarChart
                data={cashFlowChartData}
                xKey="label"
                series={[
                  { key: 'in', color: '#10b981', name: t('treasury.seriesInbound') },
                  { key: 'out', color: '#ef4444', name: t('treasury.seriesOutbound') },
                ]}
                title=""
                height={240}
              />
            ) : (
              <div className="treasury-chart-empty">{t('treasury.chartsNoData')}</div>
            )}
          </div>
          <div className="accountings-chart-wrap">
            <p className="accountings-chart-subtitle">{t('treasury.balanceEndOfMonth')}</p>
            {summaryLoading && !balanceChartData.length ? (
              <div className="treasury-chart-empty">{t('treasury.loadingCharts')}</div>
            ) : balanceChartData.length ? (
              <LineChart
                data={balanceChartData}
                xKey="label"
                lines={[{ dataKey: 'balance', name: t('treasury.seriesBalance'), stroke: '#3b82f6' }]}
                height={240}
                allowDecimals
              />
            ) : (
              <div className="treasury-chart-empty">{t('treasury.chartsNoData')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="accountings-table-section">
        <div className="accountings-filters-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="treasury-section-title m-0 text-lg font-semibold">{t('treasury.movementsTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="accountings-btn accountings-btn--small"
                onClick={exportEntriesCsv}
                disabled={!entries.length}
              >
                <Download className="inline h-3.5 w-3.5" /> {t('treasury.export')}
              </button>
              {canManageAccounting && (
                <>
                  <button type="button" className="accountings-btn accountings-btn--small accountings-btn--primary" onClick={openAddEntry}>
                    <Plus className="inline h-3.5 w-3.5" /> {t('treasury.addMovement')}
                  </button>
                  <button type="button" className="accountings-btn accountings-btn--small" onClick={openTransfer}>
                    <ArrowLeftRight className="inline h-3.5 w-3.5" /> {t('treasury.transfer')}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="accountings-filters__row accountings-filters__row--main">
            <div className="accountings-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
              <Search className="accountings-filters__search-icon" aria-hidden />
              <input
                type="search"
                className="accountings-input accountings-filters__search"
                placeholder={t('treasury.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="accountings-filters__fields">
              <select
                className="accountings-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label={t('treasury.filterType')}
              >
                <option value="">{t('treasury.allTypes')}</option>
                <option value="in">{t('treasury.typeIn')}</option>
                <option value="out">{t('treasury.typeOut')}</option>
              </select>
              <input
                type="date"
                className="accountings-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label={t('treasury.dateFrom')}
              />
              <input
                type="date"
                className="accountings-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label={t('treasury.dateTo')}
              />
              <select
                className="accountings-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                aria-label={t('treasury.sortBy')}
              >
                <option value="date">{t('treasury.sortDate')}</option>
                <option value="amount">{t('treasury.sortAmount')}</option>
              </select>
            </div>
          </div>
        </div>

        {entriesError && <div className="accountings-error mb-3">{entriesError}</div>}

        <div className="accountings-table-wrap">
          <table className="accountings-table">
            <thead>
              <tr>
                <th>{t('treasury.colDate')}</th>
                <th>{t('treasury.colDescription')}</th>
                <th>{t('treasury.colType')}</th>
                <th>{t('treasury.colAmount')}</th>
                <th>{t('treasury.colCurrency')}</th>
                <th>{t('treasury.colRunning')}</th>
                {canManageAccounting && <th>{t('treasury.colActions')}</th>}
              </tr>
            </thead>
            <tbody>
              {entriesLoading && (
                <tr>
                  <td colSpan={canManageAccounting ? 7 : 6}>
                    <LoaderDots />
                  </td>
                </tr>
              )}
              {!entriesLoading &&
                entries.map((row) => {
                  const rb = runningById.get(row.id)
                  const runDisplay =
                    rb != null ? formatAmount(rb.running, rb.currency, locale) : '—'
                  return (
                    <tr key={row.id}>
                      <td>{row.entry_date}</td>
                      <td>{row.description || '—'}</td>
                      <td>
                        <span
                          className={`accountings-status-badge ${
                            row.entry_type === 'in' ? 'accountings-status-badge--active' : 'accountings-status-badge--pending'
                          }`}
                        >
                          {row.entry_type === 'in' ? t('treasury.typeIn') : t('treasury.typeOut')}
                        </span>
                      </td>
                      <td className={Number(row.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {formatAmount(row.amount, row.currency_code, locale)}
                      </td>
                      <td>{row.currency_code}</td>
                      <td>{runDisplay}</td>
                      {canManageAccounting && (
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small mr-1"
                            onClick={() => openEditEntry(row)}
                            aria-label={t('treasury.edit')}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small accountings-btn--danger"
                            onClick={() => handleDeleteEntry(row)}
                            aria-label={t('treasury.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              {!entriesLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={canManageAccounting ? 7 : 6} className="accountings-empty">
                    {t('treasury.emptyMovements')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="treasury-recon card-like mb-4">
        <h3 className="treasury-section-title">{t('treasury.reconTitle')}</h3>
        <p className="treasury-muted treasury-recon-note">{t('treasury.reconNote')}</p>
        <div className="treasury-recon-grid">
          <div className="accountings-field">
            <label htmlFor="recon-statement">{t('treasury.reconStatement')}</label>
            <input
              id="recon-statement"
              type="number"
              className="accountings-input"
              value={reconStatement}
              onChange={(e) => setReconStatement(e.target.value)}
            />
          </div>
          <div className="accountings-field">
            <label htmlFor="recon-ledger">{t('treasury.reconLedger')}</label>
            <input
              id="recon-ledger"
              type="number"
              className="accountings-input"
              value={reconLedger}
              onChange={(e) => setReconLedger(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="accountings-btn accountings-btn--small mb-3"
          onClick={() => setReconLedger(String(bankLedgerHint))}
        >
          {t('treasury.reconFillFromEntries')}
        </button>
        <p className="treasury-recon-diff">
          {t('treasury.reconDiff')}:{' '}
          {reconDiff != null && !Number.isNaN(reconDiff) ? formatCompactNumber(reconDiff, locale) : '—'}
        </p>
        <div className="accountings-table-wrap">
          <table className="accountings-table">
            <thead>
              <tr>
                <th className="w-10">{t('treasury.reconMatched')}</th>
                <th>{t('treasury.colDate')}</th>
                <th>{t('treasury.colDescription')}</th>
                <th>{t('treasury.colAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 12).map((row) => (
                <tr key={`recon-${row.id}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!reconChecks[row.id]}
                      onChange={(e) =>
                        setReconChecks((prev) => ({ ...prev, [row.id]: e.target.checked }))
                      }
                      aria-label={t('treasury.reconMatched')}
                    />
                  </td>
                  <td>{row.entry_date}</td>
                  <td>{row.description || '—'}</td>
                  <td>{formatAmount(row.amount, row.currency_code, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="accountings-table-section">
        <div className="accountings-filters-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="treasury-section-title m-0 text-lg font-semibold">{t('treasury.expensesTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="accountings-btn accountings-btn--small"
                onClick={exportExpensesCsv}
                disabled={!expenseRows.length}
              >
                <Download className="inline h-3.5 w-3.5" /> {t('treasury.export')}
              </button>
              {canManageAccounting && (
                <button
                  type="button"
                  className="accountings-btn accountings-btn--small accountings-btn--primary"
                  onClick={() => {
                    setExpenseForm((f) => ({ ...f, expense_date: todayStr }))
                    setExpenseModalOpen(true)
                  }}
                >
                  <Plus className="inline h-3.5 w-3.5" /> {t('treasury.addExpense')}
                </button>
              )}
            </div>
          </div>
          <div className="accountings-filters__row">
            <select
              className="accountings-select"
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              aria-label={t('treasury.expenseCategory')}
            >
              <option value="">{t('treasury.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name ?? c.code ?? c.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="accountings-table-wrap">
          <table className="accountings-table">
            <thead>
              <tr>
                <th>{t('treasury.colDate')}</th>
                <th>{t('treasury.colDescription')}</th>
                <th>{t('treasury.expenseCategory')}</th>
                <th>{t('treasury.colAmount')}</th>
                <th>{t('treasury.colCurrency')}</th>
              </tr>
            </thead>
            <tbody>
              {expensesLoading && (
                <tr>
                  <td colSpan={5}>
                    <LoaderDots />
                  </td>
                </tr>
              )}
              {!expensesLoading &&
                expenseRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.expense_date}</td>
                    <td>{row.description}</td>
                    <td>{row.category_name}</td>
                    <td>{formatAmount(row.amount, row.currency_code, locale)}</td>
                    <td>{row.currency_code}</td>
                  </tr>
                ))}
              {!expensesLoading && expenseRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="accountings-empty">
                    {t('treasury.emptyExpenses')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {txModal?.kind === 'entry' && (
        <div className="accountings-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="accountings-modal-backdrop"
            onClick={() => !saving && setTxModal(null)}
            aria-label={t('treasury.close')}
          />
          <div className="accountings-modal-content accountings-modal-content--wide">
            <h2>{txModal.mode === 'create' ? t('treasury.modalAddEntry') : t('treasury.modalEditEntry')}</h2>
            <div className="accountings-form">
              <div className="accountings-form-scroll">
                <div className="accountings-field">
                  <label>{t('treasury.entryType')}</label>
                  <select
                    className="accountings-input"
                    value={txModal.entry_type}
                    onChange={(e) => setTxModal((m) => ({ ...m, entry_type: e.target.value }))}
                  >
                    <option value="in">{t('treasury.typeIn')}</option>
                    <option value="out">{t('treasury.typeOut')}</option>
                  </select>
                </div>
                <div className="accountings-field">
                  <label>{t('treasury.accountSource')}</label>
                  <select
                    className="accountings-input"
                    value={txModal.source}
                    onChange={(e) => setTxModal((m) => ({ ...m, source: e.target.value }))}
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {SOURCE_GROUPS.map((g) => (
                      <optgroup key={g.labelKey} label={t(g.labelKey)}>
                        {g.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="accountings-form-grid">
                  <div className="accountings-field">
                    <label>{t('treasury.amount')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="accountings-input"
                      value={txModal.amount}
                      onChange={(e) => setTxModal((m) => ({ ...m, amount: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field">
                    <label>{t('treasury.currency')}</label>
                    <select
                      className="accountings-input"
                      value={txModal.currency_code}
                      onChange={(e) => setTxModal((m) => ({ ...m, currency_code: e.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="EGP">EGP</option>
                    </select>
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('treasury.entryDate')}</label>
                    <input
                      type="date"
                      className="accountings-input"
                      value={txModal.entry_date}
                      onChange={(e) => setTxModal((m) => ({ ...m, entry_date: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('treasury.description')}</label>
                    <input
                      type="text"
                      className="accountings-input"
                      value={txModal.description}
                      onChange={(e) => setTxModal((m) => ({ ...m, description: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('treasury.notes')}</label>
                    <textarea
                      className="accountings-input"
                      rows={2}
                      value={txModal.notes}
                      onChange={(e) => setTxModal((m) => ({ ...m, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" disabled={saving} onClick={() => setTxModal(null)}>
                  {t('treasury.cancel')}
                </button>
                <button
                  type="button"
                  className="accountings-btn accountings-btn--primary"
                  disabled={saving}
                  onClick={submitEntry}
                >
                  {saving ? t('treasury.saving') : t('treasury.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {txModal?.kind === 'transfer' && (
        <div className="accountings-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="accountings-modal-backdrop"
            onClick={() => !saving && setTxModal(null)}
            aria-label={t('treasury.close')}
          />
          <div className="accountings-modal-content accountings-modal-content--wide">
            <h2>{t('treasury.modalTransfer')}</h2>
            <div className="accountings-form">
              <div className="accountings-form-scroll">
                <div className="accountings-field">
                  <label>{t('treasury.fromAccount')}</label>
                  <select
                    className="accountings-input"
                    value={txModal.from_account}
                    onChange={(e) => setTxModal((m) => ({ ...m, from_account: e.target.value }))}
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {SOURCE_GROUPS.map((g) => (
                      <optgroup key={`f-${g.labelKey}`} label={t(g.labelKey)}>
                        {g.options.map((o) => (
                          <option key={`f-${o.value}`} value={o.value}>
                            {t(o.labelKey)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="accountings-field">
                  <label>{t('treasury.toAccount')}</label>
                  <select
                    className="accountings-input"
                    value={txModal.to_account}
                    onChange={(e) => setTxModal((m) => ({ ...m, to_account: e.target.value }))}
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {SOURCE_GROUPS.map((g) => (
                      <optgroup key={`t-${g.labelKey}`} label={t(g.labelKey)}>
                        {g.options.map((o) => (
                          <option key={`t-${o.value}`} value={o.value}>
                            {t(o.labelKey)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="accountings-form-grid">
                  <div className="accountings-field">
                    <label>{t('treasury.fromAmount')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="accountings-input"
                      value={txModal.from_amount}
                      onChange={(e) => setTxModal((m) => ({ ...m, from_amount: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field">
                    <label>{t('treasury.fromCurrency')}</label>
                    <select
                      className="accountings-input"
                      value={txModal.from_currency}
                      onChange={(e) => setTxModal((m) => ({ ...m, from_currency: e.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="EGP">EGP</option>
                    </select>
                  </div>
                  <div className="accountings-field">
                    <label>{t('treasury.toAmountOptional')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="accountings-input"
                      value={txModal.to_amount}
                      onChange={(e) => setTxModal((m) => ({ ...m, to_amount: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field">
                    <label>{t('treasury.toCurrencyOptional')}</label>
                    <select
                      className="accountings-input"
                      value={txModal.to_currency}
                      onChange={(e) => setTxModal((m) => ({ ...m, to_currency: e.target.value }))}
                    >
                      <option value="">{t('treasury.sameAsFrom')}</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="EGP">EGP</option>
                    </select>
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('treasury.entryDate')}</label>
                    <input
                      type="date"
                      className="accountings-input"
                      value={txModal.entry_date}
                      onChange={(e) => setTxModal((m) => ({ ...m, entry_date: e.target.value }))}
                    />
                  </div>
                  <div className="accountings-field accountings-field--full">
                    <label>{t('treasury.description')}</label>
                    <input
                      type="text"
                      className="accountings-input"
                      value={txModal.description}
                      onChange={(e) => setTxModal((m) => ({ ...m, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" disabled={saving} onClick={() => setTxModal(null)}>
                  {t('treasury.cancel')}
                </button>
                <button
                  type="button"
                  className="accountings-btn accountings-btn--primary"
                  disabled={saving}
                  onClick={submitTransfer}
                >
                  {saving ? t('treasury.saving') : t('treasury.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseModalOpen && (
        <div className="accountings-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="accountings-modal-backdrop"
            onClick={() => !saving && setExpenseModalOpen(false)}
            aria-label={t('treasury.close')}
          />
          <div className="accountings-modal-content">
            <h2>{t('treasury.modalAddExpense')}</h2>
            <div className="accountings-form">
              <div className="accountings-field">
                <label>{t('treasury.expenseCategory')}</label>
                <select
                  className="accountings-input"
                  value={expenseForm.expense_category_id}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, expense_category_id: e.target.value }))}
                >
                  <option value="">{t('treasury.selectCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name ?? c.code ?? c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="accountings-field">
                <label>{t('treasury.description')}</label>
                <input
                  type="text"
                  className="accountings-input"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="accountings-form-grid">
                <div className="accountings-field">
                  <label>{t('treasury.amount')}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="accountings-input"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="accountings-field">
                  <label>{t('treasury.currency')}</label>
                  <select
                    className="accountings-input"
                    value={expenseForm.currency_code}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, currency_code: e.target.value }))}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="EGP">EGP</option>
                  </select>
                </div>
                <div className="accountings-field accountings-field--full">
                  <label>{t('treasury.expenseDate')}</label>
                  <input
                    type="date"
                    className="accountings-input"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" disabled={saving} onClick={() => setExpenseModalOpen(false)}>
                  {t('treasury.cancel')}
                </button>
                <button
                  type="button"
                  className="accountings-btn accountings-btn--primary"
                  disabled={saving}
                  onClick={submitExpense}
                >
                  {saving ? t('treasury.saving') : t('treasury.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
