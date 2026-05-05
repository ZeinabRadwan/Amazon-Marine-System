import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  getPartnerLedgerSummary,
  getPartnerLedgerDetail,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  recordPayment,
  listPayments,
} from '../../api/accountings'
import { getTreasurySummary, getTreasuryEntries, createTreasuryTransfer } from '../../api/treasury'
import { Container } from '../../components/Container'
import LoaderDots from '../../components/LoaderDots'
import Tabs from '../../components/Tabs'
import '../Clients/Clients.css'
import '../Accountings/Accountings.css'
import './PartnerLedger.css'

function fmtBreakdown(map) {
  if (!map || typeof map !== 'object') return '—'
  const entries = Object.entries(map)
  if (!entries.length) return '—'
  return entries.map(([cur, val]) => `${Number(val || 0).toFixed(2)} ${String(cur || '').toUpperCase()}`).join(' | ')
}

function statusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return 'partner-ledger__status partner-ledger__status--paid'
  if (s === 'partially_paid') return 'partner-ledger__status partner-ledger__status--partial'
  return 'partner-ledger__status partner-ledger__status--unpaid'
}

const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'internal_transfer']

export default function PartnerLedger() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const { hasPageAccess } = useAuthAccess()
  const canView = hasPageAccess('accounting')
  const canManage = hasPageAccess('accounting')

  const [activeTab, setActiveTab] = useState('ledger')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [rows, setRows] = useState([])
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [paymentRows, setPaymentRows] = useState([])
  const [bankRows, setBankRows] = useState([])
  const [treasurySummary, setTreasurySummary] = useState(null)
  const [treasuryEntries, setTreasuryEntries] = useState([])

  const [paymentForm, setPaymentForm] = useState({
    type: 'vendor_payment',
    amount: '',
    currency_code: 'USD',
    method: 'bank_transfer',
    source_account_id: '',
    paid_at: new Date().toISOString().slice(0, 10),
    vendor_id: '',
    shipment_id: '',
    invoice_id: '',
    reference: '',
    exchange_rate: '',
    target_currency_code: '',
    notes: '',
  })

  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    iban: '',
    swift_code: '',
    supported_currencies: 'USD,EGP,EUR',
  })

  const [transferForm, setTransferForm] = useState({
    from_account: '',
    to_account: '',
    from_account_id: '',
    to_account_id: '',
    from_amount: '',
    from_currency: 'USD',
    to_amount: '',
    to_currency: 'USD',
    fx_rate: '',
    description: '',
    entry_date: new Date().toISOString().slice(0, 10),
  })

  const loadLedger = useCallback(() => {
    if (!token || !canView) return
    setLoading(true)
    setError(null)
    getPartnerLedgerSummary(token, { search: search || undefined, category })
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => setError(e?.message || 'Error'))
      .finally(() => setLoading(false))
  }, [token, canView, search, category])

  const loadSupportData = useCallback(() => {
    if (!token || !canView) return
    listBankAccounts(token).then((res) => setBankRows(Array.isArray(res?.data) ? res.data : [])).catch(() => setBankRows([]))
    listPayments(token).then((res) => setPaymentRows(Array.isArray(res?.data) ? res.data : [])).catch(() => setPaymentRows([]))
    getTreasurySummary(token, { months: 6 }).then((res) => setTreasurySummary(res)).catch(() => setTreasurySummary(null))
    getTreasuryEntries(token, {}).then((res) => setTreasuryEntries(Array.isArray(res?.data) ? res.data : [])).catch(() => setTreasuryEntries([]))
  }, [token, canView])

  useEffect(() => {
    loadLedger()
  }, [loadLedger])

  useEffect(() => {
    loadSupportData()
  }, [loadSupportData])

  const openDetail = async (partnerId) => {
    if (!partnerId || !token) return
    setDetailLoading(true)
    try {
      const res = await getPartnerLedgerDetail(token, partnerId)
      setDetail(res?.data || null)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    if (!canManage || !token) return
    await recordPayment(token, {
      ...paymentForm,
      amount: Number(paymentForm.amount),
      source_account_id: paymentForm.source_account_id ? Number(paymentForm.source_account_id) : null,
      vendor_id: paymentForm.vendor_id ? Number(paymentForm.vendor_id) : null,
      shipment_id: paymentForm.shipment_id ? Number(paymentForm.shipment_id) : null,
      invoice_id: paymentForm.invoice_id ? Number(paymentForm.invoice_id) : null,
      exchange_rate: paymentForm.exchange_rate ? Number(paymentForm.exchange_rate) : null,
    })
    setPaymentForm((prev) => ({ ...prev, amount: '', reference: '', notes: '' }))
    loadSupportData()
    loadLedger()
  }

  const submitBank = async (e) => {
    e.preventDefault()
    if (!canManage || !token) return
    const payload = {
      ...bankForm,
      supported_currencies: String(bankForm.supported_currencies || '')
        .split(',')
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
    }
    await createBankAccount(token, payload)
    setBankForm({
      bank_name: '',
      account_name: '',
      account_number: '',
      iban: '',
      swift_code: '',
      supported_currencies: 'USD,EGP,EUR',
    })
    loadSupportData()
  }

  const quickToggleBank = async (row) => {
    if (!token) return
    await updateBankAccount(token, row.id, { is_active: !row.is_active })
    loadSupportData()
  }

  const submitTransfer = async (e) => {
    e.preventDefault()
    if (!token || !canManage) return
    await createTreasuryTransfer(token, {
      ...transferForm,
      from_account_id: transferForm.from_account_id ? Number(transferForm.from_account_id) : null,
      to_account_id: transferForm.to_account_id ? Number(transferForm.to_account_id) : null,
      from_amount: Number(transferForm.from_amount),
      to_amount: transferForm.to_amount ? Number(transferForm.to_amount) : null,
      fx_rate: transferForm.fx_rate ? Number(transferForm.fx_rate) : null,
    })
    setTransferForm((prev) => ({ ...prev, from_amount: '', to_amount: '', fx_rate: '', description: '' }))
    loadSupportData()
  }

  const tabs = useMemo(
    () => [
      { id: 'ledger', label: t('partnerLedger.tabs.ledger', 'Partner Ledger') },
      { id: 'payments', label: t('partnerLedger.tabs.payments', 'Record Payment') },
      { id: 'banks', label: t('partnerLedger.tabs.banks', 'Bank Accounts') },
      { id: 'cashbox', label: t('partnerLedger.tabs.cashbox', 'Cashbox') },
    ],
    [t],
  )

  if (!canView) {
    return <Container><div className="clients-empty">{t('common.noPermission', 'No permission')}</div></Container>
  }

  return (
    <Container size="xl">
      <div className="clients-page partner-ledger-page">
        <div className="clients-filters-card">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'ledger' && (
          <>
            <div className="clients-filters-card">
              <div className="partner-ledger__filters">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('partnerLedger.search', 'Search by partner name')} />
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">{t('partnerLedger.categories.all', 'All')}</option>
                  <option value="shipping_line">{t('partnerLedger.categories.shipping_line', 'Shipping Line')}</option>
                  <option value="inland_transport">{t('partnerLedger.categories.inland_transport', 'Inland Transport')}</option>
                  <option value="customs_clearance">{t('partnerLedger.categories.customs_clearance', 'Customs Clearance')}</option>
                  <option value="insurance">{t('partnerLedger.categories.insurance', 'Insurance')}</option>
                </select>
                <button type="button" className="btn btn-secondary" onClick={loadLedger}>{t('common.apply', 'Apply')}</button>
              </div>
            </div>

            <div className="clients-table-card">
              {loading ? <LoaderDots /> : error ? <div className="clients-empty">{error}</div> : (
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>{t('partnerLedger.table.partner', 'Partner')}</th>
                      <th>{t('partnerLedger.table.category', 'Category')}</th>
                      <th>{t('partnerLedger.table.invoices', 'Invoices')}</th>
                      <th>{t('partnerLedger.table.billed', 'Total billed')}</th>
                      <th>{t('partnerLedger.table.paid', 'Total paid')}</th>
                      <th>{t('partnerLedger.table.balance', 'Remaining balance')}</th>
                      <th>{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.partner_id}>
                        <td>{r.partner_name || '—'}</td>
                        <td>{r.category || '—'}</td>
                        <td>{r.total_invoices_count ?? 0}</td>
                        <td>{fmtBreakdown(r.total_billed_amount)}</td>
                        <td>{fmtBreakdown(r.total_paid_amount)}</td>
                        <td>{fmtBreakdown(r.remaining_balance)}</td>
                        <td><button type="button" className="btn btn-sm btn-primary" onClick={() => openDetail(r.partner_id)}>{t('common.view', 'View')}</button></td>
                      </tr>
                    ))}
                    {!rows.length && <tr><td colSpan={7} className="clients-empty">{t('common.noData', 'No data')}</td></tr>}
                  </tbody>
                </table>
              )}
            </div>

            {detail && (
              <div className="clients-table-card">
                <div className="partner-ledger__detail-head">
                  <h3>{detail.partner_name}</h3>
                  <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>{t('common.close', 'Close')}</button>
                </div>
                {detailLoading ? <LoaderDots /> : (
                  <table className="clients-table">
                    <thead>
                      <tr>
                        <th>{t('partnerLedger.detail.shipment', 'Shipment ID')}</th>
                        <th>{t('partnerLedger.detail.invoice', 'Invoice Ref')}</th>
                        <th>{t('partnerLedger.detail.amount', 'Amount')}</th>
                        <th>{t('partnerLedger.detail.currency', 'Currency breakdown')}</th>
                        <th>{t('partnerLedger.detail.status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.rows || []).map((row, i) => (
                        <tr key={`${row.invoice_reference}-${i}`}>
                          <td>{row.shipment_id || '—'}</td>
                          <td>{row.invoice_reference || '—'}</td>
                          <td>{Number(row.amount || 0).toFixed(2)}</td>
                          <td>{fmtBreakdown(row.currency_breakdown)}</td>
                          <td><span className={statusClass(row.status)}>{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <div className="clients-table-card">
            <form className="partner-ledger__form-grid" onSubmit={submitPayment}>
              <input required type="number" step="0.01" placeholder={t('partnerLedger.payment.amount', 'Amount')} value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
              <select value={paymentForm.currency_code} onChange={(e) => setPaymentForm((p) => ({ ...p, currency_code: e.target.value }))}>
                <option value="USD">USD</option><option value="EGP">EGP</option><option value="EUR">EUR</option>
              </select>
              <select value={paymentForm.method} onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={paymentForm.source_account_id} onChange={(e) => setPaymentForm((p) => ({ ...p, source_account_id: e.target.value }))}>
                <option value="">{t('partnerLedger.payment.sourceAccount', 'Source account')}</option>
                {bankRows.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name}</option>)}
              </select>
              <input type="date" required value={paymentForm.paid_at} onChange={(e) => setPaymentForm((p) => ({ ...p, paid_at: e.target.value }))} />
              <input placeholder={t('partnerLedger.payment.partnerId', 'Partner ID (optional)')} value={paymentForm.vendor_id} onChange={(e) => setPaymentForm((p) => ({ ...p, vendor_id: e.target.value }))} />
              <input placeholder={t('partnerLedger.payment.shipmentId', 'Shipment ID (optional)')} value={paymentForm.shipment_id} onChange={(e) => setPaymentForm((p) => ({ ...p, shipment_id: e.target.value }))} />
              <input placeholder={t('partnerLedger.payment.invoiceId', 'Invoice ID (optional)')} value={paymentForm.invoice_id} onChange={(e) => setPaymentForm((p) => ({ ...p, invoice_id: e.target.value }))} />
              <input placeholder={t('partnerLedger.payment.exchangeRate', 'Exchange rate (manual)')} value={paymentForm.exchange_rate} onChange={(e) => setPaymentForm((p) => ({ ...p, exchange_rate: e.target.value }))} />
              <input placeholder={t('partnerLedger.payment.targetCurrency', 'Target currency')} value={paymentForm.target_currency_code} onChange={(e) => setPaymentForm((p) => ({ ...p, target_currency_code: e.target.value.toUpperCase() }))} />
              <input placeholder={t('partnerLedger.payment.reference', 'Reference')} value={paymentForm.reference} onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))} />
              <input placeholder={t('partnerLedger.payment.notes', 'Notes')} value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} />
              <button type="submit" className="btn btn-primary">{t('partnerLedger.payment.submit', 'Record Payment')}</button>
            </form>

            <table className="clients-table mt-3">
              <thead><tr><th>ID</th><th>{t('partnerLedger.payment.amount', 'Amount')}</th><th>{t('partnerLedger.payment.method', 'Method')}</th><th>{t('partnerLedger.payment.date', 'Date')}</th><th>{t('partnerLedger.payment.linked', 'Linked')}</th></tr></thead>
              <tbody>
                {paymentRows.slice(0, 25).map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{Number(p.amount || 0).toFixed(2)} {p.currency_code}</td>
                    <td>{p.method || '—'}</td>
                    <td>{p.paid_at ? String(p.paid_at).slice(0, 10) : '—'}</td>
                    <td>V:{p.vendor_id || '—'} / S:{p.shipment_id || '—'} / I:{p.invoice_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'banks' && (
          <div className="clients-table-card">
            <form className="partner-ledger__form-grid" onSubmit={submitBank}>
              <input required placeholder={t('partnerLedger.bank.bankName', 'Bank name')} value={bankForm.bank_name} onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))} />
              <input required placeholder={t('partnerLedger.bank.accountName', 'Account name')} value={bankForm.account_name} onChange={(e) => setBankForm((p) => ({ ...p, account_name: e.target.value }))} />
              <input placeholder={t('partnerLedger.bank.accountNumber', 'Account number')} value={bankForm.account_number} onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value }))} />
              <input placeholder="IBAN" value={bankForm.iban} onChange={(e) => setBankForm((p) => ({ ...p, iban: e.target.value }))} />
              <input placeholder="SWIFT" value={bankForm.swift_code} onChange={(e) => setBankForm((p) => ({ ...p, swift_code: e.target.value }))} />
              <input placeholder={t('partnerLedger.bank.currencies', 'Supported currencies (comma-separated)')} value={bankForm.supported_currencies} onChange={(e) => setBankForm((p) => ({ ...p, supported_currencies: e.target.value }))} />
              <button type="submit" className="btn btn-primary">{t('partnerLedger.bank.add', 'Add bank account')}</button>
            </form>

            <table className="clients-table mt-3">
              <thead><tr><th>{t('partnerLedger.bank.bankName', 'Bank')}</th><th>{t('partnerLedger.bank.accountName', 'Account')}</th><th>IBAN</th><th>SWIFT</th><th>{t('partnerLedger.bank.currencies', 'Currencies')}</th><th>{t('common.actions', 'Actions')}</th></tr></thead>
              <tbody>
                {bankRows.map((b) => (
                  <tr key={b.id}>
                    <td>{b.bank_name}</td><td>{b.account_name}</td><td>{b.iban || '—'}</td><td>{b.swift_code || '—'}</td><td>{Array.isArray(b.supported_currencies) ? b.supported_currencies.join(', ') : '—'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => quickToggleBank(b)}>{b.is_active ? t('common.disable', 'Disable') : t('common.enable', 'Enable')}</button>
                      <button type="button" className="btn btn-sm btn-danger ms-2" onClick={() => deleteBankAccount(token, b.id).then(loadSupportData)}>{t('common.delete', 'Delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'cashbox' && (
          <div className="clients-table-card">
            <div className="partner-ledger__cashbox-summary">
              <div><strong>{t('treasury.stats.cash', 'Cash balance')}</strong>: {Number(treasurySummary?.totals?.cash_balance || 0).toFixed(2)}</div>
              <div><strong>{t('treasury.stats.bank', 'Bank balance')}</strong>: {Number(treasurySummary?.totals?.bank_balance || 0).toFixed(2)}</div>
              <div><strong>{t('treasury.stats.monthlyExpenses', 'Monthly expenses')}</strong>: {Number(treasurySummary?.totals?.monthly_expenses || 0).toFixed(2)}</div>
            </div>

            <form className="partner-ledger__form-grid mt-3" onSubmit={submitTransfer}>
              <input required placeholder={t('partnerLedger.transfer.fromAccount', 'From account label')} value={transferForm.from_account} onChange={(e) => setTransferForm((p) => ({ ...p, from_account: e.target.value }))} />
              <input required placeholder={t('partnerLedger.transfer.toAccount', 'To account label')} value={transferForm.to_account} onChange={(e) => setTransferForm((p) => ({ ...p, to_account: e.target.value }))} />
              <select value={transferForm.from_account_id} onChange={(e) => setTransferForm((p) => ({ ...p, from_account_id: e.target.value }))}>
                <option value="">{t('partnerLedger.transfer.fromAccountId', 'From bank account')}</option>
                {bankRows.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name}</option>)}
              </select>
              <select value={transferForm.to_account_id} onChange={(e) => setTransferForm((p) => ({ ...p, to_account_id: e.target.value }))}>
                <option value="">{t('partnerLedger.transfer.toAccountId', 'To bank account')}</option>
                {bankRows.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name}</option>)}
              </select>
              <input required type="number" step="0.01" placeholder={t('partnerLedger.transfer.fromAmount', 'From amount')} value={transferForm.from_amount} onChange={(e) => setTransferForm((p) => ({ ...p, from_amount: e.target.value }))} />
              <select value={transferForm.from_currency} onChange={(e) => setTransferForm((p) => ({ ...p, from_currency: e.target.value }))}><option>USD</option><option>EGP</option><option>EUR</option></select>
              <input type="number" step="0.01" placeholder={t('partnerLedger.transfer.toAmount', 'To amount (optional)')} value={transferForm.to_amount} onChange={(e) => setTransferForm((p) => ({ ...p, to_amount: e.target.value }))} />
              <select value={transferForm.to_currency} onChange={(e) => setTransferForm((p) => ({ ...p, to_currency: e.target.value }))}><option>USD</option><option>EGP</option><option>EUR</option></select>
              <input placeholder={t('partnerLedger.transfer.fxRate', 'Manual exchange rate')} value={transferForm.fx_rate} onChange={(e) => setTransferForm((p) => ({ ...p, fx_rate: e.target.value }))} />
              <input type="date" required value={transferForm.entry_date} onChange={(e) => setTransferForm((p) => ({ ...p, entry_date: e.target.value }))} />
              <input placeholder={t('partnerLedger.transfer.description', 'Description')} value={transferForm.description} onChange={(e) => setTransferForm((p) => ({ ...p, description: e.target.value }))} />
              <button type="submit" className="btn btn-primary">{t('partnerLedger.transfer.submit', 'Record Transfer')}</button>
            </form>

            <table className="clients-table mt-3">
              <thead><tr><th>{t('treasury.table.date', 'Date')}</th><th>{t('treasury.table.type', 'Type')}</th><th>{t('treasury.table.source', 'Source')}</th><th>{t('treasury.table.amount', 'Amount')}</th><th>{t('treasury.table.currency', 'Currency')}</th></tr></thead>
              <tbody>
                {treasuryEntries.slice(0, 25).map((e) => (
                  <tr key={e.id}>
                    <td>{e.entry_date || '—'}</td>
                    <td>{e.entry_type}</td>
                    <td>{e.source || '—'}</td>
                    <td>{Number(e.amount || 0).toFixed(2)}</td>
                    <td>{e.currency_code || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Container>
  )
}
