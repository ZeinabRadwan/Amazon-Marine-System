import { useTranslation } from 'react-i18next'
import { SEA_PRICING_CURRENCIES } from './SeaCustomChargeEntry'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'

const CURRENCIES = SEA_PRICING_CURRENCIES

export default function SeaOwsChargesSection({ owsForm, setOwsForm }) {
  const { t } = useTranslation()

  const patch = (partial) => setOwsForm((prev) => ({ ...prev, ...partial }))

  const patchFixed = (partial) =>
    setOwsForm((prev) => ({
      ...prev,
      fixed: { ...prev.fixed, unit: 'KG', ...partial },
    }))

  const patchRange = (id, partial) =>
    setOwsForm((prev) => ({
      ...prev,
      ranges: prev.ranges.map((r) =>
        r.id === id ? { ...r, unit: 'KG', ...partial } : { ...r, unit: 'KG' }
      ),
    }))

  const addRange = () =>
    setOwsForm((prev) => ({
      ...prev,
      ranges: [
        ...prev.ranges,
        {
          id: `ows-r${Date.now()}`,
          from: '',
          to: '',
          unit: 'KG',
          price: '',
          currency: 'USD',
        },
      ],
    }))

  const removeRange = (id) =>
    setOwsForm((prev) => ({
      ...prev,
      ranges: prev.ranges.length > 1 ? prev.ranges.filter((r) => r.id !== id) : prev.ranges,
    }))

  return (
    <div className="sea-rate-ows-section">
      <label className="sea-rate-ows-section__toggle">
        <input
          type="checkbox"
          checked={Boolean(owsForm.enabled)}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        <span lang="en">OWS</span>
      </label>

      {owsForm.enabled ? (
        <div className="sea-rate-ows-section__body">
          <div className="sea-rate-ows-section__mode" role="radiogroup" aria-label={t('pricing.owsWeightModeAria')}>
            <label>
              <input
                type="radio"
                name="ows-mode"
                checked={owsForm.mode === 'fixed'}
                onChange={() => patch({ mode: 'fixed' })}
              />
              <span>{t('pricing.owsFixedWeight')}</span>
            </label>
            <label>
              <input
                type="radio"
                name="ows-mode"
                checked={owsForm.mode === 'range'}
                onChange={() => patch({ mode: 'range' })}
              />
              <span>{t('pricing.owsWeightRange')}</span>
            </label>
          </div>

          {owsForm.mode === 'fixed' ? (
            <div className="sea-rate-ows-section__grid sea-rate-ows-section__grid--fixed">
              <div>
                <label className="sea-rate-label">{t('pricing.owsWeightKg')}</label>
                <input
                  type="number"
                  min={0}
                  className="sea-rate-input"
                  value={displayNumericInputValue(owsForm.fixed.weight)}
                  onChange={(e) => patchFixed({ weight: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="sea-rate-label">{t('pricing.amount')}</label>
                <div className="sea-rate-input-group">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="sea-rate-input"
                    value={displayNumericInputValue(owsForm.fixed.price)}
                    onChange={(e) => patchFixed({ price: e.target.value })}
                    placeholder="0"
                  />
                  <select
                    className="sea-rate-select"
                    value={owsForm.fixed.currency}
                    onChange={(e) => patchFixed({ currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="sea-rate-ows-section__ranges">
              {owsForm.ranges.map((row) => (
                <div key={row.id} className="sea-rate-ows-range-row">
                  <div className="sea-rate-ows-range-row__field">
                    <label className="sea-rate-label">{t('pricing.owsFromWeightKg')}</label>
                    <input
                      type="number"
                      min={0}
                      className="sea-rate-input"
                      value={displayNumericInputValue(row.from)}
                      onChange={(e) => patchRange(row.id, { from: e.target.value })}
                    />
                  </div>
                  <div className="sea-rate-ows-range-row__field">
                    <label className="sea-rate-label">{t('pricing.owsToWeightKg')}</label>
                    <input
                      type="number"
                      min={0}
                      className="sea-rate-input"
                      value={displayNumericInputValue(row.to)}
                      onChange={(e) => patchRange(row.id, { to: e.target.value })}
                    />
                  </div>
                  <div className="sea-rate-ows-range-row__field">
                    <label className="sea-rate-label">{t('pricing.amount')}</label>
                    <div className="sea-rate-input-group">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="sea-rate-input"
                        value={displayNumericInputValue(row.price)}
                        onChange={(e) => patchRange(row.id, { price: e.target.value })}
                      />
                      <select
                        className="sea-rate-select"
                        value={row.currency}
                        onChange={(e) => patchRange(row.id, { currency: e.target.value })}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="sea-rate-ows-range-row__actions">
                    <label className="sea-rate-label sea-rate-label--invisible" aria-hidden>
                      &nbsp;
                    </label>
                    <button
                      type="button"
                      className="sea-rate-btn sea-rate-btn--ghost sea-rate-ows-range-row__remove"
                      onClick={() => removeRange(row.id)}
                      disabled={owsForm.ranges.length <= 1}
                      aria-label={t('common.remove', 'Remove')}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="sea-rate-btn sea-rate-btn--add-date" onClick={addRange}>
                {t('pricing.owsAddRange')}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
