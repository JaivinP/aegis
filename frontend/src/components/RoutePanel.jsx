import RealRouteMap from './RealRouteMap'

export default function RoutePanel({ sensors, shipment }) {
  const progress = sensors.routeProgress
  const origin = shipment?.origin || 'Los Angeles, CA'
  const destination = shipment?.destination || 'Phoenix, AZ'

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title mono">ROUTE &amp; LOCATION</span>
        <div className="flex-row-sm">
          <span className="pulse-dot green pulse-dot--xs" />
          <span className="mono route-gps-label">GPS ACTIVE</span>
        </div>
      </div>

      <div className="route-info-row">
        <div className="route-info-item">
          <span className="mono meta-label">CURRENT LOCATION</span>
          <span className="mono value-accent">{sensors.location}</span>
        </div>
        <div className="route-info-item">
          <span className="mono meta-label">ROUTE PROGRESS</span>
          <span className="mono value-primary">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="route-svg-container">
        <RealRouteMap origin={origin} destination={destination} progress={progress} height={260} />
      </div>

      <div className="route-waypoints">
        <div className="route-endpoint">
          <span className="route-endpoint-dot origin" />
          <div>
            <div className="mono route-place-name">{origin}</div>
            <div className="route-endpoint-label mono">ORIGIN</div>
          </div>
        </div>
        <div className="route-endpoint">
          <div className="text-right">
            <div className="mono route-place-name">{destination}</div>
            <div className="route-endpoint-label mono">DESTINATION</div>
          </div>
          <span className="route-endpoint-dot dest" />
        </div>
      </div>
    </div>
  )
}
