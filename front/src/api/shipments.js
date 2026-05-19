/**
 * Shipments API – list, CRUD, stats, charts, export, notes (list/create/patch/delete), tracking updates.
 */

import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'
import { mapInvoiceResponse } from '../utils/invoiceResponse'

const getBaseUrl = getApiBaseUrl

function authHeaders(token, json = true) {
  const h = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

function appendShipmentListParams(searchParams, params = {}) {
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.operations_status != null && params.operations_status !== '') {
    searchParams.set('operations_status', String(params.operations_status))
  }
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  if (params.sales_rep_id != null && params.sales_rep_id !== '') {
    searchParams.set('sales_rep_id', String(params.sales_rep_id))
  }
  if (params.line_vendor_id != null && params.line_vendor_id !== '') {
    searchParams.set('line_vendor_id', String(params.line_vendor_id))
  }
  if (params.month != null && params.month !== '') searchParams.set('month', params.month)
  if (params.from != null && params.from !== '') searchParams.set('from', params.from)
  if (params.to != null && params.to !== '') searchParams.set('to', params.to)
  if (params.sd_number != null && params.sd_number !== '') searchParams.set('sd_number', params.sd_number)
  if (params.bl_number != null && params.bl_number !== '') searchParams.set('bl_number', params.bl_number)
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.include != null) searchParams.set('include', params.include)
}

/**
 * GET {{base_url}}/shipments
 * Response: { data: Shipment[], meta: { current_page, last_page, per_page, total, from, to } }
 */
/**
 * Batch-read shipment line vendor + cost-invoice section_meta for Partner Statement aggregation.
 * @param {string} token
 * @param {number[]} shipmentIds
 */
export async function getShipmentsAccountingPartnerContext(token, shipmentIds = []) {
  const unique = [...new Set(shipmentIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))]
  const contexts = {}
  const vendor_names = {}
  const chunkSize = 150
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize)
    if (!slice.length) continue
    const q = new URLSearchParams()
    q.set('shipment_ids', slice.join(','))
    const res = await apiFetch(`${getBaseUrl()}/shipments/accounting-partner-context?${q.toString()}`, {
      headers: authHeaders(token),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json.message || json.error || `Failed to load shipment partner context (${res.status})`)
    }
    const payload = json.data ?? json
    const ctx = payload.contexts ?? {}
    const names = payload.vendor_names ?? {}
    Object.assign(contexts, ctx)
    Object.assign(vendor_names, names)
  }
  return { contexts, vendor_names }
}

export async function listShipments(token, params = {}) {
  const searchParams = new URLSearchParams()
  appendShipmentListParams(searchParams, params)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/shipments${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to list shipments (${res.status})`)
  }
  return json
}

export async function getShipment(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load shipment (${res.status})`)
  return json
}

export async function createShipment(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to create shipment (${res.status})`)
  return json
}

export async function updateShipment(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to update shipment (${res.status})`)
  return json
}

export async function deleteShipment(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to delete shipment (${res.status})`)
  return json
}

function filenameFromContentDisposition(cd) {
  if (!cd || typeof cd !== 'string') return null
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd)
  if (quoted) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(cd)
  if (plain) return plain[1].trim().replace(/^["']|["']$/g, '')
  return null
}

/** GET shipment PDF (binary). Uses same auth as other shipment routes. */
export async function downloadShipmentPdf(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
    },
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Failed to export PDF (${res.status})`)
  }
  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) || `shipment-${shipmentId}.pdf`
  return { blob, filename }
}

/** POST transport-instructions PDF (admin / operations). Body: { transport_instruction_profile }. */
export async function postTransportInstructionsPdf(token, shipmentId, transportInstructionProfile) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/transport-instructions/pdf`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transport_instruction_profile: transportInstructionProfile }),
    }
  )
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Failed to generate PDF (${res.status})`)
  }
  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ||
    `transport-instructions-shipment-${shipmentId}.pdf`
  return { blob, filename }
}

export async function getShipmentStats(token) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/stats`, { headers: authHeaders(token) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load shipment stats (${res.status})`)
  return json
}

export async function getShipmentCharts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.months != null) searchParams.set('months', String(params.months))
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/shipments/charts${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load shipment charts (${res.status})`)
  return json
}

/** GET operations-dashboard/shipment-page-kpis — operations role only (not admin). */
export async function getShipmentOperationPageKpis(token) {
  const res = await apiFetch(`${getBaseUrl()}/operations-dashboard/shipment-page-kpis`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load operation task KPIs (${res.status})`)
  }
  return json
}

/** Same filters as list (optional ids comma-separated). Returns CSV blob. */
export async function exportShipments(token, params = {}) {
  const searchParams = new URLSearchParams()
  appendShipmentListParams(searchParams, params)
  if (params.ids != null && params.ids !== '') searchParams.set('ids', String(params.ids))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/shipments/export${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token, false) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export shipments (${res.status})`)
  }
  return res.blob()
}

export async function listShipmentNotes(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load notes (${res.status})`)
  const data = json.data ?? json
  return { data: Array.isArray(data) ? data : [] }
}

