/**
 * SD Form Lookups API – matches back/postman_collection.json "SD Form Lookups" (5 folders × 5 CRUD).
 * Grouped: Shipment Directions, Notify Party Modes, Freight Terms, Container Types, Container Sizes.
 */

import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function buildLookupCrud(segment) {
  const root = () => `${getBaseUrl()}/${segment}`
  const one = (id) => `${getBaseUrl()}/${segment}/${id}`

  return {
    async list(token) {
      const res = await apiFetch(root(), { headers: authHeaders(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || `Failed to list ${segment} (${res.status})`)
      return data
    },
    async create(token, body) {
      const res = await apiFetch(root(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || `Failed to create ${segment} (${res.status})`)
      return data
    },
    async show(token, id) {
      const res = await apiFetch(one(id), { headers: authHeaders(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || `Failed to load ${segment} (${res.status})`)
      return data
    },
    async update(token, id, body) {
      const res = await apiFetch(one(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || `Failed to update ${segment} (${res.status})`)
      return data
    },
    async remove(token, id) {
      const res = await apiFetch(one(id), {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || `Failed to delete ${segment} (${res.status})`)
      return data
    },
  }
}

// —— Shipment Directions ——
const shipmentDirections = buildLookupCrud('shipment-directions')
export const listShipmentDirections = (token) => shipmentDirections.list(token)
export const createShipmentDirection = (token, body) => shipmentDirections.create(token, body)
export const showShipmentDirection = (token, id) => shipmentDirections.show(token, id)
export const updateShipmentDirection = (token, id, body) => shipmentDirections.update(token, id, body)
export const deleteShipmentDirection = (token, id) => shipmentDirections.remove(token, id)

// —— Notify Party Modes ——
const notifyPartyModes = buildLookupCrud('notify-party-modes')
export const listNotifyPartyModes = (token) => notifyPartyModes.list(token)
export const createNotifyPartyMode = (token, body) => notifyPartyModes.create(token, body)
export const showNotifyPartyMode = (token, id) => notifyPartyModes.show(token, id)
export const updateNotifyPartyMode = (token, id, body) => notifyPartyModes.update(token, id, body)
export const deleteNotifyPartyMode = (token, id) => notifyPartyModes.remove(token, id)

// —— Freight Terms ——
const freightTerms = buildLookupCrud('freight-terms')
export const listFreightTerms = (token) => freightTerms.list(token)
export const createFreightTerm = (token, body) => freightTerms.create(token, body)
export const showFreightTerm = (token, id) => freightTerms.show(token, id)
export const updateFreightTerm = (token, id, body) => freightTerms.update(token, id, body)
export const deleteFreightTerm = (token, id) => freightTerms.remove(token, id)

// —— Container Types ——
const containerTypes = buildLookupCrud('container-types')
export const listContainerTypes = (token) => containerTypes.list(token)
export const createContainerType = (token, body) => containerTypes.create(token, body)
export const showContainerType = (token, id) => containerTypes.show(token, id)
export const updateContainerType = (token, id, body) => containerTypes.update(token, id, body)
export const deleteContainerType = (token, id) => containerTypes.remove(token, id)

// —— Container Sizes ——
const containerSizes = buildLookupCrud('container-sizes')
export const listContainerSizes = (token) => containerSizes.list(token)
export const createContainerSize = (token, body) => containerSizes.create(token, body)
export const showContainerSize = (token, id) => containerSizes.show(token, id)
export const updateContainerSize = (token, id, body) => containerSizes.update(token, id, body)
export const deleteContainerSize = (token, id) => containerSizes.remove(token, id)

/** Tab config for UI: maps tab id to API group */
export const SD_FORM_LOOKUP_TAB_APIS = {
  shipmentDirections: shipmentDirections,
  notifyPartyModes: notifyPartyModes,
  freightTerms: freightTerms,
  containerTypes: containerTypes,
  containerSizes: containerSizes,
}
