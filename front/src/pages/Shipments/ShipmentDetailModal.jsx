import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Pencil,
  Trash2,
  StickyNote,
  FileDown,
  Save,
  Eye,
} from 'lucide-react'
import { getStoredToken } from '../Login'
import { formatDate, UI_DATE_FORMAT } from '../../utils/dateUtils'
import LoaderDots from '../../components/LoaderDots'
import DatePicker from '../../components/DatePicker'
import '../../components/LoaderDots/LoaderDots.css'
import {
  listShipmentNotes,
  postShipmentNote,
  patchShipmentNote,
  deleteShipmentNote,
  getShipmentTrackingUpdates,
  postShipmentTrackingUpdate,
  getShipmentOperations,
  updateShipment,
  updateShipmentOperations,
  getShipmentTasks,
  bulkUpdateShipmentTasks,
  downloadShipmentPdf,
  postTransportInstructionsPdf,
} from '../../api/shipments'
import Tabs from '../../components/Tabs'
import ShipmentStatusBadge from '../../components/ShipmentStatusBadge'
import { getPipelineStepIndex, PIPELINE_STEP_KEYS } from './shipmentPipeline'
import { listActivitiesBySubject } from '../../api/activities'
import { SERVICE_TYPE_IDS, OPERATIONAL_PHASE_ORDER } from './shipmentOpsConstants'
import ShipmentOperationsTasksPanel from './ShipmentOperationsTasksPanel'
import { isoDatePart } from './opsDateDisplay'
import { normalizeShipmentOperationTask, serializeShipmentOperationTaskForApi } from './shipmentOperationTaskPayload'
import { formatShipmentAuditRow } from './shipmentAuditPresentation'
import { listSDFormBookingConfirmations, downloadSDFormBookingConfirmation } from '../../api/sdForms'
import { listVendors } from '../../api/vendors'
import ShipmentTransportInstructionsTab, {
  buildTransportInstructionProfilePayload,
  buildTransportInstructionsWhatsAppText,
  mergeTransportInstructionProfileFromApi,
} from './ShipmentTransportInstructionsTab'
import './Shipments.css'
import '../SDForms/SDForms.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import { vendorsForCanonical } from './vendorOperationOptions'
import {
  readShipmentOperationsDraft,
  writeShipmentOperationsDraft,
  clearShipmentOperationsDraft,
  mergeOpsDraftIntoLoadedState,
} from './shipmentOperationsDraftStorage'

function normalizeOpsVendorIdsFromApi(d) {
  if (!d || typeof d !== 'object') return d
  const out = { ...d }
  for (const k of ['transport_contractor_id', 'customs_broker_id', 'insurance_company_id', 'overseas_agent_id']) {
    if (out[k] != null && out[k] !== '') {
      out[k] = String(out[k])
    } else {
      out[k] = ''
    }
  }
  return out
}

function ensureVendorInOptions(vendors, id, relation) {
  const list = Array.isArray(vendors) ? vendors : []
  const vid = id != null && String(id).trim() !== '' ? Number(id) : NaN
  if (!Number.isFinite(vid) || vid <= 0) return list
  if (list.some((x) => Number(x?.id) === vid)) return list
  const name = relation?.name ? String(relation.name) : `#${vid}`
  const row = { id: vid, name, type: relation?.type ?? '' }
  return [row, ...list]
}

