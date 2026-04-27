import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Loader2 } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { createPricingFreightUnitType } from '../../../api/pricingFreightUnitTypes'

/**
 * Ocean container presets (dataset=ocean_container). Add opens a modal — specs are required so ocean pricing codes stay consistent.
 */
export default function OceanContainerTypeField({
  id,
  types,
  value,
  onChange,
  onReload,
  disabled = false,
}) {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [label, setLabel] = useState('')
  const [dryReefer, setDryReefer] = useState('Dry')
  const [size, setSize] = useState('40')
  const [height, setHeight] = useState('HQ')

  const handleSaveNew = async () => {
    const token = getStoredToken()
    if (!token || !label.trim()) return
    setSaving(true)
    try {
      const res = await createPricingFreightUnitType(token, {
        dataset: 'ocean_container',
        label: label.trim(),
        meta: {
          type: dryReefer,
          size,
          height,
        },
      })
      const row = res?.data ?? res
      await onReload?.()
      if (row?.slug) onChange(row.slug)
      setModalOpen(false)
      setLabel('')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 items-start">
        <select
          id={id}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !(types?.length)}
          required
        >
          <option value="">{t('common.select', 'Select')}</option>
          {(types || []).map((row) => (
            <option key={row.id ?? row.slug} value={row.slug}>
              {row.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="shrink-0 px-3 py-2 text-sm font-semibold rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 inline" /> {t('common.add', 'Add')}
        </button>
      </div>
      {!types?.length ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('pricing.oceanTypesLoadingOrEmpty', 'Loading container types…')}</p>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h4 className="font-bold text-lg mb-2">{t('pricing.addOceanContainerType', 'Add container type')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('pricing.addOceanContainerHint', 'Ocean types are separate from inland trucks. Specify equipment to generate correct freight lines.')}
            </p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('pricing.displayLabel', 'Label')}</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg mb-3 bg-white dark:bg-gray-800"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('pricing.containerLabelPlaceholder', "e.g. 40' HC Dry")}
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('pricing.cargoType', 'Type')}</label>
                <select
                  className="w-full px-2 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm"
                  value={dryReefer}
                  onChange={(e) => setDryReefer(e.target.value)}
                >
                  <option value="Dry">{t('pricing.dry', 'Dry')}</option>
                  <option value="Reefer">{t('pricing.reefer', 'Reefer')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('pricing.size', 'Size')}</label>
                <select
                  className="w-full px-2 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                >
                  <option value="20">20&apos;</option>
                  <option value="40">40&apos;</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('pricing.height', 'Height')}</label>
                <select
                  className="w-full px-2 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                >
                  <option value="Standard">{t('pricing.standard', 'Std')}</option>
                  <option value="HQ">{t('pricing.containerHeightHq')}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setModalOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-bold rounded-lg bg-blue-600 text-white inline-flex items-center gap-2"
                onClick={handleSaveNew}
                disabled={saving || !label.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
