import { useState, useEffect, useRef } from 'react'
import SensorPanel from './SensorPanel'
import AIAnalysisPanel from './AIAnalysisPanel'
import RoutePanel from './RoutePanel'
import TimelinePanel from './TimelinePanel'
import { addEvent } from '../api'

function postEvent(shipmentId, label, type, severity, time) {
  addEvent(shipmentId, {
    shipmentId,
    type: type === 'alert' ? 'SHOCK_EVENT' : type === 'doc' ? 'ESCALATION' : 'AI_ANALYSIS',
    severity: severity || (type === 'alert' ? 'CRITICAL' : 'INFO'),
    title: label,
    description: label,
    timestamp: (time || new Date()).toISOString(),
  }).catch(() => {})
}

const ROUTE_LOCATIONS = [
  [0, 22, 'Los Angeles, CA'],
  [22, 42, 'Ontario, CA'],
  [42, 62, 'Riverside, CA'],
  [62, 82, 'Indio, CA'],
  [82, 100, 'Phoenix, AZ'],
]

function getLocation(progress) {
  for (const [min, max, name] of ROUTE_LOCATIONS) {
    if (progress >= min && progress < max) return name
  }
  return 'Phoenix, AZ'
}

function getNominalSensors(shipment) {
  return {
    temperature: shipment.tempNominal,
    humidity: shipment.humidityNominal,
    shockCount: 0,
    waterExposure: 'DRY',
    sealStatus: 'INTACT',
    battery: 94,
    location: 'Los Angeles, CA',
    routeProgress: 18,
  }
}

function getNominalAnalysis(shipment) {
  return {
    status: 'NOMINAL',
    viabilityScore: 97.8,
    degradationRisk: 2.4,
    narrative: `Temperature stable within ${shipment.name.toLowerCase()} tolerance window. No evidence of seal breach. Humidity within acceptable range. All parameters consistent with expected cold-chain profile.`,
    sealBreachConfidence: 1.2,
    tamperingConfidence: 0.8,
    negligenceConfidence: 2.1,
  }
}

function getInitialTimeline() {
  const now = Date.now()
  return [
    { time: new Date(now - 195000), label: 'Shipment initiated — container sealed', type: 'info' },
    { time: new Date(now - 180000), label: 'Aegis container connected successfully', type: 'info' },
    { time: new Date(now - 172000), label: 'Baseline sensor readings established', type: 'info' },
    { time: new Date(now - 140000), label: 'GPS lock acquired — route tracking active', type: 'info' },
  ]
}

// Normalize DB shipment (productName, tempMin, etc.) to the shape the dashboard expects
function normalizeShipment(s) {
  return {
    name: s.productName || s.name || 'Unknown',
    tempNominal: s.tempNominal ?? 4.2,
    tempMin: s.tempMin ?? 2,
    tempMax: s.tempMax ?? 8,
    humidityNominal: s.humidityNominal ?? 38,
    humidityMin: s.humidityMin ?? 30,
    humidityMax: s.humidityMax ?? 50,
    complianceFramework: s.complianceFramework || '',
    icon: s.icon || '📦',
  }
}

