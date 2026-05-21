import { normalizeAccountingsPaymentCurrency } from '../../pages/Accountings/accountingsStatementShared'

export const CLIENT_PAYMENT_CURRENCIES = ['EGP', 'USD', 'EUR']

export function emptyClientPaymentForm() {
  return {
    amount: '',
    currency: 'USD',
    method: 'bank_transfer',
    bank_account_id: '',
    paid_at: new Date().toISOString().slice(0, 10),
    reference: '',
  }
}

/** Map Accountings payment state → shared modal form. */
export function accountingsPaymentToClientForm(payment) {
  return {
    amount: payment?.amount ?? '',
    currency: normalizeAccountingsPaymentCurrency(payment?.currency_code),
    method: payment?.method || 'bank_transfer',
    bank_account_id: payment?.source_account_id != null ? String(payment.source_account_id) : '',
    paid_at: payment?.paid_at || new Date().toISOString().slice(0, 10),
    reference: payment?.reference ?? '',
  }
}
