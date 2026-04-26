import { useKeyboard } from '../context/KeyboardContext'

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
  const ship     = dashboardCtx?.shipment
  const id       = dashboardCtx?.shipmentId || '—'

  const seal   = analysis?.sealBreachConfidence  ?? 86
  const tamp   = analysis?.tamperingConfidence   ?? 79
  const negl   = analysis?.negligenceConfidence  ?? 18
  const refr   = 11
  const viab   = analysis?.viabilityScore        ?? 71.2
  const deg    = analysis?.degradationRisk        ?? 31.4
  const temp   = sensors?.temperature?.toFixed(1) ?? '—'
  const humid  = sensors?.humidity               ?? '—'

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
          Two clustered shock events were followed by a humidity surge and rapid temperature rise above {ship?.tempMax ?? 8}°C.
          The sequence suggests physical impact caused seal degradation, allowing warm external air exposure.
          Multi-sensor correlation confirms this is inconsistent with normal refrigeration drift.
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
                <span className="kb-iz-evidence-dot dot--red" />
                <span>Shock event — 3.8g impact recorded</span>
              </div>
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot dot--red" />
                <span>Water exposure detected — seal breached</span>
              </div>
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot dot--amber" />
                <span>Humidity +{humid && ship ? Math.round(humid - (ship.humidityNominal || 38)) : 17}% in 41 seconds</span>
              </div>
              <div className="kb-iz-evidence-item">
                <span className="kb-iz-evidence-dot dot--amber" />
                <span>Temperature rising at 1.8°C/min — currently {temp}°C</span>
              </div>
            </div>
          </div>

          <div className="kb-iz-section kb-iz-section--metrics">
            <div className="kb-iz-section-title mono">PRODUCT STATUS</div>
            <div className="kb-iz-metric-pair">
              <div className="kb-iz-big-metric">
                <div className="kb-iz-big-label mono">VIABILITY</div>
                <div className="kb-iz-big-val text-amber">{viab.toFixed(1)}%</div>
              </div>
              <div className="kb-iz-big-metric">
                <div className="kb-iz-big-label mono">DEG. RISK</div>
                <div className="kb-iz-big-val text-red">{deg.toFixed(1)}%</div>
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
