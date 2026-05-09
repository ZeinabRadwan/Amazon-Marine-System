import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  getTreasuryBankOverview,
  getTreasuryEntries,
  createTreasuryEntry,
  updateTreasuryEntry,
  deleteTreasuryEntry,
  createTreasuryTransfer,
  getTreasuryExpenses,
  createTreasuryExpense,
} from '../../api/treasury'
import { listBankAccounts } from '../../api/accountings'
import { listCurrencies } from '../../api/invoices'
import { listExpenseCategories } from '../../api/expenses'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import '../../components/LoaderDots/LoaderDots.css'
import {
  Landmark,
  Receipt,
  FileSpreadsheet,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeftRight,
  RotateCcw,
} from 'lucide-react'
import '../../components/PageHeader/PageHeader.css'
import '../../components/Tabs/Tabs.css'
import '../Clients/Clients.css'
import '../Accountings/Accountings.css'
import '../Accountings/CurrencyMapBadges.css'
import { CurrencyMapBadges } from '../Accountings/CurrencyMapBadges'
import Tabs from '../../components/Tabs'
import Pagination from '../../components/Pagination'
import './Treasury.css'

const RECON_ROWS_PER_PAGE = 12

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

const CASH_SOURCE_OPTIONS = SOURCE_GROUPS.flatMap((g) => g.options)

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
  const canManageAccounting = hasPageAccess('treasury')

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 400)
  const [typeFilter, setTypeFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortKey, setSortKey] = useState('date')

  const [entries, setEntries] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
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
        icon: <ArrowLeftRight className="h-4 w-4" aria-hidden />,
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
      .then((res) => setEntries(Array.isArray(res.data) ? res.data : []))
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

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listBankAccounts(token)
      .then((res) => setBankAccounts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setBankAccounts([]))
  }, [token, canViewAccounting])

  const { balanceById: runningById, hasNegative: ledgerNegativeRunning } = useMemo(
    () => computeRunningBalances(entries),
    [entries],
  )

  const globalInsufficientFunds = Boolean(bankLedgerOverview?.banks?.some((b) => b.insufficient_funds))

  const selectedBankOverviewRow = useMemo(() => {
    if (!bankLedgerOverview?.banks || !selectedBankId) return null
    return bankLedgerOverview.banks.find((b) => Number(b.id) === Number(selectedBankId)) ?? null
  }, [bankLedgerOverview, selectedBankId])

  const bankAccountOptions = useMemo(
    () =>
      bankAccounts
        .filter((acc) => acc?.is_active !== false)
        .map((acc) => ({
          value: String(acc.id),
          label: `${acc.bank_name} - ${acc.account_name || acc.account_number || acc.id}`,
        })),
    [bankAccounts]
  )

  const bankFilterOptions = useMemo(() => {
    if (bankLedgerOverview?.banks?.length) return bankLedgerOverview.banks
    return bankAccounts.map((b) => ({
      id: b.id,
      bank_name: b.bank_name,
      account_name: b.account_name,
      account_number: b.account_number,
    }))
  }, [bankLedgerOverview, bankAccounts])

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
          row.amount,
          row.currency_code,
          row.reference_label || '',
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
    const sourceValue = row.account_id ? `bank:${row.account_id}` : (row.source || '')
    setTxModal({
      kind: 'entry',
      mode: 'edit',
      id: row.id,
      entry_type: row.entry_type || 'in',
      source: sourceValue,
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
      const isBank = String(txModal.source).startsWith('bank:')
      const accountId = isBank ? Number(String(txModal.source).replace('bank:', '')) : null
      const sourceLabel = isBank
        ? (bankAccounts.find((b) => Number(b.id) === accountId)?.bank_name || 'bank')
        : txModal.source
      const body = {
        entry_type: txModal.entry_type,
        source: sourceLabel,
        account_id: accountId || undefined,
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
      loadBankOverview()
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
        from_account: String(txModal.from_account).startsWith('bank:')
          ? (bankAccounts.find((b) => Number(b.id) === Number(String(txModal.from_account).replace('bank:', '')))?.bank_name || 'bank')
          : txModal.from_account,
        to_account: String(txModal.to_account).startsWith('bank:')
          ? (bankAccounts.find((b) => Number(b.id) === Number(String(txModal.to_account).replace('bank:', '')))?.bank_name || 'bank')
          : txModal.to_account,
        from_account_id: String(txModal.from_account).startsWith('bank:') ? Number(String(txModal.from_account).replace('bank:', '')) : undefined,
        to_account_id: String(txModal.to_account).startsWith('bank:') ? Number(String(txModal.to_account).replace('bank:', '')) : undefined,
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
      loadBankOverview()
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
      loadBankOverview()
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
      loadBankOverview()
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
      {(globalInsufficientFunds ||
        ledgerNegativeRunning ||
        selectedBankOverviewRow?.insufficient_funds) && (
        <div className="treasury-alert treasury-alert--warn mb-4" role="alert">
          {t(
            'treasury.insufficientFunds',
            'Insufficient funds — balances cannot be negative; displayed amounts are shown as zero.',
          )}
        </div>
      )}

      <div className="treasury-stats3 mb-4">
        <div className="treasury-stat treasury-stat--green">
          <div className="treasury-stat-lbl">{t('treasury.bankOverview.totalBalances', 'Total bank balances')}</div>
          <div className="treasury-stat-val-rich">
            {bankOverviewLoading ? (
              <span className="treasury-muted">…</span>
            ) : (
              <CurrencyMapBadges value={bankLedgerOverview?.global?.total_balance_by_currency} size="sm" amountFirst />
            )}
          </div>
        </div>
        <div className="treasury-stat treasury-stat--orange">
          <div className="treasury-stat-lbl">{t('treasury.bankOverview.receivables', 'Customer receipts')}</div>
          <div className="treasury-stat-val-rich">
            {bankOverviewLoading ? (
              <span className="treasury-muted">…</span>
            ) : (
              <CurrencyMapBadges value={bankLedgerOverview?.global?.total_customer_in_by_currency} size="sm" amountFirst />
            )}
          </div>
        </div>
        <div className="treasury-stat treasury-stat--red">
          <div className="treasury-stat-lbl">{t('treasury.bankOverview.liabilities', 'Partner payments')}</div>
          <div className="treasury-stat-val-rich">
            {bankOverviewLoading ? (
              <span className="treasury-muted">…</span>
            ) : (
              <CurrencyMapBadges value={bankLedgerOverview?.global?.total_partner_out_by_currency} size="sm" amountFirst />
            )}
          </div>
        </div>
      </div>

      <div className="treasury-sec-title mb-2">{t('treasury.bankOverview.accountsTitle', 'Bank accounts')}</div>
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
              return (
                <button
                  key={bank.id}
                  type="button"
                  className={`treasury-acc-card treasury-acc-card--band-${bandMod}${active ? ' treasury-acc-card--active' : ''}`}
                  onClick={() =>
                    setSelectedBankId((prev) => (String(prev) === String(bank.id) ? '' : String(bank.id)))
                  }
                >
                  <div className={`treasury-acc-band treasury-acc-band--${bandMod}`} aria-hidden />
                  <div className="treasury-acc-body">
                    <div className="treasury-acc-kicker">
                      <Landmark className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      {t('treasury.bankOverview.account', 'Account')}
                    </div>
                    <div className="treasury-acc-name">{bank.bank_name}</div>
                    <div className="treasury-acc-sub">{bank.account_name || bank.account_number || '—'}</div>
                    <div className="treasury-acc-currencies-label">{t('settings.bankAccounts.currencies', 'Currencies')}</div>
                    <div className="treasury-acc-chip-row">
                      {(Array.isArray(bank.supported_currencies) ? bank.supported_currencies : []).map((c) => (
                        <span key={c} className="treasury-cur-chip">
                          {String(c).toUpperCase()}
                        </span>
                      ))}
                      {!bank.supported_currencies?.length ? <span className="treasury-muted text-sm">—</span> : null}
                    </div>
                    <div className="treasury-acc-row mt-2">
                      <span>{t('treasury.bankOverview.currentBalance', 'Balance')}</span>
                      <span className="treasury-acc-mono">
                        <CurrencyMapBadges value={bank.balance_by_currency} size="sm" amountFirst />
                      </span>
                    </div>
                    <div className="treasury-acc-row treasury-acc-row--muted">
                      <span>{t('treasury.bankOverview.customerIn', 'Incoming (customers)')}</span>
                      <span className="treasury-acc-mono">
                        <CurrencyMapBadges value={bank.customer_in_by_currency} size="sm" amountFirst />
                      </span>
                    </div>
                    <div className="treasury-acc-row treasury-acc-row--muted">
                      <span>{t('treasury.bankOverview.partnerOut', 'Outgoing (partners)')}</span>
                      <span className="treasury-acc-mono">
                        <CurrencyMapBadges value={bank.partner_out_by_currency} size="sm" amountFirst />
                      </span>
                    </div>
                    {bank.insufficient_funds ? (
                      <div className="treasury-acc-warn">{t('treasury.insufficientFundsShort', 'Insufficient funds')}</div>
                    ) : null}
                  </div>
                </button>
              )
            })
          ) : (
            <p className="treasury-muted">{t('treasury.bankOverview.noBanks', 'No active bank accounts.')}</p>
          ))}
      </div>

      {exchangeRates.length > 0 && (
        <div className="treasury-rate-bar mb-4">
          <div className="treasury-rate-bar-inner">
            {exchangeRates.slice(0, 8).map((c) => (
              <div key={c.code || c.id} className="treasury-rate-item">
                <span className="treasury-rate-lbl">{String(c.code || '').toUpperCase()}</span>
                <span className="treasury-rate-val">{Number(c.exchange_rate ?? c.rate ?? 0).toLocaleString(locale)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              {canManageAccounting && (
                <>
                  <button type="button" className="page-header__btn page-header__btn--primary" onClick={openAddEntry}>
                    <Plus className="inline h-3.5 w-3.5" /> {t('treasury.addMovement')}
                  </button>
                  <button
                    type="button"
                    className="clients-filters__btn-icon"
                    onClick={openTransfer}
                    aria-label={t('treasury.transfer')}
                    title={t('treasury.transfer')}
                  >
                    <ArrowLeftRight className="clients-filters__btn-icon-svg" aria-hidden />
                  </button>
                </>
              )}
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
                {canManageAccounting && <th>{t('treasury.colActions')}</th>}
              </tr>
            </thead>
            <tbody>
              {entriesLoading && (
                <tr>
                  <td colSpan={canManageAccounting ? 9 : 8}>
                    <LoaderDots />
                  </td>
                </tr>
              )}
              {!entriesLoading &&
                pagedEntries.map((row) => {
                  const rb = runningById.get(row.id)
                  const runDisplay =
                    rb != null ? formatAmount(rb.running, rb.currency, locale) : '—'
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
                      <td className={Number(row.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {formatAmount(row.amount, row.currency_code, locale)}
                      </td>
                      <td>{row.currency_code}</td>
                      <td className="max-w-[180px] truncate" title={row.reference_label || ''}>
                        {row.reference_label || '—'}
                      </td>
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
                  <td colSpan={canManageAccounting ? 9 : 8} className="accountings-empty">
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
              {canManageAccounting && (
                <button
                  type="button"
                  className="page-header__btn page-header__btn--primary"
                  onClick={() => {
                    setExpenseForm((f) => ({ ...f, expense_date: todayStr }))
                    setExpenseModalOpen(true)
                  }}
                >
                  <Plus className="inline h-3.5 w-3.5" /> {t('treasury.addExpense')}
                </button>
              )}
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
                    <option value="transfer">{t('treasury.typeTransfer', 'Transfer')}</option>
                    <option value="exchange">{t('treasury.typeExchange', 'Exchange')}</option>
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
                    <optgroup label={t('treasury.sourceGroup.bank')}>
                      {bankAccountOptions.map((o) => (
                        <option key={`entry-${o.value}`} value={`bank:${o.value}`}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('treasury.sourceGroup.cash')}>
                      {CASH_SOURCE_OPTIONS.map((o) => (
                        <option key={`entry-${o.value}`} value={o.value}>
                          {t(o.labelKey)}
                        </option>
                      ))}
                    </optgroup>
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
                    <optgroup label={t('treasury.sourceGroup.bank')}>
                      {bankAccountOptions.map((o) => (
                        <option key={`f-${o.value}`} value={`bank:${o.value}`}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('treasury.sourceGroup.cash')}>
                      {CASH_SOURCE_OPTIONS.map((o) => (
                        <option key={`f-${o.value}`} value={o.value}>
                          {t(o.labelKey)}
                        </option>
                      ))}
                    </optgroup>
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
                    <optgroup label={t('treasury.sourceGroup.bank')}>
                      {bankAccountOptions.map((o) => (
                        <option key={`t-${o.value}`} value={`bank:${o.value}`}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('treasury.sourceGroup.cash')}>
                      {CASH_SOURCE_OPTIONS.map((o) => (
                        <option key={`t-${o.value}`} value={o.value}>
                          {t(o.labelKey)}
                        </option>
                      ))}
                    </optgroup>
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
      </div>
    </Container>
  )
}
