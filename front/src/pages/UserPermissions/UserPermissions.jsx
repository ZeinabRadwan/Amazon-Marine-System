import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listUsersWithPermissions,
  getUserPermissions,
  updateUserPermissions,
  resetUserPermissions,
} from '../../api/userPermissions'
import { listAbilities } from '../../api/roles'
import { Container } from '../../components/Container'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { X, Eye, Pencil, RotateCcw } from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import './UserPermissions.css'
import '../RolesPermissions/RolesPermissions.css'

/**
 * Convert Spatie-style effective_permissions (e.g. ["users.view", "clients.manage"])
 * into table rows like RolesPermissions: { page, can_view, can_edit, can_delete, can_approve }.
 */
function effectivePermissionsToTable(permissionNames) {
  if (!Array.isArray(permissionNames) || permissionNames.length === 0) return []
  const byPage = {}
  for (const name of permissionNames) {
    const dot = name.indexOf('.')
    const page = dot > 0 ? name.slice(0, dot) : name
    const action = dot > 0 ? name.slice(dot + 1) : ''
    if (!byPage[page]) byPage[page] = { view: false, edit: false, delete: false, approve: false }
    if (action === 'view' || action.startsWith('view_')) byPage[page].view = true
    else if (action === 'manage' || action.startsWith('manage_')) {
      byPage[page].edit = true
      if (action === 'manage_any' || action === 'manage_admins') byPage[page].approve = true
    } else if (action === 'delete') byPage[page].delete = true
    else if (action === 'approve') byPage[page].approve = true
  }
  return Object.entries(byPage)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([page, flags]) => ({
      page,
      can_view: flags.view,
      can_edit: flags.edit,
      can_delete: flags.delete,
      can_approve: flags.approve,
    }))
}

