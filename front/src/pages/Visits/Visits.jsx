import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { listClients } from '../../api/clients'
import { listUsers } from '../../api/users'
import {
  listVisits,
  getVisit,
  createVisit,
  updateVisit,
  deleteVisit,
  getVisitStats,
  getVisitCharts,
  getFollowUpsPending,
  visitableTypeForListQuery,
  visitableTypeForStatsQuery,
} from '../../api/visits'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { Eye, Pencil, Trash2, Search, X, ClipboardList, Calendar, User, RotateCcw } from 'lucide-react'
import { BarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import {
  VISIT_STATUS_ORDERED,
  normalizeVisitStatusKey,
  isPredefinedVisitStatus,
} from './visitStatus'
import VisitStatusBadge from './VisitStatusBadge'

function normalizeClientOption(c) {
  if (!c || c.id == null) return null
  const name = c.name ?? c.client_name ?? ''
  const company = c.company_name ?? ''
  const label = company ? `${company}${name ? ` — ${name}` : ''}` : name || `#${c.id}`
  return { id: c.id, label }
}

function visitVisitableName(v) {
  const vis = v.visitable
  if (!vis) return '—'
  return vis.company_name || vis.name || `#${v.visitable_id ?? ''}`
}

function isVendorVisit(v) {
  const t = v.visitable_type || ''
  return t.includes('Vendor')
}

function formatVisitDetailDate(value, locale) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s.slice(0, 10) || '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

function defaultVisitForm() {
  return {
    relationKind: 'client',
    client_id: '',
    vendor_id: '',
    subject: '',
    purpose: '',
    notes: '',
    visit_date: '',
    status: '',
  }
}

function visitToForm(v) {
  const vendor = isVendorVisit(v)
  return {
    relationKind: vendor ? 'vendor' : 'client',
    client_id: vendor ? '' : String(v.visitable_id ?? ''),
    vendor_id: vendor ? String(v.visitable_id ?? '') : '',
    subject: v.subject ?? '',
    purpose: v.purpose ?? '',
    notes: v.notes ?? '',
    visit_date: v.visit_date ? String(v.visit_date).slice(0, 10) : '',
    status: v.status ?? '',
  }
}

function buildStorePayload(form) {
  const body = {
    subject: form.subject.trim(),
    visit_date: form.visit_date,
  }
  if (form.purpose?.trim()) body.purpose = form.purpose.trim()
  if (form.notes?.trim()) body.notes = form.notes.trim()
  if (form.status?.trim()) body.status = form.status.trim()
  if (form.relationKind === 'client') {
    body.client_id = Number(form.client_id)
  } else {
    body.vendor_id = Number(form.vendor_id)
  }
  return body
}

function buildUpdatePayload(form) {
  const body = {
    subject: form.subject.trim(),
    visit_date: form.visit_date,
    purpose: form.purpose?.trim() || null,
    notes: form.notes?.trim() || null,
    status: form.status?.trim() || null,
  }
  if (form.relationKind === 'client' && form.client_id) {
    body.client_id = Number(form.client_id)
  }
  if (form.relationKind === 'vendor' && form.vendor_id) {
    body.vendor_id = Number(form.vendor_id)
  }
  return body
}

export default function Visits() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const numberLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'

  const [rawList, setRawList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  const [apiFilters, setApiFilters] = useState({
    client_id: '',
    vendor_id: '',
    visitable_kind: '',
    user_id: '',
    from: '',
    to: '',
  })
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState('visit_date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [followUps, setFollowUps] = useState([])
  const [followUpsLoading, setFollowUpsLoading] = useState(false)

  const [clientOptions, setClientOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(defaultVisitForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [detailVisit, setDetailVisit] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(defaultVisitForm())
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const listQueryParams = useMemo(() => {
    const vt = visitableTypeForListQuery(apiFilters.visitable_kind)
    return {
      client_id: apiFilters.client_id || undefined,
      vendor_id: apiFilters.vendor_id || undefined,
      visitable_type: vt || undefined,
      user_id: apiFilters.user_id || undefined,
      from: apiFilters.from || undefined,
      to: apiFilters.to || undefined,
    }
  }, [apiFilters])

  const statsQueryParams = useMemo(() => {
    const vt = visitableTypeForStatsQuery(apiFilters.visitable_kind)
    return {
      from: apiFilters.from || undefined,
      to: apiFilters.to || undefined,
      user_id: apiFilters.user_id || undefined,
      visitable_type: vt || undefined,
    }
  }, [apiFilters])

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listVisits(token, listQueryParams)
      .then((data) => {
        const arr = data.data ?? data.visits ?? data
        setRawList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('visits.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, listQueryParams, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getVisitStats(token, statsQueryParams)
      .then((data) => setStats(data.data ?? data.stats ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token, statsQueryParams])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getVisitCharts(token, statsQueryParams)
      .then((data) => setCharts(data.data ?? data.charts ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token, statsQueryParams])

  useEffect(() => {
    if (!token) return
    setFollowUpsLoading(true)
    getFollowUpsPending(token)
      .then((data) => {
        const arr = data.data ?? data
        setFollowUps(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setFollowUps([]))
      .finally(() => setFollowUpsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    listClients(token, { per_page: 500 })
      .then((data) => {
        const arr = data.data ?? data.clients ?? data
        const list = Array.isArray(arr) ? arr : []
        setClientOptions(list.map(normalizeClientOption).filter(Boolean))
      })
      .catch(() => setClientOptions([]))
  }, [token])

  useEffect(() => {
    if (!token) return
    listUsers(token, { per_page: 300 })
      .then((data) => {
        const arr = data.data ?? data.users ?? data
        const list = Array.isArray(arr) ? arr : []
        setUserOptions(list.map((u) => ({ id: u.id, label: u.name || u.email || `#${u.id}` })))
      })
      .catch(() => setUserOptions([]))
  }, [token])

  useEffect(() => {
    if (!detailId || !token) {
      setDetailVisit(null)
      setDetailError(false)
      return
    }
    setDetailLoading(true)
    setDetailError(false)
    getVisit(token, detailId)
      .then((data) => {
        const v = data.data ?? data.visit ?? data
        setDetailVisit(v && typeof v === 'object' ? v : null)
      })
      .catch(() => {
        setDetailVisit(null)
        setDetailError(true)
        setAlert({ type: 'error', message: t('visits.errorDetail') })
      })
      .finally(() => setDetailLoading(false))
  }, [token, detailId, t])

  useEffect(() => {
    setPage(1)
  }, [apiFilters, q])

  const filteredSorted = useMemo(() => {
    let rows = [...rawList]
    const term = q.trim().toLowerCase()
    if (term) {
      rows = rows.filter((v) => {
        const blob = [
          v.subject,
          v.purpose,
          v.notes,
          visitVisitableName(v),
          v.user?.name,
          String(v.visitable_id ?? ''),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return blob.includes(term)
      })
    }
    const mult = sortDirection === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      if (sortKey === 'visit_date') {
        const da = new Date(a.visit_date || 0).getTime()
        const db = new Date(b.visit_date || 0).getTime()
        return (da - db) * mult
      }
      if (sortKey === 'subject') {
        return String(a.subject ?? '').localeCompare(String(b.subject ?? '')) * mult
      }
      if (sortKey === 'visitable') {
        return String(visitVisitableName(a)).localeCompare(String(visitVisitableName(b))) * mult
      }
      return 0
    })
    return rows
  }, [rawList, q, sortKey, sortDirection])

  const pagination = useMemo(() => {
    const total = filteredSorted.length
    const lastPage = Math.max(1, Math.ceil(total / perPage) || 1)
    const currentPage = Math.min(page, lastPage)
    const start = (currentPage - 1) * perPage
    return {
      total,
      last_page: lastPage,
      current_page: currentPage,
      slice: filteredSorted.slice(start, start + perPage),
    }
  }, [filteredSorted, page, perPage])

  const pageLoading =
    loading ||
    statsLoading ||
    chartsLoading ||
    createSubmitting ||
    editSubmitting ||
    deleteSubmitting

  const openEdit = (row) => {
    setEditId(row.id)
    setEditForm(visitToForm(row))
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    if (createForm.relationKind === 'client' && !createForm.client_id) {
      setAlert({ type: 'error', message: t('visits.errorClientRequired') })
      return
    }
    if (createForm.relationKind === 'vendor' && !createForm.vendor_id) {
      setAlert({ type: 'error', message: t('visits.errorVendorRequired') })
      return
    }
    setCreateSubmitting(true)
    try {
      const payload = buildStorePayload(createForm)
      await createVisit(token, payload)
      setShowCreate(false)
      setCreateForm(defaultVisitForm())
      loadList()
      setAlert({ type: 'success', message: t('visits.created') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('visits.errorCreate') })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editId) return
    setAlert(null)
    if (editForm.relationKind === 'client' && !editForm.client_id) {
      setAlert({ type: 'error', message: t('visits.errorClientRequired') })
      return
    }
    if (editForm.relationKind === 'vendor' && !editForm.vendor_id) {
      setAlert({ type: 'error', message: t('visits.errorVendorRequired') })
      return
    }
    setEditSubmitting(true)
    try {
      const payload = buildUpdatePayload(editForm)
      await updateVisit(token, editId, payload)
      setEditId(null)
      loadList()
      if (detailId === editId) setDetailId(null)
      setAlert({ type: 'success', message: t('visits.updated') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('visits.errorUpdate') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setAlert(null)
    setDeleteSubmitting(true)
    try {
      await deleteVisit(token, deleteId)
      setDeleteId(null)
      if (detailId === deleteId) setDetailId(null)
      loadList()
      setAlert({ type: 'success', message: t('visits.deleted') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('visits.errorDelete') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const visitColumns = [
    {
      key: 'visit_date',
      sortKey: 'visit_date',
      label: t('visits.fields.visit_date'),
      render: (val) => (val ? String(val).slice(0, 10) : '—'),
    },
    {
      key: 'subject',
      sortKey: 'subject',
      label: t('visits.fields.subject'),
    },
    {
      key: 'visitable',
      sortKey: 'visitable',
      label: t('visits.fields.related'),
      render: (_, v) => (
        <span>
          {isVendorVisit(v) ? t('visits.typeVendor') : t('visits.typeClient')}
          {': '}
          {visitVisitableName(v)}
        </span>
      ),
    },
    { key: 'purpose', label: t('visits.fields.purpose'), render: (p) => p || '—' },
    {
      key: 'user',
      label: t('visits.fields.user'),
      render: (_, v) => v.user?.name ?? '—',
    },
    {
      key: 'status',
      label: t('visits.fields.status'),
      render: (s, v) => <VisitStatusBadge status={v.status ?? s} t={t} />,
    },
    {
      key: 'actions',
      label: t('visits.actions'),
      render: (_, v) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('visits.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('visits.view')}
            onClick={() => setDetailId(v.id)}
          />
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('visits.edit')}
            onClick={() => openEdit(v)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('visits.delete')}
            onClick={() => setDeleteId(v.id)}
            variant="danger"
          />
        </div>
      ),
    },
  ]

  const renderVisitForm = (form, setForm, disabled, isCreate) => (
    <div className="clients-form-sections">
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('visits.sectionLink')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="visit-relation-kind">{t('visits.fields.relationKind')}</label>
            <select
              id="visit-relation-kind"
              value={form.relationKind}
              onChange={(e) => setForm((f) => ({ ...f, relationKind: e.target.value }))}
              disabled={disabled}
            >
              <option value="client">{t('visits.relationClient')}</option>
              <option value="vendor">{t('visits.relationVendor')}</option>
            </select>
          </div>
          {form.relationKind === 'client' ? (
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
              <label htmlFor="visit-client">{t('visits.fields.client_id')}</label>
              <select
                id="visit-client"
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                disabled={disabled}
                required={isCreate}
              >
                <option value="">—</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
              <label htmlFor="visit-vendor">{t('visits.fields.vendor_id')}</label>
              <input
                id="visit-vendor"
                type="number"
                min={1}
                placeholder={t('visits.vendorPlaceholder')}
                value={form.vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value }))}
                disabled={disabled}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('visits.vendorHint')}</p>
            </div>
          )}
        </div>
      </section>
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('visits.sectionDetails')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="visit-subject">{t('visits.fields.subject')}</label>
            <input
              id="visit-subject"
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              disabled={disabled}
              required
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="visit-date">{t('visits.fields.visit_date')}</label>
            <input
              id="visit-date"
              type="date"
              value={form.visit_date}
              onChange={(e) => setForm((f) => ({ ...f, visit_date: e.target.value }))}
              disabled={disabled}
              required
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor={isCreate ? 'visit-status-create' : 'visit-status-edit'}>{t('visits.fields.status')}</label>
            <select
              id={isCreate ? 'visit-status-create' : 'visit-status-edit'}
              value={
                form.status && !isPredefinedVisitStatus(form.status)
                  ? `__custom:${form.status}`
                  : normalizeVisitStatusKey(form.status) || ''
              }
              onChange={(e) => {
                const v = e.target.value
                if (v.startsWith('__custom:')) {
                  setForm((f) => ({ ...f, status: v.slice('__custom:'.length) }))
                  return
                }
                setForm((f) => ({ ...f, status: v }))
              }}
              disabled={disabled}
            >
              <option value="">{t('visits.statusNotSet')}</option>
              {VISIT_STATUS_ORDERED.map((k) => (
                <option key={k} value={k}>
                  {t(`visits.statusValues.${k}`)}
                </option>
              ))}
              {form.status?.trim() && !isPredefinedVisitStatus(form.status) ? (
                <option value={`__custom:${form.status}`}>{form.status}</option>
              ) : null}
            </select>
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="visit-purpose">{t('visits.fields.purpose')}</label>
            <input
              id="visit-purpose"
              type="text"
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="visit-notes">{t('visits.fields.notes')}</label>
            <textarea
              id="visit-notes"
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  )

  return (
    <Container size="xl">
      <div className="clients-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        {stats && typeof stats === 'object' && (
          <div className="clients-stats-grid">
            {[
              { key: 'total_visits', variant: 'blue', icon: ClipboardList },
              { key: 'successful_count', variant: 'green', icon: Calendar },
              { key: 'new_clients_from_visits', variant: 'amber', icon: User },
            ].map(({ key, variant, icon: Icon }) => {
              const value = stats[key]
              const title = t(`visits.stats.${key}`, key.replace(/_/g, ' '))
              const displayValue = typeof value === 'number' ? new Intl.NumberFormat(numberLocale).format(value) : String(value ?? '—')
              return (
                <StatsCard
                  key={key}
                  title={title}
                  value={displayValue}
                  icon={<Icon className="h-6 w-6" />}
                  variant={variant}
                />
              )
            })}
            {stats.top_rep?.name && (
              <StatsCard
                title={t('visits.stats.top_rep')}
                value={stats.top_rep.name}
                icon={<User className="h-6 w-6" />}
                variant="default"
              />
            )}
          </div>
        )}

        <div className="clients-extra-panel clients-charts-panel mb-4">
          {charts && (charts.success_by_rep?.length > 0 || charts.visits_by_status?.length > 0) ? (
            <div className="clients-charts-grid">
              {charts.success_by_rep?.length > 0 && (
                <div className="clients-chart-wrap">
                  <BarChart
                    data={charts.success_by_rep.map((d) => ({
                      ...d,
                      label: d.user_name || `#${d.user_id}`,
                    }))}
                    xKey="label"
                    yKey="total"
                    xLabel={t('visits.chartsRep', 'Representative')}
                    yLabel={t('visits.chartsCount', 'Visits')}
                    valueLabel={t('visits.chartsCount', 'Visits')}
                    title={t('visits.chartsByRep', 'Visits by representative')}
                    height={260}
                  />
                </div>
              )}
              {charts.visits_by_status?.length > 0 && (
                <div className="clients-chart-wrap">
                  <DonutChart
                    data={charts.visits_by_status.map((item) => ({
                      ...item,
                      statusLabel: item.status ?? t('visits.unknownStatus', 'Unknown'),
                    }))}
                    nameKey="statusLabel"
                    valueKey="count"
                    valueLabel={t('visits.chartsCount', 'Count')}
                    title={t('visits.chartsByStatus', 'Visits by status')}
                    height={260}
                  />
                </div>
              )}
            </div>
          ) : charts && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('visits.chartsNoData')}</p>
          )}
        </div>

        <div className="clients-extra-panel mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t('visits.followUpsTitle')}</h3>
          {followUpsLoading ? (
            <p className="text-sm text-gray-500">{t('visits.followUpsLoading')}</p>
          ) : followUps.length === 0 ? (
            <p className="text-sm text-gray-500">{t('visits.followUpsEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="px-2 py-2 text-start font-semibold">{t('visits.followUpClient')}</th>
                    <th className="px-2 py-2 text-start font-semibold">{t('visits.followUpNext')}</th>
                    <th className="px-2 py-2 text-start font-semibold">{t('visits.followUpSummary')}</th>
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((f) => (
                    <tr key={f.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-2">{f.client_name || '—'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{f.next_follow_up_at || '—'}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{f.summary || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('visits.searchPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="clients-input clients-filters__search"
                aria-label={t('visits.search')}
              />
            </div>
            <div className="clients-filters__fields flex flex-wrap gap-2">
              <select
                value={apiFilters.visitable_kind}
                onChange={(e) => setApiFilters((f) => ({ ...f, visitable_kind: e.target.value }))}
                className="clients-input"
                aria-label={t('visits.filterType')}
              >
                <option value="">{t('visits.typeAll')}</option>
                <option value="client">{t('visits.typeClient')}</option>
                <option value="vendor">{t('visits.typeVendor')}</option>
              </select>
              <select
                value={apiFilters.client_id}
                onChange={(e) => setApiFilters((f) => ({ ...f, client_id: e.target.value }))}
                className="clients-input min-w-[10rem]"
                aria-label={t('visits.filterClient')}
              >
                <option value="">{t('visits.allClients')}</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                placeholder={t('visits.filterVendorId')}
                value={apiFilters.vendor_id}
                onChange={(e) => setApiFilters((f) => ({ ...f, vendor_id: e.target.value }))}
                className="clients-input w-28 min-w-[7rem]"
                aria-label={t('visits.filterVendorId')}
              />
              <select
                value={apiFilters.user_id}
                onChange={(e) => setApiFilters((f) => ({ ...f, user_id: e.target.value }))}
                className="clients-input min-w-[8rem]"
                aria-label={t('visits.filterUser')}
              >
                <option value="">{t('visits.allUsers')}</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={apiFilters.from}
                onChange={(e) => setApiFilters((f) => ({ ...f, from: e.target.value }))}
                className="clients-input"
                aria-label={t('visits.dateFrom')}
              />
              <input
                type="date"
                value={apiFilters.to}
                onChange={(e) => setApiFilters((f) => ({ ...f, to: e.target.value }))}
                className="clients-input"
                aria-label={t('visits.dateTo')}
              />
            </div>
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={() => {
                setApiFilters({
                  client_id: '',
                  vendor_id: '',
                  visitable_kind: '',
                  user_id: '',
                  from: '',
                  to: '',
                })
                setQ('')
              }}
              aria-label={t('visits.clearFilters')}
              title={t('visits.clearFilters')}
            >
              <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            <div className="clients-filters__actions">
              <button type="button" className="page-header__btn page-header__btn--primary" onClick={() => setShowCreate(true)}>
                {t('visits.create')}
              </button>
            </div>
          </div>
        </div>

        {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {pagination.slice.length === 0 ? (
          <p className="clients-empty">{t('visits.empty')}</p>
        ) : (
          <Table
            columns={visitColumns}
            data={pagination.slice}
            getRowKey={(v) => v.id}
            emptyMessage={t('visits.empty')}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={(key, direction) => {
              setSortKey(key)
              setSortDirection(direction)
            }}
          />
        )}

        {pagination.total > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('visits.total')}: {pagination.total}
              </span>
              <label className="clients-pagination__per-page">
                <span className="clients-pagination__per-page-label">{t('visits.perPage')}</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="clients-select clients-pagination__select"
                  aria-label={t('visits.perPage')}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={setPage}
            />
          </div>
        )}

        {showCreate && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="visit-create-title">
            <div className="client-detail-modal__backdrop" onClick={() => setShowCreate(false)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="visit-create-title" className="client-detail-modal__title">
                  {t('visits.create')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowCreate(false)}
                  disabled={createSubmitting}
                  aria-label={t('visits.close')}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">{renderVisitForm(createForm, setCreateForm, createSubmitting, true)}</div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
                    {t('visits.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={createSubmitting}>
                    {createSubmitting ? t('visits.saving') : t('visits.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {detailId && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="visit-detail-title">
            <div className="client-detail-modal__backdrop" onClick={() => setDetailId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--visit-detail">
              <header className="client-detail-modal__header client-detail-modal__header--detail">
                <div className="client-detail-modal__header-inner">
                  <span className="client-detail-modal__header-label">{t('visits.detailTitle')}</span>
                  <h2 id="visit-detail-title" className="client-detail-modal__title client-detail-modal__title--client">
                    {detailLoading ? '…' : (detailVisit?.subject?.trim() || '—')}
                  </h2>
                  {!detailLoading && detailVisit && (
                    <p className="client-detail-modal__subtitle client-detail-modal__subtitle--visit-meta">
                      <span>{formatVisitDetailDate(detailVisit.visit_date, i18n.language) || '—'}</span>
                      {detailVisit.user?.name ? (
                        <>
                          <span className="client-detail-modal__visit-meta-sep" aria-hidden>
                            ·
                          </span>
                          <span>{detailVisit.user.name}</span>
                        </>
                      ) : null}
                      <span className="client-detail-modal__visit-meta-sep" aria-hidden>
                        ·
                      </span>
                      <VisitStatusBadge status={detailVisit.status} t={t} />
                    </p>
                  )}
                </div>
                <button type="button" className="client-detail-modal__close" onClick={() => setDetailId(null)} aria-label={t('visits.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body">
                {detailLoading ? (
                  <div className="client-detail-modal__visit-detail-loading">
                    <LoaderDots />
                    <p className="client-detail-modal__visit-detail-loading-text">{t('visits.loading')}</p>
                  </div>
                ) : detailError || !detailVisit ? (
                  <div className="client-detail-modal__visit-detail-loading client-detail-modal__visit-detail-loading--error">
                    <p className="client-detail-modal__visit-detail-error">{t('visits.errorDetail')}</p>
                  </div>
                ) : (
                  <div className="client-detail-modal__visit-detail-content">
                    <section className="client-detail-modal__section">
                      <h3 className="client-detail-modal__section-title">{t('visits.detailSectionMeta')}</h3>
                      <div className="client-detail-modal__info-group">
                        <div className="client-detail-modal__grid client-detail-modal__grid--info">
                          <div className="client-detail-modal__row">
                            <span className="client-detail-modal__label">{t('visits.fields.visit_date')}</span>
                            <span className="client-detail-modal__value">
                              {formatVisitDetailDate(detailVisit.visit_date, i18n.language) || '—'}
                            </span>
                          </div>
                          <div className="client-detail-modal__row">
                            <span className="client-detail-modal__label">{t('visits.fields.user')}</span>
                            <span className="client-detail-modal__value">{detailVisit.user?.name ?? '—'}</span>
                          </div>
                          <div className="client-detail-modal__row">
                            <span className="client-detail-modal__label">{t('visits.fields.status')}</span>
                            <span className="client-detail-modal__value client-detail-modal__value--visit-status">
                              <VisitStatusBadge status={detailVisit.status} t={t} />
                            </span>
                          </div>
                          <div className="client-detail-modal__row">
                            <span className="client-detail-modal__label">{t('visits.fields.related')}</span>
                            <span className="client-detail-modal__value">
                              {isVendorVisit(detailVisit) ? t('visits.typeVendor') : t('visits.typeClient')}
                              {': '}
                              {visitVisitableName(detailVisit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>
                    <section className="client-detail-modal__section">
                      <h3 className="client-detail-modal__section-title">{t('visits.detailSectionContent')}</h3>
                      <div className="client-detail-modal__info-group">
                        <div className="client-detail-modal__grid client-detail-modal__grid--info">
                          <div className="client-detail-modal__row client-detail-modal__row--stack">
                            <span className="client-detail-modal__label">{t('visits.fields.purpose')}</span>
                            <span className="client-detail-modal__value">{detailVisit.purpose?.trim() || '—'}</span>
                          </div>
                        </div>
                        <div className="client-detail-modal__visit-detail-notes-wrap">
                          <span className="client-detail-modal__label client-detail-modal__visit-detail-notes-label">
                            {t('visits.fields.notes')}
                          </span>
                          <div className="client-detail-modal__visit-detail-notes">
                            {detailVisit.notes?.trim() ? detailVisit.notes : '—'}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </div>
              <footer className="client-detail-modal__footer">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setDetailId(null)}>
                  {t('visits.close')}
                </button>
                {!detailLoading && detailVisit && !detailError ? (
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    onClick={() => {
                      openEdit(detailVisit)
                      setDetailId(null)
                    }}
                  >
                    {t('visits.edit')}
                  </button>
                ) : null}
              </footer>
            </div>
          </div>
        )}

        {editId && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="visit-edit-title">
            <div className="client-detail-modal__backdrop" onClick={() => setEditId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="visit-edit-title" className="client-detail-modal__title">
                  {t('visits.editTitle')}
                </h2>
                <button type="button" className="client-detail-modal__close" onClick={() => setEditId(null)} disabled={editSubmitting} aria-label={t('visits.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">{renderVisitForm(editForm, setEditForm, editSubmitting, false)}</div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setEditId(null)} disabled={editSubmitting}>
                    {t('visits.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>
                    {editSubmitting ? t('visits.saving') : t('visits.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => setDeleteId(null)} />
            <div className="clients-modal-content">
              <h2>{t('visits.deleteConfirm')}</h2>
              <p>{t('visits.deleteConfirmMessage')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                  {t('visits.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
                  {deleteSubmitting ? t('visits.deleting') : t('visits.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
