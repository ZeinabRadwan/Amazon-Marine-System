import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Info, Search, X } from 'lucide-react'
import LoaderDots from '../../components/LoaderDots'
import { CurrencyMapBadges } from './CurrencyMapBadges'
import { formatStatementDetailDate } from './accountingsStatementShared'
import {
  createCashReceipt,
  getEligibleCashReceiptCustomers,
  getReceiptablePayments,
  openCashReceiptPdf,
  previewCashReceipt,
} from '../../api/cashReceipts'
import './CashReceiptIssuanceModal.css'

const FLOW_STEPS = [
  { id: 'customer', labelKey: 'accountings.cashReceipt.stepCustomer' },
  { id: 'payments', labelKey: 'accountings.cashReceipt.stepPayments' },
  { id: 'preview', labelKey: 'accountings.cashReceipt.stepPreviewExport' },
]

function customerSearchLabel(c) {
  const name = String(c?.client_name || '').trim()
  const company = String(c?.company_name || '').trim()
  if (name && company && name !== company) return `${name} — ${company}`
  return company || name || String(c?.customer_name || '').trim()
}

const PAYMENT_METHOD_I18N = {
  bank_transfer: 'shipments.fin.paymentMethodBank',
  cash: 'shipments.fin.paymentMethodCash',
  cheque: 'shipments.fin.paymentMethodCheque',
  check: 'shipments.fin.paymentMethodCheque',
  internal: 'shipments.fin.paymentMethodInternal',
}

function formatPaymentMethods(methods, t, locale) {
  const list = Array.isArray(methods) ? methods.filter(Boolean) : []
  if (!list.length) return '—'
  const sep = locale?.startsWith('ar') ? '، ' : ', '
  return list
    .map((m) => {
      const key = PAYMENT_METHOD_I18N[String(m).toLowerCase()]
      return key ? t(key) : String(m)
    })
    .join(sep)
}

