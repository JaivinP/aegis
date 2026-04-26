import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShipment, updateShipment, saveReport } from '../api'
import MonitoringDashboard from '../components/MonitoringDashboard'
import { SHIPMENT_TYPES } from '../data/shipmentTypes'

function getFallbackShipment(id) {
  const fallback = SHIPMENT_TYPES.find((type) => type.id === id) || SHIPMENT_TYPES[0]
  return {
    ...fallback,
    shipmentId: id || fallback.id,
    productName: fallback.productName || fallback.name,
    origin: fallback.origin || 'Los Angeles, CA',
    destination: fallback.destination || 'Phoenix, AZ',
  }
}

export default function MonitorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState(() => getFallbackShipment(id))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getShipment(id)
      .then((remoteShipment) => {
        setShipment(remoteShipment)
        setError(null)
      })
      .catch((e) => {
        setShipment(getFallbackShipment(id))
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleEndDelivery(data) {
    const finalStatus = data.incidentActive ? 'ESCALATED' : 'COMPLETED'
    await Promise.all([
      saveReport(id, {
        sensors: data.sensors,
        analysis: data.analysis,
        timeline: data.timeline.map((e) => ({ ...e, time: new Date(e.time).toISOString() })),
        incidentActive: data.incidentActive,
        activeAgentEvent: data.activeAgentEvent,
        agentLog: data.agentLog,
      }).catch(() => {}),
      updateShipment(id, {
        status: finalStatus,
        currentPhase: 'report',
        finalStatus: data.analysis.viabilityScore >= 90 ? 'SAFE' : data.analysis.viabilityScore >= 70 ? 'AT_RISK' : 'COMPROMISED',
      }).catch(() => {}),
    ])
    navigate(`/shipments/${id}/report`, { state: { ...data, shipment } })
  }

  if (loading && !shipment) {
    return <div className="page-content"><div className="page-inner db-loading mono">Loading…</div></div>
  }

  return (
    <>
      {error && (
        <div className="db-error db-error--floating">
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--red)' }}>
            Using demo shipment data: {error}
          </span>
        </div>
      )}
      <MonitoringDashboard shipment={shipment} shipmentId={id} onEndDelivery={handleEndDelivery} />
    </>
  )
}
