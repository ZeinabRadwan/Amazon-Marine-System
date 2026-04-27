import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { createPricingFreightUnitType, listPricingFreightUnitTypes } from '../../../api/pricingFreightUnitTypes'

/**
 * Ocean container presets (dataset=ocean_container). One field: search existing or type a new full label and create.
 * Backend infers meta (type/size/height) from the label.
 */
export default function OceanContainerTypeAsyncSelect({
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
      const res = await listPricingFreightUnitTypes(token, { dataset: 'ocean_container', q })
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
        dataset: 'ocean_container',
        label: name,
      })
      const row = res?.data ?? res
      if (!row?.slug) {
        console.warn('createPricingFreightUnitType: invalid response', res)
        return null
      }
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
        placeholder={
          placeholder ||
          t('pricing.selectOrCreateContainerType', 'Select or type full container type (e.g. 40′ HC Dry)')
        }
        disabled={disabled || !getStoredToken()}
      />
    </div>
  )
}
