import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { localizedStatusLabel } from '../../utils/localizedStatusLabel'
import { buildClientFormSections } from './clientFormShared'

export default function ClientFormFields({
  form,
  setForm,
  disabled = false,
  formGroupId = 'client',
  lookups = {},
  formOptions = {},
}) {
  const { t, i18n } = useTranslation()
  const clientStatuses = lookups.clientStatuses ?? []
  const sections = useMemo(() => buildClientFormSections(lookups, formOptions), [lookups, formOptions])

  return (
    <div className="clients-form-sections">
      {sections.map((section) => (
        <section key={section.titleKey} className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">{t(section.titleKey)}</h3>
          <div className="client-detail-modal__form-grid">
            {section.fields.map((field) => {
              const key = field.key
              const labelKey = `clients.fields.${key}`
              const value = form[key] ?? ''
              const update = (v) => setForm((f) => ({ ...f, [key]: v }))
              if (field.type === 'client_type') {
                return (
                  <div key={key} className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <span id={`${formGroupId}-client-type-legend`} className="client-detail-modal__form-field-legend">
                      {t(labelKey)}
                    </span>
                    <div
                      className="client-detail-modal__radio-row"
                      role="radiogroup"
                      aria-labelledby={`${formGroupId}-client-type-legend`}
                    >
                      {[
                        { v: 'lead', label: t('clients.clientType.lead') },
                        { v: 'client', label: t('clients.clientType.client') },
                      ].map(({ v, label }) => (
                        <label key={v} className="client-detail-modal__radio-label">
                          <input
                            type="radio"
                            name={`client_type_${formGroupId}`}
                            value={v}
                            checked={form.client_type === v}
                            onChange={() => setForm((f) => ({ ...f, client_type: v, status_id: '' }))}
                            disabled={disabled}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              }
              if (field.type === 'select') {
                const options =
                  key === 'status_id'
                    ? clientStatuses.filter((s) => String(s.applies_to) === String(form.client_type))
                    : (field.options ?? [])
                const statusLabelKey =
                  key === 'status_id'
                    ? form.client_type === 'lead'
                      ? 'clients.salesStage'
                      : 'clients.fields.status_id'
                    : labelKey
                return (
                  <div key={key} className="client-detail-modal__form-field">
                    <label htmlFor={`${formGroupId}-${key}`}>{t(statusLabelKey)}</label>
                    <select
                      id={`${formGroupId}-${key}`}
                      value={value}
                      onChange={(e) => update(e.target.value)}
                      disabled={disabled || (key === 'status_id' && !form.client_type)}
                      aria-label={t(statusLabelKey)}
                    >
                      <option value="">—</option>
                      {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name_ar != null || opt.name_en != null
                            ? localizedStatusLabel(opt, i18n.language)
                            : (opt.name ?? '')}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }
              if (field.type === 'textarea') {
                const shippingHintId = `${formGroupId}-shipping_problems-hint-desc`
                const hintText =
                  key === 'shipping_problems' ? t('clients.fields.shipping_problems_hint') : null
                return (
                  <div key={key} className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <div className="client-detail-modal__label-row">
                      <label htmlFor={`${formGroupId}-${key}`}>{t(labelKey)}</label>
                      {key === 'shipping_problems' && (
                        <span className="client-field-hint">
                          <button
                            type="button"
                            className="client-field-hint__btn"
                            aria-label={t('clients.fields.shipping_problems_hint_btn')}
                          >
                            <Info className="client-field-hint__icon" aria-hidden />
                          </button>
                          <span className="client-field-hint__popover" role="tooltip">
                            {hintText}
                          </span>
                        </span>
                      )}
                    </div>
                    {key === 'shipping_problems' && (
                      <span id={shippingHintId} className="client-field-hint__sr-only">
                        {hintText}
                      </span>
                    )}
                    <textarea
                      id={`${formGroupId}-${key}`}
                      value={value}
                      onChange={(e) => update(e.target.value)}
                      disabled={disabled}
                      rows={field.rows ?? 3}
                      aria-label={t(labelKey)}
                      aria-describedby={key === 'shipping_problems' ? shippingHintId : undefined}
                    />
                  </div>
                )
              }
              if (field.type === 'number') {
                return (
                  <div key={key} className="client-detail-modal__form-field">
                    <label htmlFor={`${formGroupId}-${key}`}>{t(labelKey)}</label>
                    <input
                      id={`${formGroupId}-${key}`}
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
                    <label htmlFor={`${formGroupId}-${key}`}>{t(labelKey)}</label>
                    <input
                      id={`${formGroupId}-${key}`}
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
                  <label htmlFor={`${formGroupId}-${key}`}>{t(labelKey)}</label>
                  <input
                    id={`${formGroupId}-${key}`}
                    type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                    value={value}
                    onChange={(e) => update(e.target.value)}
                    onBlur={(e) => {
                      if (field.type !== 'url') return
                      const raw = e.target.value?.trim()
                      if (!raw) return
                      if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) return
                      update(`https://${raw}`)
                    }}
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

  
}
