import { useEffect, useState } from 'react'
import { callResponseAgent } from '../api'
import { AGENTS, createResponseReportFromAgentResponse } from '../data/agentOutputs'

function getOverallStatus(viabilityScore) {
  if (viabilityScore >= 90) return 'SAFE'
  if (viabilityScore >= 70) return 'AT RISK'
  return 'COMPROMISED'
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function buildComplianceStats({ history = [], sensors, shipment }) {
  const samples = [
    ...history
      .filter((point) => Number.isFinite(Number(point.temperature)))
      .map((point) => ({
        ts: Number(point.ts) || new Date(point.time || point.timestamp || Date.now()).getTime(),
        temperature: Number(point.temperature),
        humidity: Number(point.humidity),
      })),
    {
      ts: Date.now(),
      temperature: Number(sensors.temperature),
      humidity: Number(sensors.humidity),
    },
  ].filter((point) => Number.isFinite(point.temperature))

  const tempSamples = samples.filter((point) => Number.isFinite(point.temperature))
  const humiditySamples = samples.filter((point) => Number.isFinite(point.humidity))
  const tempInRange = tempSamples.filter(
    (point) => point.temperature >= shipment.tempMin && point.temperature <= shipment.tempMax,
  ).length
  const tempCompliancePct = tempSamples.length
    ? (tempInRange / tempSamples.length) * 100
    : null

  let outsideMs = 0
  for (let i = 1; i < tempSamples.length; i += 1) {
    const previous = tempSamples[i - 1]
    const current = tempSamples[i]
    const delta = current.ts - previous.ts
    if (
      Number.isFinite(delta) &&
      delta > 0 &&
      (previous.temperature < shipment.tempMin || previous.temperature > shipment.tempMax)
    ) {
      outsideMs += delta
    }
  }

  const maxTempValue = tempSamples.length
    ? Math.max(...tempSamples.map((point) => point.temperature))
    : Number(sensors.temperature)

  let humidityBreachEvents = 0
  let wasOutsideHumidity = false
  humiditySamples.forEach((point) => {
    const outside = point.humidity < shipment.humidityMin || point.humidity > shipment.humidityMax
    if (outside && !wasOutsideHumidity) humidityBreachEvents += 1
    wasOutsideHumidity = outside
  })

  return {
    tempCompliancePct,
    timeOutsideRange: formatDuration(outsideMs),
    maxTemp: Number.isFinite(maxTempValue) ? `${maxTempValue.toFixed(1)}°C` : 'Not available',
    humidityBreachEvents,
  }
}

const STATUS_STYLES = {
  SAFE: {
    color: 'var(--green)',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.3)',
  },
  'AT RISK': {
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.3)',
  },
  COMPROMISED: {
    color: 'var(--red)',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.3)',
  },
}

function normalizeShipment(s) {
  return {
    ...s,
    name: s.productName || s.name || 'Unknown',
    tempNominal: s.tempNominal ?? 4.2,
    tempMin: s.tempMin ?? 2,
    tempMax: s.tempMax ?? 8,
    humidityMin: s.humidityMin ?? 30,
    humidityMax: s.humidityMax ?? 50,
    complianceFramework: s.complianceFramework || '',
    origin: s.origin || 'Origin',
    destination: s.destination || 'Destination',
  }
}

