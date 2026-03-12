import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { listRoles, listPermissions, getPermissionsForRole, upsertPermission } from '../../api/roles'
import { Container } from '../../components/Container'
import './RolesPermissions.css'

export default function RolesPermissions() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [loadingAllPerms, setLoadingAllPerms] = useState(false)
  const [viewMode, setViewMode] = useState('byRole')
  const [showUpsert, setShowUpsert] = useState(false)
  const [upsertSubmitting, setUpsertSubmitting] = useState(false)
  const [upsertForm, setUpsertForm] = useState({
    role_id: '',
    page: '',
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_approve: false,
  })

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    listRoles(token)
      .then((data) => {
        const list = data.data ?? data.roles ?? data
        setRoles(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err.message || t('rolesPermissions.error')))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setLoadingAllPerms(true)
    listPermissions(token)
      .then((data) => {
        const list = data.data ?? data.permissions ?? data
        setAllPermissions(Array.isArray(list) ? list : [])
      })
      .catch(() => setAllPermissions([]))
      .finally(() => setLoadingAllPerms(false))
  }, [token])

  useEffect(() => {
    if (!token || selectedRoleId == null) {
      setPermissions([])
      return
    }
    setLoadingPerms(true)
    getPermissionsForRole(token, selectedRoleId)
      .then((data) => {
        const list = data.data ?? data.permissions ?? data
        setPermissions(Array.isArray(list) ? list : [])
      })
      .catch(() => setPermissions([]))
      .finally(() => setLoadingPerms(false))
  }, [token, selectedRoleId])

  const selectedRole = roles.find((r) => String(r.id) === String(selectedRoleId)) || roles[0]
  const selectedRoleName = selectedRole?.name ?? selectedRole?.slug ?? selectedRoleId ?? '—'

  const getRoleName = (roleId) => {
    const r = roles.find((x) => String(x.id) === String(roleId))
    return r?.name ?? r?.slug ?? roleId ?? '—'
  }

  const handleUpsertSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setUpsertSubmitting(true)
    try {
      await upsertPermission(token, {
        role_id: Number(upsertForm.role_id) || upsertForm.role_id,
        page: upsertForm.page,
        can_view: !!upsertForm.can_view,
        can_edit: !!upsertForm.can_edit,
        can_delete: !!upsertForm.can_delete,
        can_approve: !!upsertForm.can_approve,
      })
      setShowUpsert(false)
      if (selectedRoleId) {
        const list = await getPermissionsForRole(token, selectedRoleId)
        const next = list.data ?? list.permissions ?? list
        setPermissions(Array.isArray(next) ? next : [])
      }
      const allRes = await listPermissions(token)
      const allList = allRes.data ?? allRes.permissions ?? allRes
      setAllPermissions(Array.isArray(allList) ? allList : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setUpsertSubmitting(false)
    }
  }

  const openUpsert = (perm = null) => {
    setUpsertForm({
      role_id: perm?.role_id ?? selectedRoleId ?? roles[0]?.id ?? '',
      page: perm?.page ?? '',
      can_view: perm?.can_view ?? true,
      can_edit: perm?.can_edit ?? false,
      can_delete: perm?.can_delete ?? false,
      can_approve: perm?.can_approve ?? false,
    })
    setShowUpsert(true)
  }

  return (
    <Container size="xl">
      <div className="roles-permissions-page">
        {error && <div className="roles-permissions-error" role="alert">{error}</div>}

        {loading ? (
        <p>{t('rolesPermissions.loading')}</p>
      ) : (
        <>
          <div className="roles-permissions-view-toggle">
            <button
              type="button"
              className={`rp-btn rp-btn--tab ${viewMode === 'byRole' ? 'rp-btn--tab-active' : ''}`}
              onClick={() => setViewMode('byRole')}
            >
              {t('rolesPermissions.viewByRole')}
            </button>
            <button
              type="button"
              className={`rp-btn rp-btn--tab ${viewMode === 'all' ? 'rp-btn--tab-active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              {t('rolesPermissions.viewAllPermissions')}
            </button>
          </div>

          <section className="roles-permissions-section">
            <h2>{t('rolesPermissions.roles')}</h2>
            {roles.length === 0 ? (
              <p className="roles-permissions-empty">{t('rolesPermissions.noRoles')}</p>
            ) : (
              <div className="roles-permissions-role-select">
                <label htmlFor="role-select">{t('rolesPermissions.selectRole')}</label>
                <select
                  id="role-select"
                  value={selectedRoleId ?? ''}
                  onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{t('rolesPermissions.selectRole')}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? r.slug ?? r.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {viewMode === 'all' && (
            <section className="roles-permissions-section">
              <h2>{t('rolesPermissions.allPagePermissions')}</h2>
              {loadingAllPerms ? (
                <p>{t('rolesPermissions.loading')}</p>
              ) : allPermissions.length === 0 ? (
                <p className="roles-permissions-empty">{t('rolesPermissions.noPermissionsList')}</p>
              ) : (
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>{t('rolesPermissions.role')}</th>
                        <th>{t('rolesPermissions.page')}</th>
                        <th>{t('rolesPermissions.canView')}</th>
                        <th>{t('rolesPermissions.canEdit')}</th>
                        <th>{t('rolesPermissions.canDelete')}</th>
                        <th>{t('rolesPermissions.canApprove')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPermissions.map((p, i) => (
                        <tr key={p.role_id + '-' + (p.page ?? '') + '-' + i}>
                          <td>{getRoleName(p.role_id)}</td>
                          <td>{p.page ?? '—'}</td>
                          <td>{p.can_view ? '✓' : '—'}</td>
                          <td>{p.can_edit ? '✓' : '—'}</td>
                          <td>{p.can_delete ? '✓' : '—'}</td>
                          <td>{p.can_approve ? '✓' : '—'}</td>
                          <td>
                            <button type="button" className="rp-btn rp-btn--small" onClick={() => openUpsert(p)}>
                              {t('rolesPermissions.edit')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {viewMode === 'byRole' && selectedRoleId != null && (
            <section className="roles-permissions-section">
              <h2>{t('rolesPermissions.permissionsFor', { role: selectedRoleName })}</h2>
              <button type="button" className="rp-btn rp-btn--primary" onClick={() => openUpsert()}>
                {t('rolesPermissions.upsertPermission')}
              </button>
              {loadingPerms ? (
                <p>{t('rolesPermissions.loading')}</p>
              ) : permissions.length === 0 ? (
                <p className="roles-permissions-empty">{t('rolesPermissions.noPermissions')}</p>
              ) : (
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>{t('rolesPermissions.page')}</th>
                        <th>{t('rolesPermissions.canView')}</th>
                        <th>{t('rolesPermissions.canEdit')}</th>
                        <th>{t('rolesPermissions.canDelete')}</th>
                        <th>{t('rolesPermissions.canApprove')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((p, i) => (
                        <tr key={p.page ?? p.id ?? i}>
                          <td>{p.page ?? '—'}</td>
                          <td>{p.can_view ? '✓' : '—'}</td>
                          <td>{p.can_edit ? '✓' : '—'}</td>
                          <td>{p.can_delete ? '✓' : '—'}</td>
                          <td>{p.can_approve ? '✓' : '—'}</td>
                          <td>
                            <button type="button" className="rp-btn rp-btn--small" onClick={() => openUpsert(p)}>
                              {t('rolesPermissions.edit')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {showUpsert && (
        <div className="rp-modal" role="dialog" aria-modal="true">
          <div className="rp-modal-backdrop" onClick={() => setShowUpsert(false)} />
          <div className="rp-modal-content">
            <h2>{t('rolesPermissions.upsertPermission')}</h2>
            <form onSubmit={handleUpsertSubmit} className="rp-form">
              <div className="rp-field">
                <label>{t('rolesPermissions.role')}</label>
                <select
                  value={upsertForm.role_id}
                  onChange={(e) => setUpsertForm((f) => ({ ...f, role_id: e.target.value }))}
                  required
                  disabled={upsertSubmitting}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? r.slug ?? r.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rp-field">
                <label>{t('rolesPermissions.page')}</label>
                <input
                  type="text"
                  value={upsertForm.page}
                  onChange={(e) => setUpsertForm((f) => ({ ...f, page: e.target.value }))}
                  placeholder="e.g. clients"
                  required
                  disabled={upsertSubmitting}
                />
              </div>
              <div className="rp-field rp-field--check">
                <label>
                  <input
                    type="checkbox"
                    checked={upsertForm.can_view}
                    onChange={(e) => setUpsertForm((f) => ({ ...f, can_view: e.target.checked }))}
                    disabled={upsertSubmitting}
                  />
                  {t('rolesPermissions.canView')}
                </label>
              </div>
              <div className="rp-field rp-field--check">
                <label>
                  <input
                    type="checkbox"
                    checked={upsertForm.can_edit}
                    onChange={(e) => setUpsertForm((f) => ({ ...f, can_edit: e.target.checked }))}
                    disabled={upsertSubmitting}
                  />
                  {t('rolesPermissions.canEdit')}
                </label>
              </div>
              <div className="rp-field rp-field--check">
                <label>
                  <input
                    type="checkbox"
                    checked={upsertForm.can_delete}
                    onChange={(e) => setUpsertForm((f) => ({ ...f, can_delete: e.target.checked }))}
                    disabled={upsertSubmitting}
                  />
                  {t('rolesPermissions.canDelete')}
                </label>
              </div>
              <div className="rp-field rp-field--check">
                <label>
                  <input
                    type="checkbox"
                    checked={upsertForm.can_approve}
                    onChange={(e) => setUpsertForm((f) => ({ ...f, can_approve: e.target.checked }))}
                    disabled={upsertSubmitting}
                  />
                  {t('rolesPermissions.canApprove')}
                </label>
              </div>
              <div className="rp-modal-actions">
                <button type="button" className="rp-btn" onClick={() => setShowUpsert(false)} disabled={upsertSubmitting}>
                  {t('rolesPermissions.cancel')}
                </button>
                <button type="submit" className="rp-btn rp-btn--primary" disabled={upsertSubmitting}>
                  {upsertSubmitting ? t('rolesPermissions.saving') : t('rolesPermissions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Container>
  )
}
