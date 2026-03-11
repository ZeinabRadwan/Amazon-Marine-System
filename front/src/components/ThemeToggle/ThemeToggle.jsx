import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { initTheme, toggleTheme, getResolvedTheme } from '../../theme'
import { SunIcon, MoonIcon } from '../ThemeIcons'

export default function ThemeToggle({ className = 'theme-toggle-app' }) {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(() => getResolvedTheme())
  useEffect(() => {
    initTheme()
    setTheme(getResolvedTheme())
  }, [])
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        toggleTheme()
        setTheme(getResolvedTheme())
      }}
      title={theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')}
      aria-label={theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
