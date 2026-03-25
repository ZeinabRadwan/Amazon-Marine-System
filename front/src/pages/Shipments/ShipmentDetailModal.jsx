import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getStoredToken } from '../Login'
import { listShipmentNotes, postShipmentNote, getShipmentTrackingUpdates, postShipmentTrackingUpdate } from '../../api/shipments'
import Tabs from '../../components/Tabs'
import ShipmentStatusBadge from '../../components/ShipmentStatusBadge'
import { getPipelineStepIndex, PIPELINE_STEP_KEYS } from './shipmentPipeline'
import './Shipments.css'
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
}) {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'

  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [noteError, setNoteError] = useState(null)

  const [trackingUpdates, setTrackingUpdates] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingText, setTrackingText] = useState('')
  const [trackingSubmitting, setTrackingSubmitting] = useState(false)
  const [trackingError, setTrackingError] = useState(null)

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

  useEffect(() => {
    if (!open || detailTab !== 'notes' || !shipment?.id) {
      setNotes([])
      return
    }
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
      setTrackingText('')
      setTrackingError(null)
    }
  }, [open])

  if (!open) return null

  const tabs = [
    { id: 'info', label: t('shipments.tabs.info') },
    { id: 'tracking', label: t('shipments.tabs.tracking') },
    { id: 'notes', label: t('shipments.tabs.notes') },
  ]

  const clientLabel =
    shipment?.client?.company_name ?? shipment?.client?.name ?? shipment?.client_name ?? '—'
  const origin = shipment?.origin_port?.name ?? '—'
  const dest = shipment?.destination_port?.name ?? '—'
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

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="shipment-detail-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--detail">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t('shipments.detail')}</span>
            <h2 id="shipment-detail-title" className="client-detail-modal__title client-detail-modal__title--client">
              {shipmentLoading ? '…' : (shipment?.bl_number ?? shipment?.booking_number ?? `#${shipment?.id}` ?? '—')}
            </h2>
            {!shipmentLoading && shipment && clientLabel !== '—' && (
              <p className="client-detail-modal__subtitle">{clientLabel}</p>
            )}
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('shipments.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <Tabs tabs={tabs} activeTab={detailTab} onChange={onTabChange} className="client-detail-modal__tabs" />

        <div className="client-detail-modal__body" role="tabpanel" id={`panel-${detailTab}`} aria-labelledby={`tab-${detailTab}`}>
          {detailTab === 'info' && (
            <section className="client-detail-modal__section client-detail-modal__section--info">
              {shipmentLoading || !shipment ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : (
                <div className="client-detail-modal__info-tab">
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

                  <div className="shipment-detail-two-col">
                    <div>
                      <div className="client-detail-modal__info-group">
                        <h3 className="client-detail-modal__info-group-title">{t('shipments.sections.main')}</h3>
                        <div className="client-detail-modal__grid client-detail-modal__grid--info">
                          {[
                            ['bl_number', shipment.bl_number],
                            ['booking_number', shipment.booking_number],
                            ['client', clientLabel],
                            ['status', shipment.status],
                            ['operations_status', shipment.operations_status != null ? String(shipment.operations_status) : '—'],
                            ['shipment_direction', shipment.shipment_direction],
                            ['mode', shipment.mode],
                            ['shipment_type', shipment.shipment_type],
                            ['route', [origin, dest].filter((x) => x !== '—').join(' → ') || shipment.route_text || '—'],
                            ['line_vendor', lineVendor],
                            ['loading_place', shipment.loading_place],
                            ['loading_date', shipment.loading_date],
                            ['cargo_description', shipment.cargo_description],
                          ].map(([key, val]) => (
                            <div key={key} className="client-detail-modal__row">
                              <span className="client-detail-modal__label">{t(`shipments.fields.${key}`)}</span>
                              <span className="client-detail-modal__value">
                                {key === 'status' ? (
                                  <ShipmentStatusBadge
                                    statusOptions={statusOptions}
                                    rawStatus={shipment.status}
                                    lang={i18n.language}
                                    t={t}
                                  />
                                ) : val != null && val !== '' ? (
                                  String(val)
                                ) : (
                                  '—'
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {shipment.sd_form && (
                        <div className="client-detail-modal__info-group">
                          <h3 className="client-detail-modal__info-group-title">{t('shipments.sections.sdForm')}</h3>
                          <div className="client-detail-modal__grid client-detail-modal__grid--info">
                            <div className="client-detail-modal__row">
                              <span className="client-detail-modal__label">{t('shipments.fields.sd_number')}</span>
                              <span className="client-detail-modal__value">{shipment.sd_form?.sd_number ?? shipment.sd_form_id ?? '—'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {shipment.operation && (
                        <div className="client-detail-modal__info-group">
                          <h3 className="client-detail-modal__info-group-title">{t('shipments.sections.operation')}</h3>
                          <div className="client-detail-modal__grid client-detail-modal__grid--info">
                            {Object.entries(shipment.operation)
                              .filter(([k]) => !['id', 'shipment_id', 'created_at', 'updated_at'].includes(k))
                              .map(([k, val]) => {
                                let display = '—'
                                if (val != null && val !== '') {
                                  if (typeof val === 'object' && val !== null && 'name' in val) {
                                    display = String(val.name)
                                  } else if (typeof val === 'object') {
                                    display = JSON.stringify(val)
                                  } else {
                                    display = String(val)
                                  }
                                }
                                return (
                                  <div key={k} className="client-detail-modal__row">
                                    <span className="client-detail-modal__label">{k}</span>
                                    <span className="client-detail-modal__value">{display}</span>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {Array.isArray(shipment.tasks) && shipment.tasks.length > 0 && (
                        <div className="client-detail-modal__info-group">
                          <h3 className="client-detail-modal__info-group-title">{t('shipments.sections.tasks')}</h3>
                          <ul className="client-detail-modal__list">
                            {shipment.tasks.map((task) => (
                              <li key={task.id} className="client-detail-modal__list-item">
                                <span className="client-detail-modal__list-label">{task.name ?? '—'}</span>
                                <span className="client-detail-modal__list-value">
                                  {[task.status, task.due_date].filter(Boolean).join(' · ') || '—'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {canViewFinancialTotals && (
                      <div className="shipment-financial-card">
                        <h3 className="client-detail-modal__info-group-title">{t('shipments.financialSummary')}</h3>
                        <div className="shipment-financial-card__rows">
                          <div className="shipment-financial-card__row">
                            <span>{t('shipments.fields.cost_total')}</span>
                            <span className="fw-600">{formatMoney(shipment.cost_total, locale)}</span>
                          </div>
                          {canViewSelling && (
                            <div className="shipment-financial-card__row">
                              <span>{t('shipments.fields.selling_price_total')}</span>
                              <span className="fw-600">{formatMoney(shipment.selling_price_total, locale)}</span>
                            </div>
                          )}
                          <div className="shipment-financial-card__row shipment-financial-card__row--emphasis">
                            <span>{t('shipments.fields.profit_total')}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 fw-700">{formatMoney(shipment.profit_total, locale)}</span>
                          </div>
                        </div>
                      </div>
                    )}
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
            <section className="client-detail-modal__section">
              {canManageOps && (
                <form onSubmit={handleAddNote} className="mb-4">
                  <label htmlFor="shipment-note" className="client-detail-modal__label block mb-1">
                    {t('shipments.addNote')}
                  </label>
                  <textarea
                    id="shipment-note"
                    rows={3}
                    className="clients-input w-full mb-2"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    disabled={noteSubmitting || !shipment?.id}
                  />
                  {noteError && <p className="text-sm text-red-600 mb-2">{noteError}</p>}
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={noteSubmitting || !noteText.trim() || !shipment?.id}
                  >
                    {noteSubmitting ? t('shipments.saving') : t('shipments.saveNote')}
                  </button>
                </form>
              )}
              <h3 className="client-detail-modal__section-title">{t('shipments.notesHistory')}</h3>
              {notesLoading ? (
                <p className="client-detail-modal__empty">{t('shipments.loading')}</p>
              ) : notes.length === 0 ? (
                <p className="client-detail-modal__empty">{t('shipments.noNotes')}</p>
              ) : (
                <ul className="client-detail-modal__list">
                  {notes.map((n) => (
                    <li key={n.id} className="client-detail-modal__list-item">
                      <span className="client-detail-modal__list-label">
                        {n.author?.name ?? '—'} · {formatDate(n.created_at, i18n.language)}
                      </span>
                      <span className="client-detail-modal__list-value whitespace-pre-wrap">{n.content ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <footer className="client-detail-modal__footer">
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
