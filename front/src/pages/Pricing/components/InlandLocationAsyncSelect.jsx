import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { createPricingFreightUnitType, listPricingFreightUnitTypes } from '../../../api/pricingFreightUnitTypes'
import { PRICING_ACTIONS, runPricingAction } from '../utils/pricingFeedback'

const DEFAULT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الشرقية',
  'المنوفية',
  'البحيرة',
  'الإسماعيلية',
  'بورسعيد',
  'السويس',
  'القاهرة الكبرى',
  'الدلتا',
]

function optionFromLabel(label) {
  return { value: label, label }
}

function mergeOptions(apiOptions, fallbackLabels, query) {
  const q = String(query || '').trim().toLowerCase()
  const fallbackOptions = fallbackLabels
    .filter((label) => !q || label.toLowerCase().includes(q))
    .map(optionFromLabel)
  const map = new Map()
  ;[...fallbackOptions, ...apiOptions].forEach((opt) => {
    if (!opt?.label) return
    map.set(String(opt.label).toLowerCase(), opt)
  })
  return Array.from(map.values())
}

export default function InlandLocationAsyncSelect({
  id,
  dataset,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const { t } = useTranslation()
  const fallbackLabels = useMemo(
    () => (dataset === 'inland_governorate' ? DEFAULT_GOVERNORATES : []),
    [dataset]
  )

  const loadOptions = useCallback(
    async (q) => {
      const token = getStoredToken()
      if (!token) return mergeOptions([], fallbackLabels, q)
      try {
        const res = await listPricingFreightUnitTypes(token, { dataset, q })
        const data = res?.data ?? res
        const arr = Array.isArray(data) ? data : []
        const apiOptions = arr.map((row) => ({
          value: row.label || row.slug,
          label: row.label || row.slug,
        }))
        return mergeOptions(apiOptions, fallbackLabels, q)
      } catch (e) {
        console.error(e)
        return mergeOptions([], fallbackLabels, q)
      }
    },
    [dataset, fallbackLabels]
  )

  const handleCreate = async (name) => {
    const token = getStoredToken()
    if (!token) return null
    try {
      const res = await runPricingAction(PRICING_ACTIONS.FREIGHT_UNIT_CREATE, () =>
        createPricingFreightUnitType(token, {
          dataset,
          label: name,
        }),
      )
      const row = res?.data ?? res
      const label = row?.label || name
      return { value: label, label }
    } catch {
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