export default function MonitoringDashboard({ shipment: rawShipment, shipmentId: propShipmentId, onEndDelivery }) {
  const shipment = normalizeShipment(rawShipment)
  const [sensors, setSensors] = useState(() => getNominalSensors(shipment))
  const [analysis, setAnalysis] = useState(() => getNominalAnalysis(shipment))
  const [timeline, setTimeline] = useState(getInitialTimeline)
  const [incidentActive, setIncidentActive] = useState(false)
  const incidentRef = useRef(false)

  const generatedId = useRef(`AGS-${Math.floor(Math.random() * 9000) + 1000}`).current
  const shipmentId = propShipmentId || generatedId

  // Live nominal jitter every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (incidentRef.current) return
      setSensors((prev) => {
        const newProgress = Math.min(prev.routeProgress + 0.25, 95)
        return {
          ...prev,
          temperature: parseFloat(
            (shipment.tempNominal + (Math.random() - 0.5) * 0.4).toFixed(1)
          ),
          humidity: Math.round(shipment.humidityNominal + (Math.random() - 0.5) * 3),
          routeProgress: newProgress,
          location: getLocation(newProgress),
        }
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [shipment])

  function triggerIncident() {
    if (incidentActive) return
    setIncidentActive(true)
    incidentRef.current = true

    const t0 = new Date()

    // Immediate: physical event
    setSensors((prev) => ({
      ...prev,
      shockCount: 3,
      waterExposure: 'DETECTED',
      sealStatus: 'COMPROMISED',
    }))
    setTimeline((prev) => [
      ...prev,
      { time: t0, label: 'Shock event detected — 3.8g impact recorded', type: 'alert' },
    ])
    postEvent(shipmentId, 'Shock event detected — 3.8g impact recorded', 'alert', 'CRITICAL', t0)

    // +1.5s: thermal excursion
    setTimeout(() => {
      setSensors((prev) => ({
        ...prev,
        temperature: parseFloat((shipment.tempMax + 1.8).toFixed(1)),
        humidity: Math.min(shipment.humidityMax + 18, 98),
        routeProgress: Math.min(prev.routeProgress + 2, 95),
        location: getLocation(Math.min(prev.routeProgress + 2, 95)),
      }))
      const t1 = new Date()
      setTimeline((prev) => [
        ...prev,
        { time: t1, label: 'Temperature anomaly — excursion above safe threshold detected', type: 'alert' },
      ])
      postEvent(shipmentId, 'Temperature anomaly — excursion above safe threshold detected', 'alert', 'CRITICAL', t1)
    }, 1500)

    // +2.8s: AI classification
    setTimeout(() => {
      setAnalysis({
        status: 'CRITICAL',
        viabilityScore: 71.2,
        degradationRisk: 31.4,
        narrative:
          'Shock event followed by humidity increase and accelerated warming. Probable seal compromise detected. Pattern is inconsistent with normal refrigeration drift. Multi-sensor correlation indicates physical mishandling. Escalation packet has been drafted.',
        sealBreachConfidence: 87.3,
        tamperingConfidence: 74.1,
        negligenceConfidence: 62.8,
      })
      const t2 = new Date()
      setTimeline((prev) => [
        ...prev,
        { time: t2, label: 'AI classified incident — CRITICAL', type: 'alert' },
      ])
      postEvent(shipmentId, 'AI classified incident — CRITICAL', 'ai', 'CRITICAL', t2)
    }, 2800)

    // +4s: response documents drafted
    setTimeout(() => {
      const now = new Date()
      setTimeline((prev) => [
        ...prev,
        { time: now, label: 'FDA deviation report drafted', type: 'doc' },
        { time: now, label: 'Receiver notification drafted', type: 'doc' },
        { time: now, label: 'Insurance claim draft opened', type: 'doc' },
        { time: now, label: 'Quarantine recommendation prepared', type: 'doc' },
      ])
    }, 4000)
  }

  function handleEndDelivery() {
    onEndDelivery({ sensors, analysis, timeline, incidentActive })
  }

  return (
    <div className="dashboard">
      <div className="dashboard-topbar">
        <div className="dashboard-shipment-info">
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            ACTIVE SHIPMENT
          </span>
          <span className="mono" style={{ fontSize: '0.9rem', color: 'var(--teal)', fontWeight: 700 }}>
            {shipment.name}
          </span>
          <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ID: {shipmentId}
          </span>
          <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {shipment.complianceFramework}
          </span>
        </div>
        <div className="dashboard-controls">
          {!incidentActive ? (
            <button className="btn-incident" onClick={triggerIncident}>
              ⚡ Simulate Mishandling Incident
            </button>
          ) : (
            <span className="incident-badge mono">INCIDENT ACTIVE</span>
          )}
          <button className="btn-end-delivery" onClick={handleEndDelivery}>
            End Delivery →
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <SensorPanel sensors={sensors} shipment={shipment} />
        <AIAnalysisPanel analysis={analysis} />
        <RoutePanel sensors={sensors} shipment={shipment} />
        <TimelinePanel timeline={timeline} />
      </div>
    </div>
  )
}
