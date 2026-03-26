import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listRoles,
  listPermissions,
  upsertPermission,
  deletePagePermission,
  getPermissionsByRole,
  createRole,
  updateRole,
  deleteRole,
} from '../../api/roles'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import Tabs from '../../components/Tabs'
import Pagination from '../../components/Pagination'
import { X, Pencil, Trash2, Eye } from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import './RolesPermissions.css'

export default function RolesPermissions() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const [roles, setRoles] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [loadingAllPerms, setLoadingAllPerms] = useState(false)
  const [showUpsert, setShowUpsert] = useState(false)
  const [upsertSubmitting, setUpsertSubmitting] = useState(false)
  const [upsertForm, setUpsertForm] = useState({ role_id: '', page: '', can_view: true })
  const [deletePermissionId, setDeletePermissionId] = useState(null)
  const [deletePermissionSubmitting, setDeletePermissionSubmitting] = useState(false)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [createRoleForm, setCreateRoleForm] = useState({ name: '', name_ar: '', name_en: '' })
  const [createRoleSubmitting, setCreateRoleSubmitting] = useState(false)
  const [showEditRole, setShowEditRole] = useState(false)
  const [editRoleId, setEditRoleId] = useState(null)
  const [editRoleForm, setEditRoleForm] = useState({ name: '', name_ar: '', name_en: '' })
  const [editRoleSubmitting, setEditRoleSubmitting] = useState(false)
  const [deleteRoleId, setDeleteRoleId] = useState(null)
  const [deleteRoleSubmitting, setDeleteRoleSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('roles')
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState('')
  const [permPage, setPermPage] = useState(1)
  const [permPerPage, setPermPerPage] = useState(25)
  const [viewByRoleId, setViewByRoleId] = useState(null)
  const [viewByRolePerms, setViewByRolePerms] = useState([])
  const [viewByRoleLoading, setViewByRoleLoading] = useState(false)

  const roleLabel = (role) => (i18n.language === 'ar' ? role?.name_ar || role?.name_en || role?.name : role?.name_en || role?.name_ar || role?.name)

  const loadRoles = async () => {
    const data = await listRoles(token)
    const list = data.data ?? data.roles ?? data
    setRoles(Array.isArray(list) ? list : [])
  }

  const loadPermissions = async () => {
    const data = await listPermissions(token)
    const list = data.data ?? data.permissions ?? data
    setAllPermissions(Array.isArray(list) ? list : [])
  }

  const filteredPermissions = selectedPermissionRoleId
    ? allPermissions.filter((p) => String(p.role_id) === String(selectedPermissionRoleId))
    : []
  const totalPermPages = Math.max(1, Math.ceil(filteredPermissions.length / permPerPage))
  const safePermPage = Math.min(permPage, totalPermPages)
  const paginatedPerms = filteredPermissions.slice(
    (safePermPage - 1) * permPerPage,
    safePermPage * permPerPage
  )

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    Promise.all([loadRoles(), loadPermissions()])
      .catch(() => setAlert({ type: 'error', message: t('rolesPermissions.error') }))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredPermissions.length / permPerPage))
    if (permPage > maxPage) setPermPage(maxPage)
  }, [filteredPermissions.length, permPerPage, permPage])

  useEffect(() => {
    if (roles.length > 0 && !selectedPermissionRoleId) {
      setSelectedPermissionRoleId(String(roles[0].id))
    }
  }, [roles, selectedPermissionRoleId])

  const getRoleName = (roleId) => {
    const r = roles.find((x) => String(x.id) === String(roleId))
    return roleLabel(r) || roleId || t('rolesPermissions.dash')
  }

  const pageLabel = (permission) => {
    if (i18n.language === 'ar') {
      return permission?.page_name_ar || permission?.page_name_en || permission?.page || t('rolesPermissions.dash')
    }
    return permission?.page_name_en || permission?.page_name_ar || permission?.page || t('rolesPermissions.dash')
  }

  const handleUpsertSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    setUpsertSubmitting(true)
    try {
      await upsertPermission(token, {
        role_id: Number(upsertForm.role_id) || upsertForm.role_id,
        page: upsertForm.page,
        can_view: !!upsertForm.can_view,
      })
      setShowUpsert(false)
      await loadPermissions()
      setAlert({
        type: 'success',
        message: t('rolesPermissions.saved', 'Permission saved.'),
      })
    } catch {
      setAlert({ type: 'error', message: t('rolesPermissions.error') })
    } finally {
      setUpsertSubmitting(false)
    }
  }

  const openUpsert = (perm = null) => {
    setUpsertForm({
      role_id: perm?.role_id ?? roles[0]?.id ?? '',
      page: perm?.page ?? '',
      can_view: perm?.can_view ?? true,
    })
    setShowUpsert(true)
  }

  const handleDeletePermissionConfirm = async () => {
    if (!deletePermissionId || !token) return
    setAlert(null)
    setDeletePermissionSubmitting(true)
    try {
      await deletePagePermission(token, deletePermissionId)
      setDeletePermissionId(null)
      await loadPermissions()
      setAlert({
        type: 'success',
        message: t('rolesPermissions.permissionDeleted'),
      })
    } catch {
      setAlert({ type: 'error', message: t('rolesPermissions.error') })
    } finally {
      setDeletePermissionSubmitting(false)
    }
  }

  const openCreateRole = () => {
    setCreateRoleForm({ name: '', name_ar: '', name_en: '' })
    setShowCreateRole(true)
  }

  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    setCreateRoleSubmitting(true)
    try {
      await createRole(token, {
        name: createRoleForm.name.trim(),
        name_ar: createRoleForm.name_ar.trim(),
        name_en: createRoleForm.name_en.trim(),
      })
      setShowCreateRole(false)
      await loadRoles()
      setAlert({ type: 'success', message: t('rolesPermissions.roleCreated') })
    } catch {
      setAlert({ type: 'error', message: t('rolesPermissions.error') })
    } finally {
      setCreateRoleSubmitting(false)
    }
  }

  const openEditRole = (role) => {
    setEditRoleId(role.id)
    setEditRoleForm({
      name: role.name ?? '',
      name_ar: role.name_ar ?? '',
      name_en: role.name_en ?? '',
    })
    setShowEditRole(true)
  }

  const openViewByRole = (role) => {
    setViewByRoleId(role.id)
    setViewByRolePerms([])
    setViewByRoleLoading(true)
    getPermissionsByRole(token, role.id)
      .then((data) => {
        const list = data.data ?? data.permissions ?? data
        setViewByRolePerms(Array.isArray(list) ? list : [])
      })
      .catch(() => setViewByRolePerms([]))
      .finally(() => setViewByRoleLoading(false))
  }

  const handleEditRoleSubmit = async (e) => {
    e.preventDefault()
    if (!editRoleId || !token) return
    setAlert(null)
    setEditRoleSubmitting(true)
    try {
      await updateRole(token, editRoleId, {
        name: editRoleForm.name.trim(),
        name_ar: editRoleForm.name_ar.trim(),
        name_en: editRoleForm.name_en.trim(),
      })
      setShowEditRole(false)
      setEditRoleId(null)
      await loadRoles()
      setAlert({ type: 'success', message: t('rolesPermissions.roleUpdated') })
    } catch {
      setAlert({ type: 'error', message: t('rolesPermissions.error') })
    } finally {
      setEditRoleSubmitting(false)
    }
  }

  const handleDeleteRoleConfirm = async () => {
    if (!deleteRoleId || !token) return
    setAlert(null)
    setDeleteRoleSubmitting(true)
    try {
      await deleteRole(token, deleteRoleId)
      setDeleteRoleId(null)
      await Promise.all([loadRoles(), loadPermissions()])
      setAlert({ type: 'success', message: t('rolesPermissions.roleDeleted') })
    } catch {
      setAlert({ type: 'error', message: t('rolesPermissions.error') })
    } finally {
      setDeleteRoleSubmitting(false)
    }
  }

  const pageLoading =
    loading ||
    upsertSubmitting ||
    createRoleSubmitting ||
    editRoleSubmitting ||
    deleteRoleSubmitting ||
    deletePermissionSubmitting

  const PermissionBadge = ({ on }) =>
    on ? (
      <span
        className="rp-perm-badge rp-perm-badge--on"
        title={t("rolesPermissions.yes")}
        aria-label={t("rolesPermissions.yes")}
      >
        ✓
      </span>
    ) : (
      <span
        className="rp-perm-badge rp-perm-badge--off"
        title={t("rolesPermissions.no")}
        aria-label={t("rolesPermissions.no")}
      >
        —
      </span>
    )

  return (
    <Container size="xl">
      <div className="clients-page rp-page">
        {pageLoading && (
          <div
            className="clients-page-loader"
            aria-live="polite"
            aria-busy="true"
          >
            <LoaderDots />
          </div>
        )}

        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {!loading && roles.length === 0 && (
          <div className="rp-empty-state">
            <p className="clients-empty">{t("rolesPermissions.noRoles")}</p>
            <button
              type="button"
              className="page-header__btn page-header__btn--primary"
              onClick={openCreateRole}
            >
              {t("rolesPermissions.createRole")}
            </button>
          </div>
        )}

        {!loading && roles.length > 0 && (
          <>
            <div className="rp-main-grid">
              <Tabs
                tabs={[
                  { id: "roles", label: t("rolesPermissions.roles") },
                  {
                    id: "pagePermissions",
                    label: t("rolesPermissions.allPagePermissions"),
                  },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="rp-tabs"
              />
              <div
                role="tabpanel"
                id="panel-roles"
                aria-labelledby="tab-roles"
                hidden={activeTab !== "roles"}
                className="rp-tab-panel"
              >
                <aside className="rp-panel rp-panel--roles">
                  <div className="rp-panel__head">
                    <h2 className="rp-panel__title">
                      {t("rolesPermissions.roles")}
                    </h2>
                    <button
                      type="button"
                      className="rp-panel__action page-header__btn page-header__btn--primary"
                      onClick={openCreateRole}
                    >
                      {t("rolesPermissions.createRole")}
                    </button>
                  </div>
                  <div className="clients-table-wrap">
                    <table className="clients-table rp-roles-table">
                      <thead>
                        <tr>
                          <th>{t("rolesPermissions.role")}</th>
                          <th className="rp-th--actions">
                            {t("rolesPermissions.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <span className="rp-cell-role">
                                {roleLabel(r)}
                              </span>
                            </td>
                            <td className="rp-td--actions">
                              <div className="rp-table-actions">
                                <button
                                  type="button"
                                  className="clients-filters__btn-icon"
                                  onClick={() => openViewByRole(r)}
                                  title={t(
                                    "rolesPermissions.viewPagePermissions",
                                  )}
                                  aria-label={t(
                                    "rolesPermissions.viewPagePermissions",
                                  )}
                                >
                                  <Eye
                                    className="clients-filters__btn-icon-svg"
                                    size={18}
                                    aria-hidden
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="clients-filters__btn-icon"
                                  onClick={() => openEditRole(r)}
                                  title={t("rolesPermissions.editRole")}
                                  aria-label={t("rolesPermissions.editRole")}
                                >
                                  <Pencil
                                    className="clients-filters__btn-icon-svg"
                                    size={18}
                                    aria-hidden
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="clients-filters__btn-icon rp-btn--danger"
                                  onClick={() => setDeleteRoleId(r.id)}
                                  title={t("rolesPermissions.deleteRole")}
                                  aria-label={t(
                                    "rolesPermissions.deleteRole",
                                  )}
                                >
                                  <Trash2
                                    className="clients-filters__btn-icon-svg"
                                    size={18}
                                    aria-hidden
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </aside>
              </div>
              <div
                role="tabpanel"
                id="panel-pagePermissions"
                aria-labelledby="tab-pagePermissions"
                hidden={activeTab !== "pagePermissions"}
                className="rp-tab-panel"
              >
                <section className="rp-panel rp-panel--permissions">
                  <div className="rp-panel__head">
                    <h2 className="rp-panel__title">
                      {t("rolesPermissions.allPagePermissions")}
                    </h2>
                    <div className="rp-panel__actions">
                      <select
                        value={selectedPermissionRoleId}
                        onChange={(e) => {
                          setSelectedPermissionRoleId(e.target.value)
                          setPermPage(1)
                        }}
                        className="clients-select"
                        aria-label={t('rolesPermissions.role')}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="page-header__btn page-header__btn--primary"
                        onClick={() =>
                          openUpsert({
                            role_id: selectedPermissionRoleId || roles[0]?.id || '',
                            page: '',
                            can_view: true,
                          })
                        }
                        disabled={roles.length === 0}
                      >
                        {t("rolesPermissions.upsertPermission")}
                      </button>
                    </div>
                  </div>
                  {loadingAllPerms ? (
                    <p className="rp-section__loading">
                      {t("rolesPermissions.loading")}
                    </p>
                  ) : filteredPermissions.length === 0 ? (
                    <div className="rp-empty-state rp-empty-state--inline">
                      <p className="clients-empty">
                        {t("rolesPermissions.noPermissionsList")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="clients-table-wrap">
                        <table className="clients-table rp-permissions-table">
                          <thead>
                            <tr>
                              <th>{t("rolesPermissions.role")}</th>
                              <th>{t("rolesPermissions.page")}</th>
                              <th className="rp-th--center">
                                {t("rolesPermissions.canView", "Visible")}
                              </th>
                              <th className="rp-th--actions"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPerms.map((p, i) => (
                              <tr
                                key={
                                  p.id ??
                                  p.role_id + "-" + (p.page ?? "") + "-" + i
                                }
                              >
                                <td>
                                  <span className="rp-cell-role">
                                    {getRoleName(p.role_id)}
                                  </span>
                                </td>
                                <td>
                                  <span className="rp-cell-page">
                                    {pageLabel(p)}
                                  </span>
                                </td>
                                <td className="rp-td--center">
                                  <PermissionBadge on={p.can_view} />
                                </td>
                                <td className="rp-td--actions">
                                  <div className="rp-table-actions">
                                    <button
                                      type="button"
                                      className="clients-filters__btn-icon"
                                      onClick={() => openUpsert(p)}
                                      title={t(
                                        "rolesPermissions.upsertPermission",
                                      )}
                                      aria-label={t(
                                        "rolesPermissions.upsertPermission",
                                      )}
                                    >
                                      <Pencil
                                        className="clients-filters__btn-icon-svg"
                                        size={18}
                                        aria-hidden
                                      />
                                    </button>
                                    {p.id != null && (
                                      <button
                                        type="button"
                                        className="clients-filters__btn-icon rp-btn--danger"
                                        onClick={() =>
                                          setDeletePermissionId(p.id)
                                        }
                                        title={t(
                                          "rolesPermissions.deletePermission",
                                        )}
                                        aria-label={t(
                                          "rolesPermissions.deletePermission",
                                        )}
                                      >
                                        <Trash2
                                          className="clients-filters__btn-icon-svg"
                                          size={18}
                                          aria-hidden
                                        />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
                <footer className="rp-pagination-bar">
                  <div className="rp-pagination-bar__left">
                    <span className="rp-pagination-bar__total">
                      {t("rolesPermissions.total")}: {filteredPermissions.length}
                    </span>
                    <label className="rp-pagination-bar__per-page">
                      <span className="rp-pagination-bar__per-page-label">
                        {t("rolesPermissions.perPage")}
                      </span>
                      <select
                        value={permPerPage}
                        onChange={(e) => {
                          setPermPerPage(Number(e.target.value));
                          setPermPage(1);
                        }}
                        className="clients-select rp-pagination-bar__select"
                        aria-label={t("rolesPermissions.perPage")}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </label>
                  </div>
                  <Pagination
                    currentPage={safePermPage}
                    totalPages={totalPermPages}
                    onPageChange={setPermPage}
                    className="rp-pagination"
                  />
                </footer>
              </div>
            </div>
          </>
        )}

        {showUpsert && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-upsert-modal-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => setShowUpsert(false)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2
                  id="rp-upsert-modal-title"
                  className="client-detail-modal__title"
                >
                  {t("rolesPermissions.upsertPermission")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowUpsert(false)}
                  disabled={upsertSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form
                onSubmit={handleUpsertSubmit}
                className="client-detail-modal__form"
              >
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-grid">
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label htmlFor="upsert-role">
                            {t("rolesPermissions.role")}
                          </label>
                          <select
                            id="upsert-role"
                            value={upsertForm.role_id}
                            onChange={(e) =>
                              setUpsertForm((f) => ({
                                ...f,
                                role_id: e.target.value,
                              }))
                            }
                            required
                            disabled={upsertSubmitting}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label htmlFor="upsert-page">
                            {t("rolesPermissions.page")}
                          </label>
                          <input
                            id="upsert-page"
                            type="text"
                            value={upsertForm.page}
                            onChange={(e) =>
                              setUpsertForm((f) => ({
                                ...f,
                                page: e.target.value,
                              }))
                            }
                            placeholder={t("rolesPermissions.pagePlaceholder")}
                            required
                            disabled={upsertSubmitting}
                          />
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label className="client-detail-modal__form-field--check-label">
                            <input
                              type="checkbox"
                              checked={upsertForm.can_view}
                              onChange={(e) =>
                                setUpsertForm((f) => ({
                                  ...f,
                                  can_view: e.target.checked,
                                }))
                              }
                              disabled={upsertSubmitting}
                            />
                            {t("rolesPermissions.canView", "Visible")}
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowUpsert(false)}
                    disabled={upsertSubmitting}
                  >
                    {t("rolesPermissions.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={upsertSubmitting}
                  >
                    {upsertSubmitting
                      ? t("rolesPermissions.saving")
                      : t("rolesPermissions.save")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deletePermissionId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-delete-perm-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() =>
                !deletePermissionSubmitting && setDeletePermissionId(null)
              }
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-delete-perm-title">
                  {t("rolesPermissions.deletePermission")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setDeletePermissionId(null)}
                  disabled={deletePermissionSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <p>{t("rolesPermissions.deletePermissionConfirm")}</p>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => setDeletePermissionId(null)}
                  disabled={deletePermissionSubmitting}
                >
                  {t("rolesPermissions.cancel")}
                </button>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--danger"
                  onClick={handleDeletePermissionConfirm}
                  disabled={deletePermissionSubmitting}
                >
                  {deletePermissionSubmitting
                    ? t("rolesPermissions.saving")
                    : t("rolesPermissions.deletePermission")}
                </button>
              </footer>
            </div>
          </div>
        )}

        {showCreateRole && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-create-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => !createRoleSubmitting && setShowCreateRole(false)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-create-role-title">
                  {t("rolesPermissions.createRole")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowCreateRole(false)}
                  disabled={createRoleSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form
                onSubmit={handleCreateRoleSubmit}
                className="client-detail-modal__form"
              >
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="create-role-name">{t("rolesPermissions.roleName", "Role code")}</label>
                        <input
                          id="create-role-name"
                          type="text"
                          value={createRoleForm.name}
                          onChange={(e) =>
                            setCreateRoleForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          required
                          disabled={createRoleSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="create-role-name-ar">
                          {t("rolesPermissions.roleNameAr", "Role name (Arabic)")}
                        </label>
                        <input
                          id="create-role-name-ar"
                          type="text"
                          value={createRoleForm.name_ar}
                          onChange={(e) =>
                            setCreateRoleForm((f) => ({
                              ...f,
                              name_ar: e.target.value,
                            }))
                          }
                          required
                          disabled={createRoleSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="create-role-name-en">
                          {t("rolesPermissions.roleNameEn", "Role name (English)")}
                        </label>
                        <input
                          id="create-role-name-en"
                          type="text"
                          value={createRoleForm.name_en}
                          onChange={(e) =>
                            setCreateRoleForm((f) => ({
                              ...f,
                              name_en: e.target.value,
                            }))
                          }
                          required
                          disabled={createRoleSubmitting}
                        />
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowCreateRole(false)}
                    disabled={createRoleSubmitting}
                  >
                    {t("rolesPermissions.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={createRoleSubmitting}
                  >
                    {createRoleSubmitting
                      ? t("rolesPermissions.saving")
                      : t("rolesPermissions.save")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {showEditRole && editRoleId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-edit-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => !editRoleSubmitting && setShowEditRole(false)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-edit-role-title">
                  {t("rolesPermissions.editRole")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowEditRole(false)}
                  disabled={editRoleSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form
                onSubmit={handleEditRoleSubmit}
                className="client-detail-modal__form"
              >
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="edit-role-name">{t("rolesPermissions.roleName", "Role code")}</label>
                        <input
                          id="edit-role-name"
                          type="text"
                          value={editRoleForm.name}
                          onChange={(e) =>
                            setEditRoleForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          required
                          disabled={editRoleSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="edit-role-name-ar">
                          {t("rolesPermissions.roleNameAr", "Role name (Arabic)")}
                        </label>
                        <input
                          id="edit-role-name-ar"
                          type="text"
                          value={editRoleForm.name_ar}
                          onChange={(e) =>
                            setEditRoleForm((f) => ({
                              ...f,
                              name_ar: e.target.value,
                            }))
                          }
                          required
                          disabled={editRoleSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="edit-role-name-en">
                          {t("rolesPermissions.roleNameEn", "Role name (English)")}
                        </label>
                        <input
                          id="edit-role-name-en"
                          type="text"
                          value={editRoleForm.name_en}
                          onChange={(e) =>
                            setEditRoleForm((f) => ({
                              ...f,
                              name_en: e.target.value,
                            }))
                          }
                          required
                          disabled={editRoleSubmitting}
                        />
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowEditRole(false)}
                    disabled={editRoleSubmitting}
                  >
                    {t("rolesPermissions.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={editRoleSubmitting}
                  >
                    {editRoleSubmitting
                      ? t("rolesPermissions.saving")
                      : t("rolesPermissions.save")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deleteRoleId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-delete-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => !deleteRoleSubmitting && setDeleteRoleId(null)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-delete-role-title">
                  {t("rolesPermissions.deleteRole")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setDeleteRoleId(null)}
                  disabled={deleteRoleSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <p>{t("rolesPermissions.deleteRoleConfirm")}</p>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => setDeleteRoleId(null)}
                  disabled={deleteRoleSubmitting}
                >
                  {t("rolesPermissions.cancel")}
                </button>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--danger"
                  onClick={handleDeleteRoleConfirm}
                  disabled={deleteRoleSubmitting}
                >
                  {deleteRoleSubmitting
                    ? t("rolesPermissions.saving")
                    : t("rolesPermissions.deleteRole")}
                </button>
              </footer>
            </div>
          </div>
        )}

        {viewByRoleId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-view-by-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => setViewByRoleId(null)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form client-detail-modal__box--wide">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-view-by-role-title">
                  {t("rolesPermissions.permissionsFor", {
                    role: getRoleName(viewByRoleId),
                  })}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setViewByRoleId(null)}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                {viewByRoleLoading ? (
                  <p className="rp-section__loading">
                    {t("rolesPermissions.loading")}
                  </p>
                ) : viewByRolePerms.length === 0 ? (
                  <p className="rp-empty">
                    {t("rolesPermissions.noPermissions")}
                  </p>
                ) : (
                  <div className="clients-table-wrap">
                    <table className="clients-table">
                      <thead>
                        <tr>
                          <th>{t("rolesPermissions.page")}</th>
                          <th>{t("rolesPermissions.canView")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewByRolePerms.map((p, i) => (
                          <tr key={p.id ?? (p.page ?? "") + "-" + i}>
                            <td>{pageLabel(p)}</td>
                            <td>
                              <PermissionBadge on={p.can_view} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => setViewByRoleId(null)}
                >
                  {t("rolesPermissions.close")}
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
