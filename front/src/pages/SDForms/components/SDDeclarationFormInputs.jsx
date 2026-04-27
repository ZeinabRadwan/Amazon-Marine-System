/**
 * Reusable controlled inputs for Shipment Declaration Form (Tailwind).
 */

import { listPorts, createPort } from '../../../api/ports'
import { listShippingLines, createShippingLine } from '../../../api/shippingLines'

const inputClass =
  'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300'

export function FormField({ label, htmlFor, description, error, required, children, className = '' }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      {description ? (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}

export function TextInput({ id, label, description, error, required, className = '', ...props }) {
  return (
    <FormField label={label} htmlFor={id} description={description} error={error} required={required} className={className}>
      <input id={id} className={inputClass} {...props} />
    </FormField>
  )
}

export function NumberInput({ id, label, description, error, required, className = '', ...props }) {
  return (
    <FormField label={label} htmlFor={id} description={description} error={error} required={required} className={className}>
      <input id={id} type="number" min={props.min} step={props.step} className={inputClass} {...props} />
    </FormField>
  )
}

export function DateInput({ id, label, description, error, required, className = '', ...props }) {
  return (
    <FormField label={label} htmlFor={id} description={description} error={error} required={required} className={className}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        pattern="\\d{2}/\\d{2}/\\d{4}"
        className={inputClass}
        {...props}
      />
    </FormField>
  )
}

export function TextareaInput({ id, label, description, error, required, rows = 4, className = '', ...props }) {
  return (
    <FormField label={label} htmlFor={id} description={description} error={error} required={required} className={className}>
      <textarea id={id} rows={rows} className={`${inputClass} resize-y min-h-[5rem]`} {...props} />
    </FormField>
  )
}

export function SelectInput({ id, label, description, error, required, children, className = '', ...props }) {
  return (
    <FormField label={label} htmlFor={id} description={description} error={error} required={required} className={className}>
      <select id={id} className={`${inputClass} cursor-pointer`} {...props}>
        {children}
      </select>
    </FormField>
  )
}



import AsyncSelect from '../../../components/AsyncSelect'

/**
 * Port dropdown: API ports + example names not in list; supports portId / portText; add-new via API.
 * onChange receives { portId: string, portText: string }.
 */
export function PortField({
  id,
  label,
  placeholder,
  ports,
  portId,
  portText,
  onChange,
  error,
  token,
  onRefreshPorts,
}) {
  const loadPortOptions = async (q) => {
    if (!token) return []
    try {
      const res = await listPorts(token, { q, active: true })
      const data = res.data ?? res
      const arr = Array.isArray(data) ? data : []
      return arr.map((p) => ({
        value: `id:${p.id}`,
        label: p.name || p.code || `#${p.id}`,
      }))
    } catch (error) {
      console.error('loadPortOptions error:', error)
      return []
    }
  }

  const handleCreatePort = async (name) => {
    if (!token) return null
    try {
      const res = await createPort(token, { name, active: true })
      const newPort = res.data ?? res
      await onRefreshPorts?.()
      return {
        value: `id:${newPort.id}`,
        label: newPort.name,
      }
    } catch (err) {
      console.error('handleCreatePort error:', err)
      return null
    }
  }

  const selectedValue = portId ? { value: `id:${portId}`, label: ports.find(p => String(p.id) === String(portId))?.name || `#${portId}` } : (portText ? { value: `text:${portText}`, label: portText } : null)

  return (
    <FormField label={label} htmlFor={id} error={error}>
      <AsyncSelect
        loadOptions={loadPortOptions}
        onCreate={handleCreatePort}
        value={selectedValue}
        onChange={(val) => {
          if (!val) {
            onChange({ portId: '', portText: '' })
          } else if (String(val.value).startsWith('id:')) {
            onChange({ portId: String(val.value).slice(3), portText: '' })
          } else {
            onChange({ portId: '', portText: val.label })
          }
        }}
        placeholder={placeholder}
      />
    </FormField>
  )
}

/**
 * Shipping line name (string). Dropdown from API + example names; add-new via API.
 */
export function ShippingLineField({
  id,
  label,
  placeholder,
  lines,
  value,
  onChange,
  error,
  token,
  onRefreshLines,
}) {
  const loadLineOptions = async (q) => {
    if (!token) return []
    try {
      const res = await listShippingLines(token, { q, active: true })
      const data = res.data ?? res
      const arr = Array.isArray(data) ? data : []
      return arr.map((l) => ({
        value: l.name,
        label: l.name,
      }))
    } catch (error) {
      console.error('loadLineOptions error:', error)
      return []
    }
  }

  const handleCreateLine = async (name) => {
    if (!token) return null
    try {
      const res = await createShippingLine(token, { name, active: true })
      const newLine = res.data ?? res
      await onRefreshLines?.()
      return {
        value: newLine.name,
        label: newLine.name,
      }
    } catch (err) {
      console.error('handleCreateLine error:', err)
      return null
    }
  }

  const selectedValue = value ? { value, label: value } : null

  return (
    <FormField label={label} htmlFor={id} error={error} required>
      <AsyncSelect
        loadOptions={loadLineOptions}
        onCreate={handleCreateLine}
        value={selectedValue}
        onChange={(val) => onChange(val?.value || '')}
        placeholder={placeholder}
      />
    </FormField>
  )
}

