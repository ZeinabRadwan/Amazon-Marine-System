import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
  getClientCharts,
  getFinancialSummary,
  getPricingList,
  exportClients,
  getClientVisits,
  getClientShipments,
  getClientAttachments,
  getClientAttachmentDownload,
  postClientAttachment,
  deleteClientAttachment,
} from '../../api/clients'
import {
  listClientStatuses,
  listCompanyTypes,
  listPreferredCommMethods,
  listLeadSources,
  listInterestLevels,
  listDecisionMakerTitles,
} from '../../api/clientLookups'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import Tabs from '../../components/Tabs'
import { StatsCard } from '../../components/StatsCard'
import ClientDetailModal from './ClientDetailModal'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { Eye, Pencil, Trash2, FileSpreadsheet, Users, Search, X, ArrowUpDown, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { BarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import './Clients.css'

function getMonthFormat(locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })
}

/** Map status name or id to badge variant for styling */
function getStatusBadgeVariant(statusName, statusId) {
  if (!statusName && statusId == null) return 'default'
  const name = String(statusName ?? '').toLowerCase().trim()
  if (name === 'new' || name === 'جديد') return 'new'
  if (name === 'active' || name === 'نشط') return 'active'
  if (name === 'inactive' || name === 'غير نشط') return 'inactive'
  if (name === 'pending' || name === 'قيد الانتظار' || name === 'معلق') return 'pending'
  if (name === 'prospect' || name === 'عميل محتمل') return 'prospect'
  if (name === 'lead' || name === 'عميل متوقع') return 'lead'
  return 'default'
}

/** Map status name (from API) to i18n key for localized label */
function getStatusLabelKey(statusName) {
  if (!statusName) return null
  const name = String(statusName).toLowerCase().trim()
  if (name === 'new' || name === 'جديد') return 'clients.statusNew'
  if (name === 'active' || name === 'نشط') return 'clients.statusActive'
  if (name === 'inactive' || name === 'غير نشط') return 'clients.statusInactive'
  if (name === 'pending' || name === 'قيد الانتظار' || name === 'معلق') return 'clients.statusPending'
  if (name === 'prospect' || name === 'عميل محتمل') return 'clients.statusProspect'
  if (name === 'lead' || name === 'عميل متوقع') return 'clients.statusLead'
  return null
}

/** Normalize API client: backend may return client_name/source instead of name/contact_name/lead_source */
function normalizeClient(c) {
  if (!c) return c
  return {
    ...c,
    name: c.name ?? c.client_name ?? '',
    contact_name: c.contact_name ?? c.client_name ?? '',
    lead_source: c.lead_source ?? c.source ?? '',
  }
}

/** Form shape matching backend StoreClientRequest / UpdateClientRequest */
const defaultClientForm = () => ({
  name: '',
  company_name: '',
  company_type_id: '',
  business_activity: '',
  target_markets: '',
  tax_id: '',
  email: '',
  phone: '',
  preferred_comm_method_id: '',
  address: '',
  website_url: '',
  facebook_url: '',
  linkedin_url: '',
  status_id: '',
  lead_source_id: '',
  lead_source_other: '',
  interest_level_id: '',
  decision_maker_name: '',
  decision_maker_title_id: '',
  decision_maker_title_other: '',
  notes: '',
  shipping_problems: '',
  current_need: '',
  pain_points: '',
  opportunity: '',
  special_requirements: '',
  pricing_tier: '',
  pricing_discount_pct: '',
  pricing_updated_at: '',
})

