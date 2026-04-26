import { useKeyboard } from '../context/KeyboardContext'
import { calculateReportMetrics } from '../utils/reportMetrics'

function ConfBar({ label, pct, color }) {
  return (
    <div className="kb-iz-conf-row">
      <div className="kb-iz-conf-label mono">{label}</div>
      <div className="kb-iz-conf-track">
        <div className="kb-iz-conf-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="kb-iz-conf-pct mono" style={{ color }}>{pct}%</div>
    </div>
  )
}

export default function IncidentZoom() {
  const { incidentZoomOpen, setIncidentZoomOpen, setReportDrawerOpen, dashboardCtx } = useKeyboard()

  if (!incidentZoomOpen) return null

  const analysis = dashboardCtx?.analysisRef?.current
  const sensors  = dashboardCtx?.sensorsRef?.current
  const sensorHistory = dashboardCtx?.sensorHistoryRef?.current || []
  const timeline = dashboardCtx?.timelineRef?.current || []
  const ship     = dashboardCtx?.shipment
  const id       = dashboardCtx?.shipmentId || '—'
  const metrics = calculateReportMetrics({ shipment: ship, sensors, sensorHistory, timeline })

  const seal   = analysis?.sealBreachConfidence  ?? (metrics.sealCompromised ? metrics.degradationRisk : 0)
  const tamp   = analysis?.tamperingConfidence   ?? 0
  const negl   = analysis?.negligenceConfidence  ?? 0
  const refr   = metrics.tempCompliancePct < 100 ? 100 - metrics.tempCompliancePct : 0
  const viab   = metrics.viabilityScore
  const deg    = metrics.degradationRisk
  const temp   = sensors?.temperature?.toFixed(1) ?? '—'
  const humid  = sensors?.humidity               ?? '—'
  const humidityDelta = typeof humid === 'number' && ship?.humidityNominal !== undefined
    ? Math.round(humid - ship.humidityNominal)
    : 0

  function onKeyDown(e) {
    if (e.key === 'r' || e.key === 'R') {
      setIncidentZoomOpen(false)
      setReportDrawerOpen(true)
    }
  }

  return (
    <div
      className="kb-backdrop"
      onClick={() => setIncidentZoomOpen(false)}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <div className="kb-iz-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-iz-header">
          <div className="kb-iz-badge mono">INCIDENT RECONSTRUCTION</div>
          <div className="kb-iz-id mono">{id}</div>
          <button className="kb-close-btn" onClick={() => setIncidentZoomOpen(false)}>✕</button>
        </div>

        <div className="kb-iz-narrative">
          Recorded exceptions show {metrics.alertCount} alert event{metrics.alertCount === 1 ? '' : 's'} against the configured shipment thresholds.
          Current temperature is {temp}°C and humidity is {humid}% on a route configured for {ship?.origin} to {ship?.destination}.
          Integrity status is {sensors?.sealStatus || 'unknown'}.
        </div>

        <div className="kb-iz-grid">
          <div className="kb-iz-section">
            <div className="kb-iz-section-title mono">CONFIDENCE SCORES</div>
            <ConfBar label="Seal Breach"  pct={seal}  color="var(--red)" />
            <ConfBar label="Tampering"    pct={tamp}  color="var(--red)" />
            <ConfBar label="Negligence"   pct={negl}  color="var(--amber)" />
            <ConfBar label="Refrig. Fail" pct={refr}  color="var(--text-muted)" />
          </div>

          <div className="kb-iz-section">
            <div className="kb-iz-section-title mono">SENSOR EVIDENCE</div>
            <div className="kb-iz-evidence-list">
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot" style={{ background: 'var(--red)' }} />
                <span>Shock events recorded: {metrics.shockCount}</span>
              </div>
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot" style={{ background: 'var(--red)' }} />
                <span>Water exposure detected — seal breached</span>
              </div>
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot" style={{ background: 'var(--amber)' }} />
                <span>Humidity delta from nominal: {humidityDelta >= 0 ? '+' : ''}{humidityDelta}%</span>
              </div>
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot" style={{ background: 'var(--amber)' }} />
                <span>Observed temperature range: {metrics.minTemp?.toFixed(1) ?? '—'}°C to {metrics.maxTemp?.toFixed(1) ?? '—'}°C</span>
              </div>
            </div>
          </div>

          <div className="kb-iz-section kb-iz-section--metrics">
            <div className="kb-iz-section-title mono">PRODUCT STATUS</div>
            <div className="kb-iz-metric-pair">
              <div className="kb-iz-big-metric">
                <div className="kb-iz-big-label mono">VIABILITY</div>
                <div className="kb-iz-big-val" style={{ color: 'var(--amber)' }}>{viab.toFixed(1)}%</div>
              </div>
              <div className="kb-iz-big-metric">
                <div className="kb-iz-big-label mono">DEG. RISK</div>
                <div className="kb-iz-big-val" style={{ color: 'var(--red)' }}>{deg.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="kb-iz-actions mono">
          <button className="kb-iz-action-btn" onClick={() => { setIncidentZoomOpen(false); setReportDrawerOpen(true) }}>
            <kbd className="kb-key kb-key--sm">R</kbd> Generate Report
          </button>
          <button className="kb-iz-action-btn kb-iz-action-btn--warn">
            <kbd className="kb-key kb-key--sm">Q</kbd> Quarantine Shipment
          </button>
          <button className="kb-iz-action-btn">
            <kbd className="kb-key kb-key--sm">P</kbd> Notify Pharmacy
          </button>
          <button className="kb-iz-action-btn kb-iz-action-btn--ghost" onClick={() => setIncidentZoomOpen(false)}>
            <kbd className="kb-key kb-key--sm">esc</kbd> Close
          </button>
        </div>
      </div>
    </div>
  )
}
