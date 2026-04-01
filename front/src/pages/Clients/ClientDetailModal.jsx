import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Package, Phone, Mail, MapPin, MessageCircle, Users, Pencil, Trash2, Check } from 'lucide-react'
import DateTimePicker from '../../components/DateTimePicker'
import FollowUpWorkloadWidgets from '../../components/FollowUpWorkloadWidgets'
import Tabs from '../../components/Tabs'
import Shimmer from '../../components/Shimmer'
import { useShipmentTrackingUpdates } from '../../hooks/useShipmentTrackingUpdates'
import VisitStatusBadge from '../Visits/VisitStatusBadge'
import { localizedStatusLabel } from '../../utils/localizedStatusLabel'
import './Clients.css'
import './ClientDetailModal.css'

function defaultLocalDateTime() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const FOLLOWUP_CHANNELS = ['phone', 'whatsapp', 'email', 'visit', 'meeting']
const FOLLOWUP_KINDS = [
  'cold_call',
  'consultation',
  'price_followup',
  'collection_followup',
  'shipment_followup',
  'other',
]
const FOLLOWUP_OUTCOMES = [
  'no_answer',
  'contacted',
  'interested',
  'not_interested',
  'price_requested',
  'postponed',
  'deal_done',
  'needs_followup',
]

function FollowUpChannelGlyph({ channel }) {
  const ch = channel ?? ''
  const Icon =
    {
      phone: Phone,
      whatsapp: MessageCircle,
      email: Mail,
      visit: MapPin,
      meeting: Users,
    }[ch] ?? Phone
  return <Icon aria-hidden="true" className="client-followup-timeline__channel-icon" />
}

function followUpOutcomeTone(outcome) {
  if (!outcome) return 'default'
  const m = {
    interested: 'success',
    deal_done: 'success',
    price_requested: 'info',
    contacted: 'info',
    needs_followup: 'warning',
    postponed: 'warning',
    no_answer: 'muted',
    not_interested: 'danger',
  }
  return m[outcome] ?? 'default'
}

/** Ensure backend parses local `Y-m-d H:i` consistently (MySQL datetime). */
function normalizeDateTimeForApi(s) {
  if (s == null || String(s).trim() === '') return undefined
  const v = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) return `${v}:00`
  return v
}

