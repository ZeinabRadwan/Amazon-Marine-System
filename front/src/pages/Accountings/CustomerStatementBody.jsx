import { useMemo } from 'react'
import {
  DollarSign,
  Eye,
  Download,
  Wallet,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileDown,
} from 'lucide-react'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'
import { CurrencyMapBadges } from './CurrencyMapBadges'
import {
  customerPaymentExchangeRateLine,
  formatStatementDetailDate,
  paymentMethodLabel,
} from './accountingsStatementShared'
import {
  computeCustomerStatementDetailTotals,
  flattenCustomerStatementPayments,
} from './customerStatementModel'

/**
 * Shared customer statement UI: summary cards, invoice table, payment ledger.
 * Used by full-page statement route and Client Detail “financial statement” tab.
 */
export default function CustomerStatementBody({
  customerDetail,
  variant = 'page',
  t,
  i18n,
  navigate,
  customerPaymentExpanded,
  toggleCustomerPaymentRow,
  handleDownloadInvoicePdf,
  openPayment,
  openAdvancePayment,
  downloadCustomerStatementSnapshot,
}) {
  const customerStatementDetailTotals = useMemo(
    () => computeCustomerStatementDetailTotals(customerDetail),
    [customerDetail],
  )

  const customerStatementPaymentsFlat = useMemo(
    () => flattenCustomerStatementPayments(customerDetail),
    [customerDetail],
  )

  const TitleTag = variant === 'embedded' ? 'h3' : 'h1'
  const titleClass =
    variant === 'embedded'
      ? 'accountings-statement-detail-title accountings-statement-embedded__title'
      : 'accountings-statement-detail-title'

  return (
    <div className={`accountings-statement-page ${variant === 'embedded' ? 'accountings-statement-embedded' : ''}`}>
      <header className="accountings-statement-detail-header accountings-statement-page__header">
        <div className="accountings-statement-detail-header__main">
          <p className="accountings-statement-detail-eyebrow">
            {t('accountings.statementDetailCustomerTitle', 'Customer Statement Details')}
          </p>
          <TitleTag className={titleClass}>{customerDetail.customer_name}</TitleTag>
          <dl className="accountings-statement-detail-meta">
            <div className="accountings-statement-detail-meta__row">
              <dt>{t('clients.fields.phone', 'Phone')}</dt>
              <dd dir="ltr">
                {customerDetail.phone && String(customerDetail.phone).trim()
                  ? String(customerDetail.phone).trim()
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
        <div className="accountings-statement-detail-header__actions">
          {typeof openAdvancePayment === 'function' ? (
            <button
              type="button"
              className="accountings-statement-detail-header__icon-btn accountings-action-icon-btn--advance"
              title={t('accountings.recordAdvancePayment', 'Record advance payment')}
              aria-label={t('accountings.recordAdvancePayment', 'Record advance payment')}
              onClick={() => openAdvancePayment()}
            >
              <Wallet className="accountings-statement-detail-header__icon" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="accountings-statement-detail-header__icon-btn"
            title={t('accountings.recordPayment')}
            aria-label={t('accountings.recordPayment')}
            onClick={() =>
              openPayment({
                link_type: 'customer',
                client_id: customerDetail.customer_id,
              })
            }
          >
            <DollarSign className="accountings-statement-detail-header__icon" aria-hidden />
          </button>
          <button
            type="button"
            className="accountings-statement-detail-header__icon-btn"
            title={t('accountings.exportCsv', 'Download CSV')}
            aria-label={t('accountings.exportCsv', 'Download CSV')}
            onClick={() => downloadCustomerStatementSnapshot()}
          >
            <FileDown className="accountings-statement-detail-header__icon" aria-hidden />
          </button>
        </div>
      </header>

      <div className="accountings-statement-detail-body accountings-statement-page__body">
        <div
          className="accountings-statement-detail-summary-grid"
          aria-label={t('accountings.statementSummaryRegion', 'Statement summary')}
        >
          <div className="shipment-fin-summary-card rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50/80 dark:bg-slate-900/25 p-4 shadow-sm">
            <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('accountings.summaryCardTotalInvoices', 'Total invoices')}
            </div>
            <div className="shipment-fin-summary-card__value font-bold text-2xl text-gray-900 dark:text-gray-100">
              {customerStatementDetailTotals.invoiceCount}
            </div>
          </div>
          <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/40">
            <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-blue-100/90">
              {t('accountings.totalAmount', 'Total amount')}
            </div>
            <div className="shipment-fin-summary-card__value font-bold text-xl text-blue-700 dark:text-blue-300">
              <CurrencyMapBadges value={customerStatementDetailTotals.totalMap} size="sm" amountFirst />
            </div>
          </div>
          <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/40">
            <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-emerald-900/80">
              {t('accountings.paidAmount', 'Paid amount')}
            </div>
            <div className="shipment-fin-summary-card__value font-bold text-xl text-emerald-700 dark:text-emerald-300">
              <CurrencyMapBadges value={customerStatementDetailTotals.paidMap} size="sm" amountFirst />
            </div>
          </div>
          <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-amber-50/60 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/35">
            <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-amber-900/80">
              {t('accountings.remainingBalance', 'Remaining balance')}
            </div>
            <div className="shipment-fin-summary-card__value font-bold text-xl text-amber-800 dark:text-amber-200">
              <CurrencyMapBadges value={customerStatementDetailTotals.remainingMap} size="sm" amountFirst />
            </div>
          </div>
          {Object.keys(customerStatementDetailTotals.prepaidMap || {}).length > 0 ? (
            <div className="shipment-fin-summary-card rounded-xl border p-4 shadow-sm bg-violet-50/50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/40">
              <div className="shipment-fin-summary-card__label text-sm font-medium text-gray-600 dark:text-violet-100/90">
                {t('accountings.prepaidBalance', 'Prepaid balance (credit)')}
              </div>
              <div className="shipment-fin-summary-card__value font-bold text-xl text-violet-700 dark:text-violet-300">
                <CurrencyMapBadges value={customerStatementDetailTotals.prepaidMap} size="sm" amountFirst />
              </div>
            </div>
          ) : null}
        </div>

        <section className="accountings-wire-section" aria-labelledby="cust-statement-invoices-heading">
          <div className="accountings-wire-section-head">
            <h2 id="cust-statement-invoices-heading" className="accountings-wire-section-title">
              {t('accountings.sectionCustomerInvoices', 'Customer invoices')}
            </h2>
            <span className="accountings-wire-section-hint">
              {t('accountings.sectionCustomerInvoicesHint', 'Invoices issued to this customer')}
            </span>
          </div>
          <div className="accountings-wire-card-table accountings-table-wrap accountings-statement-page__table-wrap mt-1">
            <table className="accountings-table accountings-wire-table">
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
                    <td className="accountings-wire-mono font-semibold text-blue-700 dark:text-blue-300">
                      {inv.invoice_reference}
                    </td>
                    <td className="accountings-wire-mono text-sm">{inv.shipment_reference || '—'}</td>
                    <td>{formatStatementDetailDate(inv.issue_date, i18n.language)}</td>
                    <td>
                      <CurrencyMapBadges value={inv.total_amount} size="sm" amountFirst />
                    </td>
                    <td>
                      <CurrencyMapBadges value={inv.paid_amount} size="sm" amountFirst />
                    </td>
                    <td>
                      <CurrencyMapBadges value={inv.remaining_amount} size="sm" amountFirst />
                    </td>
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
                        onClick={() =>
                          openPayment({
                            link_type: 'invoice',
                            invoice_id: inv.invoice_id,
                            shipment_id: inv.shipment_id,
                            client_id: customerDetail.customer_id,
                          })
                        }
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="accountings-wire-section accountings-wire-section--payments"
          aria-labelledby="cust-statement-payments-heading"
        >
          <div className="accountings-wire-section-head">
            <h2 id="cust-statement-payments-heading" className="accountings-wire-section-title">
              {t('accountings.sectionPaymentHistory', 'Payment history')}
            </h2>
            <span className="accountings-wire-section-hint">
              {t('accountings.sectionPaymentHistoryHint', 'All payments with full details')}
            </span>
          </div>
          {customerStatementPaymentsFlat.length === 0 ? (
            <p className="accountings-wire-empty">{t('invoices.noPayments', 'No payments yet')}</p>
          ) : (
            <div className="accountings-pay-ledger">
              {customerStatementPaymentsFlat.map((p) => {
                const pid = Number(p.id)
                const open = !!customerPaymentExpanded[pid]
                const methodClsRaw = String(p.method || 'other')
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                const methodCls = /^[a-z0-9_]+$/.test(methodClsRaw) ? methodClsRaw : 'other'
                const payShipId = p.shipment_id ?? p._invoice_shipment_id
                const payBl = p.shipment_reference || p._fallback_shipment_reference
                const shipRefLine =
                  [payShipId ? `#${payShipId}` : null, payBl || null].filter(Boolean).join(' · ') || '—'
                const headline =
                  p.reference?.trim() ||
                  (p.notes && String(p.notes).trim().slice(0, 80)) ||
                  t('accountings.paymentReceiptDefault', 'Customer payment')
                const invId = Number(p.invoice_id)
                const payAmtMap = { [String(p.currency_code || 'USD').toUpperCase()]: Number(p.amount) || 0 }
                return (
                  <div key={p.id} className="accountings-pay-row-wrap">
                    <div
                      role="button"
                      tabIndex={0}
                      className="accountings-pay-row-header"
                      onClick={() => toggleCustomerPaymentRow(pid)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleCustomerPaymentRow(pid)
                        }
                      }}
                      aria-expanded={open}
                    >
                      <div className="accountings-pay-row-header__left">
                        <span
                          className={`accountings-wire-badge accountings-wire-badge--method accountings-wire-badge--${methodCls}`}
                        >
                          {paymentMethodLabel(p.method, t)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="accountings-pay-row-title">{headline}</div>
                          <div className="accountings-pay-row-sub">
                            {formatStatementDetailDate(p.paid_at, i18n.language)}
                            {' · '}
                            {Number.isFinite(invId) && invId > 0 ? (
                              <button
                                type="button"
                                className="accountings-pay-inline-link"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/invoices?invoice_id=${invId}`)
                                }}
                              >
                                {p.invoice_reference || p._invoice_reference || '—'}
                              </button>
                            ) : (
                              <span>{p.invoice_reference || p._invoice_reference || '—'}</span>
                            )}
                            {p.invoice_payment_count > 1 && p.payment_sequence != null && (
                              <span className="accountings-pay-row-seq">
                                {' · '}
                                {t('accountings.paymentSequence', {
                                  n: p.payment_sequence,
                                  total: p.invoice_payment_count,
                                  defaultValue: 'Payment {{n}} of {{total}}',
                                })}
                              </span>
                            )}
                          </div>
                          {shipRefLine !== '—' && (
                            <div className="accountings-pay-row-ship-ref text-xs mt-1 accountings-wire-mono">
                              {payShipId && Number(payShipId) > 0 ? (
                                <button
                                  type="button"
                                  className="accountings-pay-inline-link accountings-pay-inline-link--muted"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/shipments?shipment_id=${Number(payShipId)}`)
                                  }}
                                >
                                  {shipRefLine}
                                </button>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">{shipRefLine}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {p.is_final_settling_payment && (
                          <span className="accountings-wire-badge accountings-wire-badge--closing">
                            {t('accountings.paymentClosingSettlement', 'Completing settlement')}
                          </span>
                        )}
                      </div>
                      <div className="accountings-pay-row-header__right">
                        <div className="accountings-pay-row-amounts">
                          <div className="accountings-pay-row-primary-amt accountings-pay-row-primary-amt--badges inline-flex items-center gap-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+</span>
                            <CurrencyMapBadges value={payAmtMap} size="sm" amountFirst />
                          </div>
                        </div>
                        {open ? (
                          <ChevronUp className="accountings-pay-row-chevron h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                          <ChevronDown className="accountings-pay-row-chevron h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </div>
                    </div>
                    {open && (
                      <div className="accountings-pay-row-detail">
                        <div className="accountings-pay-detail-grid">
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('invoices.payment.method', 'Payment method')}</div>
                            <div className="accountings-pay-detail-val">{paymentMethodLabel(p.method, t)}</div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('accountings.targetAccount', 'Receiving account')}</div>
                            <div className="accountings-pay-detail-val">{p.target_account_label || '—'}</div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('payments.amount', 'Amount')}</div>
                            <div className="accountings-pay-detail-val">
                              <CurrencyMapBadges value={payAmtMap} size="sm" amountFirst />
                            </div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('accountings.colExchangeRate', 'Exchange rate')}</div>
                            <div className="accountings-pay-detail-val accountings-wire-mono text-sm">
                              {customerPaymentExchangeRateLine(p, t)}
                            </div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('accountings.invoiceNumber')}</div>
                            <div className="accountings-pay-detail-val">
                              {Number.isFinite(invId) && invId > 0 ? (
                                <button
                                  type="button"
                                  className="accountings-pay-inline-link font-semibold"
                                  onClick={() => navigate(`/invoices?invoice_id=${invId}`)}
                                >
                                  {p.invoice_reference || p._invoice_reference || '—'}
                                </button>
                              ) : (
                                <span className="font-medium text-blue-700 dark:text-blue-300">
                                  {p.invoice_reference || p._invoice_reference || '—'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('accountings.shipmentReference')}</div>
                            <div className="accountings-pay-detail-val accountings-wire-mono">
                              {payShipId && Number(payShipId) > 0 ? (
                                <button
                                  type="button"
                                  className="accountings-pay-inline-link"
                                  onClick={() => navigate(`/shipments?shipment_id=${Number(payShipId)}`)}
                                >
                                  {shipRefLine}
                                </button>
                              ) : (
                                shipRefLine
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('invoices.payment.date', 'Payment date')}</div>
                            <div className="accountings-pay-detail-val">
                              {formatStatementDetailDate(p.paid_at, i18n.language)}
                            </div>
                          </div>
                          <div>
                            <div className="accountings-pay-detail-lbl">{t('accountings.status')}</div>
                            <div className="accountings-pay-detail-val">
                              <InvoiceStatusBadge status={p._invoice_status || 'unpaid'} t={t} />
                            </div>
                          </div>
                        </div>
                        {p.reference?.trim() && (
                          <div className="accountings-pay-notes">
                            <div className="accountings-pay-detail-lbl">{t('invoices.payment.reference', 'Reference')}</div>
                            <div className="accountings-wire-mono">{p.reference.trim()}</div>
                          </div>
                        )}
                        {p.notes?.trim() && (
                          <div className="accountings-pay-notes">
                            <div className="accountings-pay-detail-lbl">{t('common.notes')}</div>
                            <div>{p.notes.trim()}</div>
                          </div>
                        )}
                        <div className="accountings-pay-attach-row">
                          {p.proof_url ? (
                            <a
                              href={p.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="accountings-pay-doc-link"
                            >
                              <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
                              <span>{p.proof_filename || t('accountings.receiptAttachment', 'Receipt / proof')}</span>
                              <span className="accountings-wire-badge accountings-wire-badge--attached">
                                {t('accountings.attachmentUploaded', 'Attached')}
                              </span>
                            </a>
                          ) : (
                            <span className="accountings-pay-no-attach">{t('accountings.noAttachment', 'No attachment')}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
