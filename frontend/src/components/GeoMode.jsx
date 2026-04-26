import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboard } from '../context/KeyboardContext'

const WAYPOINTS = [
  { name: 'Los Angeles, CA', x: 80,  y: 280, pct: 0   },
  { name: 'Ontario, CA',     x: 145, y: 270, pct: 22  },
  { name: 'Riverside, CA',   x: 175, y: 295, pct: 42  },
  { name: 'Indio, CA',       x: 235, y: 310, pct: 62  },
  { name: 'Blythe, CA',      x: 310, y: 305, pct: 78  },
  { name: 'Phoenix, AZ',     x: 430, y: 275, pct: 100 },
]

const SAMPLE_SHIPMENTS = [
  { id: 'AGS-0042', name: 'Insulin Vials',        icon: '💉', progress: 52, risk: 'critical', status: 'INCIDENT' },
  { id: 'AGS-0043', name: 'mRNA Vaccine',          icon: '🧬', progress: 30, risk: 'ok',       status: 'IN_TRANSIT' },
  { id: 'AGS-0044', name: 'Biologic Sample',       icon: '🔬', progress: 68, risk: 'warn',     status: 'IN_TRANSIT' },
  { id: 'AGS-0045', name: 'Refrigerated Food',     icon: '🧊', progress: 85, risk: 'ok',       status: 'IN_TRANSIT' },
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

export default function GeoMode() {
  const { geoModeOpen, setGeoModeOpen, dashboardCtx } = useKeyboard()
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()

  const liveShip = dashboardCtx ? {
    id: dashboardCtx.shipmentId || 'AGS-LIVE',
    name: dashboardCtx.shipment?.name || 'Active Shipment',
    icon: dashboardCtx.shipment?.icon || '📦',
    progress: dashboardCtx.sensorsRef?.current?.routeProgress ?? 52,
    risk: dashboardCtx.incidentActiveRef?.current ? 'critical' : 'ok',
    status: dashboardCtx.incidentActiveRef?.current ? 'INCIDENT' : 'IN_TRANSIT',
    live: true,
  } : null

  const shipments = liveShip ? [liveShip, ...SAMPLE_SHIPMENTS.slice(1)] : SAMPLE_SHIPMENTS

  const handleKey = useCallback((e) => {
    if (!geoModeOpen) return
    if (e.key === 'j' || e.key === 'J') { e.preventDefault(); setSelected((i) => Math.min(i + 1, shipments.length - 1)) }
    if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      const s = shipments[selected]
      if (s?.live) return
      setGeoModeOpen(false)
      navigate(`/shipments/${s.id}/monitor`)
    }
  }, [geoModeOpen, selected, shipments, navigate, setGeoModeOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!geoModeOpen) return null

  const routePoints = WAYPOINTS.map((w) => `${w.x},${w.y}`).join(' ')
  const selectedShip = shipments[selected]

  return (
    <div className="kb-backdrop kb-backdrop--dark" onClick={() => setGeoModeOpen(false)}>
      <div className="kb-geo-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-geo-header">
          <div className="kb-geo-title mono">GEO MODE — ACTIVE ROUTES</div>
          <div className="kb-geo-hints mono">
            <span><kbd className="kb-key kb-key--xs">J</kbd><kbd className="kb-key kb-key--xs">K</kbd> select</span>
            <span><kbd className="kb-key kb-key--xs">enter</kbd> open</span>
            <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
          </div>
        </div>

        <div className="kb-geo-body">
          {/* SVG Map */}
          <div className="kb-geo-map">
            <svg viewBox="0 60 540 320" className="kb-geo-svg">
              {/* Background grid */}
              {[...Array(8)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={80 + i * 40} x2="540" y2={80 + i * 40}
                  stroke="rgba(0,200,180,0.04)" strokeWidth="1" />
              ))}
              {[...Array(12)].map((_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="60" x2={i * 50} y2="380"
                  stroke="rgba(0,200,180,0.04)" strokeWidth="1" />
              ))}

              {/* Route line */}
              <polyline
                points={routePoints}
                fill="none"
                stroke="rgba(0,200,180,0.25)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />

              {/* Waypoint dots */}
              {WAYPOINTS.map((w) => (
                <g key={w.name}>
                  <circle cx={w.x} cy={w.y} r={3} fill="rgba(0,200,180,0.4)" />
                  <text x={w.x} y={w.y - 8} fill="rgba(0,200,180,0.5)"
                    fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                    {w.name.split(',')[0].toUpperCase()}
                  </text>
                </g>
              ))}

              {/* Shipment markers */}
              {shipments.map((s, i) => {
                const pos = getPositionAtProgress(s.progress)
                const color = RISK_COLOR[s.risk]
                const isSelected = i === selected
                const offset = i * 12
                return (
                  <g
                    key={s.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(i)}
                  >
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y + offset} r={14} fill={`${color}20`} stroke={color} strokeWidth="1" />
                    )}
                    <circle cx={pos.x} cy={pos.y + offset} r={6} fill={color} />
                    <text x={pos.x + 10} y={pos.y + offset + 4} fill={color}
                      fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                      {s.id}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Map labels */}
            <div className="kb-geo-map-label mono">LA → PHOENIX CORRIDOR</div>
          </div>

          {/* Shipment list */}
          <div className="kb-geo-list">
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
                  </div>
                  <div className="kb-geo-item-right">
                    <div className="kb-geo-item-status mono" style={{ color }}>{s.status.replace('_', ' ')}</div>
                    <div className="kb-geo-item-progress mono">{s.progress.toFixed(0)}%</div>
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
