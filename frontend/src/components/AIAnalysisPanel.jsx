const STATUS_STYLES = {
  NOMINAL: {
    color: 'var(--green)',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
  },
  ANOMALY: {
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  NEGLIGENCE: {
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  TAMPERING: {
    color: 'var(--red)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
  CRITICAL: {
    color: 'var(--red)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
}

export default function AIAnalysisPanel({ analysis }) {
  const style = STATUS_STYLES[analysis.status] || STATUS_STYLES.NOMINAL

  return (
    <div className="panel panel--highlight">
      <div className="panel-header">
        <span className="panel-title mono">AI ANALYSIS</span>
        <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--teal)', letterSpacing: '0.1em' }}>
          NARRATIVE AGENT
        </span>
      </div>

      <div
        className="ai-status-badge"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        <span className="ai-status-dot" style={{ background: style.color }} />
        <span
          className="mono"
          style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.15em', color: style.color }}
        >
          {analysis.status}
        </span>
      </div>

      <div className="ai-scores">
        <div className="ai-score">
          <span className="ai-score-label mono">PRODUCT VIABILITY SCORE</span>
          <span
            className="ai-score-value mono"
            style={{
              color:
                analysis.viabilityScore >= 90
                  ? 'var(--green)'
                  : analysis.viabilityScore >= 70
                  ? 'var(--amber)'
                  : 'var(--red)',
            }}
          >
            {analysis.viabilityScore.toFixed(1)}%
          </span>
        </div>
        <div className="ai-score">
          <span className="ai-score-label mono">ESTIMATED DEGRADATION RISK</span>
          <span
            className="ai-score-value mono"
            style={{
              color:
                analysis.degradationRisk < 5
                  ? 'var(--green)'
                  : analysis.degradationRisk < 20
                  ? 'var(--amber)'
                  : 'var(--red)',
            }}
          >
            {analysis.degradationRisk.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="ai-narrative">
        <div className="ai-narrative-label mono">ANALYSIS NARRATIVE</div>
        <p className="ai-narrative-text">{analysis.narrative}</p>
      </div>

      <div className="ai-confidence-section">
        <div className="ai-narrative-label mono" style={{ marginBottom: '0.75rem' }}>
          CONFIDENCE SCORES
        </div>
        <div className="ai-confidence-grid">
          <ConfidenceBar label="SEAL BREACH" value={analysis.sealBreachConfidence} />
          <ConfidenceBar label="TAMPERING" value={analysis.tamperingConfidence} />
          <ConfidenceBar label="NEGLIGENCE" value={analysis.negligenceConfidence} />
        </div>
      </div>
    </div>
  )
}

function ConfidenceBar({ label, value }) {
  const color =
    value > 60 ? 'var(--red)' : value > 30 ? 'var(--amber)' : 'var(--teal)'

  return (
    <div className="confidence-bar-row">
      <div className="confidence-bar-header">
        <span className="confidence-bar-label mono">{label}</span>
        <span className="confidence-bar-value mono" style={{ color }}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="confidence-bar-track">
        <div
          className="confidence-bar-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}
