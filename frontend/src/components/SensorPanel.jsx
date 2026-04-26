export default function SensorPanel({ sensors, shipment }) {
  const tempStatus = getTempStatus(sensors.temperature, shipment)
  const humidityStatus = getHumidityStatus(sensors.humidity, shipment)
  const tempBarPct = getTempBarPct(sensors.temperature, shipment)
  const tempRange = `${shipment.tempMin}°C – ${shipment.tempMax}°C`
  const humidityRange = `${shipment.humidityMin}% – ${shipment.humidityMax}%`

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title mono">SENSOR READINGS</span>
        <span className="pulse-dot green" />
      </div>
      <div className="sensor-readings-grid">
        <SensorRow
          label="TEMPERATURE"
          value={`${sensors.temperature.toFixed(1)}°C`}
          subLabel={`Safe: ${tempRange}`}
          status={tempStatus}
          barPct={tempBarPct}
        />
        <SensorRow
          label="HUMIDITY"
          value={`${sensors.humidity}%`}
          subLabel={`Safe: ${humidityRange}`}
          status={humidityStatus}
          barPct={Math.min(sensors.humidity, 100)}
        />
        <SensorRow
          label="SHOCK EVENTS"
          value={sensors.shockDetected === 0 ? 'SAFE' : 'DANGER' }
          subLabel="Threshold: 0 events"
          status={sensors.shockDetected > 0 ? 'alert' : 'ok'}
        />
        <SensorRow
          label="WATER EXPOSURE"
          value={sensors.water < 30 ? 'DRY': 'WET'}
          subLabel="Protection: IP67"
          status={sensors.water < 30 ? 'ok' : 'alert'}
        />
        <SensorRow
          label="SEAL STATUS"
          value={sensors.sealStatus}
          subLabel="Tamper-evident seal"
          status={sensors.sealStatus === 'INTACT' ? 'ok' : 'alert'}
        />
        <SensorRow
          label="LIGHT LEVEL"
          value={`${sensors.light}%`}
          status={sensors.light < 20 ? 'ok' : 'warn'}
          barPct={sensors.light}
        />
        <SensorRow
          label="GPS / LOCATION"
          value={sensors.location}
          subLabel="Active tracking"
          status="ok"
          isText
        />
        <SensorRow
          label="ROUTE PROGRESS"
          value={`${Math.round(sensors.routeProgress)}%`}
          subLabel={`${shipment.origin} → ${shipment.destination}`}
          status="ok"
          barPct={sensors.routeProgress}
        />
      </div>
    </div>
  )
}

function SensorRow({ label, value, subLabel, status, barPct, isText }) {
  const statusColor =
    status === 'ok' ? 'var(--teal)' : status === 'warn' ? 'var(--amber)' : 'var(--red)'

  return (
    <div className={`sensor-row sensor-row--${status}`}>
      <div className="sensor-row-label mono">{label}</div>
      <div className="sensor-row-value mono" style={{ color: statusColor }}>
        {value}
      </div>
      {barPct !== undefined && !isText && (
        <div className="sensor-row-bar">
          <div
            className="sensor-row-bar-fill"
            style={{ width: `${Math.max(0, Math.min(barPct, 100))}%`, background: statusColor }}
          />
        </div>
      )}
      <div className="sensor-row-sub">{subLabel}</div>
    </div>
  )
}

function getTempStatus(temp, shipment) {
  if (temp < shipment.tempMin || temp > shipment.tempMax) return 'alert'
  const buffer = (shipment.tempMax - shipment.tempMin) * 0.1
  if (temp > shipment.tempMax - buffer || temp < shipment.tempMin + buffer) return 'warn'
  return 'ok'
}

function getHumidityStatus(humidity, shipment) {
  if (humidity < shipment.humidityMin || humidity > shipment.humidityMax) return 'alert'
  return 'ok'
}

function getTempBarPct(temp, shipment) {
  const range = shipment.tempMax - shipment.tempMin
  if (range === 0) return 50
  return Math.max(0, Math.min(100, ((temp - shipment.tempMin) / range) * 100))
}
