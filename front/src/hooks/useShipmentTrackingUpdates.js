import { useState, useCallback, useEffect } from 'react'
import { getStoredToken } from '../pages/Login'
import { getShipmentTrackingUpdates } from '../api/shipments'

/**
 * Fetches tracking updates for a shipment. Skips fetch when shipmentId is null/undefined.
 * @param {number|string|null} shipmentId - Shipment ID or null to skip
 * @returns {{ data: array, loading: boolean, error: string|null, refetch: () => void }}
 */
export function useShipmentTrackingUpdates(shipmentId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUpdates = useCallback(() => {
    const id = shipmentId != null && shipmentId !== '' ? String(shipmentId) : null
    if (!id) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }
    const token = getStoredToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getShipmentTrackingUpdates(token, id)
      .then((res) => {
        setData(res.data ?? [])
      })
      .catch((err) => {
        setError(err.message || 'Failed to load tracking updates')
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [shipmentId])

  useEffect(() => {
    fetchUpdates()
  }, [fetchUpdates])

  return { data, loading, error, refetch: fetchUpdates }
}
