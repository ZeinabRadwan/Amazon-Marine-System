import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  getTreasuryBankOverview,
  getTreasuryEntries,
  getTreasuryExpenses,
} from '../../api/treasury'
import { listCurrencies } from '../../api/invoices'
import { listExpenseCategories } from '../../api/expenses'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import '../../components/LoaderDots/LoaderDots.css'
import {
  Landmark,
  Receipt,
  FileSpreadsheet,
  Search,
  Eye,
  List,
  RotateCcw,
  Wallet,
  HandCoins,
  Send,
  Building2,
} from 'lucide-react'
import '../../components/PageHeader/PageHeader.css'
import '../../components/Tabs/Tabs.css'
import '../Clients/Clients.css'
import '../Accountings/Accountings.css'
import '../Accountings/CurrencyMapBadges.css'
import { CurrencyMapBadges, CurrencyCodeBadge } from '../Accountings/CurrencyMapBadges'
import { StatsCard } from '../../components/StatsCard'
import Tabs from '../../components/Tabs'
import Pagination from '../../components/Pagination'
import './Treasury.css'

const RECON_ROWS_PER_PAGE = 12

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

/** Plain numeric amount (no currency symbol); pair with {@link CurrencyCodeBadge}. */
function formatPlainAmount(amount, locale) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * FX pairs from `/currencies`: rate = units of default currency per 1 unit (see BankPaymentCurrencyService).
 */
function buildTreasuryExchangePairs(currencyRows) {
  const list = Array.isArray(currencyRows) ? currencyRows : []
  const pick = (code) => list.find((c) => String(c.code || '').toUpperCase() === code)
  const rate = (c) => (c ? Number(c.exchange_rate ?? c.rate ?? 0) : 0)
  const usd = pick('USD')
  const eur = pick('EUR')
  const rUsd = rate(usd)
  const rEur = rate(eur)
  const out = []
  if (rUsd > 0) out.push({ id: 'usd-egp', labelKey: 'treasury.exchange.usdToEgp', value: rUsd })
  if (rEur > 0) out.push({ id: 'eur-egp', labelKey: 'treasury.exchange.eurToEgp', value: rEur })
  if (rUsd > 0 && rEur > 0) {
    out.push({ id: 'usd-eur', labelKey: 'treasury.exchange.usdToEur', value: rUsd / rEur })
    out.push({ id: 'eur-usd', labelKey: 'treasury.exchange.eurToUsd', value: rEur / rUsd })
  }
  return out
}

function normalizeBankSupportedCurrencies(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((c) => String(c).toUpperCase()).filter((c) => c.length === 3))].sort()
}

function deriveFlowType(row) {
  if (row?.flow_type) return String(row.flow_type).toLowerCase()
  if (row?.payment_type === 'client_receipt') return 'customer'
  if (row?.payment_type === 'vendor_payment') return 'partner'
  if (!row?.payment_id) return String(row?.entry_type || '').toLowerCase() === 'transfer' ? 'transfer' : 'manual'
  return 'internal'
}

function flowTypeLabel(row, t) {
  const f = deriveFlowType(row)
  if (f === 'customer') return t('treasury.flow.customer', 'Customer')
  if (f === 'partner') return t('treasury.flow.partner', 'Partner')
  if (f === 'transfer') return t('treasury.flow.transfer', 'Transfer')
  if (f === 'manual') return t('treasury.flow.manual', 'Manual / Other')
  return t('treasury.flow.internal', 'Internal')
}

