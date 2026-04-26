import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listShipments } from '../api'

const ACTIVE_STATUSES = new Set(['CREATED', 'CONNECTING', 'IN_TRANSIT'])

function shipmentHref(s) {
  if (s.status === 'IN_TRANSIT') return `/shipments/${s.shipmentId}/monitor`
  return `/shipments/${s.shipmentId}/connect`
}

function statusLabel(s) {
  if (s.incidentDetectedAt && s.status === 'IN_TRANSIT') return 'INCIDENT'
  return s.status.replace('_', ' ')
}

function sortActiveShipments(a, b) {
  const aIncident = Boolean(a.incidentDetectedAt && a.status === 'IN_TRANSIT')
  const bIncident = Boolean(b.incidentDetectedAt && b.status === 'IN_TRANSIT')
  if (aIncident !== bIncident) return aIncident ? -1 : 1

  const order = { IN_TRANSIT: 0, CONNECTING: 1, CREATED: 2 }
  const statusDiff = (order[a.status] ?? 9) - (order[b.status] ?? 9)
  if (statusDiff !== 0) return statusDiff

  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
}

export default function ActiveShipmentSwitcher({ currentShipmentId }) {
  const navigate = useNavigate()
  const switcherRef = useRef(null)
  const [shipments, setShipments] = useState([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    function refresh() {
      listShipments()
        .then((rows) => {
          if (!cancelled) setShipments(rows)
        })
        .catch(() => {})
    }

    refresh()
    const interval = setInterval(refresh, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!switcherRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const activeShipments = useMemo(
    () => shipments.filter((s) => ACTIVE_STATUSES.has(s.status)).sort(sortActiveShipments),
    [shipments],
  )

  const incidentCount = activeShipments.filter((s) => s.incidentDetectedAt && s.status === 'IN_TRANSIT').length
  const currentShipment = activeShipments.find((s) => s.shipmentId === currentShipmentId)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredShipments = normalizedQuery
    ? activeShipments.filter((s) => {
        const haystack = `${s.productName || ''} ${s.shipmentId || ''} ${s.origin || ''} ${s.destination || ''}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : activeShipments

  function handleSelect(shipment) {
    setOpen(false)
    setQuery('')
    navigate(shipmentHref(shipment))
  }

  return (
    <div className="active-switcher-row">
      <Link to="/" className="active-switcher-back mono">
        All shipments
      </Link>

      <div className="active-switcher" ref={switcherRef}>
        <button
          className={`active-switcher-trigger ${incidentCount > 0 ? 'active-switcher-trigger--alert' : ''}`}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="active-switcher-trigger-main">
            <span className="mono active-switcher-count">{activeShipments.length}</span>
            <span className="mono active-switcher-label">Active</span>
          </span>
          {incidentCount > 0 && (
            <span className="mono active-switcher-alert">{incidentCount} alert{incidentCount === 1 ? '' : 's'}</span>
          )}
          <span className="active-switcher-chevron">⌄</span>
        </button>

        {open && (
          <div className="active-switcher-menu" role="menu">
            <div className="active-switcher-menu-head">
              <span className="mono active-switcher-menu-title">Active Shipments</span>
              <span className="mono active-switcher-menu-meta">
                {currentShipment ? currentShipment.shipmentId : currentShipmentId}
              </span>
            </div>

            {activeShipments.length > 6 && (
              <input
                className="active-switcher-search mono"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search shipments"
                autoFocus
              />
            )}

            <div className="active-switcher-list">
              {filteredShipments.length === 0 && (
                <div className="active-switcher-empty mono">No matching active shipments</div>
              )}

              {filteredShipments.map((shipment) => {
                const isCurrent = shipment.shipmentId === currentShipmentId
                const hasIncident = Boolean(shipment.incidentDetectedAt && shipment.status === 'IN_TRANSIT')

                return (
                  <button
                    key={shipment.shipmentId}
                    className={`active-switcher-item ${isCurrent ? 'active-switcher-item--current' : ''} ${hasIncident ? 'active-switcher-item--alert' : ''}`}
                    type="button"
                    onClick={() => handleSelect(shipment)}
                    role="menuitem"
                  >
                    <span className="active-switcher-item-icon">{shipment.icon || '□'}</span>
                    <span className="active-switcher-item-body">
                      <span className="active-switcher-item-name">{shipment.productName || 'Untitled shipment'}</span>
                      <span className="mono active-switcher-item-route">
                        {shipment.origin || 'Origin'} to {shipment.destination || 'Destination'}
                      </span>
                      <span className="mono active-switcher-item-id">{shipment.shipmentId}</span>
                    </span>
                    <span className={`mono active-switcher-item-status ${hasIncident ? 'active-switcher-item-status--alert' : ''}`}>
                      {isCurrent ? 'CURRENT' : statusLabel(shipment)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
