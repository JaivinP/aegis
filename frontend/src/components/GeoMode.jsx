import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboard } from '../context/KeyboardContext'
import { listShipments } from '../api'

const WAYPOINTS = [
  { name: 'Los Angeles, CA', x: 80,  y: 280, pct: 0   },
  { name: 'Ontario, CA',     x: 145, y: 270, pct: 22  },
  { name: 'Riverside, CA',   x: 175, y: 295, pct: 42  },
  { name: 'Indio, CA',       x: 235, y: 310, pct: 62  },
  { name: 'Blythe, CA',      x: 310, y: 305, pct: 78  },
  { name: 'Phoenix, AZ',     x: 430, y: 275, pct: 100 },
]

function lerp(a, b, t) { return a + (b - a) * t }

function getPositionAtProgress(progress) {
  const pct = Math.max(0, Math.min(100, progress))
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i], b = WAYPOINTS[i + 1]
    if (pct >= a.pct && pct <= b.pct) {
      const t = (pct - a.pct) / (b.pct - a.pct)
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
    }
  }
  return { x: WAYPOINTS[WAYPOINTS.length - 1].x, y: WAYPOINTS[WAYPOINTS.length - 1].y }
}

const RISK_COLOR = { critical: '#ef4444', warn: '#f59e0b', ok: '#00c8b4' }

function shipToGeoItem(s, dashboardCtx) {
  const isActive = dashboardCtx?.shipmentId === s.shipmentId
  const hasIncident = !!s.incidentDetectedAt
  // Use live progress for active shipment, spread others evenly as a fallback
  const progress = isActive
    ? (dashboardCtx.sensorsRef?.current?.routeProgress ?? 50)
    : 50
  return {
    id: s.shipmentId,
    name: s.productName,
    icon: s.icon || '📦',
    progress,
    risk: hasIncident ? 'critical' : 'ok',
    status: hasIncident && s.status === 'IN_TRANSIT' ? 'INCIDENT' : s.status,
    origin: s.origin || '—',
    destination: s.destination || '—',
    live: isActive,
  }
}

export default function GeoMode() {
  const { geoModeOpen, setGeoModeOpen, dashboardCtx } = useKeyboard()
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!geoModeOpen) return
    setSelected(0)
    setLoading(true)
    listShipments()
      .then((all) => {
        const active = all.filter((s) => ['IN_TRANSIT', 'CONNECTING', 'ESCALATED'].includes(s.status))
        // Space active shipments evenly across the route for visual variety
        const mapped = active.map((s, i) => {
          const item = shipToGeoItem(s, dashboardCtx)
          if (!item.live) {
            // Distribute non-live shipments across the route so they don't all overlap
            item.progress = Math.round(10 + (i / Math.max(active.length - 1, 1)) * 80)
          }
          return item
        })
        setShipments(mapped)
      })
      .catch(() => setShipments([]))
      .finally(() => setLoading(false))
  }, [geoModeOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = useCallback((e) => {
    if (!geoModeOpen) return
    if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, shipments.length - 1))
    }
    if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      const s = shipments[selected]
      if (s) { setGeoModeOpen(false); navigate(`/shipments/${s.id}/monitor`) }
    }
  }, [geoModeOpen, selected, shipments, navigate, setGeoModeOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!geoModeOpen) return null

  const routePoints = WAYPOINTS.map((w) => `${w.x},${w.y}`).join(' ')

  return (
    <div className="kb-backdrop kb-backdrop--dark" onClick={() => setGeoModeOpen(false)}>
      <div className="kb-geo-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-geo-header">
          <div className="kb-geo-title mono">GEO MODE — ACTIVE ROUTES</div>
          <div className="kb-geo-hints mono">
            <span><kbd className="kb-key kb-key--xs">↑↓</kbd> select</span>
            <span><kbd className="kb-key kb-key--xs">enter</kbd> open</span>
            <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
          </div>
        </div>

        <div className="kb-geo-body">
          <div className="kb-geo-map">
            <svg viewBox="0 60 540 320" className="kb-geo-svg">
              {[...Array(8)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={80 + i * 40} x2="540" y2={80 + i * 40}
                  stroke="rgba(0,200,180,0.04)" strokeWidth="1" />
              ))}
              {[...Array(12)].map((_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="60" x2={i * 50} y2="380"
                  stroke="rgba(0,200,180,0.04)" strokeWidth="1" />
              ))}

              <polyline
                points={routePoints}
                fill="none"
                stroke="rgba(0,200,180,0.25)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />

              {WAYPOINTS.map((w) => (
                <g key={w.name}>
                  <circle cx={w.x} cy={w.y} r={3} fill="rgba(0,200,180,0.4)" />
                  <text x={w.x} y={w.y - 8} fill="rgba(0,200,180,0.5)"
                    fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                    {w.name.split(',')[0].toUpperCase()}
                  </text>
                </g>
              ))}

              {!loading && shipments.map((s, i) => {
                const pos = getPositionAtProgress(s.progress)
                const color = RISK_COLOR[s.risk]
                const isSelected = i === selected
                const yOffset = i * 14
                return (
                  <g key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(i)}>
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y + yOffset} r={14} fill={`${color}20`} stroke={color} strokeWidth="1" />
                    )}
                    <circle cx={pos.x} cy={pos.y + yOffset} r={6} fill={color} />
                    <text x={pos.x + 10} y={pos.y + yOffset + 4} fill={color}
                      fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                      {s.id}
                    </text>
                  </g>
                )
              })}
            </svg>
            <div className="kb-geo-map-label mono">LA → PHOENIX CORRIDOR</div>
          </div>

          <div className="kb-geo-list">
            {loading && (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}>
                Loading…
              </div>
            )}
            {!loading && shipments.length === 0 && (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}>
                No active shipments
              </div>
            )}
            {shipments.map((s, i) => {
              const color = RISK_COLOR[s.risk]
              const isSelected = i === selected
              return (
                <button
                  key={s.id}
                  className={`kb-geo-item ${isSelected ? 'kb-geo-item--selected' : ''}`}
                  style={isSelected ? { borderColor: color } : {}}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => { setGeoModeOpen(false); navigate(`/shipments/${s.id}/monitor`) }}
                >
                  <span className="kb-geo-item-icon">{s.icon}</span>
                  <div className="kb-geo-item-info">
                    <div className="kb-geo-item-name">{s.name}</div>
                    <div className="kb-geo-item-id mono">{s.id}</div>
                    {s.origin && s.destination && s.origin !== '—' && (
                      <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.origin} → {s.destination}
                      </div>
                    )}
                  </div>
                  <div className="kb-geo-item-right">
                    <div className="kb-geo-item-status mono" style={{ color }}>{s.status.replace('_', ' ')}</div>
                    {s.live && <div className="kb-geo-item-progress mono" style={{ color: 'var(--teal)' }}>{s.progress.toFixed(0)}%</div>}
                  </div>
                  {isSelected && <span className="kb-geo-item-indicator" style={{ background: color }} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
