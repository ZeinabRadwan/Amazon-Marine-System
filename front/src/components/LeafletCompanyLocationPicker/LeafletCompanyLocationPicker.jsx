import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import marker1x from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './LeafletCompanyLocationPicker.css'

function toNumberOrEmpty(v) {
  if (v === '' || v === null || v === undefined) return ''
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : ''
}

function getInitialCenter(value) {
  const lat = toNumberOrEmpty(value?.lat)
  const lng = toNumberOrEmpty(value?.lng)
  if (lat !== '' && lng !== '') return { lat, lng }
  return { lat: 31.2001, lng: 29.9187 }
}

function getInitialRadiusMeters(value) {
  const radius = toNumberOrEmpty(value?.radius_m)
  if (radius !== '' && radius > 0) return radius
  return 250
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
})

export default function LeafletCompanyLocationPicker({ value, onChange, disabled = false }) {
  const { i18n, t } = useTranslation()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const [mapError, setMapError] = useState('')

  const center = useMemo(() => getInitialCenter(value), [value])
  const radiusMeters = useMemo(() => getInitialRadiusMeters(value), [value])

  const emitChange = (next) => {
    const normalized = {
      lat: Number(next.lat),
      lng: Number(next.lng),
      radius_m: Math.max(1, Math.round(Number(next.radius_m))),
    }
    onChange?.(normalized)
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    try {
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: 14,
        zoomControl: true,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const marker = L.marker([center.lat, center.lng], { draggable: !disabled }).addTo(map)
      markerRef.current = marker

      const circle = L.circle([center.lat, center.lng], {
        radius: radiusMeters,
        color: '#0ea5e9',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: 0.18,
      }).addTo(map)
      circleRef.current = circle

      marker.on('dragend', () => {
        const latlng = marker.getLatLng()
        circle.setLatLng(latlng)
        emitChange({ lat: latlng.lat, lng: latlng.lng, radius_m: circle.getRadius() })
      })

      map.on('click', (e) => {
        if (disabled) return
        marker.setLatLng(e.latlng)
        circle.setLatLng(e.latlng)
        emitChange({ lat: e.latlng.lat, lng: e.latlng.lng, radius_m: circle.getRadius() })
      })
    } catch (err) {
      setMapError(err?.message || 'Failed to load map.')
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!markerRef.current || !circleRef.current || !mapRef.current) return
    const lat = Number(center.lat)
    const lng = Number(center.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const latlng = L.latLng(lat, lng)
    markerRef.current.setLatLng(latlng)
    circleRef.current.setLatLng(latlng)
    mapRef.current.panTo(latlng, { animate: false })
  }, [center.lat, center.lng])

  useEffect(() => {
    if (!markerRef.current) return
    if (disabled) markerRef.current.dragging?.disable()
    else markerRef.current.dragging?.enable()
  }, [disabled])

  useEffect(() => {
    if (!circleRef.current) return
    circleRef.current.setRadius(radiusMeters)
  }, [radiusMeters])

  return (
    <div className="settings-map-picker">
      {mapError ? (
        <div className="settings-map-error" role="alert">
          {mapError}
        </div>
      ) : null}

      <div ref={mapContainerRef} className="settings-map" aria-label={t('settings.company.locationTitle', 'Company location')} />

      <div className="settings-map-coords">
        <label className="settings-input-wrap">
          <span className="settings-input-label">{t('settings.company.latitude', 'Latitude')}</span>
          <input
            type="number"
            step="0.000001"
            className="clients-input settings-input"
            value={value?.lat ?? ''}
            disabled={disabled}
            onChange={(e) => emitChange({ lat: e.target.value, lng: value?.lng ?? center.lng, radius_m: value?.radius_m ?? radiusMeters })}
          />
        </label>
        <label className="settings-input-wrap">
          <span className="settings-input-label">{t('settings.company.longitude', 'Longitude')}</span>
          <input
            type="number"
            step="0.000001"
            className="clients-input settings-input"
            value={value?.lng ?? ''}
            disabled={disabled}
            onChange={(e) => emitChange({ lat: value?.lat ?? center.lat, lng: e.target.value, radius_m: value?.radius_m ?? radiusMeters })}
          />
        </label>
        <label className="settings-input-wrap">
          <span className="settings-input-label">{t('settings.company.radiusM', 'Radius (m)')}</span>
          <input
            type="number"
            min="1"
            className="clients-input settings-input"
            value={value?.radius_m ?? ''}
            disabled={disabled}
            onChange={(e) => emitChange({ lat: value?.lat ?? center.lat, lng: value?.lng ?? center.lng, radius_m: e.target.value })}
          />
        </label>
      </div>

      <p className="settings-map-hint">
        {i18n.language === 'ar'
          ? 'اضغط على الخريطة أو اسحب المؤشر لتحديد الموقع، ويمكنك تعديل نصف القطر من الحقل أدناه.'
          : 'Click the map or drag the marker to set location, and adjust the radius from the field below.'}
      </p>
    </div>
  )
}
