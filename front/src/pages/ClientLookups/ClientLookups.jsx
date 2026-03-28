import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listCompanyTypes,
  createCompanyType,
  showCompanyType,
  updateCompanyType,
  deleteCompanyType,
  listPreferredCommMethods,
  createPreferredCommMethod,
  showPreferredCommMethod,
  updatePreferredCommMethod,
  deletePreferredCommMethod,
  listClientStatuses,
  createClientStatus,
  showClientStatus,
  updateClientStatus,
  deleteClientStatus,
} from '../../api/clientLookups'
import { Container } from '../../components/Container'
import { localizedStatusLabel } from '../../utils/localizedStatusLabel'
import './ClientLookups.css'

export default function ClientLookups() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const [tab, setTab] = useState('companyTypes')

  const [companyTypes, setCompanyTypes] = useState([])
  const [companyTypesLoading, setCompanyTypesLoading] = useState(true)
  const [commMethods, setCommMethods] = useState([])
  const [commMethodsLoading, setCommMethodsLoading] = useState(true)
  const [error, setError] = useState('')

  const [ctCreateOpen, setCtCreateOpen] = useState(false)
  const [ctCreateForm, setCtCreateForm] = useState({ name: '', sort_order: 1 })
  const [ctCreateSubmitting, setCtCreateSubmitting] = useState(false)
  const [ctViewId, setCtViewId] = useState(null)
  const [ctViewItem, setCtViewItem] = useState(null)
  const [ctViewLoading, setCtViewLoading] = useState(false)
  const [ctEditId, setCtEditId] = useState(null)
  const [ctEditForm, setCtEditForm] = useState({ name: '', sort_order: 1 })
  const [ctEditLoading, setCtEditLoading] = useState(false)
  const [ctEditSubmitting, setCtEditSubmitting] = useState(false)
  const [ctDeleteId, setCtDeleteId] = useState(null)
  const [ctDeleteSubmitting, setCtDeleteSubmitting] = useState(false)

  const [cmCreateOpen, setCmCreateOpen] = useState(false)
  const [cmCreateForm, setCmCreateForm] = useState({ name: '', sort_order: 1 })
  const [cmCreateSubmitting, setCmCreateSubmitting] = useState(false)
  const [cmViewId, setCmViewId] = useState(null)
  const [cmViewItem, setCmViewItem] = useState(null)
  const [cmViewLoading, setCmViewLoading] = useState(false)
  const [cmEditId, setCmEditId] = useState(null)
  const [cmEditForm, setCmEditForm] = useState({ name: '', sort_order: 1 })
  const [cmEditLoading, setCmEditLoading] = useState(false)
  const [cmEditSubmitting, setCmEditSubmitting] = useState(false)
  const [cmDeleteId, setCmDeleteId] = useState(null)
  const [cmDeleteSubmitting, setCmDeleteSubmitting] = useState(false)

  const [clientStatuses, setClientStatuses] = useState([])
  const [clientStatusesLoading, setClientStatusesLoading] = useState(true)
  const [csCreateOpen, setCsCreateOpen] = useState(false)
  const [csCreateForm, setCsCreateForm] = useState({ name_ar: '', name_en: '', sort_order: 1, applies_to: 'lead' })
  const [csCreateSubmitting, setCsCreateSubmitting] = useState(false)
  const [csViewId, setCsViewId] = useState(null)
  const [csViewItem, setCsViewItem] = useState(null)
  const [csViewLoading, setCsViewLoading] = useState(false)
  const [csEditId, setCsEditId] = useState(null)
  const [csEditForm, setCsEditForm] = useState({ name_ar: '', name_en: '', sort_order: 1, applies_to: 'client' })
  const [csEditLoading, setCsEditLoading] = useState(false)
  const [csEditSubmitting, setCsEditSubmitting] = useState(false)
  const [csDeleteId, setCsDeleteId] = useState(null)
  const [csDeleteSubmitting, setCsDeleteSubmitting] = useState(false)

  const loadCompanyTypes = () => {
    if (!token) return
    setCompanyTypesLoading(true)
    setError('')
    listCompanyTypes(token)
      .then((data) => {
        const list = data.data ?? data.company_types ?? data
        setCompanyTypes(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err.message || t('clientLookups.error')))
      .finally(() => setCompanyTypesLoading(false))
  }

  const loadCommMethods = () => {
    if (!token) return
    setCommMethodsLoading(true)
    setError('')
    listPreferredCommMethods(token)
      .then((data) => {
        const list = data.data ?? data.preferred_comm_methods ?? data
        setCommMethods(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err.message || t('clientLookups.error')))
      .finally(() => setCommMethodsLoading(false))
  }

  const loadClientStatuses = () => {
    if (!token) return
    setClientStatusesLoading(true)
    setError('')
    listClientStatuses(token)
      .then((data) => {
        const list = data.data ?? data.client_statuses ?? data
        setClientStatuses(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err.message || t('clientLookups.error')))
      .finally(() => setClientStatusesLoading(false))
  }

  useEffect(() => { loadCompanyTypes() }, [token])
  useEffect(() => { loadCommMethods() }, [token])
  useEffect(() => { loadClientStatuses() }, [token])

  const openCsView = (id) => {
    setCsViewId(id)
    setCsViewItem(null)
    setCsViewLoading(true)
    setError('')
    showClientStatus(token, id)
      .then((data) => setCsViewItem(data.data ?? data.client_status ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setCsViewLoading(false))
  }

  const openCsEdit = (id) => {
    setCsEditId(id)
    setCsEditLoading(true)
    setError('')
    showClientStatus(token, id)
      .then((data) => {
        const item = data.data ?? data.client_status ?? data
        setCsEditForm({
          name_ar: item.name_ar ?? item.name ?? '',
          name_en: item.name_en ?? item.name ?? '',
          sort_order: item.sort_order ?? 1,
          applies_to: item.applies_to === 'client' ? 'client' : 'lead',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setCsEditLoading(false))
  }

  const handleCsCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCsCreateSubmitting(true)
    try {
      await createClientStatus(token, {
        name_ar: csCreateForm.name_ar.trim(),
        name_en: csCreateForm.name_en.trim(),
        sort_order: Number(csCreateForm.sort_order) || 1,
        applies_to: csCreateForm.applies_to === 'client' ? 'client' : 'lead',
      })
      setCsCreateOpen(false)
      setCsCreateForm({ name_ar: '', name_en: '', sort_order: 1, applies_to: 'lead' })
      loadClientStatuses()
    } catch (err) {
      setError(err.message)
    } finally {
      setCsCreateSubmitting(false)
    }
  }

  const handleCsEditSubmit = async (e) => {
    e.preventDefault()
    if (!csEditId) return
    setError('')
    setCsEditSubmitting(true)
    try {
      await updateClientStatus(token, csEditId, {
        name_ar: csEditForm.name_ar.trim(),
        name_en: csEditForm.name_en.trim(),
        sort_order: Number(csEditForm.sort_order) ?? 1,
        applies_to: csEditForm.applies_to === 'client' ? 'client' : 'lead',
      })
      setCsEditId(null)
      loadClientStatuses()
    } catch (err) {
      setError(err.message)
    } finally {
      setCsEditSubmitting(false)
    }
  }

  const handleCsDeleteConfirm = async () => {
    if (!csDeleteId) return
    setError('')
    setCsDeleteSubmitting(true)
    try {
      await deleteClientStatus(token, csDeleteId)
      setCsDeleteId(null)
      loadClientStatuses()
    } catch (err) {
      setError(err.message)
    } finally {
      setCsDeleteSubmitting(false)
    }
  }

  const openCtView = (id) => {
    setCtViewId(id)
    setCtViewItem(null)
    setCtViewLoading(true)
    setError('')
    showCompanyType(token, id)
      .then((data) => setCtViewItem(data.data ?? data.company_type ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setCtViewLoading(false))
  }

  const openCtEdit = (id) => {
    setCtEditId(id)
    setCtEditLoading(true)
    setError('')
    showCompanyType(token, id)
      .then((data) => {
        const item = data.data ?? data.company_type ?? data
        setCtEditForm({ name: item.name ?? '', sort_order: item.sort_order ?? 1 })
      })
      .catch((err) => setError(err.message))
      .finally(() => setCtEditLoading(false))
  }

  const handleCtCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCtCreateSubmitting(true)
    try {
      await createCompanyType(token, {
        name: ctCreateForm.name,
        sort_order: Number(ctCreateForm.sort_order) || 1,
      })
      setCtCreateOpen(false)
      setCtCreateForm({ name: '', sort_order: 1 })
      loadCompanyTypes()
    } catch (err) {
      setError(err.message)
    } finally {
      setCtCreateSubmitting(false)
    }
  }

  const handleCtEditSubmit = async (e) => {
    e.preventDefault()
    if (!ctEditId) return
    setError('')
    setCtEditSubmitting(true)
    try {
      await updateCompanyType(token, ctEditId, {
        name: ctEditForm.name,
        sort_order: Number(ctEditForm.sort_order) ?? 1,
      })
      setCtEditId(null)
      loadCompanyTypes()
    } catch (err) {
      setError(err.message)
    } finally {
      setCtEditSubmitting(false)
    }
  }

  const handleCtDeleteConfirm = async () => {
    if (!ctDeleteId) return
    setError('')
    setCtDeleteSubmitting(true)
    try {
      await deleteCompanyType(token, ctDeleteId)
      setCtDeleteId(null)
      loadCompanyTypes()
    } catch (err) {
      setError(err.message)
    } finally {
      setCtDeleteSubmitting(false)
    }
  }

  const openCmView = (id) => {
    setCmViewId(id)
    setCmViewItem(null)
    setCmViewLoading(true)
    setError('')
    showPreferredCommMethod(token, id)
      .then((data) => setCmViewItem(data.data ?? data.preferred_comm_method ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setCmViewLoading(false))
  }

  const openCmEdit = (id) => {
    setCmEditId(id)
    setCmEditLoading(true)
    setError('')
    showPreferredCommMethod(token, id)
      .then((data) => {
        const item = data.data ?? data.preferred_comm_method ?? data
        setCmEditForm({ name: item.name ?? '', sort_order: item.sort_order ?? 1 })
      })
      .catch((err) => setError(err.message))
      .finally(() => setCmEditLoading(false))
  }

  const handleCmCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCmCreateSubmitting(true)
    try {
      await createPreferredCommMethod(token, {
        name: cmCreateForm.name,
        sort_order: Number(cmCreateForm.sort_order) || 1,
      })
      setCmCreateOpen(false)
      setCmCreateForm({ name: '', sort_order: 1 })
      loadCommMethods()
    } catch (err) {
      setError(err.message)
    } finally {
      setCmCreateSubmitting(false)
    }
  }

  const handleCmEditSubmit = async (e) => {
    e.preventDefault()
    if (!cmEditId) return
    setError('')
    setCmEditSubmitting(true)
    try {
      await updatePreferredCommMethod(token, cmEditId, {
        name: cmEditForm.name,
        sort_order: Number(cmEditForm.sort_order) ?? 1,
      })
      setCmEditId(null)
      loadCommMethods()
    } catch (err) {
      setError(err.message)
    } finally {
      setCmEditSubmitting(false)
    }
  }

  const handleCmDeleteConfirm = async () => {
    if (!cmDeleteId) return
    setError('')
    setCmDeleteSubmitting(true)
    try {
      await deletePreferredCommMethod(token, cmDeleteId)
      setCmDeleteId(null)
      loadCommMethods()
    } catch (err) {
      setError(err.message)
    } finally {
      setCmDeleteSubmitting(false)
    }
  }

  return (
    <Container size="xl">
      <div className="client-lookups-page">
        {error && <div className="client-lookups-error" role="alert">{error}</div>}

        <div className="client-lookups-tabs">
          <button
            type="button"
            className={`cl-tab ${tab === 'companyTypes' ? 'cl-tab--active' : ''}`}
            onClick={() => setTab('companyTypes')}
          >
            {t('clientLookups.companyTypes')}
          </button>
          <button
            type="button"
            className={`cl-tab ${tab === 'commMethods' ? 'cl-tab--active' : ''}`}
            onClick={() => setTab('commMethods')}
          >
            {t('clientLookups.preferredCommMethods')}
          </button>
          <button
            type="button"
            className={`cl-tab ${tab === 'clientStatuses' ? 'cl-tab--active' : ''}`}
            onClick={() => setTab('clientStatuses')}
          >
            {t('clientLookups.clientStatuses')}
          </button>
        </div>

        {tab === 'companyTypes' && (
          <section className="client-lookups-section">
            <div className="client-lookups-section-header">
              <h2>{t('clientLookups.companyTypes')}</h2>
              <button type="button" className="cl-btn cl-btn--primary" onClick={() => setCtCreateOpen(true)}>
                {t('clientLookups.create')}
              </button>
            </div>
            {companyTypesLoading ? (
              <p>{t('clientLookups.loading')}</p>
            ) : companyTypes.length === 0 ? (
              <p className="client-lookups-empty">{t('clientLookups.noCompanyTypes')}</p>
            ) : (
              <div className="cl-table-wrap">
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th>{t('clientLookups.name')}</th>
                      <th>{t('clientLookups.sortOrder')}</th>
                      <th>{t('clientLookups.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyTypes.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name ?? '—'}</td>
                        <td>{row.sort_order ?? '—'}</td>
                        <td>
                          <button type="button" className="cl-btn cl-btn--small" onClick={() => openCtView(row.id)}>{t('clientLookups.view')}</button>
                          <button type="button" className="cl-btn cl-btn--small" onClick={() => openCtEdit(row.id)}>{t('clientLookups.edit')}</button>
                          <button type="button" className="cl-btn cl-btn--small cl-btn--danger" onClick={() => setCtDeleteId(row.id)}>{t('clientLookups.delete')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'commMethods' && (
          <section className="client-lookups-section">
            <div className="client-lookups-section-header">
              <h2>{t('clientLookups.preferredCommMethods')}</h2>
              <button type="button" className="cl-btn cl-btn--primary" onClick={() => setCmCreateOpen(true)}>
                {t('clientLookups.create')}
              </button>
            </div>
            {commMethodsLoading ? (
              <p>{t('clientLookups.loading')}</p>
            ) : commMethods.length === 0 ? (
              <p className="client-lookups-empty">{t('clientLookups.noCommMethods')}</p>
            ) : (
              <div className="cl-table-wrap">
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th>{t('clientLookups.name')}</th>
                      <th>{t('clientLookups.sortOrder')}</th>
                      <th>{t('clientLookups.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commMethods.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name ?? '—'}</td>
                        <td>{row.sort_order ?? '—'}</td>
                        <td>
                          <button type="button" className="cl-btn cl-btn--small" onClick={() => openCmView(row.id)}>{t('clientLookups.view')}</button>
                          <button type="button" className="cl-btn cl-btn--small" onClick={() => openCmEdit(row.id)}>{t('clientLookups.edit')}</button>
                          <button type="button" className="cl-btn cl-btn--small cl-btn--danger" onClick={() => setCmDeleteId(row.id)}>{t('clientLookups.delete')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'clientStatuses' && (
          <section className="client-lookups-section">
            <div className="client-lookups-section-header">
              <h2>{t('clientLookups.clientStatuses')}</h2>
              <button type="button" className="cl-btn cl-btn--primary" onClick={() => setCsCreateOpen(true)}>
                {t('clientLookups.create')}
              </button>
            </div>
            {clientStatusesLoading ? (
              <p>{t('clientLookups.loading')}</p>
            ) : clientStatuses.length === 0 ? (
              <p className="client-lookups-empty">{t('clientLookups.noClientStatuses')}</p>
            ) : (
              <div className="cl-table-wrap">
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th>{t('settings.statuses.displayName')}</th>
                      <th>{t('settings.clientStatuses.table.appliesTo')}</th>
                      <th>{t('clientLookups.sortOrder')}</th>
                      <th>{t('clientLookups.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientStatuses.map((row) => (
                      <tr key={row.id}>
                        <td>{localizedStatusLabel(row, i18n.language) || '—'}</td>
                        <td>
                          {row.applies_to === 'client'
                            ? t('settings.clientStatuses.appliesToClient')
                            : t('settings.clientStatuses.appliesToLead')}
                        </td>
                        <td>{row.sort_order ?? '—'}</td>
                        <td>
                          <button type="button" className="cl-btn cl-btn--small" onClick={() => openCsView(row.id)}>{t('clientLookups.view')}</button>
                          <button type="button" className="cl-btn cl-btn--small" onClick={() => openCsEdit(row.id)}>{t('clientLookups.edit')}</button>
                          <button type="button" className="cl-btn cl-btn--small cl-btn--danger" onClick={() => setCsDeleteId(row.id)}>{t('clientLookups.delete')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Company Type modals */}
        {ctCreateOpen && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => setCtCreateOpen(false)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.createCompanyType')}</h2>
              <form onSubmit={handleCtCreateSubmit} className="cl-form">
                <div className="cl-field">
                  <label>{t('clientLookups.name')}</label>
                  <input type="text" value={ctCreateForm.name} onChange={(e) => setCtCreateForm((f) => ({ ...f, name: e.target.value }))} required disabled={ctCreateSubmitting} />
                </div>
                <div className="cl-field">
                  <label>{t('clientLookups.sortOrder')}</label>
                  <input type="number" min={0} value={ctCreateForm.sort_order} onChange={(e) => setCtCreateForm((f) => ({ ...f, sort_order: e.target.value }))} disabled={ctCreateSubmitting} />
                </div>
                <div className="cl-modal-actions">
                  <button type="button" className="cl-btn" onClick={() => setCtCreateOpen(false)} disabled={ctCreateSubmitting}>{t('clientLookups.cancel')}</button>
                  <button type="submit" className="cl-btn cl-btn--primary" disabled={ctCreateSubmitting}>{ctCreateSubmitting ? t('clientLookups.saving') : t('clientLookups.save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {ctViewId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => setCtViewId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.viewCompanyType')}</h2>
              {ctViewLoading ? <p>{t('clientLookups.loading')}</p> : ctViewItem && (
                <div className="cl-view">
                  <p><strong>{t('clientLookups.name')}:</strong> {ctViewItem.name ?? '—'}</p>
                  <p><strong>{t('clientLookups.sortOrder')}:</strong> {ctViewItem.sort_order ?? '—'}</p>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setCtViewId(null)}>{t('clientLookups.close')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {ctEditId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => !ctEditSubmitting && setCtEditId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.editCompanyType')}</h2>
              {ctEditLoading ? <p>{t('clientLookups.loading')}</p> : (
                <form onSubmit={handleCtEditSubmit} className="cl-form">
                  <div className="cl-field">
                    <label>{t('clientLookups.name')}</label>
                    <input type="text" value={ctEditForm.name} onChange={(e) => setCtEditForm((f) => ({ ...f, name: e.target.value }))} required disabled={ctEditSubmitting} />
                  </div>
                  <div className="cl-field">
                    <label>{t('clientLookups.sortOrder')}</label>
                    <input type="number" min={0} value={ctEditForm.sort_order} onChange={(e) => setCtEditForm((f) => ({ ...f, sort_order: e.target.value }))} disabled={ctEditSubmitting} />
                  </div>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setCtEditId(null)} disabled={ctEditSubmitting}>{t('clientLookups.cancel')}</button>
                    <button type="submit" className="cl-btn cl-btn--primary" disabled={ctEditSubmitting}>{ctEditSubmitting ? t('clientLookups.saving') : t('clientLookups.save')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {ctDeleteId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => !ctDeleteSubmitting && setCtDeleteId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.deleteCompanyType')}</h2>
              <p>{t('clientLookups.deleteConfirm')}</p>
              <div className="cl-modal-actions">
                <button type="button" className="cl-btn" onClick={() => setCtDeleteId(null)} disabled={ctDeleteSubmitting}>{t('clientLookups.cancel')}</button>
                <button type="button" className="cl-btn cl-btn--danger" onClick={handleCtDeleteConfirm} disabled={ctDeleteSubmitting}>{ctDeleteSubmitting ? t('clientLookups.saving') : t('clientLookups.delete')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Preferred Comm Method modals */}
        {cmCreateOpen && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => setCmCreateOpen(false)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.createCommMethod')}</h2>
              <form onSubmit={handleCmCreateSubmit} className="cl-form">
                <div className="cl-field">
                  <label>{t('clientLookups.name')}</label>
                  <input type="text" value={cmCreateForm.name} onChange={(e) => setCmCreateForm((f) => ({ ...f, name: e.target.value }))} required disabled={cmCreateSubmitting} />
                </div>
                <div className="cl-field">
                  <label>{t('clientLookups.sortOrder')}</label>
                  <input type="number" min={0} value={cmCreateForm.sort_order} onChange={(e) => setCmCreateForm((f) => ({ ...f, sort_order: e.target.value }))} disabled={cmCreateSubmitting} />
                </div>
                <div className="cl-modal-actions">
                  <button type="button" className="cl-btn" onClick={() => setCmCreateOpen(false)} disabled={cmCreateSubmitting}>{t('clientLookups.cancel')}</button>
                  <button type="submit" className="cl-btn cl-btn--primary" disabled={cmCreateSubmitting}>{cmCreateSubmitting ? t('clientLookups.saving') : t('clientLookups.save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {cmViewId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => setCmViewId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.viewCommMethod')}</h2>
              {cmViewLoading ? <p>{t('clientLookups.loading')}</p> : cmViewItem && (
                <div className="cl-view">
                  <p><strong>{t('clientLookups.name')}:</strong> {cmViewItem.name ?? '—'}</p>
                  <p><strong>{t('clientLookups.sortOrder')}:</strong> {cmViewItem.sort_order ?? '—'}</p>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setCmViewId(null)}>{t('clientLookups.close')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {cmEditId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => !cmEditSubmitting && setCmEditId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.editCommMethod')}</h2>
              {cmEditLoading ? <p>{t('clientLookups.loading')}</p> : (
                <form onSubmit={handleCmEditSubmit} className="cl-form">
                  <div className="cl-field">
                    <label>{t('clientLookups.name')}</label>
                    <input type="text" value={cmEditForm.name} onChange={(e) => setCmEditForm((f) => ({ ...f, name: e.target.value }))} required disabled={cmEditSubmitting} />
                  </div>
                  <div className="cl-field">
                    <label>{t('clientLookups.sortOrder')}</label>
                    <input type="number" min={0} value={cmEditForm.sort_order} onChange={(e) => setCmEditForm((f) => ({ ...f, sort_order: e.target.value }))} disabled={cmEditSubmitting} />
                  </div>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setCmEditId(null)} disabled={cmEditSubmitting}>{t('clientLookups.cancel')}</button>
                    <button type="submit" className="cl-btn cl-btn--primary" disabled={cmEditSubmitting}>{cmEditSubmitting ? t('clientLookups.saving') : t('clientLookups.save')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {cmDeleteId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => !cmDeleteSubmitting && setCmDeleteId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.deleteCommMethod')}</h2>
              <p>{t('clientLookups.deleteConfirm')}</p>
              <div className="cl-modal-actions">
                <button type="button" className="cl-btn" onClick={() => setCmDeleteId(null)} disabled={cmDeleteSubmitting}>{t('clientLookups.cancel')}</button>
                <button type="button" className="cl-btn cl-btn--danger" onClick={handleCmDeleteConfirm} disabled={cmDeleteSubmitting}>{cmDeleteSubmitting ? t('clientLookups.saving') : t('clientLookups.delete')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Client Status modals */}
        {csCreateOpen && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => setCsCreateOpen(false)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.createClientStatus')}</h2>
              <form onSubmit={handleCsCreateSubmit} className="cl-form">
                <div className="cl-field">
                  <label>{t('settings.clientStatuses.nameAr')}</label>
                  <input type="text" value={csCreateForm.name_ar} onChange={(e) => setCsCreateForm((f) => ({ ...f, name_ar: e.target.value }))} required disabled={csCreateSubmitting} />
                </div>
                <div className="cl-field">
                  <label>{t('settings.clientStatuses.nameEn')}</label>
                  <input type="text" value={csCreateForm.name_en} onChange={(e) => setCsCreateForm((f) => ({ ...f, name_en: e.target.value }))} required disabled={csCreateSubmitting} />
                </div>
                <div className="cl-field">
                  <label>{t('settings.clientStatuses.appliesTo')}</label>
                  <select
                    value={csCreateForm.applies_to}
                    onChange={(e) => setCsCreateForm((f) => ({ ...f, applies_to: e.target.value }))}
                    disabled={csCreateSubmitting}
                    required
                  >
                    <option value="lead">{t('settings.clientStatuses.appliesToLead')}</option>
                    <option value="client">{t('settings.clientStatuses.appliesToClient')}</option>
                  </select>
                </div>
                <div className="cl-field">
                  <label>{t('clientLookups.sortOrder')}</label>
                  <input type="number" min={0} value={csCreateForm.sort_order} onChange={(e) => setCsCreateForm((f) => ({ ...f, sort_order: e.target.value }))} disabled={csCreateSubmitting} />
                </div>
                <div className="cl-modal-actions">
                  <button type="button" className="cl-btn" onClick={() => setCsCreateOpen(false)} disabled={csCreateSubmitting}>{t('clientLookups.cancel')}</button>
                  <button type="submit" className="cl-btn cl-btn--primary" disabled={csCreateSubmitting}>{csCreateSubmitting ? t('clientLookups.saving') : t('clientLookups.save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {csViewId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => setCsViewId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.viewClientStatus')}</h2>
              {csViewLoading ? <p>{t('clientLookups.loading')}</p> : csViewItem && (
                <div className="cl-view">
                  <p><strong>{t('settings.clientStatuses.nameAr')}:</strong> {csViewItem.name_ar ?? csViewItem.name ?? '—'}</p>
                  <p><strong>{t('settings.clientStatuses.nameEn')}:</strong> {csViewItem.name_en ?? csViewItem.name ?? '—'}</p>
                  <p>
                    <strong>{t('settings.clientStatuses.appliesTo')}:</strong>{' '}
                    {csViewItem.applies_to === 'client'
                      ? t('settings.clientStatuses.appliesToClient')
                      : t('settings.clientStatuses.appliesToLead')}
                  </p>
                  <p><strong>{t('clientLookups.sortOrder')}:</strong> {csViewItem.sort_order ?? '—'}</p>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setCsViewId(null)}>{t('clientLookups.close')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {csEditId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => !csEditSubmitting && setCsEditId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.editClientStatus')}</h2>
              {csEditLoading ? <p>{t('clientLookups.loading')}</p> : (
                <form onSubmit={handleCsEditSubmit} className="cl-form">
                  <div className="cl-field">
                    <label>{t('settings.clientStatuses.nameAr')}</label>
                    <input type="text" value={csEditForm.name_ar} onChange={(e) => setCsEditForm((f) => ({ ...f, name_ar: e.target.value }))} required disabled={csEditSubmitting} />
                  </div>
                  <div className="cl-field">
                    <label>{t('settings.clientStatuses.nameEn')}</label>
                    <input type="text" value={csEditForm.name_en} onChange={(e) => setCsEditForm((f) => ({ ...f, name_en: e.target.value }))} required disabled={csEditSubmitting} />
                  </div>
                  <div className="cl-field">
                    <label>{t('settings.clientStatuses.appliesTo')}</label>
                    <select
                      value={csEditForm.applies_to}
                      onChange={(e) => setCsEditForm((f) => ({ ...f, applies_to: e.target.value }))}
                      disabled={csEditSubmitting}
                      required
                    >
                      <option value="lead">{t('settings.clientStatuses.appliesToLead')}</option>
                      <option value="client">{t('settings.clientStatuses.appliesToClient')}</option>
                    </select>
                  </div>
                  <div className="cl-field">
                    <label>{t('clientLookups.sortOrder')}</label>
                    <input type="number" min={0} value={csEditForm.sort_order} onChange={(e) => setCsEditForm((f) => ({ ...f, sort_order: e.target.value }))} disabled={csEditSubmitting} />
                  </div>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setCsEditId(null)} disabled={csEditSubmitting}>{t('clientLookups.cancel')}</button>
                    <button type="submit" className="cl-btn cl-btn--primary" disabled={csEditSubmitting}>{csEditSubmitting ? t('clientLookups.saving') : t('clientLookups.save')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {csDeleteId && (
          <div className="cl-modal" role="dialog" aria-modal="true">
            <div className="cl-modal-backdrop" onClick={() => !csDeleteSubmitting && setCsDeleteId(null)} />
            <div className="cl-modal-content">
              <h2>{t('clientLookups.deleteClientStatus')}</h2>
              <p>{t('clientLookups.deleteConfirm')}</p>
              <div className="cl-modal-actions">
                <button type="button" className="cl-btn" onClick={() => setCsDeleteId(null)} disabled={csDeleteSubmitting}>{t('clientLookups.cancel')}</button>
                <button type="button" className="cl-btn cl-btn--danger" onClick={handleCsDeleteConfirm} disabled={csDeleteSubmitting}>{csDeleteSubmitting ? t('clientLookups.saving') : t('clientLookups.delete')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
