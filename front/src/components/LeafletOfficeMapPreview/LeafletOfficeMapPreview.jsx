import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import marker1x from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './LeafletOfficeMapPreview.css'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
})

/**
 * Read-only map: office point + geofence circle; optional user position (green dot).
 * Same tiles/style pattern as Settings (LeafletCompanyLocationPicker).
 */
export default function LeafletOfficeMapPreview({ lat, lng, radiusMeters, userLat, userLng }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const officeMarkerRef = useRef(null)
  const circleRef = useRef(null)
  const userMarkerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      officeMarkerRef.current = null
      circleRef.current = null
      userMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const olat = Number(lat)
    const olng = Number(lng)
    if (!Number.isFinite(olat) || !Number.isFinite(olng)) return

    const r = Number(radiusMeters)
    const radius = Number.isFinite(r) && r > 0 ? r : 250

    let map = mapRef.current
    if (!map) {
      map = L.map(containerRef.current, {
        center: [olat, olng],
        zoom: 15,
        zoomControl: true,
      })
      mapRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const circle = L.circle([olat, olng], {
        radius,
        color: '#0ea5e9',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: 0.18,
      }).addTo(map)
      circleRef.current = circle

      const officeMarker = L.marker([olat, olng]).addTo(map)
      officeMarkerRef.current = officeMarker
    } else {
      officeMarkerRef.current?.setLatLng([olat, olng])
      if (circleRef.current) {
        circleRef.current.setLatLng([olat, olng])
        circleRef.current.setRadius(radius)
      }
    }

    const ulat = userLat != null ? Number(userLat) : NaN
    const ulng = userLng != null ? Number(userLng) : NaN
    const userOk = Number.isFinite(ulat) && Number.isFinite(ulng)

    if (userOk) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([ulat, ulng], {
          radius: 8,
          color: '#15803d',
          fillColor: '#22c55e',
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map)
      } else {
        userMarkerRef.current.setLatLng([ulat, ulng])
      }
    } else if (userMarkerRef.current && map) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }

    if (circleRef.current) {
      const bounds = L.latLngBounds(circleRef.current.getBounds())
      if (userMarkerRef.current) {
        bounds.extend(userMarkerRef.current.getLatLng())
      }
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 })
    }

    const id = requestAnimationFrame(() => {
      mapRef.current?.invalidateSize()
    })
    return () => cancelAnimationFrame(id)
  }, [lat, lng, radiusMeters, userLat, userLng])

  return (
    <div
      ref={containerRef}
      className="leaflet-office-map-preview"
      aria-label={t('attendance.locationPanel.officeMapAria')}
    />
  )
}
