import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SD_FORM_LOOKUP_TAB_APIS } from '../../api/sdFormLookups'
import '../ClientLookups/ClientLookups.css'

const LOOKUP_TABS = [
  { id: 'shipmentDirections', labelKey: 'sdForms.lookups.tabs.shipmentDirections', titleKey: 'sdForms.lookups.titles.shipmentDirections', emptyKey: 'sdForms.lookups.empty.shipmentDirections' },
  { id: 'notifyPartyModes', labelKey: 'sdForms.lookups.tabs.notifyPartyModes', titleKey: 'sdForms.lookups.titles.notifyPartyModes', emptyKey: 'sdForms.lookups.empty.notifyPartyModes' },
  { id: 'freightTerms', labelKey: 'sdForms.lookups.tabs.freightTerms', titleKey: 'sdForms.lookups.titles.freightTerms', emptyKey: 'sdForms.lookups.empty.freightTerms' },
  { id: 'containerTypes', labelKey: 'sdForms.lookups.tabs.containerTypes', titleKey: 'sdForms.lookups.titles.containerTypes', emptyKey: 'sdForms.lookups.empty.containerTypes' },
  { id: 'containerSizes', labelKey: 'sdForms.lookups.tabs.containerSizes', titleKey: 'sdForms.lookups.titles.containerSizes', emptyKey: 'sdForms.lookups.empty.containerSizes' },
]

/** Create form omits sort order UI for these tabs (اتجاهات الشحن، أوضاع الطرف المُبلَغ، …). */
const LOOKUP_TABS_OMIT_CREATE_SORT_ORDER = new Set(LOOKUP_TABS.map((x) => x.id))

function normalizeRows(data) {
  const list = data?.data ?? data
  return Array.isArray(list) ? list : []
}

/**
 * SD Form reference data CRUD – all 25 Postman lookup endpoints, one tab per resource.
 */
