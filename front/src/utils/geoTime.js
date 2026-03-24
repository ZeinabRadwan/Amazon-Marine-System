/**
 * Haversine distance in meters between two WGS84 points.
 */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calendar YYYY-MM-DD for an instant in an IANA time zone.
 */
export function formatYmdInTimeZone(date, ianaTimeZone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = fmt.formatToParts(date)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) return `${y}-${m}-${d}`
  } catch {
    /* invalid tz */
  }
  return date.toISOString().slice(0, 10)
}

/**
 * UTC Date for wall-clock time on a calendar day in an IANA zone (e.g. workday end).
 */
export function wallClockToUtc(ymd, hm, ianaTimeZone) {
  const [y, mo, d] = ymd.split('-').map((x) => parseInt(x, 10))
  const [hh, mm] = hm.split(':').map((x) => parseInt(x, 10))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  const opts = {
    timeZone: ianaTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', opts)
    let t = Date.UTC(y, mo - 1, d, hh, mm, 0)
    for (let i = 0; i < 100; i++) {
      const parts = fmt.formatToParts(new Date(t))
      const pick = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '', 10)
      const cy = pick('year')
      const cm = pick('month')
      const cd = pick('day')
      const ch = pick('hour')
      const cmin = pick('minute')
      if (cy === y && cm === mo && cd === d && ch === hh && cmin === mm) {
        return new Date(t)
      }
      if (cy === y && cm === mo && cd === d) {
        t += (hh * 60 + mm - (ch * 60 + cmin)) * 60 * 1000
      } else if (cy < y || (cy === y && cm < mo) || (cy === y && cm === mo && cd < d)) {
        t += 60 * 60 * 1000
      } else {
        t -= 60 * 60 * 1000
      }
    }
  } catch {
    return null
  }
  return null
}

/** @returns {{ h: number, m: number }} */
export function durationPartsFromMs(ms) {
  if (ms <= 0) return { h: 0, m: 0 }
  const totalMin = Math.floor(ms / 60000)
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 }
}