export default function Clients() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const numberLocale = 'en-US'
  const monthFormat = getMonthFormat(i18n.language)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    q: '',
    status_id: '',
    lead_source_id: '',
    sort: 'client',
    direction: 'asc',
    page: 1,
    per_page: 50,
  })
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, current_page: 1 })
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(defaultClientForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [detailClient, setDetailClient] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(defaultClientForm())
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [detailTab, setDetailTab] = useState('info')
  const [visits, setVisits] = useState([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [shipments, setShipments] = useState([])
  const [shipmentsLoading, setShipmentsLoading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [attachmentDeletingId, setAttachmentDeletingId] = useState(null)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [financialSummaryList, setFinancialSummaryList] = useState([])
  const [financialLoading, setFinancialLoading] = useState(false)
  const [pricingList, setPricingList] = useState([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [clientStatuses, setClientStatuses] = useState([])
  const [companyTypes, setCompanyTypes] = useState([])
  const [commMethods, setCommMethods] = useState([])
  const [leadSources, setLeadSources] = useState([])
  const [interestLevels, setInterestLevels] = useState([])
  const [decisionMakerTitles, setDecisionMakerTitles] = useState([])

  const pageLoading =
    loading ||
    statsLoading ||
    chartsLoading ||
    detailLoading ||
    visitsLoading ||
    shipmentsLoading ||
    attachmentsLoading ||
    financialLoading ||
    pricingLoading ||
    exportLoading ||
    createSubmitting ||
    editSubmitting ||
    deleteSubmitting ||
    attachmentUploading

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listClients(token, filters)
      .then((data) => {
        const arr = data.data ?? data.clients ?? data
        setList(Array.isArray(arr) ? arr : [])
        const meta = data.meta ?? data.pagination ?? {}
        setPagination({
          total: meta.total ?? arr.length,
          last_page: meta.last_page ?? 1,
          current_page: meta.current_page ?? meta.page ?? 1,
        })
      })
      .catch(() => setAlert({ type: 'error', message: t('clients.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, filters.q, filters.status_id, filters.lead_source_id, filters.sort, filters.direction, filters.page, filters.per_page, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getClientStats(token)
      .then((data) => setStats(data.data ?? data.stats ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getClientCharts(token, { months: 6 })
      .then((data) => setCharts(data.data ?? data.charts ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    listClientStatuses(token)
      .then((data) => setClientStatuses(data.data ?? data ?? []))
      .catch(() => setClientStatuses([]))
  }, [token])
  useEffect(() => {
    if (!token) return
    listCompanyTypes(token)
      .then((data) => setCompanyTypes(data.data ?? data ?? []))
      .catch(() => setCompanyTypes([]))
  }, [token])
  useEffect(() => {
    if (!token) return
    listPreferredCommMethods(token)
      .then((data) => setCommMethods(data.data ?? data ?? []))
      .catch(() => setCommMethods([]))
  }, [token])
  useEffect(() => {
    if (!token) return
    listLeadSources(token)
      .then((data) => setLeadSources(data.data ?? data ?? []))
      .catch(() => setLeadSources([]))
  }, [token])
  useEffect(() => {
    if (!token) return
    listInterestLevels(token)
      .then((data) => setInterestLevels(data.data ?? data ?? []))
      .catch(() => setInterestLevels([]))
  }, [token])
  useEffect(() => {
    if (!token) return
    listDecisionMakerTitles(token)
      .then((data) => setDecisionMakerTitles(data.data ?? data ?? []))
      .catch(() => setDecisionMakerTitles([]))
  }, [token])

  useEffect(() => {
    if (!detailId || !token) {
      setDetailClient(null)
      return
    }
    setDetailLoading(true)
    getClient(token, detailId)
      .then((data) => setDetailClient(normalizeClient(data.client ?? data.data ?? data)))
      .catch(() => {
        setDetailClient(null)
        setAlert({ type: 'error', message: t('clients.errorDetail') })
      })
      .finally(() => setDetailLoading(false))
  }, [token, detailId, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'visits') return
    setVisitsLoading(true)
    getClientVisits(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.visits ?? data
        setVisits(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setVisits([])
        setAlert({ type: 'warning', message: t('clients.warningVisits') })
      })
      .finally(() => setVisitsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'shipments') return
    setShipmentsLoading(true)
    getClientShipments(token, detailId, { per_page: 10 })
      .then((data) => {
        const arr = data.data ?? data.shipments ?? data
        setShipments(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setShipments([])
        setAlert({ type: 'warning', message: t('clients.warningShipments') })
      })
      .finally(() => setShipmentsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'attachments') return
    setAttachmentsLoading(true)
    getClientAttachments(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.attachments ?? data
        setAttachments(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setAttachments([])
        setAlert({ type: 'warning', message: t('clients.warningAttachments') })
      })
      .finally(() => setAttachmentsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    if (!token) return
    setFinancialLoading(true)
    getFinancialSummary(token)
      .then((data) => setFinancialSummaryList(Array.isArray(data.data) ? data.data : []))
      .catch(() => setFinancialSummaryList([]))
      .finally(() => setFinancialLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setPricingLoading(true)
    getPricingList(token)
      .then((data) => {
        const arr = data.data ?? data.pricing ?? data
        setPricingList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setPricingList([]))
      .finally(() => setPricingLoading(false))
  }, [token])

  const openEdit = (client) => {
    const n = normalizeClient(client)
    setEditId(client.id)
    setEditForm({
      name: n.name ?? '',
      company_name: n.company_name ?? '',
      company_type_id: n.company_type_id ?? '',
      business_activity: n.business_activity ?? '',
      target_markets: n.target_markets ?? '',
      tax_id: n.tax_id ?? '',
      email: n.email ?? '',
      phone: n.phone ?? '',
      preferred_comm_method_id: n.preferred_comm_method_id ?? '',
      address: n.address ?? '',
      website_url: n.website_url ?? '',
      facebook_url: n.facebook_url ?? '',
      linkedin_url: n.linkedin_url ?? '',
      status_id: n.status_id ?? '',
      lead_source_id: n.lead_source_id ?? '',
      lead_source_other: n.lead_source_other ?? '',
      interest_level_id: n.interest_level_id ?? '',
      decision_maker_name: n.decision_maker_name ?? '',
      decision_maker_title_id: n.decision_maker_title_id ?? '',
      decision_maker_title_other: n.decision_maker_title_other ?? '',
      notes: n.notes ?? '',
      shipping_problems: n.shipping_problems ?? '',
      current_need: n.current_need ?? '',
      pain_points: n.pain_points ?? '',
      opportunity: n.opportunity ?? '',
      special_requirements: n.special_requirements ?? '',
      pricing_tier: n.pricing_tier ?? '',
      pricing_discount_pct: n.pricing_discount_pct ?? '',
      pricing_updated_at: n.pricing_updated_at ?? '',
    })
  }

  const buildClientPayload = (form) => {
    const num = (v) => (v !== '' && v != null ? Number(v) : null)
    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)
    return {
      name: form.name?.trim() || '',
      company_name: str(form.company_name),
      company_type_id: num(form.company_type_id),
      business_activity: str(form.business_activity),
      target_markets: str(form.target_markets),
      tax_id: str(form.tax_id),
      email: str(form.email),
      phone: str(form.phone),
      preferred_comm_method_id: num(form.preferred_comm_method_id),
      address: str(form.address),
      website_url: str(form.website_url),
      facebook_url: str(form.facebook_url),
      linkedin_url: str(form.linkedin_url),
      status_id: num(form.status_id),
      lead_source_id: num(form.lead_source_id),
      lead_source_other: str(form.lead_source_other),
      interest_level_id: num(form.interest_level_id),
      decision_maker_name: str(form.decision_maker_name),
      decision_maker_title_id: num(form.decision_maker_title_id),
      decision_maker_title_other: str(form.decision_maker_title_other),
      notes: str(form.notes),
      shipping_problems: str(form.shipping_problems),
      current_need: str(form.current_need),
      pain_points: str(form.pain_points),
      opportunity: str(form.opportunity),
      special_requirements: str(form.special_requirements),
      pricing_tier: str(form.pricing_tier),
      pricing_discount_pct: form.pricing_discount_pct !== '' && form.pricing_discount_pct != null ? Number(form.pricing_discount_pct) : null,
      pricing_updated_at: str(form.pricing_updated_at) || null,
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    setCreateSubmitting(true)
    try {
      const payload = buildClientPayload(createForm)
      await createClient(token, payload)
      setShowCreate(false)
      setCreateForm(defaultClientForm())
      loadList()
      setAlert({ type: 'success', message: t('clients.created') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorCreate') })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editId) return
    setAlert(null)
    setEditSubmitting(true)
    try {
      const payload = buildClientPayload(editForm)
      await updateClient(token, editId, payload)
      setEditId(null)
      loadList()
      if (detailId === editId) setDetailClient(null)
      setDetailId(null)
      setAlert({ type: 'success', message: t('clients.updated') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorUpdate') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setAlert(null)
    setDeleteSubmitting(true)
    try {
      await deleteClient(token, deleteId)
      setDeleteId(null)
      if (detailId === deleteId) {
        setDetailId(null)
        setDetailClient(null)
      }
      loadList()
      setAlert({ type: 'success', message: t('clients.deleted') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorDelete') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    setAlert(null)
    setExportLoading(true)
    try {
      const blob = await exportClients(token, { ...filters })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setAlert({ type: 'success', message: t('clients.exportSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorExport') })
    } finally {
      setExportLoading(false)
    }
  }

  const handleAttachmentUpload = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !detailId || !token) return
    setAlert(null)
    setAttachmentUploading(true)
    try {
      await postClientAttachment(token, detailId, file)
      const data = await getClientAttachments(token, detailId)
      const arr = data.data ?? data.attachments ?? data
      setAttachments(Array.isArray(arr) ? arr : [])
      setAlert({ type: 'success', message: t('clients.attachmentUploaded') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorAttachmentUpload') })
    } finally {
      setAttachmentUploading(false)
      e.target.value = ''
    }
  }

  const handleAttachmentDownload = async (clientId, attachmentId, fileName) => {
    if (!clientId || !attachmentId || !token) return
    setAlert(null)
    try {
      const blob = await getClientAttachmentDownload(token, clientId, attachmentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || `attachment-${attachmentId}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorAttachmentDownload') })
    }
  }

  const handleAttachmentDelete = async (attachmentId) => {
    if (!detailId || !token) return
    setAlert(null)
    setAttachmentDeletingId(attachmentId)
    try {
      await deleteClientAttachment(token, detailId, attachmentId)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      setAlert({ type: 'success', message: t('clients.attachmentDeleted') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorAttachmentDelete') })
    } finally {
      setAttachmentDeletingId(null)
    }
  }

  /** Form sections and field order matching reference (Basic → Decision Maker → Source & Sales → Notes); attachments excluded */
  const clientFormSections = [
    {
      titleKey: 'clients.sections.basic',
      fields: [
        { key: 'name', type: 'text', required: true },
        { key: 'company_name', type: 'text', required: true },
        { key: 'company_type_id', type: 'select', options: companyTypes },
        { key: 'business_activity', type: 'text' },
        { key: 'target_markets', type: 'text' },
        { key: 'shipping_problems', type: 'textarea', rows: 2 },
        { key: 'preferred_comm_method_id', type: 'select', options: commMethods },
        { key: 'phone', type: 'text' },
        { key: 'email', type: 'email' },
        { key: 'interest_level_id', type: 'select', options: interestLevels },
        { key: 'address', type: 'text' },
        { key: 'website_url', type: 'text' },
        { key: 'tax_id', type: 'text' },
        { key: 'facebook_url', type: 'text' },
        { key: 'linkedin_url', type: 'text' },
      ],
    },
    {
      titleKey: 'clients.sections.decisionMaker',
      fields: [
        { key: 'decision_maker_name', type: 'text' },
        { key: 'decision_maker_title_id', type: 'select', options: decisionMakerTitles },
        { key: 'decision_maker_title_other', type: 'text' },
      ],
    },
    {
      titleKey: 'clients.sections.sourceSales',
      fields: [
        { key: 'lead_source_id', type: 'select', options: leadSources },
        { key: 'lead_source_other', type: 'text' },
        { key: 'status_id', type: 'select', options: clientStatuses },
      ],
    },
    {
      titleKey: 'clients.sections.notesGuidance',
      fields: [
        { key: 'current_need', type: 'textarea', rows: 2 },
        { key: 'pain_points', type: 'textarea', rows: 2 },
        { key: 'opportunity', type: 'textarea', rows: 2 },
        { key: 'special_requirements', type: 'textarea', rows: 2 },
        { key: 'notes', type: 'textarea', rows: 4 },
      ],
    },
  ]

  const renderForm = (form, setForm, disabled) => (
    <div className="clients-form-sections">
      {clientFormSections.map((section) => (
        <section key={section.titleKey} className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">{t(section.titleKey)}</h3>
          <div className="client-detail-modal__form-grid">
            {section.fields.map((field) => {
              const key = field.key
              const labelKey = `clients.fields.${key}`
              const value = form[key] ?? ''
              const update = (v) => setForm((f) => ({ ...f, [key]: v }))
              if (field.type === 'select') {
                const options = field.options ?? []
                return (
                  <div key={key} className="client-detail-modal__form-field">
                    <label htmlFor={`client-${key}`}>{t(labelKey)}</label>
                    <select
                      id={`client-${key}`}
                      value={value}
                      onChange={(e) => update(e.target.value)}
                      disabled={disabled}
                      aria-label={t(labelKey)}
                    >
                      <option value="">—</option>
                      {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }
              if (field.type === 'textarea') {
                return (
                  <div key={key} className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor={`client-${key}`}>{t(labelKey)}</label>
                    <textarea
                      id={`client-${key}`}
                      value={value}
                      onChange={(e) => update(e.target.value)}
                      disabled={disabled}
                      rows={field.rows ?? 3}
                      aria-label={t(labelKey)}
                    />
                  </div>
                )
              }
              if (field.type === 'number') {
                return (
                  <div key={key} className="client-detail-modal__form-field">
                    <label htmlFor={`client-${key}`}>{t(labelKey)}</label>
                    <input
                      id={`client-${key}`}
                      type="number"
                      min={field.min ?? 0}
                      max={field.max}
                      step={field.step ?? 'any'}
                      value={value}
                      onChange={(e) => update(e.target.value)}
                      disabled={disabled}
                      aria-label={t(labelKey)}
                    />
                  </div>
                )
              }
              if (field.type === 'date') {
                return (
                  <div key={key} className="client-detail-modal__form-field">
                    <label htmlFor={`client-${key}`}>{t(labelKey)}</label>
                    <input
                      id={`client-${key}`}
                      type="date"
                      value={value}
                      onChange={(e) => update(e.target.value)}
                      disabled={disabled}
                      aria-label={t(labelKey)}
                    />
                  </div>
                )
              }
              return (
                <div key={key} className="client-detail-modal__form-field">
                  <label htmlFor={`client-${key}`}>{t(labelKey)}</label>
                  <input
                    id={`client-${key}`}
                    type={field.type === 'email' ? 'email' : 'text'}
                    value={value}
                    onChange={(e) => update(e.target.value)}
                    disabled={disabled}
                    required={field.required}
                    aria-label={t(labelKey)}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )

  const clientColumns = [
    {
      key: 'name',
      sortKey: 'client',
      label: t('clients.fields.name'),
      render: (_, c) => c.client_name ?? c.name ?? '—',
    },
    { key: 'company_name', label: t('clients.fields.company_name') },
    { key: 'email', label: t('clients.fields.email') },
    { key: 'phone', label: t('clients.fields.phone') },
    {
      key: 'status',
      label: t('clients.fields.status'),
      render: (_, c) => {
        const statusName = c.status ?? clientStatuses.find((s) => Number(s.id) === Number(c.status_id))?.name ?? '—'
        const variant = getStatusBadgeVariant(statusName, c.status_id)
        const label = getStatusLabelKey(statusName) ? t(getStatusLabelKey(statusName)) : statusName
        return (
          <span className={`clients-status-badge clients-status-badge--${variant}`} title={label}>
            {label}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: t('clients.actions'),
      render: (_, c) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('clients.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('clients.view')}
            onClick={() => setDetailId(c.id)}
          />
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('clients.edit')}
            onClick={() => openEdit(c)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('clients.delete')}
            onClick={() => setDeleteId(c.id)}
            variant="danger"
          />
        </div>
      ),
    },
  ]

  return (
    <Container size="xl">
      <div className="clients-page">
      {pageLoading && (
        <div className="clients-page-loader" aria-live="polite" aria-busy="true">
          <LoaderDots />
        </div>
      )}
      {stats && typeof stats === 'object' && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              key: 'total_clients',
              variant: 'blue',
              format: 'number',
              trendDirectionKey: 'total_clients_trend_direction',
              trendPctKey: 'total_clients_trend_pct',
            },
            {
              key: 'active_clients',
              variant: 'green',
              format: 'number',
              trendDirectionKey: 'active_clients_trend_direction',
              trendPctKey: 'active_clients_trend_pct',
            },
            {
              key: 'new_clients_this_month',
              variant: 'amber',
              format: 'number',
              trendDirectionKey: 'new_clients_trend_direction',
              trendValueKey: 'new_clients_trend_value',
              trendPctKey: 'new_clients_trend_pct',
              useDiffForChange: true,
            },
            {
              key: 'total_revenue_from_clients',
              variant: 'default',
              format: 'currency',
              trendDirectionKey: 'total_revenue_trend_direction',
              trendPctKey: 'total_revenue_trend_pct',
            },
          ].map((cfg) => {
            const value = stats[cfg.key]
            const title = t(`clients.stats.${cfg.key}`, { defaultValue: cfg.key.replace(/_/g, ' ') })
            const displayValue =
              cfg.format === 'currency' && typeof value === 'number'
                ? new Intl.NumberFormat(numberLocale, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  }).format(value)
                : typeof value === 'number'
                  ? new Intl.NumberFormat(numberLocale).format(value)
                  : String(value ?? '—')
            const direction = stats[cfg.trendDirectionKey] || null
            const pct = stats[cfg.trendPctKey]
            const diff = cfg.trendValueKey != null ? stats[cfg.trendValueKey] : null
            const changeDisplay =
              cfg.useDiffForChange && diff != null && direction !== 'same'
                ? `${diff > 0 ? '+' : ''}${diff} ${t('clients.stats.vsLastMonth', 'vs last month')}`
                : pct != null && direction !== 'same'
                  ? pct
                  : null
            return (
              <StatsCard
                key={cfg.key}
                title={title}
                value={displayValue}
                icon={<Users className="h-6 w-6" />}
                variant={cfg.variant}
                trend={direction === 'up' || direction === 'down' ? direction : undefined}
                change={changeDisplay ?? undefined}
              />
            )
          })}
        </div>
      )}

      <div className="clients-extra-panel clients-charts-panel mb-4">
        {charts && (charts.new_clients_by_month?.length > 0 || charts.by_lead_source?.length > 0) ? (
          <div className="clients-charts-grid">
            {charts.new_clients_by_month?.length > 0 && (
              <div className="clients-chart-wrap">
                <BarChart
                  data={charts.new_clients_by_month.map((d) => ({
                    ...d,
                    monthLabel: d.month ? monthFormat.format(new Date(d.month)) : d.month,
                  }))}
                  xKey="monthLabel"
                  yKey="count"
                  xLabel={t('clients.chartsMonth', 'Month')}
                  yLabel={t('clients.chartsCount', 'Count')}
                  valueLabel={t('clients.chartsCount', 'Count')}
                  title={t('clients.chartsNewClientsByMonth', 'New clients by month')}
                  height={260}
                />
              </div>
            )}
            {charts.by_lead_source?.length > 0 && (
              <div className="clients-chart-wrap">
                <DonutChart
                  data={charts.by_lead_source.map((item) => ({
                    ...item,
                    displayName: t(`clients.leadSource.${item.lead_source_name}`, item.lead_source_name),
                  }))}
                  nameKey="displayName"
                  valueKey="count"
                  valueLabel={t('clients.chartsCount', 'Count')}
                  title={t('clients.chartsByLeadSource', 'By lead source')}
                  height={260}
                />
              </div>
            )}
          </div>
        ) : charts && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.chartsNoData', 'No chart data')}</p>
        )}
      </div>

      <div className="clients-filters-card">
        <div className="clients-filters__row clients-filters__row--main">
          <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Search className="clients-filters__search-icon" aria-hidden />
            <input
              type="search"
              placeholder={t('clients.searchPlaceholder', t('clients.search'))}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              className="clients-input clients-filters__search"
              aria-label={t('clients.search')}
            />
          </div>
          <div className="clients-filters__fields">
            <select
              value={filters.status_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status_id: e.target.value, page: 1 }))}
              className="clients-input"
              aria-label={t('clients.status')}
            >
              <option value="">{t('clients.statusAll')}</option>
              {clientStatuses.map((s) => {
                const label = getStatusLabelKey(s.name) ? t(getStatusLabelKey(s.name)) : s.name
                return (
                  <option key={s.id} value={s.id}>
                    {label}
                  </option>
                )
              })}
            </select>
            <select
              value={filters.lead_source_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, lead_source_id: e.target.value, page: 1 }))}
              className="clients-input"
              aria-label={t('clients.filterLeadSource')}
            >
              <option value="">{t('clients.leadSourceAll')}</option>
              {leadSources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="clients-filters__clear clients-filters__btn-icon"
            onClick={() => setFilters((f) => ({
              ...f,
              q: '',
              status_id: '',
              lead_source_id: '',
              sort: 'client',
              direction: 'asc',
              page: 1,
            }))}
            aria-label={t('clients.clearFilters')}
            title={t('clients.clearFilters')}
          >
            <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
          </button>
          <button
            type="button"
            className="clients-filters__sort-toggle clients-filters__btn-icon"
            onClick={() => setShowSort((v) => !v)}
            aria-expanded={showSort}
            aria-controls="clients-sort-panel"
            id="clients-sort-toggle"
            title={t('clients.sortBy')}
          >
            <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
            {showSort ? <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />}
          </button>
          <div className="clients-filters__actions">
            <button
              type="button"
              className="clients-filters__btn-icon clients-filters__btn-icon--export"
              onClick={handleExport}
              disabled={exportLoading}
              aria-label={t('pageHeader.export', 'Export')}
              title={t('pageHeader.export', 'Export')}
            >
              {exportLoading ? (
                <span className="clients-filters__export-spinner" aria-hidden />
              ) : (
                <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="page-header__btn page-header__btn--primary"
              onClick={() => setShowCreate(true)}
            >
              {t('clients.createClient')}
            </button>
          </div>
        </div>
        <div
          id="clients-sort-panel"
          className="clients-filters__row clients-filters__row--sort"
          role="region"
          aria-labelledby="clients-sort-toggle"
          hidden={!showSort}
        >
          <div className="clients-filters__sort-group">
            <label className="clients-filters__sort-label" htmlFor="clients-sort-by">
              {t('clients.sortBy')}
            </label>
            <select
              id="clients-sort-by"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="clients-select"
              aria-label={t('clients.sortBy')}
            >
              <option value="client">{t('clients.sortClient')}</option>
              <option value="company_name">{t('clients.sortCompany')}</option>
              <option value="created_at">created_at</option>
            </select>
            <select
              value={filters.direction}
              onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
              className="clients-select clients-filters__direction"
              aria-label={t('clients.sortOrder')}
            >
              <option value="asc">{t('clients.directionAsc')}</option>
              <option value="desc">{t('clients.directionDesc')}</option>
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

      {list.length === 0 ? (
        <p className="clients-empty">{t('clients.noClients')}</p>
      ) : (
        <Table
          columns={clientColumns}
          data={list}
          getRowKey={(c) => c.id}
          emptyMessage={t('clients.noClients')}
          sortKey={filters.sort}
          sortDirection={filters.direction}
          onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction }))}
        />
      )}

      {list.length > 0 && pagination.last_page > 0 && (
        <div className="clients-pagination">
          <div className="clients-pagination__left">
            <span className="clients-pagination__total">
              {t('clients.total', 'Total')}: {pagination.total}
            </span>
            <label className="clients-pagination__per-page">
              <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
              <select
                value={filters.per_page}
                onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                className="clients-select clients-pagination__select"
                aria-label={t('clients.perPage', 'Per page')}
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
            totalPages={Math.max(1, pagination.last_page)}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-create-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => setShowCreate(false)} />
          <div className="client-detail-modal__box client-detail-modal__box--form">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="client-create-modal-title" className="client-detail-modal__title">
                {t('clients.createClient')}
              </h2>
              <button
                type="button"
                className="client-detail-modal__close"
                onClick={() => setShowCreate(false)}
                disabled={createSubmitting}
                aria-label={t('clients.close', 'Close')}
              >
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <div className="client-detail-modal__body-inner">{renderForm(createForm, setCreateForm, createSubmitting)}</div>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? t('clients.saving') : t('clients.save')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ClientDetailModal
        open={!!detailId}
        detailId={detailId}
        detailClient={detailClient}
        detailTab={detailTab}
        onTabChange={setDetailTab}
        onClose={() => { setDetailId(null); setDetailClient(null); setDetailTab('info') }}
        onEdit={openEdit}
        visits={visits}
        shipments={shipments}
        attachments={attachments}
        attachmentUploading={attachmentUploading}
        attachmentDeletingId={attachmentDeletingId}
        onAttachmentUpload={handleAttachmentUpload}
        onAttachmentDownload={handleAttachmentDownload}
        onAttachmentDelete={handleAttachmentDelete}
        financialSummaryList={financialSummaryList}
        pricingList={pricingList}
        numberLocale={numberLocale}
      />

      {/* Edit modal */}
      {editId && (
        <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-edit-modal-title">
          <div className="client-detail-modal__backdrop" onClick={() => setEditId(null)} />
          <div className="client-detail-modal__box client-detail-modal__box--form">
            <header className="client-detail-modal__header client-detail-modal__header--form">
              <h2 id="client-edit-modal-title" className="client-detail-modal__title">
                {t('clients.editClient')}
              </h2>
              <button
                type="button"
                className="client-detail-modal__close"
                onClick={() => setEditId(null)}
                disabled={editSubmitting}
                aria-label={t('clients.close', 'Close')}
              >
                <X className="client-detail-modal__close-icon" aria-hidden />
              </button>
            </header>
            <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <div className="client-detail-modal__body-inner">{renderForm(editForm, setEditForm, editSubmitting)}</div>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setEditId(null)} disabled={editSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>
                  {editSubmitting ? t('clients.saving') : t('clients.save')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="clients-modal" role="dialog" aria-modal="true">
          <div className="clients-modal-backdrop" onClick={() => setDeleteId(null)} />
          <div className="clients-modal-content">
            <h2>{t('clients.deleteConfirm')}</h2>
            <p>{t('clients.deleteConfirmMessage')}</p>
            <div className="clients-modal-actions">
              <button type="button" className="clients-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                {t('clients.cancel')}
              </button>
              <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
                {deleteSubmitting ? t('clients.deleting') : t('clients.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Container>
  )
}
