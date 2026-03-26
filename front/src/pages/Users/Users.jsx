import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listUsers,
  createUser,
  showUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  changeUserPassword,
  assignRole,
} from '../../api/users'
import { listRoles } from '../../api/roles'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import {
  Eye,
  Pencil,
  KeyRound,
  UserCog,
  CheckCircle,
  UserX,
  Trash2,
  Search,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/ClientDetailModal.css'
import './Users.css'

export default function Users() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    q: '',
    role: '',
    status: '',
    sort: 'name',
    direction: 'asc',
    page: 1,
    per_page: 10,
  })
  const [showSort, setShowSort] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
    status: 'active',
  })
  const [passwordUserId, setPasswordUserId] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' })
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [roleUserId, setRoleUserId] = useState(null)
  const [roleValue, setRoleValue] = useState('')
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [editUserId, setEditUserId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', initials: '', status: 'active', role_id: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [viewUserId, setViewUserId] = useState(null)
  const [viewUser, setViewUser] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [toggleStatusUserId, setToggleStatusUserId] = useState(null)

  const loadUsers = () => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listUsers(token)
      .then((data) => {
        const list = data.data ?? data.users ?? data
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('users.error') }))
      .finally(() => setLoading(false))
  }

  const filteredAndSortedUsers = useMemo(() => {
    let list = [...users]
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase().trim()
      list = list.filter(
        (u) =>
          (u.name ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.role) {
      list = list.filter((u) => {
        const roleName = u.primary_role ?? u.roles?.[0] ?? u.role ?? ''
        const roleId = getRoleIdByName(roleName)
        return String(roleId) === String(filters.role)
      })
    }
    if (filters.status) {
      list = list.filter((u) => (u.status ?? '') === filters.status)
    }
    const key = filters.sort === 'name' ? 'name' : 'email'
    list.sort((a, b) => {
      const va = (a[key] ?? '').toString().toLowerCase()
      const vb = (b[key] ?? '').toString().toLowerCase()
      const cmp = va.localeCompare(vb)
      return filters.direction === 'asc' ? cmp : -cmp
    })
    return list
  }, [users, filters.q, filters.role, filters.status, filters.sort, filters.direction])

  const totalFiltered = filteredAndSortedUsers.length
  const lastPage = Math.max(1, Math.ceil(totalFiltered / (filters.per_page || 10)))
  const currentPage = Math.min(Math.max(1, filters.page), lastPage)
  const paginatedUsers = useMemo(() => {
    const per = filters.per_page || 10
    const start = (currentPage - 1) * per
    return filteredAndSortedUsers.slice(start, start + per)
  }, [filteredAndSortedUsers, currentPage, filters.per_page])

  const roleOptions = roles.map((r) => ({ value: String(r.id), role: r }))
  const getRoleLabel = (value) => {
    const role = roles.find((r) => r.name === value || String(r.id) === String(value))
    if (!role) return value || '—'
    return i18n.language === 'ar'
      ? role.name_ar || role.name_en || role.name
      : role.name_en || role.name_ar || role.name
  }

  const getRoleIdByName = (name) => {
    const role = roles.find((r) => r.name === name)
    return role ? String(role.id) : ''
  }

  useEffect(() => {
    loadUsers()
    if (token) {
      listRoles(token)
        .then((data) => {
          const list = data.data ?? data.roles ?? data
          setRoles(Array.isArray(list) ? list : [])
        })
        .catch(() => setRoles([]))
    }
  }, [token])

  useEffect(() => {
    if (roles.length === 0) return
    if (!createForm.role_id) {
      setCreateForm((f) => ({ ...f, role_id: String(roles[0].id) }))
    }
  }, [roles, createForm.role_id])

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    setCreateSubmitting(true)
    try {
      await createUser(token, createForm)
      setShowCreate(false)
      setCreateForm({ name: '', email: '', password: '', password_confirmation: '', role_id: roles[0] ? String(roles[0].id) : '', status: 'active' })
      loadUsers()
      setAlert({ type: 'success', message: t('users.userCreated') })
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!passwordUserId) return
    setAlert(null)
    setPasswordSubmitting(true)
    try {
      await changeUserPassword(token, passwordUserId, passwordForm)
      setPasswordUserId(null)
      setPasswordForm({ password: '', password_confirmation: '' })
      setAlert({ type: 'success', message: t('users.passwordUpdated') })
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleRoleSubmit = async (e) => {
    e.preventDefault()
    if (!roleUserId) return
    setAlert(null)
    setRoleSubmitting(true)
    try {
      await assignRole(token, roleUserId, { role_id: Number(roleValue) })
      setRoleUserId(null)
      loadUsers()
      setAlert({ type: 'success', message: t('users.roleAssigned') })
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setRoleSubmitting(false)
    }
  }

  const openEdit = (u) => {
    setEditUserId(u.id)
    setEditLoading(true)
    setAlert(null)
    showUser(token, u.id)
      .then((data) => {
        const user = data.data ?? data.user ?? data
        setEditForm({
          name: user.name ?? '',
          email: user.email ?? '',
          initials: user.initials ?? '',
          status: user.status ?? 'active',
          role_id: getRoleIdByName(user.primary_role ?? user.roles?.[0] ?? user.role ?? ''),
        })
      })
      .catch(() => setAlert({ type: 'error', message: t('users.error') }))
      .finally(() => setEditLoading(false))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editUserId) return
    setAlert(null)
    setEditSubmitting(true)
    try {
      await updateUser(token, editUserId, {
        ...editForm,
        role_id: Number(editForm.role_id),
      })
      setEditUserId(null)
      loadUsers()
      setAlert({ type: 'success', message: t('users.userUpdated', 'User updated.') })
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const openView = (u) => {
    setViewUserId(u.id)
    setViewUser(null)
    setViewLoading(true)
    setAlert(null)
    showUser(token, u.id)
      .then((data) => {
        setViewUser(data.data ?? data.user ?? data)
      })
      .catch(() => setAlert({ type: 'error', message: t('users.error') }))
      .finally(() => setViewLoading(false))
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return
    setAlert(null)
    setDeleteSubmitting(true)
    try {
      await deleteUser(token, deleteUserId)
      setDeleteUserId(null)
      loadUsers()
      setAlert({ type: 'success', message: t('users.userDeleted', 'User deleted.') })
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleActivate = async (u) => {
    setAlert(null)
    setToggleStatusUserId(u.id)
    try {
      await activateUser(token, u.id)
      loadUsers()
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setToggleStatusUserId(null)
    }
  }

  const handleDeactivate = async (u) => {
    setAlert(null)
    setToggleStatusUserId(u.id)
    try {
      await deactivateUser(token, u.id)
      loadUsers()
    } catch {
      setAlert({ type: 'error', message: t('users.error') })
    } finally {
      setToggleStatusUserId(null)
    }
  }

  const userColumns = [
    { key: 'name', label: t('users.name') },
    { key: 'email', label: t('users.email') },
    {
      key: 'role',
      label: t('users.role'),
      render: (_, u) => getRoleLabel(u.primary_role ?? u.roles?.[0] ?? u.role),
    },
    {
      key: 'status',
      label: t('users.status'),
      render: (_, u) => {
        const status = u.status ?? '—'
        const variant = status === 'active' ? 'active' : status === 'inactive' || status === 'suspended' ? 'inactive' : 'default'
        return (
          <span className={`users-status-badge users-status-badge--${variant}`} title={status}>
            {status === 'active' ? t('users.statusActive', 'Active') : status === 'inactive' || status === 'suspended' ? t('users.statusInactive', 'Inactive') : status}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: t('users.actions'),
      render: (_, u) => (
        <div className="users-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('users.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('users.viewUser')}
            onClick={() => openView(u)}
          />
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('users.editUser')}
            onClick={() => openEdit(u)}
          />
          <IconActionButton
            icon={<KeyRound className="h-4 w-4" />}
            label={t('users.changePassword')}
            onClick={() => {
              setPasswordUserId(u.id)
              setPasswordForm({ password: '', password_confirmation: '' })
            }}
          />
          <IconActionButton
            icon={<UserCog className="h-4 w-4" />}
            label={t('users.assignRole')}
            onClick={() => {
              setRoleUserId(u.id)
              setRoleValue(getRoleIdByName(u.primary_role ?? u.roles?.[0] ?? '') || (roles[0] ? String(roles[0].id) : ''))
            }}
          />
          {(u.status === 'inactive' || u.status === 'suspended') ? (
            <IconActionButton
              icon={<CheckCircle className="h-4 w-4" />}
              label={t('users.activate')}
              onClick={() => handleActivate(u)}
              disabled={toggleStatusUserId === u.id}
              variant="success"
            />
          ) : (
            <IconActionButton
              icon={<UserX className="h-4 w-4" />}
              label={t('users.deactivate')}
              onClick={() => handleDeactivate(u)}
              disabled={toggleStatusUserId === u.id}
              variant="danger"
            />
          )}
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('users.deleteUser')}
            onClick={() => setDeleteUserId(u.id)}
            variant="danger"
          />
        </div>
      ),
    },
  ]

  const pageLoading = loading || createSubmitting || editSubmitting || deleteSubmitting || passwordSubmitting || roleSubmitting

  return (
    <Container size="xl">
      <div className="users-page">
      {pageLoading && (
        <div className="users-page-loader" aria-live="polite" aria-busy="true">
          <LoaderDots />
        </div>
      )}

      <div className="users-filters-card">
        <div className="users-filters__row users-filters__row--main">
          <div className="users-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Search className="users-filters__search-icon" aria-hidden />
            <input
              type="search"
              placeholder={t('users.searchPlaceholder', t('users.search', 'Search'))}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              className="users-input users-filters__search"
              aria-label={t('users.search', 'Search')}
            />
          </div>
          <div className="users-filters__fields">
            <select
              value={filters.role ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))}
              className="users-input"
              aria-label={t('users.role')}
            >
              <option value="">{t('users.roleAll', 'All roles')}</option>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {getRoleLabel(opt.value)}
                </option>
              ))}
            </select>
            <select
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="users-input"
              aria-label={t('users.status')}
            >
              <option value="">{t('users.statusAll', 'All statuses')}</option>
              <option value="active">{t('users.statusActive', 'Active')}</option>
              <option value="inactive">{t('users.statusInactive', 'Inactive')}</option>
            </select>
          </div>
          <button
            type="button"
            className="users-filters__clear users-filters__btn-icon"
            onClick={() => setFilters({ q: '', role: '', status: '', sort: 'name', direction: 'asc', page: 1, per_page: filters.per_page })}
            aria-label={t('users.clearFilters', 'Clear filters')}
            title={t('users.clearFilters', 'Clear filters')}
          >
            <RotateCcw className="users-filters__btn-icon-svg" aria-hidden />
          </button>
          <button
            type="button"
            className="users-filters__sort-toggle users-filters__btn-icon"
            onClick={() => setShowSort((v) => !v)}
            aria-expanded={showSort}
            aria-controls="users-sort-panel"
            id="users-sort-toggle"
            title={t('users.sortBy', 'Sort by')}
          >
            <ArrowUpDown className="users-filters__btn-icon-svg" aria-hidden />
            {showSort ? <ChevronUp className="users-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="users-filters__sort-toggle-chevron" aria-hidden />}
          </button>
          <div className="users-filters__actions">
            <button
              type="button"
              className="page-header__btn page-header__btn--primary"
              onClick={() => setShowCreate(true)}
            >
              {t('users.createUser')}
            </button>
          </div>
        </div>
        <div
          id="users-sort-panel"
          className="users-filters__row users-filters__row--sort"
          role="region"
          aria-labelledby="users-sort-toggle"
          hidden={!showSort}
        >
          <div className="users-filters__sort-group">
            <label className="users-filters__sort-label" htmlFor="users-sort-by">
              {t('users.sortBy', 'Sort by')}
            </label>
            <select
              id="users-sort-by"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="users-select"
              aria-label={t('users.sortBy', 'Sort by')}
            >
              <option value="name">{t('users.name')}</option>
              <option value="email">{t('users.email')}</option>
            </select>
            <select
              value={filters.direction}
              onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
              className="users-select users-filters__direction"
              aria-label={t('users.sortOrder', 'Sort order')}
            >
              <option value="asc">{t('users.directionAsc', 'Ascending')}</option>
              <option value="desc">{t('users.directionDesc', 'Descending')}</option>
            </select>
          </div>
        </div>
      </div>

      {alert && (
        <Alert
          variant={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {filteredAndSortedUsers.length === 0 ? (
        <p className="users-empty">{t('users.noUsers')}</p>
      ) : (
        <>
          <Table
            columns={userColumns}
            data={paginatedUsers}
            getRowKey={(u) => u.id ?? u.email}
            emptyMessage={t('users.noUsers')}
            sortKey={filters.sort}
            sortDirection={filters.direction}
            onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction }))}
          />
          {lastPage > 0 && (
            <div className="users-pagination">
              <div className="users-pagination__left">
                <span className="users-pagination__total">
                  {t('users.total', 'Total')}: {totalFiltered}
                </span>
                <label className="users-pagination__per-page">
                  <span className="users-pagination__per-page-label">{t('users.perPage', 'Per page')}</span>
                  <select
                    value={filters.per_page}
                    onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                    className="users-select users-pagination__select"
                    aria-label={t('users.perPage', 'Per page')}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={lastPage}
                onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
              />
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="users-create-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => setShowCreate(false)} />
          <div className="client-detail-modal__box client-detail-modal__box--form">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="users-create-modal-title" className="client-detail-modal__title">
                {t('users.createUser')}
              </h2>
              <button
                type="button"
                className="client-detail-modal__close"
                onClick={() => setShowCreate(false)}
                disabled={createSubmitting}
                aria-label={t('users.close')}
              >
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <div className="client-detail-modal__body-inner">
                  <section className="client-detail-modal__section">
                    <div className="client-detail-modal__form-grid">
                      <div className="client-detail-modal__form-field">
                        <label htmlFor="create-user-name">{t('users.name')}</label>
                        <input
                          id="create-user-name"
                          type="text"
                          value={createForm.name}
                          onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                          required
                          disabled={createSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field">
                        <label htmlFor="create-user-email">{t('users.email')}</label>
                        <input
                          id="create-user-email"
                          type="email"
                          value={createForm.email}
                          onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                          required
                          disabled={createSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field">
                        <label htmlFor="create-user-password">{t('users.password')}</label>
                        <input
                          id="create-user-password"
                          type="password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                          required
                          disabled={createSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field">
                        <label htmlFor="create-user-password-confirm">{t('users.confirmPassword')}</label>
                        <input
                          id="create-user-password-confirm"
                          type="password"
                          value={createForm.password_confirmation}
                          onChange={(e) => setCreateForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                          required
                          disabled={createSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field">
                        <label htmlFor="create-user-role">{t('users.role')}</label>
                        <select
                          id="create-user-role"
                          value={createForm.role_id}
                          onChange={(e) => setCreateForm((f) => ({ ...f, role_id: e.target.value }))}
                          disabled={createSubmitting}
                          required
                        >
                          {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {getRoleLabel(opt.value)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="client-detail-modal__form-field">
                        <label htmlFor="create-user-status">{t('users.status')}</label>
                        <select
                          id="create-user-status"
                          value={createForm.status}
                          onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                          disabled={createSubmitting}
                        >
                          <option value="active">{t('users.statusActive', 'Active')}</option>
                          <option value="inactive">{t('users.statusInactive', 'Inactive')}</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
                  {t('users.cancel')}
                </button>
                <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? t('users.saving') : t('users.save')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {passwordUserId && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="users-password-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => setPasswordUserId(null)} />
          <div className="client-detail-modal__box client-detail-modal__box--form">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="users-password-modal-title" className="client-detail-modal__title">{t('users.changePassword')}</h2>
              <button type="button" className="client-detail-modal__close" onClick={() => setPasswordUserId(null)} disabled={passwordSubmitting} aria-label={t('users.close')}>
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            <form onSubmit={handlePasswordSubmit} className="client-detail-modal__form">
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <div className="client-detail-modal__body-inner">
                  <section className="client-detail-modal__section">
                    <div className="client-detail-modal__form-grid">
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="password-new">{t('users.newPassword')}</label>
                        <input id="password-new" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))} required disabled={passwordSubmitting} />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="password-confirm">{t('users.confirmPassword')}</label>
                        <input id="password-confirm" type="password" value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm((f) => ({ ...f, password_confirmation: e.target.value }))} required disabled={passwordSubmitting} />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setPasswordUserId(null)} disabled={passwordSubmitting}>{t('users.cancel')}</button>
                <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={passwordSubmitting}>{passwordSubmitting ? t('users.saving') : t('users.updatePassword')}</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {roleUserId && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="users-role-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => setRoleUserId(null)} />
          <div className="client-detail-modal__box client-detail-modal__box--form">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="users-role-modal-title" className="client-detail-modal__title">{t('users.assignRole')}</h2>
              <button type="button" className="client-detail-modal__close" onClick={() => setRoleUserId(null)} disabled={roleSubmitting} aria-label={t('users.close')}>
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            <form onSubmit={handleRoleSubmit} className="client-detail-modal__form">
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <div className="client-detail-modal__body-inner">
                  <section className="client-detail-modal__section">
                    <div className="client-detail-modal__form-grid">
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="role-select">{t('users.role')}</label>
                        <select id="role-select" value={roleValue} onChange={(e) => setRoleValue(e.target.value)} disabled={roleSubmitting}>
                          {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {getRoleLabel(opt.value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setRoleUserId(null)} disabled={roleSubmitting}>{t('users.cancel')}</button>
                <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={roleSubmitting}>{roleSubmitting ? t('users.saving') : t('users.save')}</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {editUserId && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="users-edit-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => !editSubmitting && setEditUserId(null)} />
          <div className="client-detail-modal__box client-detail-modal__box--form">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="users-edit-modal-title" className="client-detail-modal__title">{t('users.editUser')}</h2>
              <button type="button" className="client-detail-modal__close" onClick={() => setEditUserId(null)} disabled={editSubmitting} aria-label={t('users.close')}>
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            {editLoading ? (
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <p className="client-detail-modal__empty">{t('users.loading')}</p>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-grid">
                        <div className="client-detail-modal__form-field">
                          <label htmlFor="edit-user-name">{t('users.name')}</label>
                          <input id="edit-user-name" type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required disabled={editSubmitting} />
                        </div>
                        <div className="client-detail-modal__form-field">
                          <label htmlFor="edit-user-email">{t('users.email')}</label>
                          <input id="edit-user-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required disabled={editSubmitting} />
                        </div>
                        <div className="client-detail-modal__form-field">
                          <label htmlFor="edit-user-initials">{t('users.initials')}</label>
                          <input id="edit-user-initials" type="text" value={editForm.initials} onChange={(e) => setEditForm((f) => ({ ...f, initials: e.target.value }))} placeholder="e.g. UN" disabled={editSubmitting} />
                        </div>
                        <div className="client-detail-modal__form-field">
                          <label htmlFor="edit-user-role">{t('users.role')}</label>
                          <select id="edit-user-role" value={editForm.role_id} onChange={(e) => setEditForm((f) => ({ ...f, role_id: e.target.value }))} disabled={editSubmitting}>
                            {roleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {getRoleLabel(opt.value)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="client-detail-modal__form-field">
                          <label htmlFor="edit-user-status">{t('users.status')}</label>
                          <select id="edit-user-status" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={editSubmitting}>
                            <option value="active">{t('users.statusActive', 'Active')}</option>
                            <option value="inactive">{t('users.statusInactive', 'Inactive')}</option>
                          </select>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setEditUserId(null)} disabled={editSubmitting}>{t('users.cancel')}</button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>{editSubmitting ? t('users.saving') : t('users.save')}</button>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}

      {viewUserId && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="users-view-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => setViewUserId(null)} />
          <div className="client-detail-modal__box">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="users-view-modal-title" className="client-detail-modal__title">{t('users.viewUser')}</h2>
              <button type="button" className="client-detail-modal__close" onClick={() => setViewUserId(null)} aria-label={t('users.close')}>
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            {viewLoading ? (
              <div className="client-detail-modal__body"><p className="client-detail-modal__empty">{t('users.loading')}</p></div>
            ) : viewUser ? (
              <>
                <div className="client-detail-modal__body">
                  <section className="client-detail-modal__section">
                    <div className="client-detail-modal__grid">
                      <div className="client-detail-modal__row"><span className="client-detail-modal__label">{t('users.name')}</span><span className="client-detail-modal__value">{viewUser.name ?? '—'}</span></div>
                      <div className="client-detail-modal__row"><span className="client-detail-modal__label">{t('users.email')}</span><span className="client-detail-modal__value">{viewUser.email ?? '—'}</span></div>
                      <div className="client-detail-modal__row"><span className="client-detail-modal__label">{t('users.initials')}</span><span className="client-detail-modal__value">{viewUser.initials ?? '—'}</span></div>
                      <div className="client-detail-modal__row"><span className="client-detail-modal__label">{t('users.role')}</span><span className="client-detail-modal__value">{getRoleLabel(viewUser.primary_role ?? viewUser.roles?.[0] ?? viewUser.role)}</span></div>
                      <div className="client-detail-modal__row"><span className="client-detail-modal__label">{t('users.status')}</span><span className="client-detail-modal__value">{viewUser.status ?? '—'}</span></div>
                    </div>
                  </section>
                </div>
                <footer className="client-detail-modal__footer">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--primary" onClick={() => setViewUserId(null)}>{t('users.close')}</button>
                </footer>
              </>
            ) : null}
          </div>
        </div>
      )}

      {deleteUserId && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="users-delete-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => !deleteSubmitting && setDeleteUserId(null)} />
          <div className="client-detail-modal__box">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="users-delete-modal-title" className="client-detail-modal__title">{t('users.deleteUser')}</h2>
              <button type="button" className="client-detail-modal__close" onClick={() => setDeleteUserId(null)} disabled={deleteSubmitting} aria-label={t('users.close')}>
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            <div className="client-detail-modal__body">
              <p className="client-detail-modal__empty">{t('users.deleteConfirm')}</p>
            </div>
            <footer className="client-detail-modal__footer">
              <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setDeleteUserId(null)} disabled={deleteSubmitting}>{t('users.cancel')}</button>
              <button type="button" className="client-detail-modal__btn client-detail-modal__btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>{deleteSubmitting ? t('users.saving') : t('users.deleteConfirmButton')}</button>
            </footer>
          </div>
        </div>
      )}
      </div>
    </Container>
  )
}
