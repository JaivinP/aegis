import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getShipment, getLatestReport } from '../api'
import FinalReport from '../components/FinalReport'

export default function ReportPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(location.state || null)
  const [shipment, setShipment] = useState(location.state?.shipment || null)
  const [loading, setLoading] = useState(!location.state)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (shipment) return
    getShipment(id)
      .then(setShipment)
      .catch((e) => setError(e.message))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data) return
    getLatestReport(id)
      .then((report) => {
        // Restore Date objects for timeline
        const timeline = (report.timeline || []).map((e) => ({
          ...e,
          time: new Date(e.time),
        }))
        setData({ ...report, timeline })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return (
    <div className="page-content">
      <div className="page-inner">
        <p className="mono" style={{ color: 'var(--red)' }}>{error}</p>
      </div>
    </div>
  )

  if (loading || !data || !shipment) return (
    <div className="page-content">
      <div className="page-inner db-loading mono">Loading report…</div>
    </div>
  )

  return (
    <FinalReport
      data={data}
      shipment={shipment}
      shipmentId={id}
      onRestart={() => navigate('/')}
    />
  )
}
