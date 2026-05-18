const fs = require('fs')
const p = 'c:/xampp/htdocs/Amazon-Marine-System/front/src/pages/Pricing/components/OfferFormModal.jsx'
let c = fs.readFileSync(p, 'utf8')
const start = '              <PricingFinSection title="قسم 4: بنود التسعير / Pricing conditions">'
const endMarker = '              {isImportSea ? (\n                <div className="sea-rate-ows-block">'
const i = c.indexOf(start)
const j = c.indexOf(endMarker)
if (i < 0 || j < 0) {
  console.error('markers not found', i, j)
  process.exit(1)
}
const replacement = `${start}
              {isImportSea ? (
                <>
                  <div className="sea-rate-pricing-grid sea-rate-pricing-grid--import-inline">
                    {importCoreDisplayLines.map((row) => renderSeaCoreLineCell(row))}
                  </div>
                  {seaCustomLines.length ? (
                    <motion.div className="sea-rate-grid-4 sea-rate-pricing-grid sea-rate-pricing-grid--custom">
                      {seaCustomLines.map((row) => (
                        <motion.div key={row.id} className="sea-rate-grid-custom-cell">
                          <SeaCustomChargeEntry
                            name={row.name}
                            amount={row.amount}
                            currency={row.currency}
                            currencies={CURRENCIES}
                            nameLabel={t('pricing.customChargeName', 'اسم البند / Charge Name')}
                            amountLabel={t('pricing.amount', 'المبلغ / Amount')}
                            currencyLabel={t('pricing.currencyAria', 'العملة')}
                            namePlaceholder={t('pricing.customChargeNamePlaceholder', 'e.g. ISPS, EBS, BAF...')}
                            onNameChange={(v) => patchSeaCustomLine(row.id, { name: v })}
                            onAmountChange={(v) => patchSeaCustomLine(row.id, { amount: v })}
                            onCurrencyChange={(v) => patchSeaCustomLine(row.id, { currency: v })}
                            onAction={() => removeCustomCharge(row.id)}
                            actionLabel="×"
                            actionAriaLabel={t('common.remove', 'Remove')}
                            actionVariant="remove"
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : null}
                </>
              ) : (
                <motion.div className="sea-rate-grid-4 sea-rate-pricing-grid">
                  {(oceanMeta.type === 'Reefer'
                    ? seaCoreLines.filter((row) => row.name !== 'Power')
                    : seaCoreLines
                  ).map((row) => renderSeaCoreLineCell(row))}
                  {seaCustomLines.map((row) => (
                    <motion.div key={row.id} className="sea-rate-grid-custom-cell">
                      <SeaCustomChargeEntry
                        name={row.name}
                        amount={row.amount}
                        currency={row.currency}
                        currencies={CURRENCIES}
                        nameLabel={t('pricing.customChargeName', 'اسم البند / Charge Name')}
                        amountLabel={t('pricing.amount', 'المبلغ / Amount')}
                        currencyLabel={t('pricing.currencyAria', 'العملة')}
                        namePlaceholder={t('pricing.customChargeNamePlaceholder', 'e.g. ISPS, EBS, BAF...')}
                        onNameChange={(v) => patchSeaCustomLine(row.id, { name: v })}
                        onAmountChange={(v) => patchSeaCustomLine(row.id, { amount: v })}
                        onCurrencyChange={(v) => patchSeaCustomLine(row.id, { currency: v })}
                        onAction={() => removeCustomCharge(row.id)}
                        actionLabel="×"
                        actionAriaLabel={t('common.remove', 'Remove')}
                        actionVariant="remove"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
              {isImportSea ? (
                <motion.div className="sea-rate-ows-block">`
const fixed = replacement.replace(/<\/?motion\.div>/gi, (m) => (m.startsWith('</') ? '</div>' : '<div>'))
c = c.slice(0, i) + fixed + c.slice(j)
fs.writeFileSync(p, c)
console.log('patched')
