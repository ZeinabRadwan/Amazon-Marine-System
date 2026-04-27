import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { listSeaPricingRegions } from '../../../api/pricing'

function mergeRegionOptions(apiNames, sessionNames, qTrim) {
  const q = (qTrim || '').toLowerCase()
  const byKey = new Map()
  for (const name of apiNames) {
    if (!name || typeof name !== 'string') continue
    const n = name.trim()
    if (!n) continue
    if (q && !n.toLowerCase().includes(q)) continue
    byKey.set(n.toLowerCase(), { value: n, label: n })
  }
  for (const name of sessionNames) {
    if (!name || typeof name !== 'string') continue
    const n = name.trim()
    if (!n) continue
    if (q && !n.toLowerCase().includes(q)) continue
    byKey.set(n.toLowerCase(), { value: n, label: n })
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

/**
 * Sea pricing region: search distinct values from existing offers + inline create (no separate table).
 * Matches SD-style AsyncSelect + onCreate; session-created names merge into the list until persisted on an offer.
 */
export default function PricingRegionAsyncSelect({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const { t } = useTranslation()
  const sessionCreatedRef = useRef(new Set())

  const loadOptions = useCallback(async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listSeaPricingRegions(token, { q: q?.trim() || undefined })
      const raw = res?.data ?? res
      const arr = Array.isArray(raw) ? raw : []
      const current = value && String(value).trim() ? [String(value).trim()] : []
      const session = [...sessionCreatedRef.current, ...current]
      return mergeRegionOptions(arr, session, q?.trim() || '')
    } catch (e) {
      console.error(e)
      const current = value && String(value).trim() ? [String(value).trim()] : []
      return mergeRegionOptions([], [...sessionCreatedRef.current, ...current], q?.trim() || '')
    }
  }, [value])

  const handleCreate = async (name) => {
    const trimmed = (name || '').trim()
    if (!trimmed || trimmed.length > 100) return null
    sessionCreatedRef.current.add(trimmed)
    return { value: trimmed, label: trimmed }
  }

  const selected = value ? { value, label: value } : null

  return (
    <div id={id || undefined} className={className ? `w-full ${className}` : 'w-full'}>
      <AsyncSelect
        loadOptions={loadOptions}
        onCreate={handleCreate}
        value={selected}
        onChange={(opt) => onChange(opt?.value ?? '')}
        placeholder={placeholder || t('pricing.selectOrCreateRegion', 'Select or create region')}
        disabled={disabled || !getStoredToken()}
        aria-label={ariaLabel}
      />
    </div>
  )
}
