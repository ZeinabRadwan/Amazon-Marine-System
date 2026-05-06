import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, X, DollarSign, ReceiptText, HandCoins, WalletCards, CircleDollarSign, Eye, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Tabs from '../../components/Tabs'
import LoaderDots from '../../components/LoaderDots'
import { StatsCard } from '../../components/StatsCard'
import { Container } from '../../components/Container'
import Pagination from '../../components/Pagination'
import { downloadInvoicePdf } from '../../api/invoices'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'
import { getStoredToken } from '../Login'
import {
  getCustomerStatements,
  getCustomerStatementDetail,
  getPartnerLedgerSummary,
  getPartnerLedgerDetail,
  listBankAccounts,
  recordPayment,
} from '../../api/accountings'
import '../Clients/Clients.css'
import './Accountings.css'

function mapToInline(value) {
  const normalized = normalizeCurrencyMapInput(value)
  const entries = Object.entries(normalized).filter(([, amount]) => Number(amount) !== 0)
  if (!entries.length) return '—'
  return entries.map(([cur, amount]) => `${String(cur).toUpperCase()} ${Number(amount || 0).toFixed(2)}`).join(' · ')
}

function sumMap(map) {
  return Object.values(map || {}).reduce((acc, n) => acc + (Number(n) || 0), 0)
}

function formatCurrencyMap(map) {
  const normalized = normalizeCurrencyMapInput(map)
  const entries = Object.entries(normalized).filter(([, value]) => Number(value) !== 0)
  if (!entries.length) return '—'
  return entries.map(([currency, value]) => `${String(currency).toUpperCase()} ${Number(value || 0).toFixed(2)}`).join(' · ')
}

function normalizeCurrencyMapInput(input) {
  if (!input) return {}
  if (typeof input === 'number') return { USD: Number(input) || 0 }
  if (Array.isArray(input)) {
    return input.reduce((acc, row) => {
      const cur = String(row?.currency || row?.currency_code || 'USD').toUpperCase()
      const amount = Number(row?.amount ?? row?.value ?? 0)
      acc[cur] = (Number(acc[cur]) || 0) + amount
      return acc
    }, {})
  }
  if (typeof input === 'object') return input
  return {}
}

