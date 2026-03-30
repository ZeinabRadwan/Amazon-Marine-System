import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getResolvedTheme } from '../../theme'
import HeaderActions from '../HeaderActions'
import {
  DashboardIcon,
  ContactsIcon,
  SettingsIcon,
  LogoutIcon,
  ShipmentsIcon,
  DocumentIcon,
  InvoiceIcon,
  WalletIcon,
  PriceTagIcon,
  ReportsIcon,
  FileTextIcon,
  HeadsetIcon,
  ClockIcon,
  ClipboardIcon,
  UsersIcon,
  ShieldIcon,
} from './SidebarIcons'
import logoDark from '../../assets/logo_darkmode.png'
import './Sidebar.css'

const SIDEBAR_SECTIONS = [
  {
    sectionKey: 'main',
    items: [
      { id: 'dashboard', menuKey: 'dashboard', Icon: DashboardIcon },
    ],
  },
  {
    sectionKey: 'clients',
    items: [
      { id: 'clientsCrm', menuKey: 'clientsCrm', Icon: ContactsIcon, badge: 'crm' },
      // { id: 'clientLookups', menuKey: 'clientLookups', Icon: ClipboardIcon },
    ],
  },
  {
    sectionKey: 'operations',
    items: [
      { id: 'shipments', menuKey: 'shipments', Icon: ShipmentsIcon, badge: 'shipments' },
      { id: 'sdForms', menuKey: 'sdForms', Icon: DocumentIcon, badge: 'sdForms' },
    ],
  },
  {
    sectionKey: 'financial',
    items: [
      { id: 'invoices', menuKey: 'invoices', Icon: InvoiceIcon },
      { id: 'accounts', menuKey: 'accounts', Icon: WalletIcon },
      { id: 'treasury', menuKey: 'treasury', Icon: WalletIcon },
      { id: 'expenses', menuKey: 'expenses', Icon: InvoiceIcon },
      { id: 'pricing', menuKey: 'pricing', Icon: PriceTagIcon },
    ],
  },
  {
    sectionKey: 'management',
    items: [
      { id: 'partners', menuKey: 'partners', Icon: ContactsIcon },
      { id: 'reports', menuKey: 'reports', Icon: ReportsIcon, badge: 'alerts' },
      { id: 'officialDocuments', menuKey: 'officialDocuments', Icon: FileTextIcon },
    ],
  },
  {
    sectionKey: 'customerService',
    items: [
      { id: 'customerService', menuKey: 'customerService', Icon: HeadsetIcon },
    ],
  },
  {
    sectionKey: 'hr',
    items: [
      { id: 'attendance', menuKey: 'attendance', Icon: ClockIcon },
      { id: 'visitLog', menuKey: 'visitLog', Icon: ClipboardIcon },
    ],
  },
  {
    sectionKey: 'system',
    items: [
      { id: 'users', menuKey: 'users', Icon: UsersIcon },
      // { id: 'usersPermissions', menuKey: 'usersPermissions', Icon: UsersIcon },
      { id: 'rolesPermissions', menuKey: 'rolesPermissions', Icon: ShieldIcon },
      { id: 'settings', menuKey: 'settings', Icon: SettingsIcon },
    ],
  },
]

const SIDEBAR_ID_TO_PAGE_KEY = {
  dashboard: 'dashboard',
  clientsCrm: 'clients',
  shipments: 'shipments',
  sdForms: 'sd_forms',
  invoices: 'invoices',
  accounts: 'accounting',
  treasury: 'treasury',
  expenses: 'expenses',
  pricing: 'pricing',
  partners: 'partners',
  reports: 'reports',
  officialDocuments: 'official_documents',
  customerService: 'customer_service',
  attendance: 'attendance',
  visitLog: 'visits',
  users: 'users',
  rolesPermissions: 'roles_permissions',
  settings: 'settings',
}

const DEFAULT_AVATAR_URL = 'https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg'

const DEFAULT_USER = {
  name: 'User',
  email: 'user@example.com',
  avatarUrl: DEFAULT_AVATAR_URL,
}

const BADGE_CONFIG = {
  crm: { class: 'sidebar-badge--green', countKey: 'crmCount' },
  shipments: { class: 'sidebar-badge--yellow', countKey: 'shipmentsCount' },
  sdForms: { class: 'sidebar-badge--orange', countKey: 'sdFormsCount' },
  alerts: { class: 'sidebar-badge--green', countKey: 'alertsCount' },
}