export async function postShipmentNote(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to add note (${res.status})`)
  return json
}

export async function patchShipmentNote(token, shipmentId, noteId, body) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to update note (${res.status})`)
  return json
}

export async function deleteShipmentNote(token, shipmentId, noteId) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to delete note (${res.status})`)
  return json
}

/**
 * GET {{base_url}}/shipments/:shipmentId/tracking-updates
 */
export async function getShipmentTrackingUpdates(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${shipmentId}/tracking-updates`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load tracking updates (${res.status})`)
  }
  const data = json.data ?? json.tracking_updates ?? json
  return { data: Array.isArray(data) ? data : [] }
}

/**
 * POST {{base_url}}/shipments/:shipmentId/tracking-updates
 * Body: { update_text: string }
 */
export async function postShipmentTrackingUpdate(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${shipmentId}/tracking-updates`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to add tracking update (${res.status})`)
  }
  return json
}

/**
 * POST {{base_url}}/shipments/:shipmentId/notify-sales-financials
 */
export async function notifyShipmentSalesFinancials(token, shipmentId, body = {}) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${shipmentId}/notify-sales-financials`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to notify sales (${res.status})`)
  }
  return json
}

export async function getShipmentCostInvoice(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/cost-invoice`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load shipment cost invoice (${res.status})`)
  }
  return json
}

function shipmentCostInvoiceErrorMessage(json, status) {
  const errs = json?.errors
  if (errs && typeof errs === 'object') {
    const parts = Object.values(errs)
      .flat()
      .filter((m) => m != null && String(m).trim() !== '')
    if (parts.length > 0) {
      return parts.join(' ')
    }
  }
  return json?.message || json?.error || `Failed to save shipment cost invoice (${status})`
}

export async function updateShipmentCostInvoice(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/cost-invoice`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(shipmentCostInvoiceErrorMessage(json, res.status))
  }
  return json
}

export async function getShipmentClientInvoiceDraft(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/client-invoice-draft`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load client invoice draft (${res.status})`)
  }
  const payload = json.data ?? null
  return payload ? mapInvoiceResponse(payload) : null
}

export async function upsertShipmentClientInvoiceDraft(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/client-invoice-draft`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to save client invoice draft (${res.status})`)
  }
  const payload = json.data ?? json
  return mapInvoiceResponse(payload)
}

export async function getShipmentOperations(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/operations`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load operations (${res.status})`)
  }
  return json
}

function shipmentOperationsErrorMessage(json, status) {
  const errs = json?.errors
  if (errs && typeof errs === 'object') {
    const parts = Object.values(errs)
      .flat()
      .filter((m) => m != null && String(m).trim() !== '')
    if (parts.length > 0) {
      return parts.join(' ')
    }
  }
  return json?.message || json?.error || `Failed to update operations (${status})`
}

export async function updateShipmentOperations(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/operations`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(shipmentOperationsErrorMessage(json, res.status))
  }
  return json
}

export async function getShipmentTasks(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/tasks`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load tasks (${res.status})`)
  }
  return json
}

export async function getShipmentTaskAssignees(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/tasks/assignees`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load task assignees (${res.status})`)
  }
  return json
}

export async function deleteShipmentTask(token, shipmentId, taskId) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to delete task (${res.status})`)
  }
  return json
}

export async function bulkUpdateShipmentTasks(token, shipmentId, tasks) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/tasks`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ tasks }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to update tasks (${res.status})`)
  }
  return json
}

export async function listShipmentAttachments(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/attachments`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load attachments (${res.status})`)
  return json
}

export async function uploadShipmentAttachment(token, shipmentId, file, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  if (typeof onUploadProgress === 'function') {
    const url = `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/attachments`
    const json = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.upload.onprogress = onUploadProgress
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.onload = () => {
        let parsed = {}
        try {
          parsed = JSON.parse(xhr.responseText || '{}')
        } catch {
          parsed = {}
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed)
        } else {
          reject(new Error(parsed.message || parsed.error || `Failed to upload attachment (${xhr.status})`))
        }
      }
      xhr.send(formData)
    })
    return json
  }

  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to upload attachment (${res.status})`)
  return json
}

export async function updateShipmentAttachment(token, shipmentId, attachmentId, body) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/attachments/${encodeURIComponent(attachmentId)}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to update attachment (${res.status})`)
  return json
}

export async function deleteShipmentAttachment(token, shipmentId, attachmentId) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/attachments/${encodeURIComponent(attachmentId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to delete attachment (${res.status})`)
  return json
}

export async function downloadShipmentAttachment(token, shipmentId, attachmentId) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/attachments/${encodeURIComponent(attachmentId)}/download`,
    {
      headers: authHeaders(token),
    }
  )
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  let filename = ''
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) filename = match[1]
  }
  return { blob, filename }
}
