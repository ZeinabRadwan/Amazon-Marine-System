import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'

const LANG_KEY = 'lang'

const resources = {
  en: { translation: en },
  ar: { translation: ar },
}

function getStoredLang() {
  const stored = localStorage.getItem(LANG_KEY)
  if (stored === 'en' || stored === 'ar') return stored
  return null
}

function getInitialLanguage() {
  const stored = getStoredLang()
  if (stored) return stored
  return navigator.language.split('-')[0] === 'ar' ? 'ar' : 'en'
}

export function setLanguage(lng) {
  if (lng === 'en' || lng === 'ar') {
    localStorage.setItem(LANG_KEY, lng)
    i18n.changeLanguage(lng)
  }
}

export function getLanguage() {
  return i18n.language || getInitialLanguage()
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
})

// Set initial dir/lang
const initial = getInitialLanguage()
document.documentElement.lang = initial
document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr'

export default i18n
