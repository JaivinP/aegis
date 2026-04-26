import RealRouteMap from './RealRouteMap'

export default function RoutePanel({ sensors, shipment }) {
  const progress = sensors.routeProgress
  const origin = shipment?.origin || 'Los Angeles, CA'
  const destination = shipment?.destination || 'Phoenix, AZ'

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
        <RealRouteMap origin={origin} destination={destination} progress={progress} height={260} />
      </div>

      <div className="route-waypoints">
        <div className="route-endpoint">
          <span className="route-endpoint-dot origin" />
          <div>
            <div className="mono" style={{ fontSize: '0.75rem' }}>{origin}</div>
            <div className="route-endpoint-label mono">ORIGIN</div>
          </div>
        </div>
        <div className="route-endpoint">
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '0.75rem' }}>{destination}</div>
            <div className="route-endpoint-label mono">DESTINATION</div>
          </div>
          <span className="route-endpoint-dot dest" />
        </div>
      </div>
    </div>
  )
}
