import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getStoredToken } from '../Login'
import { createClient } from '../../api/clients'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import ClientFormFields from './ClientFormFields'
import { defaultClientForm, buildClientPayload } from './clientFormShared'
import { useClientFormLookups } from './useClientFormLookups'
import {
  clearClientCreateDraft,
  isClientCreateDraftMeaningful,
  readClientCreateDraft,
  writeClientCreateDraft,
} from './clientCreateDraftStorage'
import './ClientDetailModal.css'

export function clientOptionFromRecord(c) {
  if (!c?.id) return null
  return {
    value: c.id,
    label: [c.company_name, c.name].filter(Boolean).join(' — ') || `ID ${c.id}`,
  }
}

export function QuickAddClientModal({ open, onClose, onCreated }) {
  const { t } = useTranslation()
  const { user } = useAuthAccess()
  const [form, setForm] = useState(defaultClientForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [draftRestored, setDraftRestored] = useState(false)

  const lookups = useClientFormLookups(open)
  const lookupsReady = !lookups.loading

  useEffect(() => {
    if (!open) return
    const saved = readClientCreateDraft()
    if (saved?.form && isClientCreateDraftMeaningful(saved)) {
      setForm({ ...defaultClientForm(), ...saved.form })
      setDraftRestored(true)
    } else {
      setForm(defaultClientForm())
      setDraftRestored(false)
    }
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      writeClientCreateDraft(form)
    }, 400)
    return () => clearTimeout(timer)
  }, [open, form])

  const handleClose = useCallback(() => {
    if (submitting) return
    writeClientCreateDraft(form)
    setError(null)
    onClose?.()
  }, [submitting, form, onClose])

  const handleDiscardDraft = () => {
    clearClientCreateDraft()
    setForm(defaultClientForm())
    setDraftRestored(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const name = form.name?.trim()
    const company = form.company_name?.trim()
    if (!name || !company) {
      setError(t('pricing.quickAddClientRequired', 'Name and company name are required.'))
      return
    }
    const token = getStoredToken()
    if (!token) {
      setError(t('clients.errorCreate', 'Could not create client.'))
      return
    }
    setSubmitting(true)
    try {
      const payload = buildClientPayload(
        form,
        { includeAssignedSales: true, assignedSalesId: user?.id ?? null },
        t
      )
      setForm((prev) => ({
        ...prev,
        website_url: payload.website_url ?? '',
        facebook_url: payload.facebook_url ?? '',
        linkedin_url: payload.linkedin_url ?? '',
      }))
      const res = await createClient(token, payload)
      const created = res?.data ?? res?.client ?? res
      const option = clientOptionFromRecord(created)
      if (!option) throw new Error(t('clients.errorCreate', 'Could not create client.'))
      clearClientCreateDraft()
      setForm(defaultClientForm())
      onCreated?.(option)
      onClose?.()
    } catch (err) {
      setError(err?.message || t('clients.errorCreate', 'Could not create client.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="client-detail-modal client-detail-modal--stacked client-detail-modal--quote-create-client"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-client-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="client-detail-modal__backdrop" onClick={handleClose} aria-hidden="true" />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="quick-add-client-title" className="client-detail-modal__title">
            {t('clients.createClient', 'Create client')}
          </h2>
          <button
            type="button"
            className="client-detail-modal__close"
            onClick={handleClose}
            disabled={submitting}
            aria-label={t('clients.close', 'Close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="client-detail-modal__form">
          <div className="client-detail-modal__body client-detail-modal__body--form">
            <div className="client-detail-modal__body-inner">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 mb-4">
                  {error}
                </div>
              ) : null}
              {draftRestored ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200/80 bg-blue-50/90 px-3 py-2 text-sm text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-100">
                  <span>{t('pricing.draftRestored', 'Draft restored')}</span>
                  <button type="button" className="text-xs font-bold underline" onClick={handleDiscardDraft}>
                    {t('common.discard', 'Discard')}
                  </button>
                </div>
              ) : null}
              {!lookupsReady ? (
                <p className="text-sm text-gray-500 m-0">{t('common.loading', 'Loading…')}</p>
              ) : (
                <ClientFormFields
                  form={form}
                  setForm={setForm}
                  disabled={submitting}
                  formGroupId="quote-create-client"
                  lookups={lookups}
                  formOptions={{ hideClientType: true }}
                />
              )}
            </div>
          </div>
          <footer className="client-detail-modal__footer client-detail-modal__footer--form">
            <button
              type="button"
              className="client-detail-modal__btn client-detail-modal__btn--secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              {t('clients.cancel')}
            </button>
            <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={submitting || !lookupsReady}>
              {submitting ? t('clients.saving') : t('clients.save')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}