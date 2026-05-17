import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, FileText } from 'lucide-react'
import { Container } from '../../components/Container'
import Tabs from '../../components/Tabs'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import '../../components/Tabs/Tabs.css'
import '../Clients/Clients.css'
import '../Invoices/Invoices.css'
import RateSheet from './components/RateSheet'
import QuotationTable from './components/QuotationTable'
import OfferFormModal from './components/OfferFormModal'
import PricingToastHost from './components/PricingToastHost'
import './Pricing.css'
import '../Accountings/CurrencyMapBadges.css'

export default function Pricing() {
  const { t } = useTranslation()
  const { isPricingRole, isAdminRole, canManagePricingOffers } = useAuthAccess()
  const hideQuotationsTab = isPricingRole && !isAdminRole
  const [activeTab, setActiveTab] = useState('rates')
  const [modalConfig, setModalConfig] = useState({ isOpen: false, offer: null, pricingMode: 'sea' })
  const [refreshKey, setRefreshKey] = useState(0)

  const pricingTabs = useMemo(() => {
    const all = [
      { id: 'rates', label: t('pricing.priceSheets'), icon: <Table className="h-4 w-4" /> },
      { id: 'quotes', label: t('pricing.quotations', 'Quotations'), icon: <FileText className="h-4 w-4" /> },
    ]
    if (hideQuotationsTab) return all.filter((tab) => tab.id !== 'quotes')
    return all
  }, [t, hideQuotationsTab])

  const effectiveTab = hideQuotationsTab && activeTab === 'quotes' ? 'rates' : activeTab

  return (
    <Container size="xl">
      <div className="clients-page pricing-page py-6">
        {pricingTabs.length > 1 ? (
          <div className="invoices-tabs-section">
            <div className="invoices-tabs-wrap">
              <Tabs tabs={pricingTabs} activeTab={effectiveTab} onChange={setActiveTab} />
            </div>
          </div>
        ) : null}

        <main className="pricing-content">
          {effectiveTab === 'rates' ? (
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

        {canManagePricingOffers ? (
          <OfferFormModal
            isOpen={modalConfig.isOpen}
            offerToEdit={modalConfig.offer}
            pricingMode={modalConfig.pricingMode}
            onClose={() => setModalConfig({ isOpen: false, offer: null, pricingMode: 'sea' })}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        ) : null}

        <PricingToastHost />
      </div>
    </Container>
  )
}
