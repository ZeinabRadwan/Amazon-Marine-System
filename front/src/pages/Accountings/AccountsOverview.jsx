import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileSpreadsheet,
  DollarSign,
  ReceiptText,
  HandCoins,
  WalletCards,
  CircleDollarSign,
  Download,
  Search,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Tabs from '../../components/Tabs'
import LoaderDots from '../../components/LoaderDots'
import { StatsCard } from '../../components/StatsCard'
import { Container } from '../../components/Container'
import Pagination from '../../components/Pagination'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  getCustomerStatements,
  getCustomerStatementDetail,
  getPartnerStatementShipmentCosts,
  listBankAccounts,
  listPayments,
  recordPayment,
} from '../../api/accountings'
import { getTreasuryBankOverview } from '../../api/treasury'
import {
  UNASSIGNED_PARTNER_SENTINEL,
  aggregateShipmentCostsByPartner,
  mergeCurrencyMaps,
  remainingBalanceAfterPaid,
} from '../Shipments/shipmentFinancialAggregation'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import '../Shipments/Shipments.css'
import './Accountings.css'
import {
  CurrencyMapBadges,
  currencyMapToExportPlain,
} from './CurrencyMapBadges'
import AccountingsPaymentModal from './AccountingsPaymentModal'
import ClientPaymentModal, { emptyClientPaymentForm } from '../../components/ClientPaymentModal'
import {
  EPS,
  bankSupportsCurrency,
  validateWithdrawalAgainstTreasuryBank,
  rowPaymentStatus,
  resolveCustomerAccountStatus,
  partnerCategoryKey,
  partnerMatchesDateFilter,
  hasPositivePayable,
  countDistinctShipmentsFromLines,
  normalizeAccountingsPaymentCurrency,
  getPartnerTypeDisplayLabel,
} from './accountingsStatementShared'

