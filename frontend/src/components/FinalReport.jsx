import { useEffect, useMemo, useState } from 'react'
import { callResponseAgent } from '../api'
import { AGENTS, createResponseReportFromAgentResponse } from '../data/agentOutputs'
import { calculateReportMetrics } from '../utils/reportMetrics'

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
    tempNominal: s.tempNominal,
    tempMin: s.tempMin,
    tempMax: s.tempMax,
    humidityNominal: s.humidityNominal,
    humidityMin: s.humidityMin,
    humidityMax: s.humidityMax,
    complianceFramework: s.complianceFramework || '',
    origin: s.origin || 'Origin',
    destination: s.destination || 'Destination',
  }
}

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatDuration(seconds) {
  if (!seconds) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

function displayNumber(value, digits = 1, fallback = 'N/A') {
  const number = asNumber(value)
  return number === null ? fallback : number.toFixed(digits)
}

function formatIssueTime(time) {
  if (!time) return 'Delivery'
  const date = time instanceof Date ? time : new Date(time)
  if (Number.isNaN(date.getTime())) return 'Delivery'
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function inferIssueCategory(label) {
  const text = label.toLowerCase()
  if (text.includes('temperature') || text.includes('thermal') || text.includes('cold')) return 'Temperature'
  if (text.includes('humidity')) return 'Humidity'
  if (text.includes('shock') || text.includes('impact')) return 'Shock'
  if (text.includes('water')) return 'Water'
  if (text.includes('seal') || text.includes('tamper') || text.includes('compromise')) return 'Integrity'
  if (text.includes('deviation') || text.includes('quarantine') || text.includes('insurance') || text.includes('notification')) return 'Response'
  return 'Anomaly'
}

function inferIssueSeverity(label, fallback = 'WARNING') {
  const text = label.toLowerCase()
  if (text.includes('critical') || text.includes('compromised') || text.includes('breach') || text.includes('shock') || text.includes('water')) return 'CRITICAL'
  if (text.includes('drafted') || text.includes('prepared') || text.includes('opened')) return 'ACTION'
  return fallback
}

function buildReportFindings({ data, shipment }) {
  const sensorHistory = data.sensorHistory || []
  const sensors = data.sensors || {}
  const timeline = data.timeline || []
  const metrics = calculateReportMetrics({ shipment, sensors, sensorHistory, timeline })
  const issues = []
  const seen = new Set()

  const addIssue = (issue) => {
    const key = `${issue.category}|${issue.detail}|${issue.time || ''}`
    if (seen.has(key)) return
    seen.add(key)
    issues.push(issue)
  }

  timeline.forEach((event) => {
    const label = event.label || ''
    const isProblem = event.type === 'alert' || /anomaly|shock|impact|water|seal|compromis|breach|deviation|quarantine|insurance|notification/i.test(label)
    if (!isProblem) return
    addIssue({
      time: event.time,
      category: inferIssueCategory(label),
      severity: inferIssueSeverity(label, event.type === 'alert' ? 'CRITICAL' : 'WARNING'),
      detail: label,
    })
  })

  const temperatures = sensorHistory
    .map((reading) => asNumber(reading.temperature))
    .filter((value) => value !== null)
  const humidities = sensorHistory
    .map((reading) => asNumber(reading.humidity))
    .filter((value) => value !== null)

  const currentTemp = asNumber(sensors.temperature)
  const currentHumidity = asNumber(sensors.humidity)
  if (currentTemp !== null) temperatures.push(currentTemp)
  if (currentHumidity !== null) humidities.push(currentHumidity)

  if (currentTemp !== null && asNumber(shipment.tempMin) !== null && asNumber(shipment.tempMax) !== null && (currentTemp < shipment.tempMin || currentTemp > shipment.tempMax)) {
    addIssue({
      time: new Date(),
      category: 'Temperature',
      severity: 'CRITICAL',
      detail: `Delivery temperature ${currentTemp.toFixed(1)}C outside ${shipment.tempMin}-${shipment.tempMax}C range`,
    })
  }

  if (currentHumidity !== null && asNumber(shipment.humidityMin) !== null && asNumber(shipment.humidityMax) !== null && (currentHumidity < shipment.humidityMin || currentHumidity > shipment.humidityMax)) {
    addIssue({
      time: new Date(),
      category: 'Humidity',
      severity: 'WARNING',
      detail: `Delivery humidity ${currentHumidity.toFixed(0)}% outside ${shipment.humidityMin}-${shipment.humidityMax}% range`,
    })
  }

  if ((sensors.shockCount || 0) > 0) {
    addIssue({
      time: new Date(),
      category: 'Shock',
      severity: 'CRITICAL',
      detail: `${sensors.shockCount} shock event${sensors.shockCount === 1 ? '' : 's'} recorded by delivery`,
    })
  }

  if (sensors.waterExposure && sensors.waterExposure !== 'DRY') {
    addIssue({
      time: new Date(),
      category: 'Water',
      severity: 'CRITICAL',
      detail: `Water exposure status at delivery: ${sensors.waterExposure}`,
    })
  }

  if (sensors.sealStatus && sensors.sealStatus !== 'INTACT') {
    addIssue({
      time: new Date(),
      category: 'Integrity',
      severity: 'CRITICAL',
      detail: `Seal status at delivery: ${sensors.sealStatus}`,
    })
  }

  return {
    issues: issues.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0)),
    issueCount: issues.filter((issue) => issue.severity !== 'ACTION').length,
    actionCount: issues.filter((issue) => issue.severity === 'ACTION').length,
    ...metrics,
    timeOutsideRange: formatDuration(metrics.timeOutsideRangeSeconds),
    maxTemp: metrics.maxTemp ?? (temperatures.length ? Math.max(...temperatures) : null),
    minTemp: metrics.minTemp ?? (temperatures.length ? Math.min(...temperatures) : null),
    maxHumidity: metrics.maxHumidity ?? (humidities.length ? Math.max(...humidities) : null),
  }
}

