import { useState, useEffect } from 'react'
import { useKeyboard } from '../context/KeyboardContext'

export default function ReportDrawer() {
  const { reportDrawerOpen, setReportDrawerOpen, dashboardCtx } = useKeyboard()
  const [toast, setToast] = useState(false)
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    if (!reportDrawerOpen) { setApproved(false); setToast(false) }
  }, [reportDrawerOpen])

  useEffect(() => {
    if (!reportDrawerOpen) return
    function onKey(e) {
      if (e.key === 'a' || e.key === 'A') approve()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reportDrawerOpen, approved])

  if (!reportDrawerOpen) return null

  const analysis  = dashboardCtx?.analysisRef?.current
  const sensors   = dashboardCtx?.sensorsRef?.current
  const ship      = dashboardCtx?.shipment
  const id        = dashboardCtx?.shipmentId || '—'
  const incident  = dashboardCtx?.incidentActiveRef?.current

  const viab = analysis?.viabilityScore ?? 97.8
  const deg  = analysis?.degradationRisk ?? 2.4
  const seal = analysis?.sealBreachConfidence ?? 1.2
  const status = incident ? 'COMPROMISED' : 'COMPLIANT'
  const statusColor = incident ? 'var(--red)' : 'var(--teal)'

  function approve() {
    if (approved) return
    setApproved(true)
    setToast(true)
    setTimeout(() => setToast(false), 3500)
    dashboardCtx?.endDelivery?.()
  }

  return (
    <>
      <div className="kb-drawer-backdrop" onClick={() => setReportDrawerOpen(false)} />
      <div className="kb-drawer">
        <div className="kb-drawer-header">
          <div>
            <div className="kb-drawer-title mono">DELIVERY REPORT</div>
            <div className="kb-drawer-id mono">{id}</div>
          </div>
          <button className="kb-close-btn" onClick={() => setReportDrawerOpen(false)}>✕</button>
        </div>

        <div className="kb-drawer-status" style={{ color: statusColor, borderColor: statusColor }}>
          <span className="kb-drawer-status-dot" style={{ background: statusColor }} />
          <span className="mono">{status}</span>
        </div>

        <div className="kb-drawer-section-title mono">PRODUCT SUMMARY</div>
        <div className="kb-drawer-rows">
          <DrawerRow label="Product"          value={ship?.name || '—'} />
          <DrawerRow label="Shipment ID"      value={id} />
          <DrawerRow label="Route"            value={`${ship?.origin || '—'} → ${ship?.destination || '—'}`} />
          <DrawerRow label="Compliance"       value={ship?.complianceFramework || '—'} />
        </div>

        <div className="kb-drawer-divider" />
        <div className="kb-drawer-section-title mono">VIABILITY METRICS</div>
        <div className="kb-drawer-rows">
          <DrawerRow
            label="Viability Score"
            value={`${viab.toFixed(1)}%`}
            valueColor={viab >= 90 ? 'var(--teal)' : viab >= 70 ? 'var(--amber)' : 'var(--red)'}
          />
          <DrawerRow
            label="Degradation Risk"
            value={`${deg.toFixed(1)}%`}
            valueColor={deg < 10 ? 'var(--teal)' : deg < 25 ? 'var(--amber)' : 'var(--red)'}
          />
          <DrawerRow
            label="Seal Breach Confidence"
            value={`${seal.toFixed(1)}%`}
            valueColor={seal < 10 ? 'var(--teal)' : seal < 50 ? 'var(--amber)' : 'var(--red)'}
          />
          <DrawerRow label="Temperature" value={sensors ? `${sensors.temperature?.toFixed(1)}°C` : '—'} />
          <DrawerRow label="Humidity"    value={sensors ? `${sensors.humidity}%` : '—'} />
          <DrawerRow label="Shock Events" value={sensors ? `${sensors.shockCount}` : '0'} />
        </div>

        <div className="kb-drawer-divider" />
        <div className="kb-drawer-section-title mono">RECOMMENDATION</div>
        <div className="kb-drawer-recommendation">
          {incident
            ? 'Product viability is compromised. Do not distribute. Quarantine the shipment and initiate FDA deviation reporting and insurance claim procedures.'
            : 'Shipment completed within all compliance parameters. Product is safe for distribution. No deviations detected during transit.'}
        </div>

        <div className="kb-drawer-actions">
          <button
            className={`kb-drawer-action kb-drawer-action--primary ${approved ? 'kb-drawer-action--approved' : ''}`}
            onClick={approve}
            disabled={approved}
          >
            <kbd className="kb-key kb-key--sm">A</kbd>
            {approved ? 'Approved' : 'Approve Report'}
          </button>
          <button className="kb-drawer-action">
            <kbd className="kb-key kb-key--sm">E</kbd> Export PDF
          </button>
          <button className="kb-drawer-action">
            <kbd className="kb-key kb-key--sm">F</kbd> Generate FDA Packet
          </button>
          <button className="kb-drawer-action">
            <kbd className="kb-key kb-key--sm">P</kbd> Notify Pharmacy
          </button>
        </div>

        <div className="kb-drawer-footer mono">
          <kbd className="kb-key kb-key--xs">esc</kbd> close drawer
        </div>
      </div>

      {toast && (
        <div className="kb-toast">
          Report approved and added to chain of custody.
        </div>
      )}
    </>
  )
}

function DrawerRow({ label, value, valueColor }) {
  return (
    <div className="kb-drawer-row">
      <span className="kb-drawer-row-label mono">{label}</span>
      <span className="kb-drawer-row-value mono" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </span>
    </div>
  )
}
