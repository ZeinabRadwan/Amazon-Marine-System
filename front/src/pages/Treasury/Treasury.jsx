import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  createTreasuryTransfer,
  getTreasuryBankOverview,
  getTreasuryDailyExchangeRates,
  getTreasuryEntries,
} from '../../api/treasury'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import '../../components/LoaderDots/LoaderDots.css'
import {
  Landmark,
  Receipt,
  FileSpreadsheet,
  Search,
  RotateCcw,
  Wallet,
  HandCoins,
  Send,
  Building2,
  ArrowRightLeft,
  Repeat2,
} from 'lucide-react'
import '../../components/PageHeader/PageHeader.css'
import '../Clients/Clients.css'
import '../Accountings/Accountings.css'
import '../Accountings/CurrencyMapBadges.css'
import { CurrencyMapBadges } from '../Accountings/CurrencyMapBadges'
import { StatsCard } from '../../components/StatsCard'
import Pagination from '../../components/Pagination'
import './Treasury.css'

function singleCurrencyMap(amount, currencyCode) {
  const cur = String(currencyCode || 'USD').toUpperCase()
  return { [cur]: Number(amount) || 0 }
}

/** Western digits (0–9) for all treasury figures; independent of UI language. */
const TREASURY_NUMBER_LOCALE = 'en-US'

/**
 * Currencies surfaced in stat tiles when an aggregate is empty/all-zero.
 * Forces explicit "0.00 USD" badges instead of a "—" placeholder so the dashboard never
 * renders an ambiguous dash for a missing value (single source of truth principle).
 */
const TREASURY_STAT_FALLBACK_CURRENCIES = ['USD']

