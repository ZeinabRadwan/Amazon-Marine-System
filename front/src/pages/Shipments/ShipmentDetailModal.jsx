import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Pencil,
  Trash2,
  StickyNote,
  FileDown,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  Save,
  ShieldAlert,
} from 'lucide-react'
import { getStoredToken } from '../Login'
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
import { localizedStatusLabel } from '../../utils/localizedStatusLabel'
import './Shipments.css'
import '../SDForms/SDForms.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'

function formatDate(value, locale) {
  if (value == null || value === '') return '—'
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

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
  opsStatusOptions = [],
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
      .then(res => setOpsData(res.data || {}))
      .catch(() => setOpsData({}))
      .finally(() => setOpsLoading(false))
  }, [token, shipment?.id])

  const loadTasks = useCallback(() => {
    if (!token || !shipment?.id) return
    setTasksLoading(true)
    getShipmentTasks(token, shipment.id)
      .then(res => setTasks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false))
  }, [token, shipment?.id])

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
    if (open && detailTab === 'operations' && shipment?.id) {
      loadOpsData()
      loadTasks()
    }
  }, [open, detailTab, shipment?.id, loadOpsData, loadTasks])

  if (!open) return null

  const tabs = [
    { id: 'info', label: t('shipments.tabs.info') },
    { id: 'tracking', label: t('shipments.tabs.tracking') },
    { id: 'notes', label: t('shipments.tabs.notes') },
    // Only Operations users and Admin can see the Operations tab
    ...(isOperations || isAdminRole
      ? [{ id: 'operations', label: t('shipments.tabs.operations') }]
      : []),
  ]

  const clientLabel =
    shipment?.client?.company_name ?? shipment?.client?.name ?? shipment?.client_name ?? '—'
  const lineVendor = shipment?.line_vendor?.name ?? shipment?.lineVendor?.name ?? '—'

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

  const handleSaveOps = async () => {
    if (!token || !shipment?.id || !opsData) return
    setOpsSaving(true)
    setOpsError(null)
    try {
      await updateShipmentOperations(token, shipment.id, {
        transport_contractor_id: opsData.transport_contractor_id || null,
        customs_broker_id: opsData.customs_broker_id || null,
        insurance_company_id: opsData.insurance_company_id || null,
        overseas_agent_id: opsData.overseas_agent_id || null,
        cut_off_date: opsData.cut_off_date || null,
        etd: opsData.etd || null,
        eta: opsData.eta || null,
        operations_status: opsData.operations_status || null,
      })
      
      if (tasks.length > 0) {
        await bulkUpdateShipmentTasks(token, shipment.id, tasks)
      }
      
      onOperationsSaved?.()
      loadOpsData()
      loadTasks()
    } catch (err) {
      setOpsError(err.message || t('shipments.ops.opsError'))
    } finally {
      setOpsSaving(false)
    }
  }

  const handleAddTask = async () => {
    if (!token || !shipment?.id) return
    try {
      const newTask = {
        name: t('shipments.ops.newTask') || 'New Task',
        status: 'pending',
        sort_order: tasks.length + 1
      }
      const res = await bulkUpdateShipmentTasks(token, shipment.id, [newTask])
      setTasks(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to add task:', err)
    }
  }

  const updateTask = async (taskId, field, value) => {
    // Optimistic update
    let updatedTaskObj = null
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          updatedTaskObj = { ...t, [field]: value }
          return updatedTaskObj
        }
        return t
      })
      return next
    })

    // Immediate API call for better UX
    if (!token || !shipment?.id) return
    try {
      // We wait a tick to ensure we have the updatedTaskObj if it was just created/found
      if (updatedTaskObj) {
        await bulkUpdateShipmentTasks(token, shipment.id, [updatedTaskObj])
      }
    } catch (err) {
      console.error('Failed to update task:', err)
      // On error, we might want to refresh from server
      loadTasks()
    }
  }

  return (
    <div className="client-detail-modal shipment-detail-modal--sd" role="dialog" aria-modal="true" aria-labelledby="shipment-detail-title">
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
                    <button
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
                    </button>
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
                            {shipment.client?.company_name || shipment.client?.name || '—'}
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
                          <span className="shipment-detail-card__label">{t('shipments.fields.line_vendor_id')}</span>
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
                              {shipment.client?.name || '—'}
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
                  {!isOperations && !isAdminRole && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-300">
                      <ShieldAlert className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('shipments.ops.viewOnly')}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Operational Status Panel */}
                    <div className="shipment-detail-card shipment-detail-card--ops-status col-span-1">
                      <h3 className="shipment-detail-card__title flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        {t('shipments.ops.opsStatus')}
                      </h3>
                      <div className="p-4">
                        <select
                          className="clients-input w-full"
                          value={opsData.operations_status || ''}
                          onChange={e => setOpsData(prev => ({ ...prev, operations_status: e.target.value }))}
                          disabled={!isOperations && !isAdminRole}
                        >
                          <option value="">{t('common.select')}</option>
                          {opsStatusOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {localizedStatusLabel(opt, i18n.language)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Operational Dates Panel */}
                    <div className="shipment-detail-card shipment-detail-card--dates col-span-2">
                      <h3 className="shipment-detail-card__title flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        {t('shipments.ops.operationalDates')}
                      </h3>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{t('shipments.ops.cutOffDate')}</label>
                          <input
                            type="date"
                            className="clients-input w-full"
                            value={opsData.cut_off_date || ''}
                            onChange={e => setOpsData(prev => ({ ...prev, cut_off_date: e.target.value }))}
                            disabled={!isOperations && !isAdminRole}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{t('shipments.ops.etd')}</label>
                          <input
                            type="date"
                            className="clients-input w-full"
                            value={opsData.etd || ''}
                            onChange={e => setOpsData(prev => ({ ...prev, etd: e.target.value }))}
                            disabled={!isOperations && !isAdminRole}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{t('shipments.ops.eta')}</label>
                          <input
                            type="date"
                            className="clients-input w-full"
                            value={opsData.eta || ''}
                            onChange={e => setOpsData(prev => ({ ...prev, eta: e.target.value }))}
                            disabled={!isOperations && !isAdminRole}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vendors & Partners Panel */}
                  <div className="shipment-detail-card mb-8">
                    <h3 className="shipment-detail-card__title flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-500" />
                      {t('shipments.ops.vendorsPartners')}
                    </h3>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'transport_contractor_id', label: t('shipments.ops.transportContractor') },
                        { key: 'customs_broker_id', label: t('shipments.ops.customsBroker') },
                        { key: 'insurance_company_id', label: t('shipments.ops.insuranceCompany') },
                        { key: 'overseas_agent_id', label: t('shipments.ops.overseasAgent') },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{field.label}</label>
                          <select
                            className="clients-input w-full"
                            value={opsData[field.key] || ''}
                            onChange={e => setOpsData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            disabled={!isOperations && !isAdminRole}
                          >
                            <option value="">{t('shipments.optional')}</option>
                            {vendorOptions.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Task Management Panel */}
                  <div className="shipment-detail-card">
                    <div className="shipment-detail-card__title flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {t('shipments.ops.taskManagement')}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
                          {t('shipments.ops.taskProgress', { 
                            done: tasks.filter(t => t.status === 'done').length, 
                            total: tasks.length 
                          })}
                        </div>
                        {(isOperations || isAdminRole) && (
                          <button
                            type="button"
                            onClick={handleAddTask}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
                          >
                            + {t('shipments.ops.addTask')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-4 py-3 w-10"></th>
                            <th className="px-4 py-3">{t('shipments.sections.tasks')}</th>
                            <th className="px-4 py-3">{t('shipments.ops.taskAssignee')}</th>
                            <th className="px-4 py-3">{t('shipments.ops.taskDue')}</th>
                            <th className="px-4 py-3">{t('shipments.ops.taskStatus')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  disabled={!isOperations && !isAdminRole}
                                  onClick={() => updateTask(task.id, 'status', task.status === 'done' ? 'pending' : 'done')}
                                  className={`transition-colors ${task.status === 'done' ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                                >
                                  {task.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </button>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                                <input
                                  type="text"
                                  className="clients-input py-1 w-full bg-transparent border-none focus:bg-white dark:focus:bg-gray-900"
                                  value={task.name}
                                  onChange={e => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
                                  onBlur={e => updateTask(task.id, 'name', e.target.value)}
                                  placeholder={t('shipments.ops.taskNamePlaceholder')}
                                  disabled={!isOperations && !isAdminRole}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  className="clients-input py-1 text-xs min-w-[120px]"
                                  value={task.assigned_to_id || ''}
                                  onChange={e => updateTask(task.id, 'assigned_to_id', e.target.value)}
                                  disabled={!isOperations && !isAdminRole}
                                >
                                  <option value="">{t('shipments.optional')}</option>
                                  {userOptions.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  className="clients-input py-1 text-xs"
                                  value={task.due_date || ''}
                                  onChange={e => updateTask(task.id, 'due_date', e.target.value)}
                                  disabled={!isOperations && !isAdminRole}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  className={`clients-input py-1 text-xs font-semibold rounded-lg ${
                                    task.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    task.status === 'in_progress' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                    'bg-gray-50 text-gray-700 border-gray-100'
                                  }`}
                                  value={task.status}
                                  onChange={e => updateTask(task.id, 'status', e.target.value)}
                                  disabled={!isOperations && !isAdminRole}
                                >
                                  <option value="pending">{t('shipments.ops.taskPending')}</option>
                                  <option value="in_progress">{t('shipments.ops.taskInProgress')}</option>
                                  <option value="done">{t('shipments.ops.taskDone')}</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {(isOperations || isAdminRole) && (
                    <div className="mt-8 flex flex-col items-end gap-3">
                      {opsError && <p className="text-sm text-red-600 font-medium">{opsError}</p>}
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
                            <Save className="h-4 w-4" />
                            {t('shipments.ops.saveOps')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