export default function FinalReport({ data, shipment: rawShipment, shipmentId, onRestart }) {
  const shipment = normalizeShipment(rawShipment)
  const { sensors, sensorHistory, analysis, timeline, incidentActive } = data
  const overallStatus = getOverallStatus(analysis.viabilityScore)
  const style = STATUS_STYLES[overallStatus]
  const [responseOutput, setResponseOutput] = useState(null)
  const [agentError, setAgentError] = useState(null)

  const complianceStats = buildComplianceStats({
    history: sensorHistory,
    sensors,
    shipment,
  })

  const generatedAt = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  useEffect(() => {
    const payload = {
      shipmentId,
      timestamp: new Date().toISOString(),
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
      currentSensors: sensors,
      recentHistory: sensorHistory || [],
      analysis,
      incidentActive,
      activeAgentEvent: data.activeAgentEvent,
      narrativeAgentOutput: data.activeAgentEvent || data.agentLog?.[0] || null,
      timeline: timeline.map((event) => ({
        ...event,
        time: new Date(event.time).toISOString(),
      })),
    }

    setResponseOutput(null)
    setAgentError(null)
    callResponseAgent(payload)
      .then((response) => {
        setResponseOutput(createResponseReportFromAgentResponse({ response, shipmentId }))
      })
      .catch((error) => {
        setAgentError(error.message)
      })
  }, [shipmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-content">
      <div className="page-inner">
        {/* Header */}
        <div className="page-header">
          <div className="section-label mono">DELIVERY COMPLETE</div>
          <h1 className="page-title">Final Delivery Report</h1>
          <div className="report-meta mono">
            <span>Product: {shipment.name}</span>
            <span className="report-meta-sep">·</span>
            <span>Generated: {generatedAt}</span>
            <span className="report-meta-sep">·</span>
            <span>Framework: {shipment.complianceFramework}</span>
          </div>
        </div>

        {/* Overall status card */}
        <div
          className="report-status-card"
          style={{ borderColor: style.border, background: style.bg }}
        >
          <div>
            <div className="mono report-status-label" style={{ color: style.color }}>
              OVERALL SHIPMENT STATUS
            </div>
            <div className="report-status-value" style={{ color: style.color }}>
              {overallStatus}
            </div>
          </div>
          <div className="report-status-scores">
            <div className="report-score">
              <span className="mono report-meta-label">PRODUCT VIABILITY SCORE</span>
              <span className="mono report-score-value" style={{ color: style.color }}>
                {analysis.viabilityScore.toFixed(1)}%
              </span>
            </div>
            <div className="report-score">
              <span className="mono report-meta-label">ESTIMATED DEGRADATION RISK</span>
              <span className="mono report-score-value" style={{ color: style.color }}>
                {analysis.degradationRisk.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="report-grid">
          <ReportStat
            label="Temperature Compliance"
            value={
              complianceStats.tempCompliancePct == null
                ? 'Not available'
                : `${complianceStats.tempCompliancePct.toFixed(1)}%`
            }
            alert={complianceStats.tempCompliancePct != null && complianceStats.tempCompliancePct < 95}
          />
          <ReportStat
            label="Time Outside Safe Range"
            value={complianceStats.timeOutsideRange}
            alert={complianceStats.timeOutsideRange !== '0s'}
          />
          <ReportStat label="Max Temperature Reached" value={complianceStats.maxTemp} />
          <ReportStat
            label="Shock Events"
            value={String(sensors.shockCount)}
            alert={sensors.shockCount > 0}
          />
          <ReportStat
            label="Humidity Breach Events"
            value={String(complianceStats.humidityBreachEvents)}
            alert={complianceStats.humidityBreachEvents > 0}
          />
          <ReportStat
            label="Seal Status at Delivery"
            value={sensors.sealStatus}
            alert={sensors.sealStatus !== 'INTACT'}
          />
        </div>

        <div className="report-section-title mono">RESPONSE AGENT REPORT</div>
        {responseOutput ? (
          <AgentReportBlock entry={responseOutput} />
        ) : (
          <AgentReportBlock
            entry={{
              agent: AGENTS.response,
              command: `Generate incident response package for shipment ${shipmentId}`,
              status: agentError ? 'ERROR' : 'RUNNING',
              body: agentError || 'Calling Response Agent with shipment, route, thresholds, current sensors, analysis, narrative output, and timeline context...',
            }}
          />
        )}

        {/* Chain-of-custody timeline */}
        <div className="report-section-title mono report-section-mt">
          CHAIN-OF-CUSTODY TIMELINE
        </div>
        <div className="report-timeline">
          {timeline.map((event, i) => (
            <div key={i} className="report-timeline-event">
              <span className="report-timeline-time mono">
                {event.time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </span>
              <span className="report-timeline-label">{event.label}</span>
            </div>
          ))}
        </div>

        <div className="report-footer">
          <button className="btn-ghost" onClick={onRestart}>
            ← Start New Shipment
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportStat({ label, value, alert }) {
  return (
    <div className="report-stat">
      <div className="mono report-stat-label">{label}</div>
      <div className={`mono report-stat-value ${alert ? 'text-red' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function AgentReportBlock({ entry }) {
  const sections = entry.sections || []

  return (
    <div className="report-agent-block">
      <div className="report-agent-header">
        <div>
          <div className="mono report-agent-handle">{entry.agent.handle}</div>
          <div className="report-agent-command">{entry.command}</div>
        </div>
        <span className="mono report-agent-status">{entry.status}</span>
      </div>
      {sections.length > 0 ? (
        <div className="report-agent-sections">
          {sections.map((section) => (
            <section className="report-agent-section" key={section.label}>
              <div className="mono report-agent-section-label">{section.label}</div>
              <p>{section.value}</p>
            </section>
          ))}
        </div>
      ) : (
        <pre className="report-agent-output">{entry.body}</pre>
      )}
    </div>
  )
}
