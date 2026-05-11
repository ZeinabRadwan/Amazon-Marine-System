import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import { formatDate } from '../../utils/dateUtils'
import {
  listShipmentExpenses,
  listGeneralExpenses,
  listExpenseCategories,
  createExpenseCategory,
  createExpense,
  updateExpense,
  deleteExpense,
  exportExpensesCsv,
  uploadExpenseReceipt,
  downloadExpenseReceipt,
} from '../../api/expenses'
import { listBankAccounts } from '../../api/accountings'
import { getTreasuryBankOverview } from '../../api/treasury'
import { listShipments } from '../../api/shipments'
import { listClients } from '../../api/clients'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs/Tabs'
import '../../components/LoaderDots/LoaderDots.css'
import LineChart from '../../components/Charts/LineChart'
import PieChart from '../../components/Charts/PieChart'
import BarChart from '../../components/Charts/BarChart'
import '../../components/Charts/Charts.css'
import { StatsCard } from '../../components/StatsCard'
import {
  FileSpreadsheet,
  Plus,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  Wallet,
  Layers,
  Zap,
  Ship,
  User,
  ExternalLink,
  Download,
  Receipt,
  Repeat2,
  Megaphone,
} from 'lucide-react'
import '../../components/PageHeader/PageHeader.css'
import AsyncSelect from '../../components/AsyncSelect'
import '../Clients/Clients.css'
import '../Accountings/Accountings.css'
import '../Accountings/CurrencyMapBadges.css'
import { CurrencyMapBadges } from '../Accountings/CurrencyMapBadges'
import './Expenses.css'
import {
  CANONICAL_EXPENSE_CATEGORIES,
  CANONICAL_EXPENSE_CATEGORY_CODES,
  FORM_MARKETING_SUBCATEGORIES,
  isMarketingCategoryRecord,
} from '../../constants/expenseCanonicalCategories'

const EXT_KEY = 'ams.expenses.extensions.v1'

