import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '../../i18n'

function ChevronIcon({ open }) {
  return (
    <svg
      className="lang-dropdown-chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function LangDropdown({ className = '' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const currentLabel = i18n.language === 'ar' ? t('common.arabic') : t('common.english')

  return (
    <div
      className={`lang-dropdown ${className}`.trim()}
      ref={ref}
    >
      <button
        type="button"
        className="lang-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('common.language')}
        id="lang-dropdown-trigger"
      >
        <span className="lang-dropdown-label">{currentLabel}</span>
        <ChevronIcon open={open} />
      </button>
      <div
        className="lang-dropdown-menu"
        role="listbox"
        aria-labelledby="lang-dropdown-trigger"
        hidden={!open}
      >
        <button
          type="button"
          role="option"
          aria-selected={i18n.language === 'en'}
          className={`lang-dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
          onClick={() => {
            setLanguage('en')
            setOpen(false)
          }}
        >
          {t('common.english')}
        </button>
        <button
          type="button"
          role="option"
          aria-selected={i18n.language === 'ar'}
          className={`lang-dropdown-item ${i18n.language === 'ar' ? 'active' : ''}`}
          onClick={() => {
            setLanguage('ar')
            setOpen(false)
          }}
        >
          {t('common.arabic')}
        </button>
      </div>
    </div>
  )
}
