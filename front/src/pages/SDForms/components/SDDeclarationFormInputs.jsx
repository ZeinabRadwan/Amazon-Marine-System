/**
 * Reusable controlled inputs for Shipment Declaration Form (Tailwind).
 */

import { useState } from 'react'
import { createPort } from '../../../api/ports'
import { createShippingLine } from '../../../api/shippingLines'

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
      <input id={id} type="date" className={inputClass} {...props} />
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

const btnSecondary =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'

/**
 * Port dropdown: API ports + example names not in list; supports portId / portText; add-new via API.
 * onChange receives { portId: string, portText: string }.
 */
export function PortField({
  id,
  label,
  placeholder,
  examplePorts = [],
  ports,
  portId,
  portText,
  onChange,
  error,
  token,
  onRefreshPorts,
  addPortLabel,
  newPortPlaceholder,
  portAddedMessage,
}) {
  const portNames = new Set(ports.map((p) => String(p.name || '').trim().toLowerCase()).filter(Boolean))
  const extras = examplePorts.filter((name) => name && !portNames.has(String(name).trim().toLowerCase()))
  const selectValue = portId !== '' && portId != null ? `id:${portId}` : portText ? `text:${portText}` : ''

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addOk, setAddOk] = useState(false)

  async function handleAddPort() {
    const name = String(newName).trim()
    if (!name || !token) return
    setAdding(true)
    setAddError(null)
    setAddOk(false)
    try {
      const res = await createPort(token, { name, active: true })
      const created = res?.data
      await onRefreshPorts?.()
      if (created?.id) {
        onChange({ portId: String(created.id), portText: '' })
      }
      setNewName('')
      setAddOk(true)
      setTimeout(() => setAddOk(false), 3000)
    } catch (e) {
      setAddError(e?.message || 'Failed to add port')
    } finally {
      setAdding(false)
    }
  }

  return (
    <FormField label={label} htmlFor={id} error={error}>
      <select
        id={id}
        className={`${inputClass} mt-1`}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value
          if (!v) {
            onChange({ portId: '', portText: '' })
            return
          }
          if (v.startsWith('id:')) {
            onChange({ portId: v.slice(3), portText: '' })
            return
          }
          if (v.startsWith('text:')) {
            onChange({ portId: '', portText: v.slice(5) })
          }
        }}
      >
        <option value="">{placeholder}</option>
        {ports.map((p) => (
          <option key={p.id} value={`id:${p.id}`}>
            {p.name}
            {p.code ? ` (${p.code})` : ''}
          </option>
        ))}
        {extras.map((name) => (
          <option key={`ex-${name}`} value={`text:${name}`}>
            {name}
          </option>
        ))}
      </select>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          className={inputClass}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={newPortPlaceholder}
          aria-label={newPortPlaceholder}
        />
        <button
          type="button"
          className={btnSecondary}
          disabled={adding || !String(newName).trim() || !token}
          onClick={handleAddPort}
        >
          {adding ? '…' : addPortLabel}
        </button>
      </div>
      {addError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addError}</p> : null}
      {addOk && portAddedMessage ? (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">{portAddedMessage}</p>
      ) : null}
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
  exampleLines = [],
  lines,
  value,
  onChange,
  error,
  token,
  onRefreshLines,
  addLineLabel,
  newLinePlaceholder,
  lineAddedMessage,
}) {
  const lineNames = new Set(lines.map((l) => String(l.name || '').trim().toLowerCase()).filter(Boolean))
  const extras = exampleLines.filter((name) => name && !lineNames.has(String(name).trim().toLowerCase()))

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addOk, setAddOk] = useState(false)

  async function handleAddLine() {
    const name = String(newName).trim()
    if (!name || !token) return
    setAdding(true)
    setAddError(null)
    setAddOk(false)
    try {
      await createShippingLine(token, { name, active: true })
      await onRefreshLines?.()
      onChange(name)
      setNewName('')
      setAddOk(true)
      setTimeout(() => setAddOk(false), 3000)
    } catch (e) {
      setAddError(e?.message || 'Failed to add shipping line')
    } finally {
      setAdding(false)
    }
  }

  return (
    <FormField label={label} htmlFor={id} error={error} required>
      <select
        id={id}
        className={`${inputClass} mt-1`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {lines.map((l) => {
          const n = String(l.name || '').trim()
          if (!n) return null
          return (
            <option key={l.id} value={n}>
              {n}
            </option>
          )
        })}
        {extras.map((name) => (
          <option key={`ex-sl-${name}`} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          className={inputClass}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={newLinePlaceholder}
          aria-label={newLinePlaceholder}
        />
        <button
          type="button"
          className={btnSecondary}
          disabled={adding || !String(newName).trim() || !token}
          onClick={handleAddLine}
        >
          {adding ? '…' : addLineLabel}
        </button>
      </div>
      {addError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addError}</p> : null}
      {addOk && lineAddedMessage ? (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">{lineAddedMessage}</p>
      ) : null}
    </FormField>
  )
}