export default function AccountsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()
  const { isAdminRole, isAccountant } = useAuthAccess()
  const canRecordAdvancePayment = isAdminRole || isAccountant
  const [activeTab, setActiveTab] = useState('customers')
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  /** Partner Statement lines: cost-invoice items when saved (aligned with Shipment Financials); expense fallback otherwise. */
  const [partnerStatementCostLines, setPartnerStatementCostLines] = useState([])
  /** Per shipment: line vendor + cost-invoice section_meta (matches ShipmentFinancialsModal data). */
  const [shipmentPartnerContexts, setShipmentPartnerContexts] = useState({})
  const [partnerVendorNames, setPartnerVendorNames] = useState({})
  /** vendor id → vendors.type (shipping, transport, customs, other, …) */
  const [partnerVendorTypes, setPartnerVendorTypes] = useState({})
  /** Vendor payments (partner payables settled). */
  const [vendorPayments, setVendorPayments] = useState([])
  const [statementSearch, setStatementSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statementDateFrom, setStatementDateFrom] = useState('')
  const [statementDateTo, setStatementDateTo] = useState('')
  /** paid | partial | unpaid — shared filter */
  const [statementPaymentStatus, setStatementPaymentStatus] = useState('')
  /** Partner Statement only: shipping | transport | customs | insurance */
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('')
  const [customerPage, setCustomerPage] = useState(1)
  const [vendorPage, setVendorPage] = useState(1)
  const pageSize = 10
  const [bankAccounts, setBankAccounts] = useState([])
  /** Raw treasury bank-overview payload ({ banks }) for withdrawal validation */
  const [treasuryBankOverview, setTreasuryBankOverview] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [advancePaymentOpen, setAdvancePaymentOpen] = useState(false)
  const [advancePaymentClientId, setAdvancePaymentClientId] = useState(null)
  const [advancePaymentForm, setAdvancePaymentForm] = useState(emptyClientPaymentForm)
  const [advancePaymentSubmitError, setAdvancePaymentSubmitError] = useState(null)
  const [advancePaymentBusy, setAdvancePaymentBusy] = useState(false)
  const [advanceProofFile, setAdvanceProofFile] = useState(null)
  const [paymentSubmitError, setPaymentSubmitError] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [paymentProofFile, setPaymentProofFile] = useState(null)
  const [payment, setPayment] = useState({
    amount: '',
    currency_code: 'USD',
    method: 'bank_transfer',
    source_account_id: '',
    paid_at: new Date().toISOString().slice(0, 10),
    link_type: 'invoice',
    invoice_id: '',
    shipment_id: '',
    client_id: '',
    vendor_id: '',
    vendor_bill_id: '',
    reference: '',
  })

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(statementSearch.trim()), 400)
    return () => window.clearTimeout(id)
  }, [statementSearch])

  const loadOverview = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [customersRes, partnerCostsRes, banksRes, paymentsRes, treasuryRes] = await Promise.all([
        getCustomerStatements(token, {
          status: statementPaymentStatus || undefined,
          search: debouncedSearch || undefined,
          date_from: statementDateFrom || undefined,
          date_to: statementDateTo || undefined,
        }),
        getPartnerStatementShipmentCosts(token),
        listBankAccounts(token),
        listPayments(token, { type: 'vendor_payment' }),
        getTreasuryBankOverview(token).catch(() => null),
      ])
      setCustomers(Array.isArray(customersRes?.data) ? customersRes.data : [])
      const pdata = partnerCostsRes?.data ?? partnerCostsRes
      const costLines = Array.isArray(pdata?.lines) ? pdata.lines : []
      setPartnerStatementCostLines(costLines)
      setShipmentPartnerContexts(pdata?.contexts && typeof pdata.contexts === 'object' ? pdata.contexts : {})
      setPartnerVendorNames(pdata?.vendor_names && typeof pdata.vendor_names === 'object' ? pdata.vendor_names : {})
      setPartnerVendorTypes(pdata?.vendor_types && typeof pdata.vendor_types === 'object' ? pdata.vendor_types : {})

      setBankAccounts(Array.isArray(banksRes?.data) ? banksRes.data : [])
      setVendorPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : [])
      setTreasuryBankOverview(treasuryRes && typeof treasuryRes === 'object' ? treasuryRes : null)
    } finally {
      setLoading(false)
    }
  }, [token, debouncedSearch, statementPaymentStatus, statementDateFrom, statementDateTo])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    setCustomerPage(1)
    setVendorPage(1)
  }, [debouncedSearch, statementSearch, statementPaymentStatus, statementDateFrom, statementDateTo, partnerTypeFilter])

  const openPayment = (ctx = {}) => {
    setPaymentModal(true)
    setPaymentSubmitError(null)
    setPaymentProofFile(null)
    setPayment((prev) => ({
      ...prev,
      link_type: ctx.link_type || 'invoice',
      invoice_id: ctx.invoice_id ? String(ctx.invoice_id) : '',
      shipment_id: ctx.shipment_id ? String(ctx.shipment_id) : '',
      client_id: ctx.client_id ? String(ctx.client_id) : '',
      vendor_id: ctx.vendor_id ? String(ctx.vendor_id) : '',
      vendor_bill_id: ctx.vendor_bill_id ? String(ctx.vendor_bill_id) : '',
      currency_code: normalizeAccountingsPaymentCurrency(ctx.currency_code ?? prev.currency_code),
    }))
  }

  const openAdvancePayment = (clientId) => {
    setAdvancePaymentClientId(clientId)
    setAdvancePaymentForm(emptyClientPaymentForm())
    setAdvancePaymentSubmitError(null)
    setAdvanceProofFile(null)
    setAdvancePaymentOpen(true)
  }

  const submitAdvancePayment = async () => {
    if (!token || advancePaymentClientId == null) return
    const amount = Number(advancePaymentForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const payload = new FormData()
    payload.append('type', 'client_receipt')
    payload.append('amount', String(amount))
    payload.append('currency_code', advancePaymentForm.currency)
    payload.append('method', advancePaymentForm.method || 'bank_transfer')
    payload.append('paid_at', advancePaymentForm.paid_at || new Date().toISOString().slice(0, 10))
    payload.append('client_id', String(Number(advancePaymentClientId)))
    if (advancePaymentForm.bank_account_id) {
      payload.append('source_account_id', String(Number(advancePaymentForm.bank_account_id)))
    }
    if (advancePaymentForm.reference) {
      payload.append('reference', String(advancePaymentForm.reference).trim())
    }
    if (advanceProofFile) payload.append('proof_file', advanceProofFile)
    setAdvancePaymentBusy(true)
    setAdvancePaymentSubmitError(null)
    try {
      await recordPayment(token, payload)
      setAdvancePaymentOpen(false)
      setAdvancePaymentClientId(null)
      setAdvancePaymentForm(emptyClientPaymentForm())
      await loadOverview()
    } catch (e) {
      setAdvancePaymentSubmitError(e?.message || String(e))
    } finally {
      setAdvancePaymentBusy(false)
    }
  }

  const triggerBlobDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCustomerStatementSnapshot = async (customerId, customerName) => {
    if (!token || !customerId) return
    const res = await getCustomerStatementDetail(token, customerId)
    const rows = Array.isArray(res?.data?.invoices) ? res.data.invoices : []
    const lines = [
      ['Invoice', 'Shipment', 'Date', 'Total', 'Paid', 'Remaining', 'Status'],
      ...rows.map((r) => [
        r.invoice_reference || '',
        r.shipment_reference || '',
        r.issue_date || '',
        currencyMapToExportPlain(r.total_amount),
        currencyMapToExportPlain(r.paid_amount),
        currencyMapToExportPlain(r.remaining_amount),
        r.status || '',
      ]),
    ].map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    triggerBlobDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `customer-statement-${customerName || customerId}.csv`)
  }

  const downloadPartnerCostSnapshot = (partnerName, lines) => {
    const rows = Array.isArray(lines) ? lines : []
    const csvLines = [
      ['BL', 'Shipment ID', 'Date', 'Description', 'Currency', 'Amount'],
      ...rows.map((r) => [
        r.bl_number || '',
        r.shipment_id != null ? String(r.shipment_id) : '',
        r.expense_date || '',
        r.description || '',
        r.currency_code || '',
        Number(r.amount) || 0,
      ]),
    ].map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    triggerBlobDownload(
      new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
      `partner-cost-statement-${partnerName || 'partner'}.csv`,
    )
  }

  const submitPayment = async () => {
    if (!token) return
    const amount = Number(payment.amount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const isPartner = payment.link_type === 'partner' || payment.link_type === 'shipment_partner'
    const curCode = normalizeAccountingsPaymentCurrency(payment.currency_code)
    const selectedBank = bankAccounts.find((b) => Number(b.id) === Number(payment.source_account_id))
    const fxScenario =
      Boolean(selectedBank) &&
      Array.isArray(selectedBank.supported_currencies) &&
      selectedBank.supported_currencies.length > 0 &&
      !bankSupportsCurrency(selectedBank, curCode)
    if (
      isPartner &&
      payment.source_account_id &&
      !fxScenario &&
      Array.isArray(treasuryBankOverview?.banks)
    ) {
      const check = validateWithdrawalAgainstTreasuryBank({
        bankId: payment.source_account_id,
        currencyCode: curCode,
        amount,
        treasuryBanks: treasuryBankOverview.banks,
      })
      if (!check.ok) {
        setPaymentSubmitError(t('payments.insufficientBalanceCurrency'))
        return
      }
    }
    const payload = new FormData()
    payload.append('type', isPartner ? 'vendor_payment' : 'client_receipt')
    payload.append('amount', String(amount))
    payload.append('currency_code', curCode)
    payload.append('method', payment.method || 'bank_transfer')
    payload.append('paid_at', payment.paid_at || new Date().toISOString().slice(0, 10))
    if (payment.source_account_id) payload.append('source_account_id', String(Number(payment.source_account_id)))
    if (payment.invoice_id) payload.append('invoice_id', String(Number(payment.invoice_id)))
    if (payment.vendor_bill_id) payload.append('vendor_bill_id', String(Number(payment.vendor_bill_id)))
    if (payment.shipment_id) payload.append('shipment_id', String(Number(payment.shipment_id)))
    if (payment.client_id) payload.append('client_id', String(Number(payment.client_id)))
    if (payment.vendor_id) payload.append('vendor_id', String(Number(payment.vendor_id)))
    if (payment.reference) payload.append('reference', String(payment.reference).trim())
    if (paymentProofFile) payload.append('proof_file', paymentProofFile)
    setPaymentBusy(true)
    setPaymentSubmitError(null)
    try {
      await recordPayment(token, payload)
      setPaymentModal(null)
      setPaymentSubmitError(null)
      await loadOverview()
    } catch (e) {
      setPaymentSubmitError(e?.message || String(e))
    } finally {
      setPaymentBusy(false)
    }
  }

  const customerSummary = useMemo(() => {
    const totals = customers.reduce(
      (acc, row) => {
        acc.invoiceCount += Number(row.invoice_count || 0)
        acc.paidMap = mergeCurrencyMaps(acc.paidMap, row.paid_amount || {})
        acc.outstandingMap = mergeCurrencyMaps(acc.outstandingMap, row.remaining_balance || {})
        acc.unpaid += Number(row.invoice_status_counts?.unpaid || 0)
        if (resolveCustomerAccountStatus(row) === 'unpaid' || resolveCustomerAccountStatus(row) === 'partial') {
          acc.customersWithBalance += 1
        }
        return acc
      },
      { invoiceCount: 0, paidMap: {}, outstandingMap: {}, unpaid: 0, customersWithBalance: 0 }
    )
    return totals
  }, [customers])

  /** Same keys as partnerStatementStats for shared stats cards. */
  const customerStatementHeadline = useMemo(
    () => ({
      totalCount: customers.length,
      unpaidCount: customerSummary.customersWithBalance,
      paidMap: customerSummary.paidMap,
      outstandingMap: customerSummary.outstandingMap,
    }),
    [customers.length, customerSummary],
  )

  const advancePrepaidForModal = useMemo(() => {
    if (!advancePaymentClientId) return null
    const row = customers.find((c) => String(c.customer_id) === String(advancePaymentClientId))
    return row?.prepaid_balance && typeof row.prepaid_balance === 'object' ? row.prepaid_balance : null
  }, [advancePaymentClientId, customers])

  const partnerCostRows = useMemo(() => {
    const rows = aggregateShipmentCostsByPartner(
      partnerStatementCostLines,
      shipmentPartnerContexts,
      partnerVendorNames,
    )
    return rows.filter((row) => hasPositivePayable(row.payable_by_currency))
  }, [partnerStatementCostLines, shipmentPartnerContexts, partnerVendorNames])

  /** Per-partner: shipment costs (payable) + vendor_payment totals by partner id + remaining (cost-based only). */
  const partnerStatementRows = useMemo(() => {
    const paidByVendorId = new Map()
    for (const p of vendorPayments || []) {
      const vid = Number(p.vendor_id)
      if (!Number.isFinite(vid) || vid <= 0) continue
      const cur = String(p.currency_code || 'USD').toUpperCase()
      const amt = Number(p.amount) || 0
      if (amt <= 0) continue
      if (!paidByVendorId.has(vid)) paidByVendorId.set(vid, {})
      const m = paidByVendorId.get(vid)
      m[cur] = (m[cur] || 0) + amt
    }
    return partnerCostRows.map((row) => {
      const pid = row.partner_id
      const paidMap = pid ? paidByVendorId.get(pid) || {} : {}
      const remainingMap = remainingBalanceAfterPaid(row.payable_by_currency || {}, paidMap)
      return {
        ...row,
        shipments_count: countDistinctShipmentsFromLines(row.lines),
        paid_by_currency: paidMap,
        remaining_by_currency: remainingMap,
      }
    })
  }, [partnerCostRows, vendorPayments])

  const partnerDisplayName = useCallback(
    (name) =>
      name === UNASSIGNED_PARTNER_SENTINEL
        ? t('accountings.unassignedPartnerCosts', 'Unassigned partner')
        : name,
    [t],
  )

  /** Label for Partner Statement column — uses partnerLedger.categories (matches DB partner type codes). */
  const partnerTypeLabel = useCallback(
    (row) => getPartnerTypeDisplayLabel(row, partnerVendorTypes, t),
    [partnerVendorTypes, t],
  )

  const filteredPartnerRows = useMemo(() => {
    let rows = partnerStatementRows
    const q = statementSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => partnerDisplayName(r.partner_name).toLowerCase().includes(q))
    }
    if (statementPaymentStatus) {
      rows = rows.filter(
        (r) => rowPaymentStatus(r.paid_by_currency, r.remaining_by_currency) === statementPaymentStatus,
      )
    }
    if (statementDateFrom || statementDateTo) {
      rows = rows.filter((r) => partnerMatchesDateFilter(r.lines, statementDateFrom, statementDateTo))
    }
    if (partnerTypeFilter) {
      rows = rows.filter((r) => partnerCategoryKey(r, partnerVendorTypes) === partnerTypeFilter)
    }
    return rows
  }, [
    partnerStatementRows,
    statementSearch,
    statementPaymentStatus,
    statementDateFrom,
    statementDateTo,
    partnerTypeFilter,
    partnerVendorTypes,
    partnerDisplayName,
  ])

  /** Partner headline metrics from filtered partner rows (aligned with Customer Statement cards). */
  const partnerStatementStats = useMemo(() => {
    const rows = filteredPartnerRows
    const totalCount = rows.reduce((acc, row) => acc + row.expense_line_count, 0)
    const dueMap = rows.reduce((acc, row) => mergeCurrencyMaps(acc, row.payable_by_currency || {}), {})

    const vendorIdsFromCosts = new Set()
    for (const row of rows) {
      if (row.partner_id) {
        vendorIdsFromCosts.add(row.partner_id)
      }
    }
    const paidMap = {}
    if (vendorIdsFromCosts.size > 0) {
      for (const p of vendorPayments || []) {
        const vid = Number(p.vendor_id)
        if (!vendorIdsFromCosts.has(vid)) {
          continue
        }
        const cur = String(p.currency_code || 'USD').toUpperCase()
        const amt = Number(p.amount) || 0
        if (amt <= 0) {
          continue
        }
        paidMap[cur] = (paidMap[cur] || 0) + amt
      }
    }

    const outstandingMap = {}
    const currencies = new Set([...Object.keys(dueMap), ...Object.keys(paidMap)])
    for (const c of currencies) {
      outstandingMap[c] = (Number(dueMap[c]) || 0) - (Number(paidMap[c]) || 0)
    }

    const unpaidCount = rows.filter((row) =>
      Object.values(row.remaining_by_currency || {}).some((v) => Number(v) > EPS),
    ).length

    return { totalCount, unpaidCount, paidMap, outstandingMap }
  }, [filteredPartnerRows, vendorPayments])

  const headlineStats = activeTab === 'customers' ? customerStatementHeadline : partnerStatementStats

  const customerTotalPages = Math.max(1, Math.ceil(customers.length / pageSize))
  const partnerTotalPages = Math.max(1, Math.ceil(filteredPartnerRows.length / pageSize))

  const pagedCustomers = useMemo(
    () => customers.slice((customerPage - 1) * pageSize, customerPage * pageSize),
    [customers, customerPage],
  )
  const pagedPartnerRows = useMemo(
    () => filteredPartnerRows.slice((vendorPage - 1) * pageSize, vendorPage * pageSize),
    [filteredPartnerRows, vendorPage],
  )

  const clearStatementFilters = useCallback(() => {
    setStatementSearch('')
    setStatementDateFrom('')
    setStatementDateTo('')
    setStatementPaymentStatus('')
    setPartnerTypeFilter('')
  }, [])

  return (
    <Container size="xl">
      <div className="clients-page accountings-page">
        <div className="invoices-tabs-wrap mb-4">
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'customers', label: t('accountings.customerStatement', 'Customer Statement') },
              { id: 'partners', label: t('accountings.partnerStatementTab', 'Partner Statement') },
            ]}
          />
        </div>

        <section className="accountings-statement-stats" aria-label={t('accountings.statementSummaryRegion', 'Statement summary')}>
          <div className="clients-stats-grid accountings-stats-grid accountings-stats-grid--statement">
            <StatsCard
              className="accountings-stat-card"
              title={
                activeTab === 'customers'
                  ? t('accountings.totalCustomersCount', 'Total customers')
                  : t('accountings.totalInvoicesCount')
              }
              value={headlineStats.totalCount}
              icon={<WalletCards className="h-4 w-4" aria-hidden />}
              variant="blue"
            />
            <StatsCard
              className="accountings-stat-card"
              title={t('accountings.unpaidInvoicesCount')}
              value={headlineStats.unpaidCount}
              icon={<ReceiptText className="h-4 w-4" aria-hidden />}
              variant="amber"
            />
            <StatsCard
              className="accountings-stat-card"
              title={t('accountings.totalPaidAmount')}
              value={<CurrencyMapBadges value={headlineStats.paidMap} />}
              icon={<CircleDollarSign className="h-4 w-4" aria-hidden />}
              variant="green"
            />
            <StatsCard
              className="accountings-stat-card"
              title={t('accountings.outstandingBalance')}
              value={<CurrencyMapBadges value={headlineStats.outstandingMap} />}
              icon={<HandCoins className="h-4 w-4" aria-hidden />}
              variant="red"
            />
          </div>
        </section>

        {loading ? <LoaderDots /> : null}

        <div className="accountings-filters-card accountings-statement-filters mb-3">
          <div className="accountings-filters__row accountings-filters__row--main flex flex-wrap items-end gap-3">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('accountings.filterSearch', 'Search')}
              </span>
              <span className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" aria-hidden />
                <input
                  type="search"
                  className="clients-input w-full pl-9"
                  value={statementSearch}
                  onChange={(e) => setStatementSearch(e.target.value)}
                  placeholder={t('accountings.filterSearchPlaceholder', 'Search…')}
                />
              </span>
            </label>
            <label className="flex min-w-[140px] flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('accountings.filterDateFrom', 'From')}
              <input
                type="date"
                className="clients-input"
                value={statementDateFrom}
                onChange={(e) => setStatementDateFrom(e.target.value)}
              />
            </label>
            <label className="flex min-w-[140px] flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('accountings.filterDateTo', 'To')}
              <input
                type="date"
                className="clients-input"
                value={statementDateTo}
                onChange={(e) => setStatementDateTo(e.target.value)}
              />
            </label>
            <label className="flex min-w-[160px] flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('accountings.filterPaymentStatus', 'Payment status')}
              <select
                className="clients-input min-w-[160px]"
                value={statementPaymentStatus}
                onChange={(e) => setStatementPaymentStatus(e.target.value)}
              >
                <option value="">{t('accountings.filterPaymentStatusAll', 'All')}</option>
                <option value="paid">{t('invoices.status.paid')}</option>
                <option value="partial">{t('invoices.status.partial')}</option>
                <option value="unpaid">{t('invoices.status.unpaid')}</option>
              </select>
            </label>
            {activeTab === 'partners' ? (
              <label className="flex min-w-[200px] flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('accountings.filterPartnerType', 'Partner type')}
                <select
                  className="clients-input min-w-[200px]"
                  value={partnerTypeFilter}
                  onChange={(e) => setPartnerTypeFilter(e.target.value)}
                >
                  <option value="">{t('accountings.partnerTypeAll', 'All')}</option>
                  <option value="shipping">{t('accountings.partnerTypeShipping', 'Shipping lines')}</option>
                  <option value="transport">{t('accountings.partnerTypeTransport', 'Transport contractors')}</option>
                  <option value="customs">{t('accountings.partnerTypeCustoms', 'Customs clearance')}</option>
                  <option value="insurance">{t('accountings.partnerTypeInsurance', 'Insurance')}</option>
                </select>
              </label>
            ) : null}
            <button type="button" className="accountings-btn h-10 shrink-0 self-end" onClick={clearStatementFilters}>
              {t('accountings.clearFilters', 'Clear filters')}
            </button>
          </div>
        </div>

        {activeTab === 'customers' && (
          <div className="accountings-table-section">
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.colClient', 'Customer')}</th>
                    <th>{t('accountings.colCurrentBalance', 'Current balance')}</th>
                    <th>{t('accountings.colInvoiceCount', 'Total invoices')}</th>
                    <th>{t('accountings.colTotalPayments', 'Total payments')}</th>
                    <th>{t('accountings.colRelatedShipments', 'Shipments')}</th>
                    <th>{t('accountings.colTotalDue', 'Total invoiced')}</th>
                    <th>{t('accountings.status')}</th>
                    <th>{t('accountings.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCustomers.map((row) => (
                    <tr key={row.customer_id}>
                      <td>{row.customer_name}</td>
                      <td>
                        <CurrencyMapBadges value={row.current_balance ?? row.remaining_balance} size="sm" />
                      </td>
                      <td>{Number(row.invoice_count || 0)}</td>
                      <td>
                        <CurrencyMapBadges value={row.paid_amount} size="sm" />
                      </td>
                      <td className="tabular-nums">{Number(row.shipments_count ?? 0)}</td>
                      <td>
                        <CurrencyMapBadges value={row.total_invoices_value} size="sm" />
                      </td>
                      <td>
                        <InvoiceStatusBadge status={resolveCustomerAccountStatus(row)} t={t} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('accountings.viewStatement')}
                          aria-label={t('accountings.viewStatement')}
                          onClick={() => navigate(`/accountings/customers/${row.customer_id}/statement`)}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('accountings.recordPayment')}
                          aria-label={t('accountings.recordPayment')}
                          onClick={() => openPayment({ link_type: 'customer', client_id: row.customer_id })}
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        {canRecordAdvancePayment ? (
                          <button
                            type="button"
                            className="accountings-action-icon-btn accountings-action-icon-btn--advance"
                            title={t('accountings.recordAdvancePayment', 'Record advance payment')}
                            aria-label={t('accountings.recordAdvancePayment', 'Record advance payment')}
                            onClick={() => openAdvancePayment(row.customer_id)}
                          >
                            <Wallet className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('invoices.downloadPdf', 'Download PDF')}
                          aria-label={t('invoices.downloadPdf', 'Download PDF')}
                          onClick={() => downloadCustomerStatementSnapshot(row.customer_id, row.customer_name)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!customers.length && !loading && (
                    <tr>
                      <td colSpan={9} className="accountings-empty py-8 text-center">
                        {t('accountings.emptyClients', 'No customer accounts found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="clients-pagination">
              <div className="clients-pagination__left">
                <span className="clients-pagination__total">
                  {t('clients.total', 'Total')}: {customers.length}
                </span>
              </div>
              <Pagination currentPage={customerPage} totalPages={customerTotalPages} onPageChange={setCustomerPage} />
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="accountings-table-section">
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.colPartner', 'Partner')}</th>
                    <th>{t('accountings.colRelatedShipments', 'Shipments')}</th>
                    <th>{t('accountings.colPartnerType', 'Partner type')}</th>
                    <th>{t('accountings.partnerTotalPayable', 'Total payable')}</th>
                    <th>{t('accountings.partnerTableTotalPaid', 'Total paid')}</th>
                    <th>{t('accountings.partnerTableRemainingBalance', 'Remaining balance')}</th>
                    <th>{t('accountings.status')}</th>
                    <th>{t('accountings.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPartnerRows.map((row) => (
                    <tr key={row.key}>
                      <td className="font-semibold">{partnerDisplayName(row.partner_name)}</td>
                      <td className="tabular-nums">{Number(row.shipments_count ?? 0)}</td>
                      <td className="text-sm text-slate-700 dark:text-slate-300">{partnerTypeLabel(row)}</td>
                      <td>
                        <CurrencyMapBadges value={row.payable_by_currency} size="sm" />
                      </td>
                      <td>
                        <CurrencyMapBadges value={row.paid_by_currency} size="sm" />
                      </td>
                      <td>
                        <CurrencyMapBadges value={row.remaining_by_currency} size="sm" />
                      </td>
                      <td>
                        <InvoiceStatusBadge
                          status={rowPaymentStatus(row.paid_by_currency, row.remaining_by_currency)}
                          t={t}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          disabled={!row.partner_id}
                          title={
                            row.partner_id
                              ? t('accountings.viewStatement')
                              : t('accountings.partnerViewNeedsVendor', 'Assign a partner to view this statement')
                          }
                          aria-label={t('accountings.viewStatement')}
                          onClick={() => {
                            if (row.partner_id != null) navigate(`/accountings/partners/${row.partner_id}/statement`)
                          }}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          disabled={!row.partner_id}
                          title={
                            row.partner_id
                              ? t('accountings.recordPayment')
                              : t('accountings.partnerPaymentNeedsVendor', 'Link costs to a partner to record payment')
                          }
                          aria-label={t('accountings.recordPayment')}
                          onClick={() =>
                            row.partner_id && openPayment({ link_type: 'partner', vendor_id: row.partner_id })
                          }
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('accountings.exportCsv', 'Download CSV')}
                          aria-label={t('accountings.exportCsv', 'Download CSV')}
                          onClick={() => downloadPartnerCostSnapshot(row.partner_name, row.lines)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredPartnerRows.length && !loading && (
                <p className="accountings-empty py-8 text-center text-gray-600 dark:text-gray-400">
                  {t('accountings.emptyPartnerCosts', 'No shipment cost lines found. Record costs under Shipment Financials.')}
                </p>
              )}
            </div>
            <div className="clients-pagination">
              <div className="clients-pagination__left">
                <span className="clients-pagination__total">
                  {t('clients.total', 'Total')}: {filteredPartnerRows.length}
                </span>
              </div>
              <Pagination currentPage={vendorPage} totalPages={partnerTotalPages} onPageChange={setVendorPage} />
            </div>
          </div>
        )}

        <AccountingsPaymentModal
          open={!!paymentModal}
          onClose={() => {
            setPaymentModal(null)
            setPaymentSubmitError(null)
          }}
          t={t}
          payment={payment}
          setPayment={setPayment}
          paymentBusy={paymentBusy}
          bankAccounts={bankAccounts}
          paymentProofFile={paymentProofFile}
          setPaymentProofFile={setPaymentProofFile}
          onSubmit={submitPayment}
          submitError={paymentSubmitError}
        />

        <ClientPaymentModal
          open={advancePaymentOpen}
          onClose={() => {
            setAdvancePaymentOpen(false)
            setAdvancePaymentClientId(null)
            setAdvancePaymentSubmitError(null)
          }}
          onSubmit={submitAdvancePayment}
          saving={advancePaymentBusy}
          submitError={advancePaymentSubmitError}
          mode="advance"
          form={advancePaymentForm}
          setForm={setAdvancePaymentForm}
          bankAccounts={bankAccounts}
          prepaidByCurrency={advancePrepaidForModal}
          proofFile={advanceProofFile}
          setProofFile={setAdvanceProofFile}
          titleId="accountings-advance-payment-modal-title"
        />
      </div>
    </Container>
  )
}
