import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
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
  Eye,
  RotateCcw,
  Wallet,
  HandCoins,
  Send,
  Building2,
} from 'lucide-react'
import '../../components/PageHeader/PageHeader.css'
import '../Clients/Clients.css'
import '../Accountings/Accountings.css'
import '../Accountings/CurrencyMapBadges.css'
import { CurrencyMapBadges, CurrencyCodeBadge } from '../Accountings/CurrencyMapBadges'
import { StatsCard } from '../../components/StatsCard'
import Pagination from '../../components/Pagination'
import './Treasury.css'

function singleCurrencyMap(amount, currencyCode) {
  const cur = String(currencyCode || 'USD').toUpperCase()
  return { [cur]: Number(amount) || 0 }
}

/** Western digits (0–9) for all treasury figures; independent of UI language. */
const TREASURY_NUMBER_LOCALE = 'en-US'

function formatAmount(amount, currency) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  const cur = currency || 'USD'
  try {
    return new Intl.NumberFormat(TREASURY_NUMBER_LOCALE, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${cur}`
  }
}

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

function formatTreasuryAsOf(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return ''
  try {
    const d = new Date(`${isoDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return isoDate
    return d.toLocaleDateString(TREASURY_NUMBER_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return isoDate
  }
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

/** Supported currencies first (when configured); otherwise currencies present in the ledger map. */
function treasuryBankDisplayCurrencies(bank) {
  const supported = Array.isArray(bank?.supported_currencies) ? bank.supported_currencies : []
  const fromSupported = sortTreasuryCurrencyCodes(supported)
  if (fromSupported.length > 0) return fromSupported
  const bal = normalizeBalanceByCurrency(bank?.balance_by_currency)
  return sortTreasuryCurrencyCodes(Object.keys(bal))
}

/** One line: two decimals + ISO code (e.g. "30.00 USD"). */
function formatPlainAmountWithCode(amount, currencyCode) {
  const code = String(currencyCode || '').toUpperCase()
  return `${formatPlainAmount(amount)} ${code}`.trim()
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

/**
 * Classify a treasury entry as credit (cash in, دائن) or debit (cash out, مدين).
 * Driven by the signed amount returned by the API ('in' → +, 'out'/'transfer'/'exchange' → -),
 * never by parsing the +/- glyph in the displayed string.
 */
function deriveFinancialType(row) {
  const amt = Number(row?.amount)
  if (!Number.isFinite(amt) || amt === 0) return 'neutral'
  return amt > 0 ? 'credit' : 'debit'
}

function financialTypeLabel(row, t) {
  const k = deriveFinancialType(row)
  if (k === 'credit') return t('treasury.financialType.credit', 'Credit')
  if (k === 'debit') return t('treasury.financialType.debit', 'Debit')
  return t('treasury.financialType.neutral', '—')
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
  const [dailyFxResponse, setDailyFxResponse] = useState(null)
  const [dailyFxLoading, setDailyFxLoading] = useState(true)
  const [selectedBankId, setSelectedBankId] = useState('')
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState(null)

  /** @type {[object | null, (r: object | null) => void]} */
  const [entryViewRow, setEntryViewRow] = useState(null)

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
  }, [debouncedSearch, typeFilter, currencyFilter, selectedBankId, fromDate, toDate, sortKey])

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

  const bankFilterOptions = useMemo(() => {
    if (bankLedgerOverview?.banks?.length) return bankLedgerOverview.banks
    return []
  }, [bankLedgerOverview])

  const exportEntriesCsv = () => {
    const headers = [
      t('treasury.colDate'),
      t('treasury.colFlow', 'Flow'),
      t('treasury.colDescription'),
      t('treasury.colFinancialType', 'Financial type'),
      t('treasury.colAmount'),
      t('treasury.colCurrency'),
      t('treasury.colReference', 'Reference'),
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
          financialTypeLabel(row, t),
          formatPlainAmount(row.amount),
          row.currency_code,
          row.reference_label || '',
          rb != null ? formatPlainAmount(rb.running) : '',
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
                {t('treasury.bankOverview.partnerPayables')}
                <span className="treasury-stat-subtitle">
                  ({t('treasury.bankOverview.partnerPayablesSubtitle')})
                </span>
              </>
            }
            value={
              bankOverviewLoading ? (
                <span className="treasury-muted">…</span>
              ) : (
                <CurrencyMapBadges
                  value={bankLedgerOverview?.global?.partner_payables_outstanding_by_currency}
                  size="sm"
                  amountFirst
                  numberLocale={TREASURY_NUMBER_LOCALE}
                />
              )
            }
            icon={<Building2 className="h-4 w-4" aria-hidden />}
            variant="default"
          />
        </div>
      </section>

      <section
        className="treasury-fx-section mb-4"
        aria-labelledby="treasury-fx-heading"
      >
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

        <div
          className="treasury-rate-bar"
          role="region"
          aria-label={t('treasury.exchange.ratesPanelAria')}
        >
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

        {treasuryFxOk ? (
          <p className="treasury-fx-footnote">{t('treasury.exchange.ratesFootnote')}</p>
        ) : null}
      </section>

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
                    {/* Line 1: kicker label + combined account name (bank / account_name) on a single row. */}
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
                    {/* Line 2: subtitle (account number or IBAN) on its own line, smaller font. */}
                    {bank.account_number || bank.iban ? (
                      <div className="treasury-acc-sub">{bank.account_number || bank.iban}</div>
                    ) : null}
                    <div className="treasury-acc-balances">
                      <div className="treasury-acc-balances-label">{t('treasury.bankOverview.currencyBalances')}</div>
                      {(() => {
                        const byCur = normalizeBalanceByCurrency(bank.balance_by_currency)
                        const codes = treasuryBankDisplayCurrencies(bank)
                        if (!codes.length) {
                          return (
                            <p className="treasury-acc-balances-empty">{t('treasury.bankOverview.noCurrenciesConfigured')}</p>
                          )
                        }
                        return (
                          <ul className="treasury-acc-balance-list" role="list">
                            {codes.map((code) => (
                              <li key={code} className="treasury-acc-balance-line">
                                <span className="treasury-acc-balance-amount" dir="ltr" lang="en">
                                  {formatPlainAmountWithCode(byCur[code] ?? 0, code)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )
                      })()}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <p className="treasury-muted">{t('treasury.bankOverview.noBanks', 'No active bank accounts.')}</p>
          ))}
      </div>

      <section className="treasury-movements-section" aria-labelledby="treasury-movements-title">
        <h2 id="treasury-movements-title" className="treasury-section-title">
          {t('treasury.movementsTitle')}
        </h2>

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
                <th className="treasury-ledger-th">{t('treasury.colDate')}</th>
                <th className="treasury-ledger-th">{t('treasury.colFlow', 'Flow')}</th>
                <th className="treasury-ledger-th">{t('treasury.colDescription')}</th>
                <th className="treasury-ledger-th treasury-ledger-th--center">
                  {t('treasury.colFinancialType', 'Financial type')}
                </th>
                <th className="treasury-ledger-th treasury-ledger-th--end">{t('treasury.colAmount')}</th>
                <th className="treasury-ledger-th">{t('treasury.colReference', 'Reference')}</th>
                <th className="treasury-ledger-th treasury-ledger-th--end">{t('treasury.colRunning')}</th>
                <th className="treasury-ledger-th treasury-ledger-th--center">
                  {t('treasury.colActions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {entriesLoading && (
                <tr>
                  <td colSpan={8}>
                    <LoaderDots />
                  </td>
                </tr>
              )}
              {!entriesLoading &&
                pagedEntries.map((row) => {
                  const rb = runningById.get(row.id)
                  const runDisplay = rb != null ? formatPlainAmount(rb.running) : '—'
                  const flow = deriveFlowType(row)
                  const desc = [row.description, row.reference_label].filter(Boolean).join(' · ') || '—'
                  const ft = deriveFinancialType(row)
                  return (
                    <tr key={row.id} className="treasury-ledger-row">
                      <td className="treasury-ledger-cell whitespace-nowrap">{row.entry_date}</td>
                      <td className="treasury-ledger-cell">
                        <span className={`treasury-flow-badge treasury-flow-badge--${flow}`}>
                          {flowTypeLabel(row, t)}
                        </span>
                      </td>
                      <td className="treasury-ledger-cell max-w-[220px]">{desc}</td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--center">
                        <span
                          className={`treasury-finance-badge treasury-finance-badge--${ft}`}
                          aria-label={financialTypeLabel(row, t)}
                        >
                          {financialTypeLabel(row, t)}
                        </span>
                      </td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--end">
                        <CurrencyMapBadges
                          value={singleCurrencyMap(row.amount, row.currency_code)}
                          size="sm"
                          amountFirst
                          numberLocale={TREASURY_NUMBER_LOCALE}
                        />
                      </td>
                      <td
                        className="treasury-ledger-cell max-w-[180px] truncate"
                        title={row.reference_label || ''}
                      >
                        {row.reference_label || '—'}
                      </td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--end tabular-nums">
                        {runDisplay}
                      </td>
                      <td className="treasury-ledger-cell treasury-ledger-cell--center">
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
                  <td colSpan={8} className="accountings-empty">
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
      </section>

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
                <dd className="tabular-nums">{formatPlainAmount(entryViewRow.amount)}</dd>
                <dt>{t('treasury.colCurrency')}</dt>
                <dd>
                  <CurrencyCodeBadge code={entryViewRow.currency_code} />
                </dd>
                <dt>{t('treasury.colReference')}</dt>
                <dd>{entryViewRow.reference_label || '—'}</dd>
                <dt>{t('treasury.colRunning')}</dt>
                <dd className="tabular-nums">
                  {runningById.get(entryViewRow.id)?.running != null
                    ? formatPlainAmount(runningById.get(entryViewRow.id).running)
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
