import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Download } from 'lucide-react'
import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs'
import InvoiceSummary from './components/InvoiceSummary'
import InvoicesTable from './components/InvoicesTable'
import CreateInvoiceModal from './components/CreateInvoiceModal'

export default function Invoices() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <Download className="h-4 w-4" />
            {t('common.export', 'Export')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t('invoices.create', 'Create Invoice')}
          </button>
        </div>
      </header>

      <InvoiceSummary refreshKey={refreshKey} />

      <div className="mt-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
        <InvoicesTable
          refreshKey={refreshKey}
          invoiceType={invoiceType}
          onChanged={() => setRefreshKey((k) => k + 1)}
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

