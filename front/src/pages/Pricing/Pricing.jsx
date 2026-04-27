import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, FileText } from 'lucide-react'
import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs'
import '../Clients/Clients.css'
import RateSheet from './components/RateSheet'
import QuotationTable from './components/QuotationTable'
import OfferFormModal from './components/OfferFormModal'
import './Pricing.css'

export default function Pricing() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('rates')
  const [modalConfig, setModalConfig] = useState({ isOpen: false, offer: null, pricingMode: 'sea' })
  const [refreshKey, setRefreshKey] = useState(0)

  const PRICING_TABS = [
    { id: 'rates', label: t('pricing.priceSheets'), icon: <Table className="h-4 w-4" /> },
    { id: 'quotes', label: t('pricing.quotations', 'Quotations'), icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <Container size="xl">
      <div className="clients-page pricing-page py-6">
        <div className="pricing-main-tabs">
          <Tabs
            className="pricing-tabs-wrap"
            variant="main"
            tabs={PRICING_TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <main className="pricing-content">
          {activeTab === 'rates' ? (
            <RateSheet
              refreshKey={refreshKey}
              onAddOffer={(mode) => setModalConfig({ isOpen: true, offer: null, pricingMode: mode || 'sea' })}
              onEdit={(offer) =>
                setModalConfig({ isOpen: true, offer, pricingMode: offer?.pricing_type || 'sea' })
              }
            />
          ) : (
            <QuotationTable refreshKey={refreshKey} />
          )}
        </main>

        <OfferFormModal
          isOpen={modalConfig.isOpen}
          offerToEdit={modalConfig.offer}
          pricingMode={modalConfig.pricingMode}
          onClose={() => setModalConfig({ isOpen: false, offer: null, pricingMode: 'sea' })}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </Container>
  )
}
