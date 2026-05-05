import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, FileSpreadsheet, X } from 'lucide-react'
import Tabs from '../../components/Tabs'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
import { getStoredToken } from '../Login'
import {
  getCompanyStatement,
  getCustomerStatements,
  getCustomerStatementDetail,
  listBankAccounts,
  recordPayment,
} from '../../api/accountings'
import '../Clients/Clients.css'
import './Accountings.css'

function mapToInline(value) {
  const entries = Object.entries(value || {}).filter(([, amount]) => Number(amount) !== 0)
  if (!entries.length) return '—'
  return entries.map(([cur, amount]) => `${String(cur).toUpperCase()} ${Number(amount || 0).toFixed(2)}`).join(' · ')
}

export default function AccountsOverview() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState(null)
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [payment, setPayment] = useState({
    amount: '',
    currency_code: 'USD',
    method: 'bank_transfer',
    source_account_id: '',
    paid_at: new Date().toISOString().slice(0, 10),
    invoice_id: '',
  })

  const loadOverview = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [companyRes, customersRes, banksRes] = await Promise.all([
        getCompanyStatement(token),
        getCustomerStatements(token, { search }),
        listBankAccounts(token),
      ])
      setCompany(companyRes?.data || null)
      setCustomers(Array.isArray(customersRes?.data) ? customersRes.data : [])
      setBankAccounts(Array.isArray(banksRes?.data) ? banksRes.data : [])
    } finally {
      setLoading(false)
    }
  }, [token, search])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const openCustomerDetail = async (customerId) => {
    if (!token || !customerId) return
    const res = await getCustomerStatementDetail(token, customerId)
    setDetail(res?.data || null)
  }

  const openPayment = (invoiceId = '') => {
    setPaymentModal(true)
    setPayment((prev) => ({ ...prev, invoice_id: invoiceId ? String(invoiceId) : '' }))
  }

  const submitPayment = async () => {
    if (!token) return
    const amount = Number(payment.amount)
    if (!Number.isFinite(amount) || amount <= 0) return
    setPaymentBusy(true)
    try {
      await recordPayment(token, {
        type: 'client_receipt',
        amount,
        currency_code: payment.currency_code,
        method: payment.method,
        source_account_id: payment.source_account_id ? Number(payment.source_account_id) : null,
        paid_at: payment.paid_at,
        invoice_id: payment.invoice_id ? Number(payment.invoice_id) : null,
      })
      setPaymentModal(null)
      await loadOverview()
      if (detail?.customer_id) {
        await openCustomerDetail(detail.customer_id)
      }
    } finally {
      setPaymentBusy(false)
    }
  }

  return (
    <Container size="xl">
      <div className="clients-page accountings-page">
        <div className="invoices-tabs-wrap mb-4">
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'company', label: t('accountings.companyStatement', 'Company Statement') },
              { id: 'customers', label: t('accountings.customerStatement', 'Customer Statement') },
            ]}
          />
        </div>

        {loading ? <LoaderDots /> : null}

        {activeTab === 'company' && company && (
          <div className="accountings-table-section">
            <div className="clients-stats-grid accountings-stats-grid">
              <div className="stats-card">
                <h4>{t('accountings.totalInvoicesCount', 'Total Invoices Count')}</h4>
                <p>{company.total_invoices_count ?? 0}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.totalBilledAmount', 'Total Billed Amount')}</h4>
                <p>{mapToInline(company.total_billed_amount)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.totalPaidAmount', 'Total Paid Amount')}</h4>
                <p>{mapToInline(company.total_paid_amount)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.remainingBalance', 'Remaining Balance')}</h4>
                <p>{mapToInline(company.remaining_balance)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="accountings-table-section">
            <div className="clients-filters-card">
              <div className="clients-filters__row clients-filters__row--main">
                <div className="clients-filters__search-wrap">
                  <Search className="clients-filters__search-icon" />
                  <input
                    type="search"
                    className="clients-input clients-filters__search"
                    placeholder={t('accountings.customerSearchPlaceholder', 'Search customer...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.colClient', 'Customer')}</th>
                    <th>{t('accountings.totalInvoicesCount', 'Invoice Count')}</th>
                    <th>{t('accountings.totalBilledAmount', 'Total Invoices')}</th>
                    <th>{t('accountings.totalPaidAmount', 'Paid')}</th>
                    <th>{t('accountings.remainingBalance', 'Remaining')}</th>
                    <th>{t('accountings.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((row) => (
                    <tr key={row.customer_id}>
                      <td>{row.customer_name}</td>
                      <td>{row.invoice_count}</td>
                      <td>{mapToInline(row.total_invoices_value)}</td>
                      <td>{mapToInline(row.paid_amount)}</td>
                      <td>{mapToInline(row.remaining_balance)}</td>
                      <td>
                        <button type="button" className="accountings-btn accountings-btn--small" onClick={() => openCustomerDetail(row.customer_id)}>
                          <FileSpreadsheet className="inline h-3.5 w-3.5" /> {t('accountings.ledger', 'Statement')}
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
          </div>
        )}

        {detail && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setDetail(null)} />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="flex items-start justify-between gap-3">
                <h2>{detail.customer_name}</h2>
                <button type="button" className="accountings-btn accountings-btn--small p-2" onClick={() => setDetail(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="accountings-table-wrap mt-3">
                <table className="accountings-table">
                  <thead>
                    <tr>
                      <th>{t('accountings.invoice', 'Invoice')}</th>
                      <th>{t('accountings.totalBilledAmount', 'Total')}</th>
                      <th>{t('accountings.totalPaidAmount', 'Paid')}</th>
                      <th>{t('accountings.remainingBalance', 'Remaining')}</th>
                      <th>{t('accountings.status', 'Status')}</th>
                      <th>{t('accountings.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.invoices || []).map((inv) => (
                      <tr key={inv.invoice_id}>
                        <td>{inv.invoice_reference}</td>
                        <td>{mapToInline(inv.total_amount)}</td>
                        <td>{mapToInline(inv.paid_amount)}</td>
                        <td>{mapToInline(inv.remaining_amount)}</td>
                        <td>{inv.status}</td>
                        <td>
                          <button type="button" className="accountings-btn accountings-btn--small" onClick={() => openPayment(inv.invoice_id)}>
                            {t('accountings.recordPayment', 'Record Payment')}
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

        {paymentModal && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setPaymentModal(null)} />
            <div className="accountings-modal-content">
              <h3>{t('accountings.recordPayment', 'Record Payment')}</h3>
              <div className="grid gap-2 mt-2">
                <input className="clients-input" placeholder={t('payments.amount', 'Amount')} value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
                <input className="clients-input" placeholder={t('payments.currency', 'Currency')} value={payment.currency_code} onChange={(e) => setPayment((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))} />
                <input className="clients-input" placeholder={t('payments.method', 'Method')} value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))} />
                <select className="clients-input" value={payment.source_account_id} onChange={(e) => setPayment((p) => ({ ...p, source_account_id: e.target.value }))}>
                  <option value="">{t('payments.bankAccountOptional', 'Bank account (optional)')}</option>
                  {bankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bank_name} - {bank.currency_code}
                    </option>
                  ))}
                </select>
                <input type="date" className="clients-input" value={payment.paid_at} onChange={(e) => setPayment((p) => ({ ...p, paid_at: e.target.value }))} />
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
