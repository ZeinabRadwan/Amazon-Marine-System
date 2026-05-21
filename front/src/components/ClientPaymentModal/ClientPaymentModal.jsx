import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, Paperclip, Sparkles, Wallet, X } from 'lucide-react'
import DatePicker from '../DatePicker'
import { ShipmentMoneyMap } from '../../pages/Shipments/shipmentMoneyDisplay'
import '../../pages/Shipments/shipmentMoneyDisplay.css'
import { bankSupportsCurrency } from '../../pages/Accountings/accountingsStatementShared'
import { CLIENT_PAYMENT_CURRENCIES } from './clientPaymentForm'
import './ClientPaymentModal.css'

/**
 * Shared Record Payment / Record Advance Payment modal.
 * Used by Shipment Financials and Customer Account Statement (Accountings).
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {() => void} onSubmit
 * @param {boolean} saving
 * @param {string|null} submitError
 * @param {'advance'|'invoice'} mode
 * @param {{ amount: string, currency: string, method: string, bank_account_id: string, paid_at: string, reference: string }} form
 * @param {function} setForm
 * @param {Array} bankAccounts
 * @param {Record<string, number>|null} [prepaidByCurrency]
 * @param {File|null} [proofFile]
 * @param {(file: File|null) => void} [setProofFile]
 * @param {string} [titleId]
 */
