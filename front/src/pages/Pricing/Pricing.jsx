import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Ship, Truck, Table, FileText, Search, Plus, Filter, Download } from 'lucide-react'
import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs'
import { DropdownMenu } from '../../components/DropdownMenu'
import RateSheet from './components/RateSheet'
import QuotationTable from './components/QuotationTable'
import OfferFormModal from './components/OfferFormModal'
import './Pricing.css'

export default function Pricing() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('rates')
  const [modalConfig, setModalConfig] = useState({ isOpen: false, offer: null })
  const [quoteCreateSignal, setQuoteCreateSignal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddClick = () => {
    if (activeTab === 'rates') {
      setModalConfig({ isOpen: true, offer: null })
    } else {
      setQuoteCreateSignal((n) => n + 1)
    }
  }

  const PRICING_TABS = [
    { id: 'rates', label: t('pricing.rateSheet', 'Rate Sheet'), icon: <Table className="h-4 w-4" /> },
    { id: 'quotes', label: t('pricing.quotations', 'Quotations'), icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <Container size="xl" className="pricing-page py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pricing.title', 'Pricing')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('pricing.subtitle', 'Manage shipping rates and customer quotations')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddClick}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            <Plus className="h-4 w-4" />
            {activeTab === 'rates' ? t('pricing.addRate', 'Add Rate') : t('pricing.createQuote', 'Create Quote')}
          </button>
          <DropdownMenu
            align="end"
            trigger={
              <button className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                <Download className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            }
            items={[
              { label: t('common.exportExcel', 'Export to Excel'), onClick: () => console.log('Export Excel') },
              { label: t('common.exportPdf', 'Export to PDF'), onClick: () => console.log('Export PDF') },
            ]}
          />
        </div>
      </header>

      <Tabs tabs={PRICING_TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      <main className="pricing-content">
        {activeTab === 'rates' ? (
          <RateSheet 
            refreshKey={refreshKey} 
            onEdit={(offer) => setModalConfig({ isOpen: true, offer })} 
          />
        ) : (
          <QuotationTable
            refreshKey={refreshKey}
            openCreateSignal={quoteCreateSignal}
            onCreateClosed={() => {}}
          />
        )}
      </main>

      <OfferFormModal 
        isOpen={modalConfig.isOpen}
        offerToEdit={modalConfig.offer}
        onClose={() => setModalConfig({ isOpen: false, offer: null })}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />
    </Container>
  )
}
