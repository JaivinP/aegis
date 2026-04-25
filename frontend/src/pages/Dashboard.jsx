import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listShipments } from '../api'

const STATUS_STYLE = {
  IN_TRANSIT: { color: 'var(--teal)', bg: 'var(--teal-glow)', border: 'rgba(0,200,180,0.25)' },
  COMPLETED:  { color: 'var(--green)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  ESCALATED:  { color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  CONNECTING: { color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  CREATED:    { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' },
}

function shipmentHref(s) {
  if (s.status === 'COMPLETED' || s.status === 'ESCALATED') return `/shipments/${s.shipmentId}/report`
  if (s.status === 'IN_TRANSIT') return `/shipments/${s.shipmentId}/monitor`
  return `/shipments/${s.shipmentId}/connect`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function Dashboard() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    listShipments()
      .then(setShipments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-content">
      <div className="page-inner">
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="section-label mono">AEGIS CONDITION INTELLIGENCE</div>
            <h1 className="page-title">Shipment Dashboard</h1>
            <p className="page-sub">Monitor active shipments, review past deliveries, and start a new tracking session.</p>
          </div>
          <Link to="/shipments/new" className="btn-primary" style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>
            + New Shipment
          </Link>
        </div>

        {loading && (
          <div className="db-loading mono">Loading shipments…</div>
        )}

        {error && (
          <div className="db-error">
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--red)' }}>
              Could not reach database: {error}
            </span>
          </div>
        )}

        {!loading && !error && shipments.length === 0 && (
          <div className="db-empty">
            <div className="db-empty-icon">◈</div>
            <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No shipments yet.</p>
            <Link to="/shipments/new" className="btn-ghost" style={{ marginTop: '1rem' }}>
              Start your first shipment →
            </Link>
          </div>
        )}

        {!loading && shipments.length > 0 && (
          <div className="history-grid">
            {shipments.map((s) => (
              <ShipmentCard key={s.shipmentId} shipment={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShipmentCard({ shipment: s }) {
  const style = STATUS_STYLE[s.status] || STATUS_STYLE.CREATED
  const href = shipmentHref(s)

  return (
    <Link to={href} className="history-card">
      <div className="history-card-top">
        <span className="history-card-icon">{s.icon || '📦'}</span>
        <span
          className="history-card-status mono"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
        >
          {s.status}
        </span>
      </div>

      <div className="history-card-name">{s.productName}</div>
      <div className="mono history-card-id">{s.shipmentId}</div>

      <div className="history-card-meta">
        <div className="history-meta-row">
          <span className="mono history-meta-label">ORIGIN</span>
          <span className="mono history-meta-value">{s.origin}</span>
        </div>
        <div className="history-meta-row">
          <span className="mono history-meta-label">DEST</span>
          <span className="mono history-meta-value">{s.destination}</span>
        </div>
        {s.complianceFramework && (
          <div className="history-meta-row">
            <span className="mono history-meta-label">FRAMEWORK</span>
            <span className="mono history-meta-value" style={{ color: 'var(--text-dim)', fontSize: '0.62rem' }}>{s.complianceFramework}</span>
          </div>
        )}
        <div className="history-meta-row">
          <span className="mono history-meta-label">CREATED</span>
          <span className="mono history-meta-value">{fmtDate(s.createdAt)}</span>
        </div>
      </div>

      <div className="history-card-cta mono">
        {s.status === 'IN_TRANSIT' ? 'Resume monitoring →' :
         s.status === 'COMPLETED' || s.status === 'ESCALATED' ? 'View report →' :
         'Continue →'}
      </div>
    </Link>
  )
}
