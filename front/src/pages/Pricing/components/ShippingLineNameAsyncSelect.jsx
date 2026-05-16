import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AsyncSelect from '../../../components/AsyncSelect'
import { getStoredToken } from '../../Login'
import { listShippingLines, createShippingLine } from '../../../api/shippingLines'
import { listVendors, createVendor } from '../../../api/vendors'
import { PRICING_ACTIONS, runPricingAction } from '../utils/pricingFeedback'

/**
 * Carrier / shipping line selector.
 * Ocean scope loads vendors of type shipping_line (CRM vendors).
 * Inland scope falls back to shipping-lines API records.
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
  preloadOnMount = false,
}) {
  const { t } = useTranslation()
  const [defaultOptions, setDefaultOptions] = useState([])
  const useVendorSource = serviceScope === 'ocean'

  const loadOptions = useCallback(
    async (q) => {
      const token = getStoredToken()
      if (!token) return []
      try {
        if (useVendorSource) {
          const res = await listVendors(token, {
            type: 'shipping_line',
            search: q || undefined,
          })
          const data = res?.data ?? res
          const arr = Array.isArray(data) ? data : []
          return arr
            .map((v) => {
              const name = String(v?.name ?? '').trim()
              if (!name) return null
              return { value: name, label: name }
            })
            .filter(Boolean)
        }

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
    [serviceScope, useVendorSource]
  )

  useEffect(() => {
    if (!preloadOnMount) return
    let cancelled = false
    loadOptions('').then((opts) => {
      if (!cancelled) setDefaultOptions(Array.isArray(opts) ? opts : [])
    })
    return () => {
      cancelled = true
    }
  }, [preloadOnMount, loadOptions])

  const handleCreate = async (name) => {
    const token = getStoredToken()
    if (!token) return null

    if (useVendorSource) {
      try {
        const res = await runPricingAction(PRICING_ACTIONS.SHIPPING_LINE_CREATE, () =>
          createVendor(token, {
            name,
            type: 'shipping',
          })
        )
        const vendor = res?.data ?? res
        const label = vendor?.name ?? name
        return { value: label, label }
      } catch {
        return null
      }
    }

    const scope =
      serviceScope === 'ocean' ? 'ocean' : serviceScope === 'inland' ? 'inland' : 'both'
    try {
      const res = await runPricingAction(PRICING_ACTIONS.SHIPPING_LINE_CREATE, () =>
        createShippingLine(token, {
          name,
          active: true,
          service_scope: scope,
        })
      )
      const line = res?.data ?? res
      const label = line?.name ?? name
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
        defaultOptions={defaultOptions}
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
