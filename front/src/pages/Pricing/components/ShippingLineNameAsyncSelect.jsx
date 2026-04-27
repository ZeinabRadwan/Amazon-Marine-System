import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { listShippingLines, createShippingLine } from '../../../api/shippingLines'

/**
 * Carrier / transport provider by name. Filtered by service_scope on the API.
 * When creating inline, scope is set so the line appears in the correct list (ocean vs inland).
 *
 * @param {'ocean'|'inland'} serviceScope
 */
export default function ShippingLineNameAsyncSelect({
  id,
  value,
  onChange,
  serviceScope,
  placeholder,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const { t } = useTranslation()

  const loadOptions = useCallback(
    async (q) => {
      const token = getStoredToken()
      if (!token) return []
      try {
        const res = await listShippingLines(token, {
          q,
          active: true,
          service_scope: serviceScope,
        })
        const data = res?.data ?? res
        const arr = Array.isArray(data) ? data : []
        return arr.map((l) => ({
          value: l.name,
          label: l.name,
        }))
      } catch (e) {
        console.error(e)
        return []
      }
    },
    [serviceScope]
  )

  const handleCreate = async (name) => {
    const token = getStoredToken()
    if (!token) return null
    const scope =
      serviceScope === 'ocean' ? 'ocean' : serviceScope === 'inland' ? 'inland' : 'both'
    try {
      const res = await createShippingLine(token, {
        name,
        active: true,
        service_scope: scope,
      })
      const line = res?.data ?? res
      const label = line?.name ?? name
      return { value: label, label }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const selected = value ? { value, label: value } : null

  return (
    <div id={id || undefined} className={className ? `w-full ${className}` : 'w-full'}>
      <AsyncSelect
        loadOptions={loadOptions}
        onCreate={handleCreate}
        value={selected}
        onChange={(opt) => onChange(opt?.value ?? '')}
        placeholder={placeholder || t('common.select', 'Select')}
        disabled={disabled || !getStoredToken()}
        aria-label={ariaLabel}
      />
    </div>
  )
}
