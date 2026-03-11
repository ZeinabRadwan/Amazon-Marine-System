import { useState, useEffect } from 'react'
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
import { PageHeader } from '../../components/PageHeader'
import { Container } from '../../components/Container'
import { Table, IconActionButton } from '../../components/Table'
import {
  Eye,
  Pencil,
  KeyRound,
  UserCog,
  CheckCircle,
  UserX,
  Trash2,
} from 'lucide-react'
import './Users.css'

export default function Users() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'sales',
    status: 'active',
  })
  const [passwordUserId, setPasswordUserId] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' })
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [roleUserId, setRoleUserId] = useState(null)
  const [roleValue, setRoleValue] = useState('sales')
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [editUserId, setEditUserId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', initials: '', status: 'active', role: 'sales' })
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
    setError('')
    listUsers(token)
      .then((data) => {
        const list = data.data ?? data.users ?? data
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err.message || t('users.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [token])

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCreateSubmitting(true)
    try {
      await createUser(token, createForm)
      setShowCreate(false)
      setCreateForm({ name: '', email: '', password: '', password_confirmation: '', role: 'sales', status: 'active' })
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!passwordUserId) return
    setError('')
    setPasswordSubmitting(true)
    try {
      await changeUserPassword(token, passwordUserId, passwordForm)
      setPasswordUserId(null)
      setPasswordForm({ password: '', password_confirmation: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleRoleSubmit = async (e) => {
    e.preventDefault()
    if (!roleUserId) return
    setError('')
    setRoleSubmitting(true)
    try {
      await assignRole(token, roleUserId, { role: roleValue })
      setRoleUserId(null)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setRoleSubmitting(false)
    }
  }

  const openEdit = (u) => {
    setEditUserId(u.id)
    setEditLoading(true)
    setError('')
    showUser(token, u.id)
      .then((data) => {
        const user = data.data ?? data.user ?? data
        setEditForm({
          name: user.name ?? '',
          email: user.email ?? '',
          initials: user.initials ?? '',
          status: user.status ?? 'active',
          role: user.primary_role ?? user.roles?.[0] ?? user.role ?? 'sales',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setEditLoading(false))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editUserId) return
    setError('')
    setEditSubmitting(true)
    try {
      await updateUser(token, editUserId, editForm)
      setEditUserId(null)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  const openView = (u) => {
    setViewUserId(u.id)
    setViewUser(null)
    setViewLoading(true)
    setError('')
    showUser(token, u.id)
      .then((data) => {
        setViewUser(data.data ?? data.user ?? data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setViewLoading(false))
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return
    setError('')
    setDeleteSubmitting(true)
    try {
      await deleteUser(token, deleteUserId)
      setDeleteUserId(null)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleActivate = async (u) => {
    setError('')
    setToggleStatusUserId(u.id)
    try {
      await activateUser(token, u.id)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setToggleStatusUserId(null)
    }
  }

  const handleDeactivate = async (u) => {
    setError('')
    setToggleStatusUserId(u.id)
    try {
      await deactivateUser(token, u.id)
      loadUsers()
    } catch (err) {
      setError(err.message)
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
      render: (_, u) => u.primary_role ?? u.roles?.[0] ?? '—',
    },
    { key: 'status', label: t('users.status') },
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
              setRoleValue(u.primary_role ?? u.roles?.[0] ?? 'sales')
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

  return (
    <Container size="xl">
      <div className="users-page">
        <PageHeader
        title={t('users.title')}
        breadcrumbs={[
          { label: t('pageHeader.home'), href: '/' },
          { label: t('pageHeader.system'), href: '/users' },
          { label: t('users.title') },
        ]}
        actions={
          <button
            type="button"
            className="page-header__btn page-header__btn--primary"
            onClick={() => setShowCreate(true)}
          >
            {t('users.createUser')}
          </button>
        }
      />
      {error && <div className="users-error" role="alert">{error}</div>}

      {loading ? (
        <p>{t('users.loading')}</p>
      ) : users.length === 0 ? (
        <p className="users-empty">{t('users.noUsers')}</p>
      ) : (
        <Table
          columns={userColumns}
          data={users}
          getRowKey={(u) => u.id ?? u.email}
          emptyMessage={t('users.noUsers')}
        />
      )}

      {showCreate && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal-backdrop" onClick={() => setShowCreate(false)} />
          <div className="users-modal-content">
            <h2>{t('users.createUser')}</h2>
            <form onSubmit={handleCreateSubmit} className="users-form">
              <div className="users-field">
                <label>{t('users.name')}</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  disabled={createSubmitting}
                />
              </div>
              <div className="users-field">
                <label>{t('users.email')}</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  disabled={createSubmitting}
                />
              </div>
              <div className="users-field">
                <label>{t('users.password')}</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  disabled={createSubmitting}
                />
              </div>
              <div className="users-field">
                <label>{t('users.confirmPassword')}</label>
                <input
                  type="password"
                  value={createForm.password_confirmation}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                  required
                  disabled={createSubmitting}
                />
              </div>
              <div className="users-field">
                <label>{t('users.role')}</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  disabled={createSubmitting}
                >
                  <option value="admin">admin</option>
                  <option value="sales">sales</option>
                  <option value="user">user</option>
                </select>
              </div>
              <div className="users-field">
                <label>{t('users.status')}</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  disabled={createSubmitting}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div className="users-modal-actions">
                <button type="button" className="users-btn" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
                  {t('users.cancel')}
                </button>
                <button type="submit" className="users-btn users-btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? t('users.saving') : t('users.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordUserId && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal-backdrop" onClick={() => setPasswordUserId(null)} />
          <div className="users-modal-content">
            <h2>{t('users.changePassword')}</h2>
            <form onSubmit={handlePasswordSubmit} className="users-form">
              <div className="users-field">
                <label>{t('users.newPassword')}</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  disabled={passwordSubmitting}
                />
              </div>
              <div className="users-field">
                <label>{t('users.confirmPassword')}</label>
                <input
                  type="password"
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                  required
                  disabled={passwordSubmitting}
                />
              </div>
              <div className="users-modal-actions">
                <button type="button" className="users-btn" onClick={() => setPasswordUserId(null)} disabled={passwordSubmitting}>
                  {t('users.cancel')}
                </button>
                <button type="submit" className="users-btn users-btn--primary" disabled={passwordSubmitting}>
                  {passwordSubmitting ? t('users.saving') : t('users.updatePassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleUserId && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal-backdrop" onClick={() => setRoleUserId(null)} />
          <div className="users-modal-content">
            <h2>{t('users.assignRole')}</h2>
            <form onSubmit={handleRoleSubmit} className="users-form">
              <div className="users-field">
                <label>{t('users.role')}</label>
                <select
                  value={roleValue}
                  onChange={(e) => setRoleValue(e.target.value)}
                  disabled={roleSubmitting}
                >
                  <option value="admin">admin</option>
                  <option value="sales">sales</option>
                  <option value="user">user</option>
                </select>
              </div>
              <div className="users-modal-actions">
                <button type="button" className="users-btn" onClick={() => setRoleUserId(null)} disabled={roleSubmitting}>
                  {t('users.cancel')}
                </button>
                <button type="submit" className="users-btn users-btn--primary" disabled={roleSubmitting}>
                  {roleSubmitting ? t('users.saving') : t('users.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUserId && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal-backdrop" onClick={() => !editSubmitting && setEditUserId(null)} />
          <div className="users-modal-content">
            <h2>{t('users.editUser')}</h2>
            {editLoading ? (
              <p>{t('users.loading')}</p>
            ) : (
              <form onSubmit={handleEditSubmit} className="users-form">
                <div className="users-field">
                  <label>{t('users.name')}</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    disabled={editSubmitting}
                  />
                </div>
                <div className="users-field">
                  <label>{t('users.email')}</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    disabled={editSubmitting}
                  />
                </div>
                <div className="users-field">
                  <label>{t('users.initials')}</label>
                  <input
                    type="text"
                    value={editForm.initials}
                    onChange={(e) => setEditForm((f) => ({ ...f, initials: e.target.value }))}
                    placeholder="e.g. UN"
                    disabled={editSubmitting}
                  />
                </div>
                <div className="users-field">
                  <label>{t('users.role')}</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    disabled={editSubmitting}
                  >
                    <option value="admin">admin</option>
                    <option value="sales">sales</option>
                    <option value="user">user</option>
                  </select>
                </div>
                <div className="users-field">
                  <label>{t('users.status')}</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    disabled={editSubmitting}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
                <div className="users-modal-actions">
                  <button type="button" className="users-btn" onClick={() => setEditUserId(null)} disabled={editSubmitting}>
                    {t('users.cancel')}
                  </button>
                  <button type="submit" className="users-btn users-btn--primary" disabled={editSubmitting}>
                    {editSubmitting ? t('users.saving') : t('users.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {viewUserId && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal-backdrop" onClick={() => setViewUserId(null)} />
          <div className="users-modal-content">
            <h2>{t('users.viewUser')}</h2>
            {viewLoading ? (
              <p>{t('users.loading')}</p>
            ) : viewUser ? (
              <div className="users-view">
                <p><strong>{t('users.name')}:</strong> {viewUser.name ?? '—'}</p>
                <p><strong>{t('users.email')}:</strong> {viewUser.email ?? '—'}</p>
                <p><strong>{t('users.initials')}:</strong> {viewUser.initials ?? '—'}</p>
                <p><strong>{t('users.role')}:</strong> {viewUser.primary_role ?? viewUser.roles?.[0] ?? viewUser.role ?? '—'}</p>
                <p><strong>{t('users.status')}:</strong> {viewUser.status ?? '—'}</p>
                <div className="users-modal-actions">
                  <button type="button" className="users-btn" onClick={() => setViewUserId(null)}>
                    {t('users.close')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {deleteUserId && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal-backdrop" onClick={() => !deleteSubmitting && setDeleteUserId(null)} />
          <div className="users-modal-content">
            <h2>{t('users.deleteUser')}</h2>
            <p>{t('users.deleteConfirm')}</p>
            <div className="users-modal-actions">
              <button type="button" className="users-btn" onClick={() => setDeleteUserId(null)} disabled={deleteSubmitting}>
                {t('users.cancel')}
              </button>
              <button
                type="button"
                className="users-btn users-btn--danger"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? t('users.saving') : t('users.deleteConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Container>
  )
}
