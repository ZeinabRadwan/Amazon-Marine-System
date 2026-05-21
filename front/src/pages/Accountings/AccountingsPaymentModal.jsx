import { useMemo } from 'react'
import {
  ACCOUNTINGS_PAYMENT_CURRENCIES,
  bankSupportsCurrency,
  normalizeAccountingsPaymentCurrency,
} from './accountingsStatementShared'
import './Accountings.css'

/** Simple payment modal for invoice / vendor payments (not advance — use ClientPaymentModal). */
export default function AccountingsPaymentModal({
  open,
  onClose,
  t,
  payment,
  setPayment,
  paymentBusy,
  bankAccounts,
  paymentProofFile,
  setPaymentProofFile,
  onSubmit,
  submitError,
}) {
  const selectedBank = useMemo(
    () => bankAccounts.find((b) => Number(b.id) === Number(payment.source_account_id)),
    [bankAccounts, payment.source_account_id],
  )
  const curCode = normalizeAccountingsPaymentCurrency(payment.currency_code)
  const showConvertHint =
    selectedBank &&
    Array.isArray(selectedBank.supported_currencies) &&
    selectedBank.supported_currencies.length > 0 &&
    !bankSupportsCurrency(selectedBank, curCode)

  if (!open) return null
  return (
    <div className="accountings-modal" role="dialog" aria-modal="true">
      <button type="button" className="accountings-modal-backdrop" onClick={onClose} />
      <div className="accountings-modal-content">
        <h3>{t('accountings.recordPayment', 'Record Payment')}</h3>
        {submitError ? (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-0" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="grid gap-2 mt-2">
          <input
            className="clients-input"
            placeholder={t('payments.amount', 'Amount')}
            value={payment.amount}
            onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
          />
          <select
            className="clients-input"
            aria-label={t('payments.currency', 'Currency')}
            value={normalizeAccountingsPaymentCurrency(payment.currency_code)}
            onChange={(e) => setPayment((p) => ({ ...p, currency_code: e.target.value }))}
          >
            {ACCOUNTINGS_PAYMENT_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <select
            className="clients-input"
            value={payment.method}
            onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}
          >
            <option value="bank_transfer">{t('payments.bankTransfer', 'Bank transfer')}</option>
            <option value="cash">{t('payments.cash', 'Cash')}</option>
            <option value="cheque">{t('payments.cheque', 'Cheque')}</option>
          </select>
          <select
            className="clients-input"
            value={payment.source_account_id}
            onChange={(e) => setPayment((p) => ({ ...p, source_account_id: e.target.value }))}
          >
            <option value="">{t('payments.bankAccountOptional', 'Bank account (optional)')}</option>
            {bankAccounts.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.bank_name} - {Array.isArray(bank.supported_currencies) ? bank.supported_currencies.join('/') : '—'}
              </option>
            ))}
          </select>
          {showConvertHint ? (
            <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 rounded-md px-2 py-1.5 border border-amber-200/80 dark:border-amber-800/60">
              {t('settings.bankAccounts.currencyAutoConvertHint')}
            </p>
          ) : null}
          <input
            type="date"
            className="clients-input"
            value={payment.paid_at}
            onChange={(e) => setPayment((p) => ({ ...p, paid_at: e.target.value }))}
          />
          <input
            type="file"
            className="clients-input"
            onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
          />
        </div>
        <div className="accountings-modal-actions">
          <button type="button" className="accountings-btn" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="accountings-btn accountings-btn--primary"
            onClick={onSubmit}
            disabled={paymentBusy}
          >
            {paymentBusy ? t('common.loading', 'Loading...') : t('accountings.recordPayment', 'Record Payment')}
          </button>
        </div>
      </div>
    </div>
  )
}
