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
} from '../../api/clientLookups'
import { PageHeader } from '../../components/PageHeader'
import { Container } from '../../components/Container'
import './ClientLookups.css'

export default function ClientLookups() {
  const { t } = useTranslation()
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

  useEffect(() => { loadCompanyTypes() }, [token])
  useEffect(() => { loadCommMethods() }, [token])

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
        <PageHeader
          title={t('clientLookups.title')}
          breadcrumbs={[
            { label: t('pageHeader.home'), href: '/' },
            { label: t('pageHeader.clients'), href: '/clients' },
            { label: t('clientLookups.title') },
          ]}
        />
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
      </div>
    </Container>
  )
}
