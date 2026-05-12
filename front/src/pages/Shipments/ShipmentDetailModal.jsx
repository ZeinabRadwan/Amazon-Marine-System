import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Pencil,
  Trash2,
  StickyNote,
  FileDown,
  Save,
} from 'lucide-react'
import { getStoredToken } from '../Login'
import { formatDate } from '../../utils/dateUtils'
import LoaderDots from '../../components/LoaderDots'
import '../../components/LoaderDots/LoaderDots.css'
import {
  listShipmentNotes,
  postShipmentNote,
  patchShipmentNote,
  deleteShipmentNote,
  getShipmentTrackingUpdates,
  postShipmentTrackingUpdate,
  getShipmentOperations,
  updateShipmentOperations,
  getShipmentTasks,
  bulkUpdateShipmentTasks,
  downloadShipmentPdf,
} from '../../api/shipments'
import Tabs from '../../components/Tabs'
import ShipmentStatusBadge from '../../components/ShipmentStatusBadge'
import { getPipelineStepIndex, PIPELINE_STEP_KEYS } from './shipmentPipeline'
import { listActivitiesBySubject } from '../../api/activities'
import { SERVICE_TYPE_IDS, OPERATIONAL_PHASE_ORDER } from './shipmentOpsConstants'
import ShipmentOperationsTasksPanel from './ShipmentOperationsTasksPanel'
import { normalizeShipmentOperationTask, serializeShipmentOperationTaskForApi } from './shipmentOperationTaskPayload'
import { formatShipmentAuditRow } from './shipmentAuditPresentation'
import './Shipments.css'
import '../SDForms/SDForms.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'



function formatMoney(v, locale) {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 }).format(Number(v))
}

function shipmentDisplayMode(mode, t) {
  if (!mode) return '—'
  return t(`shipments.modeOptions.${mode}`, { defaultValue: mode })
}

function shipmentDisplayShipmentType(type, t) {
  if (!type) return '—'
  return t(`shipments.shipmentTypeOptions.${type}`, { defaultValue: type })
}

function shipmentDisplayDirection(dir, t) {
  if (!dir) return '—'
  return t(`shipments.directionOption.${dir}`, { defaultValue: dir })
}

function shipmentDisplayContainerType(ct, t) {
  if (!ct) return '—'
  const keyMap = {
    Dry: 'dry',
    Reefer: 'reefer',
    'Open Top': 'openTop',
    'Flat Rack': 'flatRack',
    'High Cube': 'highCube',
  }
  const k = keyMap[ct]
  return k ? t(`shipments.containerTypes.${k}`) : ct
}

function shipmentDisplayContainerSize(sz, t) {
  if (sz == null || sz === '') return '—'
  return t(`shipments.containerSizes.${sz}`, { defaultValue: String(sz) })
}

/** Free-text `notes` column on shipments. Must stay a string: a morph relation used to be named `notes` and overwrote this in API JSON with an array. */
function shipmentFreeTextNotes(shipment) {
  if (!shipment) return ''
  const raw = shipment.notes
  return typeof raw === 'string' ? raw : ''
}

function shipmentClientDisplayName(shipment) {
  return shipment?.client?.company_name ?? shipment?.client?.name ?? shipment?.client_name ?? '—'
}

