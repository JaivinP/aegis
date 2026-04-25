import EscalationDrafts from './EscalationDrafts'

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

const RECOMMENDATIONS = {
  SAFE:
    'Product cleared for use. All monitored parameters remained within compliance thresholds. Retain the chain-of-custody record per standard protocol.',
  'AT RISK':
    'Product should be quarantined pending pharmacist or quality assurance review. Do not dispense until a viability assessment is complete and documented.',
  COMPROMISED:
    'Product should be quarantined immediately and must not be dispensed. Initiate FDA deviation reporting protocol. Preserve all chain-of-custody records and physical packaging for investigation.',
}

export default function FinalReport({ data, shipment, onRestart }) {
  const { sensors, analysis, timeline, incidentActive } = data
  const overallStatus = getOverallStatus(analysis.viabilityScore)
  const style = STATUS_STYLES[overallStatus]

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

        {/* Confidence scores */}
        <div className="report-section-title mono">INCIDENT CONFIDENCE ANALYSIS</div>
        <div className="report-confidence-grid">
          <ConfidenceRow label="Seal Breach Confidence" value={analysis.sealBreachConfidence} />
          <ConfidenceRow label="Tampering Confidence" value={analysis.tamperingConfidence} />
          <ConfidenceRow label="Negligence Confidence" value={analysis.negligenceConfidence} />
        </div>

        {/* Recommended action */}
        <div className="report-section-title mono" style={{ marginTop: '2rem' }}>
          RECOMMENDED ACTION
        </div>
        <div className="report-recommendation" style={{ borderColor: style.border }}>
          <p className="report-recommendation-text">{RECOMMENDATIONS[overallStatus]}</p>
        </div>

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

        {/* Escalation drafts (only if not safe) */}
        {overallStatus !== 'SAFE' && (
          <EscalationDrafts
            shipment={shipment}
            analysis={analysis}
            status={overallStatus}
          />
        )}

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

function ConfidenceRow({ label, value }) {
  const color =
    value > 60 ? 'var(--red)' : value > 30 ? 'var(--amber)' : 'var(--green)'
  return (
    <div className="report-confidence-row">
      <div className="report-confidence-header">
        <span className="mono report-confidence-label">{label}</span>
        <span className="mono report-confidence-value" style={{ color }}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="report-confidence-track">
        <div
          className="report-confidence-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}
