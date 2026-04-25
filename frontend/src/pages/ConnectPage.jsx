import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShipment, updateShipment } from '../api'
import ContainerConnection from '../components/ContainerConnection'

export default function ConnectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getShipment(id)
      .then(setShipment)
      .catch((e) => setError(e.message))
  }, [id])

  async function handleComplete() {
    await updateShipment(id, { status: 'IN_TRANSIT', currentPhase: 'monitor' }).catch(() => {})
    navigate(`/shipments/${id}/monitor`)
  }

  if (error) return <div className="page-content"><div className="page-inner"><p className="mono" style={{ color: 'var(--red)' }}>{error}</p></div></div>
  if (!shipment) return <div className="page-content"><div className="page-inner db-loading mono">Loading…</div></div>

  return <ContainerConnection shipment={shipment} onComplete={handleComplete} />
}
