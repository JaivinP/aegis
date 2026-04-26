import { useState, useEffect, useRef } from 'react'
import SensorPanel from './SensorPanel'
import AIAnalysisPanel from './AIAnalysisPanel'
import RoutePanel from './RoutePanel'
import TimelinePanel from './TimelinePanel'
import SensorCharts from './SensorCharts'
import PhotoRequestPanel from './PhotoRequestPanel'
import ActiveShipmentSwitcher from './ActiveShipmentSwitcher'
import { addEvent, updateShipment } from '../api'
import {
  createNarrativeIncidentOutput,
} from '../data/agentOutputs'

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
  const generatedId = useRef(`AGS-${Math.floor(Math.random() * 9000) + 1000}`).current
  const shipmentId = propShipmentId || generatedId
  const [sensors, setSensors] = useState(() => getNominalSensors(shipment))
  const [analysis, setAnalysis] = useState(() => getNominalAnalysis(shipment))
  const [timeline, setTimeline] = useState(getInitialTimeline)
  const [incidentActive, setIncidentActive] = useState(false)
  const [activeAgentEvent, setActiveAgentEvent] = useState(null)
  const [agentLog, setAgentLog] = useState([])

  // Sensor history for charts (last 60 readings)
  const [sensorHistory, setSensorHistory] = useState(() => [{
    ts: Date.now(),
    temperature: shipment.tempNominal,
    humidity: shipment.humidityNominal,
  }])
  const incidentRef = useRef(false)

  // Live nominal jitter every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (incidentRef.current) return
      setSensors((prev) => {
        const newProgress = Math.min(prev.routeProgress + 0.25, 95)
        const newTemp = parseFloat((shipment.tempNominal + (Math.random() - 0.5) * 0.4).toFixed(1))
        const newHumidity = Math.round(shipment.humidityNominal + (Math.random() - 0.5) * 3)
        setSensorHistory((h) => [
          ...h.slice(-59),
          { ts: Date.now(), temperature: newTemp, humidity: newHumidity },
        ])
        return {
          ...prev,
          temperature: newTemp,
          humidity: newHumidity,
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

    // Immediately flag incident in DB so dashboard + global poller can detect it
    updateShipment(shipmentId, { incidentDetectedAt: new Date().toISOString() }).catch(() => {})

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
      const excursionTemp = parseFloat((shipment.tempMax + 1.8).toFixed(1))
      const excursionHumidity = Math.min(shipment.humidityMax + 18, 98)
      setSensorHistory((h) => [...h.slice(-59), { ts: Date.now(), temperature: excursionTemp, humidity: excursionHumidity }])
      setSensors((prev) => ({
        ...prev,
        temperature: excursionTemp,
        humidity: excursionHumidity,
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
      const incidentAnalysis = {
        status: 'CRITICAL',
        viabilityScore: 71.2,
        degradationRisk: 31.4,
        narrative:
          'Shock event followed by humidity increase and accelerated warming. Probable seal compromise detected. Pattern is inconsistent with normal refrigeration drift. Multi-sensor correlation indicates physical mishandling. Escalation packet has been drafted.',
        sealBreachConfidence: 87.3,
        tamperingConfidence: 74.1,
        negligenceConfidence: 62.8,
      }
      const incidentSensors = {
        ...sensors,
        shockCount: 3,
        waterExposure: 'DETECTED',
        sealStatus: 'COMPROMISED',
        temperature: parseFloat((shipment.tempMax + 1.8).toFixed(1)),
        humidity: Math.min(shipment.humidityMax + 18, 98),
      }
      setAnalysis(incidentAnalysis)
      setActiveAgentEvent(createNarrativeIncidentOutput({
        shipment,
        shipmentId,
        sensors: incidentSensors,
        analysis: incidentAnalysis,
      }))
      const t2 = new Date()
      setTimeline((prev) => [
        ...prev,
        { time: t2, label: 'Narrative Agent classified incident — CRITICAL', type: 'alert' },
      ])
      postEvent(shipmentId, 'Narrative Agent classified incident — CRITICAL', 'ai', 'CRITICAL', t2)
    }, 2800)

    // +4s: response documents drafted
    setTimeout(() => {
      const now = new Date()
      setTimeline((prev) => [
        ...prev,
        { time: now, label: 'Response Agent drafted FDA deviation report', type: 'doc' },
        { time: now, label: 'Response Agent drafted receiver notification', type: 'doc' },
        { time: now, label: 'Response Agent opened insurance claim draft', type: 'doc' },
        { time: now, label: 'Response Agent prepared quarantine recommendation', type: 'doc' },
      ])
    }, 4000)
  }

  function resolveActiveAgentEvent() {
    if (!activeAgentEvent) return
    setAgentLog((prev) => [
      {
        ...activeAgentEvent,
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setActiveAgentEvent(null)
  }

  function handleEndDelivery() {
    const resolvedLog = activeAgentEvent
      ? [{ ...activeAgentEvent, status: 'RESOLVED', resolvedAt: new Date().toISOString() }, ...agentLog]
      : agentLog
    onEndDelivery({
      sensors,
      analysis,
      timeline,
      incidentActive,
      activeAgentEvent,
      agentLog: resolvedLog,
    })
  }

  const statusColor = analysis.status === 'CRITICAL' ? 'var(--red)' : analysis.status === 'WARNING' ? 'var(--amber)' : 'var(--teal)'

  return (
    <div className="dashboard">
      {/* ── Topbar ── */}
      <div className="dashboard-topbar">
        <div className="dashboard-shipment-info">
          <span style={{ fontSize: '1.4rem' }}>{shipment.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span className="mono" style={{ fontSize: '0.9rem', color: 'var(--teal)', fontWeight: 700 }}>
              {shipment.name}
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {shipmentId} · {shipment.complianceFramework}
            </span>
          </div>
          {/* Live status pill */}
          <div className="db-status-pill mono" style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}55`, color: statusColor }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            {analysis.status}
          </div>
          <div className="mono db-viability">
            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>VIABILITY</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: statusColor }}>{analysis.viabilityScore.toFixed(1)}%</span>
          </div>
        </div>
        <div className="dashboard-controls">
          <ActiveShipmentSwitcher currentShipmentId={shipmentId} />
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

      <div className="dashboard-body">
        {/* ── Photo request panel ── */}
        <PhotoRequestPanel shipmentId={shipmentId} />

        {/* ── Main grid ── */}
        <div className="dashboard-grid">
          <SensorPanel sensors={sensors} shipment={shipment} />
          <AIAnalysisPanel
            activeEvent={activeAgentEvent}
            log={agentLog}
            onResolve={resolveActiveAgentEvent}
          />
          <SensorCharts history={sensorHistory} shipment={shipment} />
          <RoutePanel sensors={sensors} shipment={shipment} />
          <TimelinePanel timeline={timeline} />
        </div>
      </div>
    </div>
  )
}
