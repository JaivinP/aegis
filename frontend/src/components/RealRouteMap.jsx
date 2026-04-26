import { useEffect, useMemo, useRef, useState } from 'react'
import { loadRoute } from '../utils/geoRoute'

const TILE_SIZE = 256
const MIN_ZOOM = 4
const MAX_ZOOM = 12

function lonToX(lon, zoom) {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom
}

function latToY(lat, zoom) {
  const sinLat = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * TILE_SIZE * 2 ** zoom
}

function project(point, zoom) {
  return { x: lonToX(point.lon, zoom), y: latToY(point.lat, zoom) }
}

function routeBounds(points) {
  return points.reduce((bounds, p) => ({
    minLat: Math.min(bounds.minLat, p.lat),
    maxLat: Math.max(bounds.maxLat, p.lat),
    minLon: Math.min(bounds.minLon, p.lon),
    maxLon: Math.max(bounds.maxLon, p.lon),
  }), {
    minLat: points[0].lat,
    maxLat: points[0].lat,
    minLon: points[0].lon,
    maxLon: points[0].lon,
  })
}

function chooseViewport(points, width, height) {
  const bounds = routeBounds(points)
  const padding = 56

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const nw = project({ lat: bounds.maxLat, lon: bounds.minLon }, zoom)
    const se = project({ lat: bounds.minLat, lon: bounds.maxLon }, zoom)
    if ((se.x - nw.x) <= width - padding * 2 && (se.y - nw.y) <= height - padding * 2) {
      const center = project({
        lat: (bounds.minLat + bounds.maxLat) / 2,
        lon: (bounds.minLon + bounds.maxLon) / 2,
      }, zoom)
      return { zoom, center }
    }
  }

  return {
    zoom: MIN_ZOOM,
    center: project({
      lat: (bounds.minLat + bounds.maxLat) / 2,
      lon: (bounds.minLon + bounds.maxLon) / 2,
    }, MIN_ZOOM),
  }
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours <= 0) return `${mins} min`
  return `${hours}h ${mins}m`
}

export default function RealRouteMap({
  origin,
  destination,
  progress = 0,
  height = 260,
  compact = false,
  className = '',
}) {
  const mapRef = useRef(null)
  const [mapWidth, setMapWidth] = useState(compact ? 680 : 760)
  const [route, setRoute] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mapRef.current) return
    const updateWidth = () => setMapWidth(Math.max(320, Math.round(mapRef.current.getBoundingClientRect().width)))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(mapRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!origin || !destination) return
    let cancelled = false
    setStatus('loading')
    setError(null)

    loadRoute(origin, destination, progress)
      .then((nextRoute) => {
        if (cancelled) return
        setRoute(nextRoute)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setRoute(null)
        setError(err.message)
        setStatus('error')
      })

    return () => { cancelled = true }
  }, [origin, destination])

  useEffect(() => {
    if (!route || !origin || !destination) return
    let cancelled = false
    loadRoute(origin, destination, progress)
      .then((nextRoute) => {
        if (!cancelled) setRoute(nextRoute)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [progress]) // eslint-disable-line react-hooks/exhaustive-deps

  const width = mapWidth
  const viewport = useMemo(() => {
    if (!route?.points?.length) return null
    return chooseViewport(route.points, width, height)
  }, [route, width, height])

  const map = useMemo(() => {
    if (!route || !viewport) return null
    const left = viewport.center.x - width / 2
    const top = viewport.center.y - height / 2
    const toScreen = (point) => {
      const p = project(point, viewport.zoom)
      return { x: p.x - left, y: p.y - top }
    }

    const startTileX = Math.floor(left / TILE_SIZE)
    const endTileX = Math.floor((left + width) / TILE_SIZE)
    const startTileY = Math.floor(top / TILE_SIZE)
    const endTileY = Math.floor((top + height) / TILE_SIZE)
    const tileMax = 2 ** viewport.zoom
    const tiles = []

    for (let x = startTileX; x <= endTileX; x += 1) {
      for (let y = startTileY; y <= endTileY; y += 1) {
        if (y < 0 || y >= tileMax) continue
        const wrappedX = ((x % tileMax) + tileMax) % tileMax
        tiles.push({
          key: `${x}-${y}`,
          x: x * TILE_SIZE - left,
          y: y * TILE_SIZE - top,
          url: `https://tile.openstreetmap.org/${viewport.zoom}/${wrappedX}/${y}.png`,
        })
      }
    }

    return {
      tiles,
      line: route.points.map((point) => {
        const p = toScreen(point)
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
      }).join(' '),
      checkpoints: route.checkpoints.map((checkpoint) => ({ ...checkpoint, screen: toScreen(checkpoint) })),
      current: toScreen(route.current),
    }
  }, [route, viewport, width, height])

  return (
    <div ref={mapRef} className={`real-map ${className}`} style={{ height }}>
      {status === 'loading' && (
        <div className="real-map-state mono">Loading real route…</div>
      )}

      {status === 'error' && (
        <div className="real-map-state real-map-state--error mono">
          {error || 'Map route unavailable'}
        </div>
      )}

      {route && map && (
        <>
          <div className="real-map-tiles" aria-hidden="true">
            {map.tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                draggable="false"
                style={{ transform: `translate(${tile.x}px, ${tile.y}px)` }}
              />
            ))}
          </div>

          <svg className="real-map-overlay" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline className="real-map-route-shadow" points={map.line} />
            <polyline className="real-map-route" points={map.line} />
            {map.checkpoints.map((checkpoint, index) => (
              <g key={`${checkpoint.label}-${checkpoint.progress}`} className={`real-map-checkpoint real-map-checkpoint--${checkpoint.type}`}>
                <circle cx={checkpoint.screen.x} cy={checkpoint.screen.y} r={checkpoint.type === 'checkpoint' ? 5 : 7} />
                <text
                  x={checkpoint.screen.x}
                  y={checkpoint.screen.y - 11 - (index % 2) * 10}
                  textAnchor="middle"
                >
                  {checkpoint.label}
                </text>
              </g>
            ))}
            <circle className="real-map-current-pulse" cx={map.current.x} cy={map.current.y} r="13" />
            <circle className="real-map-current" cx={map.current.x} cy={map.current.y} r="6" />
          </svg>

          <div className="real-map-summary mono">
            <span>{Math.round(route.distanceMiles)} mi</span>
            <span>{formatDuration(route.durationMinutes)}</span>
            <span>{Math.round(progress)}%</span>
          </div>

          <a
            className="real-map-attribution mono"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap
          </a>
        </>
      )}
    </div>
  )
}