/** Plain numeric amount (no currency symbol); pair with {@link CurrencyCodeBadge}. */
function formatPlainAmount(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(TREASURY_NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Format one official FX pair from API. */
function formatTreasuryFxPair(pair) {
  const n = Number(pair?.rate)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(TREASURY_NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Subtitle date for the FX block (e.g. "06 May 2026"). Western digits; order DD Mon YYYY. */
function formatTreasuryFxSectionDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return ''
  try {
    const d = new Date(`${isoDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return isoDate
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return isoDate
  }
}

const TREASURY_CURRENCY_SORT_PRIORITY = ['EGP', 'USD', 'EUR']

function normalizeBalanceByCurrency(map) {
  const out = {}
  if (!map || typeof map !== 'object') return out
  for (const [k, v] of Object.entries(map)) {
    const code = String(k).toUpperCase()
    const n = Number(v)
    out[code] = Number.isFinite(n) ? n : 0
  }
  return out
}

function sortTreasuryCurrencyCodes(codes) {
  const uniq = [...new Set(codes.map((c) => String(c).toUpperCase()))].filter(Boolean)
  return uniq.sort((a, b) => {
    const ia = TREASURY_CURRENCY_SORT_PRIORITY.indexOf(a)
    const ib = TREASURY_CURRENCY_SORT_PRIORITY.indexOf(b)
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return a.localeCompare(b)
  })
}

/** Bank accounts: configured supported currencies only (no ledger fallback). */
function treasuryBankDisplayCurrencies(bank) {
  const supported = Array.isArray(bank?.supported_currencies) ? bank.supported_currencies : []
  return sortTreasuryCurrencyCodes(supported)
}

/** Prefer API `allowed_currencies` (banks + fixed cash-wallet rules). */
function treasuryAccountDisplayCurrencies(account) {
  const allowed = account?.allowed_currencies
  if (Array.isArray(allowed) && allowed.length > 0) {
    return sortTreasuryCurrencyCodes(allowed)
  }
  return treasuryBankDisplayCurrencies(account)
}

/**
 * Project the configured-currency list onto current balances. Every supported currency is
 * always returned (even when its balance is zero) so the Treasury cards explicitly indicate
 * that the account *can hold* that currency. Zero balances carry `isZero: true` so the UI
 * can mute them while still showing the pill — a single unified rule for both bank accounts
 * and operational treasury accounts.
 *
 * @returns {Array<{ code: string, amount: number, isZero: boolean }>}
 */
function treasurySupportedCurrencyRows(account, byCur) {
  return treasuryAccountDisplayCurrencies(account).map((code) => {
    const raw = Number(byCur[code] ?? 0)
    const amount = Number.isFinite(raw) ? raw : 0
    return { code, amount, isZero: amount === 0 }
  })
}

function treasuryCurrencyBadgeVariant(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'EGP') return 'egp'
  if (c === 'USD') return 'usd'
  if (c === 'EUR') return 'eur'
  return 'default'
}

/** Maps ledger row to a treasury transaction type label key (see treasury.txnType.*). */
function deriveTransactionTypeKey(row) {
  const ft = String(row?.flow_type || '').toLowerCase()
  if (ft === 'expense') return 'expense'
  const et = String(row?.entry_type || '').toLowerCase()
  if (et === 'exchange') return 'currencyExchange'
  if (et === 'transfer') return 'internalTransfer'
  if (et === 'expense') return 'expense'
  if (et === 'in') return 'deposit'
  if (et === 'out') return 'withdraw'
  return 'other'
}

function transactionTypeLabel(row, t) {
  if (row?.is_voided && String(row?.flow_type || '').toLowerCase() === 'expense') {
    return t('treasury.txnType.expenseVoided', 'Expense (voided)')
  }
  const k = deriveTransactionTypeKey(row)
  const fallbacks = {
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    expense: 'Expense',
    internalTransfer: 'Internal Transfer',
    currencyExchange: 'Currency Exchange',
    other: 'Other',
  }
  return t(`treasury.txnType.${k}`, fallbacks[k] ?? fallbacks.other)
}

const TXN_TYPE_CLASS = {
  deposit: 'treasury-txn-type--deposit',
  withdraw: 'treasury-txn-type--withdraw',
  expense: 'treasury-txn-type--expense',
  internalTransfer: 'treasury-txn-type--internal-transfer',
  currencyExchange: 'treasury-txn-type--currency-exchange',
  other: 'treasury-txn-type--other',
}

function treasuryAccountOptionLabel(b) {
  if (!b) return ''
  return [b.bank_name, b.account_name].filter(Boolean).join(' — ') || String(b.id)
}

/** Same hub formula as backend {@link TreasuryOfficialFxRateService} (CBE mids). */
function treasuryOfficialFxMultiplier(fromCur, toCur, pairs) {
  const from = String(fromCur || '').toUpperCase()
  const to = String(toCur || '').toUpperCase()
  if (from === to) return 1
  const allowed = ['USD', 'EUR', 'EGP']
  if (!allowed.includes(from) || !allowed.includes(to)) return null
  const list = Array.isArray(pairs) ? pairs : []
  const usdEgp = list.find((p) => p.id === 'usd_egp')?.rate
  const eurEgp = list.find((p) => p.id === 'eur_egp')?.rate
  const nu = Number(usdEgp)
  const ne = Number(eurEgp)
  if (!Number.isFinite(nu) || !Number.isFinite(ne) || nu <= 0 || ne <= 0) return null
  const egpPer = (code) => {
    if (code === 'EGP') return 1
    if (code === 'USD') return nu
    if (code === 'EUR') return ne
    return 0
  }
  const a = egpPer(from)
  const b = egpPer(to)
  if (!a || !b) return null
  return a / b
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
      if (r.is_voided) continue
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
  const { hasPageAccess, hasAbility } = useAuthAccess()
  const token = getStoredToken()
  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
  const isAr = locale.startsWith('ar')

  const canViewAccounting = hasPageAccess('treasury')
  const canManageTreasury = hasAbility('accounting.manage')

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 400)
  const [typeFilter, setTypeFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [entries, setEntries] = useState([])
  const [bankLedgerOverview, setBankLedgerOverview] = useState(null)
  const [bankOverviewLoading, setBankOverviewLoading] = useState(false)
  const [dailyFxResponse, setDailyFxResponse] = useState(null)
  const [dailyFxLoading, setDailyFxLoading] = useState(true)
  const [selectedBankId, setSelectedBankId] = useState('')
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState(null)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [transferModalError, setTransferModalError] = useState(null)
  const [exchangeModalError, setExchangeModalError] = useState(null)
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false)

  const [internalForm, setInternalForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    currency_code: 'USD',
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
  })

  const [exchangeForm, setExchangeForm] = useState({
    from_account_id: '',
    to_account_id: '',
    from_currency: 'USD',
    to_currency: 'EGP',
    amount: '',
    entry_date: new Date().toISOString().slice(0, 10),
    rate_mode: 'auto',
    fx_rate: '',
    description: '',
  })

  const [entriesPage, setEntriesPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState(15)

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
    canViewAccounting,
  ])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    loadBankOverview()
  }, [loadBankOverview])

  const loadDailyFx = useCallback(() => {
    if (!token || !canViewAccounting) {
      setDailyFxLoading(false)
      return
    }
    setDailyFxLoading(true)
    getTreasuryDailyExchangeRates(token)
      .then((json) => setDailyFxResponse(json))
      .catch(() => setDailyFxResponse({ ok: false, data: { pairs: [] } }))
      .finally(() => setDailyFxLoading(false))
  }, [token, canViewAccounting])

  useEffect(() => {
    loadDailyFx()
  }, [loadDailyFx])

  useEffect(() => {
    setEntriesPage(1)
  }, [debouncedSearch, typeFilter, currencyFilter, selectedBankId, fromDate, toDate])

  const entriesLastPage = Math.max(1, Math.ceil(entries.length / entriesPerPage))

  useEffect(() => {
    setEntriesPage((p) => Math.min(p, entriesLastPage))
  }, [entriesLastPage])

  const pagedEntries = useMemo(() => {
    const start = (entriesPage - 1) * entriesPerPage
    return entries.slice(start, start + entriesPerPage)
  }, [entries, entriesPage, entriesPerPage])

  const currencyOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.currency_code).filter(Boolean))).sort(), [entries])

  const { balanceById: runningById } = useMemo(() => computeRunningBalances(entries), [entries])

  const treasuryFxPairs = useMemo(() => {
    const pairs = dailyFxResponse?.data?.pairs
    if (!Array.isArray(pairs)) return []
    const order = ['usd_egp', 'eur_egp', 'usd_eur']
    const map = new Map(pairs.map((p) => [p.id, p]))
    return order.map((id) => map.get(id)).filter(Boolean)
  }, [dailyFxResponse])

  const treasuryFxOk = dailyFxResponse?.ok === true && treasuryFxPairs.length > 0

  const bankAccountsRows = useMemo(() => {
    if (Array.isArray(bankLedgerOverview?.bank_accounts)) {
      return bankLedgerOverview.bank_accounts
    }
    const legacy = bankLedgerOverview?.banks
    if (!Array.isArray(legacy)) return []
    return legacy.filter((b) => (b.treasury_account_kind ?? 'bank') === 'bank')
  }, [bankLedgerOverview])

  const cashWalletRows = useMemo(() => {
    if (Array.isArray(bankLedgerOverview?.cash_wallets)) {
      return bankLedgerOverview.cash_wallets
    }
    const legacy = bankLedgerOverview?.banks
    if (!Array.isArray(legacy)) return []
    return legacy.filter((b) => b.treasury_account_kind === 'cash_wallet')
  }, [bankLedgerOverview])

  const bankFilterOptions = useMemo(
    () => [...bankAccountsRows, ...cashWalletRows],
    [bankAccountsRows, cashWalletRows],
  )

  const accountIdToLabel = useMemo(() => {
    const m = new Map()
    for (const b of bankFilterOptions) {
      const label = [b.bank_name, b.account_name].filter(Boolean).join(' — ') || String(b.id)
      m.set(String(b.id), label)
    }
    return m
  }, [bankFilterOptions])

  const accountById = useMemo(() => {
    const m = new Map()
    for (const b of bankFilterOptions) {
      m.set(String(b.id), b)
    }
    return m
  }, [bankFilterOptions])

  const internalCurrencyOptions = useMemo(() => {
    const acc = internalForm.from_account_id ? accountById.get(String(internalForm.from_account_id)) : null
    const codes = acc ? treasuryAccountDisplayCurrencies(acc) : sortTreasuryCurrencyCodes(['EGP', 'USD', 'EUR'])
    return codes.length ? codes : ['USD']
  }, [accountById, internalForm.from_account_id])

  const exchangePreviewMult = useMemo(() => {
    if (exchangeForm.rate_mode !== 'auto') return null
    if (exchangeForm.from_currency === exchangeForm.to_currency) return null
    const pairs = dailyFxResponse?.data?.pairs
    return treasuryOfficialFxMultiplier(exchangeForm.from_currency, exchangeForm.to_currency, pairs)
  }, [exchangeForm.rate_mode, exchangeForm.from_currency, exchangeForm.to_currency, dailyFxResponse])

  const exchangePreviewToAmount = useMemo(() => {
    const amt = Number(exchangeForm.amount)
    if (!Number.isFinite(amt) || amt <= 0 || exchangePreviewMult == null) return null
    return amt * exchangePreviewMult
  }, [exchangeForm.amount, exchangePreviewMult])

  const exportEntriesCsv = () => {
    const headers = [
      t('treasury.colDate'),
      t('treasury.colDescription'),
      t('treasury.colTransactionType', 'Transaction type'),
      t('treasury.colAccount', 'Account'),
      t('treasury.colDebit', 'Debit'),
      t('treasury.colCredit', 'Credit'),
      t('treasury.colBalance', 'Balance'),
      t('treasury.colCurrency'),
    ]
    const lines = [headers.map(escapeCsvCell).join(',')]
    for (const row of entries) {
      const rb = runningById.get(row.id)
      const amt = Number(row.amount)
      const debit = Number.isFinite(amt) && amt > 0 ? formatPlainAmount(amt) : ''
      const credit = Number.isFinite(amt) && amt < 0 ? formatPlainAmount(Math.abs(amt)) : ''
      const acct =
        row.account_id != null ? accountIdToLabel.get(String(row.account_id)) ?? `#${row.account_id}` : '—'
      lines.push(
        [
          row.entry_date,
          [row.description, row.reference_label].filter(Boolean).join(' · ') || '',
          transactionTypeLabel(row, t),
          acct,
          debit,
          credit,
          rb != null ? formatPlainAmount(rb.running) : '',
          row.currency_code || '',
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

  /**
   * Unified balance renderer for both bank accounts and operational treasury accounts.
   * Always shows every supported currency — zero balances render as `0.00` with a muted
   * `--zero` modifier and a "supported" tag, so users can always see which currencies an
   * account is configured to hold even when it has no funds in them.
   */
  const renderAccountBalances = (account) => {
    const supported = treasuryAccountDisplayCurrencies(account)
    if (!supported.length) {
      return (
        <p className="treasury-acc-balances-empty">{t('treasury.bankOverview.noCurrenciesConfigured')}</p>
      )
    }
    const byCur = normalizeBalanceByCurrency(account.balance_by_currency)
    const rows = treasurySupportedCurrencyRows(account, byCur)
    return (
      <ul className="treasury-acc-currency-badge-list" role="list">
        {rows.map(({ code, amount, isZero }) => (
          <li
            key={code}
            className={`treasury-acc-currency-badge-row${isZero ? ' treasury-acc-currency-badge-row--zero' : ''}`}
          >
            <span
              className={`treasury-acc-currency-pill treasury-acc-currency-pill--${treasuryCurrencyBadgeVariant(code)}`}
            >
              {code}
            </span>
            <span className="treasury-acc-currency-amount" dir="ltr" lang="en">
              {formatPlainAmount(amount)}
            </span>
            {isZero ? (
              <span className="treasury-acc-currency-supported" aria-label={t('treasury.bankOverview.currencySupported')}>
                {t('treasury.bankOverview.currencySupported')}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    )
  }

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
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.total_balance_by_currency}
                  size="sm"
                  amountFirst
                  numberLocale={TREASURY_NUMBER_LOCALE}
                  zeroFallbackCurrencies={TREASURY_STAT_FALLBACK_CURRENCIES}
                />
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
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.total_customer_in_by_currency}
                  size="sm"
                  amountFirst
                  numberLocale={TREASURY_NUMBER_LOCALE}
                  zeroFallbackCurrencies={TREASURY_STAT_FALLBACK_CURRENCIES}
                />
              )
            }
            icon={<Receipt className="h-4 w-4" aria-hidden />}
            variant="amber"
          />
          <StatsCard
            className="accountings-stat-card"
            title={
              <>
                {t('treasury.bankOverview.customerOutstanding')}
                <span className="treasury-stat-subtitle">
                  ({t('treasury.bankOverview.customerOutstandingSubtitle')})
                </span>
              </>
            }
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.customer_outstanding_receivables_by_currency}
                  size="sm"
                  amountFirst
                  numberLocale={TREASURY_NUMBER_LOCALE}
                  zeroFallbackCurrencies={TREASURY_STAT_FALLBACK_CURRENCIES}
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
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.total_partner_out_by_currency}
                  size="sm"
                  amountFirst
                  numberLocale={TREASURY_NUMBER_LOCALE}
                  zeroFallbackCurrencies={TREASURY_STAT_FALLBACK_CURRENCIES}
                />
              )
            }
            icon={<Send className="h-4 w-4" aria-hidden />}
            variant="blue"
          />
          <StatsCard
            className="accountings-stat-card"
            title={
              <>
                {t('treasury.bankOverview.partnerLiabilities')}
                <span className="treasury-stat-subtitle">
                  ({t('treasury.bankOverview.partnerLiabilitiesSubtitle')})
                </span>
              </>
            }
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.partner_liabilities_outstanding_by_currency}
                  size="sm"
                  amountFirst
                  numberLocale={TREASURY_NUMBER_LOCALE}
                  zeroFallbackCurrencies={TREASURY_STAT_FALLBACK_CURRENCIES}
                />
              )
            }
            icon={<Building2 className="h-4 w-4" aria-hidden />}
            variant="default"
          />
        </div>
      </section>

      <section className="treasury-fx-section mb-4" aria-labelledby="treasury-fx-heading">
        <div className="treasury-rate-bar" role="region" aria-label={t('treasury.exchange.ratesPanelAria')}>
          <header className="treasury-fx-heading">
            <h2 id="treasury-fx-heading" className="treasury-fx-title">
              {t('treasury.exchange.dailyTitle')}
            </h2>
            <p className="treasury-fx-subtitle">
              {treasuryFxOk && dailyFxResponse?.data?.as_of
                ? t('treasury.exchange.dailySubtitle', {
                    date: formatTreasuryFxSectionDate(dailyFxResponse.data.as_of),
                  })
                : t('treasury.exchange.dailySubtitleSource')}
            </p>
          </header>
          <div className="treasury-rate-bar-items">
            {dailyFxLoading ? (
              <span className="treasury-rate-bar-status">{t('treasury.exchange.loading')}</span>
            ) : treasuryFxOk ? (
              <>
                {treasuryFxPairs.map((p, idx) => (
                  <Fragment key={p.id}>
                    {idx > 0 ? <div className="treasury-rate-sep" aria-hidden /> : null}
                    <div className="treasury-rate-item" title={t(`treasury.exchange.pairExplain.${p.id}`)}>
                      <span className="treasury-rate-lbl">{t(p.label_key)}</span>
                      <span className="treasury-rate-val">{formatTreasuryFxPair(p)}</span>
                    </div>
                  </Fragment>
                ))}
              </>
            ) : (
              <span className="treasury-rate-bar-status">{t('treasury.exchange.unavailable')}</span>
            )}
          </div>
          <button
            type="button"
            className="treasury-rate-refresh"
            onClick={() => loadDailyFx()}
            disabled={dailyFxLoading}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span>{t('treasury.exchange.refresh')}</span>
          </button>
        </div>
      </section>

      {bankOverviewLoading ? (
        <div className="treasury-banks-loading treasury-banks-loading--sections mb-4">
          <LoaderDots />
        </div>
      ) : (
        <>
          <div className="treasury-sec-title mb-2">{t('treasury.sections.bankAccounts')}</div>
          <div className="treasury-accounts-grid mb-4">
            {bankAccountsRows.length ? (
              bankAccountsRows.map((bank, idx) => {
                const active = String(selectedBankId) === String(bank.id)
                const bandMod = idx % 6
                return (
                  <button
                    key={`bank-${bank.id}`}
                    type="button"
                    className={`treasury-acc-card treasury-acc-card--bank treasury-acc-card--band-${bandMod}${
                      active ? ' treasury-acc-card--active' : ''
                    }`}
                    onClick={() => {
                      setEntries([])
                      setSelectedBankId((prev) => (String(prev) === String(bank.id) ? '' : String(bank.id)))
                    }}
                  >
                    <div className={`treasury-acc-band treasury-acc-band--${bandMod}`} aria-hidden />
                    <div className="treasury-acc-body">
                      <div className="treasury-acc-header">
                        <span className="treasury-acc-kicker">
                          <Landmark className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          {t('treasury.bankOverview.account')}
                        </span>
                        <span className="treasury-acc-headline">
                          <span className="treasury-acc-name">{bank.bank_name}</span>
                          {bank.account_name ? (
                            <>
                              <span className="treasury-acc-sep" aria-hidden>
                                {' / '}
                              </span>
                              <span className="treasury-acc-name">{bank.account_name}</span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      {bank.account_number || bank.iban ? (
                        <div className="treasury-acc-sub">{bank.account_number || bank.iban}</div>
                      ) : null}
                      <div className="treasury-acc-balances">{renderAccountBalances(bank)}</div>
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="treasury-muted treasury-accounts-grid__empty">{t('treasury.bankOverview.noBankAccountsSection')}</p>
            )}
          </div>

          <div className="treasury-sec-title mb-2 treasury-sec-title--spaced">{t('treasury.sections.cashWallets')}</div>
          <div className="treasury-accounts-grid mb-4">
            {cashWalletRows.length ? (
              cashWalletRows.map((box, idx) => {
                const active = String(selectedBankId) === String(box.id)
                const bandMod = idx % 6
                return (
                  <button
                    key={`cash-${box.id}`}
                    type="button"
                    className={`treasury-acc-card treasury-acc-card--cash treasury-acc-card--band-${bandMod}${
                      active ? ' treasury-acc-card--active' : ''
                    }`}
                    onClick={() => {
                      setEntries([])
                      setSelectedBankId((prev) => (String(prev) === String(box.id) ? '' : String(box.id)))
                    }}
                  >
                    <div className={`treasury-acc-band treasury-acc-band--${bandMod}`} aria-hidden />
                    <div className="treasury-acc-body">
                      <div className="treasury-acc-header">
                        <span className="treasury-acc-kicker">
                          <Wallet className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          {t('treasury.cashWallet.kicker')}
                        </span>
                        <span className="treasury-acc-headline">
                          <span className="treasury-acc-name">{box.bank_name}</span>
                          {box.account_name ? (
                            <>
                              <span className="treasury-acc-sep" aria-hidden>
                                {' / '}
                              </span>
                              <span className="treasury-acc-name">{box.account_name}</span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      {box.account_number || box.iban ? (
                        <div className="treasury-acc-sub">{box.account_number || box.iban}</div>
                      ) : null}
                      <div className="treasury-acc-balances">{renderAccountBalances(box)}</div>
                    </div>
                  </button>
                )
              })
            ) : null /* Operational treasury accounts are auto-seeded server-side; this branch should never hit. */}
          </div>
        </>
      )}

      <section className="treasury-movements-section" aria-labelledby="treasury-movements-title">
        <div className="treasury-movements-head">
          <h2 id="treasury-movements-title" className="treasury-section-title treasury-movements-head__title">
            {t('treasury.movementsTitle')}
          </h2>
          {canManageTreasury ? (
            <div className="treasury-movements-head__actions">
              <button
                type="button"
                className="accountings-btn accountings-btn--small accountings-btn--primary treasury-movements-action-btn"
                onClick={() => {
                  setTransferModalError(null)
                  setTransferModalOpen(true)
                }}
              >
                <ArrowRightLeft className="h-4 w-4" aria-hidden />
                {t('treasury.actions.internalTransfer')}
              </button>
              <button
                type="button"
                className="accountings-btn accountings-btn--small accountings-btn--primary treasury-movements-action-btn"
                onClick={() => {
                  setExchangeModalError(null)
                  setExchangeModalOpen(true)
                }}
              >
                <Repeat2 className="h-4 w-4" aria-hidden />
                {t('treasury.actions.currencyExchange')}
              </button>
            </div>
          ) : null}
        </div>

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
                <option value="">{t('treasury.bankOverview.allBanks', 'All banks and cash wallets')}</option>
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
                <option value="exchange">{t('treasury.typeExchange')}</option>
                <option value="transfer">{t('treasury.typeTransfer')}</option>
                <option value="expense">{t('treasury.typeExpense')}</option>
              </select>
              <select
                className="clients-input min-w-[120px]"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                aria-label={t('treasury.currency')}
              >
                <option value="">{t('treasury.allCurrencies')}</option>
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
                <th className="treasury-ledger-th">{t('treasury.colDate')}</th>
                <th className="treasury-ledger-th">{t('treasury.colDescription')}</th>
                <th className="treasury-ledger-th">{t('treasury.colTransactionType', 'Transaction type')}</th>
                <th className="treasury-ledger-th">{t('treasury.colAccount', 'Account')}</th>
                <th className="treasury-ledger-th treasury-ledger-th--end">
                  {t('treasury.colDebit', 'Debit')}
                </th>
                <th className="treasury-ledger-th treasury-ledger-th--end">
                  {t('treasury.colCredit', 'Credit')}
                </th>
                <th className="treasury-ledger-th treasury-ledger-th--end">{t('treasury.colBalance', 'Balance')}</th>
              </tr>
            </thead>
            <tbody>
              {entriesLoading && (
                <tr>
                  <td colSpan={7}>
                    <LoaderDots />
                  </td>
                </tr>
              )}
              {!entriesLoading &&
                pagedEntries.map((row) => {
                  const rb = runningById.get(row.id)
                  const txnKey = deriveTransactionTypeKey(row)
                  const descParts = [row.description, row.reference_label].filter(Boolean)
                  if (row.is_voided && row.voided_original_amount != null && Number.isFinite(row.voided_original_amount)) {
                    const orig = Math.abs(Number(row.voided_original_amount))
                    descParts.push(
                      t('treasury.voidedOriginalHint', {
                        amount: orig.toLocaleString(locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                        currency: row.currency_code || '',
                      })
                    )
                  }
                  const desc = descParts.join(' · ') || '—'
                  const amt = Number(row.amount)
                  const debitCell =
                    Number.isFinite(amt) && amt > 0 ? (
                      <div className="treasury-ledger-money treasury-ledger-money--incoming">
                        <CurrencyMapBadges
                          value={singleCurrencyMap(amt, row.currency_code)}
                          size="sm"
                          amountFirst
                          numberLocale={TREASURY_NUMBER_LOCALE}
                        />
                      </div>
                    ) : (
                      '—'
                    )
                  const creditCell =
                    Number.isFinite(amt) && amt < 0 ? (
                      <div className="treasury-ledger-money treasury-ledger-money--outgoing">
                        <CurrencyMapBadges
                          value={singleCurrencyMap(Math.abs(amt), row.currency_code)}
                          size="sm"
                          amountFirst
                          numberLocale={TREASURY_NUMBER_LOCALE}
                        />
                      </div>
                    ) : (
                      '—'
                    )
                  const acctLabel =
                    row.account_id != null
                      ? accountIdToLabel.get(String(row.account_id)) ?? `#${row.account_id}`
                      : '—'
                  const txnClassBase = TXN_TYPE_CLASS[txnKey] ?? TXN_TYPE_CLASS.other
                  const txnClassName = row.is_voided
                    ? `${txnClassBase} treasury-txn-type--voided`.trim()
                    : txnClassBase
                  return (
                    <tr
                      key={row.id}
                      className={`treasury-ledger-row${row.is_voided ? ' treasury-ledger-row--voided' : ''}`}
                    >
                      <td className="treasury-ledger-cell whitespace-nowrap">{row.entry_date}</td>
                      <td className="treasury-ledger-cell max-w-[min(28rem,55vw)]">{desc}</td>
                      <td className="treasury-ledger-cell">
                        <span className={`treasury-txn-type ${txnClassName}`}>
                          {transactionTypeLabel(row, t)}
                        </span>
                      </td>
                      <td className="treasury-ledger-cell max-w-[14rem]">{acctLabel}</td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--end">{debitCell}</td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--end">{creditCell}</td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--end">
                        {rb != null ? (
                          <CurrencyMapBadges
                            value={singleCurrencyMap(rb.running, row.currency_code)}
                            size="sm"
                            amountFirst
                            numberLocale={TREASURY_NUMBER_LOCALE}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              {!entriesLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="accountings-empty">
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

        {transferModalOpen && (
          <div className="accountings-modal" role="dialog" aria-modal="true" aria-labelledby="treasury-modal-transfer-title">
            <button
              type="button"
              className="accountings-modal-backdrop"
              disabled={transferSubmitting}
              onClick={() => setTransferModalOpen(false)}
              aria-label={t('treasury.close')}
            />
            <div className="accountings-modal-content">
              <h2 id="treasury-modal-transfer-title">{t('treasury.actions.internalTransferTitle')}</h2>
              <p className="treasury-modal-lead">{t('treasury.actions.internalTransferLead')}</p>
              {transferModalError ? (
                <p className="accountings-error treasury-modal-error" role="alert">
                  {transferModalError}
                </p>
              ) : null}
              <form
                className="treasury-modal-grid treasury-modal-grid--2 accountings-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!token || !canManageTreasury) return
                  const fromId = internalForm.from_account_id
                  const toId = internalForm.to_account_id
                  if (!fromId || !toId || fromId === toId) {
                    setTransferModalError(t('treasury.actions.transferInvalidAccounts'))
                    return
                  }
                  const fromAcc = accountById.get(String(fromId))
                  const toAcc = accountById.get(String(toId))
                  const amt = Number(internalForm.amount)
                  if (!Number.isFinite(amt) || amt <= 0) {
                    setTransferModalError(t('treasury.actions.invalidAmount'))
                    return
                  }
                  setTransferSubmitting(true)
                  setTransferModalError(null)
                  try {
                    await createTreasuryTransfer(token, {
                      from_account: treasuryAccountOptionLabel(fromAcc),
                      to_account: treasuryAccountOptionLabel(toAcc),
                      from_account_id: Number(fromId),
                      to_account_id: Number(toId),
                      from_amount: amt,
                      from_currency: internalForm.currency_code,
                      to_currency: internalForm.currency_code,
                      entry_date: internalForm.entry_date,
                      description: internalForm.description.trim() || undefined,
                    })
                    setTransferModalOpen(false)
                    loadBankOverview()
                    loadEntries()
                  } catch (err) {
                    setTransferModalError(err?.message || String(err))
                  } finally {
                    setTransferSubmitting(false)
                  }
                }}
              >
                <label className="treasury-modal-field">
                  <span>{t('treasury.fromAccount')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={internalForm.from_account_id}
                    onChange={(e) =>
                      setInternalForm((p) => ({ ...p, from_account_id: e.target.value }))
                    }
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {bankFilterOptions.map((b) => (
                      <option key={`tf-${b.id}`} value={String(b.id)}>
                        {treasuryAccountOptionLabel(b)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.toAccount')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={internalForm.to_account_id}
                    onChange={(e) =>
                      setInternalForm((p) => ({ ...p, to_account_id: e.target.value }))
                    }
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {bankFilterOptions
                      .filter((b) => String(b.id) !== String(internalForm.from_account_id))
                      .map((b) => (
                        <option key={`tt-${b.id}`} value={String(b.id)}>
                          {treasuryAccountOptionLabel(b)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.amount')}</span>
                  <input
                    className="clients-input w-full"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={internalForm.amount}
                    onChange={(e) => setInternalForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.currency')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={internalForm.currency_code}
                    onChange={(e) =>
                      setInternalForm((p) => ({ ...p, currency_code: e.target.value }))
                    }
                  >
                    {internalCurrencyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="treasury-modal-field treasury-modal-field--full">
                  <span>{t('treasury.entryDate')}</span>
                  <input
                    className="clients-input w-full"
                    type="date"
                    required
                    value={internalForm.entry_date}
                    onChange={(e) =>
                      setInternalForm((p) => ({ ...p, entry_date: e.target.value }))
                    }
                  />
                </label>
                <label className="treasury-modal-field treasury-modal-field--full">
                  <span>{t('treasury.description')}</span>
                  <input
                    className="clients-input w-full"
                    value={internalForm.description}
                    onChange={(e) =>
                      setInternalForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </label>
                <div className="treasury-modal-actions treasury-modal-field--full">
                  <button
                    type="button"
                    className="accountings-btn"
                    disabled={transferSubmitting}
                    onClick={() => setTransferModalOpen(false)}
                  >
                    {t('treasury.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="accountings-btn accountings-btn--primary"
                    disabled={transferSubmitting}
                  >
                    {transferSubmitting ? t('treasury.saving') : t('treasury.actions.submitTransfer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {exchangeModalOpen && (
          <div className="accountings-modal" role="dialog" aria-modal="true" aria-labelledby="treasury-modal-exchange-title">
            <button
              type="button"
              className="accountings-modal-backdrop"
              disabled={exchangeSubmitting}
              onClick={() => setExchangeModalOpen(false)}
              aria-label={t('treasury.close')}
            />
            <div className="accountings-modal-content">
              <h2 id="treasury-modal-exchange-title">{t('treasury.actions.currencyExchangeTitle')}</h2>
              <p className="treasury-modal-lead">{t('treasury.actions.currencyExchangeLead')}</p>
              {exchangeModalError ? (
                <p className="accountings-error treasury-modal-error" role="alert">
                  {exchangeModalError}
                </p>
              ) : null}
              <form
                className="treasury-modal-grid treasury-modal-grid--2 accountings-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!token || !canManageTreasury) return
                  const fromId = exchangeForm.from_account_id
                  const toId = exchangeForm.to_account_id
                  if (!fromId || !toId || fromId === toId) {
                    setExchangeModalError(t('treasury.actions.transferInvalidAccounts'))
                    return
                  }
                  if (exchangeForm.from_currency === exchangeForm.to_currency) {
                    setExchangeModalError(t('treasury.actions.sameCurrencyExchange'))
                    return
                  }
                  if (exchangeForm.rate_mode === 'auto' && exchangePreviewMult == null) {
                    setExchangeModalError(t('treasury.actions.fxUnavailable'))
                    return
                  }
                  const fromAcc = accountById.get(String(fromId))
                  const toAcc = accountById.get(String(toId))
                  const amt = Number(exchangeForm.amount)
                  if (!Number.isFinite(amt) || amt <= 0) {
                    setExchangeModalError(t('treasury.actions.invalidAmount'))
                    return
                  }
                  if (exchangeForm.rate_mode === 'manual') {
                    const r = Number(exchangeForm.fx_rate)
                    if (!Number.isFinite(r) || r <= 0) {
                      setExchangeModalError(t('treasury.actions.invalidFxRate'))
                      return
                    }
                  }
                  setExchangeSubmitting(true)
                  setExchangeModalError(null)
                  try {
                    const payload = {
                      from_account: treasuryAccountOptionLabel(fromAcc),
                      to_account: treasuryAccountOptionLabel(toAcc),
                      from_account_id: Number(fromId),
                      to_account_id: Number(toId),
                      from_amount: amt,
                      from_currency: exchangeForm.from_currency,
                      to_currency: exchangeForm.to_currency,
                      entry_date: exchangeForm.entry_date,
                      description: exchangeForm.description.trim() || undefined,
                      exchange_rate_source: exchangeForm.rate_mode === 'auto' ? 'AUTO' : 'MANUAL',
                    }
                    if (exchangeForm.rate_mode === 'manual') {
                      payload.fx_rate = Number(exchangeForm.fx_rate)
                    }
                    await createTreasuryTransfer(token, payload)
                    setExchangeModalOpen(false)
                    loadBankOverview()
                    loadEntries()
                  } catch (err) {
                    setExchangeModalError(err?.message || String(err))
                  } finally {
                    setExchangeSubmitting(false)
                  }
                }}
              >
                <label className="treasury-modal-field">
                  <span>{t('treasury.fromAccount')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={exchangeForm.from_account_id}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, from_account_id: e.target.value }))
                    }
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {bankFilterOptions.map((b) => (
                      <option key={`xf-${b.id}`} value={String(b.id)}>
                        {treasuryAccountOptionLabel(b)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.toAccount')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={exchangeForm.to_account_id}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, to_account_id: e.target.value }))
                    }
                  >
                    <option value="">{t('treasury.selectAccount')}</option>
                    {bankFilterOptions
                      .filter((b) => String(b.id) !== String(exchangeForm.from_account_id))
                      .map((b) => (
                        <option key={`xt-${b.id}`} value={String(b.id)}>
                          {treasuryAccountOptionLabel(b)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.actions.fromCurrency')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={exchangeForm.from_currency}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, from_currency: e.target.value }))
                    }
                  >
                    {['USD', 'EUR', 'EGP'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.actions.toCurrency')}</span>
                  <select
                    className="clients-input w-full"
                    required
                    value={exchangeForm.to_currency}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, to_currency: e.target.value }))
                    }
                  >
                    {['USD', 'EUR', 'EGP'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.amount')}</span>
                  <input
                    className="clients-input w-full"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={exchangeForm.amount}
                    onChange={(e) => setExchangeForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <label className="treasury-modal-field">
                  <span>{t('treasury.entryDate')}</span>
                  <input
                    className="clients-input w-full"
                    type="date"
                    required
                    value={exchangeForm.entry_date}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, entry_date: e.target.value }))
                    }
                  />
                </label>
                <label className="treasury-modal-field treasury-modal-field--full">
                  <span>{t('treasury.actions.exchangeRateMode')}</span>
                  <select
                    className="clients-input w-full"
                    value={exchangeForm.rate_mode}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, rate_mode: e.target.value }))
                    }
                  >
                    <option value="auto">{t('treasury.actions.rateModeAuto')}</option>
                    <option value="manual">{t('treasury.actions.rateModeManual')}</option>
                  </select>
                </label>
                {exchangeForm.rate_mode === 'manual' ? (
                  <label className="treasury-modal-field treasury-modal-field--full">
                    <span>{t('treasury.actions.manualFxRateHint')}</span>
                    <input
                      className="clients-input w-full"
                      type="number"
                      min="0"
                      step="any"
                      required={exchangeForm.rate_mode === 'manual'}
                      value={exchangeForm.fx_rate}
                      onChange={(e) =>
                        setExchangeForm((p) => ({ ...p, fx_rate: e.target.value }))
                      }
                    />
                  </label>
                ) : (
                  <div className="treasury-modal-field treasury-modal-field--full treasury-modal-preview">
                    <span className="treasury-modal-preview__label">{t('treasury.actions.fxPreviewLabel')}</span>
                    <p className="treasury-modal-preview__body">
                      {exchangePreviewMult != null && exchangePreviewToAmount != null
                        ? t('treasury.actions.fxPreviewLine', {
                            rate: formatPlainAmount(exchangePreviewMult),
                            amount: formatPlainAmount(exchangePreviewToAmount),
                            cur: exchangeForm.to_currency,
                          })
                        : t('treasury.actions.fxUnavailable')}
                    </p>
                  </div>
                )}
                <label className="treasury-modal-field treasury-modal-field--full">
                  <span>{t('treasury.description')}</span>
                  <input
                    className="clients-input w-full"
                    value={exchangeForm.description}
                    onChange={(e) =>
                      setExchangeForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </label>
                <div className="treasury-modal-actions treasury-modal-field--full">
                  <button
                    type="button"
                    className="accountings-btn"
                    disabled={exchangeSubmitting}
                    onClick={() => setExchangeModalOpen(false)}
                  >
                    {t('treasury.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="accountings-btn accountings-btn--primary"
                    disabled={exchangeSubmitting}
                  >
                    {exchangeSubmitting ? t('treasury.saving') : t('treasury.actions.submitExchange')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
      </div>
    </Container>
  )
}
