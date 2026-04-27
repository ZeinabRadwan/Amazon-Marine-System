import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { listPorts, createPort } from '../../../api/ports'

/**
 * POL/POD/inland port by name (matches pricing offer string fields).
 * Search + create port; new values persist via API and appear on next search.
 */
export default function PortNameAsyncSelect({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const { t } = useTranslation()

  const loadOptions = useCallback(async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listPorts(token, { q, active: true })
      const data = res?.data ?? res
      const arr = Array.isArray(data) ? data : []
      return arr.map((p) => ({
        value: p.name,
        label: p.name || p.code || `#${p.id}`,
      }))
    } catch (e) {
      console.error(e)
      return []
    }
  }, [])

  const handleCreate = async (name) => {
    const token = getStoredToken()
    if (!token) return null
    try {
      const res = await createPort(token, { name, active: true })
      const newPort = res?.data ?? res
      const label = newPort?.name ?? name
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
