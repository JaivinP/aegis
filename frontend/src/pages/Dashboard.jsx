import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listShipments } from '../api'

const STATUS_STYLE = {
  IN_TRANSIT: { color: 'var(--teal)', bg: 'var(--teal-glow)', border: 'rgba(0,200,180,0.25)' },
  COMPLETED:  { color: 'var(--green)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  ESCALATED:  { color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  CONNECTING: { color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  CREATED:    { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' },
}

const ACTIVE_STATUSES = new Set(['CREATED', 'CONNECTING', 'IN_TRANSIT'])

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

    // Poll every 5s to keep active cards up to date
    const interval = setInterval(() => {
      listShipments().then(setShipments).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const active = shipments.filter((s) => ACTIVE_STATUSES.has(s.status))
  const completed = shipments.filter((s) => !ACTIVE_STATUSES.has(s.status))

  return (
    <div className="page-content">
      <div className="page-inner">
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="section-label mono">AEGIS CONDITION INTELLIGENCE</div>
            <h1 className="page-title">Shipment Dashboard</h1>
            <p className="page-sub">Monitor active shipments and review completed deliveries.</p>
          </div>
          <Link to="/shipments/new" className="btn-primary" style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>
            + New Shipment
          </Link>
        </div>

        {loading && <div className="db-loading mono">Loading shipments…</div>}

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

        {!loading && active.length > 0 && (
          <section className="dash-section">
            <div className="dash-section-header">
              <span className="mono dash-section-label">ACTIVE</span>
              <span className="dash-section-count">{active.length}</span>
            </div>
            <div className="history-grid">
              {active.map((s) => <ShipmentCard key={s.shipmentId} shipment={s} />)}
            </div>
          </section>
        )}

        {!loading && completed.length > 0 && (
          <section className="dash-section">
            <div className="dash-section-header">
              <span className="mono dash-section-label">COMPLETED</span>
              <span className="dash-section-count">{completed.length}</span>
            </div>
            <div className="history-grid">
              {completed.map((s) => <ShipmentCard key={s.shipmentId} shipment={s} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function ShipmentCard({ shipment: s }) {
  const hasIncident = Boolean(s.incidentDetectedAt)
  const style = hasIncident && s.status === 'IN_TRANSIT'
    ? { color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)' }
    : STATUS_STYLE[s.status] || STATUS_STYLE.CREATED
  const href = shipmentHref(s)

  return (
    <Link
      to={href}
      className={`history-card ${hasIncident && s.status === 'IN_TRANSIT' ? 'history-card--incident' : ''}`}
    >
      {hasIncident && s.status === 'IN_TRANSIT' && (
        <div className="history-card-incident-banner mono">
          ⚠ INCIDENT ACTIVE — IMMEDIATE ATTENTION REQUIRED
        </div>
      )}

      <div className="history-card-top">
        <span className="history-card-icon">{s.icon || '📦'}</span>
        <span
          className="history-card-status mono"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
        >
          {hasIncident && s.status === 'IN_TRANSIT' ? 'INCIDENT' : s.status.replace('_', ' ')}
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
        {s.tempMin != null && s.tempMax != null && (
          <div className="history-meta-row">
            <span className="mono history-meta-label">TEMP RANGE</span>
            <span className="mono history-meta-value" style={{ color: 'var(--teal)' }}>
              {s.tempMin}°C – {s.tempMax}°C
            </span>
          </div>
        )}
        {s.complianceFramework && (
          <div className="history-meta-row">
            <span className="mono history-meta-label">FRAMEWORK</span>
            <span className="mono history-meta-value" style={{ color: 'var(--text-dim)', fontSize: '0.62rem' }}>{s.complianceFramework}</span>
          </div>
        )}
        {hasIncident && (
          <div className="history-meta-row">
            <span className="mono history-meta-label">INCIDENT AT</span>
            <span className="mono history-meta-value" style={{ color: 'var(--red)' }}>{fmtDate(s.incidentDetectedAt)}</span>
          </div>
        )}
        {!hasIncident && (
          <div className="history-meta-row">
            <span className="mono history-meta-label">CREATED</span>
            <span className="mono history-meta-value">{fmtDate(s.createdAt)}</span>
          </div>
        )}
      </div>

      <div className="history-card-cta mono" style={{ color: hasIncident && s.status === 'IN_TRANSIT' ? 'var(--red)' : undefined }}>
        {hasIncident && s.status === 'IN_TRANSIT' ? 'View incident →' :
         s.status === 'IN_TRANSIT' ? 'Resume monitoring →' :
         s.status === 'COMPLETED' || s.status === 'ESCALATED' ? 'View report →' :
         'Continue →'}
      </div>
    </Link>
  )
}
