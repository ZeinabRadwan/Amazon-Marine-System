import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, FileText, Plus, FileSpreadsheet, Printer } from 'lucide-react'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import Tabs from '../../components/Tabs'
import '../Clients/Clients.css'
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

  const onExportExcel = () => {
    window.alert(t('pricing.exportExcelSoon', 'Export to Excel will be available in a future update.'))
  }

  const onExportPdf = () => {
    window.alert(t('pricing.exportPdfSoon', 'Export to PDF will be available in a future update.'))
  }

  const PRICING_TABS = [
    { id: 'rates', label: t('pricing.rateSheet', 'Rate Sheet'), icon: <Table className="h-4 w-4" /> },
    { id: 'quotes', label: t('pricing.quotations', 'Quotations'), icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <Container size="xl">
      <div className="clients-page pricing-page py-6">
        <div className="clients-filters-card pricing-toolbar">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__fields min-w-0">
              <Tabs className="pricing-tabs-wrap" tabs={PRICING_TABS} activeTab={activeTab} onChange={setActiveTab} />
            </div>
            <div className="clients-filters__actions">
              <button type="button" className="page-header__btn page-header__btn--primary" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                {activeTab === 'rates' ? t('pricing.addRate', 'Add Rate') : t('pricing.createQuote', 'Create Quote')}
              </button>
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={onExportExcel}
                aria-label={t('common.exportExcel', 'Export to Excel')}
                title={t('common.exportExcel', 'Export to Excel')}
              >
                <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
              <button
                type="button"
                className="clients-filters__btn-icon"
                onClick={onExportPdf}
                aria-label={t('common.exportPdf', 'Export to PDF')}
                title={t('common.exportPdf', 'Export to PDF')}
              >
                <Printer className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <main className="pricing-content">
          {activeTab === 'rates' ? (
            <RateSheet refreshKey={refreshKey} onEdit={(offer) => setModalConfig({ isOpen: true, offer })} />
          ) : (
            <QuotationTable refreshKey={refreshKey} openCreateSignal={quoteCreateSignal} onCreateClosed={() => {}} />
          )}
        </main>

        <OfferFormModal
          isOpen={modalConfig.isOpen}
          offerToEdit={modalConfig.offer}
          onClose={() => setModalConfig({ isOpen: false, offer: null })}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </Container>
  )
}
