import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { createPricingFreightUnitType, listPricingFreightUnitTypes } from '../../../api/pricingFreightUnitTypes'

/**
 * Inland truck / transport unit types only (dataset=inland_truck). Create adds to that dataset only.
 */
export default function InlandTruckTypeAsyncSelect({
  id,
  value,
  onChange,
  types = [],
  onTypesUpdated,
  placeholder,
  disabled = false,
  className = '',
}) {
  const { t } = useTranslation()

  const loadOptions = useCallback(async (q) => {
    const token = getStoredToken()
    if (!token) return []
    try {
      const res = await listPricingFreightUnitTypes(token, { dataset: 'inland_truck', q })
      const data = res?.data ?? res
      const arr = Array.isArray(data) ? data : []
      return arr.map((row) => ({
        value: row.slug,
        label: row.label || row.slug,
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
      const res = await createPricingFreightUnitType(token, {
        dataset: 'inland_truck',
        label: name,
      })
      const row = res?.data ?? res
      await onTypesUpdated?.()
      return {
        value: row.slug,
        label: row.label || row.slug,
      }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const selected = useMemo(() => {
    if (!value) return null
    const row = types.find((x) => x.slug === value)
    return {
      value,
      label: row?.label || value,
    }
  }, [value, types])

  return (
    <div id={id || undefined} className={className ? `w-full ${className}` : 'w-full'}>
      <AsyncSelect
        loadOptions={loadOptions}
        onCreate={handleCreate}
        value={selected}
        onChange={(opt) => onChange(opt?.value ?? '')}
        placeholder={placeholder || t('common.select', 'Select')}
        disabled={disabled || !getStoredToken()}
      />
    </div>
  )
}
