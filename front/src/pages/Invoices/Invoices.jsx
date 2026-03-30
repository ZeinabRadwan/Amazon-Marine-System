import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import '../../components/Tabs/Tabs.css'
import '../Clients/Clients.css'
import Tabs from '../../components/Tabs'
import InvoiceSummary from './components/InvoiceSummary'
import InvoicesTable from './components/InvoicesTable'
import CreateInvoiceModal from './components/CreateInvoiceModal'
import { getStoredToken } from '../Login'
import { exportInvoicesCsv } from '../../api/invoices'
import './Invoices.css'

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
    dateFrom: '',
    dateTo: '',
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
    // placeholder: sync tab with URL if needed
  }, [activeTab])

  const invoiceType = activeTab === 'partner' ? 'partner' : activeTab === 'client' ? 'client' : ''

  const handleExportCsv = useCallback(
    async (selectedIdList) => {
      const token = getStoredToken()
      if (!token) return
      setExportBusy(true)
      try {
        const useIds = Array.isArray(selectedIdList) && selectedIdList.length > 0
        await exportInvoicesCsv(
          token,
          useIds
            ? { ids: selectedIdList }
            : {
                invoice_type: invoiceType || undefined,
                search: tableFilters.search || undefined,
                status: tableFilters.status || undefined,
                currency_id: tableFilters.currencyId || undefined,
                issue_date_from: tableFilters.dateFrom || undefined,
                issue_date_to: tableFilters.dateTo || undefined,
              }
        )
      } catch (e) {
        window.alert(t('invoices.exportError', { defaultValue: e?.message || 'Export failed.' }))
      } finally {
        setExportBusy(false)
      }
    },
    [invoiceType, tableFilters, t]
  )

  if (!canViewInvoices) {
    return (
      <Container size="xl">
        <div className="clients-page invoices-page">
          <p className="clients-empty">{t('invoices.noPermission')}</p>
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <div className="clients-page invoices-page">
        <InvoiceSummary refreshKey={refreshKey} />

        <div className="invoices-tabs-section">
          <div className="invoices-tabs-wrap">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>
          <InvoicesTable
            refreshKey={refreshKey}
            invoiceType={invoiceType}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onFiltersChange={onFiltersChange}
            canManage={canManageInvoices}
            exportLoading={exportBusy}
            onExportCsv={handleExportCsv}
            onCreateInvoice={canManageInvoices ? () => setCreateOpen(true) : undefined}
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
      </div>
    </Container>
  )
}
