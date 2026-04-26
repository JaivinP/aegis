import { useEffect, useMemo, useRef, useState } from 'react'
import { loadRoute } from '../utils/geoRoute'

const TILE_SIZE = 256
const MIN_ZOOM = 4
const MAX_ZOOM = 16
const MIN_ZOOM_DELTA = -3
const MAX_ZOOM_DELTA = 5
const BUTTON_ZOOM_STEP = 0.5
const WHEEL_ZOOM_SPEED = 0.003

function lonToX(lon, zoom) {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom
}

function latToY(lat, zoom) {
  const sinLat = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * TILE_SIZE * 2 ** zoom
}

function xToLon(x, zoom) {
  return (x / (TILE_SIZE * 2 ** zoom)) * 360 - 180
}

function yToLat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * 2 ** zoom)
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}

function project(point, zoom) {
  return { x: lonToX(point.lon, zoom), y: latToY(point.lat, zoom) }
}

function unproject(point, zoom) {
  return { lat: yToLat(point.y, zoom), lon: xToLon(point.x, zoom) }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
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
      const center = unproject({ x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 }, zoom)
      return { zoom, center }
    }
  }

  const nw = project({ lat: bounds.maxLat, lon: bounds.minLon }, MIN_ZOOM)
  const se = project({ lat: bounds.minLat, lon: bounds.maxLon }, MIN_ZOOM)
  return {
    zoom: MIN_ZOOM,
    center: unproject({ x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 }, MIN_ZOOM),
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
  const dragRef = useRef(null)
  const [mapWidth, setMapWidth] = useState(compact ? 680 : 760)
  const [mapHeight, setMapHeight] = useState(height)
  const [zoomDelta, setZoomDelta] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [route, setRoute] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mapRef.current) return
    const updateSize = () => {
      const rect = mapRef.current.getBoundingClientRect()
      setMapWidth(Math.max(320, Math.round(rect.width)))
      setMapHeight(Math.max(220, Math.round(rect.height || height)))
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(mapRef.current)
    return () => observer.disconnect()
  }, [height])

  useEffect(() => {
    setZoomDelta(0)
    setPan({ x: 0, y: 0 })
  }, [origin, destination])

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
  const viewportHeight = mapHeight
  const viewport = useMemo(() => {
    if (!route?.points?.length) return null
    const fit = chooseViewport(route.points, width, viewportHeight)
    const zoom = clamp(fit.zoom + zoomDelta, MIN_ZOOM, MAX_ZOOM)
    const baseCenter = project(fit.center, zoom)
    return {
      zoom,
      center: {
        x: baseCenter.x + pan.x,
        y: baseCenter.y + pan.y,
      },
    }
  }, [route, width, viewportHeight, zoomDelta, pan])

  const map = useMemo(() => {
    if (!route || !viewport) return null
    const left = viewport.center.x - width / 2
    const top = viewport.center.y - viewportHeight / 2
    const toScreen = (point) => {
      const p = project(point, viewport.zoom)
      return { x: p.x - left, y: p.y - top }
    }

    const tileZoom = Math.floor(viewport.zoom)
    const tileScale = 2 ** (viewport.zoom - tileZoom)
    const scaledTileSize = TILE_SIZE * tileScale
    const startTileX = Math.floor(left / scaledTileSize)
    const endTileX = Math.floor((left + width) / scaledTileSize)
    const startTileY = Math.floor(top / scaledTileSize)
    const endTileY = Math.floor((top + viewportHeight) / scaledTileSize)
    const tileMax = 2 ** tileZoom
    const tiles = []

    for (let x = startTileX; x <= endTileX; x += 1) {
      for (let y = startTileY; y <= endTileY; y += 1) {
        if (y < 0 || y >= tileMax) continue
        const wrappedX = ((x % tileMax) + tileMax) % tileMax
        tiles.push({
          key: `${x}-${y}`,
          x: x * scaledTileSize - left,
          y: y * scaledTileSize - top,
          size: scaledTileSize,
          url: `https://tile.openstreetmap.org/${tileZoom}/${wrappedX}/${y}.png`,
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
  }, [route, viewport, width, viewportHeight])

  function zoomIn() {
    setZoomDelta((value) => clamp(value + BUTTON_ZOOM_STEP, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA))
  }

  function zoomOut() {
    setZoomDelta((value) => clamp(value - BUTTON_ZOOM_STEP, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA))
  }

  function resetView() {
    setZoomDelta(0)
    setPan({ x: 0, y: 0 })
  }

  function handleWheel(e) {
    e.preventDefault()
    setZoomDelta((value) => clamp(value - e.deltaY * WHEEL_ZOOM_SPEED, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA))
  }

  function handlePointerDown(e) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setPan((value) => ({ x: value.x - dx, y: value.y - dy }))
  }

  function handlePointerUp(e) {
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  return (
    <div
      ref={mapRef}
      className={`real-map ${dragging ? 'real-map--dragging' : ''} ${className}`}
      style={{ height }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
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
                style={{
                  width: tile.size,
                  height: tile.size,
                  transform: `translate(${tile.x}px, ${tile.y}px)`,
                }}
              />
            ))}
          </div>

          <svg className="real-map-overlay" viewBox={`0 0 ${width} ${viewportHeight}`} preserveAspectRatio="none">
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

          <div className="real-map-controls" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
            <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
            <button type="button" onClick={zoomOut} aria-label="Zoom out">-</button>
            <button type="button" onClick={resetView} aria-label="Reset map view">fit</button>
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
