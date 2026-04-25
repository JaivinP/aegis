// Waypoints in SVG space — approximate positions along a LA→Phoenix route
const WAYPOINTS = [
  { name: 'Los Angeles', short: 'LA', x: 70, y: 195 },
  { name: 'Ontario', short: 'Ontario', x: 155, y: 182 },
  { name: 'Riverside', short: 'Riverside', x: 210, y: 192 },
  { name: 'Indio', short: 'Indio', x: 285, y: 205 },
  { name: 'Phoenix', short: 'PHX', x: 390, y: 178 },
]

const TOTAL_SEGMENTS = WAYPOINTS.length - 1

function getCurrentPos(progress) {
  const frac = (progress / 100) * TOTAL_SEGMENTS
  const segIdx = Math.min(Math.floor(frac), TOTAL_SEGMENTS - 1)
  const segFrac = frac - segIdx
  const from = WAYPOINTS[segIdx]
  const to = WAYPOINTS[segIdx + 1]
  return {
    x: from.x + (to.x - from.x) * segFrac,
    y: from.y + (to.y - from.y) * segFrac,
    segIdx,
    segFrac,
  }
}

export default function RoutePanel({ sensors }) {
  const progress = sensors.routeProgress
  const { x: curX, y: curY, segIdx, segFrac } = getCurrentPos(progress)

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title mono">ROUTE &amp; LOCATION</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--teal)' }}>
            GPS ACTIVE
          </span>
        </div>
      </div>

      <div className="route-info-row">
        <div className="route-info-item">
          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            CURRENT LOCATION
          </span>
          <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600 }}>
            {sensors.location}
          </span>
        </div>
        <div className="route-info-item">
          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            ROUTE PROGRESS
          </span>
          <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <div className="route-svg-container">
        <svg viewBox="0 80 460 160" width="100%" preserveAspectRatio="xMidYMid meet">
          {/* Subtle grid */}
          {[100, 130, 160, 190, 220].map((y) => (
            <line
              key={y}
              x1="40" y1={y} x2="430" y2={y}
              stroke="rgba(0,200,180,0.05)"
              strokeWidth="1"
            />
          ))}

          {/* Full dashed route (gray) */}
          <polyline
            points={WAYPOINTS.map((w) => `${w.x},${w.y}`).join(' ')}
            fill="none"
            stroke="rgba(0,200,180,0.15)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />

          {/* Completed segments (teal) */}
          {WAYPOINTS.slice(0, -1).map((w, i) => {
            const next = WAYPOINTS[i + 1]
            if (i < segIdx) {
              // fully completed
              return (
                <line key={i} x1={w.x} y1={w.y} x2={next.x} y2={next.y}
                  stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" />
              )
            }
            if (i === segIdx && segFrac > 0) {
              // partial
              const px = w.x + (next.x - w.x) * segFrac
              const py = w.y + (next.y - w.y) * segFrac
              return (
                <line key={i} x1={w.x} y1={w.y} x2={px} y2={py}
                  stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" />
              )
            }
            return null
          })}

          {/* Waypoint circles */}
          {WAYPOINTS.map((w, i) => {
            const passed = i <= segIdx || (i === segIdx + 1 && segFrac > 0.9)
            return (
              <g key={i}>
                <circle
                  cx={w.x} cy={w.y} r={5}
                  fill={passed ? 'var(--teal)' : 'var(--bg-card)'}
                  stroke="var(--teal)"
                  strokeWidth="1.5"
                />
                <text
                  x={w.x} y={w.y - 11}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {w.short}
                </text>
              </g>
            )
          })}

          {/* Current position marker */}
          <circle cx={curX} cy={curY} r={10} fill="var(--teal)" opacity="0.15" />
          <circle cx={curX} cy={curY} r={6} fill="var(--teal)" />
          <circle cx={curX} cy={curY} r={3} fill="var(--bg)" />
        </svg>
      </div>

      <div className="route-waypoints">
        <div className="route-endpoint">
          <span className="route-endpoint-dot origin" />
          <div>
            <div className="mono" style={{ fontSize: '0.75rem' }}>Los Angeles, CA</div>
            <div className="route-endpoint-label mono">ORIGIN</div>
          </div>
        </div>
        <div className="route-endpoint">
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '0.75rem' }}>Phoenix, AZ</div>
            <div className="route-endpoint-label mono">DESTINATION</div>
          </div>
          <span className="route-endpoint-dot dest" />
        </div>
      </div>
    </div>
  )
}
