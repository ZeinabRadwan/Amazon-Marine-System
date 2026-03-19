import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getStoredToken, clearToken } from '../Login'
import { getProfile, updateProfile, uploadProfileAvatar, changePassword, logout } from '../../api/auth'
import { Container } from '../../components/Container'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import '../../components/PageHeader/PageHeader.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/ClientDetailModal.css'
import './Profile.css'

const FALLBACK_AVATAR = 'https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg'
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/jpg'
const MAX_SIZE_MB = 2

function IconEdit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconChevron({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`profile-action__chevron ${open ? 'profile-action__chevron--open' : ''}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const navigate = useNavigate()
  const { refreshUser } = useOutletContext() || {}
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    getProfile(token)
      .then((data) => {
        if (cancelled) return
        const u = data.user ?? data.data ?? data
        setName(u?.name ?? '')
        setEmail(u?.email ?? '')
        setAvatarUrl(u?.avatar_url ?? u?.avatarUrl ?? null)
      })
      .catch((err) => {
        if (!cancelled) setAlert({ type: 'error', message: err.message || t('profile.error') })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token, t])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setAlert(null)
    setProfileSaving(true)
    try {
      await updateProfile(token, { name, email })
      if (typeof refreshUser === 'function') refreshUser()
      setAlert({ type: 'success', message: t('profile.saved') })
      setShowEditForm(false)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('profile.error') })
    } finally {
      setProfileSaving(false)
    }
  }

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const handleAvatarChange = (e) => {
    clearPreview()
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAlert({ type: 'error', message: t('profile.avatarTooBig', { max: MAX_SIZE_MB }) })
      e.target.value = ''
      return
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      setAlert({ type: 'error', message: t('profile.avatarInvalidType') })
      e.target.value = ''
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleAvatarUpload = async () => {
    const input = fileInputRef.current
    const file = input?.files?.[0]
    if (!file) {
      setAlert({ type: 'error', message: t('profile.selectImage') })
      return
    }
    setAlert(null)
    setAvatarUploading(true)
    try {
      const data = await uploadProfileAvatar(token, file)
      const u = data.user ?? data.data ?? data
      setAvatarUrl(u?.avatar_url ?? u?.avatarUrl ?? null)
      clearPreview()
      if (input) input.value = ''
      if (typeof refreshUser === 'function') refreshUser()
      setAlert({ type: 'success', message: t('profile.avatarUpdated') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('profile.avatarError') })
    } finally {
      setAvatarUploading(false)
    }
  }

  const displayAvatarUrl = previewUrl || avatarUrl || FALLBACK_AVATAR

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setAlert(null)
    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', message: t('profile.passwordsDoNotMatch') })
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setAlert({ type: 'success', message: t('profile.passwordUpdated') })
      setShowPasswordForm(false)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('profile.error') })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!token) return
    setLoggingOut(true)
    setAlert(null)
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
      <Container size="xl">
        <div className="profile-page">
          <div className="profile-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <div className="profile-page cs-page-enter">
        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="profile-alert"
          />
        )}

        <div className="profile-card">
          {/* Hero: avatar + name + email */}
          <div className="profile-hero">
            <div className="profile-hero__avatar-wrap">
              <img
                src={displayAvatarUrl}
                alt=""
                className="profile-hero__avatar"
                onError={(e) => { e.target.src = FALLBACK_AVATAR }}
              />
              {avatarUploading && (
                <div className="profile-hero__avatar-loading" aria-hidden="true">
                  <LoaderDots />
                </div>
              )}
              <label className="profile-hero__avatar-edit">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_IMAGES}
                  onChange={handleAvatarChange}
                  className="profile-hero__avatar-input"
                  aria-label={t('profile.chooseImage')}
                  disabled={avatarUploading}
                />
                <span className="profile-hero__avatar-edit-label">{t('profile.changeAvatar')}</span>
              </label>
            </div>
            <div className="profile-hero__info">
              <h1 className="profile-hero__name">{name || t('profile.name')}</h1>
              <p className="profile-hero__email">{email}</p>
              {previewUrl && (
                <button
                  type="button"
                  className="profile-hero__upload-btn client-detail-modal__btn client-detail-modal__btn--primary"
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? t('profile.uploading') : t('profile.uploadAvatar')}
                </button>
              )}
            </div>
          </div>

          {/* Actions: expandable sections */}
          <div className="profile-actions">
            {/* Edit profile */}
            <div className={`profile-action ${showEditForm ? 'profile-action--open' : ''}`}>
              <button
                type="button"
                className="profile-action__trigger"
                onClick={() => { setShowEditForm((v) => !v); setShowPasswordForm(false); }}
                aria-expanded={showEditForm}
                aria-controls="profile-edit-form"
              >
                <span className="profile-action__icon"><IconEdit /></span>
                <span className="profile-action__label">{t('profile.updateProfile')}</span>
                <IconChevron open={showEditForm} />
              </button>
              <div id="profile-edit-form" className="profile-action__body" role="region" aria-label={t('profile.updateProfile')}>
                <form onSubmit={handleUpdateProfile} className="profile-action__form">
                  <div className="profile-action__form-grid">
                    <div className="profile-action__field">
                      <label htmlFor="profile-name">{t('profile.name')}</label>
                      <input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={profileSaving}
                        aria-label={t('profile.name')}
                      />
                    </div>
                    <div className="profile-action__field">
                      <label htmlFor="profile-email">{t('profile.email')}</label>
                      <input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={profileSaving}
                        aria-label={t('profile.email')}
                      />
                    </div>
                  </div>
                  <div className="profile-action__form-actions">
                    <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowEditForm(false)} disabled={profileSaving}>
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={profileSaving}>
                      {profileSaving ? t('profile.saving') : t('profile.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Change password */}
            <div className={`profile-action ${showPasswordForm ? 'profile-action--open' : ''}`}>
              <button
                type="button"
                className="profile-action__trigger"
                onClick={() => { setShowPasswordForm((v) => !v); setShowEditForm(false); }}
                aria-expanded={showPasswordForm}
                aria-controls="profile-password-form"
              >
                <span className="profile-action__icon"><IconLock /></span>
                <span className="profile-action__label">{t('profile.changePassword')}</span>
                <IconChevron open={showPasswordForm} />
              </button>
              <div id="profile-password-form" className="profile-action__body" role="region" aria-label={t('profile.changePassword')}>
                <form onSubmit={handleChangePassword} className="profile-action__form">
                  <div className="profile-action__form-grid">
                    <div className="profile-action__field">
                      <label htmlFor="current-password">{t('profile.currentPassword')}</label>
                      <input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        disabled={passwordSaving}
                        autoComplete="current-password"
                        aria-label={t('profile.currentPassword')}
                      />
                    </div>
                    <div className="profile-action__field">
                      <label htmlFor="new-password">{t('profile.newPassword')}</label>
                      <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={passwordSaving}
                        autoComplete="new-password"
                        aria-label={t('profile.newPassword')}
                      />
                    </div>
                    <div className="profile-action__field profile-action__field--full">
                      <label htmlFor="confirm-password">{t('profile.confirmPassword')}</label>
                      <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={passwordSaving}
                        autoComplete="new-password"
                        aria-label={t('profile.confirmPassword')}
                      />
                    </div>
                  </div>
                  <div className="profile-action__form-actions">
                    <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowPasswordForm(false)} disabled={passwordSaving}>
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={passwordSaving}>
                      {passwordSaving ? t('profile.updating') : t('profile.updatePassword')}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Session / Logout */}
            <div className="profile-action profile-action--logout">
              <div className="profile-action__trigger profile-action__trigger--static">
                <span className="profile-action__icon"><IconLogout /></span>
                <span className="profile-action__label">{t('profile.session')}</span>
              </div>
              <div className="profile-action__body profile-action__body--static">
                <p className="profile-action__desc">{t('profile.logoutDescription')}</p>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--danger"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? t('profile.loggingOut') : t('common.logOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
