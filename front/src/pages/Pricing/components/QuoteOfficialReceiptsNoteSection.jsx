import { Trans, useTranslation } from 'react-i18next'

/** Plain-text note stored on the quotation when the sales user enables it. */
export function buildOfficialReceiptsNote(t) {
  return [
    t('pricing.customsOfficialReceiptsTitle', '⚡ Important — Official Government Receipts'),
    t(
      'pricing.customsOfficialReceiptsBodyEnPlain',
      'The prices stated above for Inland Transport and/or Customs Clearance do not include official government receipts. This applies whether the service includes inland transport only, customs clearance only, or both. Receipt amounts are determined upon issuance from port authorities and relevant government bodies, and original receipts will be provided to the client upon collection.'
    ),
    t('pricing.customsOfficialReceiptsTitleAr', '⚡ هام — الإيصالات الرسمية الحكومية'),
    t(
      'pricing.customsOfficialReceiptsBodyArPlain',
      'أسعار النقل الداخلي و/أو التخليص الجمركي المذكورة أعلاه غير شاملة الإيصالات الرسمية — سواء كانت الخدمة نقلاً داخلياً فقط، أو تخليصاً جمركياً فقط، أو كليهما معاً. يتم تحديد قيمة الإيصالات بعد وصولها من هيئة الموانئ والجهات الحكومية، ويتم تقديم أصول الإيصالات للعميل.'
    ),
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** @deprecated Use buildOfficialReceiptsNote */
export const buildCustomsOfficialReceiptsNote = buildOfficialReceiptsNote

function OfficialReceiptsNotePreview() {
  const { t } = useTranslation()

  return (
    <div
      className="pricing-quote-customs-info-note"
      role="note"
      aria-label={`${t('pricing.customsOfficialReceiptsTitle', '⚡ Important — Official Government Receipts')} / ${t('pricing.customsOfficialReceiptsTitleAr', '⚡ هام — الإيصالات الرسمية الحكومية')}`}
    >
      <div className="pricing-quote-customs-info-note__bilingual">
        <div className="pricing-quote-customs-info-note__col pricing-quote-customs-info-note__col--en">
          <div className="pricing-quote-customs-info-note__title">
            {t('pricing.customsOfficialReceiptsTitle', '⚡ Important — Official Government Receipts')}
          </div>
          <div className="pricing-quote-customs-info-note__body">
            <Trans
              i18nKey="pricing.customsOfficialReceiptsBodyEn"
              components={{ strong: <strong /> }}
              defaults="The prices stated above for <strong>Inland Transport</strong> and/or <strong>Customs Clearance</strong> <strong>do not include official government receipts</strong>. This applies whether the service includes inland transport only, customs clearance only, or both. Receipt amounts are determined upon issuance from port authorities and relevant government bodies, and original receipts will be provided to the client upon collection."
            />
          </div>
        </div>
        <div className="pricing-quote-customs-info-note__col pricing-quote-customs-info-note__col--ar">
          <div className="pricing-quote-customs-info-note__title">
            {t('pricing.customsOfficialReceiptsTitleAr', '⚡ هام — الإيصالات الرسمية الحكومية')}
          </div>
          <div className="pricing-quote-customs-info-note__body">
            <Trans
              i18nKey="pricing.customsOfficialReceiptsBodyAr"
              components={{ strong: <strong /> }}
              defaults="أسعار <strong>النقل الداخلي</strong> و/أو <strong>التخليص الجمركي</strong> المذكورة أعلاه <strong>غير شاملة الإيصالات الرسمية</strong> — سواء كانت الخدمة نقلاً داخلياً فقط، أو تخليصاً جمركياً فقط، أو كليهما معاً. يتم تحديد قيمة الإيصالات بعد وصولها من هيئة الموانئ والجهات الحكومية، ويتم تقديم أصول الإيصالات للعميل."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Official receipts disclaimer controls — shown inside customs clearance when section total is not zero.
 */
export default function QuoteOfficialReceiptsNoteSection({
  active,
  onEnable,
  onRemove,
  readOnly = false,
}) {
  const { t } = useTranslation()

  if (!active && readOnly) return null

  return (
    <div className="pricing-quote-official-receipts-controls">
      {!active ? (
        <button type="button" className="pricing-quote-customs-enable-btn" onClick={onEnable}>
          {t('pricing.officialReceiptsNoteEnableBtn', 'Include official receipts note in quotation')}
        </button>
      ) : readOnly ? (
        <OfficialReceiptsNotePreview />
      ) : (
        <div className="pricing-quote-official-receipts-active space-y-2">
          <p className="pricing-quote-official-receipts-will-add text-sm font-semibold text-green-800 dark:text-green-300 m-0">
            {t('pricing.officialReceiptsNoteWillAdd', 'Will be added to the quotation')}
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline"
              onClick={onRemove}
            >
              {t('pricing.officialReceiptsNoteRemoveBtn', 'Remove note from quotation')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