function formatMoney(v, locale) {
  if (v == null || v === '') return '—'
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US'
  return new Intl.NumberFormat(loc, { maximumFractionDigits: 2, numberingSystem: 'latn' }).format(Number(v))
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

function shipmentLinkedPricingQuote(shipment) {
  return shipment?.pricing_quote ?? shipment?.pricingQuote ?? null
}

function shipmentPricingQuoteNumber(shipment) {
  const quote = shipmentLinkedPricingQuote(shipment)
  const ref = shipment?.quotation_reference
  return quote?.quote_no || (typeof ref === 'string' && ref.trim() ? ref.trim() : null)
}

/** Operations key dates — same DatePicker as Create Shipment (`Shipments.jsx` booking/loading dates). */
function OpsBasicDateField({ id, label, isoValue, onCommit, disabled }) {
  const { i18n } = useTranslation()
  const value = isoDatePart(isoValue)
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-gray-500 uppercase block mb-1">
        {label}
      </label>
      <DatePicker
        id={id}
        locale={i18n.language}
        className="clients-input w-full"
        value={value}
        onChange={(v) => onCommit(v === '' || v == null ? null : v)}
        disabled={disabled}
        placeholder={UI_DATE_FORMAT}
      />
    </div>
  )
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
  canPostShipmentTrackingUpdate = false,
  canViewFinancialTotals = false,
  canViewSelling = false,
  statusOptions = [],
  isOperations = false,
  isAdminRole = false,
  vendorOptions = [],
  onOperationsSaved = null,
  currentUserId = null,
  canAddShipmentNote = false,
  canManageAllShipmentNotes = false,
  shippingLinesList = [],
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
  const [opsDraftNotice, setOpsDraftNotice] = useState(null)
  const opsDraftHydratedForRef = useRef(null)
  const opsDraftCanPersistRef = useRef(false)
  const opsDraftBannerTimerRef = useRef(null)
  const [auditRows, setAuditRows] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState(null)
  const [opsBookingFiles, setOpsBookingFiles] = useState([])
  const [opsBookingFilesLoading, setOpsBookingFilesLoading] = useState(false)
  const [tiPdfLoading, setTiPdfLoading] = useState(false)
  const [tiBookingDraft, setTiBookingDraft] = useState({ booking_number: '', shipping_line_id: '' })
  const [opsTabVendors, setOpsTabVendors] = useState([])
  const [opsTabVendorsLoading, setOpsTabVendorsLoading] = useState(false)
  const [opsTabVendorsError, setOpsTabVendorsError] = useState(null)

  useEffect(() => {
    if (!shipment?.id) return
    setTiBookingDraft({
      booking_number: shipment.booking_number || '',
      shipping_line_id: shipment.shipping_line_id != null ? String(shipment.shipping_line_id) : '',
    })
  }, [shipment?.id, shipment?.booking_number, shipment?.shipping_line_id])

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
        d.transport_instruction_profile = mergeTransportInstructionProfileFromApi(d.transport_instruction_profile)
        setOpsData(normalizeOpsVendorIdsFromApi(d))
      })
      .catch(() =>
        setOpsData(
          normalizeOpsVendorIdsFromApi({
            service_types: ['sea_freight'],
            other_party_name: '',
            other_party_role: '',
            transport_instruction_profile: mergeTransportInstructionProfileFromApi(null),
          }),
        ),
      )
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

  const loadOpsBookingFiles = useCallback(() => {
    const sdId = shipment?.sd_form?.id ?? shipment?.sd_form_id
    if (!token || !sdId) {
      setOpsBookingFiles([])
      return
    }
    setOpsBookingFilesLoading(true)
    listSDFormBookingConfirmations(token, sdId)
      .then((res) => setOpsBookingFiles(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOpsBookingFiles([]))
      .finally(() => setOpsBookingFilesLoading(false))
  }, [token, shipment?.sd_form?.id, shipment?.sd_form_id])

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

  useEffect(() => {
    if (!open || detailTab !== 'operations') return
    if (opsLoading || tasksLoading) {
      opsDraftHydratedForRef.current = null
      opsDraftCanPersistRef.current = false
    }
  }, [open, detailTab, opsLoading, tasksLoading])

  const opsHydrationGate =
    open && detailTab === 'operations' && !!shipment?.id && !opsLoading && !tasksLoading && !!opsData

  useEffect(() => {
    if (!opsHydrationGate || !shipment?.id) return
    const sid = String(shipment.id)
    if (opsDraftHydratedForRef.current === sid) return

    const draft = readShipmentOperationsDraft(sid)
    if (draft?.opsData) {
      setOpsData((prev) => normalizeOpsVendorIdsFromApi(mergeOpsDraftIntoLoadedState(prev, draft.opsData)))
    }
    if (draft && Array.isArray(draft.tasks)) {
      setTasks(draft.tasks.map(normalizeShipmentOperationTask))
    }
    opsDraftHydratedForRef.current = sid
    opsDraftCanPersistRef.current = false
    window.setTimeout(() => {
      opsDraftCanPersistRef.current = true
    }, 450)
  }, [opsHydrationGate, shipment?.id])

  useEffect(() => {
    return () => {
      if (opsDraftBannerTimerRef.current) window.clearTimeout(opsDraftBannerTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open || detailTab !== 'operations' || !token || !(isOperations || isAdminRole)) {
      return
    }
    let cancelled = false
    setOpsTabVendorsLoading(true)
    setOpsTabVendorsError(null)
    const types = 'inland_transport,customs_clearance,insurance,overseas_agent'
    listVendors(token, { types })
      .then((res) => {
        const data = res?.data
        const arr = Array.isArray(data) ? data : []
        if (!cancelled) {
          setOpsTabVendors(arr)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOpsTabVendors([])
          setOpsTabVendorsError(err?.message || t('shipments.ops.vendorsLoadError'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOpsTabVendorsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, detailTab, token, isOperations, isAdminRole, t])

  const mergedVendorList = useMemo(() => {
    const fromApi = Array.isArray(opsTabVendors) ? opsTabVendors : []
    const fromParent = Array.isArray(vendorOptions) ? vendorOptions : []
    if (fromApi.length > 0) {
      return fromApi
    }

    return fromParent
  }, [opsTabVendors, vendorOptions])

  const inlandVendorOptions = useMemo(() => {
    const base = vendorsForCanonical(mergedVendorList, 'inland_transport')
    const rel = opsData?.transport_contractor ?? opsData?.transportContractor
    return ensureVendorInOptions(base, opsData?.transport_contractor_id, rel)
  }, [mergedVendorList, opsData?.transport_contractor_id, opsData?.transport_contractor, opsData?.transportContractor])

  const customsVendorOptions = useMemo(() => {
    const base = vendorsForCanonical(mergedVendorList, 'customs_clearance')
    const rel = opsData?.customs_broker ?? opsData?.customsBroker
    return ensureVendorInOptions(base, opsData?.customs_broker_id, rel)
  }, [mergedVendorList, opsData?.customs_broker_id, opsData?.customs_broker, opsData?.customsBroker])

  const insuranceVendorOptions = useMemo(() => {
    const base = vendorsForCanonical(mergedVendorList, 'insurance')
    const rel = opsData?.insurance_company ?? opsData?.insuranceCompany
    return ensureVendorInOptions(base, opsData?.insurance_company_id, rel)
  }, [mergedVendorList, opsData?.insurance_company_id, opsData?.insurance_company, opsData?.insuranceCompany])
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
      setOpsBookingFiles([])
      setOpsTabVendors([])
      setOpsTabVendorsLoading(false)
      setOpsTabVendorsError(null)
      setTiPdfLoading(false)
      if (opsDraftBannerTimerRef.current) window.clearTimeout(opsDraftBannerTimerRef.current)
      opsDraftBannerTimerRef.current = null
      setOpsDraftNotice(null)
      opsDraftHydratedForRef.current = null
      opsDraftCanPersistRef.current = false
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

  useEffect(() => {
    if (!open || detailTab !== 'info' || !shipment?.id) {
      setOpsBookingFiles([])
      return
    }
    loadOpsBookingFiles()
  }, [open, detailTab, shipment?.id, shipment?.sd_form?.id, shipment?.sd_form_id, loadOpsBookingFiles])

  const downloadBlobFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePreviewOpsBookingFile = async (f) => {
    const sdId = shipment?.sd_form?.id ?? shipment?.sd_form_id
    if (!token || !sdId || !f?.id) return
    try {
      const { blob } = await downloadSDFormBookingConfirmation(token, sdId, f.id)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch {
      /* ignore */
    }
  }

  const handleDownloadOpsBookingFile = async (f) => {
    const sdId = shipment?.sd_form?.id ?? shipment?.sd_form_id
    if (!token || !sdId || !f?.id) return
    try {
      const { blob, filename } = await downloadSDFormBookingConfirmation(token, sdId, f.id)
      downloadBlobFile(blob, filename || f.name || 'file')
    } catch {
      /* ignore */
    }
  }

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

  useEffect(() => {
    if (!open || detailTab !== 'operations' || !shipment?.id || !canEditOps || !opsData) return
    if (!opsDraftCanPersistRef.current) return
    const sid = String(shipment.id)
    const tid = window.setTimeout(() => {
      try {
        writeShipmentOperationsDraft(sid, { opsData, tasks })
        setOpsDraftNotice(t('shipments.ops.draftSaved'))
        if (opsDraftBannerTimerRef.current) window.clearTimeout(opsDraftBannerTimerRef.current)
        opsDraftBannerTimerRef.current = window.setTimeout(() => setOpsDraftNotice(null), 5000)
      } catch {
        setOpsDraftNotice(t('shipments.ops.draftSaveFailed'))
        if (opsDraftBannerTimerRef.current) window.clearTimeout(opsDraftBannerTimerRef.current)
        opsDraftBannerTimerRef.current = window.setTimeout(() => setOpsDraftNotice(null), 6000)
      }
    }, 650)
    return () => window.clearTimeout(tid)
  }, [open, detailTab, shipment?.id, canEditOps, opsData, tasks, t])

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

  const commitOperationsToApi = useCallback(async () => {
    if (!token || !shipment?.id || !opsData) {
      throw new Error(t('shipments.ops.opsError'))
    }
    const vendorIdOrNull = (raw) => {
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    const types = Array.isArray(opsData.service_types) ? opsData.service_types : []
    if (types.length === 0) {
      throw new Error(t('shipments.ops.serviceTypeRequired'))
    }
    if (types.includes('inland_transport') && !String(opsData.transport_contractor_id || '').trim()) {
      throw new Error(t('shipments.ops.inlandContractorRequired'))
    }
    if (types.includes('customs_clearance') && !String(opsData.customs_broker_id || '').trim()) {
      throw new Error(t('shipments.ops.customsBrokerRequired'))
    }

    await updateShipmentOperations(token, shipment.id, {
      service_types: types,
      transport_contractor_id: vendorIdOrNull(opsData.transport_contractor_id),
      customs_broker_id: vendorIdOrNull(opsData.customs_broker_id),
      insurance_company_id: vendorIdOrNull(opsData.insurance_company_id),
      other_party_name: opsData.other_party_name?.trim() || null,
      other_party_role: opsData.other_party_role?.trim() || null,
      cut_off_date: opsData.cut_off_date || null,
      etd: opsData.etd || null,
      eta: opsData.eta || null,
      ops_loading_date: opsData.ops_loading_date || null,
      transport_instructions: opsData.transport_instructions ?? null,
      transport_instruction_profile: buildTransportInstructionProfilePayload(
        opsData.transport_instruction_profile || {}
      ),
      operational_status_code: opsData.operational_status_code || null,
    })

    if (detailTab === 'operations' && tasks.length > 0) {
      await bulkUpdateShipmentTasks(
        token,
        shipment.id,
        tasks.map(serializeShipmentOperationTaskForApi)
      )
    }
  }, [token, shipment?.id, opsData, detailTab, tasks, t])

  const handleSaveOps = async () => {
    if (!token || !shipment?.id || !opsData) return
    setOpsSaving(true)
    setOpsError(null)
    try {
      await commitOperationsToApi()
      clearShipmentOperationsDraft(shipment.id)
      if (opsDraftBannerTimerRef.current) window.clearTimeout(opsDraftBannerTimerRef.current)
      opsDraftBannerTimerRef.current = null
      setOpsDraftNotice(null)
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

  const handleTransportInstructionSaveAndPdf = async () => {
    if (!token || !shipment?.id || !opsData) return
    setTiPdfLoading(true)
    setOpsError(null)
    try {
      const tip = opsData.transport_instruction_profile || {}
      if (!String(tiBookingDraft.booking_number || '').trim()) {
        throw new Error(t('shipments.transportInstructions.validationBooking'))
      }
      const sid = Number(tiBookingDraft.shipping_line_id)
      if (!Number.isFinite(sid) || sid <= 0) {
        throw new Error(t('shipments.transportInstructions.validationShippingLine'))
      }
      if (
        shipment.container_count == null ||
        String(shipment.container_count).trim() === '' ||
        !String(shipment.container_type || '').trim() ||
        !String(shipment.container_size || '').trim()
      ) {
        throw new Error(t('shipments.transportInstructions.validationContainer'))
      }
      if (!tip.customer_arrival_at || String(tip.customer_arrival_at).trim() === '') {
        throw new Error(t('shipments.transportInstructions.validationArrival'))
      }
      if (!String(tip.loading_place_name || '').trim()) {
        throw new Error(t('shipments.transportInstructions.validationPlaceName'))
      }
      if (!String(tip.loading_address || '').trim()) {
        throw new Error(t('shipments.transportInstructions.validationAddress'))
      }
      if (!String(tip.loading_contact_name || '').trim()) {
        throw new Error(t('shipments.transportInstructions.validationContactName'))
      }
      if (!String(tip.loading_contact_phone || '').trim()) {
        throw new Error(t('shipments.transportInstructions.validationContactPhone'))
      }
      if (!['certificate', 'bill_of_lading', 'manifest'].includes(tip.customs_document_type)) {
        throw new Error(t('shipments.transportInstructions.validationDocType'))
      }
      if (tip.generator === 'yes' && !String(tip.generator_temperature || '').trim()) {
        throw new Error(t('shipments.transportInstructions.validationTemperature'))
      }

      await updateShipment(token, shipment.id, {
        booking_number: tiBookingDraft.booking_number.trim(),
        shipping_line_id: sid,
      })

      await commitOperationsToApi()

      const profile = buildTransportInstructionProfilePayload(opsData.transport_instruction_profile || {})
      const { blob, filename } = await postTransportInstructionsPdf(token, shipment.id, profile)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      const lineOpt = (shippingLinesList || []).find((x) => String(x.id) === String(tiBookingDraft.shipping_line_id))
      const shipmentForText = {
        ...shipment,
        booking_number: tiBookingDraft.booking_number.trim(),
        shipping_line: lineOpt ? { name: lineOpt.name } : shipment.shipping_line,
        shippingLine: lineOpt ? { name: lineOpt.name } : shipment.shippingLine,
      }
      const waText = buildTransportInstructionsWhatsAppText(shipmentForText, opsData.transport_instruction_profile, t)
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(waText)
        }
      } catch {
        /* ignore clipboard */
      }

      onOperationsSaved?.()
      clearShipmentOperationsDraft(shipment.id)
      if (opsDraftBannerTimerRef.current) window.clearTimeout(opsDraftBannerTimerRef.current)
      opsDraftBannerTimerRef.current = null
      setOpsDraftNotice(null)
      loadOpsData()
    } catch (err) {
      setOpsError(err?.message || t('shipments.transportInstructions.pdfError'))
    } finally {
      setTiPdfLoading(false)
    }
  }

  if (!open) return null

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
                          <span className="shipment-detail-card__label">{t('shipments.quotationLink.select')}</span>
                          <span className="shipment-detail-card__value">
                            {(() => {
                              const quote = shipmentLinkedPricingQuote(shipment)
                              const quoteNo = shipmentPricingQuoteNumber(shipment)
                              if (!quoteNo) return '—'
                              const statusKey = String(quote?.status || '').toLowerCase()
                              const statusLabel =
                                statusKey === 'accepted'
                                  ? t('common.status.accepted')
                                  : statusKey === 'rejected'
                                    ? t('common.status.rejected')
                                    : statusKey === 'pending'
                                      ? t('common.status.pending')
                                      : quote?.status || null
                              return (
                                <span className="inline-flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-semibold">{quoteNo}</span>
                                  {statusLabel && (
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                      {statusLabel}
                                    </span>
                                  )}
                                  {quote?.id != null && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">#{quote.id}</span>
                                  )}
                                </span>
                              )
                            })()}
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
                      {(shipment.sd_form?.id || shipment.sd_form_id) && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                            {t('shipments.filesFromOperations')}
                          </h4>
                          {opsBookingFilesLoading ? (
                            <p className="text-xs text-gray-500">{t('shipments.loading')}</p>
                          ) : opsBookingFiles.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('shipments.bookingFilesEmpty')}</p>
                          ) : (
                            <ul className="space-y-2">
                              {opsBookingFiles.map((f) => (
                                <li
                                  key={f.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 px-3 py-2 text-sm"
                                >
                                  <span className="font-medium text-gray-800 dark:text-gray-100 break-all">{f.name}</span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs py-1 px-2"
                                      onClick={() => handlePreviewOpsBookingFile(f)}
                                    >
                                      <Eye className="h-3.5 w-3.5" aria-hidden />
                                      {t('shipments.viewFile')}
                                    </button>
                                    <button
                                      type="button"
                                      className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs py-1 px-2"
                                      onClick={() => handleDownloadOpsBookingFile(f)}
                                    >
                                      <FileDown className="h-3.5 w-3.5" aria-hidden />
                                      {t('shipments.downloadFile')}
                                    </button>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
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
              {canPostShipmentTrackingUpdate && (
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
            <section className="client-detail-modal__section shipment-ops-tab-section">
              {opsLoading || tasksLoading || !opsData ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : (
                <div className="shipment-ops-tab">
                  {opsDraftNotice && canEditOps ? (
                    <p
                      className="text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/35 border border-emerald-100 dark:border-emerald-800 rounded-md px-3 py-2 mb-4"
                      role="status"
                      aria-live="polite"
                    >
                      {opsDraftNotice}
                    </p>
                  ) : null}
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
                            {opsTabVendorsError ? (
                              <p className="text-sm text-red-600 dark:text-red-400 px-4 pt-2">{opsTabVendorsError}</p>
                            ) : null}
                            {opsTabVendorsLoading && mergedVendorList.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pt-2 flex items-center gap-2">
                                <LoaderDots />
                                {t('shipments.ops.vendorsLoading')}
                              </p>
                            ) : null}
                            {!opsTabVendorsLoading && mergedVendorList.length === 0 && !opsTabVendorsError ? (
                              <p className="text-xs text-amber-800 dark:text-amber-200/90 px-4 pt-2">
                                {t('shipments.ops.vendorsNoneLoaded')}
                              </p>
                            ) : null}
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                              {showInland ? (
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                    {t('shipments.ops.inlandTransportContractor')}
                                    <span className="text-red-600 ms-0.5">*</span>
                                  </label>
                                  <select
                                    className="clients-input w-full"
                                    value={String(opsData.transport_contractor_id ?? '')}
                                    onChange={(e) =>
                                      setOpsData((prev) => ({
                                        ...prev,
                                        transport_contractor_id: e.target.value,
                                      }))
                                    }
                                    disabled={!canEditOps}
                                    required={showInland}
                                  >
                                    <option value="">{t('common.select')}</option>
                                    {inlandVendorOptions.map((v) => (
                                      <option key={v.id} value={String(v.id)}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                  {!opsTabVendorsLoading && showInland && inlandVendorOptions.length === 0 ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {t('shipments.ops.vendorsEmptyCategory')}
                                    </p>
                                  ) : null}
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
                                    value={String(opsData.customs_broker_id ?? '')}
                                    onChange={(e) =>
                                      setOpsData((prev) => ({ ...prev, customs_broker_id: e.target.value }))
                                    }
                                    disabled={!canEditOps}
                                    required={showCustoms}
                                  >
                                    <option value="">{t('common.select')}</option>
                                    {customsVendorOptions.map((v) => (
                                      <option key={v.id} value={String(v.id)}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                  {!opsTabVendorsLoading && showCustoms && customsVendorOptions.length === 0 ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {t('shipments.ops.vendorsEmptyCategory')}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                  {t('shipments.ops.insuranceCompanyOptional')}
                                </label>
                                <select
                                  className="clients-input w-full"
                                  value={String(opsData.insurance_company_id ?? '')}
                                  onChange={(e) =>
                                    setOpsData((prev) => ({ ...prev, insurance_company_id: e.target.value }))
                                  }
                                  disabled={!canEditOps}
                                >
                                  <option value="">{t('shipments.optional')}</option>
                                  {insuranceVendorOptions.map((v) => (
                                    <option key={v.id} value={String(v.id)}>
                                      {v.name}
                                    </option>
                                  ))}
                                </select>
                                {!opsTabVendorsLoading && insuranceVendorOptions.length === 0 ? (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('shipments.ops.vendorsEmptyCategoryOptional')}
                                  </p>
                                ) : null}
                              </div>
                              <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                  {t('shipments.ops.otherPartyOptional')}
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    className="clients-input w-full"
                                    value={opsData.other_party_name ?? ''}
                                    onChange={(e) =>
                                      setOpsData((prev) => ({ ...prev, other_party_name: e.target.value }))
                                    }
                                    disabled={!canEditOps}
                                    placeholder={t('shipments.ops.otherPartyNamePlaceholder')}
                                  />
                                  <input
                                    type="text"
                                    className="clients-input w-full"
                                    value={opsData.other_party_role ?? ''}
                                    onChange={(e) =>
                                      setOpsData((prev) => ({ ...prev, other_party_role: e.target.value }))
                                    }
                                    disabled={!canEditOps}
                                    placeholder={t('shipments.ops.otherPartyRolePlaceholder')}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="shipment-detail-card mb-6">
                          <h3 className="shipment-detail-card__title">{t('shipments.ops.sectionKeyDates')}</h3>
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <OpsBasicDateField
                              id="sh-ops-cut-off"
                              label={t('shipments.ops.cutOffDate')}
                              isoValue={opsData.cut_off_date}
                              disabled={!canEditOps}
                              onCommit={(iso) => setOpsData((prev) => ({ ...prev, cut_off_date: iso }))}
                            />
                            <OpsBasicDateField
                              id="sh-ops-eta"
                              label={t('shipments.ops.eta')}
                              isoValue={opsData.eta}
                              disabled={!canEditOps}
                              onCommit={(iso) => setOpsData((prev) => ({ ...prev, eta: iso }))}
                            />
                            <OpsBasicDateField
                              id="sh-ops-etd"
                              label={t('shipments.ops.etd')}
                              isoValue={opsData.etd}
                              disabled={!canEditOps}
                              onCommit={(iso) => setOpsData((prev) => ({ ...prev, etd: iso }))}
                            />
                            <OpsBasicDateField
                              id="sh-ops-loading"
                              label={t('shipments.ops.loadingDate')}
                              isoValue={opsData.ops_loading_date}
                              disabled={!canEditOps}
                              onCommit={(iso) => setOpsData((prev) => ({ ...prev, ops_loading_date: iso }))}
                            />
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

                        <div className="shipment-detail-card shipment-op-tasks-section mb-6">
                          <ShipmentOperationsTasksPanel
                            token={token}
                            shipmentId={shipment.id}
                            tasks={tasks}
                            setTasks={setTasks}
                            canEditOps={canEditOps}
                            currentUserId={currentUserId}
                            refreshTasks={loadTasks}
                          />
                        </div>

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
            <section className="client-detail-modal__section shipment-audit-log-section">
              <h3 className="client-detail-modal__section-title">{t('shipments.ops.auditLogTitle')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('shipments.ops.auditLogHint')}</p>
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
                <div className="shipment-audit-table-wrap overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="shipment-audit-table min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="shipment-audit-th">{t('shipments.ops.auditColUser')}</th>
                        <th className="shipment-audit-th">{t('shipments.ops.auditColAction')}</th>
                        <th className="shipment-audit-th">{t('shipments.ops.auditColOld')}</th>
                        <th className="shipment-audit-th">{t('shipments.ops.auditColNew')}</th>
                        <th className="shipment-audit-th shipment-audit-th--time">{t('shipments.ops.auditColTime')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((row) => {
                        const line = formatShipmentAuditRow(row, t)
                        return (
                          <tr key={row.id} className="shipment-audit-tr">
                            <td className="shipment-audit-td font-medium">{line.user}</td>
                            <td className="shipment-audit-td">
                              <div className="font-medium text-gray-800 dark:text-gray-100">{line.action}</div>
                              {line.actionDetail ? (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[280px] break-words">
                                  {line.actionDetail}
                                </div>
                              ) : null}
                            </td>
                            <td className="shipment-audit-td shipment-audit-td--mono text-xs break-words max-w-[220px]">
                              {line.oldValue}
                            </td>
                            <td className="shipment-audit-td shipment-audit-td--mono text-xs break-words max-w-[220px]">
                              {line.newValue}
                            </td>
                            <td className="shipment-audit-td text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {formatDate(line.time, i18n.language)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {(isOperations || isAdminRole) && detailTab === 'transport_instructions' && (
            <div className="shipment-ti-tab-host">
              {opsLoading || !opsData ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : (
                <ShipmentTransportInstructionsTab
                  shipment={shipment}
                  opsData={opsData}
                  setOpsData={setOpsData}
                  canEditOps={canEditOps}
                  opsError={opsError}
                  customsVendorOptions={customsVendorOptions}
                  onGenerateTiPdf={handleTransportInstructionSaveAndPdf}
                  tiPdfLoading={tiPdfLoading}
                  tiBookingDraft={tiBookingDraft}
                  setTiBookingDraft={setTiBookingDraft}
                  shippingLineOptions={shippingLinesList}
                  t={t}
                  shipmentDisplayContainerType={shipmentDisplayContainerType}
                  shipmentDisplayContainerSize={shipmentDisplayContainerSize}
                />
              )}
            </div>
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
