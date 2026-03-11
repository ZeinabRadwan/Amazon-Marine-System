import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Package, Users as UsersIcon, DollarSign, ChevronDown, Download, Filter, RefreshCw } from 'lucide-react'
import Login from './pages/Login'
import AuthenticatedLayout from './components/AuthenticatedLayout'
import { PageHeader } from './components/PageHeader'
import { Container } from './components/Container'
import { StatsCard } from './components/StatsCard'
import { DropdownMenu } from './components/DropdownMenu'
import Tabs from './components/Tabs'
import Profile from './pages/Profile'
import Users from './pages/Users'
import RolesPermissions from './pages/RolesPermissions'
import Clients from './pages/Clients'
import ClientLookups from './pages/ClientLookups'
import './App.css'

function SignupPlaceholder() {
  const { t } = useTranslation()
  return (
    <Container size="lg">
      <div className="home-page">{t('signup.comingSoon')}</div>
    </Container>
  )
}

const DASHBOARD_TABS = [
  { id: 'clients', label: 'Clients', badge: 2 },
  { id: 'deals', label: 'Deals' },
  { id: 'activity', label: 'Activity' },
]

function Home() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('clients')

  return (
    <Container size="xl" className="home-page">
      <PageHeader
        title={t('pageHeader.dashboard')}
        breadcrumbs={[{ label: t('pageHeader.home') }]}
      />
      <p className="mb-6">{t('home.signedIn')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title={t('statsCard.totalShipments', 'Total Shipments')}
          value={1245}
          icon={<Package className="h-6 w-6" />}
          change={12}
          trend="up"
          variant="blue"
        />
        <StatsCard
          title={t('statsCard.totalClients', 'Total Clients')}
          value={89}
          icon={<UsersIcon className="h-6 w-6" />}
          change={-3}
          trend="down"
          variant="green"
        />
        <StatsCard
          title={t('statsCard.revenue', 'Revenue')}
          value={t('statsCard.revenueValue', '1.2M')}
          icon={<DollarSign className="h-6 w-6" />}
          change={8}
          trend="up"
          variant="amber"
        />
      </div>

      <section className="mt-8" aria-labelledby="dashboard-tabs-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-start">
          <h2 id="dashboard-tabs-heading" className="text-lg font-semibold">
            {t('pageHeader.overview')}
          </h2>
          <DropdownMenu
            align="end"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {t('pageHeader.actions')}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            }
            items={[
              {
                label: t('pageHeader.export'),
                icon: <Download className="h-4 w-4" />,
                onClick: () => console.log('Export'),
              },
              {
                label: t('pageHeader.filter'),
                icon: <Filter className="h-4 w-4" />,
                onClick: () => console.log('Filter'),
              },
              {
                label: t('pageHeader.refresh'),
                icon: <RefreshCw className="h-4 w-4" />,
                onClick: () => window.location.reload(),
              },
            ]}
          />
        </div>
        <Tabs
          tabs={DASHBOARD_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />
        <div
          role="tabpanel"
          id="panel-clients"
          aria-labelledby="tab-clients"
          hidden={activeTab !== 'clients'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <p className="text-gray-600 dark:text-gray-400">
            {t('statsCard.totalClients', 'Total Clients')} content — recent clients and quick actions.
          </p>
        </div>
        <div
          role="tabpanel"
          id="panel-deals"
          aria-labelledby="tab-deals"
          hidden={activeTab !== 'deals'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <p className="text-gray-600 dark:text-gray-400">
            Deals content — pipeline and active negotiations.
          </p>
        </div>
        <div
          role="tabpanel"
          id="panel-activity"
          aria-labelledby="tab-activity"
          hidden={activeTab !== 'activity'}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1F2937] dark:bg-[#1F2937]"
        >
          <p className="text-gray-600 dark:text-gray-400">
            Activity content — recent updates and timeline.
          </p>
        </div>
      </section>
    </Container>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roles-permissions" element={<RolesPermissions />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/client-lookups" element={<ClientLookups />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupPlaceholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
