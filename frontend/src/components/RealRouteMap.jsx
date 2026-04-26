import { useEffect, useMemo, useRef, useState } from 'react'
import { loadRoute } from '../utils/geoRoute'

const TILE_SIZE = 256
const MIN_ZOOM = 2
const MAX_ZOOM = 18
const MIN_ZOOM_DELTA = -4
const MAX_ZOOM_DELTA = 7
const WHEEL_ZOOM_SPEED = 0.0015
const BUTTON_ZOOM_STEP = 1

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
  return points.reduce(
    (b, p) => ({
      minLat: Math.min(b.minLat, p.lat),
      maxLat: Math.max(b.maxLat, p.lat),
      minLon: Math.min(b.minLon, p.lon),
      maxLon: Math.max(b.maxLon, p.lon),
    }),
    { minLat: points[0].lat, maxLat: points[0].lat, minLon: points[0].lon, maxLon: points[0].lon },
  )
}

function chooseViewport(points, width, height) {
  const bounds = routeBounds(points)
  const padding = 64

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const nw = project({ lat: bounds.maxLat, lon: bounds.minLon }, zoom)
    const se = project({ lat: bounds.minLat, lon: bounds.maxLon }, zoom)
    if (se.x - nw.x <= width - padding * 2 && se.y - nw.y <= height - padding * 2) {
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
  if (hours <= 0) return `${mins}m`
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
  const fitRef = useRef(null)

  const [mapWidth, setMapWidth] = useState(compact ? 680 : 760)
  const [mapHeight, setMapHeight] = useState(height)
  const [mapState, setMapState] = useState({ pan: { x: 0, y: 0 }, zoomDelta: 0 })
  const [dragging, setDragging] = useState(false)
  const [route, setRoute] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mapRef.current) return
    const el = mapRef.current
    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      setMapWidth(Math.max(320, Math.round(rect.width)))
      setMapHeight(Math.max(220, Math.round(rect.height || height)))
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [height])

  useEffect(() => {
    setMapState({ pan: { x: 0, y: 0 }, zoomDelta: 0 })
  }, [origin, destination])

  useEffect(() => {
    if (!origin || !destination) return
    let cancelled = false
    setStatus('loading')
    setError(null)
    loadRoute(origin, destination, progress)
      .then((r) => { if (!cancelled) { setRoute(r); setStatus('ready') } })
      .catch((err) => { if (!cancelled) { setRoute(null); setError(err.message); setStatus('error') } })
    return () => { cancelled = true }
  }, [origin, destination]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!route || !origin || !destination) return
    let cancelled = false
    loadRoute(origin, destination, progress)
      .then((r) => { if (!cancelled) setRoute(r) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [progress]) // eslint-disable-line react-hooks/exhaustive-deps

  const width = mapWidth
  const viewportHeight = mapHeight

  const viewport = useMemo(() => {
    if (!route?.points?.length) return null
    const fit = chooseViewport(route.points, width, viewportHeight)
    fitRef.current = fit
    const zoom = clamp(fit.zoom + mapState.zoomDelta, MIN_ZOOM, MAX_ZOOM)
    const baseCenter = project(fit.center, zoom)
    return {
      zoom,
      center: { x: baseCenter.x + mapState.pan.x, y: baseCenter.y + mapState.pan.y },
    }
  }, [route, width, viewportHeight, mapState])

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
          key: `${tileZoom}/${wrappedX}/${y}`,
          x: x * scaledTileSize - left,
          y: y * scaledTileSize - top,
          size: scaledTileSize,
          url: `https://tile.openstreetmap.org/${tileZoom}/${wrappedX}/${y}.png`,
        })
      }
    }

    const screenPoints = route.points.map(toScreen)
    const splitIdx = Math.floor(clamp(progress / 100, 0, 1) * (screenPoints.length - 1))
    const toStr = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`

    return {
      tiles,
      fullLine: screenPoints.map(toStr).join(' '),
      traveledLine: screenPoints.slice(0, splitIdx + 1).map(toStr).join(' '),
      remainingLine: screenPoints.slice(splitIdx).map(toStr).join(' '),
      checkpoints: route.checkpoints.map((cp) => ({ ...cp, screen: toScreen(cp) })),
      current: toScreen(route.current),
    }
  }, [route, viewport, width, viewportHeight, progress])

  function handleWheel(e) {
    e.preventDefault()
    const fit = fitRef.current
    if (!fit) return
    const rect = mapRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const w = rect.width
    const h = rect.height

    setMapState((prev) => {
      const newDelta = clamp(prev.zoomDelta - e.deltaY * WHEEL_ZOOM_SPEED, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA)
      const currentZoom = clamp(fit.zoom + prev.zoomDelta, MIN_ZOOM, MAX_ZOOM)
      const newZoom = clamp(fit.zoom + newDelta, MIN_ZOOM, MAX_ZOOM)

      if (Math.abs(newZoom - currentZoom) < 0.0001) return { ...prev, zoomDelta: newDelta }

      const wx = project(fit.center, currentZoom).x + prev.pan.x - w / 2 + mouseX
      const wy = project(fit.center, currentZoom).y + prev.pan.y - h / 2 + mouseY
      const geoPoint = unproject({ x: wx, y: wy }, currentZoom)

      return {
        zoomDelta: newDelta,
        pan: {
          x: project(geoPoint, newZoom).x - project(fit.center, newZoom).x - mouseX + w / 2,
          y: project(geoPoint, newZoom).y - project(fit.center, newZoom).y - mouseY + h / 2,
        },
      }
    })
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
    setMapState((prev) => ({ ...prev, pan: { x: prev.pan.x - dx, y: prev.pan.y - dy } }))
  }

  function handlePointerUp(e) {
    dragRef.current = null
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  function handleDoubleClick(e) {
    const fit = fitRef.current
    if (!fit) return
    const rect = mapRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const w = rect.width
    const h = rect.height

    setMapState((prev) => {
      const newDelta = clamp(prev.zoomDelta + BUTTON_ZOOM_STEP, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA)
      const currentZoom = clamp(fit.zoom + prev.zoomDelta, MIN_ZOOM, MAX_ZOOM)
      const newZoom = clamp(fit.zoom + newDelta, MIN_ZOOM, MAX_ZOOM)

      const wx = project(fit.center, currentZoom).x + prev.pan.x - w / 2 + mouseX
      const wy = project(fit.center, currentZoom).y + prev.pan.y - h / 2 + mouseY
      const geoPoint = unproject({ x: wx, y: wy }, currentZoom)

      return {
        zoomDelta: newDelta,
        pan: {
          x: project(geoPoint, newZoom).x - project(fit.center, newZoom).x - mouseX + w / 2,
          y: project(geoPoint, newZoom).y - project(fit.center, newZoom).y - mouseY + h / 2,
        },
      }
    })
  }

  function zoomIn() {
    setMapState((prev) => ({ ...prev, zoomDelta: clamp(prev.zoomDelta + BUTTON_ZOOM_STEP, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA) }))
  }

  function zoomOut() {
    setMapState((prev) => ({ ...prev, zoomDelta: clamp(prev.zoomDelta - BUTTON_ZOOM_STEP, MIN_ZOOM_DELTA, MAX_ZOOM_DELTA) }))
  }

  function resetView() {
    setMapState({ pan: { x: 0, y: 0 }, zoomDelta: 0 })
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
      onDoubleClick={handleDoubleClick}
    >
      {status === 'loading' && (
        <div className="real-map-state mono">
          <div className="real-map-spinner" />
          Loading route…
        </div>
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
            {/* Full shadow behind route */}
            <polyline className="real-map-route-shadow" points={map.fullLine} />
            {/* Remaining (dim dashed) */}
            <polyline className="real-map-route-remaining" points={map.remainingLine} />
            {/* Traveled (solid bright) */}
            <polyline className="real-map-route-traveled" points={map.traveledLine} />

            {/* Checkpoints */}
            {map.checkpoints.map((cp) => (
              <g key={`${cp.label}-${cp.progress}`} className={`real-map-checkpoint real-map-checkpoint--${cp.type}`}>
                <circle
                  cx={cp.screen.x}
                  cy={cp.screen.y}
                  r={cp.type === 'checkpoint' ? 4 : 6}
                />
                <text x={cp.screen.x} y={cp.screen.y - 12} textAnchor="middle">
                  {cp.label}
                </text>
              </g>
            ))}

            {/* Current position */}
            <circle className="real-map-pulse-ring" cx={map.current.x} cy={map.current.y} r="13" />
            <circle className="real-map-current" cx={map.current.x} cy={map.current.y} r="5" />
          </svg>

          {/* Route progress bar */}
          <div className="real-map-progress-bar">
            <div className="real-map-progress-fill" style={{ width: `${Math.round(progress)}%` }} />
          </div>

          {/* Summary pills */}
          <div className="real-map-summary mono">
            <div className="real-map-pill">
              <span className="real-map-pill-label">DIST</span>
              <span className="real-map-pill-value">{Math.round(route.distanceMiles)} mi</span>
            </div>
            <div className="real-map-pill">
              <span className="real-map-pill-label">ETA</span>
              <span className="real-map-pill-value">{formatDuration(route.durationMinutes)}</span>
            </div>
            <div className="real-map-pill real-map-pill--progress">
              <span className="real-map-pill-label">PROG</span>
              <span className="real-map-pill-value">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div
            className="real-map-controls"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
            <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
            <div className="real-map-controls-sep" />
            <button type="button" onClick={resetView} aria-label="Fit route" title="Fit to route">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="4" y="4" width="5" height="5" rx="0.5" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <a
            className="real-map-attribution mono"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OSM
          </a>
        </>
      )}
    </div>
  )
}
