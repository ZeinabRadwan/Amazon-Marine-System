import { Trans, useTranslation } from 'react-i18next'

/** Plain-text note stored on the quotation when the sales user enables it. */
export function buildOfficialReceiptsNote(t) {
  const enBlock = [
    t('pricing.customsOfficialReceiptsTitle', '⚡ Important — Official Government Receipts'),
    t(
      'pricing.customsOfficialReceiptsBodyEnPlain',
      'The prices stated above for Inland Transport and/or Customs Clearance do not include official government receipts. This applies whether the service includes inland transport only, customs clearance only, or both. Receipt amounts are determined upon issuance from port authorities and relevant government bodies, and original receipts will be provided to the client upon collection.'
    ),
  ].join('\n\n')

  const arBlock = [
    t('pricing.customsOfficialReceiptsTitleAr', '⚡ هام — الإيصالات الرسمية الحكومية'),
    t(
      'pricing.customsOfficialReceiptsBodyArPlain',
      'أسعار النقل الداخلي و/أو التخليص الجمركي المذكورة أعلاه غير شاملة الإيصالات الرسمية — سواء كانت الخدمة نقلاً داخلياً فقط، أو تخليصاً جمركياً فقط، أو كليهما معاً. يتم تحديد قيمة الإيصالات بعد وصولها من هيئة الموانئ والجهات الحكومية، ويتم تقديم أصول الإيصالات للعميل.'
    ),
  ].join('\n\n')

  return [enBlock, arBlock].filter(Boolean).join('\n\n')
}

/** @deprecated Use buildOfficialReceiptsNote */
export const buildCustomsOfficialReceiptsNote = buildOfficialReceiptsNote

export function OfficialReceiptsNotePreview() {
  const { t } = useTranslation()

  return (
    <div
      className="pricing-quote-customs-info-note"
      role="note"
      aria-label={t('pricing.customsOfficialReceiptsTitle', '⚡ Important — Official Government Receipts')}
    >
      <div className="pricing-quote-customs-info-note__columns">
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
 * Enable / remove controls — shown before pricing team confirmation (not inside customs table).
 */
export function QuoteOfficialReceiptsNoteControls({
  active,
  onEnable,
  onRemove,
  readOnly = false,
}) {
  const { t } = useTranslation()

  if (readOnly && !active) return null

  return (
    <section
      className="pricing-quote-official-receipts-section"
      aria-label={t('pricing.officialReceiptsNoteSectionTitle', 'Official government receipts note')}
    >
      {!active ? (
        readOnly ? null : (
          <div className="pricing-quote-official-receipts-empty space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
              {t(
                'pricing.officialReceiptsNoteNoneAdded',
                'The official government receipts disclaimer is not included in this quotation.'
              )}
            </p>
            <button type="button" className="pricing-quote-customs-enable-btn" onClick={onEnable}>
              {t('pricing.officialReceiptsNoteEnableBtn', 'Include official receipts note in quotation')}
            </button>
          </div>
        )
      ) : (
        <div className="pricing-quote-official-receipts-active space-y-3">
          <p className="pricing-quote-official-receipts-hint text-sm text-gray-500 dark:text-gray-400 m-0">
            {t(
              'pricing.customsOfficialReceiptsFootnote',
              'This note will be included on the quotation sent to the client'
            )}
          </p>
          {!readOnly ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline"
                onClick={onRemove}
              >
                {t('pricing.officialReceiptsNoteRemoveBtn', 'Remove note from quotation')}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

export default QuoteOfficialReceiptsNoteControls