export default function Sidebar({
  appName = 'Marketerz',
  activeMenu = 'dashboard',
  onMenuChange,
  allowedPages,
  crmCount = 0,
  ticketsCount = 0,
  alertsCount = 0,
  shipmentsCount = 0,
  sdFormsCount = 0,
  user = DEFAULT_USER,
  expanded: controlledExpanded,
  onToggleExpand,
  onLogout,
  className = '',
}) {
  const badgeCounts = { crmCount, ticketsCount, alertsCount, shipmentsCount, sdFormsCount }
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [theme, setTheme] = useState(() => getResolvedTheme())
  const [internalExpanded, setInternalExpanded] = useState(true)
  const isControlled = controlledExpanded !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded
  const allowedPagesSet = useMemo(() => {
    if (!Array.isArray(allowedPages)) return null
    return new Set(allowedPages.filter(Boolean).map((p) => String(p)))
  }, [allowedPages])

  useEffect(() => {
    const onThemeChange = (e) => setTheme(e.detail ?? getResolvedTheme())
    window.addEventListener('themechange', onThemeChange)
    return () => window.removeEventListener('themechange', onThemeChange)
  }, [])

  const handleToggle = () => {
    if (onToggleExpand) onToggleExpand(!expanded)
    if (!isControlled) setInternalExpanded((e) => !e)
  }

  return (
    <aside
      className={`sidebar ${expanded ? 'sidebar--expanded' : 'sidebar--collapsed'} ${isRtl ? 'sidebar--rtl' : 'sidebar--ltr'} ${theme === 'dark' ? 'sidebar--dark' : ''} ${className}`.trim()}
      aria-expanded={expanded}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="sidebar-inner">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={handleToggle}
          aria-label={expanded ? t('sidebar.collapse') : t('sidebar.expand')}
        >
          <span className="sidebar-toggle-dot sidebar-toggle-dot--orange" />
          <span className="sidebar-toggle-dot sidebar-toggle-dot--yellow" />
          <span className="sidebar-toggle-dot sidebar-toggle-dot--green" />
        </button>

        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src={logoDark} alt="" className="sidebar-logo-img" />
            {expanded && (
              <span className="sidebar-app-name">
                {appName}
              </span>
            )}
          </Link>
        </div>

        {/* Notifications, theme toggle, language – visible on mobile only (hidden on desktop) */}
        <HeaderActions
          variant="sidebar"
          className="sidebar-mobile-actions"
          alertsCount={alertsCount}
        />

        <nav className="sidebar-nav" aria-label="Main navigation">
          {SIDEBAR_SECTIONS.map(({ sectionKey, items }) => {
            const filteredItems = allowedPagesSet
              ? items.filter(({ id }) => {
                  const pageKey = SIDEBAR_ID_TO_PAGE_KEY[id]
                  if (!pageKey) return true
                  return allowedPagesSet.has(pageKey)
                })
              : items
            if (!filteredItems.length) return null

            return (
            <div key={sectionKey} className="sidebar-section">
              <span className="sidebar-section-title">
                {expanded ? t(`sidebar.sections.${sectionKey}`) : ''}
              </span>
              <ul className="sidebar-menu">
                {/* eslint-disable-next-line no-unused-vars -- Icon used as <Icon /> in JSX */}
                {filteredItems.map(({ id, menuKey, Icon, badge }) => (
                  <li key={id}>
                    <button
                      type="button"
                      className={`sidebar-item ${activeMenu === id ? 'sidebar-item--active' : ''}`}
                      onClick={() => onMenuChange?.(id)}
                      title={!expanded ? t(`sidebar.menu.${menuKey}`) : undefined}
                    >
                      <span className="sidebar-item-icon-wrap">
                        <Icon />
                      </span>
                      {badge && BADGE_CONFIG[badge] && (() => {
                        const config = BADGE_CONFIG[badge]
                        const count = badgeCounts[config.countKey] ?? 0
                        if (count <= 0) return null
                        return (
                          <span className={`sidebar-badge ${config.class}`}>
                            {count > 99 ? '99+' : count}
                          </span>
                        )
                      })()}
                      {expanded && (
                        <span className="sidebar-item-label">{t(`sidebar.menu.${menuKey}`)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )})}
        </nav>

        <div className="sidebar-footer-wrap">
          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-user"
              onClick={() => onMenuChange?.('profile')}
              aria-label={t('sidebar.menu.profile')}
              title={t('sidebar.menu.profile')}
            >
              <div className="sidebar-avatar">
                {(user.avatarUrl || DEFAULT_AVATAR_URL) ? (
                  <img src={user.avatarUrl || DEFAULT_AVATAR_URL} alt="" />
                ) : (
                  <span className="sidebar-avatar-placeholder">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {expanded && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.name}</span>
                  <span className="sidebar-user-email">{user.email}</span>
                </div>
              )}
            </button>
            <button
              type="button"
              className="sidebar-more"
              aria-label={t('sidebar.logOut')}
              title={t('sidebar.logOut')}
              onClick={() => onLogout?.()}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
