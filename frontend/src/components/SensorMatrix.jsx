import { useState, useEffect, useCallback } from 'react'
import { useKeyboard } from '../context/KeyboardContext'

const SENSORS_COLS = ['TEMP', 'HUMIDITY', 'SHOCK', 'SEAL', 'WATER', 'BATTERY', 'GPS', 'VIABILITY']

const MATRIX_DATA = [
  { id: 'AGS-0042', name: 'Insulin Vials',        icon: '💉', temp: 9.4,  humidity: 74, shock: 3, seal: 'BREACH', water: 'WET',  battery: 81, gps: 'ACTIVE', viability: 71,  tempOk: false, humOk: false },
  { id: 'AGS-0043', name: 'mRNA Vaccine',          icon: '🧬', temp: -70.2, humidity: 28, shock: 0, seal: 'OK',     water: 'DRY',  battery: 94, gps: 'ACTIVE', viability: 98,  tempOk: true,  humOk: true  },
  { id: 'AGS-0044', name: 'Biologic Sample',       icon: '🔬', temp: 5.1,  humidity: 46, shock: 0, seal: 'OK',     water: 'DRY',  battery: 67, gps: 'ACTIVE', viability: 84,  tempOk: true,  humOk: false },
  { id: 'AGS-0045', name: 'Refrigerated Food',     icon: '🧊', temp: 3.2,  humidity: 38, shock: 0, seal: 'OK',     water: 'DRY',  battery: 89, gps: 'ACTIVE', viability: 97,  tempOk: true,  humOk: true  },
  { id: 'AGS-0046', name: 'Specialty Medication',  icon: '💊', temp: 7.8,  humidity: 52, shock: 1, seal: 'OK',     water: 'DRY',  battery: 55, gps: 'ACTIVE', viability: 79,  tempOk: true,  humOk: false },
  { id: 'AGS-0047', name: 'Lab Specimen',          icon: '🧪', temp: 4.0,  humidity: 35, shock: 0, seal: 'OK',     water: 'DRY',  battery: 92, gps: 'ACTIVE', viability: 96,  tempOk: true,  humOk: true  },
]

function statusColor(ok, warn) {
  if (ok === false || warn === 'alert') return 'var(--red)'
  if (warn === 'warn') return 'var(--amber)'
  return 'var(--teal)'
}

function Cell({ value, ok, warn, centered }) {
  const color = statusColor(ok, warn)
  return (
    <div className="kb-sm-cell mono" style={{ color, textAlign: centered ? 'center' : undefined }}>
      {value}
    </div>
  )
}

export default function SensorMatrix() {
  const { sensorMatrixOpen, setSensorMatrixOpen, dashboardCtx } = useKeyboard()
  const [row, setRow] = useState(0)
  const [col, setCol] = useState(0)

  // Inject live data for first row if on monitor page
  const liveRow = dashboardCtx ? {
    ...MATRIX_DATA[0],
    id: dashboardCtx.shipmentId || MATRIX_DATA[0].id,
    name: dashboardCtx.shipment?.name || MATRIX_DATA[0].name,
    temp: dashboardCtx.sensorsRef?.current?.temperature ?? MATRIX_DATA[0].temp,
    humidity: dashboardCtx.sensorsRef?.current?.humidity ?? MATRIX_DATA[0].humidity,
    shock: dashboardCtx.sensorsRef?.current?.shockCount ?? MATRIX_DATA[0].shock,
    seal: dashboardCtx.sensorsRef?.current?.sealStatus === 'COMPROMISED' ? 'BREACH' : 'OK',
    water: dashboardCtx.sensorsRef?.current?.waterExposure === 'DETECTED' ? 'WET' : 'DRY',
    battery: dashboardCtx.sensorsRef?.current?.battery ?? MATRIX_DATA[0].battery,
    viability: dashboardCtx.analysisRef?.current?.viabilityScore ?? MATRIX_DATA[0].viability,
  } : null

  const rows = liveRow ? [liveRow, ...MATRIX_DATA.slice(1)] : MATRIX_DATA

  const handleKey = useCallback((e) => {
    if (!sensorMatrixOpen) return
    if (e.key === 'ArrowDown')  { e.preventDefault(); setRow((r) => Math.min(r + 1, rows.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setRow((r) => Math.max(r - 1, 0)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setCol((c) => Math.min(c + 1, SENSORS_COLS.length - 1)) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setCol((c) => Math.max(c - 1, 0)) }
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
            <div className="kb-sm-sub mono">Live readings across all monitored shipments</div>
          </div>
          <div className="kb-sm-hints mono">
            <span><kbd className="kb-key kb-key--xs">↑↓←→</kbd> navigate</span>
            <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
          </div>
        </div>

        <div className="kb-sm-table-wrap">
          <table className="kb-sm-table">
            <thead>
              <tr>
                <th className="kb-sm-th kb-sm-th--ship mono">SHIPMENT</th>
                {SENSORS_COLS.map((c, ci) => (
                  <th key={c} className={`kb-sm-th mono ${ci === col ? 'kb-sm-th--active' : ''}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const isRowSel = ri === row
                const tempBad = r.tempOk === false
                const humBad  = !r.humOk
                return (
                  <tr
                    key={r.id}
                    className={`kb-sm-tr ${isRowSel ? 'kb-sm-tr--selected' : ''}`}
                    onMouseEnter={() => setRow(ri)}
                  >
                    <td className="kb-sm-td kb-sm-td--ship">
                      <span className="kb-sm-ship-icon">{r.icon}</span>
                      <div>
                        <div className="kb-sm-ship-name">{r.name}</div>
                        <div className="kb-sm-ship-id mono">{r.id}</div>
                      </div>
                    </td>
                    <td className="kb-sm-td mono" style={{ color: tempBad ? 'var(--red)' : 'var(--teal)' }}>{r.temp}°C</td>
                    <td className="kb-sm-td mono" style={{ color: humBad ? 'var(--amber)' : 'var(--teal)' }}>{r.humidity}%</td>
                    <td className="kb-sm-td mono" style={{ color: r.shock > 0 ? 'var(--red)' : 'var(--teal)' }}>{r.shock}</td>
                    <td className="kb-sm-td mono" style={{ color: r.seal === 'BREACH' ? 'var(--red)' : 'var(--teal)' }}>{r.seal}</td>
                    <td className="kb-sm-td mono" style={{ color: r.water === 'WET' ? 'var(--red)' : 'var(--teal)' }}>{r.water}</td>
                    <td className="kb-sm-td mono" style={{ color: r.battery < 60 ? 'var(--amber)' : 'var(--teal)' }}>{r.battery}%</td>
                    <td className="kb-sm-td mono" style={{ color: 'var(--teal)' }}>{r.gps}</td>
                    <td className="kb-sm-td mono" style={{ color: r.viability < 80 ? 'var(--amber)' : 'var(--teal)' }}>{r.viability}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
