import { createContext, useContext, useState } from 'react'

const KeyboardContext = createContext(null)

export function KeyboardProvider({ children }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [aiQueryOpen, setAiQueryOpen] = useState(false)
  const [missionControlOpen, setMissionControlOpen] = useState(false)
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false)
  const [geoModeOpen, setGeoModeOpen] = useState(false)
  const [sensorMatrixOpen, setSensorMatrixOpen] = useState(false)
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false)
  const [incidentZoomOpen, setIncidentZoomOpen] = useState(false)

  // Set by MonitoringDashboard so overlays can read live state + call callbacks
  const [dashboardCtx, setDashboardCtx] = useState(null)

  function closeAll() {
    setIncidentZoomOpen(false)
    setSensorMatrixOpen(false)
    setGeoModeOpen(false)
    setMissionControlOpen(false)
    setReportDrawerOpen(false)
    setAiQueryOpen(false)
    setCommandPaletteOpen(false)
    setShortcutOverlayOpen(false)
  }

  function openExclusive(view) {
    closeAll()

    switch (view) {
      case 'command-palette': setCommandPaletteOpen(true); break
      case 'ai-query':        setAiQueryOpen(true);        break
      case 'mission-control': setMissionControlOpen(true); break
      case 'shortcut-overlay':setShortcutOverlayOpen(true);break
      case 'geo-mode':        setGeoModeOpen(true);        break
      case 'sensor-matrix':   setSensorMatrixOpen(true);   break
      case 'report-drawer':   setReportDrawerOpen(true);   break
      case 'incident-zoom':   setIncidentZoomOpen(true);   break
      default: break
    }
  }

  function toggleExclusive(view, isOpen) {
    if (isOpen) {
      closeAll()
    } else {
      openExclusive(view)
    }
  }

  function closeTopmost() {
    if (incidentZoomOpen)   { setIncidentZoomOpen(false);   return }
    if (sensorMatrixOpen)   { setSensorMatrixOpen(false);   return }
    if (geoModeOpen)        { setGeoModeOpen(false);        return }
    if (missionControlOpen) { setMissionControlOpen(false); return }
    if (reportDrawerOpen)   { setReportDrawerOpen(false);   return }
    if (aiQueryOpen)        { setAiQueryOpen(false);        return }
    if (commandPaletteOpen) { setCommandPaletteOpen(false); return }
    if (shortcutOverlayOpen){ setShortcutOverlayOpen(false);return }
  }

  return (
    <KeyboardContext.Provider value={{
      commandPaletteOpen, setCommandPaletteOpen,
      aiQueryOpen, setAiQueryOpen,
      missionControlOpen, setMissionControlOpen,
      shortcutOverlayOpen, setShortcutOverlayOpen,
      geoModeOpen, setGeoModeOpen,
      sensorMatrixOpen, setSensorMatrixOpen,
      reportDrawerOpen, setReportDrawerOpen,
      incidentZoomOpen, setIncidentZoomOpen,
      dashboardCtx, setDashboardCtx,
      closeAll,
      openExclusive,
      toggleExclusive,
      closeTopmost,
    }}>
      {children}
    </KeyboardContext.Provider>
  )
}

export function useKeyboard() {
  return useContext(KeyboardContext)
}
