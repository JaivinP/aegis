import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShipment, updateShipment, saveReport } from '../api'
import MonitoringDashboard from '../components/MonitoringDashboard'
import { calculateReportMetrics, getFinalStatusFromViability } from '../utils/reportMetrics'

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
    const metrics = calculateReportMetrics({
      shipment,
      sensors: data.sensors,
      sensorHistory: data.sensorHistory,
      timeline: data.timeline,
    })
    const analysis = {
      ...data.analysis,
      status: metrics.status,
      viabilityScore: metrics.viabilityScore,
      degradationRisk: metrics.degradationRisk,
    }
    const finalStatus = metrics.viabilityScore < 90 ? 'ESCALATED' : 'COMPLETED'
    const reportData = {
      ...data,
      analysis,
      generatedAt: new Date().toISOString(),
    }
    await Promise.all([
      saveReport(id, {
        sensors: reportData.sensors,
        analysis,
        sensorHistory: data.sensorHistory,
        timeline: data.timeline.map((e) => ({ ...e, time: new Date(e.time).toISOString() })),
        incidentActive: data.incidentActive,
        activeAgentEvent: data.activeAgentEvent,
        agentLog: data.agentLog,
      }).catch(() => {}),
      updateShipment(id, {
        status: finalStatus,
        currentPhase: 'report',
        finalStatus: getFinalStatusFromViability(metrics.viabilityScore),
      }).catch(() => {}),
    ])
    navigate(`/shipments/${id}/report`, { state: reportData })
  }

  if (error) return <div className="page-content"><div className="page-inner"><p className="mono" style={{ color: 'var(--red)' }}>{error}</p></div></div>
  if (!shipment) return <div className="page-content"><div className="page-inner db-loading mono">Loading…</div></div>

  return <MonitoringDashboard shipment={shipment} shipmentId={id} onEndDelivery={handleEndDelivery} />
}
