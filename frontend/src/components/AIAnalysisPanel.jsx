import { useState } from 'react'

const STATUS_STYLES = {
  CRITICAL: { color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  WARNING: { color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  RESOLVED: { color: 'var(--green)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
}

export default function AIAnalysisPanel({ activeEvent, log = [], onResolve }) {
  const [logOpen, setLogOpen] = useState(false)
  const style = STATUS_STYLES[activeEvent?.status] || STATUS_STYLES.WARNING

  return (
    <div className="panel panel--highlight agent-panel">
      <div className="panel-header">
        <span className="panel-title mono">AI SECTION</span>
        <span className="mono agent-count">{activeEvent ? '1 ACTIVE' : 'IDLE'}</span>
      </div>

      {activeEvent ? (
        <article className="agent-active-card" style={{ borderColor: style.border, background: style.bg }}>
          <div className="agent-active-header">
            <div>
              <div className="mono agent-handle">{activeEvent.agent.handle}</div>
              <h2 className="agent-active-title">{activeEvent.title}</h2>
            </div>
            <span className="mono agent-status" style={{ color: style.color, borderColor: style.border, background: style.bg }}>
              {activeEvent.status}
            </span>
          </div>

          <div className="mono agent-command">{activeEvent.command}</div>

          <div className="agent-summary-grid">
            <AgentField label="Classification" value={activeEvent.classification} accent={style.color} />
            <AgentField label="Confidence" value={`${activeEvent.confidence}%`} accent={style.color} />
          </div>

          <div className="agent-section">
            <div className="mono agent-section-label">Assessment</div>
            <p>{activeEvent.assessment}</p>
          </div>
          <div className="agent-section">
            <div className="mono agent-section-label">Competing hypothesis</div>
            <p>{activeEvent.hypothesis}</p>
          </div>
          <div className="agent-section">
            <div className="mono agent-section-label">Recommended action</div>
            <p>{activeEvent.action}</p>
          </div>
          <div className="agent-section">
            <div className="mono agent-section-label">Prediction</div>
            <p>{activeEvent.prediction}</p>
          </div>

          <button className="btn-ghost agent-resolve-btn" onClick={onResolve}>
            Mark resolved
          </button>
        </article>
      ) : (
        <div className="agent-empty">
          <div className="mono agent-empty-title">No active AI incident</div>
          <p>The Narrative Agent will appear here when an anomaly is detected.</p>
        </div>
      )}

      <div className="agent-log">
        <button className="agent-log-toggle" onClick={() => setLogOpen((v) => !v)}>
          <span className="mono">Resolved log</span>
          <span className="mono">{log.length}</span>
        </button>

        {logOpen && (
          <div className="agent-log-list">
            {log.length === 0 ? (
              <div className="mono agent-log-empty">No resolved agent events</div>
            ) : (
              log.map((entry) => <LogEntry key={entry.id} entry={entry} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentField({ label, value, accent }) {
  return (
    <div className="agent-field">
      <span className="mono agent-field-label">{label}</span>
      <span className="mono agent-field-value" style={{ color: accent }}>{value}</span>
    </div>
  )
}

function LogEntry({ entry }) {
  return (
    <details className="agent-log-entry">
      <summary>
        <span>{entry.title}</span>
        <span className="mono">{entry.status}</span>
      </summary>
      <pre className="agent-output">{entry.body}</pre>
    </details>
  )
}
