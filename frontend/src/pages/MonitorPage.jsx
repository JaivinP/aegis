import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShipment, updateShipment, saveReport } from '../api'
import MonitoringDashboard from '../components/MonitoringDashboard'

export default function MonitorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getShipment(id)
      .then(setShipment)
      .catch((e) => setError(e.message))
  }, [id])

  async function handleEndDelivery(data) {
    const finalStatus = data.incidentActive ? 'ESCALATED' : 'COMPLETED'
    await Promise.all([
      saveReport(id, {
        sensors: data.sensors,
        analysis: data.analysis,
        timeline: data.timeline.map((e) => ({ ...e, time: new Date(e.time).toISOString() })),
        incidentActive: data.incidentActive,
      }).catch(() => {}),
      updateShipment(id, {
        status: finalStatus,
        currentPhase: 'report',
        finalStatus: data.analysis.viabilityScore >= 90 ? 'SAFE' : data.analysis.viabilityScore >= 70 ? 'AT_RISK' : 'COMPROMISED',
      }).catch(() => {}),
    ])
    navigate(`/shipments/${id}/report`, { state: data })
  }

  if (error) return <div className="page-content"><div className="page-inner"><p className="mono" style={{ color: 'var(--red)' }}>{error}</p></div></div>
  if (!shipment) return <div className="page-content"><div className="page-inner db-loading mono">Loading…</div></div>

  return <MonitoringDashboard shipment={shipment} shipmentId={id} onEndDelivery={handleEndDelivery} />
}
