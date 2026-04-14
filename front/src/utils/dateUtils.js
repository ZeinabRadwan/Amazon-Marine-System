/**
 * Formats a date string to dd/mm/yyyy.
 * Handles ISO strings and Date objects.
 * 
 * @param {string|Date|null} value 
 * @param {object} options
 * @returns {string}
 */
export function formatDate(value, options = {}) {
  const { includeTime = false, divider = ' - ' } = options
  if (value == null || value === '') return '—'
  
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'

  const pad = (num) => String(num).padStart(2, '0')
  
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  
  let result = `${day}/${month}/${year}`
  
  if (includeTime) {
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    result += `${divider}${hours}:${minutes}`
  }
  
  return result
}

/**
 * Shorthand for formatting with time.
 */
export function formatDateTime(value) {
  return formatDate(value, { includeTime: true })
}
