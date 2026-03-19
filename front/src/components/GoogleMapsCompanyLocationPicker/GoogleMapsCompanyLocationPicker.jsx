import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './GoogleMapsCompanyLocationPicker.css'

const SCRIPT_ID = 'google-maps-company-location-script'

function toNumberOrEmpty(v) {
  if (v === '' || v === null || v === undefined) return ''
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : ''
}

function getInitialCenter(value) {
  const lat = toNumberOrEmpty(value?.lat)
  const lng = toNumberOrEmpty(value?.lng)
  if (lat !== '' && lng !== '') return { lat, lng }
  return { lat: 31.2001, lng: 29.9187 } // default near Alexandria
}

function getInitialRadiusMeters(value) {
  const radius = toNumberOrEmpty(value?.radius_m)
  if (radius !== '' && radius > 0) return radius
  return 250
}

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Google Maps API key is missing (VITE_GOOGLE_MAPS_API_KEY).'))
      return
    }

    if (window.google?.maps) {
      resolve()
      return
    }

    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      // Script already exists, wait for it (or fail) by polling for google.maps.
      const startedAt = Date.now()
      const timer = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(timer)
          resolve()
        } else if (Date.now() - startedAt > 15000) {
          clearInterval(timer)
          reject(new Error('Google Maps script load timed out.'))
        }
      }, 200)
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps script.'))
    document.head.appendChild(script)
  })
}

export default function GoogleMapsCompanyLocationPicker({
  value,
  onChange,
  disabled = false,
}) {
  const { t, i18n } = useTranslation()
  const mapContainerRef = useRef(null)

  const apiKey = useMemo(() => import.meta.env.VITE_GOOGLE_MAPS_API_KEY, [])
  const [mapsError, setMapsError] = useState('')

  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const lastEmittedRef = useRef({ lat: null, lng: null, radius_m: null })

  const center = useMemo(() => getInitialCenter(value), [value?.lat, value?.lng])
  const radiusMeters = useMemo(() => getInitialRadiusMeters(value), [value?.radius_m])

  const emitChange = (next) => {
    const normalized = {
      lat: Number(next.lat),
      lng: Number(next.lng),
      radius_m: Number(next.radius_m),
    }

    const prev = lastEmittedRef.current
    const changed =
      prev.lat !== normalized.lat ||
      prev.lng !== normalized.lng ||
      prev.radius_m !== normalized.radius_m

    if (!changed) return
    lastEmittedRef.current = normalized
    onChange?.(normalized)
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      setMapsError('')
      try {
        await loadGoogleMapsScript(apiKey)
        if (cancelled) return

        const g = window.google
        if (!g?.maps) throw new Error('Google Maps not available.')

        if (!mapContainerRef.current) return

        const initialCenter = new g.maps.LatLng(center.lat, center.lng)
        const initialRadius = radiusMeters

        const map = new g.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        })
        mapRef.current = map

        const marker = new g.maps.Marker({
          map,
          position: initialCenter,
          draggable: !disabled,
        })
        markerRef.current = marker

        const circle = new g.maps.Circle({
          map,
          center: initialCenter,
          radius: initialRadius,
          editable: true,
          strokeColor: '#0ea5e9',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: '#0ea5e9',
          fillOpacity: 0.18,
        })
        circleRef.current = circle

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (!pos) return
          circle.setCenter(pos)
          emitChange({
            lat: pos.lat(),
            lng: pos.lng(),
            radius_m: circle.getRadius(),
          })
        })

        circle.addListener('radius_changed', () => {
          const c = circle.getCenter()
          if (!c) return
          emitChange({
            lat: c.lat(),
            lng: c.lng(),
            radius_m: circle.getRadius(),
          })
        })

        circle.addListener('center_changed', () => {
          const c = circle.getCenter()
          if (!c) return
          marker.setPosition(c)
          emitChange({
            lat: c.lat(),
            lng: c.lng(),
            radius_m: circle.getRadius(),
          })
        })

        map.addListener('click', (e) => {
          if (!e?.latLng) return
          marker.setPosition(e.latLng)
          circle.setCenter(e.latLng)
          emitChange({
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
            radius_m: circle.getRadius(),
          })
        })

        // Emit initial state so hidden fields are always populated.
        emitChange({
          lat: center.lat,
          lng: center.lng,
          radius_m: radiusMeters,
        })
      } catch (err) {
        if (cancelled) return
        setMapsError(err?.message || 'Failed to load Google Maps.')
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep marker/circle in sync if the form state changes (e.g. initial load from API).
  useEffect(() => {
    if (!markerRef.current || !circleRef.current) return
    const g = window.google
    if (!g?.maps) return

    const currentCenter = markerRef.current.getPosition()
    const nextCenter = new g.maps.LatLng(center.lat, center.lng)
    const radiusChanged = Math.abs(circleRef.current.getRadius() - radiusMeters) > 0.5

    const centerChanged =
      !currentCenter ||
      Math.abs(currentCenter.lat() - nextCenter.lat()) > 1e-7 ||
      Math.abs(currentCenter.lng() - nextCenter.lng()) > 1e-7

    if (centerChanged) markerRef.current.setPosition(nextCenter)
    if (centerChanged) circleRef.current.setCenter(nextCenter)
    if (radiusChanged) circleRef.current.setRadius(radiusMeters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, radiusMeters])

  useEffect(() => {
    if (markerRef.current) markerRef.current.setDraggable(!disabled)
  }, [disabled])

  return (
    <div className="settings-map-picker">
      {mapsError ? (
        <div className="settings-map-error" role="alert">
          {mapsError}
        </div>
      ) : null}

      <div
        ref={mapContainerRef}
        className="settings-map"
        aria-label={t('settings.company.locationTitle', 'Company location')}
      />

      <p className="settings-map-hint">
        {i18n.language === 'ar'
          ? 'اسحب المؤشر لتحديد موقع الشركة، واسحب حواف الدائرة لتعديل نصف القطر.'
          : 'Drag the marker to set the company location, and drag the circle edges to adjust the radius.'}
      </p>

      {/* Hidden fields (for form submission compatibility with your requirement). */}
      <input type="hidden" name="lat" value={value?.lat ?? ''} />
      <input type="hidden" name="lng" value={value?.lng ?? ''} />
      <input type="hidden" name="radius_m" value={value?.radius_m ?? ''} />
    </div>
  )
}

