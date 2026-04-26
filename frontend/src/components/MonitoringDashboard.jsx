import { useState, useEffect, useRef } from 'react'
import SensorPanel from './SensorPanel'
import AIAnalysisPanel from './AIAnalysisPanel'
import RoutePanel from './RoutePanel'
import TimelinePanel from './TimelinePanel'
import SensorCharts from './SensorCharts'
import PhotoRequestPanel from './PhotoRequestPanel'
import ActiveShipmentSwitcher from './ActiveShipmentSwitcher'
import { addEvent, callNarrativeAgent, resetVoiceAlert, updateShipment } from '../api'
import {
  AGENTS,
  createNarrativeEventFromAgentResponse,
} from '../data/agentOutputs'
import { useLiveData } from '../data/liveData'
import { useKeyboard } from '../context/KeyboardContext'
import KeyboardHint from './KeyboardHint'

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

function getLiveAnomalyReasons(liveData, shipment) {
  if (!liveData) return []

  const reasons = []
  const temperature = Number(liveData.temperature)
  const humidity = Number(liveData.humidity)
  const shockDetected = Number(liveData.shockDetected)
  const water = Number(liveData.water)

  if (Number.isFinite(temperature) && (temperature < shipment.tempMin || temperature > shipment.tempMax)) {
    reasons.push(`Temperature out of range: ${temperature.toFixed(1)}°C (safe: ${shipment.tempMin}–${shipment.tempMax}°C)`)
  }
  if (Number.isFinite(humidity) && (humidity < shipment.humidityMin || humidity > shipment.humidityMax)) {
    reasons.push(`Humidity out of range: ${humidity.toFixed(0)}% (safe: ${shipment.humidityMin}–${shipment.humidityMax}%)`)
  }
  if (Number.isFinite(shockDetected) && shockDetected > 0) {
    reasons.push(`Shock detected: ${shockDetected.toFixed(2)}`)
  }
  if (Number.isFinite(water) && water >= 30) {
    reasons.push(`Water exposure: ${water.toFixed(0)}`)
  }

  return reasons
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

function buildAgentPayload({ shipment, shipmentId, sensors, sensorHistory, timeline, analysis, incident, suppressVoice = false }) {
  return {
    shipmentId,
    timestamp: new Date().toISOString(),
    query: `Analyze current anomaly for shipment ${shipmentId}.`,
    shipment: {
      shipmentId,
      productName: shipment.name,
      complianceFramework: shipment.complianceFramework,
      origin: shipment.origin,
      destination: shipment.destination,
      tempNominal: shipment.tempNominal,
      humidityNominal: shipment.humidityNominal,
    },
    route: {
      origin: shipment.origin,
      destination: shipment.destination,
      currentLocation: sensors.location,
      routeProgress: sensors.routeProgress,
    },
    thresholds: {
      tempMin: shipment.tempMin,
      tempMax: shipment.tempMax,
      humidityMin: shipment.humidityMin,
      humidityMax: shipment.humidityMax,
    },
    currentSensors: {
      temperature: sensors.temperature,
      humidity: sensors.humidity,
      shockCount: sensors.shockCount,
      waterExposure: sensors.waterExposure,
      sealStatus: sensors.sealStatus,
      battery: sensors.battery,
      location: sensors.location,
      routeProgress: sensors.routeProgress,
    },
    recentHistory: sensorHistory.slice(-60),
    timeline: timeline.map((event) => ({
      ...event,
      time: new Date(event.time).toISOString(),
    })),
    analysis,
    incident,
    suppressVoice,
  }
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
    origin: s.origin || 'Origin',
    destination: s.destination || 'Destination',
  }
}

