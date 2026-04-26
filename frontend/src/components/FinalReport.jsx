import { useEffect, useState } from 'react'
import { callResponseAgent } from '../api'
import { AGENTS, createResponseReportFromAgentResponse } from '../data/agentOutputs'

function getOverallStatus(viabilityScore) {
  if (viabilityScore >= 90) return 'SAFE'
  if (viabilityScore >= 70) return 'AT RISK'
  return 'COMPROMISED'
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
  const { sensors, analysis, timeline, incidentActive } = data
  const overallStatus = getOverallStatus(analysis.viabilityScore)
  const style = STATUS_STYLES[overallStatus]
  const [responseOutput, setResponseOutput] = useState(null)
  const [agentError, setAgentError] = useState(null)

  // Mock compliance stats derived from incident state
  const tempCompliancePct = incidentActive ? 78.4 : 99.2
  const timeOutsideRange = incidentActive ? '3m 42s' : '0s'
  const maxTemp = incidentActive
    ? `${(shipment.tempMax + 1.8).toFixed(1)}°C`
    : `${(shipment.tempNominal + 0.3).toFixed(1)}°C`
  const humidityBreachEvents = incidentActive ? 1 : 0

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
            <div
              className="mono"
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: style.color,
                marginBottom: '0.5rem',
              }}
            >
              OVERALL SHIPMENT STATUS
            </div>
            <div className="report-status-value" style={{ color: style.color }}>
              {overallStatus}
            </div>
          </div>
          <div className="report-status-scores">
            <div className="report-score">
              <span
                className="mono"
                style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}
              >
                PRODUCT VIABILITY SCORE
              </span>
              <span className="mono report-score-value" style={{ color: style.color }}>
                {analysis.viabilityScore.toFixed(1)}%
              </span>
            </div>
            <div className="report-score">
              <span
                className="mono"
                style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}
              >
                ESTIMATED DEGRADATION RISK
              </span>
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
            value={`${tempCompliancePct}%`}
            alert={tempCompliancePct < 95}
          />
          <ReportStat
            label="Time Outside Safe Range"
            value={timeOutsideRange}
            alert={timeOutsideRange !== '0s'}
          />
          <ReportStat label="Max Temperature Reached" value={maxTemp} />
          <ReportStat
            label="Shock Events"
            value={String(sensors.shockCount)}
            alert={sensors.shockCount > 0}
          />
          <ReportStat
            label="Humidity Breach Events"
            value={String(humidityBreachEvents)}
            alert={humidityBreachEvents > 0}
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
        <div className="report-section-title mono" style={{ marginTop: '2rem' }}>
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
      <div
        className="mono report-stat-value"
        style={{ color: alert ? 'var(--red)' : 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  )
}

function AgentReportBlock({ entry }) {
  return (
    <div className="report-agent-block">
      <div className="report-agent-header">
        <div>
          <div className="mono report-agent-handle">{entry.agent.handle}</div>
          <div className="report-agent-command">{entry.command}</div>
        </div>
        <span className="mono report-agent-status">{entry.status}</span>
      </div>
      <pre className="report-agent-output">{entry.body}</pre>
    </div>
  )
}
