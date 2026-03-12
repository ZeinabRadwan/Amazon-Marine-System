import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getStoredToken, clearToken } from '../Login'
import { getProfile, updateProfile, changePassword, logout } from '../../api/auth'
import { Container } from '../../components/Container'
import './Profile.css'

export default function Profile() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    getProfile(token)
      .then((data) => {
        if (cancelled) return
        const u = data.user ?? data.data ?? data
        setProfile(u)
        setName(u?.name ?? '')
        setEmail(u?.email ?? '')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError('')
    setProfileSuccess('')
    setProfileSaving(true)
    try {
      await updateProfile(token, { name, email })
      setProfileSuccess(t('profile.saved'))
      setProfile((p) => (p ? { ...p, name, email } : { name, email }))
    } catch (err) {
      setError(err.message || t('profile.error'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    setPasswordSuccess('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setPasswordSuccess(t('profile.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || t('profile.error'))
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!token) return
    setLoggingOut(true)
    setError('')
    try {
      await logout(token)
    } finally {
      clearToken()
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  if (loading) {
    return (
      <Container size="lg">
        <div className="profile-page">
          <p>{t('profile.loading')}</p>
        </div>
      </Container>
    )
  }

  return (
    <Container size="lg">
      <div className="profile-page">
      {error && <div className="profile-error" role="alert">{error}</div>}

      <section className="profile-section">
        <h2>{t('profile.updateProfile')}</h2>
        <form onSubmit={handleUpdateProfile} className="profile-form">
          <div className="profile-field">
            <label htmlFor="profile-name">{t('profile.name')}</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={profileSaving}
            />
          </div>
          <div className="profile-field">
            <label htmlFor="profile-email">{t('profile.email')}</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={profileSaving}
            />
          </div>
          <button type="submit" className="profile-btn" disabled={profileSaving}>
            {profileSaving ? t('profile.saving') : t('profile.save')}
          </button>
          {profileSuccess && <p className="profile-success">{profileSuccess}</p>}
        </form>
      </section>

      <section className="profile-section">
        <h2>{t('profile.changePassword')}</h2>
        <form onSubmit={handleChangePassword} className="profile-form">
          <div className="profile-field">
            <label htmlFor="current-password">{t('profile.currentPassword')}</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={passwordSaving}
              autoComplete="current-password"
            />
          </div>
          <div className="profile-field">
            <label htmlFor="new-password">{t('profile.newPassword')}</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={passwordSaving}
              autoComplete="new-password"
            />
          </div>
          <div className="profile-field">
            <label htmlFor="confirm-password">{t('profile.confirmPassword')}</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={passwordSaving}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="profile-btn" disabled={passwordSaving}>
            {passwordSaving ? t('profile.updating') : t('profile.updatePassword')}
          </button>
          {passwordSuccess && <p className="profile-success">{passwordSuccess}</p>}
        </form>
      </section>

      <section className="profile-section profile-section--danger">
        <h2>{t('profile.session')}</h2>
        <p className="profile-section-desc">{t('profile.logoutDescription')}</p>
        <button
          type="button"
          className="profile-btn profile-btn--danger"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? t('profile.loggingOut') : t('common.logOut')}
        </button>
      </section>
      </div>
    </Container>
  )
}
