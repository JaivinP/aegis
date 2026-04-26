import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboard } from '../context/KeyboardContext'
import { listShipments } from '../api'

const SAMPLE_SHIPMENTS = [
  { shipmentId: 'AGS-0042', productName: 'Insulin Vials', icon: '💉', status: 'INCIDENT', origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', temperature: 9.4, viability: 71, risk: 'critical', eta: '2h 14m' },
  { shipmentId: 'AGS-0043', productName: 'mRNA Vaccine', icon: '🧬', status: 'IN_TRANSIT', origin: 'San Diego, CA', destination: 'Las Vegas, NV', temperature: -70.2, viability: 98, risk: 'ok', eta: '4h 52m' },
  { shipmentId: 'AGS-0044', productName: 'Biologic Sample', icon: '🔬', status: 'IN_TRANSIT', origin: 'San Francisco, CA', destination: 'Portland, OR', temperature: 5.1, viability: 84, risk: 'warn', eta: '6h 30m' },
  { shipmentId: 'AGS-0045', productName: 'Refrigerated Food', icon: '🧊', status: 'IN_TRANSIT', origin: 'Sacramento, CA', destination: 'Reno, NV', temperature: 3.2, viability: 97, risk: 'ok', eta: '1h 45m' },
  { shipmentId: 'AGS-0046', productName: 'Specialty Medication', icon: '💊', status: 'IN_TRANSIT', origin: 'Oakland, CA', destination: 'Fresno, CA', temperature: 7.8, viability: 79, risk: 'warn', eta: '3h 08m' },
  { shipmentId: 'AGS-0047', productName: 'Lab Specimen', icon: '🧪', status: 'IN_TRANSIT', origin: 'Riverside, CA', destination: 'Tucson, AZ', temperature: 4.0, viability: 96, risk: 'ok', eta: '5h 20m' },
]

const RISK_STYLE = {
  critical: { color: 'var(--red)',   bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
  warn:     { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  ok:       { color: 'var(--teal)',  bg: 'var(--teal-glow)',     border: 'var(--border)' },
}

function SparkBar({ value, color }) {
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  )
}

export default function MissionControl() {
  const { missionControlOpen, setMissionControlOpen, dashboardCtx } = useKeyboard()
  const [shipments, setShipments] = useState(SAMPLE_SHIPMENTS)
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!missionControlOpen) return
    setSelected(0)
    listShipments().then((real) => {
      if (real.length > 0) {
        const mapped = real.map((s) => ({
          shipmentId: s.shipmentId,
          productName: s.productName,
          icon: s.icon || '📦',
          status: s.incidentDetectedAt && s.status === 'IN_TRANSIT' ? 'INCIDENT' : s.status,
          origin: s.origin || '—',
          destination: s.destination || '—',
          temperature: s.tempNominal || 4.0,
          viability: s.incidentDetectedAt ? 71 : 97,
          risk: s.incidentDetectedAt ? 'critical' : s.status === 'IN_TRANSIT' ? 'ok' : 'ok',
          eta: '—',
        }))
        setShipments([...mapped, ...SAMPLE_SHIPMENTS.slice(mapped.length)])
      }
    }).catch(() => {})
  }, [missionControlOpen])

  const handleKey = useCallback((e) => {
    if (!missionControlOpen) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, shipments.length - 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const s = shipments[selected]
      if (s) { setMissionControlOpen(false); navigate(`/shipments/${s.shipmentId}/monitor`) }
    }
  }, [missionControlOpen, selected, shipments, navigate, setMissionControlOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!missionControlOpen) return null

  return (
    <div className="kb-backdrop kb-backdrop--dark" onClick={() => setMissionControlOpen(false)}>
      <div className="kb-mc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-mc-header">
          <div>
            <div className="kb-mc-title mono">MISSION CONTROL</div>
            <div className="kb-mc-sub mono">{shipments.length} active shipments monitored</div>
          </div>
          <div className="kb-mc-hints mono">
            <span><kbd className="kb-key kb-key--xs">↑↓</kbd> navigate</span>
            <span><kbd className="kb-key kb-key--xs">enter</kbd> open</span>
            <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
          </div>
        </div>

        <div className="kb-mc-grid">
          {shipments.map((s, i) => {
            const rs = RISK_STYLE[s.risk] || RISK_STYLE.ok
            const isSelected = i === selected
            return (
              <button
                key={s.shipmentId}
                className={`kb-mc-card ${isSelected ? 'kb-mc-card--selected' : ''} kb-mc-card--${s.risk}`}
                onClick={() => { setMissionControlOpen(false); navigate(`/shipments/${s.shipmentId}/monitor`) }}
                onMouseEnter={() => setSelected(i)}
                style={isSelected ? { borderColor: rs.color, background: rs.bg } : {}}
              >
                <div className="kb-mc-card-top">
                  <span className="kb-mc-icon">{s.icon}</span>
                  <span className="kb-mc-status mono" style={{ color: rs.color, background: rs.bg, border: `1px solid ${rs.border}` }}>
                    {s.status === 'INCIDENT' ? 'INCIDENT' : s.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="kb-mc-name">{s.productName}</div>
                <div className="kb-mc-id mono">{s.shipmentId}</div>
                <div className="kb-mc-route mono">{s.origin} → {s.destination}</div>
                <div className="kb-mc-metrics">
                  <div className="kb-mc-metric">
                    <span className="kb-mc-metric-label mono">TEMP</span>
                    <span className="kb-mc-metric-val mono" style={{ color: s.risk === 'critical' ? 'var(--red)' : 'var(--teal)' }}>
                      {s.temperature}°C
                    </span>
                  </div>
                  <div className="kb-mc-metric">
                    <span className="kb-mc-metric-label mono">VIABILITY</span>
                    <span className="kb-mc-metric-val mono" style={{ color: s.viability < 80 ? 'var(--amber)' : 'var(--teal)' }}>
                      {s.viability}%
                    </span>
                  </div>
                  <div className="kb-mc-metric">
                    <span className="kb-mc-metric-label mono">ETA</span>
                    <span className="kb-mc-metric-val mono">{s.eta}</span>
                  </div>
                </div>
                <SparkBar value={s.viability} color={s.viability < 80 ? 'var(--amber)' : 'var(--teal)'} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
