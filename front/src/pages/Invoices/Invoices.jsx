import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Plus, Download } from 'lucide-react'
import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs'
import InvoiceSummary from './components/InvoiceSummary'
import InvoicesTable from './components/InvoicesTable'
import CreateInvoiceModal from './components/CreateInvoiceModal'
import { getStoredToken } from '../Login'
import { exportInvoicesCsv } from '../../api/invoices'

export default function Invoices() {
  const { t } = useTranslation()
  const { user, permissions = [] } = useOutletContext() || {}
  const isAdminRole = (user?.primary_role ?? user?.roles?.[0] ?? '').toString().toLowerCase() === 'admin'
  const canViewInvoices =
    isAdminRole ||
    (Array.isArray(permissions) &&
      (permissions.includes('financial.view') || permissions.includes('accounting.view')))
  const canManageInvoices =
    isAdminRole ||
    (Array.isArray(permissions) &&
      (permissions.includes('financial.manage') || permissions.includes('accounting.manage')))

  const [activeTab, setActiveTab] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [tableFilters, setTableFilters] = useState({
    search: '',
    status: '',
    currencyId: '',
    month: '',
    sort: 'date',
  })

  const onFiltersChange = useCallback((f) => {
    setTableFilters(f)
  }, [])

  const tabs = useMemo(
    () => [
      { id: 'all', label: t('invoices.tabs.all', 'All') },
      { id: 'client', label: t('invoices.tabs.client', 'Client Invoices') },
      { id: 'partner', label: t('invoices.tabs.partner', 'Partner Invoices') },
    ],
    [t]
  )

  useEffect(() => {
    // no-op placeholder for future: sync tab with URL search param
  }, [activeTab])

  const invoiceType = activeTab === 'partner' ? 'partner' : activeTab === 'client' ? 'client' : ''

  const handleExportCsv = async () => {
    const token = getStoredToken()
    if (!token) return
    setExportBusy(true)
    try {
      await exportInvoicesCsv(token, {
        invoice_type: invoiceType || undefined,
        search: tableFilters.search || undefined,
        status: tableFilters.status || undefined,
        currency_id: tableFilters.currencyId || undefined,
        month: tableFilters.month || undefined,
      })
    } catch (e) {
      window.alert(t('invoices.exportError', { defaultValue: e?.message || 'Export failed.' }))
    } finally {
      setExportBusy(false)
    }
  }

  if (!canViewInvoices) {
    return (
      <Container size="xl" className="invoices-page py-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('invoices.noPermission')}</p>
      </Container>
    )
  }

  return (
    <Container size="xl" className="invoices-page py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('invoices.title', 'Invoices')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('invoices.subtitle', 'Manage invoices, payments, and exports')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={exportBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4" />
            {t('common.export', 'Export')}
          </button>
          {canManageInvoices && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t('invoices.create', 'Create Invoice')}
            </button>
          )}
        </div>
      </header>

      <InvoiceSummary refreshKey={refreshKey} />

      <div className="mt-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
        <InvoicesTable
          refreshKey={refreshKey}
          invoiceType={invoiceType}
          onChanged={() => setRefreshKey((k) => k + 1)}
          onFiltersChange={onFiltersChange}
          canManage={canManageInvoices}
        />
      </div>

      <CreateInvoiceModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false)
          setRefreshKey((k) => k + 1)
        }}
      />
    </Container>
  )
}

