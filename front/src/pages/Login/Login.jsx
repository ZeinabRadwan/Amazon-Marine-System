import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, ChevronDown } from 'lucide-react'
import { login } from '../../api/auth'
import { setLanguage } from '../../i18n'
import { initTheme, getResolvedTheme } from '../../theme'
import logoLight from '../../assets/logo_lightmode.png'
import logoDark from '../../assets/logo_darkmode.png'
import LoaderDots from '../../components/LoaderDots'
import ThemeToggle from '../../components/ThemeToggle'
import { DropdownMenu } from '../../components/DropdownMenu'
import Footer from '../../components/Footer'
import '../../components/LoaderDots/LoaderDots.css'
import './Login.css'

const AUTH_TOKEN_KEY = 'auth_token'

export function storeToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

function LoginIcon() {
  return (
    <svg className="login-submit-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const currentLangLabel = i18n.language === 'ar' ? t('common.arabic') : t('common.english')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState(() => getResolvedTheme())
  useEffect(() => {
    initTheme()
    setTheme(getResolvedTheme())
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      initTheme()
      setTheme(getResolvedTheme())
    }
    media.addEventListener('change', handler)
    const onThemeChange = () => setTheme(getResolvedTheme())
    window.addEventListener('themechange', onThemeChange)
    return () => {
      media.removeEventListener('change', handler)
      window.removeEventListener('themechange', onThemeChange)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      const token = data.token ?? data.access_token
      if (token) {
        storeToken(token)
        navigate('/', { replace: true })
      } else {
        setError(t('login.errorNoToken'))
      }
    } catch (err) {
      setError(err.message || t('login.errorFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {loading && (
        <div className="login-fullpage-loader" role="status" aria-live="polite" aria-label={t('login.signingIn')}>
          <div className="login-fullpage-loader__content">
            <LoaderDots size={24} />
            <span className="login-fullpage-loader__text">{t('login.signingIn')}</span>
          </div>
        </div>
      )}
      <div className="login-toolbar">
        <ThemeToggle className="theme-toggle-app" />
        <DropdownMenu
          align="end"
          trigger={({ isOpen, getTriggerProps }) => (
            <button
              type="button"
              {...getTriggerProps()}
              className="login-toolbar__lang"
              aria-label={t('common.language', 'Language')}
            >
              <Globe className="shrink-0" aria-hidden />
              <span className="login-toolbar__lang-label">{currentLangLabel}</span>
              <ChevronDown
                className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          )}
          items={[
            { label: t('common.english'), onClick: () => setLanguage('en'), selected: i18n.language === 'en' },
            { label: t('common.arabic'), onClick: () => setLanguage('ar'), selected: i18n.language === 'ar' },
          ]}
        />
      </div>
      <div className="login-page-column box-root flex-flex flex-direction--column">
        <div className="login-background padding-top--64">
          <div className="loginbackground-gridContainer">
            <div className="box-root flex-flex" style={{ gridArea: 'top / start / 12 / end' }}>
              <div className="box-root box-background--white login-bg-gradient" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '4 / 2 / auto / 5' }}>
              <div className="box-root box-divider--light-all-2 animationLeftRight tans3s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '6 / start / auto / 2' }}>
              <div className="box-root box-background--blue800" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '7 / start / auto / 4' }}>
              <div className="box-root box-background--blue animationLeftRight" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '8 / 4 / auto / 6' }}>
              <div className="box-root box-background--gray100 animationLeftRight tans3s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '2 / 15 / auto / end' }}>
              <div className="box-root box-background--cyan200 animationRightLeft tans4s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '3 / 14 / auto / end' }}>
              <div className="box-root box-background--blue animationRightLeft" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '4 / 17 / auto / 20' }}>
              <div className="box-root box-background--gray100 animationRightLeft tans4s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '5 / 14 / auto / 17' }}>
              <div className="box-root box-divider--light-all-2 animationRightLeft tans3s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '9 / 6 / auto / 10' }}>
              <div className="box-root box-background--blue800 animationLeftRight" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '10 / 8 / auto / 12' }}>
              <div className="box-root box-background--cyan200 animationLeftRight tans4s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '11 / 3 / auto / 7' }}>
              <div className="box-root box-background--gray100 animationRightLeft tans3s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '2 / 6 / auto / 9' }}>
              <div className="box-root box-divider--light-all-2 animationLeftRight" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '3 / 8 / auto / 11' }}>
              <div className="box-root box-background--blue animationRightLeft tans3s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '6 / 18 / auto / 22' }}>
              <div className="box-root box-background--gray100 animationRightLeft" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '8 / 20 / auto / 24' }}>
              <div className="box-root box-background--blue800 animationLeftRight tans4s" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '10 / 14 / auto / 18' }}>
              <div className="box-root box-background--cyan200 animationLeftRight" style={{ flexGrow: 1 }} />
            </div>
            <div className="box-root flex-flex" style={{ gridArea: '5 / 10 / auto / 13' }}>
              <div className="box-root box-divider--light-all-2 animationRightLeft tans4s" style={{ flexGrow: 1 }} />
            </div>
          </div>
        </div>
        <div className="login-content box-root flex-flex flex-direction--column" style={{ flexGrow: 1, zIndex: 9 }}>
          <div className="formbg-outer">
            <div className="formbg">
              <div className="formbg-inner padding-horizontal--48">
                <div className="login-logo-wrap">
                  <Link to="/" className="login-logo-link">
                    <img
                      src={theme === 'dark' ? logoDark : logoLight}
                      alt={t('common.brand')}
                      className="login-logo"
                    />
                  </Link>
                </div>
                <span className="login-form-title padding-bottom--15">{t('login.title')}</span>
                {error && <div className="form-error" role="alert">{error}</div>}
                <form onSubmit={handleSubmit} id="stripe-login">
                  <div className="field padding-bottom--24">
                    <label htmlFor="email">{t('login.email')}</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="field padding-bottom--24">
                    <label htmlFor="password">{t('login.password')}</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="field padding-bottom--24">
                    <button
                      type="submit"
                      name="submit"
                      className="login-submit-btn"
                      disabled={loading}
                    >
                      <LoginIcon />
                      {t('login.signIn')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