function computeRunningBalances(rows, clampZero = true) {
  const byCurrency = new Map()
  for (const r of rows) {
    const cur = r.currency_code || 'USD'
    if (!byCurrency.has(cur)) byCurrency.set(cur, [])
    byCurrency.get(cur).push(r)
  }
  const balanceById = new Map()
  let hasNegative = false
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
      if (run < 0) hasNegative = true
      const displayRun = clampZero ? Math.max(0, run) : run
      balanceById.set(r.id, { running: displayRun, rawRunning: run, currency: r.currency_code || 'USD' })
    }
  }
  return { balanceById, hasNegative }
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
  const { hasPageAccess } = useAuthAccess()
  const token = getStoredToken()
  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
  const isAr = locale.startsWith('ar')

  const canViewAccounting = hasPageAccess('treasury')

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 400)
  const [typeFilter, setTypeFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortKey, setSortKey] = useState('date')

  const [entries, setEntries] = useState([])
  const [bankLedgerOverview, setBankLedgerOverview] = useState(null)
  const [bankOverviewLoading, setBankOverviewLoading] = useState(false)
  const [exchangeRates, setExchangeRates] = useState([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState(null)

  const [expenseRows, setExpenseRows] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  const [categories, setCategories] = useState([])

  /** @type {[object | null, (r: object | null) => void]} */
  const [entryViewRow, setEntryViewRow] = useState(null)

  const [reconStatement, setReconStatement] = useState('')
  const [reconLedger, setReconLedger] = useState('')
  const [reconChecks, setReconChecks] = useState(() => ({}))

  const [treasuryTab, setTreasuryTab] = useState('movements')

  const [entriesPage, setEntriesPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState(15)
  const [expensesPage, setExpensesPage] = useState(1)
  const [expensesPerPage, setExpensesPerPage] = useState(15)
  const [reconPage, setReconPage] = useState(1)

  const treasuryTabs = useMemo(
    () => [
      {
        id: 'movements',
        label: t('treasury.tabs.movements'),
        icon: <List className="h-4 w-4" aria-hidden />,
      },
      {
        id: 'reconciliation',
        label: t('treasury.tabs.reconciliation'),
        icon: <Landmark className="h-4 w-4" aria-hidden />,
      },
      {
        id: 'expenses',
        label: t('treasury.tabs.expenses'),
        icon: <Receipt className="h-4 w-4" aria-hidden />,
      },
    ],
    [t],
  )

  const loadBankOverview = useCallback(() => {
    if (!token || !canViewAccounting) return
    setBankOverviewLoading(true)
    getTreasuryBankOverview(token)
      .then((data) => setBankLedgerOverview(data))
      .catch(() => setBankLedgerOverview(null))
      .finally(() => setBankOverviewLoading(false))
  }, [token, canViewAccounting])

  const loadEntries = useCallback(() => {
    if (!token || !canViewAccounting) return
    setEntries([])
    setEntriesLoading(true)
    setEntriesError(null)
    getTreasuryEntries(token, {
      search: debouncedSearch || undefined,
      type: typeFilter || undefined,
      currency: currencyFilter || undefined,
      bank_account_id: selectedBankId || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      sort: sortKey || 'date',
    })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : []
        const byId = new Map()
        for (const r of rows) {
          if (r && r.id != null && !byId.has(r.id)) byId.set(r.id, r)
        }
        setEntries([...byId.values()])
      })
      .catch((e) => {
        setEntriesError(e?.message || 'Error')
        setEntries([])
      })
      .finally(() => setEntriesLoading(false))
  }, [
    token,
    debouncedSearch,
    typeFilter,
    currencyFilter,
    selectedBankId,
    fromDate,
    toDate,
    sortKey,
    canViewAccounting,
  ])

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
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    loadBankOverview()
  }, [loadBankOverview])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listCurrencies(token)
      .then((rows) => setExchangeRates(Array.isArray(rows) ? rows : []))
      .catch(() => setExchangeRates([]))
  }, [token, canViewAccounting])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  useEffect(() => {
    setEntriesPage(1)
  }, [debouncedSearch, typeFilter, currencyFilter, selectedBankId, fromDate, toDate, sortKey])

  useEffect(() => {
    setExpensesPage(1)
  }, [expenseCategoryId])

  useEffect(() => {
    setReconPage(1)
  }, [debouncedSearch, typeFilter, fromDate, toDate, sortKey])

  const entriesLastPage = Math.max(1, Math.ceil(entries.length / entriesPerPage))
  const expensesLastPage = Math.max(1, Math.ceil(expenseRows.length / expensesPerPage))
  const reconLastPage = Math.max(1, Math.ceil(entries.length / RECON_ROWS_PER_PAGE))

  useEffect(() => {
    setEntriesPage((p) => Math.min(p, entriesLastPage))
  }, [entriesLastPage])

  useEffect(() => {
    setExpensesPage((p) => Math.min(p, expensesLastPage))
  }, [expensesLastPage])

  useEffect(() => {
    setReconPage((p) => Math.min(p, reconLastPage))
  }, [reconLastPage])

  const pagedEntries = useMemo(() => {
    const start = (entriesPage - 1) * entriesPerPage
    return entries.slice(start, start + entriesPerPage)
  }, [entries, entriesPage, entriesPerPage])

  const pagedExpenseRows = useMemo(() => {
    const start = (expensesPage - 1) * expensesPerPage
    return expenseRows.slice(start, start + expensesPerPage)
  }, [expenseRows, expensesPage, expensesPerPage])

  const pagedReconEntries = useMemo(() => {
    const start = (reconPage - 1) * RECON_ROWS_PER_PAGE
    return entries.slice(start, start + RECON_ROWS_PER_PAGE)
  }, [entries, reconPage])

  const currencyOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.currency_code).filter(Boolean))).sort(), [entries])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listExpenseCategories(token)
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]))
  }, [token, canViewAccounting])

  const { balanceById: runningById } = useMemo(() => computeRunningBalances(entries), [entries])

  const exchangePairs = useMemo(() => buildTreasuryExchangePairs(exchangeRates), [exchangeRates])

  const bankFilterOptions = useMemo(() => {
    if (bankLedgerOverview?.banks?.length) return bankLedgerOverview.banks
    return []
  }, [bankLedgerOverview])

  const exportEntriesCsv = () => {
    const headers = [
      t('treasury.colDate'),
      t('treasury.colFlow', 'Flow'),
      t('treasury.colDescription'),
      t('treasury.colType'),
      t('treasury.colAmount'),
      t('treasury.colCurrency'),
      t('treasury.colReference', 'Reference'),
      t('treasury.colSource'),
      t('treasury.colRunning'),
    ]
    const lines = [headers.map(escapeCsvCell).join(',')]
    for (const row of entries) {
      const rb = runningById.get(row.id)
      lines.push(
        [
          row.entry_date,
          flowTypeLabel(row, t),
          row.description || row.reference_label || '',
          row.entry_type === 'in'
            ? t('treasury.typeIn')
            : row.entry_type === 'out'
              ? t('treasury.typeOut')
              : row.entry_type === 'transfer'
                ? t('treasury.typeTransfer', 'Transfer')
                : t('treasury.typeExchange', 'Exchange'),
          formatPlainAmount(row.amount, locale),
          row.currency_code,
          row.reference_label || '',
          row.source,
          rb != null ? formatPlainAmount(rb.running, locale) : '',
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
      <Container size="xl">
        <div className="clients-page treasury-page">
          <p className="treasury-muted">{t('treasury.noPermission')}</p>
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <div className="clients-page treasury-page">
      <section className="treasury-stats-band treasury-stats--compact mb-4" aria-label={t('treasury.statsSummaryRegion', 'Treasury summary')}>
        <div className="clients-stats-grid accountings-stats-grid accountings-stats-grid--statement treasury-stats-grid--5">
          <StatsCard
            className="accountings-stat-card"
            title={t('treasury.bankOverview.totalBalances')}
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges value={bankLedgerOverview?.global?.total_balance_by_currency} size="sm" amountFirst />
              )
            }
            icon={<Wallet className="h-4 w-4" aria-hidden />}
            variant="green"
          />
          <StatsCard
            className="accountings-stat-card"
            title={t('treasury.bankOverview.receivables')}
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges value={bankLedgerOverview?.global?.total_customer_in_by_currency} size="sm" amountFirst />
              )
            }
            icon={<Receipt className="h-4 w-4" aria-hidden />}
            variant="amber"
          />
          <StatsCard
            className="accountings-stat-card"
            title={t('treasury.bankOverview.customerOutstanding')}
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.customer_outstanding_receivables_by_currency}
                  size="sm"
                  amountFirst
                />
              )
            }
            icon={<HandCoins className="h-4 w-4" aria-hidden />}
            variant="red"
          />
          <StatsCard
            className="accountings-stat-card"
            title={t('treasury.bankOverview.partnerPayments')}
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges value={bankLedgerOverview?.global?.total_partner_out_by_currency} size="sm" amountFirst />
              )
            }
            icon={<Send className="h-4 w-4" aria-hidden />}
            variant="blue"
          />
          <StatsCard
            className="accountings-stat-card"
            title={t('treasury.bankOverview.partnerPayables')}
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.partner_payables_outstanding_by_currency}
                  size="sm"
                  amountFirst
                />
              )
            }
            icon={<Building2 className="h-4 w-4" aria-hidden />}
            variant="default"
          />
        </div>
      </section>

      {exchangePairs.length > 0 && (
        <div className="mb-4">
          <div className="treasury-sec-title mb-2">{t('treasury.exchange.dailyTitle')}</div>
          <div className="treasury-rate-bar">
            <div className="treasury-rate-bar-inner">
              {exchangePairs.map((p) => (
                <div key={p.id} className="treasury-rate-item">
                  <span className="treasury-rate-lbl">{t(p.labelKey)}</span>
                  <span className="treasury-rate-val">
                    {Number(p.value).toLocaleString(locale, { maximumFractionDigits: 6 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="treasury-sec-title mb-2">{t('treasury.bankOverview.accountsTitle')}</div>
      <div className="treasury-accounts-grid mb-4">
        {bankOverviewLoading && (
          <div className="treasury-banks-loading">
            <LoaderDots />
          </div>
        )}
        {!bankOverviewLoading &&
          (bankLedgerOverview?.banks?.length ? (
            bankLedgerOverview.banks.map((bank, idx) => {
              const active = String(selectedBankId) === String(bank.id)
              const bandMod = idx % 6
              const curRows = normalizeBankSupportedCurrencies(bank.supported_currencies)
              return (
                <button
                  key={bank.id}
                  type="button"
                  className={`treasury-acc-card treasury-acc-card--band-${bandMod}${active ? ' treasury-acc-card--active' : ''}`}
                  onClick={() => {
                    setEntries([])
                    setSelectedBankId((prev) => (String(prev) === String(bank.id) ? '' : String(bank.id)))
                  }}
                >
                  <div className={`treasury-acc-band treasury-acc-band--${bandMod}`} aria-hidden />
                  <div className="treasury-acc-body">
                    <div className="treasury-acc-kicker">
                      <Landmark className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      {t('treasury.bankOverview.account')}
                    </div>
                    <div className="treasury-acc-name">{bank.bank_name}</div>
                    <div className="treasury-acc-sub">{bank.account_name || bank.account_number || '—'}</div>
                    {curRows.length ? (
                      <>
                        <div className="treasury-acc-cur-head" aria-hidden>
                          <span />
                          <span>{t('treasury.bankOverview.rowBalance')}</span>
                          <span>{t('treasury.bankOverview.rowIn')}</span>
                          <span>{t('treasury.bankOverview.rowOut')}</span>
                        </div>
                        {curRows.map((cur) => (
                          <div key={`${bank.id}-${cur}`} className="treasury-acc-cur-row">
                            <span className="treasury-acc-cur-badge-wrap">
                              <CurrencyCodeBadge code={cur} />
                            </span>
                            <span className="treasury-acc-cur-num treasury-acc-mono">
                              {formatPlainAmount(bank.balance_by_currency?.[cur] ?? 0, locale)}
                            </span>
                            <span className="treasury-acc-cur-num treasury-acc-cur-num--muted treasury-acc-mono">
                              {formatPlainAmount(bank.customer_in_by_currency?.[cur] ?? 0, locale)}
                            </span>
                            <span className="treasury-acc-cur-num treasury-acc-cur-num--muted treasury-acc-mono">
                              {formatPlainAmount(bank.partner_out_by_currency?.[cur] ?? 0, locale)}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="treasury-muted mt-2 text-xs">{t('treasury.bankOverview.noCurrenciesConfigured')}</p>
                    )}
                  </div>
                </button>
              )
            })
          ) : (
            <p className="treasury-muted">{t('treasury.bankOverview.noBanks', 'No active bank accounts.')}</p>
          ))}
      </div>

      <div className="invoices-tabs-section">
        <div className="invoices-tabs-wrap">
          <Tabs tabs={treasuryTabs} activeTab={treasuryTab} onChange={setTreasuryTab} />
        </div>

        {treasuryTab === 'movements' && (
            <div className="accountings-table-section">
        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                className="clients-input clients-filters__search"
                placeholder={t('treasury.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('treasury.searchPlaceholder')}
              />
            </div>
            <div className="clients-filters__fields">
              <select
                className="clients-input min-w-[200px]"
                value={selectedBankId}
                onChange={(e) => {
                  setEntries([])
                  setEntriesPage(1)
                  setSelectedBankId(e.target.value)
                }}
                aria-label={t('treasury.bankOverview.filterBank', 'Bank account')}
              >
                <option value="">{t('treasury.bankOverview.allBanks', 'All banks')}</option>
                {bankFilterOptions.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.bank_name} — {b.account_name || b.account_number || b.id}
                  </option>
                ))}
              </select>
              <select
                className="clients-input min-w-[140px]"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label={t('treasury.filterType')}
              >
                <option value="">{t('treasury.allTypes')}</option>
                <option value="in">{t('treasury.typeIn')}</option>
                <option value="out">{t('treasury.typeOut')}</option>
                <option value="transfer">{t('treasury.typeTransfer', 'Transfer')}</option>
                <option value="exchange">{t('treasury.typeExchange', 'Exchange')}</option>
              </select>
              <select
                className="clients-input min-w-[120px]"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                aria-label={t('treasury.currency')}
              >
                <option value="">{t('treasury.allCurrencies', 'All currencies')}</option>
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="date"
                className="clients-input min-w-[140px]"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label={t('treasury.dateFrom')}
              />
              <input
                type="date"
                className="clients-input min-w-[140px]"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label={t('treasury.dateTo')}
              />
              <select
                className="clients-input min-w-[140px]"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                aria-label={t('treasury.sortBy')}
              >
                <option value="date">{t('treasury.sortDate')}</option>
                <option value="amount">{t('treasury.sortAmount')}</option>
              </select>
            </div>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="clients-filters__clear clients-filters__btn-icon"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('')
                  setCurrencyFilter('')
                  setSelectedBankId('')
                  setFromDate('')
                  setToDate('')
                  setSortKey('date')
                }}
                aria-label={t('invoices.clearFilters', 'Clear filters')}
                title={t('invoices.clearFilters', 'Clear filters')}
              >
                <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={exportEntriesCsv}
                disabled={!entries.length}
                aria-label={t('treasury.export')}
                title={t('treasury.export')}
              >
                <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {entriesError && <div className="accountings-error mb-3">{entriesError}</div>}

        <div className="accountings-table-wrap">
          <table className="accountings-table">
            <thead>
              <tr>
                <th>{t('treasury.colDate')}</th>
                <th>{t('treasury.colFlow', 'Flow')}</th>
                <th>{t('treasury.colDescription')}</th>
                <th>{t('treasury.colType')}</th>
                <th>{t('treasury.colAmount')}</th>
                <th>{t('treasury.colCurrency')}</th>
                <th>{t('treasury.colReference', 'Reference')}</th>
                <th>{t('treasury.colRunning')}</th>
                <th>{t('treasury.colView')}</th>
              </tr>
            </thead>
            <tbody>
              {entriesLoading && (
                <tr>
                  <td colSpan={9}>
                    <LoaderDots />
                  </td>
                </tr>
              )}
              {!entriesLoading &&
                pagedEntries.map((row) => {
                  const rb = runningById.get(row.id)
                  const runDisplay = rb != null ? formatPlainAmount(rb.running, locale) : '—'
                  const flow = deriveFlowType(row)
                  const desc = [row.description, row.reference_label].filter(Boolean).join(' · ') || '—'
                  return (
                    <tr key={row.id}>
                      <td>{row.entry_date}</td>
                      <td>
                        <span className={`treasury-flow-badge treasury-flow-badge--${flow}`}>
                          {flowTypeLabel(row, t)}
                        </span>
                      </td>
                      <td className="max-w-[220px]">{desc}</td>
                      <td>
                        <span
                          className={`accountings-status-badge ${
                            row.entry_type === 'in'
                              ? 'accountings-status-badge--active'
                              : row.entry_type === 'out'
                                ? 'accountings-status-badge--pending'
                                : 'accountings-status-badge--default'
                          }`}
                        >
                          {row.entry_type === 'in'
                            ? t('treasury.typeIn')
                            : row.entry_type === 'out'
                              ? t('treasury.typeOut')
                              : row.entry_type === 'transfer'
                                ? t('treasury.typeTransfer', 'Transfer')
                                : t('treasury.typeExchange', 'Exchange')}
                        </span>
                      </td>
                      <td className={`treasury-acc-mono ${Number(row.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPlainAmount(row.amount, locale)}
                      </td>
                      <td>
                        <CurrencyCodeBadge code={row.currency_code} />
                      </td>
                      <td className="max-w-[180px] truncate" title={row.reference_label || ''}>
                        {row.reference_label || '—'}
                      </td>
                      <td>{runDisplay}</td>
                      <td>
                        <button
                          type="button"
                          className="accountings-btn accountings-btn--small"
                          onClick={() => setEntryViewRow(row)}
                          aria-label={t('treasury.viewEntry')}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              {!entriesLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={9} className="accountings-empty">
                    {t('treasury.emptyMovements')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!entriesLoading && entries.length > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('clients.total', 'Total')}: {entries.length}
              </span>
              <label className="clients-pagination__per-page">
                <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value))
                    setEntriesPage(1)
                  }}
                  className="clients-select clients-pagination__select"
                  aria-label={t('clients.perPage', 'Per page')}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <Pagination
              currentPage={Math.min(entriesPage, entriesLastPage)}
              totalPages={entriesLastPage}
              onPageChange={setEntriesPage}
            />
          </div>
        )}
            </div>
        )}

        {treasuryTab === 'reconciliation' && (
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
              {pagedReconEntries.map((row) => (
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

        {entries.length > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('clients.total', 'Total')}: {entries.length}
              </span>
              <span className="clients-pagination__total text-sm opacity-80">
                {t('treasury.reconRowsPerPage', { count: RECON_ROWS_PER_PAGE })}
              </span>
            </div>
            <Pagination
              currentPage={Math.min(reconPage, reconLastPage)}
              totalPages={reconLastPage}
              onPageChange={setReconPage}
            />
          </div>
        )}
      </div>
        )}

        {treasuryTab === 'expenses' && (
          <div className="accountings-table-section">
        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__fields flex-1">
              <select
                className="clients-input min-w-[200px]"
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
            <div className="clients-filters__actions">
              <button
                type="button"
                className="clients-filters__clear clients-filters__btn-icon"
                onClick={() => setExpenseCategoryId('')}
                aria-label={t('invoices.clearFilters', 'Clear filters')}
                title={t('invoices.clearFilters', 'Clear filters')}
              >
                <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={exportExpensesCsv}
                disabled={!expenseRows.length}
                aria-label={t('treasury.export')}
                title={t('treasury.export')}
              >
                <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
            </div>
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
                pagedExpenseRows.map((row) => (
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

        {!expensesLoading && expenseRows.length > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('clients.total', 'Total')}: {expenseRows.length}
              </span>
              <label className="clients-pagination__per-page">
                <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
                <select
                  value={expensesPerPage}
                  onChange={(e) => {
                    setExpensesPerPage(Number(e.target.value))
                    setExpensesPage(1)
                  }}
                  className="clients-select clients-pagination__select"
                  aria-label={t('clients.perPage', 'Per page')}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <Pagination
              currentPage={Math.min(expensesPage, expensesLastPage)}
              totalPages={expensesLastPage}
              onPageChange={setExpensesPage}
            />
          </div>
        )}
      </div>
        )}

      </div>

      {entryViewRow && (
        <div className="accountings-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="accountings-modal-backdrop"
            onClick={() => setEntryViewRow(null)}
            aria-label={t('treasury.close')}
          />
          <div className="accountings-modal-content accountings-modal-content--wide">
            <h2>{t('treasury.entryDetailTitle')}</h2>
            <div className="treasury-entry-view accountings-form">
              <dl className="treasury-entry-view-dl">
                <dt>{t('treasury.colDate')}</dt>
                <dd>{entryViewRow.entry_date || '—'}</dd>
                <dt>{t('treasury.colFlow')}</dt>
                <dd>{flowTypeLabel(entryViewRow, t)}</dd>
                <dt>{t('treasury.colDescription')}</dt>
                <dd className="break-words">
                  {[entryViewRow.description, entryViewRow.reference_label].filter(Boolean).join(' · ') || '—'}
                </dd>
                <dt>{t('treasury.colType')}</dt>
                <dd>{entryViewRow.entry_type || '—'}</dd>
                <dt>{t('treasury.colAmount')}</dt>
                <dd className="tabular-nums">{formatPlainAmount(entryViewRow.amount, locale)}</dd>
                <dt>{t('treasury.colCurrency')}</dt>
                <dd>
                  <CurrencyCodeBadge code={entryViewRow.currency_code} />
                </dd>
                <dt>{t('treasury.colReference')}</dt>
                <dd>{entryViewRow.reference_label || '—'}</dd>
                <dt>{t('treasury.colRunning')}</dt>
                <dd className="tabular-nums">
                  {runningById.get(entryViewRow.id)?.running != null
                    ? formatPlainAmount(runningById.get(entryViewRow.id).running, locale)
                    : '—'}
                </dd>
                <dt>{t('treasury.detailPaymentId')}</dt>
                <dd>{entryViewRow.payment_id ?? '—'}</dd>
                <dt>{t('treasury.detailAccountIds')}</dt>
                <dd className="tabular-nums">
                  {entryViewRow.account_id ?? '—'} / {entryViewRow.counter_account_id ?? '—'}
                </dd>
              </dl>
              <div className="treasury-entry-view-links mt-4 flex flex-wrap items-center gap-3">
                {entryViewRow.invoice_id ? (
                  <Link
                    className="accountings-btn accountings-btn--small accountings-btn--primary"
                    to={`/invoices/${entryViewRow.invoice_id}/edit`}
                    onClick={() => setEntryViewRow(null)}
                  >
                    {t('treasury.linkOpenInvoice')}
                  </Link>
                ) : null}
                {entryViewRow.shipment_id ? (
                  <Link
                    className="accountings-btn accountings-btn--small"
                    to={`/shipments?shipment_id=${entryViewRow.shipment_id}`}
                    onClick={() => setEntryViewRow(null)}
                  >
                    {t('treasury.linkOpenShipment')}
                  </Link>
                ) : null}
                {entryViewRow.vendor_bill_id ? (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t('treasury.vendorBillRef')}: #{entryViewRow.vendor_bill_id}
                  </span>
                ) : null}
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" onClick={() => setEntryViewRow(null)}>
                  {t('treasury.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Container>
  )
}
