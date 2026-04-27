import { Search, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import '../../pages/Clients/Clients.css'
import './ClientsFilterToolbar.css'

/**
 * Single-row filter toolbar matching Clients list filters (card, search icon, fields, actions).
 * Layout: left cluster (search + filter fields) | right cluster (clear + caller-provided actions).
 * Responsive and RTL/LTR via `dir` on the search wrap (icon padding follows locale).
 *
 * @param {string} [className] - Extra classes on the root card
 * @param {string} [language] - i18n language (Arabic → RTL search field)
 * @param {{ value: string, onChange: (v: string) => void, placeholder?: string, ariaLabel?: string }} search
 * @param {import('react').ReactNode} [filters] - Controls inside `.clients-filters__fields` (POL, POD, selects, etc.)
 * @param {() => void} [onClear] - If set, shows Clients-style clear (rotate) before `endActions`
 * @param {import('react').ReactNode} [endActions] - Export icons, primary buttons (wrapped in `.clients-filters__actions` when using default slot layout is not needed — pass full nodes)
 */
export default function ClientsFilterToolbar({
  className = '',
  language,
  search,
  filters = null,
  onClear,
  endActions = null,
}) {
  const { t, i18n } = useTranslation()
  const lang = language ?? i18n.language
  const isRtl = String(lang || '').toLowerCase().startsWith('ar')

  const clearLabel = t('common.clear', 'Clear')

  return (
    <div className={`clients-filters-card clients-filters-toolbar ${className}`.trim()}>
      <div className="clients-filters__row clients-filters__row--main clients-filters-toolbar__row">
        <div className="clients-filters-toolbar__cluster">
          <div className="clients-filters__search-wrap" dir={isRtl ? 'rtl' : 'ltr'}>
            <Search className="clients-filters__search-icon" aria-hidden />
            <input
              type="search"
              className="clients-input clients-filters__search"
              value={search?.value ?? ''}
              onChange={(e) => search?.onChange?.(e.target.value)}
              placeholder={search?.placeholder}
              aria-label={search?.ariaLabel || search?.placeholder || t('common.search', 'Search')}
              autoComplete="off"
            />
          </div>
          {filters ? <div className="clients-filters__fields clients-filters-toolbar__fields">{filters}</div> : null}
        </div>

        <div className="clients-filters-toolbar__end">
          {typeof onClear === 'function' ? (
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={onClear}
              aria-label={clearLabel}
              title={clearLabel}
            >
              <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
          ) : null}
          {endActions ? <div className="clients-filters-toolbar__end-inner">{endActions}</div> : null}
        </div>
      </div>
    </div>
  )
}
