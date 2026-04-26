const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

const KNOWN_LOCATIONS = {
  'los angeles, ca': { lat: 34.052235, lon: -118.243683, label: 'Los Angeles, CA' },
  'los angeles, california': { lat: 34.052235, lon: -118.243683, label: 'Los Angeles, CA' },
  'phoenix, az': { lat: 33.448376, lon: -112.074036, label: 'Phoenix, AZ' },
  'phoenix, arizona': { lat: 33.448376, lon: -112.074036, label: 'Phoenix, AZ' },
  'ontario, ca': { lat: 34.063343, lon: -117.650887, label: 'Ontario, CA' },
  'riverside, ca': { lat: 33.9806, lon: -117.3755, label: 'Riverside, CA' },
  'indio, ca': { lat: 33.7206, lon: -116.2156, label: 'Indio, CA' },
  'blythe, ca': { lat: 33.6178, lon: -114.5883, label: 'Blythe, CA' },
}

const routeCache = new Map()

function cacheKey(prefix, value) {
  return `${prefix}:${String(value || '').trim().toLowerCase()}`
}

function readCache(key) {
  if (routeCache.has(key)) return routeCache.get(key)
  try {
    const raw = localStorage.getItem(`aegis:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    routeCache.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

function writeCache(key, value) {
  routeCache.set(key, value)
  try {
    localStorage.setItem(`aegis:${key}`, JSON.stringify(value))
  } catch {}
}

function formatPlace(result, fallback) {
  const address = result.address || {}
  const city = address.city || address.town || address.village || address.hamlet || address.county
  const state = address.state_code || address.state
  if (city && state) return `${city}, ${state}`
  return result.display_name?.split(',').slice(0, 2).join(',') || fallback
}

export async function geocodeLocation(query) {
  const normalized = String(query || '').trim()
  if (!normalized) throw new Error('Missing location')

  const known = KNOWN_LOCATIONS[normalized.toLowerCase()]
  if (known) return known

  const key = cacheKey('geocode', normalized)
  const cached = readCache(key)
  if (cached) return cached

  const params = new URLSearchParams({
    q: normalized,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  })
  const res = await fetch(`${NOMINATIM_URL}/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Could not geocode ${normalized}`)

  const results = await res.json()
  if (!results?.length) throw new Error(`No map result for ${normalized}`)

  const place = {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    label: formatPlace(results[0], normalized),
  }
  writeCache(key, place)
  return place
}

async function reverseGeocode(point, fallback) {
  const key = `reverse:${point.lat.toFixed(3)},${point.lon.toFixed(3)}`
  const cached = readCache(key)
  if (cached) return cached

  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '10',
  })

  try {
    const res = await fetch(`${NOMINATIM_URL}/reverse?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return fallback
    const result = await res.json()
    const label = formatPlace(result, fallback)
    writeCache(key, label)
    return label
  } catch {
    return fallback
  }
}

function distanceMiles(a, b) {
  const earthMiles = 3958.8
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthMiles * Math.asin(Math.sqrt(h))
}

function pointAtDistance(points, targetMiles) {
  if (targetMiles <= 0) return points[0]
  let traveled = 0

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const next = points[i]
    const segment = distanceMiles(prev, next)
    if (traveled + segment >= targetMiles) {
      const t = segment === 0 ? 0 : (targetMiles - traveled) / segment
      return {
        lat: prev.lat + (next.lat - prev.lat) * t,
        lon: prev.lon + (next.lon - prev.lon) * t,
      }
    }
    traveled += segment
  }

  return points[points.length - 1]
}

function currentPosition(points, distanceMilesTotal, progress) {
  const pct = Math.max(0, Math.min(100, Number(progress) || 0)) / 100
  return pointAtDistance(points, distanceMilesTotal * pct)
}

async function buildCheckpoints(points, distanceMilesTotal, origin, destination) {
  const fractions = [0, 0.25, 0.5, 0.75, 1]
  const checkpoints = await Promise.all(fractions.map(async (fraction, index) => {
    const point = pointAtDistance(points, distanceMilesTotal * fraction)
    const fallback = index === 0
      ? origin.label
      : index === fractions.length - 1
        ? destination.label
        : `Checkpoint ${index}`
    const label = index === 0 || index === fractions.length - 1
      ? fallback
      : await reverseGeocode(point, fallback)
    return {
      ...point,
      label,
      type: index === 0 ? 'origin' : index === fractions.length - 1 ? 'destination' : 'checkpoint',
      progress: Math.round(fraction * 100),
    }
  }))
  return checkpoints
}

export async function loadRoute(originQuery, destinationQuery, progress = 0) {
  const origin = await geocodeLocation(originQuery)
  const destination = await geocodeLocation(destinationQuery)
  const key = `route:${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}:${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}`
  const cached = readCache(key)
  if (cached) {
    return {
      ...cached,
      current: currentPosition(cached.points, cached.distanceMiles, progress),
    }
  }

  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
  })
  const res = await fetch(`${OSRM_URL}/${coords}?${params.toString()}`)
  if (!res.ok) throw new Error('Could not load driving route')

  const json = await res.json()
  const route = json.routes?.[0]
  if (!route?.geometry?.coordinates?.length) throw new Error('No driving route found')

  const points = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }))
  const distanceMilesTotal = route.distance / 1609.344
  const value = {
    origin,
    destination,
    points,
    checkpoints: await buildCheckpoints(points, distanceMilesTotal, origin, destination),
    distanceMiles: distanceMilesTotal,
    durationMinutes: route.duration / 60,
  }
  writeCache(key, value)
  return {
    ...value,
    current: currentPosition(points, distanceMilesTotal, progress),
  }
}

