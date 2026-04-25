import { useState } from 'react'
import './App.css'
import ShipmentSelector from './components/ShipmentSelector'
import ContainerConnection from './components/ContainerConnection'
import MonitoringDashboard from './components/MonitoringDashboard'
import FinalReport from './components/FinalReport'

const PHASE_LABELS = {
  select: 'SELECT SHIPMENT',
  connect: 'CONNECTING CONTAINER',
  monitor: 'LIVE MONITORING',
  report: 'DELIVERY REPORT',
}

export default function App() {
  const [phase, setPhase] = useState('select')
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [reportData, setReportData] = useState(null)

  function handleSelectShipment(shipment) {
    setSelectedShipment(shipment)
    setPhase('connect')
  }

  function handleConnectionComplete() {
    setPhase('monitor')
  }

  function handleEndDelivery(data) {
    setReportData(data)
    setPhase('report')
  }

  function handleRestart() {
    setSelectedShipment(null)
    setReportData(null)
    setPhase('select')
  }

  return (
    <div className="app">
      <AppNav phase={phase} shipment={selectedShipment} />

      {phase === 'select' && (
        <ShipmentSelector onSelect={handleSelectShipment} />
      )}
      {phase === 'connect' && (
        <ContainerConnection
          shipment={selectedShipment}
          onComplete={handleConnectionComplete}
        />
      )}
      {phase === 'monitor' && (
        <MonitoringDashboard
          shipment={selectedShipment}
          onEndDelivery={handleEndDelivery}
        />
      )}
      {phase === 'report' && (
        <FinalReport
          data={reportData}
          shipment={selectedShipment}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}

function AppNav({ phase, shipment }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AEGIS</span>
        </div>

        {shipment && (
          <div className="nav-shipment-badge mono">{shipment.name.toUpperCase()}</div>
        )}

        <div className="nav-phase-label mono" style={{ marginLeft: 'auto' }}>
          {PHASE_LABELS[phase]}
        </div>

        <div className="nav-status">
          <span className="pulse-dot green" />
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--teal)' }}>
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </nav>
  )
}