/** API may return visit_date as ISO string (e.g. 2026-03-23T00:00:00.000000Z). */
function formatVisitDateDisplay(value, locale) {
  if (value == null || value === '') return '—'
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/** Info tab: grouped sections with title keys for better layout */
const infoSectionGroups = [
  { titleKey: 'clients.sections.basic', fields: ['name', 'company_name', 'company_type', 'business_activity', 'target_markets', 'tax_id'] },
  { titleKey: 'clients.sections.contact', fields: ['email', 'phone', 'preferred_comm_method'] },
  { titleKey: 'clients.sections.address', fields: ['city', 'country', 'address'] },
  { titleKey: 'clients.sections.links', fields: ['website_url', 'facebook_url', 'linkedin_url'] },
  { titleKey: 'clients.sections.sourceSales', fields: ['client_type', 'status', 'lead_source', 'interest_level'] },
  { titleKey: 'clients.sections.decisionMaker', fields: ['decision_maker_name', 'decision_maker_title'] },
  { titleKey: 'clients.sections.payment', fields: ['default_payment_terms', 'default_currency'] },
  { titleKey: 'clients.sections.notes', fields: ['notes'] },
]

const LINK_FIELD_KEYS = new Set(['website_url', 'facebook_url', 'linkedin_url'])

function toExternalUrl(value) {
  const raw = value != null ? String(value).trim() : ''
  if (!raw) return null
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(withProtocol)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export default function ClientDetailModal({
  open,
  detailId,
  detailClient,
  detailTab,
  onTabChange,
  onClose,
  onEdit,
  visits = [],
  shipments = [],
  attachments = [],
  attachmentUploading,
  attachmentDeletingId,
  attachmentViewingId,
  onAttachmentUpload,
  onAttachmentDownload,
  onAttachmentView,
  onAttachmentDelete,
  notes = [],
  notesLoading = false,
  noteSubmitting = false,
  onAddNote,
  noteUpdatingId = null,
  noteDeletingId = null,
  onUpdateNote,
  onDeleteNote,
  followUps = [],
  followUpsLoading = false,
  followUpSubmitting = false,
  followUpUpdatingId = null,
  followUpDeletingId = null,
  onAddFollowUp,
  onUpdateFollowUp,
  onDeleteFollowUp,
  workloadSummary = null,
  workloadSummaryLoading = false,
  workloadSummaryError = null,
  onWorkloadClientId,
  shipmentCreating = false,
  onCreateShipment,
  financialSummaryList = [],
  numberLocale = 'en-US',
}) {
  const { t, i18n } = useTranslation()
  const [noteContent, setNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [expandedShipmentId, setExpandedShipmentId] = useState(null)
  const { data: trackingUpdates, loading: trackingUpdatesLoading, error: trackingUpdatesError, refetch: refetchTrackingUpdates } = useShipmentTrackingUpdates(expandedShipmentId)
  const [followUpForm, setFollowUpForm] = useState({
    channel: 'phone',
    followup_type: 'consultation',
    outcome: '',
    occurred_at: defaultLocalDateTime(),
    next_follow_up_at: '',
    reminder_mode: 'absolute',
    reminder_at: '',
    reminder_before_value: '30',
    reminder_before_unit: 'minute',
    notes: '',
  })
  const [followUpValidationError, setFollowUpValidationError] = useState('')
  const [editingFollowUpId, setEditingFollowUpId] = useState(null)
  const [editingFollowUpSummary, setEditingFollowUpSummary] = useState('')

  if (!open) return null

  const formatCurrency = (v) =>
    typeof v === 'number'
      ? new Intl.NumberFormat(numberLocale, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(v)
      : (v ?? '—')

  const formatDate = (v) =>
    v
      ? new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(v))
      : '—'

  const formatDateTime = (v) => {
    if (v == null || v === '') return '—'
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '—'
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
    const datePart = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
    const timePart = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d)
    return `${datePart} - ${timePart}`
  }

  const clientFinancial = financialSummaryList.find((item) => Number(item.id) === Number(detailId))

  const tabs = [
    { id: 'info', label: t('clients.tabs.info', 'Info') },
    { id: 'visits', label: t('clients.tabs.visits', 'Visits') },
    { id: 'shipments', label: t('clients.tabs.shipments', 'Shipments') },
    { id: 'attachments', label: t('clients.tabs.attachments', 'Attachments') },
    { id: 'notes', label: t('clients.tabs.notes', 'Notes') },
    { id: 'followups', label: t('clients.tabs.followups', 'Follow-ups') },
    { id: 'financial', label: t('clients.financialSummary', 'Financial summary') },
  ]

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-detail-modal-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--detail">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t('clients.detail')}</span>
            <h2 id="client-detail-modal-title" className="client-detail-modal__title client-detail-modal__title--client">
              {detailClient ? (detailClient.company_name || detailClient.name || '—') : '—'}
            </h2>
            {detailClient?.company_name && detailClient?.name && detailClient.company_name !== detailClient.name && (
              <p className="client-detail-modal__subtitle">{detailClient.name}</p>
            )}
          </div>
          <button
            type="button"
            className="client-detail-modal__close"
            onClick={onClose}
            aria-label={t('clients.close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <Tabs
          tabs={tabs}
          activeTab={detailTab}
          onChange={onTabChange}
          className="client-detail-modal__tabs"
        />

        <div className="client-detail-modal__body" role="tabpanel" id={`panel-${detailTab}`} aria-labelledby={`tab-${detailTab}`}>
          {detailTab === 'info' && (
            <section className="client-detail-modal__section client-detail-modal__section--info">
              {detailClient ? (
                <div className="client-detail-modal__info-tab">
                  {infoSectionGroups.map((group) => (
                    <div key={group.titleKey} className="client-detail-modal__info-group">
                      <h3 className="client-detail-modal__info-group-title">{t(group.titleKey)}</h3>
                      <div className="client-detail-modal__grid client-detail-modal__grid--info">
                        {group.fields.map((key) => (
                          <div key={key} className="client-detail-modal__row">
                            <span className="client-detail-modal__label">
                              {key === 'status' && detailClient?.client_type === 'lead'
                                ? t('clients.salesStage')
                                : t(`clients.fields.${key}`)}
                            </span>
                            <span className="client-detail-modal__value">
                              {key === 'client_type'
                                ? detailClient?.client_type === 'lead'
                                  ? t('clients.clientType.lead')
                                  : detailClient?.client_type === 'client'
                                    ? t('clients.clientType.client')
                                    : '—'
                                : key === 'status'
                                  ? (() => {
                                      const st = detailClient?.client_status
                                      if (st) {
                                        return localizedStatusLabel(st, i18n.language) || '—'
                                      }
                                      return (detailClient?.[key] ?? '').toString().trim() || '—'
                                    })()
                                  : LINK_FIELD_KEYS.has(key)
                                    ? (() => {
                                        const raw = (detailClient?.[key] ?? '').toString().trim()
                                        if (!raw) return '—'
                                        const href = toExternalUrl(raw)
                                        if (!href) return raw
                                        return (
                                          <a href={href} target="_blank" rel="noopener noreferrer">
                                            {raw}
                                          </a>
                                        )
                                      })()
                                  : (detailClient[key] ?? '').toString().trim() || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="client-detail-modal__empty">{t('clients.error')}</p>
              )}
            </section>
          )}

          {detailTab === 'visits' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('clients.tabs.visits')}</h3>
              {visits.length === 0 ? (
                <p className="client-detail-modal__empty">{t('clients.noVisits')}</p>
              ) : (
                <ul className="client-detail-modal__list">
                  {visits.map((v) => (
                    <li key={v.id ?? v.visit_date} className="client-detail-modal__list-item client-detail-modal__list-item--visit">
                      <div className="client-detail-modal__list-label client-detail-modal__visit-date">
                        <span className="client-detail-modal__visit-date-main">
                          {formatVisitDateDisplay(v.visit_date ?? v.date, i18n.language)}
                        </span>
                        {(v.user_name || v.user?.name) && (
                          <span className="client-detail-modal__visit-user">{v.user_name ?? v.user?.name}</span>
                        )}
                        <span className="client-detail-modal__visit-status-badge">
                          <VisitStatusBadge status={v.status} t={t} />
                        </span>
                      </div>
                      <div className="client-detail-modal__list-value client-detail-modal__visit-body">
                        <div className="client-detail-modal__visit-subject">{v.subject?.trim() || '—'}</div>
                        {v.purpose?.trim() ? (
                          <div className="client-detail-modal__visit-purpose">{v.purpose}</div>
                        ) : null}
                        {v.notes?.trim() ? (
                          <div className="client-detail-modal__visit-notes">{v.notes}</div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'shipments' && (
            <section className="client-detail-modal__section">
              <div className="client-detail-modal__section-head">
                <h3 className="client-detail-modal__section-title">{t('clients.tabs.shipments')}</h3>
                {onCreateShipment && (
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    onClick={onCreateShipment}
                    disabled={shipmentCreating}
                  >
                    {shipmentCreating ? t('clients.creating', 'Creating…') : t('clients.createShipment', 'New shipment')}
                  </button>
                )}
              </div>
              {shipments.length === 0 ? (
                <p className="client-detail-modal__empty">{t('clients.noShipments')}</p>
              ) : (
                <>
                  <ul className="client-detail-modal__list">
                    {shipments.map((s) => (
                      <li key={s.id} className="client-detail-modal__list-item client-detail-modal__list-item--with-action">
                        <div className="client-detail-modal__shipment-row">
                          <span className="client-detail-modal__list-label">{s.bl_number ?? s.reference ?? s.id}</span>
                          <span className="client-detail-modal__list-value">{s.status ?? s.amount ?? '—'}</span>
                        </div>
                        <button
                          type="button"
                          className="client-detail-modal__btn client-detail-modal__btn--secondary client-detail-modal__btn--sm"
                          onClick={() => setExpandedShipmentId(expandedShipmentId === s.id ? null : s.id)}
                          aria-expanded={expandedShipmentId === s.id}
                        >
                          <Package size={14} aria-hidden />
                          {expandedShipmentId === s.id ? t('clients.closeTrackingUpdates') : t('clients.viewTrackingUpdates')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {expandedShipmentId != null && (
                    <div className="client-detail-modal__tracking-updates">
                      <h4 className="client-detail-modal__tracking-updates-title">{t('clients.trackingUpdates')}</h4>
                      {trackingUpdatesLoading ? (
                        <Shimmer rows={4} className="client-detail-modal__shimmer" />
                      ) : trackingUpdatesError ? (
                        <div className="client-detail-modal__tracking-error">
                          <p className="client-detail-modal__empty">{trackingUpdatesError}</p>
                          <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => refetchTrackingUpdates()}>
                            {t('clients.retry')}
                          </button>
                        </div>
                      ) : trackingUpdates.length === 0 ? (
                        <p className="client-detail-modal__empty">{t('clients.noTrackingUpdates')}</p>
                      ) : (
                        <ul className="client-detail-modal__list client-detail-modal__list--tracking">
                          {trackingUpdates.map((u) => (
                            <li key={u.id} className="client-detail-modal__list-item">
                              <span className="client-detail-modal__list-label">
                                {formatDate(u.created_at)}
                                {u.created_by?.name ? ` · ${u.created_by.name}` : ''}
                              </span>
                              <span className="client-detail-modal__list-value">{u.update_text ?? '—'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {detailTab === 'notes' && (
            <section className="client-detail-modal__section client-detail-modal__section--notes">
              <h3 className="client-detail-modal__section-title">{t('clients.tabs.notes')}</h3>
              {onAddNote && (
                <div className="client-detail-modal__form-grid client-detail-modal__grid--card" style={{ marginBottom: 16 }}>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="client-note-content">{t('clients.addNote', 'Add note')}</label>
                    <textarea
                      id="client-note-content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      disabled={noteSubmitting}
                      rows={3}
                      placeholder={t('clients.notePlaceholder', 'Quick note…')}
                    />
                    <button
                      type="button"
                      className="client-detail-modal__btn client-detail-modal__btn--primary"
                      onClick={() => { onAddNote(noteContent); setNoteContent('') }}
                      disabled={noteSubmitting}
                    >
                      {noteSubmitting ? t('clients.saving', 'Saving…') : t('clients.saveNote', 'Save note')}
                    </button>
                  </div>
                </div>
              )}
              {notesLoading ? (
                <p className="client-detail-modal__empty">{t('clients.loading', 'Loading…')}</p>
              ) : notes.length === 0 ? (
                <p className="client-detail-modal__empty">{t('clients.noNotes', 'No notes yet.')}</p>
              ) : (
                <ul className="client-detail-modal__list">
                  {notes.map((n) => (
                    <li key={n.id} className="client-detail-modal__list-item client-detail-modal__note-item">
                      <span className="client-detail-modal__list-label client-detail-modal__note-meta">
                        {formatDate(n.created_at)} {n.author?.name ? ` · ${n.author.name}` : ''}
                      </span>
                      {editingNoteId === n.id ? (
                        <div className="client-detail-modal__list-value client-detail-modal__note-content">
                          <textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            disabled={noteUpdatingId === n.id}
                            rows={3}
                          />
                          <div className="client-detail-modal__note-actions">
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--primary"
                              disabled={noteUpdatingId === n.id}
                              aria-label={t('clients.save', 'Save')}
                              title={t('clients.save', 'Save')}
                              onClick={async () => {
                                const ok = await onUpdateNote?.(n.id, editingNoteContent)
                                if (ok) {
                                  setEditingNoteId(null)
                                  setEditingNoteContent('')
                                }
                              }}
                            >
                              {noteUpdatingId === n.id ? t('clients.saving', 'Saving…') : <Check size={14} aria-hidden />}
                            </button>
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--secondary"
                              disabled={noteUpdatingId === n.id}
                              aria-label={t('clients.cancel', 'Cancel')}
                              title={t('clients.cancel', 'Cancel')}
                              onClick={() => {
                                setEditingNoteId(null)
                                setEditingNoteContent('')
                              }}
                            >
                              <X size={14} aria-hidden />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="client-detail-modal__list-value client-detail-modal__note-content">
                          <div>{(n.content || '').slice(0, 200)}{(n.content || '').length > 200 ? '…' : ''}</div>
                          <div className="client-detail-modal__note-actions">
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--secondary"
                              aria-label={t('clients.edit', 'Edit')}
                              title={t('clients.edit', 'Edit')}
                              onClick={() => {
                                setEditingNoteId(n.id)
                                setEditingNoteContent(n.content || '')
                              }}
                            >
                              <Pencil size={14} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--danger"
                              disabled={noteDeletingId === n.id}
                              aria-label={t('clients.delete', 'Delete')}
                              title={t('clients.delete', 'Delete')}
                              onClick={async () => {
                                const yes = window.confirm(t('clients.noteDeleteConfirm', 'Delete this note?'))
                                if (!yes) return
                                const ok = await onDeleteNote?.(n.id)
                                if (ok && editingNoteId === n.id) {
                                  setEditingNoteId(null)
                                  setEditingNoteContent('')
                                }
                              }}
                            >
                              {noteDeletingId === n.id ? t('clients.deleting', 'Deleting…') : <Trash2 size={14} aria-hidden />}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'followups' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('clients.tabs.followups')}</h3>
              <div className="client-detail-modal__followup-widgets-wrap">
                <p className="client-detail-modal__followup-widgets-label">{t('clients.followUpWorkloadTitle', 'Your follow-up workload')}</p>
                <FollowUpWorkloadWidgets
                  summary={workloadSummary}
                  loading={workloadSummaryLoading}
                  error={workloadSummaryError}
                  onClientClick={onWorkloadClientId}
                />
              </div>
              {onAddFollowUp && (
                <div className="client-detail-modal__form-grid client-detail-modal__grid--card client-detail-modal__followup-form" style={{ marginBottom: 16 }}>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="followup-channel">{t('clients.followUpChannelLabel', 'Follow-up channel')}</label>
                    <select
                      id="followup-channel"
                      value={followUpForm.channel}
                      onChange={(e) => setFollowUpForm((prev) => ({ ...prev, channel: e.target.value }))}
                      disabled={followUpSubmitting}
                      required
                    >
                      {FOLLOWUP_CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {t(`clients.followUpChannel.${c}`, c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="followup-kind">{t('clients.followUpKindLabel', 'Follow-up type')}</label>
                    <select
                      id="followup-kind"
                      value={followUpForm.followup_type}
                      onChange={(e) => setFollowUpForm((prev) => ({ ...prev, followup_type: e.target.value }))}
                      disabled={followUpSubmitting}
                      required
                    >
                      {FOLLOWUP_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t(`clients.followUpKind.${k}`, k)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="followup-outcome">{t('clients.followUpOutcomeLabel', 'Outcome')}</label>
                    <select
                      id="followup-outcome"
                      value={followUpForm.outcome}
                      onChange={(e) => setFollowUpForm((prev) => ({ ...prev, outcome: e.target.value }))}
                      disabled={followUpSubmitting}
                    >
                      <option value="">{t('clients.followUpOutcomeUnset', '— Later / not set —')}</option>
                      {FOLLOWUP_OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {t(`clients.followUpOutcome.${o}`, o)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="followup-occurred">{t('clients.followUpOccurred', 'Occurred at')}</label>
                    <DateTimePicker
                      id="followup-occurred"
                      value={followUpForm.occurred_at}
                      onChange={(v) => setFollowUpForm((prev) => ({ ...prev, occurred_at: v || defaultLocalDateTime() }))}
                      disabled={followUpSubmitting}
                      locale={i18n.language}
                      className="client-detail-modal__datetime-input"
                      placeholder={t('clients.followUpPickDateTime', 'Select date and time')}
                    />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="followup-next">{t('clients.followUpNext', 'Next follow-up')}</label>
                    <DateTimePicker
                      id="followup-next"
                      value={followUpForm.next_follow_up_at}
                      onChange={(v) => setFollowUpForm((prev) => ({ ...prev, next_follow_up_at: v }))}
                      disabled={followUpSubmitting}
                      locale={i18n.language}
                      className="client-detail-modal__datetime-input"
                      placeholder={t('clients.followUpNextPlaceholder', 'Optional')}
                    />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full client-detail-modal__followup-reminder-block">
                    <span className="client-detail-modal__followup-reminder-label" id="followup-reminder-heading">
                      {t('clients.followUpReminder', 'Reminder time')}
                    </span>
                    <p className="client-detail-modal__followup-reminder-sublabel">{t('clients.followUpReminderModeLabel', 'How should we remind you?')}</p>
                    <div className="client-detail-modal__reminder-mode-group" role="radiogroup" aria-labelledby="followup-reminder-heading">
                      <label className="client-detail-modal__reminder-mode-option">
                        <input
                          type="radio"
                          name="followup-reminder-mode"
                          value="absolute"
                          checked={followUpForm.reminder_mode === 'absolute'}
                          onChange={() => {
                            setFollowUpValidationError('')
                            setFollowUpForm((prev) => ({ ...prev, reminder_mode: 'absolute' }))
                          }}
                          disabled={followUpSubmitting}
                        />
                        <span>{t('clients.followUpReminderModeAbsolute', 'Set date and time')}</span>
                      </label>
                      <label className="client-detail-modal__reminder-mode-option">
                        <input
                          type="radio"
                          name="followup-reminder-mode"
                          value="before"
                          checked={followUpForm.reminder_mode === 'before'}
                          onChange={() => {
                            setFollowUpValidationError('')
                            setFollowUpForm((prev) => ({ ...prev, reminder_mode: 'before' }))
                          }}
                          disabled={followUpSubmitting}
                        />
                        <span>{t('clients.followUpReminderModeBefore', 'Before next follow-up')}</span>
                      </label>
                    </div>
                    {followUpForm.reminder_mode === 'absolute' ? (
                      <div className="client-detail-modal__reminder-mode-panel">
                        <label htmlFor="followup-reminder-datetime" className="client-field-hint__sr-only">
                          {t('clients.followUpReminderModeAbsolute')}
                        </label>
                        <DateTimePicker
                          id="followup-reminder-datetime"
                          value={followUpForm.reminder_at}
                          onChange={(v) => setFollowUpForm((prev) => ({ ...prev, reminder_at: v }))}
                          disabled={followUpSubmitting}
                          locale={i18n.language}
                          className="client-detail-modal__datetime-input"
                          placeholder={t('clients.followUpPickDateTime', 'Select date and time')}
                        />
                      </div>
                    ) : (
                      <div className="client-detail-modal__reminder-mode-panel client-detail-modal__reminder-before-row">
                        <p className="client-detail-modal__reminder-before-hint">{t('clients.followUpReminderRelativeHint')}</p>
                        <div className="client-detail-modal__reminder-before-controls">
                          <input
                            id="followup-reminder-before-value"
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            className="client-detail-modal__reminder-before-input"
                            value={followUpForm.reminder_before_value}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, reminder_before_value: e.target.value }))}
                            disabled={followUpSubmitting}
                            aria-label={t('clients.followUpReminderRelativeHint')}
                          />
                          <select
                            id="followup-reminder-before-unit"
                            className="client-detail-modal__reminder-before-unit"
                            value={followUpForm.reminder_before_unit}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, reminder_before_unit: e.target.value }))}
                            disabled={followUpSubmitting}
                          >
                            <option value="minute">{t('clients.reminderUnit.minute')}</option>
                            <option value="hour">{t('clients.reminderUnit.hour')}</option>
                            <option value="day">{t('clients.reminderUnit.day')}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="followup-notes">{t('clients.followUpSummary', 'Follow-up summary')}</label>
                    <textarea
                      id="followup-notes"
                      value={followUpForm.notes}
                      onChange={(e) => {
                        setFollowUpValidationError('')
                        setFollowUpForm((prev) => ({ ...prev, notes: e.target.value }))
                      }}
                      disabled={followUpSubmitting}
                      rows={3}
                      required
                    />
                    {followUpValidationError ? (
                      <p className="client-detail-modal__error-text">{followUpValidationError}</p>
                    ) : null}
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <button
                      type="button"
                      className="client-detail-modal__btn client-detail-modal__btn--primary"
                      onClick={async () => {
                        const summary = String(followUpForm.notes ?? '').trim()
                        if (!summary) {
                          setFollowUpValidationError(t('clients.followUpSummaryRequired', 'Follow-up summary is required.'))
                          return
                        }
                        const nextNorm = normalizeDateTimeForApi(followUpForm.next_follow_up_at)
                        const base = {
                          channel: followUpForm.channel,
                          followup_type: followUpForm.followup_type,
                          outcome: followUpForm.outcome || undefined,
                          occurred_at: normalizeDateTimeForApi(followUpForm.occurred_at) ?? followUpForm.occurred_at,
                          summary,
                          next_follow_up_at: nextNorm,
                        }
                        let payload = base
                        if (followUpForm.reminder_mode === 'absolute') {
                          const ra = normalizeDateTimeForApi(followUpForm.reminder_at)
                          if (!ra) {
                            setFollowUpValidationError(
                              t('clients.followUpReminderRequired', 'Set a reminder time or choose “before next follow-up” with a valid duration.')
                            )
                            return
                          }
                          payload = { ...base, reminder_at: ra }
                        } else {
                          if (!nextNorm) {
                            setFollowUpValidationError(
                              t(
                                'clients.followUpNextRequiredForRelative',
                                'Set the next follow-up date first, then choose how long before it to remind you.'
                              )
                            )
                            return
                          }
                          const v = parseInt(String(followUpForm.reminder_before_value ?? '').trim(), 10)
                          const unit = followUpForm.reminder_before_unit
                          if (!Number.isFinite(v) || v < 1 || !['minute', 'hour', 'day'].includes(unit)) {
                            setFollowUpValidationError(
                              t('clients.followUpReminderBeforeValueInvalid', 'Enter a positive number for the reminder offset.')
                            )
                            return
                          }
                          payload = { ...base, reminder_before_value: v, reminder_before_unit: unit }
                        }
                        const ok = await onAddFollowUp?.(payload)
                        if (!ok) return
                        setFollowUpValidationError('')
                        setFollowUpForm({
                          channel: 'phone',
                          followup_type: 'consultation',
                          outcome: '',
                          occurred_at: defaultLocalDateTime(),
                          next_follow_up_at: '',
                          reminder_mode: 'absolute',
                          reminder_at: '',
                          reminder_before_value: '30',
                          reminder_before_unit: 'minute',
                          notes: '',
                        })
                      }}
                      disabled={followUpSubmitting}
                    >
                      {followUpSubmitting ? t('clients.saving', 'Saving…') : t('clients.addFollowUp', 'Add follow-up')}
                    </button>
                  </div>
                </div>
              )}
              {followUpsLoading ? (
                <p className="client-detail-modal__empty">{t('clients.loading', 'Loading…')}</p>
              ) : followUps.length === 0 ? (
                <p className="client-detail-modal__empty">{t('clients.noFollowUps', 'No follow-ups yet.')}</p>
              ) : (
                <ul className="client-followup-timeline">
                  {followUps.map((f) => {
                    const ch = f.channel ?? f.type ?? ''
                    const kind = f.followup_type
                    const tone = followUpOutcomeTone(f.outcome)
                    return (
                      <li key={f.id} className="client-followup-timeline__item">
                        <div className="client-followup-timeline__dot" title={ch ? t(`clients.followUpChannel.${ch}`, ch) : ''}>
                          <FollowUpChannelGlyph channel={ch} />
                        </div>
                        <article className="client-followup-timeline__card">
                          <div className="client-followup-timeline__row">
                            {kind ? (
                              <span className="client-followup-timeline__kind">{t(`clients.followUpKind.${kind}`, kind)}</span>
                            ) : null}
                            {ch ? (
                              <span className={`client-followup-outcome-badge client-followup-outcome-badge--default`}>
                                {t(`clients.followUpChannel.${ch}`, ch)}
                              </span>
                            ) : null}
                            {f.outcome ? (
                              <span className={`client-followup-outcome-badge client-followup-outcome-badge--${tone}`}>
                                {t(`clients.followUpOutcome.${f.outcome}`, f.outcome)}
                              </span>
                            ) : (
                              <span className="client-followup-outcome-badge client-followup-outcome-badge--muted">
                                {t('clients.followUpOutcomePending', 'Outcome pending')}
                              </span>
                            )}
                          </div>
                          <div className="client-followup-timeline__when">
                            {t('clients.followUpOccurred')}: {formatDateTime(f.occurred_at)}
                          </div>
                          {f.next_follow_up_at ? (
                            <div className="client-followup-timeline__next">
                              {t('clients.followUpNextShort', 'Next')}: {formatDateTime(f.next_follow_up_at)}
                            </div>
                          ) : null}
                          {f.reminder_at ? (
                            <div className="client-followup-timeline__reminder">
                              {f.reminder_before_value != null && f.reminder_before_unit ? (
                                <>
                                  <span className="client-followup-timeline__reminder-label">{t('clients.followUpReminderShort')}: </span>
                                  {t('clients.followUpReminderRelativeLine', {
                                    count: f.reminder_before_value,
                                    unit: t(`clients.reminderUnit.${f.reminder_before_unit}`, f.reminder_before_unit),
                                  })}
                                  <span className="client-followup-timeline__reminder-at"> — {formatDateTime(f.reminder_at)}</span>
                                </>
                              ) : (
                                <>
                                  <span className="client-followup-timeline__reminder-label">{t('clients.followUpReminderShort')}: </span>
                                  {formatDateTime(f.reminder_at)}
                                </>
                              )}
                            </div>
                          ) : null}
                          {f.summary?.trim() ? (
                            <div className="client-followup-timeline__notes">{f.summary}</div>
                          ) : null}
                          {editingFollowUpId === f.id ? (
                            <div className="client-followup-edit-box">
                              <textarea
                                value={editingFollowUpSummary}
                                onChange={(e) => setEditingFollowUpSummary(e.target.value)}
                                rows={3}
                                disabled={followUpUpdatingId === f.id}
                              />
                              <div className="client-detail-modal__note-actions">
                                <button
                                  type="button"
                                  className="client-detail-modal__btn client-detail-modal__btn--primary"
                                  aria-label={t('clients.save', 'Save')}
                                  title={t('clients.save', 'Save')}
                                  disabled={followUpUpdatingId === f.id}
                                  onClick={async () => {
                                    const summary = String(editingFollowUpSummary ?? '').trim()
                                if (!summary) return
                                    const ok = await onUpdateFollowUp?.(f.id, { summary })
                                    if (ok) {
                                      setEditingFollowUpId(null)
                                      setEditingFollowUpSummary('')
                                    }
                                  }}
                                >
                                  <Check size={14} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                                  aria-label={t('clients.cancel', 'Cancel')}
                                  title={t('clients.cancel', 'Cancel')}
                                  disabled={followUpUpdatingId === f.id}
                                  onClick={() => {
                                    setEditingFollowUpId(null)
                                    setEditingFollowUpSummary('')
                                  }}
                                >
                                  <X size={14} aria-hidden />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="client-detail-modal__note-actions">
                              <button
                                type="button"
                                className="client-detail-modal__btn client-detail-modal__btn--secondary"
                                aria-label={t('clients.edit', 'Edit')}
                                title={t('clients.edit', 'Edit')}
                                onClick={() => {
                                  setEditingFollowUpId(f.id)
                                  setEditingFollowUpSummary(f.summary || '')
                                }}
                              >
                                <Pencil size={14} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="client-detail-modal__btn client-detail-modal__btn--danger"
                                aria-label={t('clients.delete', 'Delete')}
                                title={t('clients.delete', 'Delete')}
                                disabled={followUpDeletingId === f.id}
                                onClick={async () => {
                                  const yes = window.confirm(t('clients.followUpDeleteConfirm', 'Delete this follow-up?'))
                                  if (!yes) return
                                  await onDeleteFollowUp?.(f.id)
                                }}
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>
                            </div>
                          )}
                          {f.created_by?.name ? (
                            <div className="client-followup-timeline__author">{f.created_by.name}</div>
                          ) : null}
                        </article>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'attachments' && (
            <section className="client-detail-modal__section">
              <div className="client-detail-modal__section-head">
                <h3 className="client-detail-modal__section-title">{t('clients.tabs.attachments')}</h3>
                <label className="client-detail-modal__upload-btn">
                  {attachmentUploading ? t('clients.uploading') : t('clients.uploadAttachment', 'Upload')}
                  <input
                    type="file"
                    className="client-detail-modal__file-input"
                    accept="*"
                    onChange={onAttachmentUpload}
                    disabled={attachmentUploading}
                  />
                </label>
              </div>
              {attachments.length === 0 ? (
                <p className="client-detail-modal__empty">{t('clients.noAttachments')}</p>
              ) : (
                <ul className="client-detail-modal__list client-detail-modal__list--attachments">
                  {attachments.map((a) => {
                    const displayName = a.name ?? a.file_name ?? `attachment-${a.id}`
                    const downloadUrl = a.url ?? a.download_url
                    return (
                      <li key={a.id} className="client-detail-modal__list-item client-detail-modal__list-item--with-action">
                        <span className="client-detail-modal__list-value" title={downloadUrl || undefined}>
                          {displayName}
                        </span>
                        <div className="client-detail-modal__list-actions">
                          {onAttachmentView && detailId && (
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--secondary"
                              onClick={() => onAttachmentView(detailId, a.id, downloadUrl, a.mime_type)}
                              disabled={attachmentViewingId === a.id}
                            >
                              {attachmentViewingId === a.id ? t('clients.viewAttachmentLoading') : t('clients.viewAttachment')}
                            </button>
                          )}
                          {onAttachmentDownload && detailId && (
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--secondary"
                              onClick={() => onAttachmentDownload(detailId, a.id, displayName, downloadUrl)}
                              disabled={attachmentViewingId === a.id}
                            >
                              {t('clients.download')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="client-detail-modal__btn client-detail-modal__btn--danger"
                            onClick={() => onAttachmentDelete(a.id)}
                            disabled={attachmentDeletingId === a.id}
                          >
                            {attachmentDeletingId === a.id ? t('clients.deleting') : t('clients.delete')}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'financial' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('clients.financialSummary')}</h3>
              {clientFinancial == null ? (
                <p className="client-detail-modal__empty">{t('clients.noFinancialData')}</p>
              ) : (
                <div className="client-detail-modal__grid client-detail-modal__grid--card">
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.fields.name')}</span>
                    <span className="client-detail-modal__value">{clientFinancial.name ?? '—'}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.fields.company_name')}</span>
                    <span className="client-detail-modal__value">{clientFinancial.company_name ?? '—'}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.financialFields.balance_due')}</span>
                    <span className="client-detail-modal__value client-detail-modal__value--currency">
                      {formatCurrency(clientFinancial.balance_due)}
                    </span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.financialFields.last_payment_at')}</span>
                    <span className="client-detail-modal__value">{formatDate(clientFinancial.last_payment_at)}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.financialFields.open_invoices_count')}</span>
                    <span className="client-detail-modal__value">
                      {typeof clientFinancial.open_invoices_count === 'number'
                        ? clientFinancial.open_invoices_count
                        : (clientFinancial.open_invoices_count ?? '—')}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="client-detail-modal__footer">
          <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose}>
            {t('clients.close')}
          </button>
          {detailClient && detailTab === 'info' && (
            <button
              type="button"
              className="client-detail-modal__btn client-detail-modal__btn--primary"
              onClick={() => {
                onEdit(detailClient)
                onClose()
              }}
            >
              {t('clients.edit')}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
