import { Routes, Route, Link, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import NewShipment from './pages/NewShipment'
import ConnectPage from './pages/ConnectPage'
import MonitorPage from './pages/MonitorPage'
import ReportPage from './pages/ReportPage'

export default function App() {
  return (
    <div className="app">
      <AppNav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shipments/new" element={<NewShipment />} />
        <Route path="/shipments/:id/connect" element={<ConnectPage />} />
        <Route path="/shipments/:id/monitor" element={<MonitorPage />} />
        <Route path="/shipments/:id/report" element={<ReportPage />} />
      </Routes>
    </div>
  )
}

function AppNav() {
  const location = useLocation()
  const isMonitor = location.pathname.includes('/monitor')

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AEGIS</span>
        </Link>

        <div className="nav-status" style={{ marginLeft: 'auto' }}>
          <span className="pulse-dot green" />
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--teal)' }}>
            {isMonitor ? 'LIVE MONITORING' : 'SYSTEM ONLINE'}
          </span>
        </div>
      </div>
    </nav>
  )
}
