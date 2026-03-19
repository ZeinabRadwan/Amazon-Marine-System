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
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import './Profile.css'

const FALLBACK_AVATAR = 'https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg'
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/jpg'
const MAX_SIZE_MB = 2

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
        <div className="clients-page">
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <div className="clients-page">

        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className="profile-sections">
          <section className="clients-filters-card profile-card profile-card--avatar">
            <h2 className="client-detail-modal__section-title">{t('profile.avatar')}</h2>
            <div className="profile-avatar-block">
              <div className="profile-avatar-wrap">
                <img
                  src={displayAvatarUrl}
                  alt=""
                  className="profile-avatar-img"
                  onError={(e) => { e.target.src = FALLBACK_AVATAR }}
                />
                {avatarUploading && (
                  <div className="profile-avatar-loading" aria-hidden="true">
                    <LoaderDots />
                  </div>
                )}
              </div>
              <div className="profile-avatar-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_IMAGES}
                  onChange={handleAvatarChange}
                  className="profile-avatar-input"
                  aria-label={t('profile.chooseImage')}
                  disabled={avatarUploading}
                />
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? t('profile.uploading') : t('profile.changeAvatar')}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    onClick={handleAvatarUpload}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? t('profile.uploading') : t('profile.uploadAvatar')}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="clients-filters-card profile-card">
            <h2 className="client-detail-modal__section-title">{t('profile.updateProfile')}</h2>
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="client-detail-modal__form-grid">
                <div className="client-detail-modal__form-field">
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
                <div className="client-detail-modal__form-field">
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
              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="client-detail-modal__btn client-detail-modal__btn--primary"
                  disabled={profileSaving}
                >
                  {profileSaving ? t('profile.saving') : t('profile.save')}
                </button>
              </div>
            </form>
          </section>

          <section className="clients-filters-card profile-card">
            <h2 className="client-detail-modal__section-title">{t('profile.changePassword')}</h2>
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="client-detail-modal__form-grid">
                <div className="client-detail-modal__form-field">
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
                <div className="client-detail-modal__form-field">
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
                <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
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
              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="client-detail-modal__btn client-detail-modal__btn--primary"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? t('profile.updating') : t('profile.updatePassword')}
                </button>
              </div>
            </form>
          </section>

          <section className="clients-filters-card profile-card profile-card--danger">
            <h2 className="client-detail-modal__section-title">{t('profile.session')}</h2>
            <p className="profile-card-desc">{t('profile.logoutDescription')}</p>
            <div className="profile-form-actions">
              <button
                type="button"
                className="client-detail-modal__btn client-detail-modal__btn--danger"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? t('profile.loggingOut') : t('common.logOut')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </Container>
  )
}