function formatPreviewAmount(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CashReceiptSummaryPreview({ preview, selectedClient, t, i18n }) {
  const company = preview?.company || {}
  const totals = preview?.totals_by_currency && typeof preview.totals_by_currency === 'object' ? preview.totals_by_currency : {}
  const currencies = Object.keys(totals)
  const receivedFrom =
    (selectedClient ? customerSearchLabel(selectedClient) : '') ||
    preview?.received_from ||
    preview?.company_name ||
    preview?.client_name ||
    '—'

  return (
    <div className="cash-receipt-summary-preview" dir={i18n.dir()}>
      <div className="cash-receipt-summary-preview__hd">
        <div>
          <div className="cash-receipt-summary-preview__brand">
            {(company.name || 'Amazon Marine').toUpperCase()}
          </div>
          <div className="cash-receipt-summary-preview__sub">{company.tagline || ''}</div>
        </div>
        <div className="cash-receipt-summary-preview__hd-right">
          <div className="cash-receipt-summary-preview__type">
            {preview?.doc_title || t('accountings.cashReceipt.title', 'Cash receipt')}
          </div>
          <div className="cash-receipt-summary-preview__ref">{preview?.receipt_number_preview || '—'}</div>
        </div>
      </div>
      <div className="cash-receipt-summary-preview__band">
        <div className="cash-receipt-summary-preview__band-text">{preview?.receipt_kind_label || '—'}</div>
        <div className="cash-receipt-summary-preview__band-badge">{preview?.receipt_kind_badge || '—'}</div>
      </div>
      <div className="cash-receipt-summary-preview__rows">
        <div className="cash-receipt-summary-preview__row">
          <span className="cash-receipt-summary-preview__key">{t('accountings.cashReceipt.summaryReceivedBy', 'Received by')}</span>
          <span className="cash-receipt-summary-preview__val">{company.name || 'Amazon Marine'}</span>
        </div>
        <div className="cash-receipt-summary-preview__row">
          <span className="cash-receipt-summary-preview__key">{t('accountings.cashReceipt.summaryReceivedFrom', 'Received from')}</span>
          <span className="cash-receipt-summary-preview__val">{receivedFrom}</span>
        </div>
        {currencies.map((cur) => (
          <div key={cur} className="cash-receipt-summary-preview__row">
            <span className="cash-receipt-summary-preview__key">
              {t('accountings.cashReceipt.summaryAmount', { currency: cur, defaultValue: 'Amount ({{currency}})' })}
            </span>
            <span className="cash-receipt-summary-preview__val cash-receipt-summary-preview__val--amount">
              {formatPreviewAmount(totals[cur])} {cur}
            </span>
          </div>
        ))}
        <div className="cash-receipt-summary-preview__row">
          <span className="cash-receipt-summary-preview__key">{t('accountings.cashReceipt.summaryPaymentMethod', 'Payment method')}</span>
          <span className="cash-receipt-summary-preview__val">
            {formatPaymentMethods(preview?.payment_methods, t, i18n.language)}
          </span>
        </div>
        <div className="cash-receipt-summary-preview__row">
          <span className="cash-receipt-summary-preview__key">{t('accountings.cashReceipt.summaryReceiptNo', 'Receipt no.')}</span>
          <span className="cash-receipt-summary-preview__val cash-receipt-summary-preview__val--mono">
            {preview?.receipt_number_preview || '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function mergeTotals(payments, selectedIds) {
  const map = {}
  for (const p of payments) {
    if (!selectedIds.has(Number(p.id))) continue
    const cur = String(p.currency_code || 'USD').toUpperCase()
    map[cur] = (map[cur] || 0) + (Number(p.amount) || 0)
  }
  return map
}

function StepIndicator({ activeStep, t }) {
  const activeIdx = FLOW_STEPS.findIndex((s) => s.id === activeStep)

  return (
    <nav className="cash-receipt-stepper" aria-label={t('accountings.cashReceipt.stepperLabel', 'Progress')}>
      {FLOW_STEPS.map((s, idx) => {
        const done = activeIdx > idx
        const active = s.id === activeStep
        const isLast = idx === FLOW_STEPS.length - 1
        return (
          <div
            key={s.id}
            className={`cash-receipt-stepper__item${done ? ' cash-receipt-stepper__item--done' : ''}${active ? ' cash-receipt-stepper__item--active' : ''}`}
          >
            <div className="cash-receipt-stepper__node">
              <span className="cash-receipt-stepper__number">{done ? <Check className="h-3.5 w-3.5" /> : idx + 1}</span>
              <span className="cash-receipt-stepper__title">{t(s.labelKey)}</span>
            </div>
            {!isLast ? <span className={`cash-receipt-stepper__line${done ? ' cash-receipt-stepper__line--done' : ''}`} aria-hidden /> : null}
          </div>
        )
      })}
    </nav>
  )
}

export default function CashReceiptIssuanceModal({ open, onClose, token, onCreated }) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const [step, setStep] = useState('customer')
  const [customerSearch, setCustomerSearch] = useState('')
  const [eligibleCustomers, setEligibleCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [payments, setPayments] = useState([])
  const [selectedPaymentIds, setSelectedPaymentIds] = useState(() => new Set())
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [createdReceipt, setCreatedReceipt] = useState(null)
  const searchDebounceRef = useRef(null)
  const comboboxRef = useRef(null)

  const reset = useCallback(() => {
    setStep('customer')
    setCustomerSearch('')
    setEligibleCustomers([])
    setDropdownOpen(false)
    setSelectedClient(null)
    setPayments([])
    setSelectedPaymentIds(new Set())
    setPreview(null)
    setError(null)
    setCreatedReceipt(null)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const loadEligibleCustomers = useCallback(
    async (q) => {
      if (!token) return
      setLoadingCustomers(true)
      try {
        const res = await getEligibleCashReceiptCustomers(token, q)
        setEligibleCustomers(Array.isArray(res?.data) ? res.data : [])
      } catch {
        setEligibleCustomers([])
      } finally {
        setLoadingCustomers(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!open || step !== 'customer') return undefined
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      loadEligibleCustomers(customerSearch)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [open, step, customerSearch, loadEligibleCustomers])

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const totalsMap = useMemo(
    () => mergeTotals(payments, selectedPaymentIds),
    [payments, selectedPaymentIds],
  )

  const loadPayments = async (client) => {
    if (!token || !client?.client_id) return
    setLoadingPayments(true)
    setError(null)
    try {
      const res = await getReceiptablePayments(token, client.client_id)
      setPayments(Array.isArray(res?.data) ? res.data : [])
      setSelectedPaymentIds(new Set())
    } catch (e) {
      setPayments([])
      setError(e?.message || String(e))
    } finally {
      setLoadingPayments(false)
    }
  }

  const pickCustomer = (client) => {
    setSelectedClient(client)
    setCustomerSearch(customerSearchLabel(client))
    setDropdownOpen(false)
    setStep('payments')
    loadPayments(client)
  }

  const togglePayment = (id) => {
    setSelectedPaymentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPayments = () => {
    if (selectedPaymentIds.size === payments.length) {
      setSelectedPaymentIds(new Set())
    } else {
      setSelectedPaymentIds(new Set(payments.map((p) => Number(p.id))))
    }
  }

  const goPreview = async () => {
    if (!token || !selectedClient?.client_id || selectedPaymentIds.size === 0) return
    setPreviewLoading(true)
    setError(null)
    try {
      const data = await previewCashReceipt(token, {
        client_id: Number(selectedClient.client_id),
        payment_ids: [...selectedPaymentIds],
        locale: i18n.language?.startsWith('ar') ? 'ar' : 'en',
      })
      setPreview(data)
      setStep('preview')
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setPreviewLoading(false)
    }
  }

  const confirmAndGenerate = async () => {
    if (!token || !selectedClient?.client_id) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await createCashReceipt(token, {
        client_id: Number(selectedClient.client_id),
        payment_ids: [...selectedPaymentIds],
        locale: i18n.language?.startsWith('ar') ? 'ar' : 'en',
      })
      setCreatedReceipt(data)
      setStep('done')
      onCreated?.(data)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const showStepper = step !== 'done'
  const allPaymentsSelected = payments.length > 0 && selectedPaymentIds.size === payments.length
  const somePaymentsSelected = selectedPaymentIds.size > 0 && !allPaymentsSelected

  return (
    <div className="cash-receipt-modal-backdrop" role="presentation" onClick={() => !submitting && onClose()}>
      <div
        className="cash-receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-receipt-modal-title"
        dir={i18n.dir()}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cash-receipt-modal__head">
          <div className="cash-receipt-modal__head-icon" aria-hidden>
            <FileText />
          </div>
          <div>
            <h2 id="cash-receipt-modal-title">{t('accountings.cashReceipt.title', 'Cash receipt')}</h2>
            <p>{t('accountings.cashReceipt.subtitle', 'Generate a PDF receipt for customer payments')}</p>
          </div>
          <button type="button" className="cash-receipt-modal__close" onClick={onClose} disabled={submitting} aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </header>

        {showStepper ? <StepIndicator activeStep={step} t={t} /> : null}

        {error ? (
          <p className="cash-receipt-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        <div
          className={`cash-receipt-modal__body${step === 'customer' ? ' cash-receipt-modal__body--customer' : ''}${step === 'preview' ? ' cash-receipt-modal__body--preview' : ''}${step === 'done' ? ' cash-receipt-modal__body--centered' : ''}`}
        >
          {step === 'customer' ? (
            <div className="cash-receipt-step-customer">
              <div className="cash-receipt-info-alert" role="status">
                <Info className="cash-receipt-info-alert__icon" aria-hidden />
                <p className="cash-receipt-info-alert__text">
                  {t('accountings.cashReceipt.customerSearchHintBefore', 'Search for a customer — ')}
                  <strong>{t('accountings.cashReceipt.customerSearchHintBold', 'unreceipted payments only')}</strong>
                </p>
              </div>
              <div className="cash-receipt-combobox" ref={comboboxRef}>
                <div
                  className="cash-receipt-combobox__control clients-filters__search-wrap"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <Search className="clients-filters__search-icon" aria-hidden />
                  <input
                    type="search"
                    className="clients-input clients-filters__search"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setDropdownOpen(true)
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder={t('accountings.cashReceipt.searchCustomer', 'Search customer…')}
                    aria-label={t('accountings.cashReceipt.searchCustomer', 'Search customer')}
                    aria-expanded={dropdownOpen}
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    className="cash-receipt-combobox__toggle"
                    onClick={() => setDropdownOpen((v) => !v)}
                    aria-label={t('accountings.cashReceipt.openCustomerList', 'Show customers')}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform${dropdownOpen ? ' rotate-180' : ''}`} />
                  </button>
                </div>
                {dropdownOpen ? (
                  <ul className="cash-receipt-combobox__list" role="listbox">
                    {loadingCustomers ? (
                      <li className="cash-receipt-combobox__empty">
                        <LoaderDots label={t('common.loading')} />
                      </li>
                    ) : eligibleCustomers.length === 0 ? (
                      <li className="cash-receipt-combobox__empty">
                        {t('accountings.cashReceipt.noEligibleCustomers', 'No customers with available payments')}
                      </li>
                    ) : (
                      eligibleCustomers.map((c) => {
                        const clientName = String(c.client_name || '').trim()
                        const companyName = String(c.company_name || '').trim()
                        const showBothNames = clientName && companyName && clientName !== companyName
                        return (
                          <li key={c.client_id} role="option">
                            <button type="button" className="cash-receipt-combobox__option" onClick={() => pickCustomer(c)}>
                              <div className="cash-receipt-combobox__option-main">
                                {showBothNames ? (
                                  <div className="cash-receipt-combobox__names-inline">
                                    <span className="cash-receipt-combobox__option-name">{clientName}</span>
                                    <span className="cash-receipt-combobox__names-sep" aria-hidden>
                                      ·
                                    </span>
                                    <span className="cash-receipt-combobox__option-company">{companyName}</span>
                                  </div>
                                ) : (
                                  <span className="cash-receipt-combobox__option-name cash-receipt-combobox__option-name--solo">
                                    {companyName || clientName || c.customer_name}
                                  </span>
                                )}
                              </div>
                              <div className="cash-receipt-combobox__option-badges">
                                <span className="cash-receipt-combobox__badge cash-receipt-combobox__badge--available">
                                  {t('accountings.cashReceipt.availablePaymentsBadge', {
                                    count: c.available_payments_count,
                                    defaultValue: '{{count}} payments available',
                                  })}
                                </span>
                                <span className="cash-receipt-combobox__badge cash-receipt-combobox__badge--receipted">
                                  {t('accountings.cashReceipt.receiptedPaymentsBadge', {
                                    count: c.receipted_payments_count ?? 0,
                                    defaultValue: '{{count}} receipted',
                                  })}
                                </span>
                              </div>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 'payments' && selectedClient ? (
            <>
              <div className="cash-receipt-client-chip">
                <div className="cash-receipt-client-chip__name">{customerSearchLabel(selectedClient)}</div>
                <button type="button" className="cash-receipt-link-btn" onClick={() => setStep('customer')}>
                  {t('accountings.cashReceipt.changeCustomer', 'Change customer')}
                </button>
              </div>
              {loadingPayments ? (
                <LoaderDots label={t('common.loading')} />
              ) : (
                <>
                  <div className="cash-receipt-payments-toolbar">
                    <label className="cash-receipt-select-all">
                      <input
                        type="checkbox"
                        className="cash-receipt-checkbox"
                        checked={allPaymentsSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePaymentsSelected
                        }}
                        onChange={toggleAllPayments}
                        disabled={payments.length === 0}
                      />
                      <span>
                        {allPaymentsSelected
                          ? t('accountings.cashReceipt.deselectAll', 'Deselect all')
                          : t('accountings.cashReceipt.selectAll', 'Select all')}
                      </span>
                    </label>
                    <span className="cash-receipt-toolbar-count">
                      {t('accountings.cashReceipt.selectedCount', {
                        count: selectedPaymentIds.size,
                        defaultValue: '{{count}} selected',
                      })}
                    </span>
                  </div>
                  <div className="cash-receipt-payments-table-wrap">
                    <table className="cash-receipt-payments-table">
                      <thead>
                        <tr>
                          <th className="cash-receipt-payments-table__cb">
                            <label className="cash-receipt-checkbox-label cash-receipt-checkbox-label--solo">
                              <input
                                type="checkbox"
                                className="cash-receipt-checkbox"
                                checked={allPaymentsSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = somePaymentsSelected
                                }}
                                onChange={toggleAllPayments}
                                disabled={payments.length === 0}
                                aria-label={
                                  allPaymentsSelected
                                    ? t('accountings.cashReceipt.deselectAll', 'Deselect all')
                                    : t('accountings.cashReceipt.selectAll', 'Select all')
                                }
                              />
                            </label>
                          </th>
                          <th>{t('accountings.cashReceipt.colPayment', 'Payment')}</th>
                          <th>{t('accountings.cashReceipt.colType', 'Type')}</th>
                          <th>{t('accountings.colAmount', 'Amount')}</th>
                          <th>{t('invoices.payment.date', 'Date')}</th>
                          <th>{t('accountings.shipmentReference', 'Shipment')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => {
                          const pid = Number(p.id)
                          const on = selectedPaymentIds.has(pid)
                          return (
                            <tr key={pid} className={on ? 'cash-receipt-payments-table__row--on' : ''}>
                              <td className="cash-receipt-payments-table__cb">
                                <label className="cash-receipt-checkbox-label cash-receipt-checkbox-label--solo">
                                  <input
                                    type="checkbox"
                                    className="cash-receipt-checkbox"
                                    checked={on}
                                    onChange={() => togglePayment(pid)}
                                    aria-label={t('accountings.cashReceipt.selectPayment', 'Select payment {{id}}', { id: pid })}
                                  />
                                </label>
                              </td>
                              <td className="cash-receipt-payments-table__id">PAY-{pid}</td>
                              <td>
                                <span className={`cash-receipt-type-badge${p.is_advance ? ' cash-receipt-type-badge--adv' : ''}`}>
                                  {p.is_advance
                                    ? t('shipments.fin.advanceBadge', 'Advance')
                                    : t('accountings.cashReceipt.shipmentLinked', 'Shipment')}
                                </span>
                              </td>
                              <td>
                                <CurrencyMapBadges value={{ [p.currency_code]: p.amount }} size="sm" amountFirst />
                              </td>
                              <td>{formatStatementDetailDate(p.paid_at, i18n.language)}</td>
                              <td>{p.shipment_reference || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {payments.length === 0 ? (
                    <p className="cash-receipt-empty">{t('accountings.cashReceipt.noPayments', 'No payments available for receipt')}</p>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {step === 'preview' && preview ? (
            <CashReceiptSummaryPreview preview={preview} selectedClient={selectedClient} t={t} i18n={i18n} />
          ) : null}

          {step === 'done' && createdReceipt ? (
            <div className="cash-receipt-done">
              <div className="cash-receipt-done__icon" aria-hidden>
                <Check className="h-9 w-9" strokeWidth={2.5} />
              </div>
              <h3 className="cash-receipt-done__title">{t('accountings.cashReceipt.successTitle', 'Receipt issued')}</h3>
              <p className="cash-receipt-done__number">{createdReceipt.receipt_number}</p>
              <button
                type="button"
                className="cash-receipt-done__download"
                onClick={() => openCashReceiptPdf(token, createdReceipt.id)}
              >
                <Download className="h-4 w-4" aria-hidden />
                {t('accountings.cashReceipt.downloadPdf', 'Download PDF')}
              </button>
            </div>
          ) : null}
        </div>

        {step === 'payments' && Object.keys(totalsMap).length > 0 ? (
          <div className="cash-receipt-footer-summary">
            <div className="cash-receipt-footer-summary__label">
              {t('accountings.cashReceipt.summarySelected', {
                count: selectedPaymentIds.size,
                defaultValue: '{{count}} payments selected',
              })}
            </div>
            <div className="cash-receipt-footer-summary__currencies">
              <CurrencyMapBadges value={totalsMap} size="sm" amountFirst />
            </div>
          </div>
        ) : null}

        <footer className="cash-receipt-modal__foot">
          {step === 'payments' ? (
            <>
              <button type="button" className="cash-receipt-btn cash-receipt-btn--back" onClick={() => setStep('customer')} disabled={previewLoading}>
                <ChevronLeft className="cash-receipt-btn__icon" aria-hidden />
                <span>{t('accountings.cashReceipt.back', 'Back')}</span>
              </button>
              <button type="button" className="cash-receipt-btn" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="cash-receipt-btn cash-receipt-btn--primary"
                disabled={selectedPaymentIds.size === 0 || previewLoading}
                onClick={goPreview}
              >
                <span>{previewLoading ? t('common.loading') : t('accountings.cashReceipt.previewReceipt', 'Preview PDF')}</span>
                <ChevronRight className="cash-receipt-btn__icon" aria-hidden />
              </button>
            </>
          ) : null}
          {step === 'preview' ? (
            <>
              <button type="button" className="cash-receipt-btn cash-receipt-btn--back" onClick={() => setStep('payments')} disabled={submitting}>
                <ChevronLeft className="cash-receipt-btn__icon" aria-hidden />
                <span>{t('accountings.cashReceipt.back', 'Back')}</span>
              </button>
              <button type="button" className="cash-receipt-btn" onClick={onClose} disabled={submitting}>
                {t('common.cancel')}
              </button>
              <button type="button" className="cash-receipt-btn cash-receipt-btn--primary" disabled={submitting} onClick={confirmAndGenerate}>
                <span>{submitting ? t('common.loading') : t('accountings.cashReceipt.generatePdf', 'Generate & save PDF')}</span>
              </button>
            </>
          ) : null}
          {step === 'customer' ? (
            <button type="button" className="cash-receipt-btn" onClick={onClose}>
              {t('common.cancel')}
            </button>
          ) : null}
          {step === 'done' ? (
            <button type="button" className="cash-receipt-btn cash-receipt-btn--primary" onClick={onClose}>
              {t('common.close')}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