function parseAgentSections(text) {
  if (!text) return []
  const lines = text.split('\n')
  const sections = []
  let current = { title: 'Response Summary', body: [] }

  lines.forEach((line) => {
    const heading = line.match(/^\s*(?:\d+\.\s*)?([A-Z][A-Z /-]{3,})(?::\s*(.*))?$/)
    if (heading) {
      if (current.body.join('\n').trim()) sections.push(current)
      current = { title: heading[1].trim(), body: heading[2] ? [heading[2]] : [] }
      return
    }
    current.body.push(line)
  })

  if (current.body.join('\n').trim()) sections.push(current)
  return sections.length ? sections : [{ title: 'Response Summary', body: [text] }]
}

export default function FinalReport({ data, shipment: rawShipment, shipmentId, onRestart }) {
  const shipment = normalizeShipment(rawShipment)
  const { sensors, analysis, timeline, incidentActive } = data
  const [responseOutput, setResponseOutput] = useState(null)
  const [agentError, setAgentError] = useState(null)
  const reportFindings = useMemo(
    () => buildReportFindings({ data, shipment }),
    [data, shipment],
  )
  const reportStatus = getOverallStatus(reportFindings.viabilityScore)
  const reportStyle = STATUS_STYLES[reportStatus]

  const tempCompliancePct = reportFindings.tempCompliancePct
  const timeOutsideRange = reportFindings.timeOutsideRange
  const maxTemp = reportFindings.maxTemp === null ? 'N/A' : `${reportFindings.maxTemp.toFixed(1)}°C`
  const humidityBreachEvents = reportFindings.humidityBreachEvents

  const generatedAtSource = data.generatedAt || data.endedAt || new Date()
  const generatedAt = new Date(generatedAtSource).toLocaleString('en-US', {
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
      analysis: {
        ...analysis,
        status: reportFindings.status,
        viabilityScore: reportFindings.viabilityScore,
        degradationRisk: reportFindings.degradationRisk,
      },
      incidentActive: incidentActive || reportFindings.issueCount > 0,
      reportFindings,
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
          <div className="section-label mono">{data.incidentActive || reportFindings.issueCount > 0 ? 'DELIVERY ESCALATED' : 'DELIVERY COMPLETE'}</div>
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
          style={{ borderColor: reportStyle.border, background: reportStyle.bg }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: reportStyle.color,
                marginBottom: '0.5rem',
              }}
            >
              OVERALL SHIPMENT STATUS
            </div>
            <div className="report-status-value" style={{ color: reportStyle.color }}>
              {reportStatus}
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
              <span className="mono report-score-value" style={{ color: reportStyle.color }}>
                {reportFindings.viabilityScore.toFixed(1)}%
              </span>
            </div>
            <div className="report-score">
              <span
                className="mono"
                style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}
              >
                ESTIMATED DEGRADATION RISK
              </span>
              <span className="mono report-score-value" style={{ color: reportStyle.color }}>
                {reportFindings.degradationRisk.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="report-grid">
          <ReportStat
            label="Temperature Compliance"
            value={`${displayNumber(tempCompliancePct)}%`}
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

        <div className="report-section-title mono">EXCEPTION REGISTER</div>
        <div className="report-issue-panel">
          <div className="report-issue-summary">
            <div>
              <div className="mono report-stat-label">ISSUES FOUND</div>
              <div className="mono report-issue-count">{reportFindings.issueCount}</div>
            </div>
            <div>
              <div className="mono report-stat-label">RESPONSE ACTIONS</div>
              <div className="mono report-issue-count">{reportFindings.actionCount}</div>
            </div>
            <div>
              <div className="mono report-stat-label">TEMP RANGE OBSERVED</div>
            <div className="mono report-issue-range">
                {displayNumber(reportFindings.minTemp)}-{displayNumber(reportFindings.maxTemp)}°C
              </div>
            </div>
          </div>
          {reportFindings.issues.length > 0 ? (
            <div className="report-issue-list">
              {reportFindings.issues.map((issue, i) => (
                <div key={`${issue.detail}-${i}`} className="report-issue-row">
                  <span className={`mono report-issue-severity severity-${issue.severity.toLowerCase()}`}>
                    {issue.severity}
                  </span>
                  <span className="mono report-issue-time">{formatIssueTime(issue.time)}</span>
                  <span className="report-issue-category">{issue.category}</span>
                  <span className="report-issue-detail">{issue.detail}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-no-issues">No excursions, handling exceptions, or response actions were recorded.</div>
          )}
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
  const sections = parseAgentSections(entry.body)
  const isLoading = entry.status === 'RUNNING'
  const isError = entry.status === 'ERROR'

  return (
    <div className={`report-agent-block ${isError ? 'is-error' : ''}`}>
      <div className="report-agent-header">
        <div>
          <div className="mono report-agent-handle">{entry.agent.handle}</div>
          <div className="report-agent-command">{entry.command}</div>
        </div>
        <span className="mono report-agent-status">{entry.status}</span>
      </div>
      {isLoading ? (
        <div className="report-agent-progress">
          <div className="report-agent-spinner" />
          <div>
            <div className="report-agent-progress-title">Building response package</div>
            <div className="report-agent-progress-copy">{entry.body}</div>
          </div>
        </div>
      ) : (
        <div className="report-agent-sections">
          {sections.map((section, i) => (
            <div key={`${section.title}-${i}`} className="report-agent-section">
              <div className="mono report-agent-section-title">{section.title}</div>
              <div className="report-agent-section-body">{section.body.join('\n').trim()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