export default function MonitoringDashboard({ shipment: rawShipment, shipmentId: propShipmentId, onEndDelivery }) {
  const { data: liveData } = useLiveData()
  const kb = useKeyboard()

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
  const sensorHistoryRef = useRef(sensorHistory)
  const timelineRef = useRef(timeline)
  // Stable refs for keyboard overlays to read synchronously
  const sensorsRef = useRef(sensors)
  const analysisRef = useRef(analysis)
  const incidentActiveRef = useRef(false)
  // Live anomaly detection refs
  const prevLiveDataRef = useRef(null)
  const lastAiTriggerRef = useRef(0)
  const aiRunningRef = useRef(false)
  const voiceAlertActiveRef = useRef(false)

  useEffect(() => { sensorHistoryRef.current = sensorHistory }, [sensorHistory])
  useEffect(() => { timelineRef.current = timeline }, [timeline])
  useEffect(() => { sensorsRef.current = sensors }, [sensors])
  useEffect(() => { analysisRef.current = analysis }, [analysis])
  useEffect(() => { incidentActiveRef.current = incidentActive }, [incidentActive])
  useEffect(() => { aiRunningRef.current = activeAgentEvent?.status === 'ANALYZING' }, [activeAgentEvent])

  useEffect(() => {
    if (!liveData) return
    if (getLiveAnomalyReasons(liveData, shipment).length === 0) {
      if (voiceAlertActiveRef.current) {
        resetVoiceAlert(shipmentId).catch(() => {})
      }
      voiceAlertActiveRef.current = false
    }
  }, [liveData, shipment, shipmentId])

  // Keep charts aligned with the same live readings shown in SensorPanel.
  useEffect(() => {
    if (!liveData || incidentRef.current) return

    const temperature = Number(liveData.temperature)
    const humidity = Number(liveData.humidity)
    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return

    setSensorHistory((h) => [
      ...h.slice(-59),
      {
        ts: Date.now(),
        temperature: parseFloat(temperature.toFixed(1)),
        humidity: Math.round(humidity),
      },
    ])
  }, [liveData])

  // Live anomaly detection — triggers AI on red anomalies or big sensor shifts
  useEffect(() => {
    if (!liveData) return

    const prev = prevLiveDataRef.current
    prevLiveDataRef.current = liveData

    if (!prev) return
    if (aiRunningRef.current) return
    if (Date.now() - lastAiTriggerRef.current < 60000) return

    const reasons = getLiveAnomalyReasons(liveData, shipment)

    // Big shifts since last reading
    const tempShift = Math.abs(liveData.temperature - prev.temperature)
    const humidityShift = Math.abs(liveData.humidity - prev.humidity)
    if (tempShift > 3) {
      reasons.push(`Large temperature shift: ${tempShift.toFixed(1)}°C`)
    }
    if (humidityShift > 15) {
      reasons.push(`Large humidity shift: ${humidityShift.toFixed(0)}%`)
    }

    if (reasons.length === 0) return

    const suppressVoice = voiceAlertActiveRef.current
    voiceAlertActiveRef.current = true
    lastAiTriggerRef.current = Date.now()
    const triggerReason = reasons.join('; ')
    const t = new Date()
    const triggerSensors = {
      ...sensorsRef.current,
      temperature: liveData.temperature,
      humidity: liveData.humidity,
      water: liveData.water,
      shockDetected: liveData.shockDetected,
    }

    setTimeline((prev) => [...prev, { time: t, label: `Live anomaly — ${triggerReason}`, type: 'alert' }])
    postEvent(shipmentId, `Live anomaly — ${triggerReason}`, 'alert', 'WARNING', t)

    setActiveAgentEvent({
      id: `narrative-loading-${Date.now()}`,
      agent: AGENTS.narrative,
      command: `Analyze live anomaly on shipment ${shipmentId}`,
      status: 'ANALYZING',
      title: 'Narrative Agent analyzing live anomaly',
      classification: 'PENDING',
      confidence: 0,
      assessment: `Live sensor anomaly detected: ${triggerReason}`,
      hypothesis: 'Waiting for agent response.',
      action: 'Waiting for agent response.',
      prediction: 'Waiting for agent response.',
      body: '',
    })

    const payload = buildAgentPayload({
      shipment,
      shipmentId,
      sensors: triggerSensors,
      sensorHistory: [
        ...sensorHistoryRef.current,
        { ts: Date.now(), temperature: liveData.temperature, humidity: liveData.humidity },
      ],
      timeline: [...timelineRef.current, { time: t, label: `Live anomaly — ${triggerReason}`, type: 'alert' }],
      analysis: analysisRef.current,
      suppressVoice,
      incident: {
        trigger: triggerReason,
        severity: 'WARNING',
        detectedAt: t.toISOString(),
      },
    })

    callNarrativeAgent(payload)
      .then((response) => {
        setActiveAgentEvent(createNarrativeEventFromAgentResponse({ response, shipmentId }))
        const doneAt = new Date()
        setTimeline((prev) => [...prev, { time: doneAt, label: 'Narrative Agent returned live anomaly classification', type: 'alert' }])
        postEvent(shipmentId, 'Narrative Agent returned live anomaly classification', 'ai', 'WARNING', doneAt)
      })
      .catch((error) => {
        setActiveAgentEvent({
          id: `narrative-error-${Date.now()}`,
          agent: AGENTS.narrative,
          command: `Analyze live anomaly on shipment ${shipmentId}`,
          status: 'ERROR',
          title: 'Narrative Agent call failed',
          classification: 'ERROR',
          confidence: 0,
          assessment: error.message,
          hypothesis: 'No agent output returned.',
          action: 'Check the database API, agent dependencies, and ASI1_API_KEY.',
          prediction: 'No prediction available.',
          body: error.message,
        })
      })
  }, [liveData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Register this dashboard in the keyboard context so overlays can read live state
  useEffect(() => {
    kb.setDashboardCtx({
      shipmentId,
      shipment,
      sensorsRef,
      analysisRef,
      timelineRef,
      incidentActiveRef,
      triggerIncident: () => triggerIncident(),
      resetToNominal:  () => resetToNominal(),
      endDelivery:     () => handleEndDelivery(),
    })
    return () => kb.setDashboardCtx(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId])

  // Live nominal jitter every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (incidentRef.current) return
      setSensors((prev) => {
        const newProgress = Math.min(prev.routeProgress + 0.25, 95)
        const newTemp = parseFloat((shipment.tempNominal + (Math.random() - 0.5) * 0.4).toFixed(1))
        const newHumidity = Math.round(shipment.humidityNominal + (Math.random() - 0.5) * 3)
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
      const t2 = new Date()
      const incidentTimeline = [
        ...timelineRef.current,
        { time: t2, label: 'Narrative Agent analyzing anomaly', type: 'ai' },
      ]
      setAnalysis(incidentAnalysis)
      setActiveAgentEvent({
        id: `narrative-loading-${Date.now()}`,
        agent: AGENTS.narrative,
        command: `Analyze anomaly on shipment ${shipmentId}`,
        status: 'ANALYZING',
        title: 'Narrative Agent analyzing anomaly',
        classification: 'PENDING',
        confidence: 0,
        assessment: 'Sending shipment, route, threshold, current sensor, recent history, and timeline context to the Narrative Agent.',
        hypothesis: 'Waiting for agent response.',
        action: 'Waiting for agent response.',
        prediction: 'Waiting for agent response.',
        body: '',
      })
      setTimeline((prev) => [
        ...prev,
        { time: t2, label: 'Narrative Agent analyzing anomaly', type: 'ai' },
      ])
      postEvent(shipmentId, 'Narrative Agent analyzing anomaly', 'ai', 'WARNING', t2)

      const suppressVoice = voiceAlertActiveRef.current
      voiceAlertActiveRef.current = true
      const payload = buildAgentPayload({
        shipment,
        shipmentId,
        sensors: incidentSensors,
        sensorHistory: [
          ...sensorHistoryRef.current,
          { ts: Date.now(), temperature: incidentSensors.temperature, humidity: incidentSensors.humidity },
        ],
        timeline: incidentTimeline,
        analysis: incidentAnalysis,
        suppressVoice,
        incident: {
          trigger: 'Shock event followed by water exposure, seal compromise, and temperature excursion',
          severity: 'CRITICAL',
          detectedAt: t2.toISOString(),
        },
      })

      callNarrativeAgent(payload)
        .then((response) => {
          setActiveAgentEvent(createNarrativeEventFromAgentResponse({ response, shipmentId }))
          const doneAt = new Date()
          setTimeline((prev) => [
            ...prev,
            { time: doneAt, label: 'Narrative Agent returned incident classification', type: 'alert' },
          ])
          postEvent(shipmentId, 'Narrative Agent returned incident classification', 'ai', 'CRITICAL', doneAt)
        })
        .catch((error) => {
          setActiveAgentEvent({
            id: `narrative-error-${Date.now()}`,
            agent: AGENTS.narrative,
            command: `Analyze anomaly on shipment ${shipmentId}`,
            status: 'ERROR',
            title: 'Narrative Agent call failed',
            classification: 'ERROR',
            confidence: 0,
            assessment: error.message,
            hypothesis: 'No agent output returned.',
            action: 'Check the database API, agent dependencies, and ASI1_API_KEY.',
            prediction: 'No prediction available.',
            body: error.message,
          })
        })
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

  function resetToNominal() {
    setIncidentActive(false)
    incidentRef.current = false
    incidentActiveRef.current = false
    voiceAlertActiveRef.current = false
    setSensors(getNominalSensors(shipment))
    setAnalysis(getNominalAnalysis(shipment))
    setActiveAgentEvent(null)
    setTimeline(getInitialTimeline())
    setSensorHistory([{ ts: Date.now(), temperature: shipment.tempNominal, humidity: shipment.humidityNominal }])
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
      sensorHistory,
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
          <span className="icon-lg">{shipment.icon}</span>
          <div className="flex-col-tight">
            <span className="mono db-shipment-name">{shipment.name}</span>
            <span className="mono db-shipment-meta">{shipmentId} · {shipment.complianceFramework}</span>
          </div>
          {/* Live status pill */}
          <div className="db-status-pill mono" style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}55`, color: statusColor }}>
            <span className="db-status-dot" style={{ background: statusColor }} />
            {analysis.status}
          </div>
          <div className="mono db-viability">
            <span className="mono db-viability-label">VIABILITY</span>
            <span className="mono db-viability-score" style={{ color: statusColor }}>{analysis.viabilityScore.toFixed(1)}%</span>
          </div>
        </div>
        <div className="dashboard-controls">
          <ActiveShipmentSwitcher currentShipmentId={shipmentId} />
          {!incidentActive ? (
            <button className="btn-incident" onClick={triggerIncident}>
              ⚡ Inject Sensor Event <KeyboardHint keys={['⇧', 'T']} dim />
            </button>
          ) : (
            <button className="incident-badge-btn mono" onClick={resetToNominal} title="Reset to nominal (Shift+N)">
              INCIDENT ACTIVE <KeyboardHint keys={['⇧', 'N']} dim />
            </button>
          )}
          <button className="btn-end-delivery" onClick={handleEndDelivery}>
            Complete Delivery <KeyboardHint keys={['⇧', 'E']} dim />
          </button>
        </div>
      </div>

      {/* ── Keyboard hint bar ── */}
      <div className="kb-bar mono">
        <KeyboardHint keys="/" label="Commands" />
        <KeyboardHint keys="?" label="Ask Aegis" />
        <KeyboardHint keys="M" label="Mission Control" />
        <KeyboardHint keys="G" label="Geo Mode" />
        <KeyboardHint keys="S" label="Sensor Matrix" />
        <KeyboardHint keys="R" label="Report" />
        {incidentActive && <KeyboardHint keys="Z" label="Incident Zoom" />}
        <span className="kb-bar-divider" />
        <KeyboardHint keys="shift" label="All shortcuts" />
      </div>

      <div className="dashboard-body">
        {/* ── Photo request panel ── */}
        <PhotoRequestPanel shipmentId={shipmentId} />

        {/* ── Main grid ── */}
        <div className="dashboard-grid">
          <SensorPanel sensors={{...sensors, temperature: liveData.temperature, humidity: liveData.humidity, water: liveData.water, shockDetected: liveData.shockDetected, light: liveData.light}} shipment={shipment} />
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
