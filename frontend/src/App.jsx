import { useEffect, useRef } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import './App.css'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { KeyboardProvider } from './context/KeyboardContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { listShipments } from './api'
import Dashboard from './pages/Dashboard'
import NewShipment from './pages/NewShipment'
import ConnectPage from './pages/ConnectPage'
import MonitorPage from './pages/MonitorPage'
import ReportPage from './pages/ReportPage'
import CommandPalette from './components/CommandPalette'
import AIQueryOverlay from './components/AIQueryOverlay'
import MissionControl from './components/MissionControl'
import IncidentZoom from './components/IncidentZoom'
import ReportDrawer from './components/ReportDrawer'
import SensorMatrix from './components/SensorMatrix'
import GeoMode from './components/GeoMode'
import ShortcutOverlay from './components/ShortcutOverlay'

export default function App() {
  return (
    <NotificationProvider>
      <KeyboardProvider>
        <div className="app">
          <AppNav />
          <GlobalShipmentPoller />
          <KeyboardLayer />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shipments/new" element={<NewShipment />} />
            <Route path="/shipments/:id/connect" element={<ConnectPage />} />
            <Route path="/shipments/:id/monitor" element={<MonitorPage />} />
            <Route path="/shipments/:id/report" element={<ReportPage />} />
          </Routes>
        </div>
      </KeyboardProvider>
    </NotificationProvider>
  )
}

function KeyboardLayer() {
  useKeyboardShortcuts()
  return (
    <>
      <CommandPalette />
      <AIQueryOverlay />
      <MissionControl />
      <IncidentZoom />
      <ReportDrawer />
      <SensorMatrix />
      <GeoMode />
      <ShortcutOverlay />
    </>
  )
}

// Polls all shipments every 5s and fires notifications when incidents are detected
function GlobalShipmentPoller() {
  const { addNotification } = useNotifications()
  const knownState = useRef({}) // shipmentId → { incidentDetectedAt, status }
  const location = useLocation()

  useEffect(() => {
    function poll() {
      listShipments().then((shipments) => {
        shipments.forEach((s) => {
          const prev = knownState.current[s.shipmentId]
          const currentlyViewingThis = location.pathname.includes(s.shipmentId)

          if (prev) {
            // Incident newly detected on a shipment we're not currently viewing
            const incidentNew = s.incidentDetectedAt && !prev.incidentDetectedAt
            if (incidentNew && !currentlyViewingThis) {
              addNotification({
                shipmentId: s.shipmentId,
                productName: s.productName,
                message: 'Incident detected — mishandling event recorded',
                type: 'incident',
              })
            }
          }

          // Update known state
          knownState.current[s.shipmentId] = {
            incidentDetectedAt: s.incidentDetectedAt,
            status: s.status,
          }
        })
      }).catch(() => {})
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [location.pathname, addNotification])

  return null
}

function AppNav() {
  const location = useLocation()
  const isMonitor = location.pathname.includes('/monitor')
  const isDashboard = location.pathname === '/'

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AEGIS</span>
        </Link>

        {!isDashboard && (
          <Link to="/shipments/new" className="btn-primary nav-btn-new">
            + New Shipment
          </Link>
        )}

        <div className={`nav-status ${isDashboard ? 'nav-status--dashboard' : ''}`}>
          <span className="pulse-dot green" />
          <span className="mono nav-status-text">
            {isMonitor ? 'LIVE MONITORING' : 'SYSTEM ONLINE'}
          </span>
        </div>
      </div>
    </nav>
  )
}