export default function AccountsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()
  const [activeTab, setActiveTab] = useState('customers')
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [partners, setPartners] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [customerPage, setCustomerPage] = useState(1)
  const [vendorPage, setVendorPage] = useState(1)
  const pageSize = 10
  const [customerDetail, setCustomerDetail] = useState(null)
  const [partnerDetail, setPartnerDetail] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [paymentModal, setPaymentModal] = useState(null)
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

  const loadOverview = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [customersRes, partnersRes, banksRes] = await Promise.all([
        getCustomerStatements(token, {
          status: statusFilter || undefined,
        }),
        getPartnerLedgerSummary(token, {
          status: statusFilter === 'partial' ? 'partially_paid' : (statusFilter || undefined),
        }),
        listBankAccounts(token),
      ])
      setCustomers(Array.isArray(customersRes?.data) ? customersRes.data : [])
      setPartners(Array.isArray(partnersRes?.data) ? partnersRes.data : [])
      setBankAccounts(Array.isArray(banksRes?.data) ? banksRes.data : [])
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const openCustomerDetail = async (customerId) => {
    if (!token || !customerId) return
    const res = await getCustomerStatementDetail(token, customerId)
    setCustomerDetail(res?.data || null)
  }

  const openPartnerDetail = async (partnerId) => {
    if (!token || !partnerId) return
    const res = await getPartnerLedgerDetail(token, partnerId)
    setPartnerDetail(res?.data || null)
  }

  const openPayment = (ctx = {}) => {
    setPaymentModal(true)
    setPaymentProofFile(null)
    setPayment((prev) => ({
      ...prev,
      link_type: ctx.link_type || 'invoice',
      invoice_id: ctx.invoice_id ? String(ctx.invoice_id) : '',
      shipment_id: ctx.shipment_id ? String(ctx.shipment_id) : '',
      client_id: ctx.client_id ? String(ctx.client_id) : '',
      vendor_id: ctx.vendor_id ? String(ctx.vendor_id) : '',
      vendor_bill_id: ctx.vendor_bill_id ? String(ctx.vendor_bill_id) : '',
      currency_code: ctx.currency_code || prev.currency_code || 'USD',
    }))
  }

  const triggerBlobDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadInvoicePdf = async (invoiceId) => {
    if (!token || !invoiceId) return
    const { blob, filename } = await downloadInvoicePdf(token, invoiceId)
    triggerBlobDownload(blob, filename || `invoice-${invoiceId}.pdf`)
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
        mapToInline(r.total_amount),
        mapToInline(r.paid_amount),
        mapToInline(r.remaining_amount),
        r.status || '',
      ]),
    ].map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    triggerBlobDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `customer-statement-${customerName || customerId}.csv`)
  }

  const downloadVendorStatementSnapshot = async (vendorId, vendorName) => {
    if (!token || !vendorId) return
    const res = await getPartnerLedgerDetail(token, vendorId)
    const rows = Array.isArray(res?.data?.rows) ? res.data.rows : []
    const lines = [
      ['Invoice', 'Shipment', 'Total', 'Paid', 'Status'],
      ...rows.map((r) => [
        r.invoice_reference || '',
        r.shipment_reference || '',
        mapToInline(r.currency_breakdown),
        mapToInline(r.paid_amount),
        r.status || '',
      ]),
    ].map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    triggerBlobDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `vendor-statement-${vendorName || vendorId}.csv`)
  }

  const submitPayment = async () => {
    if (!token) return
    const amount = Number(payment.amount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const isPartner = payment.link_type === 'partner' || payment.link_type === 'shipment_partner'
    const payload = new FormData()
    payload.append('type', isPartner ? 'vendor_payment' : 'client_receipt')
    payload.append('amount', String(amount))
    payload.append('currency_code', String(payment.currency_code || 'USD').toUpperCase())
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
    try {
      await recordPayment(token, payload)
      setPaymentModal(null)
      await loadOverview()
      if (customerDetail?.customer_id) {
        await openCustomerDetail(customerDetail.customer_id)
      }
      if (partnerDetail?.partner_id) {
        await openPartnerDetail(partnerDetail.partner_id)
      }
    } finally {
      setPaymentBusy(false)
    }
  }

  const customerSummary = useMemo(() => {
    const totals = customers.reduce(
      (acc, row) => {
        acc.invoiceCount += Number(row.invoice_count || 0)
        acc.paidMap = mergeCurrencyMap(acc.paidMap, row.paid_amount || {})
        acc.outstandingMap = mergeCurrencyMap(acc.outstandingMap, row.remaining_balance || {})
        acc.unpaid += Number(row.invoice_status_counts?.unpaid || 0)
        return acc
      },
      { invoiceCount: 0, paidMap: {}, outstandingMap: {}, unpaid: 0 }
    )
    return totals
  }, [customers])

  const partnerSummary = useMemo(() => {
    const totals = partners.reduce(
      (acc, row) => {
        acc.invoiceCount += Number(row.total_invoices_count || 0)
        acc.paidMap = mergeCurrencyMap(acc.paidMap, row.total_paid_amount || {})
        acc.outstandingMap = mergeCurrencyMap(acc.outstandingMap, row.remaining_balance || {})
        acc.unpaid += Number(row.bill_status_counts?.unpaid || row.unpaid_bills_count || 0)
        return acc
      },
      { invoiceCount: 0, paidMap: {}, outstandingMap: {}, unpaid: 0 }
    )
    return totals
  }, [partners])

  const customerTotalPages = Math.max(1, Math.ceil(customers.length / pageSize))
  const vendorTotalPages = Math.max(1, Math.ceil(partners.length / pageSize))

  const pagedCustomers = useMemo(
    () => customers.slice((customerPage - 1) * pageSize, customerPage * pageSize),
    [customers, customerPage]
  )
  const pagedPartners = useMemo(
    () => partners.slice((vendorPage - 1) * pageSize, vendorPage * pageSize),
    [partners, vendorPage]
  )

  return (
    <Container size="xl">
      <div className="clients-page accountings-page">
        <div className="invoices-tabs-wrap mb-4">
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'customers', label: t('accountings.customerStatement', 'Customer Statement') },
              { id: 'partners', label: t('accountings.vendorStatementTab') },
            ]}
          />
        </div>

        {loading ? <LoaderDots /> : null}

        <div className="clients-filters-card mb-3">
          <div className="clients-filters__row clients-filters__row--main">
            <select
              className="clients-input min-w-[160px]"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCustomerPage(1)
                setVendorPage(1)
              }}
            >
              <option value="">{t('accountings.allStatuses')}</option>
              <option value="paid">{t('invoices.status.paid')}</option>
              <option value="partial">{t('invoices.status.partial')}</option>
              <option value="unpaid">{t('invoices.status.unpaid')}</option>
            </select>
          </div>
        </div>

        {activeTab === 'customers' && (
          <div className="accountings-table-section">
            <div className="clients-stats-grid accountings-stats-grid">
              <StatsCard title={t('accountings.totalInvoicesCount')} value={customerSummary.invoiceCount} icon={<WalletCards />} variant="blue" />
              <StatsCard title={t('accountings.unpaidInvoicesCount')} value={customerSummary.unpaid} icon={<ReceiptText />} variant="amber" />
              <StatsCard title={t('accountings.totalPaidAmount')} value={formatCurrencyMap(customerSummary.paidMap)} icon={<CircleDollarSign />} variant="green" />
              <StatsCard title={t('accountings.outstandingBalance')} value={formatCurrencyMap(customerSummary.outstandingMap)} icon={<HandCoins />} variant="red" />
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="accountings-table-section">
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.colClient', 'Customer')}</th>
                    <th>{t('accountings.totalBilledAmount')}</th>
                    <th>{t('accountings.totalPaidAmount')}</th>
                    <th>{t('accountings.remainingBalance')}</th>
                    <th>{t('accountings.unpaidInvoicesCount')}</th>
                    <th>{t('accountings.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCustomers.map((row) => (
                    <tr key={row.customer_id}>
                      <td>{row.customer_name}</td>
                      <td>{mapToInline(row.total_invoices_value)}</td>
                      <td>{mapToInline(row.paid_amount)}</td>
                      <td>{mapToInline(row.remaining_balance)}</td>
                      <td>{Number(row.invoice_status_counts?.unpaid || 0)}</td>
                      <td>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('accountings.viewStatement')}
                          aria-label={t('accountings.viewStatement')}
                          onClick={() => openCustomerDetail(row.customer_id)}
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
                      <td colSpan={6} className="accountings-empty py-8 text-center">
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
            <h2 className="mb-3 text-base font-semibold">{t('accountings.vendorStatementTitle')}</h2>
            <div className="clients-stats-grid accountings-stats-grid">
              <StatsCard title={t('accountings.totalInvoicesCount')} value={partnerSummary.invoiceCount} icon={<WalletCards />} variant="blue" />
              <StatsCard title={t('accountings.unpaidInvoicesCount')} value={partnerSummary.unpaid} icon={<ReceiptText />} variant="amber" />
              <StatsCard title={t('accountings.totalPaidAmount')} value={formatCurrencyMap(partnerSummary.paidMap)} icon={<CircleDollarSign />} variant="green" />
              <StatsCard title={t('accountings.outstandingBalance')} value={formatCurrencyMap(partnerSummary.outstandingMap)} icon={<HandCoins />} variant="red" />
            </div>
            <div className="accountings-table-wrap mt-3">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.vendorName')}</th>
                    <th>{t('accountings.vendorType')}</th>
                    <th>{t('accountings.colTotalDue')}</th>
                    <th>{t('accountings.totalPaidAmount')}</th>
                    <th>{t('accountings.remainingBalance')}</th>
                    <th>{t('accountings.linkedShipmentsCount')}</th>
                    <th>{t('accountings.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPartners.map((row) => (
                    <tr key={row.partner_id}>
                      <td>{row.partner_name}</td>
                      <td>{row.category || '—'}</td>
                      <td>{mapToInline(row.total_billed_amount)}</td>
                      <td>{mapToInline(row.total_paid_amount)}</td>
                      <td>{mapToInline(row.remaining_balance)}</td>
                      <td>{row.linked_shipments_count || 0}</td>
                      <td>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('accountings.viewStatement')}
                          aria-label={t('accountings.viewStatement')}
                          onClick={() => openPartnerDetail(row.partner_id)}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('accountings.recordPayment')}
                          aria-label={t('accountings.recordPayment')}
                          onClick={() => openPayment({ link_type: 'partner', vendor_id: row.partner_id })}
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="accountings-action-icon-btn"
                          title={t('invoices.downloadPdf', 'Download PDF')}
                          aria-label={t('invoices.downloadPdf', 'Download PDF')}
                          onClick={() => downloadVendorStatementSnapshot(row.partner_id, row.partner_name)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="clients-pagination">
              <div className="clients-pagination__left">
                <span className="clients-pagination__total">
                  {t('clients.total', 'Total')}: {partners.length}
                </span>
              </div>
              <Pagination currentPage={vendorPage} totalPages={vendorTotalPages} onPageChange={setVendorPage} />
            </div>
          </div>
        )}

        {customerDetail && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setCustomerDetail(null)} />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="flex items-start justify-between gap-3">
                <h2>{customerDetail.customer_name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="accountings-action-icon-btn"
                    title={t('invoices.downloadPdf', 'Download PDF')}
                    aria-label={t('invoices.downloadPdf', 'Download PDF')}
                    onClick={() => downloadCustomerStatementSnapshot(customerDetail.customer_id, customerDetail.customer_name)}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button type="button" className="accountings-btn accountings-btn--small p-2" onClick={() => setCustomerDetail(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="accountings-table-wrap mt-3">
                <table className="accountings-table">
                  <thead>
                    <tr>
                      <th>{t('accountings.invoiceNumber')}</th>
                      <th>{t('accountings.shipmentReference')}</th>
                      <th>{t('accountings.issueDate')}</th>
                      <th>{t('accountings.totalAmount')}</th>
                      <th>{t('accountings.paidAmount')}</th>
                      <th>{t('accountings.remainingAmount')}</th>
                      <th>{t('accountings.status')}</th>
                      <th>{t('accountings.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customerDetail.invoices || []).map((inv) => (
                      <tr key={inv.invoice_id} className="accountings-invoice-row">
                        <td>{inv.invoice_reference}</td>
                        <td>{inv.shipment_reference || '—'}</td>
                        <td>{inv.issue_date || '—'}</td>
                        <td>{mapToInline(inv.total_amount)}</td>
                        <td>{mapToInline(inv.paid_amount)}</td>
                        <td>{mapToInline(inv.remaining_amount)}</td>
                        <td>
                          <InvoiceStatusBadge status={inv.status} t={t} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="accountings-action-icon-btn"
                            title={t('accountings.viewInvoice')}
                            aria-label={t('accountings.viewInvoice')}
                            onClick={() => navigate(`/invoices?invoice_id=${inv.invoice_id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="accountings-action-icon-btn"
                            title={t('invoices.downloadPdf', 'Download PDF')}
                            aria-label={t('invoices.downloadPdf', 'Download PDF')}
                            onClick={() => handleDownloadInvoicePdf(inv.invoice_id)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="accountings-action-icon-btn"
                            title={t('accountings.recordPayment')}
                            aria-label={t('accountings.recordPayment')}
                            onClick={() => openPayment({ link_type: 'invoice', invoice_id: inv.invoice_id, shipment_id: inv.shipment_id })}
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {partnerDetail && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setPartnerDetail(null)} />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="flex items-start justify-between gap-3">
                <h2>{partnerDetail.partner_name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="accountings-action-icon-btn"
                    title={t('invoices.downloadPdf', 'Download PDF')}
                    aria-label={t('invoices.downloadPdf', 'Download PDF')}
                    onClick={() => downloadVendorStatementSnapshot(partnerDetail.partner_id, partnerDetail.partner_name)}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button type="button" className="accountings-btn accountings-btn--small p-2" onClick={() => setPartnerDetail(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="accountings-table-wrap mt-3">
                <table className="accountings-table">
                  <thead>
                    <tr>
                      <th>{t('accountings.invoiceNumber')}</th>
                      <th>{t('accountings.shipmentReference')}</th>
                      <th>{t('accountings.colTotalDue')}</th>
                      <th>{t('accountings.totalPaidAmount')}</th>
                      <th>{t('accountings.status')}</th>
                      <th>{t('accountings.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(partnerDetail.rows || []).map((row) => (
                      <tr key={row.invoice_reference}>
                        <td>{row.invoice_reference}</td>
                        <td>{row.shipment_reference || '—'}</td>
                        <td>{mapToInline(row.currency_breakdown)}</td>
                        <td>{mapToInline(row.paid_amount)}</td>
                        <td>
                          <InvoiceStatusBadge status={row.status} t={t} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="accountings-action-icon-btn"
                            title={t('accountings.recordPayment')}
                            aria-label={t('accountings.recordPayment')}
                            onClick={() => openPayment({ link_type: 'shipment_partner', shipment_id: row.shipment_id, vendor_id: partnerDetail.partner_id })}
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                {(partnerDetail.rows || []).map((row) => (
                  <details key={`prow-${row.invoice_reference}`} className="mb-2">
                    <summary className="font-semibold cursor-pointer">
                      {row.invoice_reference} - {t('accountings.details', 'Details')}
                    </summary>
                    <div className="mt-2 text-sm">
                      <div><strong>{t('accountings.sections', 'Sections / Items')}:</strong></div>
                      <ul>
                        {(row.line_items || []).map((it) => (
                          <li key={it.id}>{it.section_key || 'other'} - {it.description} ({it.currency_code} {Number(it.line_total || 0).toFixed(2)})</li>
                        ))}
                      </ul>
                      <div><strong>{t('accountings.attachments', 'Attachments')}:</strong> {(row.attachments || []).map((a) => a.name).join(', ') || '—'}</div>
                      <div><strong>{t('accountings.paymentHistory', 'Payment history')}:</strong></div>
                      <ul>
                        {(row.payment_history || []).map((p) => (
                          <li key={p.id}>{p.paid_at || '—'} - {p.method || '—'} - {p.currency_code} {Number(p.amount || 0).toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        )}

        {paymentModal && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setPaymentModal(null)} />
            <div className="accountings-modal-content">
              <h3>{t('accountings.recordPayment', 'Record Payment')}</h3>
              <div className="grid gap-2 mt-2">
                <input className="clients-input" placeholder={t('payments.amount', 'Amount')} value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
                <input className="clients-input" placeholder={t('payments.currency', 'Currency')} value={payment.currency_code} onChange={(e) => setPayment((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))} />
                <select className="clients-input" value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}>
                  <option value="bank_transfer">{t('payments.bankTransfer', 'Bank transfer')}</option>
                  <option value="cash">{t('payments.cash', 'Cash')}</option>
                  <option value="cheque">{t('payments.cheque', 'Cheque')}</option>
                </select>
                <select className="clients-input" value={payment.source_account_id} onChange={(e) => setPayment((p) => ({ ...p, source_account_id: e.target.value }))}>
                  <option value="">{t('payments.bankAccountOptional', 'Bank account (optional)')}</option>
                  {bankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bank_name} - {Array.isArray(bank.supported_currencies) ? bank.supported_currencies.join('/') : '—'}
                    </option>
                  ))}
                </select>
                <input type="date" className="clients-input" value={payment.paid_at} onChange={(e) => setPayment((p) => ({ ...p, paid_at: e.target.value }))} />
                <input
                  className="clients-input"
                  placeholder={t('accountings.shipmentIdOptional', 'Shipment ID (optional)')}
                  value={payment.shipment_id}
                  onChange={(e) => setPayment((p) => ({ ...p, shipment_id: e.target.value }))}
                />
                <input
                  className="clients-input"
                  placeholder={t('accountings.invoiceIdOptional', 'Invoice ID (optional)')}
                  value={payment.invoice_id}
                  onChange={(e) => setPayment((p) => ({ ...p, invoice_id: e.target.value }))}
                />
                <input
                  type="file"
                  className="clients-input"
                  onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="accountings-modal-actions">
                <button type="button" className="accountings-btn" onClick={() => setPaymentModal(null)}>{t('common.cancel', 'Cancel')}</button>
                <button type="button" className="accountings-btn accountings-btn--primary" onClick={submitPayment} disabled={paymentBusy}>
                  {paymentBusy ? t('common.loading', 'Loading...') : t('accountings.recordPayment', 'Record Payment')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

function mergeCurrencyMap(target, source) {
  const out = { ...(target || {}) }
  for (const [currency, amount] of Object.entries(source || {})) {
    out[currency] = (Number(out[currency]) || 0) + (Number(amount) || 0)
  }
  return out
}
