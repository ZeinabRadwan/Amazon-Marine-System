import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  PanelRight,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'
import { getStoredToken } from '../Login'
import {
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
import { CurrencyMapBadges } from './CurrencyMapBadges'
import AccountingsPaymentModal from './AccountingsPaymentModal'
import {
  bankSupportsCurrency,
  validateWithdrawalAgainstTreasuryBank,
  countDistinctShipmentsFromLines,
  enrichPartnerCostLines,
  currencyMapHasPositivePaid,
  formatStatementDetailDate,
  getPartnerTypeDisplayLabel,
  hasPositivePayable,
  normalizeAccountingsPaymentCurrency,
  partnerCostLineDisplayLabel,
  paymentMethodLabel,
  rowPaymentStatus,
  StatementShipmentMeta,
  vendorPaymentMatchesShipment,
  vendorPaymentPostedAt,
  vendorPaymentSettlementTrace,
} from './accountingsStatementShared'

/** Amount columns: unified accounting badges (amount first), single-currency map per cell. */
function amountBadgeMap(amount, currencyCode) {
  const c = String(currencyCode || 'USD').toUpperCase()
  const n = Number(amount)
  if (!Number.isFinite(n)) return {}
  return { [c]: n }
}

export default function PartnerStatementDetailPage() {
  const { partnerId } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [partnerStatementCostLines, setPartnerStatementCostLines] = useState([])
  const [shipmentPartnerContexts, setShipmentPartnerContexts] = useState({})
  const [partnerVendorNames, setPartnerVendorNames] = useState({})
  const [partnerVendorTypes, setPartnerVendorTypes] = useState({})
  const [vendorPayments, setVendorPayments] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [treasuryBankOverview, setTreasuryBankOverview] = useState(null)

  const [shipmentExpand, setShipmentExpand] = useState({})
  const [paymentModal, setPaymentModal] = useState(null)
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
  })

  const partnerDisplayName = useCallback(
    (name) =>
      name === UNASSIGNED_PARTNER_SENTINEL
        ? t('accountings.unassignedPartnerCosts', 'Unassigned partner')
        : name,
    [t],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token || !partnerId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        const [partnerCostsRes, banksRes, paymentsRes, treasuryRes] = await Promise.all([
          getPartnerStatementShipmentCosts(token),
          listBankAccounts(token),
          listPayments(token, { type: 'vendor_payment' }),
          getTreasuryBankOverview(token).catch(() => null),
        ])
        if (cancelled) return
        const pdata = partnerCostsRes?.data ?? partnerCostsRes
        const costLines = Array.isArray(pdata?.lines) ? pdata.lines : []
        setPartnerStatementCostLines(costLines)
        setShipmentPartnerContexts(pdata?.contexts && typeof pdata.contexts === 'object' ? pdata.contexts : {})
        setPartnerVendorNames(pdata?.vendor_names && typeof pdata.vendor_names === 'object' ? pdata.vendor_names : {})
        setPartnerVendorTypes(pdata?.vendor_types && typeof pdata.vendor_types === 'object' ? pdata.vendor_types : {})
        setBankAccounts(Array.isArray(banksRes?.data) ? banksRes.data : [])
        setVendorPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : [])
        setTreasuryBankOverview(treasuryRes && typeof treasuryRes === 'object' ? treasuryRes : null)
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, partnerId])

  const partnerCostRows = useMemo(() => {
    const rows = aggregateShipmentCostsByPartner(
      partnerStatementCostLines,
      shipmentPartnerContexts,
      partnerVendorNames,
    )
    return rows.filter((row) => hasPositivePayable(row.payable_by_currency))
  }, [partnerStatementCostLines, shipmentPartnerContexts, partnerVendorNames])

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

  const partnerRow = useMemo(() => {
    const idNum = Number(partnerId)
    if (!Number.isFinite(idNum) || idNum <= 0) return null
    return partnerStatementRows.find((r) => Number(r.partner_id) === idNum) || null
  }, [partnerStatementRows, partnerId])

  const partnerDetail = useMemo(() => {
    if (!partnerRow) return null
    return {
      partner_id: partnerRow.partner_id,
      partner_name: partnerRow.partner_name,
      partner_type_label: getPartnerTypeDisplayLabel(partnerRow, partnerVendorTypes, t),
      payable_by_currency: partnerRow.payable_by_currency,
      paid_by_currency: partnerRow.paid_by_currency || {},
      remaining_by_currency: partnerRow.remaining_by_currency || {},
      lines: partnerRow.lines || [],
    }
  }, [partnerRow, partnerVendorTypes, t])

  useEffect(() => {
    setShipmentExpand({})
  }, [partnerDetail?.partner_id])

  const partnerStatementDetailTotals = useMemo(() => {
    if (!partnerDetail) {
      return { shipmentCount: 0, totalMap: {}, paidMap: {}, remainingMap: {} }
    }
    const lines = partnerDetail.lines || []
    return {
      shipmentCount: countDistinctShipmentsFromLines(lines),
      totalMap: partnerDetail.payable_by_currency || {},
      paidMap: partnerDetail.paid_by_currency || {},
      remainingMap: partnerDetail.remaining_by_currency || {},
    }
  }, [partnerDetail])

  const partnerStatementCostLinesEnriched = useMemo(() => {
    if (!partnerDetail) return []
    return enrichPartnerCostLines(
      partnerDetail.lines || [],
      partnerDetail.paid_by_currency || {},
      partnerDetail.remaining_by_currency || {},
    )
  }, [partnerDetail])

  /** Vendor payments for this partner (used inside shipment groups + traceability). */
  const partnerVendorPaymentsFlat = useMemo(() => {
    const vid = Number(partnerDetail?.partner_id)
    if (!Number.isFinite(vid) || vid <= 0) return []
    return (vendorPayments || [])
      .filter((p) => Number(p.vendor_id) === vid)
      .slice()
      .sort((a, b) => String(b.paid_at || '').localeCompare(String(a.paid_at || '')))
  }, [partnerDetail?.partner_id, vendorPayments])

  const shipmentGroups = useMemo(() => {
    const lines = partnerStatementCostLinesEnriched
    const byKey = new Map()
    lines.forEach((line, idx) => {
      const sid = line.shipment_id != null ? Number(line.shipment_id) : NaN
      const stableKey =
        Number.isFinite(sid) && sid > 0 ? `s:${sid}` : `u:${line._rowKey ?? line.id ?? idx}`
      if (!byKey.has(stableKey)) {
        byKey.set(stableKey, {
          stableKey,
          shipmentId: Number.isFinite(sid) && sid > 0 ? sid : null,
          bl_number: line.bl_number,
          shipment_type: line.shipment_type,
          booking_number: line.booking_number,
          lines: [],
        })
      }
      byKey.get(stableKey).lines.push(line)
    })
    const groups = []
    for (const g of byKey.values()) {
      const invoiceLines = g.lines.filter((l) => l._source === 'cost_invoice')
      const dueBasis = invoiceLines.length > 0 ? invoiceLines : g.lines
      let payableMap = {}
      let paidAllocMap = {}
      let remAllocMap = {}
      for (const ln of dueBasis) {
        const c = String(ln.currency_code || 'USD').toUpperCase()
        payableMap = mergeCurrencyMaps(payableMap, { [c]: Number(ln.amount) || 0 })
      }
      for (const ln of g.lines) {
        const c = String(ln.currency_code || 'USD').toUpperCase()
        paidAllocMap = mergeCurrencyMaps(paidAllocMap, { [c]: Number(ln._alloc_paid) || 0 })
        remAllocMap = mergeCurrencyMaps(remAllocMap, { [c]: Number(ln._alloc_remaining) || 0 })
      }
      const meta = g.lines[0]
      groups.push({
        ...g,
        acid_number: meta?.acid_number,
        booking_date: meta?.booking_date,
        is_reefer: Boolean(meta?.is_reefer),
        payableMap,
        paidAllocMap,
        remAllocMap,
        aggregateStatus: rowPaymentStatus(paidAllocMap, remAllocMap),
      })
    }
    groups.sort((a, b) => {
      const na = Number(a.shipmentId)
      const nb = Number(b.shipmentId)
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
      return String(a.stableKey).localeCompare(String(b.stableKey))
    })
    return groups
  }, [partnerStatementCostLinesEnriched])

  const paymentsForShipment = useCallback(
    (shipmentId) => {
      if (shipmentId == null || !Number.isFinite(Number(shipmentId))) return []
      const sid = Number(shipmentId)
      return partnerVendorPaymentsFlat.filter((p) => vendorPaymentMatchesShipment(p, sid))
    },
    [partnerVendorPaymentsFlat],
  )

  const toggleShipmentExpand = useCallback((stableKey) => {
    setShipmentExpand((prev) => ({ ...prev, [stableKey]: !prev[stableKey] }))
  }, [])

  const triggerBlobDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPartnerCostSnapshot = () => {
    const rows = Array.isArray(partnerDetail?.lines) ? partnerDetail.lines : []
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
      `partner-cost-statement-${partnerDetail?.partner_name || 'partner'}.csv`,
    )
  }

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
      Array.isArray(treasuryBankOverview?.banks) &&
      !validateWithdrawalAgainstTreasuryBank({
        bankId: payment.source_account_id,
        currencyCode: curCode,
        amount,
        treasuryBanks: treasuryBankOverview.banks,
      }).ok
    ) {
      setPaymentSubmitError(t('payments.insufficientBalanceCurrency'))
      return
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
    if (paymentProofFile) payload.append('proof_file', paymentProofFile)
    setPaymentBusy(true)
    setPaymentSubmitError(null)
    try {
      await recordPayment(token, payload)
      setPaymentModal(null)
      setPaymentSubmitError(null)
      const [partnerCostsRes, paymentsRes] = await Promise.all([
        getPartnerStatementShipmentCosts(token),
        listPayments(token, { type: 'vendor_payment' }),
      ])
      const pdata = partnerCostsRes?.data ?? partnerCostsRes
      const costLines = Array.isArray(pdata?.lines) ? pdata.lines : []
      setPartnerStatementCostLines(costLines)
      setShipmentPartnerContexts(pdata?.contexts && typeof pdata.contexts === 'object' ? pdata.contexts : {})
      setPartnerVendorNames(pdata?.vendor_names && typeof pdata.vendor_names === 'object' ? pdata.vendor_names : {})
      setPartnerVendorTypes(pdata?.vendor_types && typeof pdata.vendor_types === 'object' ? pdata.vendor_types : {})
      setVendorPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : [])
    } catch (e) {
      setPaymentSubmitError(e?.message || String(e))
    } finally {
      setPaymentBusy(false)
    }
  }

  if (!token) return null

  if (loading && !partnerDetail) {
    return (
      <Container size="xl" className="accountings-statement-page-container">
        <div className="accountings-statement-page-loading">
          <LoaderDots label={t('common.loading', 'Loading...')} />
        </div>
      </Container>
    )
  }

  if (loadError) {
    return (
      <Container size="xl" className="accountings-statement-page-container">
        <div className="accountings-statement-page__toolbar">
          <Link to="/accountings" className="accountings-statement-page__back">
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t('accountings.backToStatements', 'Back to statements')}
          </Link>
        </div>
        <p className="accountings-statement-page-error">{loadError}</p>
      </Container>
    )
  }

  if (!partnerDetail || !partnerRow) {
    return (
      <Container size="xl" className="accountings-statement-page-container">
        <div className="accountings-statement-page__toolbar">
          <Link to="/accountings" className="accountings-statement-page__back">
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t('accountings.backToStatements', 'Back to statements')}
          </Link>
        </div>
        <p className="accountings-statement-page-empty">
          {t('accountings.partnerStatementNotFound', 'Partner statement not found or has no payable costs.')}
        </p>
      </Container>
    )
  }

  return (
    <Container size="xl" className="accountings-statement-page-container">
      <div className="clients-page accountings-page accountings-statement-page">
        <div className="accountings-statement-page__toolbar">
          <Link to="/accountings" className="accountings-statement-page__back">
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t('accountings.backToStatements', 'Back to statements')}
          </Link>
        </div>

        <header className="accountings-statement-detail-header accountings-statement-page__header">
          <div className="accountings-statement-detail-header__main">
            <p className="accountings-statement-detail-eyebrow">
              {t('accountings.statementDetailPartnerTitle', 'Partner Statement Details')}
            </p>
            <h1 className="accountings-statement-detail-title">{partnerDisplayName(partnerDetail.partner_name)}</h1>
            <dl className="accountings-statement-detail-meta">
              <div className="accountings-statement-detail-meta__row">
                <dt>{t('accountings.colPartnerType', 'Partner type')}</dt>
                <dd>
                  <span className="accountings-statement-detail-type-pill">{partnerDetail.partner_type_label || '—'}</span>
                </dd>
              </div>
            </dl>
          </div>
          <div className="accountings-statement-detail-header__actions">
            <button
              type="button"
              className="accountings-statement-detail-header__icon-btn"
              title={t('accountings.exportCsv', 'Download CSV')}
              aria-label={t('accountings.exportCsv', 'Download CSV')}
              onClick={() => downloadPartnerCostSnapshot()}
            >
              <FileSpreadsheet className="accountings-statement-detail-header__icon" aria-hidden />
            </button>
          </div>
        </header>

        <div className="accountings-statement-detail-body accountings-statement-page__body">
          <div className="accountings-statement-detail-summary-grid" aria-label={t('accountings.statementSummaryRegion', 'Statement summary')}>
            <div className="shipment-fin-summary-card rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50/80 dark:bg-slate-900/25 p-4 shadow-sm">
              <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('accountings.summaryCardTotalShipments', 'Total shipments')}
              </div>
              <div className="shipment-fin-summary-card__value font-bold text-2xl text-gray-900 dark:text-gray-100">
                {partnerStatementDetailTotals.shipmentCount}
              </div>
            </div>
            <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/40">
              <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-blue-100/90">
                {t('accountings.partnerTotalPayable', 'Total payable')}
              </div>
              <div className="shipment-fin-summary-card__value font-bold text-xl text-blue-700 dark:text-blue-300">
                <CurrencyMapBadges value={partnerStatementDetailTotals.totalMap} size="sm" />
              </div>
            </div>
            <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/40">
              <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-emerald-900/80">
                {t('accountings.partnerTableTotalPaid', 'Total paid')}
              </div>
              <div className="shipment-fin-summary-card__value font-bold text-xl text-emerald-700 dark:text-emerald-300">
                <CurrencyMapBadges value={partnerStatementDetailTotals.paidMap} size="sm" />
              </div>
            </div>
            <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-amber-50/60 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/35">
              <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-amber-900/80">
                {t('accountings.partnerTableRemainingBalance', 'Remaining balance')}
              </div>
              <div className="shipment-fin-summary-card__value font-bold text-xl text-amber-800 dark:text-amber-200">
                <CurrencyMapBadges value={partnerStatementDetailTotals.remainingMap} size="sm" />
              </div>
            </div>
          </div>

          <section className="accountings-wire-section" aria-labelledby="partner-statement-costs-heading">
            <div className="accountings-wire-section-head">
              <h2 id="partner-statement-costs-heading" className="accountings-wire-section-title">
                {t('accountings.sectionPartnerShipmentsLedger', 'Shipments & payable costs')}
              </h2>
              <span className="accountings-wire-section-hint">
                {t('accountings.sectionPartnerShipmentsLedgerHint', 'One row per shipment — expand for cost lines and payments')}
              </span>
            </div>

            {shipmentGroups.length === 0 ? (
              <p className="accountings-wire-empty">{t('accountings.emptyPartnerCosts')}</p>
            ) : (
              <div className="accountings-wire-card-table accountings-table-wrap accountings-statement-page__table-wrap mt-1">
                <table className="accountings-table accountings-wire-table accountings-partner-ship-ledger-table">
                  <thead>
                    <tr>
                      <th className="accountings-partner-ship-col-expand" aria-hidden />
                      <th>{t('accountings.colShipment', 'Shipment')}</th>
                      <th>{t('accountings.colPayable')}</th>
                      <th>{t('accountings.colPaidAllocated')}</th>
                      <th>{t('accountings.colRemainingAllocated')}</th>
                      <th>{t('accountings.status')}</th>
                      <th>{t('accountings.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipmentGroups.map((group) => {
                      const open = !!shipmentExpand[group.stableKey]
                      const sid = group.shipmentId
                      const shipPayments = sid != null ? paymentsForShipment(sid) : []
                      const hasDirectShipmentPayments = shipPayments.length > 0
                      const showAllocatedPaidRow =
                        !hasDirectShipmentPayments && currencyMapHasPositivePaid(group.paidAllocMap)
                      const showShipmentPaymentsEmpty =
                        !hasDirectShipmentPayments && !showAllocatedPaidRow
                      return (
                        <Fragment key={group.stableKey}>
                          <tr className="accountings-partner-ship-header-row">
                            <td className="accountings-partner-ship-col-expand align-middle">
                              <button
                                type="button"
                                className="accountings-partner-ship-expand-btn"
                                aria-expanded={open}
                                aria-label={t('accountings.expandShipmentDetails', 'Expand shipment details')}
                                onClick={() => toggleShipmentExpand(group.stableKey)}
                              >
                                {open ? (
                                  <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
                                )}
                              </button>
                            </td>
                            <td className="align-middle">
                              <StatementShipmentMeta
                                shipmentId={sid}
                                blNumber={group.bl_number}
                                shipmentType={group.shipment_type}
                                bookingNumber={group.booking_number}
                                acidNumber={group.acid_number}
                                bookingDate={group.booking_date}
                                locale={i18n.language}
                                t={t}
                              />
                            </td>
                            <td className="align-middle">
                              <CurrencyMapBadges value={group.payableMap} size="sm" amountFirst />
                            </td>
                            <td className="align-middle">
                              <CurrencyMapBadges value={group.paidAllocMap} size="sm" amountFirst />
                            </td>
                            <td className="align-middle">
                              <CurrencyMapBadges value={group.remAllocMap} size="sm" amountFirst />
                            </td>
                            <td className="align-middle">
                              <InvoiceStatusBadge status={group.aggregateStatus} t={t} />
                            </td>
                            <td className="align-middle">
                              <div className="accountings-partner-ship-actions flex flex-wrap items-center gap-1">
                                {sid != null && Number(sid) > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      className="accountings-action-icon-btn"
                                      title={t('accountings.openShipmentDetails', 'Open shipment details')}
                                      aria-label={t('accountings.openShipmentDetails')}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/shipments?shipment_id=${Number(sid)}`)
                                      }}
                                    >
                                      <PanelRight className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : null}
                                {partnerDetail.partner_id ? (
                                  <button
                                    type="button"
                                    className="accountings-action-icon-btn"
                                    title={t('accountings.recordPayment')}
                                    aria-label={t('accountings.recordPayment')}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openPayment({
                                        link_type: 'shipment_partner',
                                        shipment_id: sid,
                                        vendor_id: partnerDetail.partner_id,
                                      })
                                    }}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                          {open && (
                            <tr className="accountings-partner-ship-detail-row">
                              <td colSpan={7} className="!p-0 !border-b border-gray-200 dark:border-gray-700">
                                <div className="accountings-partner-ship-nested">
                                  <p className="accountings-partner-subsection-title">
                                    {t('accountings.partnerShipmentCostLines')}
                                  </p>
                                  <div className="accountings-table-wrap overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                    <table className="accountings-table accountings-wire-table text-sm">
                                      <thead>
                                        <tr>
                                          <th>{t('accountings.colCostItem')}</th>
                                          <th>{t('accountings.issueDate')}</th>
                                          <th>{t('accountings.colPayable')}</th>
                                          <th>{t('accountings.colPaidAllocated')}</th>
                                          <th>{t('accountings.colRemainingAllocated')}</th>
                                          <th>{t('accountings.status')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.lines.map((line) => {
                                          const costLabel = partnerCostLineDisplayLabel(line, t, {
                                            isReefer: Boolean(group.is_reefer),
                                          })
                                          const cur = String(line.currency_code || 'USD').toUpperCase()
                                          return (
                                            <tr key={line._rowKey}>
                                              <td className="accountings-statement-page__cost-desc max-w-md">{costLabel}</td>
                                              <td>{formatStatementDetailDate(line.expense_date, i18n.language)}</td>
                                              <td>
                                                <CurrencyMapBadges value={amountBadgeMap(line.amount, cur)} size="sm" amountFirst />
                                              </td>
                                              <td>
                                                <CurrencyMapBadges
                                                  value={amountBadgeMap(line._alloc_paid, cur)}
                                                  size="sm"
                                                  amountFirst
                                                />
                                              </td>
                                              <td>
                                                <CurrencyMapBadges
                                                  value={amountBadgeMap(line._alloc_remaining, cur)}
                                                  size="sm"
                                                  amountFirst
                                                />
                                              </td>
                                              <td>
                                                <InvoiceStatusBadge status={line._alloc_status} t={t} />
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  <p className="accountings-partner-subsection-title">
                                    {t('accountings.partnerShipmentPayments')}
                                  </p>
                                  {showShipmentPaymentsEmpty ? (
                                    <p className="accountings-wire-empty text-sm py-2">
                                      {t('accountings.noVendorPaymentsLinkedToShipment')}
                                    </p>
                                  ) : (
                                    <div className="accountings-table-wrap overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                      <table className="accountings-table accountings-wire-table text-sm">
                                        <thead>
                                          <tr>
                                            <th>{t('invoices.payment.date', 'Date')}</th>
                                            <th>{t('payments.amount', 'Amount')}</th>
                                            <th>{t('invoices.payment.method', 'Method')}</th>
                                            <th>{t('invoices.payment.reference', 'Reference')}</th>
                                            <th>{t('accountings.paymentSettlementTrace', 'Settlement trace')}</th>
                                            <th>{t('accountings.paymentReceipt', 'Receipt')}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {shipPayments.map((p) => {
                                            const cur = String(p.currency_code || 'USD').toUpperCase()
                                            const refText =
                                              (p.reference && String(p.reference).trim()) ||
                                              (p.notes && String(p.notes).trim().slice(0, 120)) ||
                                              ''
                                            const posted = vendorPaymentPostedAt(p)
                                            const proof = p.proof_url ? String(p.proof_url) : ''
                                            return (
                                              <tr key={p.id}>
                                                <td>{formatStatementDetailDate(posted, i18n.language)}</td>
                                                <td>
                                                  <CurrencyMapBadges value={amountBadgeMap(p.amount, cur)} size="sm" amountFirst />
                                                </td>
                                                <td>
                                                  <span className="accountings-wire-badge accountings-wire-badge--method">
                                                    {paymentMethodLabel(p.method, t)}
                                                  </span>
                                                </td>
                                                <td className="max-w-[14rem] text-sm text-slate-700 dark:text-slate-300">
                                                  {refText || '—'}
                                                </td>
                                                <td className="max-w-[12rem] font-mono text-xs text-slate-600 dark:text-slate-400">
                                                  {vendorPaymentSettlementTrace(p)}
                                                </td>
                                                <td className="text-sm">
                                                  {proof ? (
                                                    <a
                                                      href={proof}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 hover:underline dark:text-blue-400"
                                                    >
                                                      {t('accountings.paymentReceiptOpen', 'View')}
                                                    </a>
                                                  ) : (
                                                    '—'
                                                  )}
                                                </td>
                                              </tr>
                                            )
                                          })}
                                          {showAllocatedPaidRow ? (
                                            <tr
                                              key={`alloc-paid-${group.stableKey}`}
                                              className="accountings-partner-ship-alloc-row bg-slate-50/80 dark:bg-slate-800/40"
                                            >
                                              <td>—</td>
                                              <td>
                                                <CurrencyMapBadges
                                                  value={group.paidAllocMap}
                                                  size="sm"
                                                  amountFirst
                                                />
                                              </td>
                                              <td>
                                                <span className="accountings-wire-badge accountings-wire-badge--method">
                                                  {t('accountings.paymentMethodAllocated')}
                                                </span>
                                              </td>
                                              <td className="max-w-[18rem] text-sm text-slate-600 dark:text-slate-400">
                                                {t('accountings.partnerShipmentAllocatedPaidHint')}
                                              </td>
                                              <td>—</td>
                                              <td>—</td>
                                            </tr>
                                          ) : null}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

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
    </Container>
  )
}
