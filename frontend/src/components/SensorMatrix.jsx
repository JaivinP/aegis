import { useState, useEffect, useCallback } from 'react'
import { useKeyboard } from '../context/KeyboardContext'
import { listShipments } from '../api'

const SENSORS_COLS = ['TEMP', 'HUMIDITY', 'SHOCK', 'SEAL', 'WATER', 'BATTERY', 'GPS', 'VIABILITY']

function shipToRow(s, dashboardCtx) {
  const isActive = dashboardCtx?.shipmentId === s.shipmentId
  const hasIncident = !!s.incidentDetectedAt
  const sensors = isActive ? dashboardCtx.sensorsRef?.current : null
  const analysis = isActive ? dashboardCtx.analysisRef?.current : null

  const temp      = sensors?.temperature  ?? s.tempNominal     ?? 4.0
  const humidity  = sensors?.humidity     ?? s.humidityNominal ?? 38
  const shock     = sensors?.shockCount   ?? (hasIncident ? 3 : 0)
  const seal      = sensors
    ? (sensors.sealStatus === 'COMPROMISED' ? 'BREACH' : 'OK')
    : (hasIncident ? 'BREACH' : 'OK')
  const water     = sensors
    ? (sensors.waterExposure === 'DETECTED' ? 'WET' : 'DRY')
    : (hasIncident ? 'WET' : 'DRY')
  const battery   = sensors?.battery      ?? 90
  const viability = analysis?.viabilityScore ?? (hasIncident ? 71 : 97)

  const tempOk = s.tempMin != null && s.tempMax != null
    ? temp >= s.tempMin && temp <= s.tempMax
    : true
  const humOk = s.humidityMin != null && s.humidityMax != null
    ? humidity >= s.humidityMin && humidity <= s.humidityMax
    : true

  return {
    id: s.shipmentId,
    name: s.productName,
    icon: s.icon || '📦',
    temp: parseFloat(temp.toFixed(1)),
    humidity: Math.round(humidity),
    shock,
    seal,
    water,
    battery: Math.round(battery),
    gps: ['IN_TRANSIT', 'CONNECTING'].includes(s.status) ? 'ACTIVE' : 'IDLE',
    viability: parseFloat(viability.toFixed(1)),
    tempOk,
    humOk,
  }
}

export default function SensorMatrix() {
  const { sensorMatrixOpen, setSensorMatrixOpen, dashboardCtx } = useKeyboard()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRow, setSelectedRow] = useState(0)
  const [selectedCol, setSelectedCol] = useState(0)

  useEffect(() => {
    if (!sensorMatrixOpen) return
    setSelectedRow(0)
    setLoading(true)
    listShipments()
      .then((shipments) => setRows(shipments.map((s) => shipToRow(s, dashboardCtx))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [sensorMatrixOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = useCallback((e) => {
    if (!sensorMatrixOpen) return
    if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedRow((r) => Math.min(r + 1, rows.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setSelectedRow((r) => Math.max(r - 1, 0)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedCol((c) => Math.min(c + 1, SENSORS_COLS.length - 1)) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelectedCol((c) => Math.max(c - 1, 0)) }
  }, [sensorMatrixOpen, rows.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!sensorMatrixOpen) return null

  return (
    <div className="kb-backdrop" onClick={() => setSensorMatrixOpen(false)}>
      <div className="kb-sm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-sm-header">
          <div>
            <div className="kb-sm-title mono">SENSOR MATRIX</div>
            <div className="kb-sm-sub mono">
              {loading ? 'Loading…' : `Live readings — ${rows.length} shipment${rows.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="kb-sm-hints mono">
            <span><kbd className="kb-key kb-key--xs">↑↓</kbd> rows</span>
            <span><kbd className="kb-key kb-key--xs">←→</kbd> columns</span>
            <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
          </div>
        </div>

        <div className="kb-sm-table-wrap">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
              Loading sensor data…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
              No shipments found
            </div>
          ) : (
            <table className="kb-sm-table">
              <thead>
                <tr>
                  <th className="kb-sm-th kb-sm-th--ship mono">SHIPMENT</th>
                  {SENSORS_COLS.map((c, ci) => (
                    <th key={c} className={`kb-sm-th mono ${ci === selectedCol ? 'kb-sm-th--active' : ''}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr
                    key={r.id}
                    className={`kb-sm-tr ${ri === selectedRow ? 'kb-sm-tr--selected' : ''}`}
                    onMouseEnter={() => setSelectedRow(ri)}
                  >
                    <td className="kb-sm-td kb-sm-td--ship">
                      <span className="kb-sm-ship-icon">{r.icon}</span>
                      <div>
                        <div className="kb-sm-ship-name">{r.name}</div>
                        <div className="kb-sm-ship-id mono">{r.id}</div>
                      </div>
                    </td>
                    <td className="kb-sm-td mono" style={{ color: !r.tempOk ? 'var(--red)' : 'var(--teal)' }}>{r.temp}°C</td>
                    <td className="kb-sm-td mono" style={{ color: !r.humOk  ? 'var(--amber)' : 'var(--teal)' }}>{r.humidity}%</td>
                    <td className="kb-sm-td mono" style={{ color: r.shock > 0 ? 'var(--red)' : 'var(--teal)' }}>{r.shock}</td>
                    <td className="kb-sm-td mono" style={{ color: r.seal === 'BREACH' ? 'var(--red)' : 'var(--teal)' }}>{r.seal}</td>
                    <td className="kb-sm-td mono" style={{ color: r.water === 'WET' ? 'var(--red)' : 'var(--teal)' }}>{r.water}</td>
                    <td className="kb-sm-td mono" style={{ color: r.battery < 60 ? 'var(--amber)' : 'var(--teal)' }}>{r.battery}%</td>
                    <td className="kb-sm-td mono" style={{ color: r.gps === 'ACTIVE' ? 'var(--teal)' : 'var(--text-muted)' }}>{r.gps}</td>
                    <td className="kb-sm-td mono" style={{ color: r.viability < 80 ? 'var(--amber)' : 'var(--teal)' }}>{r.viability}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
