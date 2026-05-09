import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import { downloadInvoicePdf } from '../../api/invoices'
import { getStoredToken } from '../Login'
import { getCustomerStatementDetail, listBankAccounts, recordPayment } from '../../api/accountings'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import '../Shipments/Shipments.css'
import './Accountings.css'
import { currencyMapToExportPlain } from './CurrencyMapBadges'
import AccountingsPaymentModal from './AccountingsPaymentModal'
import CustomerStatementBody from './CustomerStatementBody'
import { normalizeAccountingsPaymentCurrency } from './accountingsStatementShared'

/**
 * Shared customer statement: data loading, payment modal, and statement UI.
 * @param {string|number} customerId — client / accounting customer id (filtered server-side)
 * @param {'page'|'embedded'} variant — full route vs Client Detail tab
 */
export default function CustomerStatementInteractive({ customerId, variant = 'page' }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [customerDetail, setCustomerDetail] = useState(null)

  const [customerPaymentExpanded, setCustomerPaymentExpanded] = useState({})
  const [bankAccounts, setBankAccounts] = useState([])
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

  const reloadDetail = useCallback(async () => {
    if (!token || customerId == null || customerId === '') return
    const res = await getCustomerStatementDetail(token, String(customerId))
    setCustomerDetail(res?.data || null)
  }, [token, customerId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token || customerId == null || customerId === '') {
        setLoading(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        const [detailRes, banksRes] = await Promise.all([
          getCustomerStatementDetail(token, String(customerId)),
          listBankAccounts(token),
        ])
        if (!cancelled) {
          setCustomerDetail(detailRes?.data || null)
          setBankAccounts(Array.isArray(banksRes?.data) ? banksRes.data : [])
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, customerId])

  useEffect(() => {
    setCustomerPaymentExpanded({})
  }, [customerDetail?.customer_id])

  const toggleCustomerPaymentRow = useCallback((paymentId) => {
    const id = Number(paymentId)
    if (!Number.isFinite(id)) return
    setCustomerPaymentExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

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

  const downloadCustomerStatementSnapshot = async () => {
    if (!token || customerId == null || !customerDetail) return
    const rows = Array.isArray(customerDetail.invoices) ? customerDetail.invoices : []
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
    triggerBlobDownload(
      new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
      `customer-statement-${customerDetail.customer_name || customerId}.csv`,
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
    const payload = new FormData()
    payload.append('type', isPartner ? 'vendor_payment' : 'client_receipt')
    payload.append('amount', String(amount))
    payload.append('currency_code', normalizeAccountingsPaymentCurrency(payment.currency_code))
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
      await reloadDetail()
    } catch (e) {
      setPaymentSubmitError(e?.message || String(e))
    } finally {
      setPaymentBusy(false)
    }
  }

  if (!token) {
    return null
  }

  const backLink =
    variant === 'page' ? (
      <div className="accountings-statement-page__toolbar">
        <Link to="/accountings" className="accountings-statement-page__back">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t('accountings.backToStatements', 'Back to statements')}
        </Link>
      </div>
    ) : null

  const paymentModalEl = (
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
  )

  if (loading && !customerDetail) {
    if (variant === 'embedded') {
      return (
        <>
          <div className="accountings-statement-page-loading py-10 flex justify-center">
            <LoaderDots label={t('common.loading', 'Loading...')} />
          </div>
          {paymentModalEl}
        </>
      )
    }
    return (
      <Container size="xl" className="accountings-statement-page-container">
        <div className="accountings-statement-page-loading">
          <LoaderDots label={t('common.loading', 'Loading...')} />
        </div>
      </Container>
    )
  }

  if (loadError) {
    const err = (
      <>
        {backLink}
        <p className="accountings-statement-page-error">{loadError}</p>
      </>
    )
    if (variant === 'embedded') {
      return (
        <>
          <div className="min-w-0">{err}</div>
          {paymentModalEl}
        </>
      )
    }
    return (
      <Container size="xl" className="accountings-statement-page-container">
        {err}
      </Container>
    )
  }

  if (!customerDetail) {
    const empty = (
      <>
        {backLink}
        <p className="accountings-statement-page-empty">{t('accountings.clientNotFound', 'Customer not found.')}</p>
      </>
    )
    if (variant === 'embedded') {
      return (
        <>
          <div className="min-w-0">{empty}</div>
          {paymentModalEl}
        </>
      )
    }
    return (
      <Container size="xl" className="accountings-statement-page-container">
        {empty}
      </Container>
    )
  }

  const bodyVariant = variant === 'embedded' ? 'embedded' : 'page'

  const statementEl = (
    <CustomerStatementBody
      customerDetail={customerDetail}
      variant={bodyVariant}
      t={t}
      i18n={i18n}
      navigate={navigate}
      customerPaymentExpanded={customerPaymentExpanded}
      toggleCustomerPaymentRow={toggleCustomerPaymentRow}
      handleDownloadInvoicePdf={handleDownloadInvoicePdf}
      openPayment={openPayment}
      downloadCustomerStatementSnapshot={downloadCustomerStatementSnapshot}
    />
  )

  if (variant === 'embedded') {
    return (
      <>
        <div className="clients-page accountings-page w-full min-w-0">{statementEl}</div>
        {paymentModalEl}
      </>
    )
  }

  return (
    <Container size="xl" className="accountings-statement-page-container">
      <div className="clients-page accountings-page">
        {backLink}
        {statementEl}
      </div>
      {paymentModalEl}
    </Container>
  )
}