export default function ClientPaymentModal({
  open,
  onClose,
  onSubmit,
  saving = false,
  submitError = null,
  mode = 'advance',
  form,
  setForm,
  bankAccounts = [],
  prepaidByCurrency = null,
  proofFile = null,
  setProofFile = null,
  titleId = 'client-payment-modal-title',
}) {
  const { t, i18n } = useTranslation()
  const isAdvance = mode === 'advance'
  const numberLocale = String(i18n?.language ?? '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'

  const prepaidMap = useMemo(() => {
    if (!prepaidByCurrency || typeof prepaidByCurrency !== 'object') return {}
    const out = {}
    for (const [k, v] of Object.entries(prepaidByCurrency)) {
      const n = Number(v)
      if (n > 0) out[String(k).toUpperCase()] = n
    }
    return out
  }, [prepaidByCurrency])

  const selectedBank = useMemo(
    () => bankAccounts.find((b) => Number(b.id) === Number(form.bank_account_id)),
    [bankAccounts, form.bank_account_id],
  )

  const showConvertHint =
    selectedBank &&
    Array.isArray(selectedBank.supported_currencies) &&
    selectedBank.supported_currencies.length > 0 &&
    !bankSupportsCurrency(selectedBank, form.currency)

  if (!open) return null

  return (
    <div
      className="shipment-fin-payment-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!saving) onClose()
      }}
    >
      <div
        className={`shipment-fin-payment-modal${isAdvance ? ' shipment-fin-payment-modal--advance' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shipment-fin-payment-modal__header">
          <div className="shipment-fin-payment-modal__header-main">
            <span className="shipment-fin-payment-modal__icon" aria-hidden>
              {isAdvance ? <Wallet /> : <DollarSign />}
            </span>
            <div className="shipment-fin-payment-modal__titles">
              <h4 id={titleId}>
                {isAdvance
                  ? t('shipments.fin.recordAdvancePayment', { defaultValue: 'Record advance payment' })
                  : t('shipments.fin.recordPayment', { defaultValue: 'Record Payment' })}
              </h4>
              <p className="shipment-fin-payment-modal__subtitle">
                {isAdvance
                  ? t('shipments.fin.recordAdvancePaymentSubtitle', {
                      defaultValue: 'Prepaid credit before invoice issuance',
                    })
                  : t('shipments.fin.recordPaymentSubtitle', {
                      defaultValue: 'Apply payment to the client invoice',
                    })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shipment-fin-payment-modal__close"
            disabled={saving}
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {isAdvance ? (
          <div className="shipment-fin-payment-modal__notice">
            <Sparkles className="shipment-fin-payment-modal__notice-icon" aria-hidden />
            <p>
              {t('shipments.fin.advancePaymentHint', {
                defaultValue:
                  'Payment is saved as customer prepaid credit and can be applied when the invoice is issued.',
              })}
            </p>
          </div>
        ) : null}

        {isAdvance && Object.keys(prepaidMap).length > 0 ? (
          <div className="shipment-fin-payment-modal__prepaid">
            <span className="shipment-fin-payment-modal__prepaid-label">
              {t('shipments.fin.prepaidCredit', { defaultValue: 'Prepaid credit' })}
            </span>
            <span className="shipment-fin-payment-modal__prepaid-value">
              <ShipmentMoneyMap map={prepaidMap} numberLocale={numberLocale} />
            </span>
          </div>
        ) : null}

        {submitError ? (
          <p className="shipment-fin-payment-modal__error" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="shipment-fin-payment-modal__body">
          <div className="shipment-fin-payment-form">
            <div className="shipment-fin-payment-row shipment-fin-payment-row--amount-currency">
              <label className="shipment-fin-payment-field shipment-fin-payment-field--amount">
                <span className="shipment-fin-payment-field__label">
                  {t('shipments.expColAmount', { defaultValue: 'Amount' })}
                  <span className="shipment-fin-payment-field__required" aria-hidden>
                    *
                  </span>
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="shipment-fin-payment-field__input"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </label>
              <label className="shipment-fin-payment-field shipment-fin-payment-field--currency">
                <span className="shipment-fin-payment-field__label">
                  {t('shipments.fin.paymentCurrency', { defaultValue: 'Currency' })}
                </span>
                <select
                  className="shipment-fin-payment-field__input"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                >
                  {CLIENT_PAYMENT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="shipment-fin-payment-grid">
              <label className="shipment-fin-payment-field">
                <span className="shipment-fin-payment-field__label">
                  {t('shipments.fin.paymentMethod', { defaultValue: 'Method' })}
                </span>
                <select
                  className="shipment-fin-payment-field__input"
                  value={form.method}
                  onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                >
                  <option value="bank_transfer">
                    {t('shipments.fin.paymentMethodBank', { defaultValue: 'Bank transfer' })}
                  </option>
                  <option value="cash">{t('shipments.fin.paymentMethodCash', { defaultValue: 'Cash' })}</option>
                  <option value="cheque">{t('shipments.fin.paymentMethodCheque', { defaultValue: 'Cheque' })}</option>
                  <option value="internal_transfer">
                    {t('shipments.fin.paymentMethodInternal', { defaultValue: 'Internal transfer' })}
                  </option>
                </select>
              </label>
              <label className="shipment-fin-payment-field">
                <span className="shipment-fin-payment-field__label">
                  {t('partnerLedger.payment.sourceAccount', { defaultValue: 'Bank account' })}
                </span>
                <select
                  className="shipment-fin-payment-field__input"
                  value={form.bank_account_id}
                  onChange={(e) => setForm((p) => ({ ...p, bank_account_id: e.target.value }))}
                >
                  <option value="">{t('payments.bankAccountOptional', { defaultValue: 'Bank account (optional)' })}</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} — {b.account_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="shipment-fin-payment-field">
                <span className="shipment-fin-payment-field__label">
                  {t('shipments.fin.paymentDate', { defaultValue: 'Paid date' })}
                </span>
                <DatePicker
                  className="shipment-fin-payment-field__input"
                  value={form.paid_at}
                  locale={i18n.language}
                  onChange={(next) => setForm((p) => ({ ...p, paid_at: next }))}
                />
              </label>
              <label className="shipment-fin-payment-field">
                <span className="shipment-fin-payment-field__label">
                  {t('shipments.fin.paymentReference', { defaultValue: 'Reference' })}
                </span>
                <input
                  type="text"
                  className="shipment-fin-payment-field__input"
                  placeholder={t('shipments.fin.paymentReferencePlaceholder', {
                    defaultValue: 'Transfer ref., receipt no., …',
                  })}
                  value={form.reference}
                  onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                />
              </label>
              {(isAdvance || typeof setProofFile === 'function') && typeof setProofFile === 'function' ? (
                <div className="shipment-fin-payment-field shipment-fin-payment-field--full shipment-fin-payment-proof">
                  <span className="shipment-fin-payment-field__label">
                    {t('accountings.paymentReceipt', 'Receipt / proof')}
                    <span className="shipment-fin-payment-field__optional">
                      {t('common.optional', { defaultValue: 'Optional' })}
                    </span>
                  </span>
                  <label className="shipment-fin-payment-proof__drop">
                    <Paperclip className="shipment-fin-payment-proof__icon" aria-hidden />
                    <span className="shipment-fin-payment-proof__text">
                      {proofFile
                        ? proofFile.name
                        : t('shipments.fin.paymentProofChoose', {
                            defaultValue: 'Choose image or PDF',
                          })}
                    </span>
                    <input
                      type="file"
                      className="shipment-fin-payment-proof__input"
                      accept="image/*,.pdf,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="shipment-fin-payment-proof__hint">
                    {t('shipments.fin.paymentProofHint', {
                      defaultValue: 'Transfer receipt, payment proof, or PDF (max 10 MB)',
                    })}
                  </p>
                  {proofFile ? (
                    <button
                      type="button"
                      className="shipment-fin-payment-proof__clear"
                      onClick={() => setProofFile(null)}
                    >
                      {t('common.remove', { defaultValue: 'Remove' })}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {showConvertHint ? (
              <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 rounded-md px-2 py-1.5 border border-amber-200/80 dark:border-amber-800/60">
                {t('settings.bankAccounts.currencyAutoConvertHint')}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="shipment-fin-payment-modal__footer">
          <button
            type="button"
            className="client-detail-modal__btn client-detail-modal__btn--secondary"
            disabled={saving}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`client-detail-modal__btn client-detail-modal__btn--primary${isAdvance ? ' shipment-fin-payment-modal__submit--advance' : ''}`}
            disabled={saving}
            onClick={onSubmit}
          >
            {saving
              ? t('shipments.saving', { defaultValue: 'Saving…' })
              : isAdvance
                ? t('shipments.fin.recordAdvancePayment', { defaultValue: 'Record advance payment' })
                : t('shipments.fin.recordPayment', { defaultValue: 'Record Payment' })}
          </button>
        </footer>
      </div>
    </div>
  )
}
