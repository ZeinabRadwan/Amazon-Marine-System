import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, FileSpreadsheet, X, DollarSign } from 'lucide-react'
import Tabs from '../../components/Tabs'
import LoaderDots from '../../components/LoaderDots'
import { Container } from '../../components/Container'
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
  const entries = Object.entries(value || {}).filter(([, amount]) => Number(amount) !== 0)
  if (!entries.length) return '—'
  return entries.map(([cur, amount]) => `${String(cur).toUpperCase()} ${Number(amount || 0).toFixed(2)}`).join(' · ')
}

function sumMap(map) {
  return Object.values(map || {}).reduce((acc, n) => acc + (Number(n) || 0), 0)
}

export default function AccountsOverview() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const [activeTab, setActiveTab] = useState('customers')
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [partners, setPartners] = useState([])
  const [search, setSearch] = useState('')
  const [customerStatus, setCustomerStatus] = useState('')
  const [customerDateFrom, setCustomerDateFrom] = useState('')
  const [customerDateTo, setCustomerDateTo] = useState('')
  const [customerShipmentId, setCustomerShipmentId] = useState('')
  const [vendorStatus, setVendorStatus] = useState('')
  const [vendorDateFrom, setVendorDateFrom] = useState('')
  const [vendorDateTo, setVendorDateTo] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [customerDetail, setCustomerDetail] = useState(null)
  const [partnerDetail, setPartnerDetail] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
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
  })

  const loadOverview = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [customersRes, partnersRes, banksRes] = await Promise.all([
        getCustomerStatements(token, {
          search,
          status: customerStatus || undefined,
          date_from: customerDateFrom || undefined,
          date_to: customerDateTo || undefined,
          shipment_id: customerShipmentId || undefined,
        }),
        getPartnerLedgerSummary(token, {
          search,
          vendor_id: vendorId || undefined,
          status: vendorStatus || undefined,
          date_from: vendorDateFrom || undefined,
          date_to: vendorDateTo || undefined,
        }),
        listBankAccounts(token),
      ])
      setCustomers(Array.isArray(customersRes?.data) ? customersRes.data : [])
      setPartners(Array.isArray(partnersRes?.data) ? partnersRes.data : [])
      setBankAccounts(Array.isArray(banksRes?.data) ? banksRes.data : [])
    } finally {
      setLoading(false)
    }
  }, [token, search, customerStatus, customerDateFrom, customerDateTo, customerShipmentId, vendorStatus, vendorDateFrom, vendorDateTo, vendorId])

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
    setPayment((prev) => ({
      ...prev,
      link_type: ctx.link_type || 'invoice',
      invoice_id: ctx.invoice_id ? String(ctx.invoice_id) : '',
      shipment_id: ctx.shipment_id ? String(ctx.shipment_id) : '',
      client_id: ctx.client_id ? String(ctx.client_id) : '',
      vendor_id: ctx.vendor_id ? String(ctx.vendor_id) : '',
      currency_code: ctx.currency_code || prev.currency_code || 'USD',
    }))
  }

  const submitPayment = async () => {
    if (!token) return
    const amount = Number(payment.amount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const isPartner = payment.link_type === 'partner' || payment.link_type === 'shipment_partner'
    const body = {
      type: isPartner ? 'vendor_payment' : 'client_receipt',
      amount,
      currency_code: payment.currency_code,
      method: payment.method,
      source_account_id: payment.source_account_id ? Number(payment.source_account_id) : null,
      paid_at: payment.paid_at,
      invoice_id: payment.invoice_id ? Number(payment.invoice_id) : null,
      shipment_id: payment.shipment_id ? Number(payment.shipment_id) : null,
      client_id: payment.client_id ? Number(payment.client_id) : null,
      vendor_id: payment.vendor_id ? Number(payment.vendor_id) : null,
    }
    setPaymentBusy(true)
    try {
      await recordPayment(token, body)
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
        acc.receivables += sumMap(row.total_invoices_value)
        acc.paid += sumMap(row.paid_amount)
        acc.outstanding += sumMap(row.remaining_balance)
        acc.unpaid += Number(row.invoice_status_counts?.unpaid || 0)
        return acc
      },
      { receivables: 0, paid: 0, outstanding: 0, unpaid: 0 }
    )
    return totals
  }, [customers])

  const partnerSummary = useMemo(() => {
    const totals = partners.reduce(
      (acc, row) => {
        acc.payable += sumMap(row.total_billed_amount)
        acc.paid += sumMap(row.total_paid_amount)
        acc.remaining += sumMap(row.remaining_balance)
        acc.shipments += Number(row.linked_shipments_count || 0)
        return acc
      },
      { payable: 0, paid: 0, remaining: 0, shipments: 0 }
    )
    return totals
  }, [partners])

  return (
    <Container size="xl">
      <div className="clients-page accountings-page">
        <div className="invoices-tabs-wrap mb-4">
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'customers', label: t('accountings.customerStatement', 'Customer Statement') },
              { id: 'partners', label: t('accountings.vendorStatements', 'Vendor Statements') },
            ]}
          />
        </div>

        {loading ? <LoaderDots /> : null}

        {activeTab === 'customers' && (
          <div className="accountings-table-section">
            <div className="clients-stats-grid accountings-stats-grid">
              <div className="stats-card">
                <h4>{t('accountings.totalCustomerReceivables', 'Total customer receivables')}</h4>
                <p>{customerSummary.receivables.toFixed(2)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.totalPaidByCustomers', 'Total paid by customers')}</h4>
                <p>{customerSummary.paid.toFixed(2)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.totalOutstandingBalance', 'Total outstanding balance')}</h4>
                <p>{customerSummary.outstanding.toFixed(2)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.unpaidInvoicesCount', 'Number of unpaid invoices')}</h4>
                <p>{customerSummary.unpaid}</p>
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
                    placeholder={t('accountings.customerInvoiceSearch', 'Search by invoice # or customer...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select className="clients-input min-w-[140px]" value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value)}>
                  <option value="">{t('accountings.allStatuses', 'All statuses')}</option>
                  <option value="paid">{t('invoices.status.paid', 'Paid')}</option>
                  <option value="partial">{t('invoices.status.partial', 'Partially Paid')}</option>
                  <option value="unpaid">{t('invoices.status.unpaid', 'Unpaid')}</option>
                </select>
                <input type="date" className="clients-input min-w-[140px]" value={customerDateFrom} onChange={(e) => setCustomerDateFrom(e.target.value)} />
                <input type="date" className="clients-input min-w-[140px]" value={customerDateTo} onChange={(e) => setCustomerDateTo(e.target.value)} />
                <input
                  type="number"
                  className="clients-input min-w-[140px]"
                  placeholder={t('accountings.shipmentOptional', 'Shipment ID (optional)')}
                  value={customerShipmentId}
                  onChange={(e) => setCustomerShipmentId(e.target.value)}
                />
              </div>
            </div>
            <div className="accountings-table-wrap">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.colClient', 'Customer')}</th>
                    <th>{t('accountings.totalBilledAmount', 'Total amount')}</th>
                    <th>{t('accountings.totalPaidAmount', 'Paid amount')}</th>
                    <th>{t('accountings.remainingBalance', 'Remaining amount')}</th>
                    <th>{t('accountings.unpaidInvoicesCount', 'Unpaid invoices')}</th>
                    <th>{t('accountings.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((row) => (
                    <tr key={row.customer_id}>
                      <td>{row.customer_name}</td>
                      <td>{mapToInline(row.total_invoices_value)}</td>
                      <td>{mapToInline(row.paid_amount)}</td>
                      <td>{mapToInline(row.remaining_balance)}</td>
                      <td>{Number(row.invoice_status_counts?.unpaid || 0)}</td>
                      <td>
                        <button type="button" className="accountings-btn accountings-btn--small mr-2" onClick={() => openCustomerDetail(row.customer_id)}>
                          <FileSpreadsheet className="inline h-3.5 w-3.5" /> {t('accountings.ledger', 'Statement')}
                        </button>
                        <button
                          type="button"
                          className="accountings-btn accountings-btn--small"
                          onClick={() => openPayment({ link_type: 'customer', client_id: row.customer_id })}
                        >
                          <DollarSign className="inline h-3.5 w-3.5" /> {t('accountings.recordPayment', 'Record Payment')}
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

        {activeTab === 'partners' && (
          <div className="accountings-table-section">
            <div className="clients-filters-card mb-3">
              <div className="clients-filters__row clients-filters__row--main">
                <div className="clients-filters__search-wrap">
                  <Search className="clients-filters__search-icon" />
                  <input
                    type="search"
                    className="clients-input clients-filters__search"
                    placeholder={t('accountings.vendorBillSearch', 'Search by bill # or vendor...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select className="clients-input min-w-[150px]" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">{t('accountings.allVendors', 'All vendors')}</option>
                  {partners.map((p) => (
                    <option key={p.partner_id} value={p.partner_id}>{p.partner_name}</option>
                  ))}
                </select>
                <select className="clients-input min-w-[140px]" value={vendorStatus} onChange={(e) => setVendorStatus(e.target.value)}>
                  <option value="">{t('accountings.allStatuses', 'All statuses')}</option>
                  <option value="paid">{t('invoices.status.paid', 'Paid')}</option>
                  <option value="partially_paid">{t('invoices.status.partial', 'Partially Paid')}</option>
                  <option value="unpaid">{t('invoices.status.unpaid', 'Unpaid')}</option>
                </select>
                <input type="date" className="clients-input min-w-[140px]" value={vendorDateFrom} onChange={(e) => setVendorDateFrom(e.target.value)} />
                <input type="date" className="clients-input min-w-[140px]" value={vendorDateTo} onChange={(e) => setVendorDateTo(e.target.value)} />
              </div>
            </div>
            <div className="clients-stats-grid accountings-stats-grid">
              <div className="stats-card">
                <h4>{t('accountings.totalPayableToPartners', 'Total payable to partners')}</h4>
                <p>{partnerSummary.payable.toFixed(2)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.totalPaid', 'Total paid')}</h4>
                <p>{partnerSummary.paid.toFixed(2)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.remainingBalance', 'Remaining balance')}</h4>
                <p>{partnerSummary.remaining.toFixed(2)}</p>
              </div>
              <div className="stats-card">
                <h4>{t('accountings.linkedShipmentsCount', 'Number of linked shipments')}</h4>
                <p>{partnerSummary.shipments}</p>
              </div>
            </div>
            <div className="accountings-table-wrap mt-3">
              <table className="accountings-table">
                <thead>
                  <tr>
                    <th>{t('accountings.colPartner', 'Vendor name')}</th>
                    <th>{t('accountings.colType', 'Vendor type')}</th>
                    <th>{t('accountings.colTotalDue', 'Total due')}</th>
                    <th>{t('accountings.totalPaidAmount', 'Paid amount')}</th>
                    <th>{t('accountings.remainingBalance', 'Remaining balance')}</th>
                    <th>{t('accountings.linkedShipmentsCount', 'Linked shipments')}</th>
                    <th>{t('accountings.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((row) => (
                    <tr key={row.partner_id}>
                      <td>{row.partner_name}</td>
                      <td>{row.category || '—'}</td>
                      <td>{mapToInline(row.total_billed_amount)}</td>
                      <td>{mapToInline(row.total_paid_amount)}</td>
                      <td>{mapToInline(row.remaining_balance)}</td>
                      <td>{row.linked_shipments_count || 0}</td>
                      <td>
                        <button type="button" className="accountings-btn accountings-btn--small mr-2" onClick={() => openPartnerDetail(row.partner_id)}>
                          <FileSpreadsheet className="inline h-3.5 w-3.5" /> {t('accountings.ledger', 'Statement')}
                        </button>
                        <button
                          type="button"
                          className="accountings-btn accountings-btn--small"
                          onClick={() => openPayment({ link_type: 'partner', vendor_id: row.partner_id })}
                        >
                          <DollarSign className="inline h-3.5 w-3.5" /> {t('accountings.recordPayment', 'Record Payment')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {customerDetail && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setCustomerDetail(null)} />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="flex items-start justify-between gap-3">
                <h2>{customerDetail.customer_name}</h2>
                <button type="button" className="accountings-btn accountings-btn--small p-2" onClick={() => setCustomerDetail(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="accountings-table-wrap mt-3">
                <table className="accountings-table">
                  <thead>
                    <tr>
                      <th>{t('accountings.invoice', 'Invoice')}</th>
                      <th>{t('accountings.shipment', 'Shipment reference')}</th>
                      <th>{t('accountings.issueDate', 'Issue date')}</th>
                      <th>{t('accountings.totalBilledAmount', 'Total')}</th>
                      <th>{t('accountings.totalPaidAmount', 'Paid')}</th>
                      <th>{t('accountings.remainingBalance', 'Remaining')}</th>
                      <th>{t('accountings.status', 'Status')}</th>
                      <th>{t('accountings.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customerDetail.invoices || []).map((inv) => (
                      <tr key={inv.invoice_id}>
                        <td>{inv.invoice_reference}</td>
                        <td>{inv.shipment_reference || '—'}</td>
                        <td>{inv.issue_date || '—'}</td>
                        <td>{mapToInline(inv.total_amount)}</td>
                        <td>{mapToInline(inv.paid_amount)}</td>
                        <td>{mapToInline(inv.remaining_amount)}</td>
                        <td>{inv.status}</td>
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small"
                            onClick={() => openPayment({ link_type: 'invoice', invoice_id: inv.invoice_id, shipment_id: inv.shipment_id })}
                          >
                            {t('accountings.recordPayment', 'Record Payment')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                {(customerDetail.invoices || []).map((inv) => (
                  <details key={`details-${inv.invoice_id}`} className="mb-2">
                    <summary className="font-semibold cursor-pointer">
                      {inv.invoice_reference} - {t('accountings.details', 'Details')}
                    </summary>
                    <div className="mt-2 text-sm">
                      <div><strong>{t('accountings.sections', 'Sections / Items')}:</strong></div>
                      <ul>
                        {(inv.line_items || []).map((it) => (
                          <li key={it.id}>{it.section_key || 'other'} - {it.description} ({it.currency_code} {Number(it.line_total || 0).toFixed(2)})</li>
                        ))}
                      </ul>
                      <div><strong>{t('accountings.attachments', 'Attachments')}:</strong> {(inv.attachments || []).map((a) => a.name).join(', ') || '—'}</div>
                      <div><strong>{t('accountings.paymentHistory', 'Payment history')}:</strong></div>
                      <ul>
                        {(inv.payment_history || []).map((p) => (
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

        {partnerDetail && (
          <div className="accountings-modal" role="dialog" aria-modal="true">
            <button type="button" className="accountings-modal-backdrop" onClick={() => setPartnerDetail(null)} />
            <div className="accountings-modal-content accountings-modal-content--wide">
              <div className="flex items-start justify-between gap-3">
                <h2>{partnerDetail.partner_name}</h2>
                <button type="button" className="accountings-btn accountings-btn--small p-2" onClick={() => setPartnerDetail(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="accountings-table-wrap mt-3">
                <table className="accountings-table">
                  <thead>
                    <tr>
                      <th>{t('accountings.invoice', 'Invoice')}</th>
                      <th>{t('accountings.shipment', 'Shipment')}</th>
                      <th>{t('accountings.totalBilledAmount', 'Total due')}</th>
                      <th>{t('accountings.totalPaidAmount', 'Paid')}</th>
                      <th>{t('accountings.status', 'Status')}</th>
                      <th>{t('accountings.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(partnerDetail.rows || []).map((row) => (
                      <tr key={row.invoice_reference}>
                        <td>{row.invoice_reference}</td>
                        <td>{row.shipment_reference || '—'}</td>
                        <td>{mapToInline(row.currency_breakdown)}</td>
                        <td>{mapToInline(row.paid_amount)}</td>
                        <td>{row.status}</td>
                        <td>
                          <button
                            type="button"
                            className="accountings-btn accountings-btn--small"
                            onClick={() => openPayment({ link_type: 'shipment_partner', shipment_id: row.shipment_id, vendor_id: partnerDetail.partner_id })}
                          >
                            {t('accountings.recordPayment', 'Record Payment')}
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
