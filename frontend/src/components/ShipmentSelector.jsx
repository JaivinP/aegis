import { SHIPMENT_TYPES } from '../data/shipmentTypes'

const RISK_COLORS = {
  red: {
    bg: 'rgba(239,68,68,0.1)',
    color: 'var(--red)',
    border: 'rgba(239,68,68,0.25)',
  },
  amber: {
    bg: 'rgba(245,158,11,0.1)',
    color: 'var(--amber)',
    border: 'rgba(245,158,11,0.25)',
  },
  teal: {
    bg: 'rgba(0,200,180,0.1)',
    color: 'var(--teal)',
    border: 'rgba(0,200,180,0.25)',
  },
}

export default function ShipmentSelector({ onSelect }) {
  return (
    <div className="page-content">
      <div className="page-inner">
        <div className="page-header">
          <div className="section-label mono">AEGIS CONDITION INTELLIGENCE</div>
          <h1 className="page-title">Select Shipment Type</h1>
          <p className="page-sub">
            Choose the product category to configure monitoring parameters, compliance thresholds, and AI
            classification baselines.
          </p>
        </div>
        <div className="shipment-grid">
          {SHIPMENT_TYPES.map((s) => (
            <ShipmentCard key={s.id} shipment={s} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ShipmentCard({ shipment, onSelect }) {
  const risk = RISK_COLORS[shipment.riskColor] || RISK_COLORS.teal
  return (
    <div className="shipment-card">
      <div className="shipment-card-header">
        <span className="shipment-icon">{shipment.icon}</span>
        <span
          className="shipment-risk-tag mono"
          style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}
        >
          {shipment.riskLabel}
        </span>
      </div>
      <h2 className="shipment-name">{shipment.name}</h2>
      <div className="shipment-spec">
        <div className="spec-row">
          <span className="spec-label mono">TEMP RANGE</span>
          <span className="spec-value mono">{shipment.tempRange}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label mono">HUMIDITY</span>
          <span className="spec-value mono">{shipment.humidityRange}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label mono">FRAMEWORK</span>
          <span className="spec-value mono spec-value-dim">
            {shipment.complianceFramework}
          </span>
        </div>
      </div>
      <p className="shipment-desc">{shipment.description}</p>
      <button className="btn-start" onClick={() => onSelect(shipment)}>
        Start Shipment →
      </button>
    </div>
  )
}
