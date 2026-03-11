import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Globe, BellRing, ChevronDown } from 'lucide-react'
import { setLanguage } from '../../i18n'
import ThemeToggle from '../ThemeToggle'
import { DropdownMenu } from '../DropdownMenu'

const NAVBAR_HEIGHT = 64
const SEARCH_WIDTH = 320

/**
 * Reusable Navbar for Amazon Marine dashboard. Works with the existing left sidebar layout.
 * Order (left to right): Global Search → Mode Toggle → Localization → Notifications → Profile.
 * Light: #FFFFFF bg, #E6EAF2 border. Dark: #111827 bg, #1F2937 border.
 */
export default function Navbar({
  user = {},
  onLogout,
  alertsCount = 0,
  className = '',
}) {
  const { t, i18n } = useTranslation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLangLabel = i18n.language === 'ar' ? t('common.arabic') : t('common.english')

  const navBarClasses =
    'sticky top-0 z-50 flex h-16 w-full shrink-0 items-center gap-4 px-6 transition-colors duration-200'
  const lightBar = 'border-b bg-white'
  const lightBorder = 'border-[#E6EAF2]'
  const darkBar = 'dark:bg-[#111827] dark:border-[#1F2937]'
  const borderClass = `border-b ${lightBorder} ${darkBar}`

  return (
    <header
      className={`${navBarClasses} ${lightBar} ${borderClass} ${className}`}
      style={{ minHeight: NAVBAR_HEIGHT, maxHeight: NAVBAR_HEIGHT }}
      role="banner"
    >
      {/* 1. Global Search – left, 320px, rounded 10px, icon left */}
      <div className="hidden shrink-0 md:block" style={{ width: SEARCH_WIDTH }}>
        <div className="flex items-center gap-2 rounded-[10px] bg-gray-100 px-3 py-2.5 transition-colors dark:bg-[#1F2937]">
          <Search
            className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder={t('topNav.searchPlaceholder')}
            className="w-full min-w-0 border-0 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none dark:text-gray-100 dark:placeholder-gray-400"
            aria-label={t('topNav.searchPlaceholder')}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* 1. Notifications – first, same style as mode toggle */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="nav-btn relative"
            aria-expanded={notifOpen}
            aria-haspopup="true"
            aria-label={t('topNav.notifications')}
          >
            <BellRing className="shrink-0" aria-hidden />
            {alertsCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                aria-hidden
              >
                {alertsCount > 99 ? '99+' : alertsCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-[320px] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[#1F2937] dark:bg-[#1F2937]"
              role="dialog"
              aria-label={t('topNav.recentNotifications')}
            >
              <div className="border-b border-gray-100 px-4 py-3 dark:border-[#374151]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('topNav.recentNotifications')}
                </h3>
              </div>
              <div className="max-h-[280px] overflow-y-auto p-2">
                {alertsCount === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('topNav.noNotifications')}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {Array.from({ length: Math.min(alertsCount, 5) }, (_, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#374151]"
                        >
                          <span className="font-medium">
                            {t('topNav.notifications')} #{i + 1}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Dark / Light Mode Toggle – same as Clients.jsx */}
        <ThemeToggle className="theme-toggle-app" />

        {/* 3. Localization – DropdownMenu */}
        <DropdownMenu
          align="end"
          trigger={({ isOpen, getTriggerProps }) => (
            <button
              type="button"
              {...getTriggerProps()}
              className="nav-btn nav-btn--with-label"
              aria-label={t('common.language')}
            >
              <Globe className="shrink-0" aria-hidden />
              <span className="hidden text-sm font-medium sm:inline">{currentLangLabel}</span>
              <ChevronDown
                className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          )}
          items={[
            {
              label: t('common.english'),
              onClick: () => setLanguage('en'),
              selected: i18n.language === 'en',
            },
            {
              label: t('common.arabic'),
              onClick: () => setLanguage('ar'),
              selected: i18n.language === 'ar',
            },
          ]}
        />
      </div>
    </header>
  )
}
