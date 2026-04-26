import { useState, useEffect, useRef } from 'react'

const STEPS = [
  { label: 'Searching for Aegis container', duration: 700 },
  { label: 'Sensor module found — firmware v2.4.1', duration: 450 },
  { label: 'Temperature sensor calibrated', duration: 550 },
  { label: 'Humidity sensor calibrated', duration: 500 },
  { label: 'Shock sensor armed', duration: 420 },
  { label: 'Water exposure sensor armed', duration: 420 },
  { label: 'GPS signal acquired', duration: 650 },
  { label: 'Chain-of-custody log initialized', duration: 480 },
]

export default function ContainerConnection({ shipment, onComplete }) {
  const [completedSteps, setCompletedSteps] = useState(0)
  const [ready, setReady] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const timers = []
    let cumulative = 0

    STEPS.forEach((step, i) => {
      cumulative += step.duration
      timers.push(
        setTimeout(() => setCompletedSteps(i + 1), cumulative)
      )
    })

    // Show ready state then auto-advance
    const readyTimer = setTimeout(() => setReady(true), cumulative + 200)
    const advanceTimer = setTimeout(() => onCompleteRef.current(), cumulative + 1400)
    timers.push(readyTimer, advanceTimer)

    return () => timers.forEach(clearTimeout)
  }, []) // runs once on mount

  const progress = (completedSteps / STEPS.length) * 100

  return (
    <div className="page-content">
      <div className="page-inner page-inner--narrow">
        <div className="page-header">
          <div className="section-label mono">CONTAINER INITIALIZATION</div>
          <h1 className="page-title">Connecting Aegis Container</h1>
          <div className="connect-shipment-badge mono">
            {(shipment.productName || shipment.name || 'SHIPMENT').toUpperCase()}
            {shipment.tempMin != null && shipment.tempMax != null
              ? ` — ${shipment.tempMin}°C – ${shipment.tempMax}°C`
              : shipment.tempRange ? ` — ${shipment.tempRange}` : ''}
          </div>
        </div>

        <div className="connect-progress-bar">
          <div className="connect-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="connect-steps">
          {STEPS.map((step, i) => {
            const state =
              i < completedSteps ? 'done' : i === completedSteps ? 'active' : 'pending'
            return (
              <div key={i} className={`connect-step connect-step--${state}`}>
                <div className="connect-step-icon">
                  {state === 'done' ? (
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
                  ) : state === 'active' ? (
                    <span className="spinner" />
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>○</span>
                  )}
                </div>
                <span className="connect-step-label mono">{step.label}</span>
              </div>
            )
          })}
        </div>

        {ready && (
          <div className="connect-ready">
            <span className="pulse-dot green" />
            <span className="mono connect-ready-text">
              All systems nominal. Launching monitoring dashboard…
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