function loadExtensions() {
  try {
    const raw = localStorage.getItem(EXT_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function saveExtensionsAll(next) {
  try {
    localStorage.setItem(EXT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Calendar month name only (January … December), localized. month is 1–12. */
function monthNameOnly(month, locale) {
  const m = Number(month)
  if (!m || m < 1 || m > 12) return ''
  const loc = String(locale || '').startsWith('ar') ? 'ar-EG' : 'en-US'
  return new Date(2000, m - 1, 1).toLocaleDateString(loc, { month: 'long' })
}

/** Same as Treasury.jsx — western digits for badge amounts. */
const EXPENSE_AMOUNT_NUMBER_LOCALE = 'en-US'

function formatExpenseAmountDigits(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(EXPENSE_AMOUNT_NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function expenseSingleCurrencyMap(amount, currencyCode) {
  const cur = String(currencyCode || 'USD').toUpperCase()
  return { [cur]: Number(amount) || 0 }
}

function totalsCurrencyMapFromRows(rows) {
  const map = {}
  for (const r of rows) {
    const c = String(r.currency_code || 'USD').toUpperCase()
    map[c] = (Number(map[c]) || 0) + Number(r.amount || 0)
  }
  return map
}

function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

const defaultMonthParts = () => {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function shiftYm(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function ymString(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function normalizeExpenseRows(shipList, genList) {
  const seen = new Set()
  const out = []
  for (const row of shipList) {
    out.push({ ...row, _origin: 'shipment' })
    seen.add(row.id)
  }
  for (const row of genList) {
    if (seen.has(row.id)) continue
    out.push({
      ...row,
      shipment_id: row.shipment_id ?? null,
      bl_number: row.bl_number ?? '',
      vendor_name: row.vendor_name ?? '',
      _origin: 'general',
    })
    seen.add(row.id)
  }
  return out
}

function stripExpenseExt(row) {
  if (!row || typeof row !== 'object') return row
  const { ext: _ext, ...rest } = row
  return rest
}

function sumPlainAmount(rows) {
  return rows.reduce((s, r) => s + Number(r.amount || 0), 0)
}

function linkedType(row, ext) {
  if (row.shipment_id) return 'shipment'
  if (ext?.client_id) return 'customer'
  return 'none'
}

/** Main + optional marketing subcategory for grouped badge display ("Marketing · Google ads"). */
function expenseCategoryMainSub(row, ext, categories) {
  const cat = categories.find((c) => String(c.id) === String(row.expense_category_id))
  const canonical = CANONICAL_EXPENSE_CATEGORIES.find((d) => d.code === cat?.code)
  const main = canonical?.label ?? row.category_name ?? '—'
  const sub = (ext?.marketing_subcategory || ext?.marketing_source || '').trim()
  if (isMarketingCategoryRecord(cat) && sub) return { main, sub }
  return { main, sub: '' }
}

/** Primary category label for grouping insights (one row per expense category id). */
function categoryPrimaryLabel(row, categories) {
  const cat = categories.find((c) => String(c.id) === String(row.expense_category_id))
  const canonical = CANONICAL_EXPENSE_CATEGORIES.find((d) => d.code === cat?.code)
  return canonical?.label ?? row.category_name ?? '—'
}

/** List tab: fixed / variable / marketing / grand totals + currency maps (one pass per row set). */
function computeListSliceAnalytics(rows, categories) {
  const fixedRows = []
  const variableRows = []
  const marketingRows = []
  for (const r of rows) {
    const ext = r.ext || {}
    const kind = ext.expense_kind || 'variable'
    const cat = categories.find((c) => String(c.id) === String(r.expense_category_id))
    if (kind === 'fixed') fixedRows.push(r)
    else variableRows.push(r)
    if (isMarketingCategoryRecord(cat)) marketingRows.push(r)
  }
  return {
    fixedMap: totalsCurrencyMapFromRows(fixedRows.map(stripExpenseExt)),
    variableMap: totalsCurrencyMapFromRows(variableRows.map(stripExpenseExt)),
    marketingMap: totalsCurrencyMapFromRows(marketingRows.map(stripExpenseExt)),
    totalMap: totalsCurrencyMapFromRows(rows.map(stripExpenseExt)),
  }
}

/**
 * Single source for report analytics: line periods, category table/pie, linked bar, linked tables.
 * All amounts use numeric sum (same as tables/charts elsewhere on this page).
 */
function computeReportUnified(rows, rangeBounds, groupBy, locale, categories) {
  const { start, end } = rangeBounds
  const grandTotal = sumPlainAmount(rows.map(stripExpenseExt))

  const catMap = new Map()
  let linkedShipTotal = 0
  let linkedCustTotal = 0
  let linkedGenTotal = 0
  const shipmentGroups = new Map()
  const customerGroups = new Map()
  let shipmentExpenseCount = 0
  let customerExpenseCount = 0

  for (const r of rows) {
    const ext = r.ext || {}
    const amt = Number(r.amount || 0)

    const id = r.expense_category_id != null && r.expense_category_id !== '' ? String(r.expense_category_id) : ''
    const label = categoryPrimaryLabel(r, categories)
    const key = id || `—:${label}`
    const cp = catMap.get(key) || { categoryKey: key, label, total: 0 }
    cp.total += amt
    cp.label = label
    catMap.set(key, cp)

    if (r.shipment_id) {
      linkedShipTotal += amt
      shipmentExpenseCount += 1
      const sid = Number(r.shipment_id)
      const sg = shipmentGroups.get(sid) || {
        shipmentId: sid,
        blLabel: r.bl_number || `#${sid}`,
        total: 0,
        count: 0,
        clientId: null,
      }
      sg.total += amt
      sg.count += 1
      if (ext.client_id) sg.clientId = Number(ext.client_id)
      if (r.bl_number) sg.blLabel = r.bl_number
      shipmentGroups.set(sid, sg)
    } else if (ext.client_id) {
      linkedCustTotal += amt
      customerExpenseCount += 1
      const cid = Number(ext.client_id)
      const cg = customerGroups.get(cid) || { clientId: cid, total: 0, count: 0 }
      cg.total += amt
      cg.count += 1
      customerGroups.set(cid, cg)
    } else {
      linkedGenTotal += amt
    }
  }

  const categoryInsights = [...catMap.values()]
    .map((x) => ({
      ...x,
      pct: grandTotal > 0 ? (x.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const monthsList = enumerateMonthsInclusive(start, end)
  let periodSeries = []
  if (groupBy === 'month' && monthsList.length) {
    periodSeries = monthsList.map(({ year, month }) => {
      const ym = ymString(year, month)
      let total = 0
      for (const r of rows) {
        if ((r.expense_date || '').startsWith(ym)) total += Number(r.amount || 0)
      }
      return { periodKey: ym, periodLabel: ymToShortLabel(ym, locale), total }
    })
  } else if (groupBy === 'year') {
    const yearTotals = new Map()
    for (const r of rows) {
      const d = r.expense_date || ''
      const y = Number(d.slice(0, 4))
      if (!y) continue
      yearTotals.set(y, (yearTotals.get(y) || 0) + Number(r.amount || 0))
    }
    periodSeries = [...yearTotals.keys()]
      .sort((a, b) => a - b)
      .map((y) => ({
        periodKey: String(y),
        periodLabel: String(y),
        total: yearTotals.get(y) || 0,
      }))
  }

  return {
    grandTotal,
    periodSeries,
    categoryInsights,
    linkedShipTotal,
    linkedCustTotal,
    linkedGenTotal,
    shipmentExpenseCount,
    customerExpenseCount,
    shipmentAggregate: { total: linkedShipTotal, count: shipmentExpenseCount },
    customerAggregate: { total: linkedCustTotal, count: customerExpenseCount },
    shipmentGroups: [...shipmentGroups.values()].sort((a, b) => b.total - a.total),
    customerGroups: [...customerGroups.values()].sort((a, b) => b.total - a.total),
  }
}

const REPORT_PIE_SLICE_COLORS = [
  '#2563eb',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f43f5e',
  '#6366f1',
  '#14b8a6',
  '#a855f7',
]

function applyExpenseTableFilters(rows, filterCategory, filterExpenseKind, filterLinked) {
  let out = rows
  if (filterCategory) {
    out = out.filter((r) => String(r.expense_category_id) === filterCategory)
  }
  if (filterExpenseKind === 'fixed') {
    out = out.filter((r) => (r.ext?.expense_kind || 'variable') === 'fixed')
  } else if (filterExpenseKind === 'variable') {
    out = out.filter((r) => (r.ext?.expense_kind || 'variable') === 'variable')
  }
  if (filterLinked === 'shipment') {
    out = out.filter((r) => !!r.shipment_id)
  } else if (filterLinked === 'customer') {
    out = out.filter((r) => !r.shipment_id && !!r.ext?.client_id)
  } else if (filterLinked === 'none') {
    out = out.filter((r) => linkedType(r, r.ext) === 'none')
  }
  return out
}

/** Chart-friendly month label from API key `YYYY-MM`. */
function ymToShortLabel(ym, locale) {
  const parts = String(ym || '').split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  if (!y || !m || m < 1 || m > 12) return ym || ''
  const shortMonth = monthNameOnly(m, locale).slice(0, 3)
  return `${shortMonth} ${String(y).slice(-2)}`
}

function compareYm(a, b) {
  if (!a || !b) return 0
  if (a.year !== b.year) return a.year - b.year
  return a.month - b.month
}

/** Inclusive list of calendar months from start through end (both ends included). */
function enumerateMonthsInclusive(start, end) {
  const out = []
  if (!start || !end || compareYm(start, end) > 0) return out
  let y = start.year
  let m = start.month
  for (;;) {
    out.push({ year: y, month: m })
    if (y === end.year && m === end.month) break
    const n = shiftYm(y, m, 1)
    y = n.year
    m = n.month
    if (out.length > 240) break
  }
  return out
}

/** Fetch shipment + general expenses for each month in range and merge rows. */
async function fetchExpensesForRange(token, start, end, search) {
  const months = enumerateMonthsInclusive(start, end)
  if (!months.length) return []
  const q = search != null && String(search).trim() !== '' ? String(search).trim() : undefined
  const chunks = await Promise.all(
    months.map(async ({ year, month }) => {
      const ym = ymString(year, month)
      const [s, g] = await Promise.all([
        listShipmentExpenses(token, { month: ym, search: q }),
        listGeneralExpenses(token, { month: ym, search: q }),
      ])
      return normalizeExpenseRows(
        Array.isArray(s.data) ? s.data : [],
        Array.isArray(g.data) ? g.data : [],
      )
    }),
  )
  return chunks.flat()
}

const ALL_EXPENSE_CURRENCIES = ['USD', 'EUR', 'EGP']

/** Effective treasury ledger currencies for a bank / cash wallet (API adds `allowed_currencies`). */
function bankAccountAllowedCurrencies(acc) {
  if (!acc) return []
  if (Array.isArray(acc.allowed_currencies) && acc.allowed_currencies.length) {
    return acc.allowed_currencies
      .map((c) => String(c).toUpperCase().trim())
      .filter((c) => c.length === 3)
  }
  const kind = String(acc.treasury_account_kind || 'bank')
  if (kind === 'cash_wallet') {
    const w = acc.cash_wallet_kind
    if (w === 'nsp' || w === 'vodafone') return ['EGP']
    if (w === 'physical') return ['EGP', 'USD', 'EUR']
    return ['EGP']
  }
  const raw = acc.supported_currencies
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((c) => String(c).toUpperCase().trim()).filter((c) => c.length === 3))]
}

/** Account line for selector / tables: "CIB — Main → EGP, USD". */
function formatBankAccountLabel(acc) {
  if (!acc) return ''
  const parts = [acc.bank_name, acc.account_name].filter(Boolean)
  const name = parts.join(' — ') || String(acc.id)
  const codes = bankAccountAllowedCurrencies(acc)
  const curStr = codes.length ? codes.join(', ') : '—'
  return `${name} → ${curStr}`
}

/** Match legacy `payment_method` strings saved before treasury labels included currencies. */
function bankAccountLegacyPaymentMethodVariants(acc) {
  const out = new Set()
  if (!acc) return []
  out.add(formatBankAccountLabel(acc))
  const parts = [acc.bank_name, acc.account_name].filter(Boolean)
  const line = parts.join(' — ')
  const legacyCur = acc.currency_code ? String(acc.currency_code).trim() : ''
  if (line && legacyCur) out.add(`${line} (${legacyCur})`)
  if (line) out.add(line)
  return [...out]
}

export default function Expenses() {
  const { t, i18n } = useTranslation()
  const { hasPageAccess } = useAuthAccess()
  const token = getStoredToken()
  const locale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
  const isAr = locale.startsWith('ar')

  const canViewAccounting = hasPageAccess('expenses')
  const canManageAccounting = hasPageAccess('expenses')

  const dm = defaultMonthParts()
  const [filterYear, setFilterYear] = useState(dm.year)
  const [filterMonth, setFilterMonth] = useState(dm.month)

  const [listSearch, setListSearch] = useState('')
  const debouncedSearch = useDebounced(listSearch, 400)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterExpenseKind, setFilterExpenseKind] = useState('all')
  const [filterLinked, setFilterLinked] = useState('all')
  /** Page-level tabs: list vs analytics only (default: list). */
  const [mainTab, setMainTab] = useState('list')

  const [mergedRaw, setMergedRaw] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState(null)

  const [categories, setCategories] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [pendingReceiptPreviewUrl, setPendingReceiptPreviewUrl] = useState(null)
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null)
  const [viewReceiptMime, setViewReceiptMime] = useState('')
  const [viewReceiptFilename, setViewReceiptFilename] = useState('')
  const [viewReceiptLoading, setViewReceiptLoading] = useState(false)
  const [viewReceiptFailed, setViewReceiptFailed] = useState(false)
  const [clientOptions, setClientOptions] = useState([])
  const [shipmentOptions, setShipmentOptions] = useState([])

  const [extensions, setExtensions] = useState(() => loadExtensions())

  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const createReceiptInputRef = useRef(null)
  const [receiptDragActive, setReceiptDragActive] = useState(false)
  /** Reports tab: preset only drives the monthly line chart range; analytics use a fixed 12‑month window. */
  const [reportPreset, setReportPreset] = useState('last6')
  const [reportLineRawRows, setReportLineRawRows] = useState([])
  const [reportAnalyticsRawRows, setReportAnalyticsRawRows] = useState([])
  const [reportRangeLoading, setReportRangeLoading] = useState(false)
  /** Jan 1 … selected month of filterYear — same filters/search as list table footer. */
  const [listYtdRaw, setListYtdRaw] = useState([])
  const [listYtdLoading, setListYtdLoading] = useState(false)
  const [deleteExpenseId, setDeleteExpenseId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const filterYm = useMemo(() => ymString(filterYear, filterMonth), [filterYear, filterMonth])

  /** Line chart only — controlled by the single preset dropdown. */
  const reportLineBounds = useMemo(() => {
    const today = new Date()
    const endRolling = { year: today.getFullYear(), month: today.getMonth() + 1 }
    if (reportPreset === 'last1') {
      return { start: endRolling, end: endRolling }
    }
    if (reportPreset === 'last3') {
      return { start: shiftYm(endRolling.year, endRolling.month, -2), end: endRolling }
    }
    if (reportPreset === 'last6') {
      return { start: shiftYm(endRolling.year, endRolling.month, -5), end: endRolling }
    }
    const y = today.getFullYear()
    return { start: { year: y, month: 1 }, end: { year: y, month: 12 } }
  }, [reportPreset])

  /** Pie, bar, linked tables & compact summary — fixed rolling 12 months (not tied to preset UI). */
  const reportAnalyticsBounds = useMemo(() => {
    const today = new Date()
    const endRolling = { year: today.getFullYear(), month: today.getMonth() + 1 }
    return { start: shiftYm(endRolling.year, endRolling.month, -11), end: endRolling }
  }, [])

  const reportChartsFetchKey = useMemo(() => {
    const ls = reportLineBounds.start
    const le = reportLineBounds.end
    const as = reportAnalyticsBounds.start
    const ae = reportAnalyticsBounds.end
    return `${reportPreset}_${ymString(ls.year, ls.month)}_${ymString(le.year, le.month)}_${ymString(as.year, as.month)}_${ymString(ae.year, ae.month)}_${debouncedSearch || ''}`
  }, [reportPreset, reportLineBounds, reportAnalyticsBounds, debouncedSearch])

  const patchExtensions = useCallback((updater) => {
    setExtensions((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveExtensionsAll(next)
      return next
    })
  }, [])

  const removeExtension = useCallback((id) => {
    patchExtensions((prev) => {
      const n = { ...prev }
      delete n[id]
      return n
    })
  }, [patchExtensions])

  const loadUnified = useCallback(async () => {
    if (!token || !canViewAccounting) return
    setLoading(true)
    setListError(null)
    try {
      const ym = ymString(filterYear, filterMonth)
      const [sRes, gRes] = await Promise.all([
        listShipmentExpenses(token, { search: debouncedSearch || undefined, month: ym }),
        listGeneralExpenses(token, { search: debouncedSearch || undefined, month: ym }),
      ])
      const shipData = Array.isArray(sRes.data) ? sRes.data : []
      const genData = Array.isArray(gRes.data) ? gRes.data : []
      setMergedRaw(normalizeExpenseRows(shipData, genData))
    } catch (e) {
      setListError(e?.message || 'Error')
      setMergedRaw([])
    } finally {
      setLoading(false)
    }
  }, [token, canViewAccounting, filterYear, filterMonth, debouncedSearch])

  useEffect(() => {
    loadUnified()
  }, [loadUnified])

  useEffect(() => {
    if (!token || !canViewAccounting || mainTab !== 'reports') return
    let cancelled = false
    ;(async () => {
      setReportRangeLoading(true)
      try {
        const [lineRows, analyticsRows] = await Promise.all([
          fetchExpensesForRange(
            token,
            reportLineBounds.start,
            reportLineBounds.end,
            debouncedSearch,
          ),
          fetchExpensesForRange(
            token,
            reportAnalyticsBounds.start,
            reportAnalyticsBounds.end,
            debouncedSearch,
          ),
        ])
        if (!cancelled) {
          setReportLineRawRows(lineRows)
          setReportAnalyticsRawRows(analyticsRows)
        }
      } catch {
        if (!cancelled) {
          setReportLineRawRows([])
          setReportAnalyticsRawRows([])
        }
      } finally {
        if (!cancelled) setReportRangeLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    token,
    canViewAccounting,
    mainTab,
    reportChartsFetchKey,
    mergedRaw,
    reportLineBounds,
    reportAnalyticsBounds,
    debouncedSearch,
  ])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    let cancelled = false
    ;(async () => {
      setListYtdLoading(true)
      try {
        const rows = await fetchExpensesForRange(
          token,
          { year: filterYear, month: 1 },
          { year: filterYear, month: filterMonth },
          debouncedSearch,
        )
        if (!cancelled) setListYtdRaw(rows)
      } catch {
        if (!cancelled) setListYtdRaw([])
      } finally {
        if (!cancelled) setListYtdLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, canViewAccounting, filterYear, filterMonth, debouncedSearch, mergedRaw])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await listExpenseCategories(token)
        let list = Array.isArray(r.data) ? r.data : []
        const have = new Set(list.map((c) => c.code).filter(Boolean))
        for (const def of CANONICAL_EXPENSE_CATEGORIES) {
          if (cancelled) return
          if (!have.has(def.code)) {
            try {
              await createExpenseCategory(token, { name: def.label, code: def.code })
              have.add(def.code)
            } catch {
              /* permission / duplicate */
            }
          }
        }
        const r2 = await listExpenseCategories(token)
        if (!cancelled) setCategories(Array.isArray(r2.data) ? r2.data : [])
      } catch {
        if (!cancelled) setCategories([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, canViewAccounting])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listBankAccounts(token)
      .then((res) =>
        setBankAccounts(Array.isArray(res?.data) ? res.data.filter((a) => a?.is_active !== false) : []),
      )
      .catch(() => setBankAccounts([]))
  }, [token, canViewAccounting])

  useEffect(() => {
    if (!modal?.pendingReceiptFile) {
      setPendingReceiptPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(modal.pendingReceiptFile)
    setPendingReceiptPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [modal?.pendingReceiptFile])

  useEffect(() => {
    if (!token || modal?.mode !== 'view' || !modal?.has_receipt || !modal?.id) {
      setViewReceiptUrl(null)
      setViewReceiptMime('')
      setViewReceiptFilename('')
      setViewReceiptLoading(false)
      setViewReceiptFailed(false)
      return undefined
    }
    setViewReceiptLoading(true)
    setViewReceiptFailed(false)
    let cancelled = false
    let blobUrl = null
    downloadExpenseReceipt(token, modal.id)
      .then(({ blob, filename }) => {
        if (cancelled) return
        setViewReceiptMime(blob.type || '')
        const fn = (filename || '').trim() || `receipt-${modal.id}`
        setViewReceiptFilename(fn)
        blobUrl = URL.createObjectURL(blob)
        setViewReceiptUrl(blobUrl)
        setViewReceiptLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setViewReceiptUrl(null)
          setViewReceiptMime('')
          setViewReceiptFilename('')
          setViewReceiptLoading(false)
          setViewReceiptFailed(true)
        }
      })
    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setViewReceiptUrl(null)
      setViewReceiptMime('')
      setViewReceiptFilename('')
      setViewReceiptLoading(false)
      setViewReceiptFailed(false)
    }
  }, [token, modal?.mode, modal?.id, modal?.has_receipt])

  useEffect(() => {
    if (!modal || !bankAccounts.length || modal.bank_account_id) return
    const pm = (modal.payment_method || '').trim()
    if (!pm) return
    const found = bankAccounts.find((a) => bankAccountLegacyPaymentMethodVariants(a).includes(pm))
    if (!found) return
    setModal((m) => {
      if (!m || m.bank_account_id) return m
      return { ...m, bank_account_id: String(found.id) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync legacy payment_method → bank_account_id once accounts load
  }, [bankAccounts, modal?.id, modal?.payment_method, modal?.bank_account_id])

  useEffect(() => {
    if (!modal || modal.mode === 'view') return
    const bid = modal.bank_account_id
    if (!bid || !bankAccounts.length) return
    const b = bankAccounts.find((a) => String(a.id) === String(bid))
    if (!b) return
    const allowed = bankAccountAllowedCurrencies(b)
    if (!allowed.length) return
    const cur = String(modal.currency_code || '').toUpperCase()
    if (!allowed.includes(cur)) {
      setModal((m) => (m ? { ...m, currency_code: allowed[0] } : null))
    }
  }, [modal?.bank_account_id, modal?.mode, bankAccounts])

  useEffect(() => {
    if (!token || !canViewAccounting) return
    listClients(token, { per_page: 500 })
      .then((data) => {
        const rows = data?.data ?? []
        setClientOptions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => setClientOptions([]))
  }, [token, canViewAccounting])

  useEffect(() => {
    if (!token || !modal) return
    listShipments(token, { per_page: 200 })
      .then((json) => {
        const rows = json.data ?? []
        setShipmentOptions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => setShipmentOptions([]))
  }, [token, modal])

  const clientNameById = useMemo(() => {
    const m = {}
    for (const c of clientOptions) {
      m[c.id] = c.company_name || c.name || `#${c.id}`
    }
    return m
  }, [clientOptions])

  /** Canonical base categories first (fixed labels), then user-added categories. */
  const { primaryCategoryOptions, extraCategoryOptions } = useMemo(() => {
    const byCode = new Map(categories.map((c) => [c.code, c]))
    const primary = []
    for (const def of CANONICAL_EXPENSE_CATEGORIES) {
      const c = byCode.get(def.code)
      if (c) primary.push({ ...c, displayLabel: def.label })
    }
    const extra = categories.filter((c) => {
      if (!c.code) return true
      return !CANONICAL_EXPENSE_CATEGORY_CODES.has(c.code)
    })
    return { primaryCategoryOptions: primary, extraCategoryOptions: extra }
  }, [categories])

  const loadCategoryOptions = useCallback(
    async (q) => {
      const qq = (q || '').trim().toLowerCase()
      const labelForPrimary = (c) => {
        const canonical = CANONICAL_EXPENSE_CATEGORIES.find((d) => d.code === c.code)
        return canonical?.label ?? c.name ?? `#${c.id}`
      }
      const primaryOpts = primaryCategoryOptions
        .filter((c) => !qq || labelForPrimary(c).toLowerCase().includes(qq))
        .map((c) => ({ value: c.id, label: labelForPrimary(c) }))
      const extraOpts = extraCategoryOptions
        .filter((c) => !qq || (c.name || '').toLowerCase().includes(qq))
        .map((c) => ({ value: c.id, label: c.name || `#${c.id}` }))
      return [...primaryOpts, ...extraOpts]
    },
    [primaryCategoryOptions, extraCategoryOptions],
  )

  const getCategoryOption = useCallback(
    (id, nameFallback) => {
      if (!id) {
        if (nameFallback) return { value: '', label: nameFallback }
        return null
      }
      const c = categories.find((x) => String(x.id) === String(id))
      if (!c) {
        return nameFallback ? { value: id, label: nameFallback } : { value: id, label: `#${id}` }
      }
      const canonical = CANONICAL_EXPENSE_CATEGORIES.find((d) => d.code === c.code)
      return { value: c.id, label: canonical?.label ?? c.name ?? `#${c.id}` }
    },
    [categories],
  )

  const loadMarketingSubOptions = useCallback(
    async (q) => {
      const qq = (q || '').trim().toLowerCase()
      let list = [...FORM_MARKETING_SUBCATEGORIES]
      const cur = (modal?.marketing_subcategory || '').trim()
      if (cur && !list.some((s) => s.toLowerCase() === cur.toLowerCase())) {
        list = [cur, ...list]
      }
      return list
        .filter((s) => !qq || s.toLowerCase().includes(qq))
        .map((s) => ({ value: s, label: s }))
    },
    [modal?.marketing_subcategory],
  )

  const getMarketingSubOption = (sub) => {
    const s = sub != null ? String(sub).trim() : ''
    if (!s) return null
    return { value: s, label: s }
  }

  const categoryDisplayForRow = useCallback(
    (row, ext) => {
      const cat = categories.find((c) => String(c.id) === String(row.expense_category_id))
      const canonical = CANONICAL_EXPENSE_CATEGORIES.find((d) => d.code === cat?.code)
      const base = canonical?.label ?? row.category_name ?? '—'
      const sub = (ext?.marketing_subcategory || ext?.marketing_source || '').trim()
      if (isMarketingCategoryRecord(cat) && sub) return `${base} › ${sub}`
      return base
    },
    [categories],
  )

  const accountDisplayForRow = useCallback(
    (row, ext) => {
      const bid = ext?.bank_account_id
      if (bid != null && bid !== '' && bankAccounts.length) {
        const b = bankAccounts.find((a) => String(a.id) === String(bid))
        if (b) return formatBankAccountLabel(b)
      }
      return (row.payment_method || '').trim() || '—'
    },
    [bankAccounts],
  )

  const viewCategoryDisplay = useMemo(() => {
    if (!modal) return '—'
    const row = {
      expense_category_id: modal.expense_category_id,
      category_name: modal.category_name,
    }
    const ext = {
      marketing_subcategory: modal.marketing_subcategory,
      marketing_source: modal.marketing_source,
    }
    return categoryDisplayForRow(row, ext)
  }, [modal, categoryDisplayForRow])

  const typeAndRecurrenceDisplay = useMemo(() => {
    if (!modal) return '—'
    const kind =
      modal.expense_kind === 'fixed' ? t('expensesPage.typeFixed') : t('expensesPage.typeVariable')
    if (modal.expense_kind !== 'fixed') return kind
    const r = modal.recurrence || 'monthly'
    const key =
      r === 'quarterly'
        ? 'expensesPage.recurrenceQuarterly'
        : r === 'yearly'
          ? 'expensesPage.recurrenceYearly'
          : 'expensesPage.recurrenceMonthly'
    return `${kind} — ${t(key)}`
  }, [modal, t])

  const viewAccountDisplay = useMemo(() => {
    if (!modal) return '—'
    const b = bankAccounts.find((a) => String(a.id) === String(modal.bank_account_id))
    if (b) return formatBankAccountLabel(b)
    return (modal.payment_method || '').trim() || '—'
  }, [modal, bankAccounts])

  const handleOpenReceiptInNewTab = useCallback(() => {
    if (!viewReceiptUrl) return
    window.open(viewReceiptUrl, '_blank', 'noopener,noreferrer')
  }, [viewReceiptUrl])

  const handleDownloadReceipt = useCallback(() => {
    if (!viewReceiptUrl || !modal?.id) return
    const name = (viewReceiptFilename || '').trim() || `receipt-${modal.id}`
    const a = document.createElement('a')
    a.href = viewReceiptUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [viewReceiptUrl, viewReceiptFilename, modal?.id])

  const handleReceiptPick = useCallback(
    (file) => {
      if (!file) return
      const ok =
        file.type === 'application/pdf' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/png'
      if (!ok) {
        window.alert(t('expensesPage.receiptInvalidType'))
        return
      }
      setModal((m) => (m ? { ...m, pendingReceiptFile: file } : null))
    },
    [t],
  )

  const rowsWithExt = useMemo(() => {
    return mergedRaw.map((row) => ({
      ...row,
      ext: extensions[row.id] || {},
    }))
  }, [mergedRaw, extensions])

  const filteredRows = useMemo(
    () =>
      applyExpenseTableFilters(rowsWithExt, filterCategory, filterExpenseKind, filterLinked),
    [rowsWithExt, filterCategory, filterExpenseKind, filterLinked],
  )

  const reportLineRowsWithExt = useMemo(
    () => reportLineRawRows.map((row) => ({ ...row, ext: extensions[row.id] || {} })),
    [reportLineRawRows, extensions],
  )

  const reportLineFiltered = useMemo(
    () =>
      applyExpenseTableFilters(reportLineRowsWithExt, filterCategory, filterExpenseKind, filterLinked),
    [reportLineRowsWithExt, filterCategory, filterExpenseKind, filterLinked],
  )

  const reportLineUnified = useMemo(
    () =>
      computeReportUnified(reportLineFiltered, reportLineBounds, 'month', locale, categories),
    [reportLineFiltered, reportLineBounds, locale, categories],
  )

  const reportAnalyticsRowsWithExt = useMemo(
    () => reportAnalyticsRawRows.map((row) => ({ ...row, ext: extensions[row.id] || {} })),
    [reportAnalyticsRawRows, extensions],
  )

  const reportAnalyticsFiltered = useMemo(
    () =>
      applyExpenseTableFilters(
        reportAnalyticsRowsWithExt,
        filterCategory,
        filterExpenseKind,
        filterLinked,
      ),
    [reportAnalyticsRowsWithExt, filterCategory, filterExpenseKind, filterLinked],
  )

  const reportAnalyticsUnified = useMemo(
    () =>
      computeReportUnified(
        reportAnalyticsFiltered,
        reportAnalyticsBounds,
        'month',
        locale,
        categories,
      ),
    [reportAnalyticsFiltered, reportAnalyticsBounds, locale, categories],
  )

  const reportLineChartData = useMemo(
    () =>
      reportLineUnified.periodSeries.map((p) => ({
        monthLabel: p.periodLabel,
        total: p.total,
      })),
    [reportLineUnified.periodSeries],
  )

  const reportPieCategoryData = useMemo(
    () =>
      reportAnalyticsUnified.categoryInsights
        .filter((x) => x.total > 0)
        .map((x) => ({
          name: `${x.label} (${x.pct.toFixed(1)}%)`,
          value: x.total,
        })),
    [reportAnalyticsUnified.categoryInsights],
  )

  const reportPieColors = useMemo(
    () =>
      reportPieCategoryData.map(
        (_, i) => REPORT_PIE_SLICE_COLORS[i % REPORT_PIE_SLICE_COLORS.length],
      ),
    [reportPieCategoryData],
  )

  const reportBarLinkedData = useMemo(
    () => [
      { kind: t('expensesPage.reportingBarShipment'), amount: reportAnalyticsUnified.linkedShipTotal },
      { kind: t('expensesPage.reportingBarCustomer'), amount: reportAnalyticsUnified.linkedCustTotal },
      { kind: t('expensesPage.reportingBarGeneral'), amount: reportAnalyticsUnified.linkedGenTotal },
    ],
    [
      t,
      reportAnalyticsUnified.linkedShipTotal,
      reportAnalyticsUnified.linkedCustTotal,
      reportAnalyticsUnified.linkedGenTotal,
    ],
  )

  /** Compact summary (no table): top category, 12‑month total, vs previous month in series. */
  const reportPeriodSummary = useMemo(() => {
    const u = reportAnalyticsUnified
    const top = u.categoryInsights[0]
    const ps = u.periodSeries
    let changePct = null
    if (ps.length >= 2) {
      const last = Number(ps[ps.length - 1]?.total || 0)
      const prev = Number(ps[ps.length - 2]?.total || 0)
      if (prev > 0) changePct = ((last - prev) / prev) * 100
    }
    return {
      topCategoryLabel: top?.label ?? '—',
      topCategoryAmount: top?.total ?? 0,
      periodTotal: u.grandTotal,
      changePct,
    }
  }, [reportAnalyticsUnified])

  /** List tab: stats row + table + footer — derived from current month rows + YTD rows (same filters). */
  const listTabMonthStats = useMemo(
    () => computeListSliceAnalytics(filteredRows, categories),
    [filteredRows, categories],
  )

  const listYtdRowsWithExt = useMemo(
    () => listYtdRaw.map((row) => ({ ...row, ext: extensions[row.id] || {} })),
    [listYtdRaw, extensions],
  )

  const listYtdFiltered = useMemo(
    () =>
      applyExpenseTableFilters(listYtdRowsWithExt, filterCategory, filterExpenseKind, filterLinked),
    [listYtdRowsWithExt, filterCategory, filterExpenseKind, filterLinked],
  )

  const listTabYearStats = useMemo(
    () => computeListSliceAnalytics(listYtdFiltered, categories),
    [listYtdFiltered, categories],
  )

  const openCreate = () => {
    setModal({
      mode: 'create',
      expense_kind: 'variable',
      recurrence: '',
      expense_category_id: '',
      category_name: '',
      description: '',
      amount: '',
      currency_code: 'USD',
      expense_date: todayStr,
      payment_method: '',
      bank_account_id: '',
      shipment_id: '',
      client_id: '',
      marketing_subcategory: '',
      marketing_source: '',
      notes: '',
      pendingReceiptFile: null,
      has_receipt: false,
    })
  }

  const buildModalFromRow = (row, mode) => {
    const ext = extensions[row.id] || {}
    return {
      mode,
      id: row.id,
      expense_kind: ext.expense_kind || 'variable',
      recurrence:
        (ext.expense_kind || 'variable') === 'fixed' ? ext.recurrence || 'monthly' : ext.recurrence || '',
      expense_category_id: row.expense_category_id != null ? String(row.expense_category_id) : '',
      description: row.description || '',
      amount: String(row.amount ?? ''),
      currency_code: row.currency_code || 'USD',
      expense_date: row.expense_date || todayStr,
      payment_method: row.payment_method || '',
      bank_account_id:
        row.bank_account_id != null && row.bank_account_id !== ''
          ? String(row.bank_account_id)
          : ext.bank_account_id != null
            ? String(ext.bank_account_id)
            : '',
      shipment_id: row.shipment_id != null ? String(row.shipment_id) : '',
      client_id: ext.client_id != null ? String(ext.client_id) : '',
      marketing_subcategory: ext.marketing_subcategory || ext.marketing_source || '',
      marketing_source: ext.marketing_source || '',
      notes: ext.notes || '',
      pendingReceiptFile: null,
      bl_number: row.bl_number || '',
      category_name: row.category_name || '',
      has_receipt: !!row.has_receipt,
    }
  }

  const openEdit = (row) => {
    setModal(buildModalFromRow(row, 'edit'))
  }

  const openView = (row) => {
    setModal(buildModalFromRow(row, 'view'))
  }

  const switchViewToEdit = () => {
    if (!modal?.id) return
    const row = mergedRaw.find((r) => String(r.id) === String(modal.id))
    if (row) openEdit(row)
  }

  const submitModal = async () => {
    if (!token || !modal || modal.mode === 'view') return
    const amount = Number(modal.amount)
    const catId = Number(modal.expense_category_id)
    if (!catId || !modal.description?.trim() || Number.isNaN(amount) || amount < 0) {
      window.alert(t('expensesPage.validation'))
      return
    }
    if (!modal.bank_account_id) {
      window.alert(t('expensesPage.accountRequired'))
      return
    }
    if (modal.expense_kind === 'fixed' && !modal.recurrence) {
      window.alert(t('expensesPage.recurrenceRequired'))
      return
    }

    const selectedBank = bankAccounts.find((b) => String(b.id) === String(modal.bank_account_id))
    if (!selectedBank) {
      window.alert(t('expensesPage.accountInvalid'))
      return
    }

    const allowed = bankAccountAllowedCurrencies(selectedBank)
    const cur = String(modal.currency_code || '').toUpperCase()
    if (allowed.length && !allowed.includes(cur)) {
      window.alert(t('expensesPage.treasuryCurrencyNotSupportedAccount'))
      return
    }

    let overview = null
    try {
      overview = await getTreasuryBankOverview(token)
    } catch {
      overview = null
    }
    if (amount > 0 && overview?.banks && Array.isArray(overview.banks)) {
      const bankRow = overview.banks.find((x) => String(x.id) === String(modal.bank_account_id))
      const balances = bankRow?.balance_by_currency || {}
      let avail = Number(balances[cur])
      if (!Number.isFinite(avail)) avail = 0
      if (modal.mode === 'edit') {
        const oldRow = mergedRaw.find((r) => String(r.id) === String(modal.id))
        if (
          oldRow &&
          String(oldRow.bank_account_id ?? '') === String(modal.bank_account_id) &&
          String(oldRow.currency_code || '').toUpperCase() === cur
        ) {
          avail += Number(oldRow.amount) || 0
        }
      }
      if (avail + 1e-6 < amount) {
        window.alert(t('expensesPage.treasuryInsufficientBalanceAccount'))
        return
      }
    }

    setSaving(true)
    try {
      const cat = categories.find((c) => Number(c.id) === catId)
      const marketing = isMarketingCategoryRecord(cat)
      const sid = modal.shipment_id ? Number(modal.shipment_id) : 0

      const paymentMethodResolved = formatBankAccountLabel(selectedBank)

      const buildExtEntry = () => {
        const entry = {
          expense_kind: modal.expense_kind === 'fixed' ? 'fixed' : 'variable',
        }
        if (modal.expense_kind === 'fixed' && modal.recurrence) entry.recurrence = modal.recurrence
        if (marketing && modal.marketing_subcategory?.trim()) {
          entry.marketing_subcategory = modal.marketing_subcategory.trim()
        }
        if (modal.client_id) entry.client_id = Number(modal.client_id)
        if (modal.notes?.trim()) entry.notes = modal.notes.trim()
        if (modal.bank_account_id) entry.bank_account_id = Number(modal.bank_account_id)
        return entry
      }

      if (modal.mode === 'create') {
        const body = {
          type: sid ? 'shipment' : 'general',
          expense_category_id: catId,
          description: modal.description.trim(),
          amount,
          currency_code: modal.currency_code,
          expense_date: modal.expense_date,
          bank_account_id: Number(modal.bank_account_id),
          payment_method: paymentMethodResolved || undefined,
        }
        if (sid) body.shipment_id = sid
        const created = await createExpense(token, body)
        const newId = created?.id
        if (newId != null) {
          patchExtensions((prev) => ({
            ...prev,
            [newId]: buildExtEntry(),
          }))
          if (modal.pendingReceiptFile) {
            await uploadExpenseReceipt(token, newId, modal.pendingReceiptFile)
          }
        }
      } else {
        const body = {
          expense_category_id: catId,
          description: modal.description.trim(),
          amount,
          currency_code: modal.currency_code,
          expense_date: modal.expense_date,
          bank_account_id: Number(modal.bank_account_id),
          payment_method: paymentMethodResolved || undefined,
        }
        if (sid) {
          body.type = 'shipment'
          body.shipment_id = sid
        } else {
          body.type = 'general'
          body.shipment_id = null
        }
        await updateExpense(token, modal.id, body)
        patchExtensions((prev) => ({
          ...prev,
          [modal.id]: buildExtEntry(),
        }))
        if (modal.pendingReceiptFile) {
          await uploadExpenseReceipt(token, modal.id, modal.pendingReceiptFile)
        }
      }
      setModal(null)
      loadUnified()
    } catch (e) {
      window.alert(e?.message || t('expensesPage.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const requestDeleteExpense = (row) => {
    if (!canManageAccounting) return
    setDeleteExpenseId(row.id)
  }

  const handleDeleteExpenseConfirm = async () => {
    if (!token || !canManageAccounting || deleteExpenseId == null) return
    const id = deleteExpenseId
    setDeleteSubmitting(true)
    try {
      await deleteExpense(token, id)
      removeExtension(id)
      setDeleteExpenseId(null)
      setModal((m) => (m && String(m.id) === String(id) ? null : m))
      loadUnified()
    } catch (e) {
      window.alert(e?.message || t('expensesPage.errorDelete'))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    if (!token) return
    setExportBusy(true)
    try {
      const params = {
        type: 'all',
        search: debouncedSearch || undefined,
        month: filterYm || undefined,
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

  const selectedModalCategory = useMemo(() => {
    if (!modal?.expense_category_id) return null
    return categories.find((c) => String(c.id) === String(modal.expense_category_id))
  }, [modal, categories])

  const showMarketingField = isMarketingCategoryRecord(selectedModalCategory)

  /** Ensure linked shipment appears in dropdown when not in the latest page of results. */
  const shipmentSelectOptions = useMemo(() => {
    const sid = modal?.shipment_id
    if (!sid) return shipmentOptions
    const has = shipmentOptions.some((s) => String(s.id) === String(sid))
    if (has) return shipmentOptions
    const idNum = Number(sid)
    return [
      ...shipmentOptions,
      {
        id: idNum,
        bl_number: modal?.bl_number || '',
        booking_number: '',
      },
    ]
  }, [shipmentOptions, modal?.shipment_id, modal?.bl_number])

  if (!canViewAccounting) {
    return (
      <Container size="xl">
        <div className="clients-page expenses-page">
          <p className="expenses-muted">{t('expensesPage.noPermission')}</p>
        </div>
      </Container>
    )
  }

  const yearOptions = []
  const y0 = new Date().getFullYear()
  for (let y = y0 - 6; y <= y0 + 6; y++) yearOptions.push(y)

  return (
    <Container size="xl">
      <div className="clients-page expenses-page">
        <Tabs
          variant="main"
          className="expenses-main-tabs mb-6"
          tabs={[
            { id: 'list', label: t('expensesPage.tabList') },
            { id: 'reports', label: t('expensesPage.tabReports') },
          ]}
          activeTab={mainTab}
          onChange={setMainTab}
        />

        <div
          id="panel-list"
          role="tabpanel"
          aria-labelledby="tab-list"
          hidden={mainTab !== 'list'}
        >
          <div className="accountings-table-section">
            <div className="clients-stats-grid expenses-list-overview-stats mb-6">
              <StatsCard
                titleFirst
                title={t('expensesPage.listStatsTotalTitle')}
                value={
                  <CurrencyMapBadges
                    value={listTabMonthStats.totalMap}
                    amountFirst
                    numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                    emptyLabel="—"
                  />
                }
                icon={<Wallet className="h-6 w-6" />}
                variant="green"
              />
              <StatsCard
                titleFirst
                title={t('expensesPage.listStatsFixedTitle')}
                value={
                  <CurrencyMapBadges
                    value={listTabMonthStats.fixedMap}
                    amountFirst
                    numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                    emptyLabel="—"
                  />
                }
                icon={<Layers className="h-6 w-6" />}
                variant="amber"
              />
              <StatsCard
                titleFirst
                title={t('expensesPage.listStatsVariableTitle')}
                value={
                  <CurrencyMapBadges
                    value={listTabMonthStats.variableMap}
                    amountFirst
                    numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                    emptyLabel="—"
                  />
                }
                icon={<Zap className="h-6 w-6" />}
                variant="default"
              />
              <StatsCard
                titleFirst
                title={t('expensesPage.listStatsMarketingTitle')}
                value={
                  <CurrencyMapBadges
                    value={listTabMonthStats.marketingMap}
                    amountFirst
                    numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                    emptyLabel="—"
                  />
                }
                icon={<Megaphone className="h-6 w-6" />}
                variant="blue"
              />
            </div>
            <div className="clients-filters-card">
            <div className="clients-filters__row clients-filters__row--main">
              <div className="clients-filters__search-wrap" dir={isAr ? 'rtl' : 'ltr'}>
                <Search className="clients-filters__search-icon" aria-hidden />
                <input
                  type="search"
                  className="clients-input clients-filters__search"
                  placeholder={t('expensesPage.searchPlaceholder')}
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  aria-label={t('expensesPage.searchPlaceholder')}
                />
              </div>
              <div className="clients-filters__fields">
                <select
                  className="clients-input min-w-[140px]"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  aria-label={t('expensesPage.filterMonth')}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {monthNameOnly(m, locale)}
                    </option>
                  ))}
                </select>
                <select
                  className="clients-input min-w-[100px]"
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  aria-label={t('expensesPage.filterYear')}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  className="clients-input min-w-[140px]"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  aria-label={t('expensesPage.filterCategory')}
                >
                  <option value="">{t('expensesPage.allCategories')}</option>
                  {primaryCategoryOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.displayLabel}
                    </option>
                  ))}
                  {extraCategoryOptions.length > 0 && (
                    <optgroup label={t('expensesPage.extraCategories')}>
                      {extraCategoryOptions.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <select
                  className="clients-input min-w-[140px]"
                  value={filterExpenseKind}
                  onChange={(e) => setFilterExpenseKind(e.target.value)}
                  aria-label={t('expensesPage.filterExpenseKind')}
                >
                  <option value="all">{t('expensesPage.filterAllTypes')}</option>
                  <option value="fixed">{t('expensesPage.typeFixed')}</option>
                  <option value="variable">{t('expensesPage.typeVariable')}</option>
                </select>
                <select
                  className="clients-input min-w-[140px]"
                  value={filterLinked}
                  onChange={(e) => setFilterLinked(e.target.value)}
                  aria-label={t('expensesPage.filterLinkedType')}
                >
                  <option value="all">{t('expensesPage.filterAllLinked')}</option>
                  <option value="shipment">{t('expensesPage.linkedFilterShipment')}</option>
                  <option value="customer">{t('expensesPage.linkedFilterCustomer')}</option>
                  <option value="none">{t('expensesPage.linkedFilterNone')}</option>
                </select>
              </div>
              <div className="clients-filters__actions">
                <button
                  type="button"
                  className="clients-filters__clear clients-filters__btn-icon"
                  onClick={() => {
                    const d = defaultMonthParts()
                    setFilterYear(d.year)
                    setFilterMonth(d.month)
                    setListSearch('')
                    setFilterCategory('')
                    setFilterExpenseKind('all')
                    setFilterLinked('all')
                  }}
                  aria-label={t('invoices.clearFilters', 'Clear filters')}
                  title={t('invoices.clearFilters', 'Clear filters')}
                >
                  <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
                </button>
                <button
                  type="button"
                  className="clients-filters__btn-icon clients-filters__btn-icon--export"
                  disabled={exportBusy}
                  onClick={handleExport}
                  aria-label={t('expensesPage.export')}
                  title={t('expensesPage.export')}
                >
                  {exportBusy ? (
                    <span className="clients-filters__export-spinner" aria-hidden />
                  ) : (
                    <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
                  )}
                </button>
                {canManageAccounting && (
                  <button type="button" className="page-header__btn page-header__btn--primary" onClick={openCreate}>
                    <Plus className="inline h-3.5 w-3.5" /> {t('expensesPage.add')}
                  </button>
                )}
              </div>
            </div>
          </div>
            {listError && <div className="accountings-error mb-3">{listError}</div>}
            <div className="accountings-table-wrap expenses-table-wrap">
            <table className="accountings-table expenses-data-table">
              <thead>
                <tr>
                  <th>{t('expensesPage.colDate')}</th>
                  <th>{t('expensesPage.colDescription')}</th>
                  <th>{t('expensesPage.colCategory')}</th>
                  <th>{t('expensesPage.colType')}</th>
                  <th>{t('expensesPage.colAccount')}</th>
                  <th>{t('expensesPage.colLinked')}</th>
                  <th>{t('expensesPage.colAmount')}</th>
                  {canManageAccounting && (
                    <th className="expenses-th-actions">{t('expensesPage.colActions')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={canManageAccounting ? 8 : 7}>
                      <LoaderDots />
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredRows.map((row) => {
                    const ext = row.ext || {}
                    const kind = ext.expense_kind || 'variable'
                    const lt = linkedType(row, ext)
                    const catParts = expenseCategoryMainSub(row, ext, categories)
                    return (
                      <tr key={row.id}>
                        <td className="expenses-td-date">{formatDate(row.expense_date)}</td>
                        <td className="expenses-td-desc">{row.description}</td>
                        <td className="expenses-td-category">
                          <span className="expenses-category-badge">
                            <span className="expenses-category-badge__main">{catParts.main}</span>
                            {catParts.sub ? (
                              <>
                                <span className="expenses-category-badge__sep" aria-hidden>
                                  ·
                                </span>
                                <span className="expenses-category-badge__sub">{catParts.sub}</span>
                              </>
                            ) : null}
                          </span>
                        </td>
                        <td className="expenses-td-type">
                          <span
                            className={`expenses-type-badge ${kind === 'fixed' ? 'expenses-type-badge--fixed' : 'expenses-type-badge--variable'}`}
                          >
                            {kind === 'fixed' ? (
                              <Layers className="expenses-type-badge__icon" aria-hidden />
                            ) : (
                              <Zap className="expenses-type-badge__icon" aria-hidden />
                            )}
                            <span>
                              {kind === 'fixed' ? t('expensesPage.typeFixed') : t('expensesPage.typeVariable')}
                            </span>
                          </span>
                        </td>
                        <td className="expenses-td-account">{accountDisplayForRow(row, ext)}</td>
                        <td className="expenses-td-linked">
                          {lt === 'shipment' && row.shipment_id ? (
                            <Link
                              className="expenses-linked-pill expenses-linked-pill--shipment"
                              to={`/shipments?shipment_id=${row.shipment_id}`}
                            >
                              <Ship className="expenses-linked-pill__icon" aria-hidden />
                              <span>{row.bl_number || `#${row.shipment_id}`}</span>
                            </Link>
                          ) : lt === 'customer' && ext.client_id ? (
                            <Link
                              className="expenses-linked-pill expenses-linked-pill--customer"
                              to="/clients"
                              state={{ focusClientId: Number(ext.client_id) }}
                            >
                              <User className="expenses-linked-pill__icon" aria-hidden />
                              <span>{clientNameById[Number(ext.client_id)] || `#${ext.client_id}`}</span>
                            </Link>
                          ) : (
                            <span className="expenses-muted">—</span>
                          )}
                        </td>
                        <td className="expenses-amount-cell">
                          <div className="expenses-table-money expenses-table-money--treasury">
                            <CurrencyMapBadges
                              value={expenseSingleCurrencyMap(row.amount, row.currency_code)}
                              size="sm"
                              amountFirst
                              numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                              emptyLabel="—"
                            />
                          </div>
                        </td>
                        {canManageAccounting && (
                          <td className="accountings-table-actions-cell expenses-td-actions">
                            <div className="expenses-table-actions" role="group" aria-label={t('expensesPage.colActions')}>
                              <button
                                type="button"
                                className="accountings-action-icon-btn"
                                onClick={() => openView(row)}
                                title={t('expensesPage.view')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="accountings-action-icon-btn"
                                onClick={() => openEdit(row)}
                                title={t('expensesPage.modalEdit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="accountings-action-icon-btn accountings-action-icon-btn--danger"
                                onClick={() => requestDeleteExpense(row)}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={canManageAccounting ? 8 : 7} className="accountings-empty">
                      {t('expensesPage.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="expenses-table-footer">
                <tr className="expenses-table-footer__row expenses-table-footer__row--month">
                  <td colSpan={6} className="expenses-table-footer__label text-end">
                    {t('expensesPage.listFooterMonthTotal')}
                  </td>
                  <td className="expenses-amount-cell expenses-table-footer__amount">
                    <div className="expenses-table-money expenses-table-money--treasury">
                      <CurrencyMapBadges
                        value={listTabMonthStats.totalMap}
                        size="sm"
                        amountFirst
                        numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                        emptyLabel="—"
                      />
                    </div>
                  </td>
                  {canManageAccounting && <td className="expenses-table-footer__actions-spacer" />}
                </tr>
                <tr className="expenses-table-footer__row expenses-table-footer__row--year">
                  <td colSpan={6} className="expenses-table-footer__label text-end">
                    {t('expensesPage.listFooterYearTotal', {
                      year: filterYear,
                      month: monthNameOnly(filterMonth, locale),
                    })}
                  </td>
                  <td className="expenses-amount-cell expenses-table-footer__amount">
                    {listYtdLoading ? (
                      <span className="expenses-muted text-sm">{t('expensesPage.listFooterYearLoading')}</span>
                    ) : (
                      <div className="expenses-table-money expenses-table-money--treasury">
                        <CurrencyMapBadges
                          value={listTabYearStats.totalMap}
                          size="sm"
                          amountFirst
                          numberLocale={EXPENSE_AMOUNT_NUMBER_LOCALE}
                          emptyLabel="—"
                        />
                      </div>
                    )}
                  </td>
                  {canManageAccounting && <td className="expenses-table-footer__actions-spacer" />}
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </div>

        <div
          id="panel-reports"
          role="tabpanel"
          aria-labelledby="tab-reports"
          hidden={mainTab !== 'reports'}
        >
          <div className="expenses-report-toolbar mb-3">
            <select
              className="clients-input min-w-[180px]"
              value={reportPreset}
              onChange={(e) => setReportPreset(e.target.value)}
              aria-label={t('expensesPage.reportPresetLabel')}
            >
              <option value="last1">{t('expensesPage.reportPresetLast1')}</option>
              <option value="last3">{t('expensesPage.reportPresetLast3')}</option>
              <option value="last6">{t('expensesPage.reportPresetLast6')}</option>
              <option value="fullYear">{t('expensesPage.reportPresetFullYear')}</option>
            </select>
          </div>

          <div className="clients-chart-wrap expenses-report-line-chart mb-4">
            {reportRangeLoading ? (
              <div className="expenses-chart-empty">
                <LoaderDots />
              </div>
            ) : reportLineChartData.length ? (
              <LineChart
                data={reportLineChartData}
                xKey="monthLabel"
                lines={[
                  {
                    dataKey: 'total',
                    name: t('expensesPage.reportingLinePeriodTotal'),
                    stroke: '#2563eb',
                  },
                ]}
                title={t('expensesPage.reportingMonthlyTrendTitle')}
                height={260}
                allowDecimals
              />
            ) : (
              <div className="expenses-chart-empty">{t('expensesPage.reportingChartEmpty')}</div>
            )}
          </div>

          <div className="expenses-charts-grid expenses-report-charts-grid--secondary mb-4">
            <div className="clients-chart-wrap">
              {reportRangeLoading ? (
                <div className="expenses-chart-empty">
                  <LoaderDots />
                </div>
              ) : reportPieCategoryData.length ? (
                <PieChart
                  data={reportPieCategoryData}
                  nameKey="name"
                  valueKey="value"
                  valueLabel={t('expensesPage.seriesTotal')}
                  title={t('expensesPage.reportingPieCategoryTitle')}
                  colors={reportPieColors}
                  height={250}
                />
              ) : (
                <div className="expenses-chart-empty">{t('expensesPage.reportingChartEmpty')}</div>
              )}
            </div>
            <div className="clients-chart-wrap">
              {reportRangeLoading ? (
                <div className="expenses-chart-empty">
                  <LoaderDots />
                </div>
              ) : reportBarLinkedData.some((d) => d.amount > 0) ? (
                <BarChart
                  data={reportBarLinkedData}
                  xKey="kind"
                  yKey="amount"
                  title={t('expensesPage.reportingBarLinkedSplitTitle')}
                  yLabel={t('expensesPage.reportingAmountAxis')}
                  valueLabel={t('expensesPage.seriesTotal')}
                  height={250}
                  allowDecimals
                />
              ) : (
                <div className="expenses-chart-empty">{t('expensesPage.reportingChartEmpty')}</div>
              )}
            </div>
          </div>

          <section
            className="expenses-linked-analytics expenses-report-extra-analytics"
            aria-label={t('expensesPage.reportExtraAnalyticsTitle')}
          >
            <h4 className="expenses-linked-analytics__title text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {t('expensesPage.reportExtraAnalyticsTitle')}
            </h4>
            {reportRangeLoading ? (
              <div className="expenses-chart-empty py-6">
                <LoaderDots />
              </div>
            ) : (
              <>
                <div className="expenses-report-summary-strip mb-4">
                  <div className="expenses-report-summary-strip__item">
                    <span className="expenses-report-summary-strip__label">
                      {t('expensesPage.reportSummaryTopCategory')}
                    </span>
                    <span className="expenses-report-summary-strip__value">{reportPeriodSummary.topCategoryLabel}</span>
                    <span className="expenses-report-summary-strip__amount tabular-nums">
                      {formatExpenseAmountDigits(reportPeriodSummary.topCategoryAmount)}
                    </span>
                  </div>
                  <div className="expenses-report-summary-strip__item">
                    <span className="expenses-report-summary-strip__label">
                      {t('expensesPage.reportSummaryPeriodTotal')}
                    </span>
                    <span className="expenses-report-summary-strip__amount tabular-nums">
                      {formatExpenseAmountDigits(reportPeriodSummary.periodTotal)}
                    </span>
                    <span className="expenses-report-summary-strip__hint">
                      {t('expensesPage.reportSummaryPeriodFootnote')}
                    </span>
                  </div>
                  <div className="expenses-report-summary-strip__item">
                    <span className="expenses-report-summary-strip__label">
                      {t('expensesPage.reportSummaryChange')}
                    </span>
                    <span className="expenses-report-summary-strip__amount tabular-nums">
                      {reportPeriodSummary.changePct == null
                        ? '—'
                        : `${reportPeriodSummary.changePct > 0 ? '+' : ''}${reportPeriodSummary.changePct.toFixed(1)}%`}
                    </span>
                    <span className="expenses-report-summary-strip__hint">
                      {t('expensesPage.reportSummaryChangeHint')}
                    </span>
                  </div>
                </div>

                <div className="expenses-linked-analytics__block mb-5">
                  <h5 className="expenses-linked-analytics__subtitle text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    {t('expensesPage.linkedShipmentSection')}
                  </h5>
                  <div className="expenses-linked-analytics__summary mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t('expensesPage.linkedSummaryTotal')}:
                      </span>{' '}
                      {formatExpenseAmountDigits(reportAnalyticsUnified.shipmentAggregate.total)}
                    </span>
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t('expensesPage.linkedSummaryCount')}:
                      </span>{' '}
                      {reportAnalyticsUnified.shipmentAggregate.count}
                    </span>
                  </div>
                  {reportAnalyticsUnified.shipmentGroups.length ? (
                    <div className="accountings-table-wrap expenses-linked-analytics-wrap">
                      <table className="accountings-table expenses-linked-analytics-table">
                        <thead>
                          <tr>
                            <th>{t('expensesPage.linkedColShipment')}</th>
                            <th className="text-end">{t('expensesPage.linkedColAmount')}</th>
                            <th className="text-end">{t('expensesPage.linkedColExpenseCount')}</th>
                            <th>{t('expensesPage.linkedColLinkedCustomer')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportAnalyticsUnified.shipmentGroups.map((row) => (
                            <tr key={row.shipmentId}>
                              <td>
                                <Link
                                  className="expenses-linked-analytics__entity-link expenses-linked-analytics__entity-link--shipment"
                                  to={`/shipments?shipment_id=${row.shipmentId}`}
                                >
                                  <Ship className="inline h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                  <span>{row.blLabel}</span>
                                </Link>
                              </td>
                              <td className="text-end font-medium tabular-nums">
                                {formatExpenseAmountDigits(row.total)}
                              </td>
                              <td className="text-end tabular-nums">{row.count}</td>
                              <td>
                                {row.clientId ? (
                                  <Link
                                    className="expenses-linked-analytics__entity-link expenses-linked-analytics__entity-link--customer"
                                    to="/clients"
                                    state={{ focusClientId: row.clientId }}
                                  >
                                    <User className="inline h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                    <span>
                                      {clientNameById[row.clientId] || `#${row.clientId}`}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="expenses-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="expenses-muted mb-0 text-sm">{t('expensesPage.linkedShipmentEmpty')}</p>
                  )}
                </div>

                <div className="expenses-linked-analytics__block">
                  <h5 className="expenses-linked-analytics__subtitle text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    {t('expensesPage.linkedCustomerSection')}
                  </h5>
                  <p className="expenses-linked-analytics__hint text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {t('expensesPage.linkedCustomerTopHint')}
                  </p>
                  <div className="expenses-linked-analytics__summary mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t('expensesPage.linkedSummaryTotal')}:
                      </span>{' '}
                      {formatExpenseAmountDigits(reportAnalyticsUnified.customerAggregate.total)}
                    </span>
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t('expensesPage.linkedSummaryCount')}:
                      </span>{' '}
                      {reportAnalyticsUnified.customerAggregate.count}
                    </span>
                  </div>
                  {reportAnalyticsUnified.customerGroups.length ? (
                    <div className="accountings-table-wrap expenses-linked-analytics-wrap">
                      <table className="accountings-table expenses-linked-analytics-table">
                        <thead>
                          <tr>
                            <th>{t('expensesPage.linkedColCustomer')}</th>
                            <th className="text-end">{t('expensesPage.linkedColAmount')}</th>
                            <th className="text-end">{t('expensesPage.linkedColExpenseCount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportAnalyticsUnified.customerGroups.map((row, idx) => (
                            <tr key={row.clientId} className={idx === 0 ? 'expenses-linked-analytics__top-row' : ''}>
                              <td>
                                <Link
                                  className="expenses-linked-analytics__entity-link expenses-linked-analytics__entity-link--customer"
                                  to="/clients"
                                  state={{ focusClientId: row.clientId }}
                                >
                                  <User className="inline h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                  <span>
                                    {clientNameById[row.clientId] || `#${row.clientId}`}
                                  </span>
                                </Link>
                              </td>
                              <td className="text-end font-medium tabular-nums">
                                {formatExpenseAmountDigits(row.total)}
                              </td>
                              <td className="text-end tabular-nums">{row.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="expenses-muted mb-0 text-sm">{t('expensesPage.linkedCustomerEmpty')}</p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {modal && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="accountings-modal-backdrop"
              onClick={() => !saving && setModal(null)}
              aria-label={t('expensesPage.close')}
            />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="expenses-modal-create-header">
                <h2
                  className={`expenses-modal-create-header__title${modal.mode === 'create' ? ' expenses-modal-create-header__title--with-icon' : ''}`}
                >
                  {modal.mode === 'create' && <Plus className="expenses-modal-create-header__icon" aria-hidden />}
                  {modal.mode === 'create'
                    ? t('expensesPage.modalCreateHeading')
                    : modal.mode === 'view'
                      ? t('expensesPage.view')
                      : t('expensesPage.modalEdit')}
                </h2>
              </div>
              <div className="accountings-form">
                <div className="accountings-form-scroll">
                  {modal.mode === 'view' ? (
                    <div className="expenses-view-detail">
                      <div className="expenses-view-grid">
                        <div className="expenses-view-pair">
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.expenseDate')}</div>
                            <div className="expenses-view-value">{formatDate(modal.expense_date)}</div>
                          </div>
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.description')}</div>
                            <div className="expenses-view-value">
                              {(modal.description || '').trim() || '—'}
                            </div>
                          </div>
                        </div>
                        <div className="expenses-view-pair">
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.colCategory')}</div>
                            <div className="expenses-view-value">{viewCategoryDisplay}</div>
                          </div>
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.expenseType')}</div>
                            <div className="expenses-view-value">{typeAndRecurrenceDisplay}</div>
                          </div>
                        </div>
                        <div className="expenses-view-pair">
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.accountTreasury')}</div>
                            <div className="expenses-view-value">{viewAccountDisplay}</div>
                          </div>
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.colLinked')}</div>
                            <div className="expenses-view-value expenses-view-value--linked">
                              {modal.shipment_id ? (
                                <Link
                                  className="expenses-linked-pill expenses-linked-pill--shipment"
                                  to={`/shipments?shipment_id=${modal.shipment_id}`}
                                >
                                  <Ship className="expenses-linked-pill__icon" aria-hidden />
                                  <span>{modal.bl_number || `#${modal.shipment_id}`}</span>
                                </Link>
                              ) : modal.client_id ? (
                                <Link
                                  className="expenses-linked-pill expenses-linked-pill--customer"
                                  to="/clients"
                                  state={{ focusClientId: Number(modal.client_id) }}
                                >
                                  <User className="expenses-linked-pill__icon" aria-hidden />
                                  <span>{clientNameById[Number(modal.client_id)] || `#${modal.client_id}`}</span>
                                </Link>
                              ) : (
                                <span className="expenses-muted">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="expenses-view-pair">
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.amount')}</div>
                            <div className="expenses-view-value">{formatExpenseAmountDigits(modal.amount)}</div>
                          </div>
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.currency')}</div>
                            <div className="expenses-view-value">
                              {String(modal.currency_code || 'USD').toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <div className="expenses-view-pair expenses-view-pair--attachments">
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.attachmentsLabel')}</div>
                            <div className="expenses-view-value expenses-view-value--attachments">
                              {!modal.has_receipt && !viewReceiptLoading && (
                                <span className="expenses-muted">{t('expensesPage.noReceipt')}</span>
                              )}
                              {modal.has_receipt && viewReceiptLoading && <LoaderDots />}
                              {modal.has_receipt && viewReceiptFailed && (
                                <span className="expenses-muted">{t('expensesPage.receiptLoadFailed')}</span>
                              )}
                              {modal.has_receipt &&
                                !viewReceiptLoading &&
                                !viewReceiptFailed &&
                                viewReceiptUrl && (
                                  <>
                                    <div className="expenses-receipt-preview-wrap expenses-receipt-preview-wrap--view">
                                      {viewReceiptMime.includes('pdf') ? (
                                        <iframe
                                          title={t('expensesPage.receiptPreview')}
                                          src={viewReceiptUrl}
                                          className="expenses-receipt-preview-frame"
                                        />
                                      ) : (
                                        <img src={viewReceiptUrl} alt="" className="expenses-receipt-preview-img" />
                                      )}
                                    </div>
                                    <div className="expenses-view-receipt-btns">
                                      <button
                                        type="button"
                                        className="expenses-view-receipt-text-btn"
                                        onClick={handleOpenReceiptInNewTab}
                                      >
                                        <ExternalLink size={14} aria-hidden />
                                        {t('expensesPage.openReceipt')}
                                      </button>
                                      <button
                                        type="button"
                                        className="expenses-view-receipt-text-btn"
                                        onClick={handleDownloadReceipt}
                                      >
                                        <Download size={14} aria-hidden />
                                        {t('expensesPage.downloadReceipt')}
                                      </button>
                                    </div>
                                  </>
                                )}
                            </div>
                          </div>
                          <div className="expenses-view-cell">
                            <div className="expenses-view-label">{t('expensesPage.colActions')}</div>
                            <div className="expenses-view-value">
                              {canManageAccounting ? (
                                <button
                                  type="button"
                                  className="expenses-view-edit-btn"
                                  onClick={switchViewToEdit}
                                >
                                  <Pencil className="expenses-view-edit-btn__icon" aria-hidden />
                                  {t('expensesPage.modalEdit')}
                                </button>
                              ) : (
                                <span className="expenses-muted">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {(modal.notes || '').trim() ? (
                        <div className="expenses-view-notes">
                          <div className="expenses-view-label">{t('expensesPage.notes')}</div>
                          <div className="accountings-detail-pre">{modal.notes}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="accountings-form-grid expenses-form-grid">
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.expenseKind')} *</label>
                      <div className="expenses-type-toggle" role="group" aria-label={t('expensesPage.expenseKind')}>
                        <button
                          type="button"
                          className={`expenses-type-toggle__btn expenses-type-toggle__btn--fixed ${modal.expense_kind === 'fixed' ? 'expenses-type-toggle__btn--fixed-on' : ''}`}
                          onClick={() =>
                            setModal((m) =>
                              m
                                ? {
                                    ...m,
                                    expense_kind: 'fixed',
                                    recurrence: m.recurrence || 'monthly',
                                  }
                                : null,
                            )
                          }
                        >
                          <Receipt className="expenses-type-toggle__icon" aria-hidden />
                          {t('expensesPage.typeFixed')}
                        </button>
                        <button
                          type="button"
                          className={`expenses-type-toggle__btn expenses-type-toggle__btn--variable ${modal.expense_kind === 'variable' ? 'expenses-type-toggle__btn--variable-on' : ''}`}
                          onClick={() =>
                            setModal((m) => (m ? { ...m, expense_kind: 'variable', recurrence: '' } : null))
                          }
                        >
                          <Repeat2 className="expenses-type-toggle__icon" aria-hidden />
                          {t('expensesPage.typeVariable')}
                        </button>
                      </div>
                    </div>
                    {modal.expense_kind === 'fixed' && (
                      <div className="accountings-field accountings-field--full">
                        <label>{t('expensesPage.recurrence')} *</label>
                        <select
                          className="accountings-input"
                          value={modal.recurrence || 'monthly'}
                          onChange={(e) => setModal((m) => (m ? { ...m, recurrence: e.target.value } : null))}
                          required
                        >
                          <option value="monthly">{t('expensesPage.recurrenceMonthly')}</option>
                          <option value="quarterly">{t('expensesPage.recurrenceQuarterly')}</option>
                          <option value="yearly">{t('expensesPage.recurrenceYearly')}</option>
                        </select>
                      </div>
                    )}
                    <div className="accountings-field">
                      <label>{t('expensesPage.amount')} *</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="accountings-input"
                        value={modal.amount}
                        onChange={(e) => setModal((m) => (m ? { ...m, amount: e.target.value } : null))}
                      />
                    </div>
                    <div className="accountings-field">
                      <label>{t('expensesPage.currency')} *</label>
                      <select
                        className="accountings-input"
                        value={modal.currency_code}
                        onChange={(e) => setModal((m) => (m ? { ...m, currency_code: e.target.value } : null))}
                      >
                        {(() => {
                          const acc = bankAccounts.find((a) => String(a.id) === String(modal.bank_account_id))
                          const list =
                            acc && bankAccountAllowedCurrencies(acc).length > 0
                              ? bankAccountAllowedCurrencies(acc)
                              : ALL_EXPENSE_CURRENCIES
                          return list.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))
                        })()}
                      </select>
                    </div>
                    <div className="accountings-field">
                      <label>{t('expensesPage.accountTreasury')} *</label>
                      <select
                        className="accountings-input"
                        value={modal.bank_account_id || ''}
                        onChange={(e) =>
                          setModal((m) => (m ? { ...m, bank_account_id: e.target.value } : null))
                        }
                      >
                        <option value="">{t('expensesPage.selectTreasuryAccount')}</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            {formatBankAccountLabel(b)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="accountings-field">
                      <label>{t('expensesPage.expenseDate')} *</label>
                      <input
                        type="date"
                        className="accountings-input"
                        value={modal.expense_date}
                        onChange={(e) => setModal((m) => (m ? { ...m, expense_date: e.target.value } : null))}
                      />
                    </div>
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.description')} *</label>
                      <input
                        type="text"
                        className="accountings-input"
                        value={modal.description}
                        onChange={(e) => setModal((m) => (m ? { ...m, description: e.target.value } : null))}
                      />
                    </div>
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.category')} *</label>
                      <AsyncSelect
                        className="expenses-async-select"
                        value={getCategoryOption(modal.expense_category_id, modal.category_name)}
                        onChange={(opt) => {
                          if (!opt || opt.value === '' || opt.value == null) {
                            setModal((m) => (m ? { ...m, expense_category_id: '', marketing_subcategory: '' } : null))
                            return
                          }
                          const id = String(opt.value)
                          const cat = categories.find((c) => String(c.id) === id)
                          setModal((m) => {
                            if (!m) return null
                            const next = { ...m, expense_category_id: id }
                            if (!isMarketingCategoryRecord(cat)) next.marketing_subcategory = ''
                            return next
                          })
                        }}
                        loadOptions={loadCategoryOptions}
                        placeholder={t('expensesPage.selectCategory')}
                        isClearable
                      />
                    </div>
                    {showMarketingField && (
                      <div className="accountings-field accountings-field--full">
                        <label>{t('expensesPage.marketingSubcategory')}</label>
                        <AsyncSelect
                          className="expenses-async-select"
                          value={getMarketingSubOption(modal.marketing_subcategory)}
                          onChange={(opt) =>
                            setModal((m) =>
                              m ? { ...m, marketing_subcategory: opt?.value != null ? String(opt.value) : '' } : null,
                            )
                          }
                          loadOptions={loadMarketingSubOptions}
                          placeholder={t('expensesPage.marketingSubcategoryPlaceholder')}
                          isClearable
                        />
                      </div>
                    )}
                    <div className="accountings-field">
                      <label>{t('expensesPage.shipment')}</label>
                      <select
                        className="accountings-input"
                        value={modal.shipment_id}
                        onChange={(e) => setModal((m) => (m ? { ...m, shipment_id: e.target.value } : null))}
                      >
                        <option value="">{t('expensesPage.selectShipment')}</option>
                        {shipmentSelectOptions.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.bl_number || s.booking_number || `#${s.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="accountings-field">
                      <label>{t('expensesPage.linkedCustomerOptional')}</label>
                      <select
                        className="accountings-input"
                        value={modal.client_id}
                        onChange={(e) => setModal((m) => (m ? { ...m, client_id: e.target.value } : null))}
                      >
                        <option value="">—</option>
                        {clientOptions.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.company_name || c.name || `#${c.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.notes')}</label>
                      <textarea
                        className="accountings-input"
                        style={{ minHeight: 50, resize: 'vertical' }}
                        value={modal.notes}
                        onChange={(e) => setModal((m) => (m ? { ...m, notes: e.target.value } : null))}
                      />
                    </div>
                    <div className="accountings-field accountings-field--full">
                      <label>{t('expensesPage.attachmentsLabel')}</label>
                      <div
                        className={`expenses-draft-upload-area ${receiptDragActive ? 'expenses-draft-upload-area--drag' : ''}${saving ? ' expenses-draft-upload-area--disabled' : ''}`}
                        role="button"
                        tabIndex={saving ? -1 : 0}
                        aria-disabled={saving}
                        onKeyDown={(e) => {
                          if (saving) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            createReceiptInputRef.current?.click()
                          }
                        }}
                        onClick={() => {
                          if (!saving) createReceiptInputRef.current?.click()
                        }}
                        onDragEnter={(e) => {
                          if (saving) return
                          e.preventDefault()
                          setReceiptDragActive(true)
                        }}
                        onDragOver={(e) => {
                          if (saving) return
                          e.preventDefault()
                          setReceiptDragActive(true)
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          if (e.currentTarget === e.target) setReceiptDragActive(false)
                        }}
                        onDrop={(e) => {
                          if (saving) return
                          e.preventDefault()
                          setReceiptDragActive(false)
                          const f = e.dataTransfer.files?.[0]
                          if (f) handleReceiptPick(f)
                        }}
                      >
                        <input
                          ref={createReceiptInputRef}
                          type="file"
                          className="expenses-draft-upload-input"
                          accept="image/jpeg,image/png,application/pdf"
                          disabled={saving}
                          aria-label={t('expensesPage.uploadReceipt')}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            e.target.value = ''
                            if (f) handleReceiptPick(f)
                          }}
                          onClick={(ev) => ev.stopPropagation()}
                        />
                        <div className="expenses-draft-upload-icon" aria-hidden>
                          📎
                        </div>
                        <div className="expenses-draft-upload-ut">{t('expensesPage.receiptUploadHint')}</div>
                      </div>
                      {pendingReceiptPreviewUrl && modal.pendingReceiptFile && (
                        <div className="expenses-receipt-preview-wrap expenses-receipt-preview-wrap--pending">
                          {modal.pendingReceiptFile.type === 'application/pdf' ||
                          /\.pdf$/i.test(modal.pendingReceiptFile.name || '') ? (
                            <iframe
                              title={t('expensesPage.receiptPreview')}
                              src={pendingReceiptPreviewUrl}
                              className="expenses-receipt-preview-frame"
                            />
                          ) : modal.pendingReceiptFile.type?.startsWith('image/') ? (
                            <img src={pendingReceiptPreviewUrl} alt="" className="expenses-receipt-preview-img" />
                          ) : (
                            <p className="expenses-receipt-preview-name">{modal.pendingReceiptFile.name}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
                <div className="accountings-modal-actions">
                  <button type="button" className="accountings-btn" disabled={saving} onClick={() => setModal(null)}>
                    {modal.mode === 'view' ? t('expensesPage.close') : t('expensesPage.cancel')}
                  </button>
                  {modal.mode !== 'view' && (
                    <button
                      type="button"
                      className={`accountings-btn accountings-btn--primary expenses-modal-save-btn`}
                      disabled={saving}
                      onClick={submitModal}
                    >
                      {saving ? t('expensesPage.saving') : t('expensesPage.saveExpense')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteExpenseId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="expenses-delete-dialog-title">
            <div
              className="clients-modal-backdrop"
              onClick={() => !deleteSubmitting && setDeleteExpenseId(null)}
              aria-hidden
            />
            <div className="clients-modal-content">
              <h2 id="expenses-delete-dialog-title">{t('expensesPage.deleteModalTitle')}</h2>
              <p className="expenses-delete-modal-warning">{t('expensesPage.deleteModalWarning')}</p>
              <div className="clients-modal-actions">
                <button
                  type="button"
                  className="clients-btn"
                  onClick={() => setDeleteExpenseId(null)}
                  disabled={deleteSubmitting}
                >
                  {t('expensesPage.cancel')}
                </button>
                <button
                  type="button"
                  className="clients-btn clients-btn--danger"
                  onClick={handleDeleteExpenseConfirm}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? t('expensesPage.deleteModalDeleting') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
