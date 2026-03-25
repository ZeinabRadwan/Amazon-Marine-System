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

const USER_MARKER = {
  radius: 8,
  color: '#15803d',
  fillColor: '#22c55e',
  fillOpacity: 0.95,
  weight: 2,
}

/**
 * Read-only map: office point + geofence circle; optional user position (green dot).
 * If office lat/lng are missing but user lat/lng are set, shows a user-only map (same tiles/style).
 */
export default function LeafletOfficeMapPreview({
  lat,
  lng,
  radiusMeters,
  userLat,
  userLng,
  ariaLabel: ariaLabelProp,
}) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const officeMarkerRef = useRef(null)
  const circleRef = useRef(null)
  const userMarkerRef = useRef(null)

  const label = ariaLabelProp ?? t('attendance.locationPanel.officeMapAria')

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
    const hasOffice = Number.isFinite(olat) && Number.isFinite(olng)

    const ulat = userLat != null ? Number(userLat) : NaN
    const ulng = userLng != null ? Number(userLng) : NaN
    const userOk = Number.isFinite(ulat) && Number.isFinite(ulng)

    if (!hasOffice && !userOk) return

    /* User-only map (no office configured) */
    if (!hasOffice && userOk) {
      let map = mapRef.current
      if (!map) {
        map = L.map(containerRef.current, {
          center: [ulat, ulng],
          zoom: 16,
          zoomControl: true,
        })
        mapRef.current = map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        userMarkerRef.current = L.circleMarker([ulat, ulng], USER_MARKER).addTo(map)
      } else {
        if (!userMarkerRef.current) {
          userMarkerRef.current = L.circleMarker([ulat, ulng], USER_MARKER).addTo(map)
        } else {
          userMarkerRef.current.setLatLng([ulat, ulng])
        }
        map.setView([ulat, ulng], Math.max(map.getZoom(), 15))
      }

      const id = requestAnimationFrame(() => {
        mapRef.current?.invalidateSize()
      })
      return () => cancelAnimationFrame(id)
    }

    /* Office (+ optional user) map */
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

    if (userOk) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([ulat, ulng], USER_MARKER).addTo(map)
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
      aria-label={label}
    />
  )
}