export default function UserPermissions() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const [users, setUsers] = useState([])
  const [abilities, setAbilities] = useState([])
  const [abilitiesLoading, setAbilitiesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [viewUserId, setViewUserId] = useState(null)
  const [viewData, setViewData] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [editUserId, setEditUserId] = useState(null)
  const [editForm, setEditForm] = useState({ overrides: {} })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [resetUserId, setResetUserId] = useState(null)
  const [resetSubmitting, setResetSubmitting] = useState(false)

  const PermissionBadge = ({ on }) =>
    on ? (
      <span className="rp-perm-badge rp-perm-badge--on" title={t('rolesPermissions.yes')} aria-label={t('rolesPermissions.yes')}>✓</span>
    ) : (
      <span className="rp-perm-badge rp-perm-badge--off" title={t('rolesPermissions.no')} aria-label={t('rolesPermissions.no')}>—</span>
    )

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listUsersWithPermissions(token)
      .then((data) => {
        const list = data.data ?? data.users ?? data
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('userPermissions.error') }))
      .finally(() => setLoading(false))
  }, [token, t])

  useEffect(() => {
    if (!token) return
    setAbilitiesLoading(true)
    listAbilities(token)
      .then((data) => {
        const raw = data.data ?? data.abilities ?? data
        if (Array.isArray(raw)) {
          setAbilities(raw)
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          setAbilities(Object.values(raw).flat().filter(Boolean))
        } else {
          setAbilities([])
        }
      })
      .catch(() => setAbilities([]))
      .finally(() => setAbilitiesLoading(false))
  }, [token])

  const openView = (user) => {
    setViewUserId(user.id)
    setViewData(null)
    setViewLoading(true)
    getUserPermissions(token, user.id)
      .then((data) => {
        const d = data.data ?? data
        setViewData(d)
      })
      .catch(() => setViewData(null))
      .finally(() => setViewLoading(false))
  }

  const openEdit = (user) => {
    setEditUserId(user.id)
    setViewLoading(true)
    getUserPermissions(token, user.id)
      .then((data) => {
        const d = data.data ?? data
        const overrides = {}
        ;(d.overrides ?? []).forEach((o) => {
          overrides[o.permission ?? o.permission_id] = o.allowed ? 'allow' : 'deny'
        })
        setEditForm({ overrides })
      })
      .catch(() => setEditForm({ overrides: {} }))
      .finally(() => setViewLoading(false))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editUserId || !token) return
    setAlert(null)
    setEditSubmitting(true)
    try {
      const permissions = Object.entries(editForm.overrides).map(([name, value]) => ({
        name,
        allowed: value === 'allow',
      }))
      await updateUserPermissions(token, editUserId, { permissions })
      setEditUserId(null)
      const data = await listUsersWithPermissions(token)
      setUsers(Array.isArray((data.data ?? data.users ?? data)) ? (data.data ?? data.users ?? data) : [])
      setAlert({ type: 'success', message: t('userPermissions.saved') })
    } catch {
      setAlert({ type: 'error', message: t('userPermissions.error') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleResetConfirm = async () => {
    if (!resetUserId || !token) return
    setAlert(null)
    setResetSubmitting(true)
    try {
      await resetUserPermissions(token, resetUserId)
      setResetUserId(null)
      const data = await listUsersWithPermissions(token)
      setUsers(Array.isArray((data.data ?? data.users ?? data)) ? (data.data ?? data.users ?? data) : [])
      setAlert({ type: 'success', message: t('userPermissions.resetDone') })
    } catch {
      setAlert({ type: 'error', message: t('userPermissions.error') })
    } finally {
      setResetSubmitting(false)
    }
  }

  const abilityList = abilities.map((a) => (typeof a === 'string' ? a : a.name ?? a)).filter(Boolean)
  const setOverride = (name, value) => {
    setEditForm((f) => {
      const next = { ...f.overrides }
      if (value === 'role') delete next[name]
      else next[name] = value
      return { overrides: next }
    })
  }

  const pageLoading = loading || editSubmitting || resetSubmitting

  return (
    <Container size="xl">
      <div className="clients-page up-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        {alert && (
          <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}
        {!loading && users.length === 0 && (
          <p className="clients-empty">{t('userPermissions.noUsers')}</p>
        )}

        {!loading && users.length > 0 && (
          <div className="clients-filters-card up-panel">
            <div className="clients-table-wrap">
              <table className="clients-table up-table">
                <thead>
                  <tr>
                    <th>{t('userPermissions.name')}</th>
                    <th>{t('userPermissions.email')}</th>
                    <th>{t('userPermissions.role')}</th>
                    <th>{t('userPermissions.permissionStatus')}</th>
                    <th className="rp-th--actions">{t('userPermissions.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><span className="rp-cell-role">{u.name ?? '—'}</span></td>
                      <td>{u.email ?? '—'}</td>
                      <td>{u.primary_role ?? (u.roles && u.roles[0]) ?? '—'}</td>
                      <td>
                        {(u.overrides && u.overrides.length > 0)
                          ? t('userPermissions.custom')
                          : t('userPermissions.roleDefault')}
                      </td>
                      <td className="rp-td--actions">
                        <div className="rp-table-actions">
                          <button
                            type="button"
                            className="clients-filters__btn-icon"
                            onClick={() => openView(u)}
                            title={t('userPermissions.viewPermissions')}
                            aria-label={t('userPermissions.viewPermissions')}
                          >
                            <Eye className="clients-filters__btn-icon-svg" size={18} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="clients-filters__btn-icon"
                            onClick={() => openEdit(u)}
                            title={t('userPermissions.editPermissions')}
                            aria-label={t('userPermissions.editPermissions')}
                          >
                            <Pencil className="clients-filters__btn-icon-svg" size={18} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="clients-filters__btn-icon rp-btn--danger"
                            onClick={() => setResetUserId(u.id)}
                            title={t('userPermissions.resetToRoleDefault')}
                            aria-label={t('userPermissions.resetToRoleDefault')}
                          >
                            <RotateCcw className="clients-filters__btn-icon-svg" size={18} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View permissions modal */}
        {viewUserId != null && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="up-view-title">
            <div className="client-detail-modal__backdrop" onClick={() => setViewUserId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--wide">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="up-view-title">{t('userPermissions.viewPermissions')}</h2>
                <button type="button" className="client-detail-modal__close" onClick={() => setViewUserId(null)} aria-label={t('userPermissions.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                {viewLoading ? (
                  <p className="rp-section__loading">{t('userPermissions.loading')}</p>
                ) : viewData ? (
                  <>
                    <p className="up-view-heading"><strong>{viewData.user_name}</strong></p>
                    <p className="up-muted">{t('userPermissions.role')}: {viewData.primary_role ?? '—'}</p>
                    {(() => {
                      const tableRows = effectivePermissionsToTable(viewData.effective_permissions)
                      if (tableRows.length === 0) {
                        return <p className="up-muted">{t('userPermissions.effectivePermissions')}: —</p>
                      }
                      return (
                        <div className="clients-table-wrap">
                          <table className="clients-table rp-permissions-table">
                            <thead>
                              <tr>
                                <th>{t('rolesPermissions.page')}</th>
                                <th className="rp-th--center">{t('rolesPermissions.canView')}</th>
                                <th className="rp-th--center">{t('rolesPermissions.canEdit')}</th>
                                <th className="rp-th--center">{t('rolesPermissions.canDelete')}</th>
                                <th className="rp-th--center">{t('rolesPermissions.canApprove')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tableRows.map((p, i) => (
                                <tr key={p.page + '-' + i}>
                                  <td><span className="rp-cell-page">{p.page}</span></td>
                                  <td className="rp-td--center"><PermissionBadge on={p.can_view} /></td>
                                  <td className="rp-td--center"><PermissionBadge on={p.can_edit} /></td>
                                  <td className="rp-td--center"><PermissionBadge on={p.can_delete} /></td>
                                  <td className="rp-td--center"><PermissionBadge on={p.can_approve} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </>
                ) : null}
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setViewUserId(null)}>
                  {t('userPermissions.close')}
                </button>
              </footer>
            </div>
          </div>
        )}

        {/* Edit permissions modal */}
        {editUserId != null && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="up-edit-title">
            <div className="client-detail-modal__backdrop" onClick={() => !editSubmitting && setEditUserId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form client-detail-modal__box--wide">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="up-edit-title">{t('userPermissions.editPermissions')}</h2>
                <button type="button" className="client-detail-modal__close" onClick={() => setEditUserId(null)} disabled={editSubmitting} aria-label={t('userPermissions.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="rp-abilities-list up-edit-abilities">
                    {viewLoading ? (
                      <p className="rp-empty-small">{t('userPermissions.loading')}</p>
                    ) : abilitiesLoading ? (
                      <p className="rp-empty-small">{t('userPermissions.loading')}</p>
                    ) : abilityList.length === 0 ? (
                      <p className="rp-empty-small">{t('userPermissions.error')}</p>
                    ) : (
                      abilityList.map((name) => (
                        <div key={name} className="up-ability-row">
                          <span className="up-ability-name">{name}</span>
                          <span className="up-ability-radios">
                            <label className="client-detail-modal__form-field--check-label">
                              <input
                                type="radio"
                                name={`up-${name}`}
                                checked={(editForm.overrides[name] ?? 'role') === 'role'}
                                onChange={() => setOverride(name, 'role')}
                                disabled={editSubmitting}
                              />
                              {t('userPermissions.roleDefault')}
                            </label>
                            <label className="client-detail-modal__form-field--check-label">
                              <input
                                type="radio"
                                name={`up-${name}`}
                                checked={editForm.overrides[name] === 'allow'}
                                onChange={() => setOverride(name, 'allow')}
                                disabled={editSubmitting}
                              />
                              {t('userPermissions.allowed')}
                            </label>
                            <label className="client-detail-modal__form-field--check-label">
                              <input
                                type="radio"
                                name={`up-${name}`}
                                checked={editForm.overrides[name] === 'deny'}
                                onChange={() => setOverride(name, 'deny')}
                                disabled={editSubmitting}
                              />
                              {t('userPermissions.denied')}
                            </label>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setEditUserId(null)} disabled={editSubmitting}>
                    {t('userPermissions.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>
                    {editSubmitting ? t('userPermissions.saving') : t('userPermissions.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* Reset confirm modal */}
        {resetUserId != null && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="up-reset-title">
            <div className="client-detail-modal__backdrop" onClick={() => !resetSubmitting && setResetUserId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="up-reset-title">{t('userPermissions.resetToRoleDefault')}</h2>
                <button type="button" className="client-detail-modal__close" onClick={() => setResetUserId(null)} disabled={resetSubmitting} aria-label={t('userPermissions.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <p>{t('userPermissions.resetConfirm')}</p>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setResetUserId(null)} disabled={resetSubmitting}>
                  {t('userPermissions.cancel')}
                </button>
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--danger" onClick={handleResetConfirm} disabled={resetSubmitting}>
                  {resetSubmitting ? t('userPermissions.saving') : t('userPermissions.resetToRoleDefault')}
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