export default function ShipmentDetailModal({
  open,
  shipment,
  shipmentLoading,
  detailTab,
  onTabChange,
  onClose,
  onEdit,
  canManageOps = false,
  canViewFinancialTotals = false,
  canViewSelling = false,
  statusOptions = [],
  isOperations = false,
  isAdminRole = false,
  vendorOptions = [],
  userOptions = [],
  onOperationsSaved = null,
  currentUserId = null,
  canAddShipmentNote = false,
  canManageAllShipmentNotes = false,
}) {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'

  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [noteError, setNoteError] = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteDraft, setEditNoteDraft] = useState('')
  const [notePatchingId, setNotePatchingId] = useState(null)
  const [noteDeletingId, setNoteDeletingId] = useState(null)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [exportPdfError, setExportPdfError] = useState(null)

  const [trackingUpdates, setTrackingUpdates] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingText, setTrackingText] = useState('')
  const [trackingSubmitting, setTrackingSubmitting] = useState(false)
  const [trackingError, setTrackingError] = useState(null)
  
  const [opsData, setOpsData] = useState(null)
  const [opsLoading, setOpsLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [opsSaving, setOpsSaving] = useState(false)
  const [opsError, setOpsError] = useState(null)
  const [auditRows, setAuditRows] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState(null)

  const loadNotes = useCallback(() => {
    if (!token || !shipment?.id) return
    setNotesLoading(true)
    listShipmentNotes(token, shipment.id)
      .then((res) => setNotes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false))
  }, [token, shipment?.id])

  const loadTracking = useCallback(() => {
    if (!token || !shipment?.id) return
    setTrackingLoading(true)
    getShipmentTrackingUpdates(token, shipment.id)
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : []
        setTrackingUpdates([...arr].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))))
      })
      .catch(() => setTrackingUpdates([]))
      .finally(() => setTrackingLoading(false))
  }, [token, shipment?.id])

  const loadOpsData = useCallback(() => {
    if (!token || !shipment?.id) return
    setOpsLoading(true)
    getShipmentOperations(token, shipment.id)
      .then((res) => {
        const d = res.data || {}
        if (!Array.isArray(d.service_types) || d.service_types.length === 0) {
          d.service_types = ['sea_freight']
        }
        if (d.cut_off_date && String(d.cut_off_date).length > 10) {
          d.cut_off_date = String(d.cut_off_date).slice(0, 10)
        }
        for (const k of ['etd', 'eta', 'ops_loading_date']) {
          if (d[k] && String(d[k]).length > 10) d[k] = String(d[k]).slice(0, 10)
        }
        setOpsData(d)
      })
      .catch(() => setOpsData({}))
      .finally(() => setOpsLoading(false))
  }, [token, shipment?.id])

  const loadAudit = useCallback(() => {
    if (!token || !shipment?.id) return
    setAuditLoading(true)
    setAuditError(null)
    listActivitiesBySubject(token, { subjectType: 'shipment', subjectId: shipment.id, perPage: 100 })
      .then((r) => setAuditRows(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        setAuditRows([])
        setAuditError(err.message || t('shipments.ops.auditLoadError'))
      })
      .finally(() => setAuditLoading(false))
  }, [token, shipment?.id, t])

  const loadTasks = useCallback(() => {
    if (!token || !shipment?.id) return Promise.resolve()
    setTasksLoading(true)
    return getShipmentTasks(token, shipment.id)
      .then((res) =>
        setTasks((Array.isArray(res.data) ? res.data : []).map(normalizeShipmentOperationTask))
      )
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false))
  }, [token, shipment?.id])

  const inlandVendorOptions = useMemo(
    () => (Array.isArray(vendorOptions) ? vendorOptions.filter((v) => v.type === 'inland_transport') : []),
    [vendorOptions],
  )
  const customsVendorOptions = useMemo(
    () => (Array.isArray(vendorOptions) ? vendorOptions.filter((v) => v.type === 'customs_clearance') : []),
    [vendorOptions],
  )
  const insuranceVendorOptions = useMemo(
    () => (Array.isArray(vendorOptions) ? vendorOptions.filter((v) => v.type === 'insurance') : []),
    [vendorOptions],
  )
  const otherPartyVendorOptions = useMemo(
    () =>
      Array.isArray(vendorOptions)
        ? vendorOptions.filter((v) => v.type === 'other' || v.type === 'overseas_agent')
        : [],
    [vendorOptions],
  )
  const userNameById = useMemo(() => {
    const map = {}
    if (Array.isArray(userOptions)) {
      userOptions.forEach((u) => {
        map[String(u.id)] = u.name
      })
    }
    return map
  }, [userOptions])

  useEffect(() => {
    if (!open || detailTab !== 'notes' || !shipment?.id) {
      setNotes([])
      return
    }
    setNoteError(null)
    loadNotes()
  }, [open, detailTab, shipment?.id, loadNotes])

  useEffect(() => {
    if (!open || detailTab !== 'tracking' || !shipment?.id) {
      setTrackingUpdates([])
      return
    }
    loadTracking()
  }, [open, detailTab, shipment?.id, loadTracking])

  useEffect(() => {
    if (!open) {
      setNoteText('')
      setNoteError(null)
      setEditingNoteId(null)
      setEditNoteDraft('')
      setNotePatchingId(null)
      setNoteDeletingId(null)
      setPdfExporting(false)
      setExportPdfError(null)
      setTrackingText('')
      setTrackingError(null)
      setOpsError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !shipment?.id || !(isOperations || isAdminRole)) return
    const opsRelatedTabs = ['operations', 'audit_log', 'transport_instructions']
    if (!opsRelatedTabs.includes(detailTab)) return
    loadOpsData()
    if (detailTab === 'operations') {
      loadTasks()
    }
  }, [open, detailTab, shipment?.id, isOperations, isAdminRole, loadOpsData, loadTasks])

  useEffect(() => {
    if (!open || detailTab !== 'audit_log' || !shipment?.id || !(isOperations || isAdminRole)) {
      setAuditRows([])
      setAuditError(null)
      return
    }
    loadAudit()
  }, [open, detailTab, shipment?.id, isOperations, isAdminRole, loadAudit])

  if (!open) return null

  const tabs = [
    { id: 'info', label: t('shipments.tabs.info') },
    { id: 'tracking', label: t('shipments.tabs.tracking') },
    { id: 'notes', label: t('shipments.tabs.notes') },
    ...(isOperations || isAdminRole
      ? [
          { id: 'operations', label: t('shipments.tabs.operations') },
          { id: 'audit_log', label: t('shipments.tabs.auditLog') },
          { id: 'transport_instructions', label: t('shipments.tabs.transportInstructions') },
        ]
      : []),
  ]

  const canEditOps = isOperations || isAdminRole

  const clientLabel =
    shipment?.client?.company_name ?? shipment?.client?.name ?? shipment?.client_name ?? '—'
  const lineVendor = shipment?.line_vendor?.name ?? shipment?.lineVendor?.name ?? '—'
  const shippingLineName =
    shipment?.shipping_line?.name ?? shipment?.shippingLine?.name ?? '—'

  const activePipelineIdx = shipment ? getPipelineStepIndex(shipment.status) : 0

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!token || !shipment?.id || !noteText.trim()) return
    setNoteError(null)
    setNoteSubmitting(true)
    try {
      await postShipmentNote(token, shipment.id, { content: noteText.trim() })
      setNoteText('')
      loadNotes()
    } catch (err) {
      setNoteError(err.message || t('shipments.errorNote'))
    } finally {
      setNoteSubmitting(false)
    }
  }

  const canEditThisNote = (note) =>
    canManageAllShipmentNotes ||
    (currentUserId != null && Number(note.author_id) === Number(currentUserId))

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditNoteDraft('')
  }

  const handleSaveEditNote = async (e) => {
    e?.preventDefault?.()
    if (!token || !shipment?.id || !editingNoteId || !editNoteDraft.trim()) return
    setNotePatchingId(editingNoteId)
    setNoteError(null)
    try {
      await patchShipmentNote(token, shipment.id, editingNoteId, { content: editNoteDraft.trim() })
      cancelEditNote()
      loadNotes()
    } catch (err) {
      setNoteError(err.message || t('shipments.errorNoteUpdate'))
    } finally {
      setNotePatchingId(null)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!token || !shipment?.id) return
    if (!window.confirm(t('shipments.noteDeleteConfirm'))) return
    setNoteDeletingId(noteId)
    setNoteError(null)
    try {
      await deleteShipmentNote(token, shipment.id, noteId)
      if (editingNoteId === noteId) cancelEditNote()
      loadNotes()
    } catch (err) {
      setNoteError(err.message || t('shipments.errorNoteDelete'))
    } finally {
      setNoteDeletingId(null)
    }
  }

  const handleExportPdf = async () => {
    if (!token || !shipment?.id) return
    setExportPdfError(null)
    setPdfExporting(true)
    try {
      const { blob, filename } = await downloadShipmentPdf(token, shipment.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportPdfError(err?.message || t('shipments.exportPdfError'))
    } finally {
      setPdfExporting(false)
    }
  }

  const handleAddTracking = async (e) => {
    e.preventDefault()
    if (!token || !shipment?.id || !trackingText.trim()) return
    setTrackingError(null)
    setTrackingSubmitting(true)
    try {
      await postShipmentTrackingUpdate(token, shipment.id, { update_text: trackingText.trim() })
      setTrackingText('')
      loadTracking()
    } catch (err) {
      setTrackingError(err.message || t('shipments.errorTracking'))
    } finally {
      setTrackingSubmitting(false)
    }
  }

  const toggleServiceType = (typeId) => {
    setOpsData((prev) => {
      if (!prev) return prev
      const cur = Array.isArray(prev.service_types) ? [...prev.service_types] : []
      const has = cur.includes(typeId)
      if (has && cur.length <= 1) return prev
      if (has) return { ...prev, service_types: cur.filter((x) => x !== typeId) }
      return { ...prev, service_types: [...cur, typeId] }
    })
  }

  const handleSaveOps = async () => {
    if (!token || !shipment?.id || !opsData) return
    setOpsSaving(true)
    setOpsError(null)
    try {
      const types = Array.isArray(opsData.service_types) ? opsData.service_types : []
      if (types.length === 0) {
        setOpsError(t('shipments.ops.serviceTypeRequired'))
        return
      }
      if (types.includes('inland_transport') && !String(opsData.transport_contractor_id || '').trim()) {
        setOpsError(t('shipments.ops.inlandContractorRequired'))
        return
      }
      if (types.includes('customs_clearance') && !String(opsData.customs_broker_id || '').trim()) {
        setOpsError(t('shipments.ops.customsBrokerRequired'))
        return
      }

      await updateShipmentOperations(token, shipment.id, {
        service_types: types,
        transport_contractor_id: opsData.transport_contractor_id || null,
        customs_broker_id: opsData.customs_broker_id || null,
        insurance_company_id: opsData.insurance_company_id || null,
        overseas_agent_id: opsData.overseas_agent_id || null,
        cut_off_date: opsData.cut_off_date || null,
        etd: opsData.etd || null,
        eta: opsData.eta || null,
        ops_loading_date: opsData.ops_loading_date || null,
        transport_instructions: opsData.transport_instructions ?? null,
        operational_status_code: opsData.operational_status_code || null,
      })

      if (detailTab === 'operations' && tasks.length > 0) {
        await bulkUpdateShipmentTasks(
          token,
          shipment.id,
          tasks.map(serializeShipmentOperationTaskForApi)
        )
      }

      onOperationsSaved?.()
      loadOpsData()
      if (detailTab === 'operations') {
        loadTasks()
      }
    } catch (err) {
      setOpsError(err.message || t('shipments.ops.opsError'))
    } finally {
      setOpsSaving(false)
    }
  }

  return (
    <div className="client-detail-modal shipment-detail-modal--sd shipment-detail-modal--navy-header" role="dialog" aria-modal="true" aria-labelledby="shipment-detail-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-detail-modal-box">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <div className="client-detail-modal__header-inner">
            <h2 id="shipment-detail-title" className="client-detail-modal__title">
              {shipmentLoading ? '…' : (shipment?.bl_number ?? shipment?.booking_number ?? `#${shipment?.id}`)}
            </h2>
            {!shipmentLoading && shipment && clientLabel !== '—' && (
              <p className="client-detail-modal__subtitle sd-form-modal-preview__hint">{clientLabel}</p>
            )}
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('shipments.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <Tabs tabs={tabs} activeTab={detailTab} onChange={onTabChange} className="client-detail-modal__tabs shipment-detail-modal__tabs" />

        <div
          className="client-detail-modal__body client-detail-modal__body--form"
          role="tabpanel"
          id={`panel-${detailTab}`}
          aria-labelledby={`tab-${detailTab}`}
        >
          <div className="client-detail-modal__body-inner clients-form-sections">
          {detailTab === 'info' && (
            <section className="client-detail-modal__section client-detail-modal__section--info">
              {shipmentLoading || !shipment ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : (
                <div className="client-detail-modal__info-tab">
                  <div className="sd-detail-modal__toolbar">
                    {/* <button
                      type="button"
                      className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs"
                      onClick={handleExportPdf}
                      disabled={pdfExporting}
                    >
                      {pdfExporting ? (
                        <LoaderDots size={8} className="inline-flex" />
                      ) : (
                        <FileDown className="h-4 w-4" aria-hidden />
                      )}
                      {pdfExporting ? t('shipments.exportPdfLoading') : t('shipments.exportPdf')}
                    </button> */}
                    {canManageOps && (
                      <button
                        type="button"
                        className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs"
                        onClick={() => {
                          onEdit?.(shipment)
                          onClose()
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        {t('shipments.edit')}
                      </button>
                    )}
                  </div>
                  {exportPdfError && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
                      {exportPdfError}
                    </p>
                  )}
                  <div className="shipment-details-grid">
                    <div className="col-span-2">
                      <div className="shipment-pipeline" aria-label={t('shipments.pipelineLabel')}>
                        {PIPELINE_STEP_KEYS.map((key, idx) => {
                          const done = idx < activePipelineIdx
                          const active = idx === activePipelineIdx
                          return (
                            <div key={key} className="shipment-pipeline__segment">
                              {idx > 0 && <div className={`shipment-pipeline__connector ${done || active ? 'shipment-pipeline__connector--on' : ''}`} />}
                              <div
                                className={`shipment-pipeline__step ${done ? 'shipment-pipeline__step--done' : ''} ${active ? 'shipment-pipeline__step--active' : ''}`}
                              >
                                <span className="shipment-pipeline__num">{idx + 1}</span>
                                <span className="shipment-pipeline__name">{t(`shipments.pipeline.${key}`)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="shipment-detail-card col-span-2">
                      <h3 className="shipment-detail-card__title">{t('shipments.createModal.formHeading')}</h3>
                      <div className="shipment-detail-card__grid">
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.selectSdForm')}</span>
                          <span className="shipment-detail-card__value font-mono">
                            {shipment.sd_form?.sd_number || shipment.sd_form_id || '—'}
                          </span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.createModal.clientName')}</span>
                          <span className="shipment-detail-card__value font-semibold">
                            {shipmentClientDisplayName(shipment)}
                          </span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.booking_date')}</span>
                          <span className="shipment-detail-card__value">{formatDate(shipment.booking_date, i18n.language) || '—'}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.booking_number')}</span>
                          <span className="shipment-detail-card__value font-semibold">{shipment.booking_number || '—'}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.bl_number')}</span>
                          <span className="shipment-detail-card__value font-semibold">{shipment.bl_number || '—'}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.shipping_line')}</span>
                          <span className="shipment-detail-card__value">{shippingLineName}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.line_vendor')}</span>
                          <span className="shipment-detail-card__value">{lineVendor}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.mode')}</span>
                          <span className="shipment-detail-card__value">{shipmentDisplayMode(shipment.mode, t)}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.shipment_type')}</span>
                          <span className="shipment-detail-card__value">{shipmentDisplayShipmentType(shipment.shipment_type, t)}</span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.shipment_direction')}</span>
                          <span className="shipment-detail-card__value">{shipmentDisplayDirection(shipment.shipment_direction, t)}</span>
                        </div>
                        {shipment.shipment_direction === 'Import' || shipment.acid_number ? (
                          <div className="shipment-detail-card__row">
                            <span className="shipment-detail-card__label">{t('shipments.fields.acid_number')}</span>
                            <span className="shipment-detail-card__value">{shipment.acid_number || '—'}</span>
                          </div>
                        ) : (
                          <div className="shipment-detail-card__row">
                            <span className="shipment-detail-card__label">{t('shipments.fields.container_type')}</span>
                            <span className="shipment-detail-card__value">{shipmentDisplayContainerType(shipment.container_type, t)}</span>
                          </div>
                        )}
                        {shipment.shipment_direction === 'Import' && (
                          <>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.container_type')}</span>
                              <span className="shipment-detail-card__value">{shipmentDisplayContainerType(shipment.container_type, t)}</span>
                            </div>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.container_size')}</span>
                              <span className="shipment-detail-card__value">{shipmentDisplayContainerSize(shipment.container_size, t)}</span>
                            </div>
                          </>
                        )}
                        {shipment.shipment_direction !== 'Import' && (
                          <>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.container_size')}</span>
                              <span className="shipment-detail-card__value">{shipmentDisplayContainerSize(shipment.container_size, t)}</span>
                            </div>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.container_count')}</span>
                              <span className="shipment-detail-card__value">{shipment.container_count ?? '—'}</span>
                            </div>
                          </>
                        )}
                        {shipment.shipment_direction === 'Import' && (
                          <>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.container_count')}</span>
                              <span className="shipment-detail-card__value">{shipment.container_count ?? '—'}</span>
                            </div>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.loading_place')}</span>
                              <span className="shipment-detail-card__value">{shipment.loading_place || '—'}</span>
                            </div>
                          </>
                        )}
                        {shipment.shipment_direction !== 'Import' && (
                          <>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.loading_place')}</span>
                              <span className="shipment-detail-card__value">{shipment.loading_place || '—'}</span>
                            </div>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.origin_port_id')}</span>
                              <span className="shipment-detail-card__value">{shipment.origin_port?.name ?? shipment.originPort?.name ?? '—'}</span>
                            </div>
                          </>
                        )}
                        {shipment.shipment_direction === 'Import' && (
                          <>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.origin_port_id')}</span>
                              <span className="shipment-detail-card__value">{shipment.origin_port?.name ?? shipment.originPort?.name ?? '—'}</span>
                            </div>
                            <div className="shipment-detail-card__row">
                              <span className="shipment-detail-card__label">{t('shipments.fields.destination_port_id')}</span>
                              <span className="shipment-detail-card__value">
                                {shipment.destination_port?.name ?? shipment.destinationPort?.name ?? '—'}
                              </span>
                            </div>
                          </>
                        )}
                        {shipment.shipment_direction !== 'Import' && (
                          <div className="shipment-detail-card__row col-span-2 shipment-detail-card__row--stack-value">
                            <span className="shipment-detail-card__label">{t('shipments.fields.destination_port_id')}</span>
                            <span className="shipment-detail-card__value">
                              {shipment.destination_port?.name ?? shipment.destinationPort?.name ?? '—'}
                            </span>
                          </div>
                        )}
                        <div className="shipment-detail-card__row shipment-detail-card__row--stack-value">
                          <span className="shipment-detail-card__label">{t('shipments.fields.cargo_description')}</span>
                          <span className="shipment-detail-card__value shipment-detail-card__value--multiline">
                            {shipment.cargo_description || '—'}
                          </span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.loading_date')}</span>
                          <span className="shipment-detail-card__value">{formatDate(shipment.loading_date, i18n.language) || '—'}</span>
                        </div>
                        <div className="shipment-detail-card__row col-span-2 shipment-detail-card__row--stack-value">
                          <span className="shipment-detail-card__label">{t('shipments.fields.notes')}</span>
                          <span className="shipment-detail-card__value shipment-detail-card__value--multiline">
                            {(() => {
                              const s = shipmentFreeTextNotes(shipment)
                              return s.trim() ? s : '—'
                            })()}
                          </span>
                        </div>
                        {shipment.route_text && (
                          <div className="shipment-detail-card__row col-span-2 shipment-detail-card__row--stack-value">
                            <span className="shipment-detail-card__label">{t('shipments.fields.route')}</span>
                            <span className="shipment-detail-card__value shipment-detail-card__value--multiline">{shipment.route_text}</span>
                          </div>
                        )}
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">{t('shipments.fields.status')}</span>
                          <span className="shipment-detail-card__value">
                            <ShipmentStatusBadge
                              statusOptions={statusOptions}
                              rawStatus={shipment.status}
                              lang={i18n.language}
                              t={t}
                            />
                          </span>
                        </div>
                        <div className="shipment-detail-card__row">
                          <span className="shipment-detail-card__label">ID</span>
                          <span className="shipment-detail-card__value">#{shipment.id}</span>
                        </div>
                      </div>
                    </div>

                    {shipment.is_reefer && (
                      <div className="shipment-detail-card col-span-2">
                        <h3 className="shipment-detail-card__title">{t('shipments.sections.loadingReefer')}</h3>
                        <div className="shipment-detail-card__grid">
                          <div className="shipment-detail-card__row">
                            <span className="shipment-detail-card__label">{t('shipments.fields.reefer_temp')}</span>
                            <span className="shipment-detail-card__value">{shipment.reefer_temp || '—'}</span>
                          </div>
                          <div className="shipment-detail-card__row">
                            <span className="shipment-detail-card__label">{t('shipments.fields.reefer_vent')}</span>
                            <span className="shipment-detail-card__value">{shipment.reefer_vent || '—'}</span>
                          </div>
                          <div className="shipment-detail-card__row col-span-2 shipment-detail-card__row--stack-value">
                            <span className="shipment-detail-card__label">{t('shipments.fields.reefer_hum')}</span>
                            <span className="shipment-detail-card__value">{shipment.reefer_hum || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="shipment-detail-card shipment-detail-card--status">
                      <h3 className="shipment-detail-card__title">{t('shipments.sections.latestTracking')}</h3>
                      <div className="shipment-detail-card__content">
                        {shipment.latest_tracking_update ? (
                          <div className="shipment-latest-tracking">
                            <div className="shipment-latest-tracking__text">
                              {shipment.latest_tracking_update.update_text}
                            </div>
                            <div className="shipment-latest-tracking__meta">
                              {formatDate(shipment.latest_tracking_update.created_at, i18n.language)}
                            </div>
                          </div>
                        ) : (
                          <p className="shipment-detail-card__empty">{t('shipments.trackingEmpty')}</p>
                        )}
                      </div>
                    </div>

                    <div className="shipment-detail-card">
                      <h3 className="shipment-detail-card__title">{t('shipments.sections.clientInfo')}</h3>
                      <div className="shipment-detail-card__content">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="shipments-client-avatar">
                            {(shipment.client?.company_name || shipment.client?.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {shipmentClientDisplayName(shipment)}
                            </div>
                            <div className="text-sm text-gray-500">{shipment.client?.company_name}</div>
                          </div>
                        </div>
                        {shipment.client?.phone && (
                          <div className="shipment-detail-card__row">
                            <span className="shipment-detail-card__label">{t('clients.fields.phone')}</span>
                            <span className="shipment-detail-card__value">{shipment.client.phone}</span>
                          </div>
                        )}
                        {shipment.client?.email && (
                          <div className="shipment-detail-card__row">
                            <span className="shipment-detail-card__label">{t('clients.fields.email')}</span>
                            <span className="shipment-detail-card__value text-xs">{shipment.client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {canViewFinancialTotals && (
                      <div className="shipment-detail-card shipment-detail-card--financial">
                        <h3 className="shipment-detail-card__title">{t('shipments.sections.financials') || t('shipments.financialSummary')}</h3>
                        <div className="shipment-detail-card__content">
                          <div className="shipment-detail-card__row flex justify-between">
                            <span className="shipment-detail-card__label">{t('shipments.fields.cost_total')}</span>
                            <span className="shipment-detail-card__value">{formatMoney(shipment.cost_total, locale)}</span>
                          </div>
                          {canViewSelling && (
                            <div className="shipment-detail-card__row flex justify-between">
                              <span className="shipment-detail-card__label">{t('shipments.fields.selling_price_total')}</span>
                              <span className="shipment-detail-card__value">{formatMoney(shipment.selling_price_total, locale)}</span>
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900 flex justify-between items-center">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{t('shipments.fields.profit_total')}</span>
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                              {formatMoney(shipment.profit_total, locale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="shipment-detail-card">
                      <h3 className="shipment-detail-card__title">{t('shipments.sections.vendorSales')}</h3>
                      <div className="shipment-detail-card__grid">
                        <div className="shipment-detail-card__row col-span-2">
                          <span className="shipment-detail-card__label">{t('shipments.fields.sales_rep_id')}</span>
                          <span className="shipment-detail-card__value font-semibold">{shipment.sales_rep?.name || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {detailTab === 'tracking' && (
            <section className="client-detail-modal__section">
              {canManageOps && (
                <form onSubmit={handleAddTracking} className="mb-4">
                  <label htmlFor="shipment-tracking" className="client-detail-modal__label block mb-1">
                    {t('shipments.trackingAddLabel')}
                  </label>
                  <textarea
                    id="shipment-tracking"
                    rows={3}
                    className="clients-input w-full mb-2"
                    value={trackingText}
                    onChange={(e) => setTrackingText(e.target.value)}
                    disabled={trackingSubmitting || !shipment?.id}
                  />
                  {trackingError && <p className="text-sm text-red-600 mb-2">{trackingError}</p>}
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={trackingSubmitting || !trackingText.trim() || !shipment?.id}
                  >
                    {trackingSubmitting ? t('shipments.saving') : t('shipments.trackingSubmit')}
                  </button>
                </form>
              )}
              <h3 className="client-detail-modal__section-title">{t('shipments.trackingHistory')}</h3>
              {trackingLoading ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : trackingUpdates.length === 0 ? (
                <p className="client-detail-modal__empty">{t('shipments.trackingEmpty')}</p>
              ) : (
                <ul className="shipment-tracking-timeline">
                  {trackingUpdates.map((u) => (
                    <li key={u.id} className="shipment-tracking-timeline__item">
                      <div className="shipment-tracking-timeline__dot" />
                      <div className="shipment-tracking-timeline__body">
                        <div className="shipment-tracking-timeline__meta">
                          {u.created_by?.name ?? '—'} · {formatDate(u.created_at, i18n.language)}
                        </div>
                        <div className="shipment-tracking-timeline__text whitespace-pre-wrap">{u.update_text ?? '—'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'notes' && (
            <section className="client-detail-modal__section shipment-notes-tab">
              <p className="shipment-notes-tab__intro text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('shipments.notesTabIntro')}
              </p>
              {noteError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-3 py-2">
                  {noteError}
                </p>
              )}
              {canAddShipmentNote && (
                <form onSubmit={handleAddNote} className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4">
                  <label htmlFor="shipment-note-new" className="client-detail-modal__label block mb-1">
                    {t('shipments.addNote')}
                  </label>
                  <textarea
                    id="shipment-note-new"
                    rows={3}
                    className="clients-input w-full mb-2"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    disabled={noteSubmitting || !shipment?.id}
                    placeholder={t('shipments.notePlaceholder')}
                  />
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={noteSubmitting || !noteText.trim() || !shipment?.id}
                  >
                    {noteSubmitting ? t('shipments.saving') : t('shipments.saveNote')}
                  </button>
                </form>
              )}
              {notesLoading ? (
                <div className="shipment-notes-empty shipment-notes-empty--loading flex items-center justify-center gap-2 py-12" aria-busy="true">
                  <LoaderDots />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('shipments.loading')}</span>
                </div>
              ) : notes.length === 0 ? (
                <div className="shipment-notes-empty" role="status">
                  <div className="shipment-notes-empty__icon" aria-hidden>
                    <StickyNote className="h-10 w-10" strokeWidth={1.25} />
                  </div>
                  <h3 className="shipment-notes-empty__title">{t('shipments.notesEmptyTitle')}</h3>
                  <p className="shipment-notes-empty__text">
                    {t(canAddShipmentNote ? 'shipments.notesEmptyHint' : 'shipments.notesEmptyHintViewOnly')}
                  </p>
                </div>
              ) : (
                <ul className="shipment-notes-list space-y-3">
                  {notes.map((n) => {
                    const isEditing = editingNoteId === n.id
                    const showEdit = canEditThisNote(n)
                    const showDelete = canManageAllShipmentNotes
                    const edited =
                      n.updated_at &&
                      n.created_at &&
                      String(n.updated_at).slice(0, 19) !== String(n.created_at).slice(0, 19)
                    return (
                      <li
                        key={n.id}
                        className="shipment-note-card rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {n.author?.name ?? t('shipments.noteUnknownAuthor')}
                            </span>
                            <span className="mx-1">·</span>
                            <span>{formatDate(n.created_at, i18n.language)}</span>
                            {edited && (
                              <span className="ms-2 text-amber-700 dark:text-amber-400">
                                ({t('shipments.noteEdited')})
                              </span>
                            )}
                          </div>
                          {(showEdit || showDelete) && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              {showEdit && (
                                <button
                                  type="button"
                                  className="client-detail-modal__btn client-detail-modal__btn--secondary !py-1 !px-2 text-xs inline-flex items-center gap-1"
                                  onClick={() => {
                                    setEditingNoteId(n.id)
                                    setEditNoteDraft(n.content ?? '')
                                    setNoteError(null)
                                  }}
                                  disabled={notePatchingId != null || noteDeletingId != null}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  {t('shipments.noteEdit')}
                                </button>
                              )}
                              {showDelete && (
                                <button
                                  type="button"
                                  className="client-detail-modal__btn client-detail-modal__btn--secondary !py-1 !px-2 text-xs inline-flex items-center gap-1 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
                                  onClick={() => handleDeleteNote(n.id)}
                                  disabled={noteDeletingId === n.id || notePatchingId != null}
                                >
                                  {noteDeletingId === n.id ? (
                                    <LoaderDots size={6} className="inline-flex" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  )}
                                  {t('shipments.noteDelete')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <form onSubmit={handleSaveEditNote} className="space-y-2">
                            <textarea
                              rows={4}
                              className="clients-input w-full"
                              value={editNoteDraft}
                              onChange={(e) => setEditNoteDraft(e.target.value)}
                              disabled={notePatchingId === n.id}
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="submit"
                                className="client-detail-modal__btn client-detail-modal__btn--primary !py-1.5"
                                disabled={notePatchingId === n.id || !editNoteDraft.trim()}
                              >
                                {notePatchingId === n.id ? t('shipments.saving') : t('shipments.noteSave')}
                              </button>
                              <button
                                type="button"
                                className="client-detail-modal__btn client-detail-modal__btn--secondary !py-1.5"
                                onClick={cancelEditNote}
                                disabled={notePatchingId === n.id}
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{n.content ?? '—'}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'operations' && (
            <section className="client-detail-modal__section">
              {opsLoading || tasksLoading || !opsData ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : (
                <div className="shipment-ops-tab">
                  {(() => {
                    const st = opsData.service_types || []
                    const showInland = st.includes('inland_transport')
                    const showCustoms = st.includes('customs_clearance')
                    const showPartnersBlock = st.length > 0
                    return (
                      <>
                        <div className="shipment-detail-card mb-6">
                          <h3 className="shipment-detail-card__title">{t('shipments.ops.sectionServiceType')}</h3>
                          <div className="p-4 shipment-ops-service-type-grid">
                            {SERVICE_TYPE_IDS.map((id) => (
                              <label key={id} className="shipment-ops-service-chip">
                                <input
                                  type="checkbox"
                                  checked={st.includes(id)}
                                  onChange={() => toggleServiceType(id)}
                                  disabled={!canEditOps}
                                />
                                <span>{t(`shipments.ops.serviceType.${id}`)}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {showPartnersBlock ? (
                          <div className="shipment-detail-card mb-6">
                            <h3 className="shipment-detail-card__title">{t('shipments.ops.sectionVendorsPartners')}</h3>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                              {showInland ? (
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                    {t('shipments.ops.inlandTransportContractor')}
                                    <span className="text-red-600 ms-0.5">*</span>
                                  </label>
                                  <select
                                    className="clients-input w-full"
                                    value={opsData.transport_contractor_id || ''}
                                    onChange={(e) =>
                                      setOpsData((prev) => ({ ...prev, transport_contractor_id: e.target.value }))
                                    }
                                    disabled={!canEditOps}
                                    required={showInland}
                                  >
                                    <option value="">{t('common.select')}</option>
                                    {inlandVendorOptions.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                              {showCustoms ? (
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                    {t('shipments.ops.customsBroker')}
                                    <span className="text-red-600 ms-0.5">*</span>
                                  </label>
                                  <select
                                    className="clients-input w-full"
                                    value={opsData.customs_broker_id || ''}
                                    onChange={(e) =>
                                      setOpsData((prev) => ({ ...prev, customs_broker_id: e.target.value }))
                                    }
                                    disabled={!canEditOps}
                                    required={showCustoms}
                                  >
                                    <option value="">{t('common.select')}</option>
                                    {customsVendorOptions.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                  {t('shipments.ops.insuranceCompany')}
                                </label>
                                <select
                                  className="clients-input w-full"
                                  value={opsData.insurance_company_id || ''}
                                  onChange={(e) =>
                                    setOpsData((prev) => ({ ...prev, insurance_company_id: e.target.value }))
                                  }
                                  disabled={!canEditOps}
                                >
                                  <option value="">{t('shipments.optional')}</option>
                                  {insuranceVendorOptions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                  {t('shipments.ops.otherParty')}
                                </label>
                                <select
                                  className="clients-input w-full"
                                  value={opsData.overseas_agent_id || ''}
                                  onChange={(e) =>
                                    setOpsData((prev) => ({ ...prev, overseas_agent_id: e.target.value }))
                                  }
                                  disabled={!canEditOps}
                                >
                                  <option value="">{t('shipments.optional')}</option>
                                  {otherPartyVendorOptions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="shipment-detail-card mb-6">
                          <h3 className="shipment-detail-card__title">{t('shipments.ops.sectionKeyDates')}</h3>
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                {t('shipments.ops.cutOffDate')}
                              </label>
                              <input
                                type="date"
                                lang={i18n.language === 'ar' ? 'ar-EG' : 'en-GB'}
                                className="clients-input w-full"
                                value={opsData.cut_off_date || ''}
                                onChange={(e) => setOpsData((prev) => ({ ...prev, cut_off_date: e.target.value }))}
                                disabled={!canEditOps}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                {t('shipments.ops.eta')}
                              </label>
                              <input
                                type="date"
                                lang={i18n.language === 'ar' ? 'ar-EG' : 'en-GB'}
                                className="clients-input w-full"
                                value={opsData.eta || ''}
                                onChange={(e) => setOpsData((prev) => ({ ...prev, eta: e.target.value }))}
                                disabled={!canEditOps}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                {t('shipments.ops.etd')}
                              </label>
                              <input
                                type="date"
                                lang={i18n.language === 'ar' ? 'ar-EG' : 'en-GB'}
                                className="clients-input w-full"
                                value={opsData.etd || ''}
                                onChange={(e) => setOpsData((prev) => ({ ...prev, etd: e.target.value }))}
                                disabled={!canEditOps}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                {t('shipments.ops.loadingDate')}
                              </label>
                              <input
                                type="date"
                                lang={i18n.language === 'ar' ? 'ar-EG' : 'en-GB'}
                                className="clients-input w-full"
                                value={opsData.ops_loading_date || ''}
                                onChange={(e) =>
                                  setOpsData((prev) => ({ ...prev, ops_loading_date: e.target.value }))
                                }
                                disabled={!canEditOps}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="shipment-detail-card shipment-detail-card--ops-status mb-6">
                          <h3 className="shipment-detail-card__title">{t('shipments.ops.sectionOperationalStatus')}</h3>
                          <div className="p-4">
                            <select
                              className="clients-input w-full"
                              value={opsData.operational_status_code || ''}
                              onChange={(e) =>
                                setOpsData((prev) => ({
                                  ...prev,
                                  operational_status_code: e.target.value || null,
                                }))
                              }
                              disabled={!canEditOps}
                            >
                              <option value="">{t('common.select')}</option>
                              {OPERATIONAL_PHASE_ORDER.map((code) => (
                                <option key={code} value={code}>
                                  {t(`shipments.ops.phase.${code}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <ShipmentOperationsTasksPanel
                          token={token}
                          shipmentId={shipment.id}
                          tasks={tasks}
                          setTasks={setTasks}
                          canEditOps={canEditOps}
                          currentUserId={currentUserId}
                          refreshTasks={loadTasks}
                        />

                        {canEditOps ? (
                          <div className="mt-8 flex flex-col items-end gap-3">
                            {opsError ? <p className="text-sm text-red-600 font-medium">{opsError}</p> : null}
                            <button
                              type="button"
                              onClick={handleSaveOps}
                              disabled={opsSaving}
                              className="client-detail-modal__btn client-detail-modal__btn--primary px-8 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                              {opsSaving ? (
                                <>
                                  <LoaderDots className="h-4 w-4" />
                                  {t('shipments.ops.savingOps')}
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" aria-hidden />
                                  {t('shipments.ops.saveOps')}
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
              )}
            </section>
          )}

          {(isOperations || isAdminRole) && detailTab === 'audit_log' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('shipments.ops.auditLogTitle')}</h3>
              {auditError ? (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
                  {auditError}
                </p>
              ) : null}
              {auditLoading ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : auditRows.length === 0 ? (
                <p className="client-detail-modal__empty">{t('shipments.ops.auditEmpty')}</p>
              ) : (
                <ul className="shipment-audit-log space-y-2">
                  {auditRows.map((row) => (
                    <li
                      key={row.id}
                      className="shipment-audit-log__row rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{row.event}</span>
                        <span>{formatDate(row.created_at, i18n.language)}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {t('shipments.ops.auditBy')}:{' '}
                        {row.causer_id != null ? userNameById[String(row.causer_id)] || `#${row.causer_id}` : '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(isOperations || isAdminRole) && detailTab === 'transport_instructions' && (
            <section className="client-detail-modal__section">
              {opsLoading || !opsData ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : (
                <div className="shipment-ops-transport-tab">
                  <h3 className="client-detail-modal__section-title">{t('shipments.ops.transportInstructionsTitle')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('shipments.ops.transportInstructionsHint')}
                  </p>
                  <textarea
                    rows={10}
                    className="clients-input w-full mb-4"
                    value={opsData.transport_instructions || ''}
                    onChange={(e) =>
                      setOpsData((prev) => ({ ...prev, transport_instructions: e.target.value }))
                    }
                    disabled={!canEditOps}
                    placeholder={t('shipments.ops.transportInstructionsPlaceholder')}
                  />
                  {canEditOps ? (
                    <div className="flex flex-col items-end gap-3">
                      {opsError ? <p className="text-sm text-red-600 font-medium">{opsError}</p> : null}
                      <button
                        type="button"
                        onClick={handleSaveOps}
                        disabled={opsSaving}
                        className="client-detail-modal__btn client-detail-modal__btn--primary px-8 inline-flex items-center gap-2"
                      >
                        {opsSaving ? (
                          <>
                            <LoaderDots className="h-4 w-4" />
                            {t('shipments.ops.savingOps')}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" aria-hidden />
                            {t('shipments.ops.saveOps')}
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}

          </div>
        </div>

        <footer className="client-detail-modal__footer client-detail-modal__footer--form">
          <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose}>
            {t('shipments.close')}
          </button>
          {!shipmentLoading && shipment && canManageOps && detailTab === 'info' && (
            <button
              type="button"
              className="client-detail-modal__btn client-detail-modal__btn--primary"
              onClick={() => {
                onEdit?.(shipment)
                onClose()
              }}
            >
              {t('shipments.edit')}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
