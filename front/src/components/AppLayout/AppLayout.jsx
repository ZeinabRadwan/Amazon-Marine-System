import { useState } from 'react'
import Sidebar from '../Sidebar'
import Navbar from '../Navbar'
import { Footer } from '../Footer'
import './AppLayout.css'

/**
 * AppLayout – main layout wrapper for the dashboard.
 *
 * Structure:
 *   Sidebar | Main content area
 *   Inside main: Navbar → PageHeader (optional) → Page content → Footer
 *
 * Layout: flex, min-height: 100vh.
 */
export default function AppLayout({
  user,
  activeTab = 'personal',
  onTabChange,
  activeMenu = 'dashboard',
  onMenuChange,
  allowedPages,
  crmCount = 0,
  ticketsCount = 0,
  alertsCount = 0,
  shipmentsCount = 0,
  sdFormsCount = 0,
  appName = 'Marketerz',
  onLogout,
  pageTitle = '',
  pageBreadcrumbs = [],
  children,
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const sidebarUser = user || { name: 'User', email: 'user@example.com', avatarUrl: null }

  return (
    <div className="app-layout">
      <Sidebar
        appName={appName}
        activeTab={activeTab}
        onTabChange={onTabChange}
        activeMenu={activeMenu}
        onMenuChange={onMenuChange}
        allowedPages={allowedPages}
        crmCount={crmCount}
        ticketsCount={ticketsCount}
        alertsCount={alertsCount}
        shipmentsCount={shipmentsCount}
        sdFormsCount={sdFormsCount}
        user={sidebarUser}
        expanded={sidebarExpanded}
        onToggleExpand={setSidebarExpanded}
        onLogout={onLogout}
      />
      <main className="app-layout-main">
        <Navbar
          user={sidebarUser}
          onLogout={onLogout}
          alertsCount={alertsCount}
          pageTitle={pageTitle}
          pageBreadcrumbs={pageBreadcrumbs}
          sidebarCollapsed={!sidebarExpanded}
          onOpenSidebar={() => setSidebarExpanded(true)}
        />
        <div className="app-layout-content">
          <div className="app-layout-page">{children}</div>
          <Footer />
        </div>
      </main>
    </div>
  )
}