export default function SdFormLookupsPanel({ token, onChanged }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('shipmentDirections')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', sort_order: 1 })
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [viewId, setViewId] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', sort_order: 1 })
  const [editLoading, setEditLoading] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const api = SD_FORM_LOOKUP_TAB_APIS[tab]

  const load = useCallback(() => {
    if (!token || !api) return
    setLoading(true)
    setError('')
    api
      .list(token)
      .then((data) => setRows(normalizeRows(data)))
      .catch((err) => setError(err.message || t('sdForms.lookups.error')))
      .finally(() => setLoading(false))
  }, [token, tab, api, t])

  useEffect(() => {
    setCreateOpen(false)
    setViewId(null)
    setEditId(null)
    setDeleteId(null)
    setViewItem(null)
    setError('')
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const openView = (id) => {
    setViewId(id)
    setViewItem(null)
    setViewLoading(true)
    setError('')
    api
      .show(token, id)
      .then((data) => setViewItem(data.data ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setViewLoading(false))
  }

  const openEdit = (id) => {
    setEditId(id)
    setEditLoading(true)
    setError('')
    api
      .show(token, id)
      .then((data) => {
        const item = data.data ?? data
        setEditForm({ name: item.name ?? '', sort_order: item.sort_order ?? 1 })
      })
      .catch((err) => setError(err.message))
      .finally(() => setEditLoading(false))
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCreateSubmitting(true)
    try {
      await api.create(token, {
        name: createForm.name,
        sort_order: LOOKUP_TABS_OMIT_CREATE_SORT_ORDER.has(tab)
          ? 0
          : Number(createForm.sort_order) || 0,
      })
      setCreateOpen(false)
      setCreateForm({ name: '', sort_order: 1 })
      load()
      onChanged?.()
    } catch (err) {
      setError(err.message || t('sdForms.lookups.error'))
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editId) return
    setError('')
    setEditSubmitting(true)
    try {
      await api.update(token, editId, {
        name: editForm.name,
        sort_order: Number(editForm.sort_order) || 0,
      })
      setEditId(null)
      load()
      onChanged?.()
    } catch (err) {
      setError(err.message || t('sdForms.lookups.error'))
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setError('')
    setDeleteSubmitting(true)
    try {
      await api.remove(token, deleteId)
      setDeleteId(null)
      load()
      onChanged?.()
    } catch (err) {
      setError(err.message || t('sdForms.lookups.error'))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const tabMeta = LOOKUP_TABS.find((x) => x.id === tab)

  return (
    <div className="client-lookups-page sd-forms-lookups-panel mt-8">
      <h2 className="sd-forms-lookups-panel__heading text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
        {t('sdForms.lookups.sectionTitle')}
      </h2>
      {error ? <div className="client-lookups-error">{error}</div> : null}

      <div className="client-lookups-tabs" role="tablist">
        {LOOKUP_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`cl-tab ${tab === item.id ? 'cl-tab--active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <section className="client-lookups-section">
        <div className="client-lookups-section-header">
          <h2>{tabMeta ? t(tabMeta.titleKey) : ''}</h2>
          <button type="button" className="cl-btn cl-btn--primary" onClick={() => setCreateOpen(true)}>
            {t('sdForms.lookups.create')}
          </button>
        </div>
        {loading ? (
          <p>{t('sdForms.lookups.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="client-lookups-empty">{tabMeta ? t(tabMeta.emptyKey) : ''}</p>
        ) : (
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>{t('sdForms.lookups.name')}</th>
                  <th>{t('sdForms.lookups.sortOrder')}</th>
                  <th>{t('sdForms.lookups.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name ?? '—'}</td>
                    <td>{row.sort_order ?? '—'}</td>
                    <td>
                      <button type="button" className="cl-btn cl-btn--small" onClick={() => openView(row.id)}>
                        {t('sdForms.lookups.view')}
                      </button>
                      <button type="button" className="cl-btn cl-btn--small" onClick={() => openEdit(row.id)}>
                        {t('sdForms.lookups.edit')}
                      </button>
                      <button type="button" className="cl-btn cl-btn--small cl-btn--danger" onClick={() => setDeleteId(row.id)}>
                        {t('sdForms.lookups.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createOpen && (
        <div className="cl-modal" role="dialog" aria-modal="true">
          <div className="cl-modal-backdrop" onClick={() => !createSubmitting && setCreateOpen(false)} />
          <div className="cl-modal-content">
            <h2>{t('sdForms.lookups.createTitle')}</h2>
            <form onSubmit={handleCreateSubmit} className="cl-form">
              <div className="cl-field">
                <label>{t('sdForms.lookups.name')}</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  disabled={createSubmitting}
                />
              </div>
              {!LOOKUP_TABS_OMIT_CREATE_SORT_ORDER.has(tab) && (
                <div className="cl-field">
                  <label>{t('sdForms.lookups.sortOrder')}</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.sort_order}
                    onChange={(e) => setCreateForm((f) => ({ ...f, sort_order: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>
              )}
              <div className="cl-modal-actions">
                <button type="button" className="cl-btn" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                  {t('sdForms.lookups.cancel')}
                </button>
                <button type="submit" className="cl-btn cl-btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? t('sdForms.lookups.saving') : t('sdForms.lookups.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewId && (
        <div className="cl-modal" role="dialog" aria-modal="true">
          <div className="cl-modal-backdrop" onClick={() => setViewId(null)} />
          <div className="cl-modal-content">
            <h2>{t('sdForms.lookups.viewTitle')}</h2>
            {viewLoading ? (
              <p>{t('sdForms.lookups.loading')}</p>
            ) : (
              viewItem && (
                <div className="cl-view">
                  <p>
                    <strong>{t('sdForms.lookups.name')}:</strong> {viewItem.name ?? '—'}
                  </p>
                  <p>
                    <strong>{t('sdForms.lookups.sortOrder')}:</strong> {viewItem.sort_order ?? '—'}
                  </p>
                  <div className="cl-modal-actions">
                    <button type="button" className="cl-btn" onClick={() => setViewId(null)}>
                      {t('sdForms.lookups.close')}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {editId && (
        <div className="cl-modal" role="dialog" aria-modal="true">
          <div className="cl-modal-backdrop" onClick={() => !editSubmitting && setEditId(null)} />
          <div className="cl-modal-content">
            <h2>{t('sdForms.lookups.editTitle')}</h2>
            {editLoading ? (
              <p>{t('sdForms.lookups.loading')}</p>
            ) : (
              <form onSubmit={handleEditSubmit} className="cl-form">
                <div className="cl-field">
                  <label>{t('sdForms.lookups.name')}</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    disabled={editSubmitting}
                  />
                </div>
                <div className="cl-field">
                  <label>{t('sdForms.lookups.sortOrder')}</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.sort_order}
                    onChange={(e) => setEditForm((f) => ({ ...f, sort_order: e.target.value }))}
                    disabled={editSubmitting}
                  />
                </div>
                <div className="cl-modal-actions">
                  <button type="button" className="cl-btn" onClick={() => setEditId(null)} disabled={editSubmitting}>
                    {t('sdForms.lookups.cancel')}
                  </button>
                  <button type="submit" className="cl-btn cl-btn--primary" disabled={editSubmitting}>
                    {editSubmitting ? t('sdForms.lookups.saving') : t('sdForms.lookups.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deleteId && (
        <div className="cl-modal" role="dialog" aria-modal="true">
          <div className="cl-modal-backdrop" onClick={() => !deleteSubmitting && setDeleteId(null)} />
          <div className="cl-modal-content">
            <h2>{t('sdForms.lookups.deleteTitle')}</h2>
            <p>{t('sdForms.lookups.deleteConfirm')}</p>
            <div className="cl-modal-actions">
              <button type="button" className="cl-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                {t('sdForms.lookups.cancel')}
              </button>
              <button type="button" className="cl-btn cl-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
                {deleteSubmitting ? t('sdForms.lookups.saving') : t('sdForms.lookups.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
