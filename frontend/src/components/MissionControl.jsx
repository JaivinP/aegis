import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboard } from '../context/KeyboardContext'
import { listShipments } from '../api'
import RealRouteMap from './RealRouteMap'

const RISK_STYLE = {
  critical: { color: 'var(--red)',   bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
  warn:     { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  ok:       { color: 'var(--teal)',  bg: 'var(--teal-glow)',     border: 'var(--border)' },
}

function shipToCard(s, dashboardCtx) {
  const isActive = dashboardCtx?.shipmentId === s.shipmentId
  const hasIncident = !!s.incidentDetectedAt
  const sensors = isActive ? dashboardCtx.sensorsRef?.current : null
  const analysis = isActive ? dashboardCtx.analysisRef?.current : null

  const temperature = sensors?.temperature ?? s.tempNominal ?? 4.0
  const viability = analysis?.viabilityScore ?? (hasIncident ? 71 : 97)
  const risk = hasIncident ? 'critical'
    : (viability < 80 ? 'warn' : 'ok')
  const displayStatus = hasIncident && s.status === 'IN_TRANSIT' ? 'INCIDENT'
    : s.status.replace('_', ' ')

  return {
    shipmentId: s.shipmentId,
    productName: s.productName,
    icon: s.icon || '📦',
    status: displayStatus,
    origin: s.origin || '—',
    destination: s.destination || '—',
    temperature: parseFloat(temperature.toFixed(1)),
    viability: parseFloat(viability.toFixed(1)),
    risk,
    complianceFramework: s.complianceFramework || '',
    tempMin: s.tempMin,
    tempMax: s.tempMax,
    progress: sensors?.routeProgress ?? (s.status === 'COMPLETED' ? 100 : 50),
  }
}

function SparkBar({ value, color }) {
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  )
}

export default function MissionControl() {
  const { missionControlOpen, setMissionControlOpen, dashboardCtx } = useKeyboard()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!missionControlOpen) return
    setSelected(0)
    setLoading(true)
    listShipments()
      .then((shipments) => setCards(shipments.map((s) => shipToCard(s, dashboardCtx))))
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [missionControlOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = useCallback((e) => {
    if (!missionControlOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, cards.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const s = cards[selected]
      if (s) { setMissionControlOpen(false); navigate(`/shipments/${s.shipmentId}/monitor`) }
    }
  }, [missionControlOpen, selected, cards, navigate, setMissionControlOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!missionControlOpen) return null
  const selectedCard = cards[selected]

  return (
    <div className="kb-backdrop kb-backdrop--dark" onClick={() => setMissionControlOpen(false)}>
      <div className="kb-mc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-mc-header">
          <div>
            <div className="kb-mc-title mono">MISSION CONTROL</div>
            <div className="kb-mc-sub mono">
              {loading ? 'Loading shipments…' : `${cards.length} shipment${cards.length !== 1 ? 's' : ''} in system`}
            </div>
          </div>
          <div className="kb-mc-hints mono">
            <span><kbd className="kb-key kb-key--xs">↑↓</kbd> navigate</span>
            <span><kbd className="kb-key kb-key--xs">enter</kbd> open</span>
            <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
            Loading…
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
            No shipments found
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="kb-mc-content">
            {selectedCard && (
              <div className="kb-mc-map-panel">
                <RealRouteMap
                  origin={selectedCard.origin}
                  destination={selectedCard.destination}
                  progress={selectedCard.progress}
                  height={240}
                  compact
                  className="kb-mc-real-map"
                />
                <div className="kb-mc-map-meta">
                  <div>
                    <div className="kb-mc-map-title">{selectedCard.productName}</div>
                    <div className="kb-mc-map-route mono">{selectedCard.origin} → {selectedCard.destination}</div>
                  </div>
                  <div className="kb-mc-map-progress mono">{Math.round(selectedCard.progress)}%</div>
                </div>
              </div>
            )}

            <div className="kb-mc-grid">
              {cards.map((s, i) => {
                const rs = RISK_STYLE[s.risk] || RISK_STYLE.ok
                const isSelected = i === selected
                const tempBad = s.tempMin != null && s.tempMax != null &&
                  (s.temperature < s.tempMin || s.temperature > s.tempMax)
                return (
                  <button
                    key={s.shipmentId}
                    className={`kb-mc-card ${isSelected ? 'kb-mc-card--selected' : ''}`}
                    onClick={() => { setMissionControlOpen(false); navigate(`/shipments/${s.shipmentId}/monitor`) }}
                    onMouseEnter={() => setSelected(i)}
                    style={isSelected ? { borderColor: rs.color, background: rs.bg } : {}}
                  >
                    <div className="kb-mc-card-top">
                      <span className="kb-mc-icon">{s.icon}</span>
                      <span className="kb-mc-status mono" style={{ color: rs.color, background: rs.bg, border: `1px solid ${rs.border}` }}>
                        {s.status}
                      </span>
                    </div>
                    <div className="kb-mc-name">{s.productName}</div>
                    <div className="kb-mc-id mono">{s.shipmentId}</div>
                    <div className="kb-mc-route mono">{s.origin} → {s.destination}</div>
                    {s.complianceFramework && (
                      <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{s.complianceFramework}</div>
                    )}
                    <div className="kb-mc-metrics">
                      <div className="kb-mc-metric">
                        <span className="kb-mc-metric-label mono">TEMP</span>
                        <span className="kb-mc-metric-val mono" style={{ color: tempBad ? 'var(--red)' : 'var(--teal)' }}>
                          {s.temperature}°C
                        </span>
                      </div>
                      <div className="kb-mc-metric">
                        <span className="kb-mc-metric-label mono">VIABILITY</span>
                        <span className="kb-mc-metric-val mono" style={{ color: s.viability < 80 ? 'var(--amber)' : 'var(--teal)' }}>
                          {s.viability}%
                        </span>
                      </div>
                      {s.tempMin != null && s.tempMax != null && (
                        <div className="kb-mc-metric">
                          <span className="kb-mc-metric-label mono">RANGE</span>
                          <span className="kb-mc-metric-val mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                            {s.tempMin}–{s.tempMax}°C
                          </span>
                        </div>
                      )}
                    </div>
                    <SparkBar value={s.viability} color={s.viability < 80 ? 'var(--amber)' : 'var(--teal)'} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
