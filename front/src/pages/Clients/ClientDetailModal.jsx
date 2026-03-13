import { useTranslation } from 'react-i18next'
import Tabs from '../../components/Tabs'
import './ClientDetailModal.css'

const clientFormFields = [
  ['name', 'contact_name', 'company_name', 'company_type'],
  ['business_activity', 'target_markets', 'tax_id'],
  ['email', 'phone', 'preferred_comm_method'],
  ['city', 'country', 'address'],
  ['website_url', 'facebook_url', 'linkedin_url'],
  ['status', 'lead_source', 'interest_level'],
  ['decision_maker_name', 'decision_maker_title'],
  ['default_payment_terms', 'default_currency'],
  ['notes'],
]

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
  onAttachmentUpload,
  onAttachmentDownload,
  onAttachmentDelete,
  financialSummaryList = [],
  pricingList = [],
  numberLocale = 'en-US',
}) {
  const { t, i18n } = useTranslation()

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

  const formatPct = (v) => (typeof v === 'number' ? `${Number(v).toFixed(1)}%` : (v ?? '—'))

  const clientFinancial = financialSummaryList.find((item) => Number(item.id) === Number(detailId))
  const clientPricing = pricingList.find((item) => Number(item.id) === Number(detailId))

  const tabs = [
    { id: 'info', label: t('clients.tabs.info', 'Info') },
    { id: 'visits', label: t('clients.tabs.visits', 'Visits') },
    { id: 'shipments', label: t('clients.tabs.shipments', 'Shipments') },
    { id: 'attachments', label: t('clients.tabs.attachments', 'Attachments') },
    { id: 'financial', label: t('clients.financialSummary', 'Financial summary') },
    { id: 'pricing', label: t('clients.pricingList', 'Pricing list') },
  ]

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-detail-modal-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box">
        <header className="client-detail-modal__header">
          <h2 id="client-detail-modal-title" className="client-detail-modal__title">
            {t('clients.detail')}
          </h2>
          {detailClient?.name && (
            <p className="client-detail-modal__subtitle">{detailClient.company_name || detailClient.name}</p>
          )}
        </header>

        <Tabs
          tabs={tabs}
          activeTab={detailTab}
          onChange={onTabChange}
          className="client-detail-modal__tabs"
        />

        <div className="client-detail-modal__body" role="tabpanel" id={`panel-${detailTab}`} aria-labelledby={`tab-${detailTab}`}>
          {detailTab === 'info' && (
            <section className="client-detail-modal__section">
              {detailClient ? (
                <div className="client-detail-modal__grid">
                  {clientFormFields.flat().map((key) => (
                    <div key={key} className="client-detail-modal__row">
                      <span className="client-detail-modal__label">{t(`clients.fields.${key}`)}</span>
                      <span className="client-detail-modal__value">{detailClient[key] ?? '—'}</span>
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
                    <li key={v.id ?? v.visit_date} className="client-detail-modal__list-item">
                      <span className="client-detail-modal__list-label">{v.visit_date ?? v.date ?? '—'}</span>
                      <span className="client-detail-modal__list-value">{v.notes ?? v.summary ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {detailTab === 'shipments' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('clients.tabs.shipments')}</h3>
              {shipments.length === 0 ? (
                <p className="client-detail-modal__empty">{t('clients.noShipments')}</p>
              ) : (
                <ul className="client-detail-modal__list">
                  {shipments.map((s) => (
                    <li key={s.id} className="client-detail-modal__list-item">
                      <span className="client-detail-modal__list-label">{s.bl_number ?? s.reference ?? s.id}</span>
                      <span className="client-detail-modal__list-value">{s.status ?? s.amount ?? '—'}</span>
                    </li>
                  ))}
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
                    return (
                      <li key={a.id} className="client-detail-modal__list-item client-detail-modal__list-item--with-action">
                        <span className="client-detail-modal__list-value">{displayName}</span>
                        <div className="client-detail-modal__list-actions">
                          {onAttachmentDownload && detailId && (
                            <button
                              type="button"
                              className="client-detail-modal__btn client-detail-modal__btn--secondary"
                              onClick={() => onAttachmentDownload(detailId, a.id, displayName)}
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

          {detailTab === 'pricing' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('clients.pricingList')}</h3>
              {clientPricing == null ? (
                <p className="client-detail-modal__empty">{t('clients.noPricing')}</p>
              ) : (
                <div className="client-detail-modal__grid client-detail-modal__grid--card">
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.fields.name')}</span>
                    <span className="client-detail-modal__value">{clientPricing.name ?? '—'}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.fields.company_name')}</span>
                    <span className="client-detail-modal__value">{clientPricing.company_name ?? '—'}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.pricingFields.pricing_tier')}</span>
                    <span className="client-detail-modal__value">{clientPricing.pricing_tier ?? '—'}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.pricingFields.pricing_discount_pct')}</span>
                    <span className="client-detail-modal__value">{formatPct(clientPricing.pricing_discount_pct)}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('clients.pricingFields.pricing_updated_at')}</span>
                    <span className="client-detail-modal__value">{formatDate(clientPricing.pricing_updated_at)}</span>
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
