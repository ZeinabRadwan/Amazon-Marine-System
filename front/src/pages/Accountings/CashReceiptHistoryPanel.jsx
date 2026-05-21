import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileText } from 'lucide-react'
import LoaderDots from '../../components/LoaderDots'
import { listCashReceipts, openCashReceiptPdf } from '../../api/cashReceipts'
import { CurrencyMapBadges } from './CurrencyMapBadges'
import { formatStatementDetailDate } from './accountingsStatementShared'

export default function CashReceiptHistoryPanel({ token, reloadKey = 0, showWhenEmpty = false }) {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await listCashReceipts(token)
      setRows(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  if (loading && rows.length === 0) {
    return (
      <section className="cash-receipt-history mb-4">
        <LoaderDots label={t('common.loading')} />
      </section>
    )
  }

  if (rows.length === 0 && !showWhenEmpty) return null

  return (

      <div className="accountings-table-wrap">
        <table className="accountings-table">
          <thead>
            <tr>
              <th>{t('accountings.cashReceipt.colReceiptNo', 'Receipt no.')}</th>
              <th>{t('accountings.colClient', 'Customer')}</th>
              <th>{t('accountings.colAmount', 'Total')}</th>
              <th>{t('accountings.cashReceipt.colPayments', 'Payments')}</th>
              <th>{t('common.date', 'Date')}</th>
              <th>{t('accountings.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs">{r.receipt_number}</td>
                <td>{r.client_name || '—'}</td>
                <td>
                  <CurrencyMapBadges value={r.totals_by_currency || {}} size="sm" amountFirst />
                </td>
                <td>{r.payment_count ?? '—'}</td>
                <td>{formatStatementDetailDate(r.created_at, i18n.language)}</td>
                <td>
                  {r.has_pdf ? (
                    <button
                      type="button"
                      className="accountings-action-icon-btn"
                      onClick={() => openCashReceiptPdf(token, r.id)}
                      title={t('accountings.cashReceipt.downloadPdf', 'Download PDF')}
                      aria-label={t('accountings.cashReceipt.downloadPdf', 'Download PDF')}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  
  )
}
