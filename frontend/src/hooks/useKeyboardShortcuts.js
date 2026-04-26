import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboard } from '../context/KeyboardContext'
import { stopVoice } from '../api'

export function useKeyboardShortcuts() {
  const kb = useKeyboard()
  const navigate = useNavigate()

  useEffect(() => {
    let shiftTimer = null

    function isTyping() {
      const tag = document.activeElement?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable
    }

    function onKeyDown(e) {
      // Always allow Esc
      if (e.key === 'Escape') {
        kb.closeTopmost()
        return
      }

      // Shift+key demo hotkeys — work even when overlays are open
      if (e.shiftKey && !isTyping()) {
        switch (e.key.toUpperCase()) {
          case 'T':
            e.preventDefault()
            kb.dashboardCtx?.triggerIncident?.()
            return
          case 'N':
            e.preventDefault()
            kb.dashboardCtx?.resetToNominal?.()
            return
          case 'E':
            e.preventDefault()
            kb.dashboardCtx?.endDelivery?.()
            return
        }
      }

      // Show shortcut overlay while Shift is held alone (not while typing)
      if (e.key === 'Shift' && !e.ctrlKey && !e.altKey && !e.metaKey && !isTyping()) {
        shiftTimer = setTimeout(() => kb.openExclusive('shortcut-overlay'), 300)
        return
      }

      // Block other shortcuts while typing or an overlay is blocking input
      if (isTyping()) return
      if (kb.commandPaletteOpen || kb.aiQueryOpen) return

      switch (e.key) {
        case '/':
          e.preventDefault()
          kb.openExclusive('command-palette')
          break
        case '?':
          e.preventDefault()
          kb.openExclusive('ai-query')
          break
        case 'm':
        case 'M':
          e.preventDefault()
          kb.toggleExclusive('mission-control', kb.missionControlOpen)
          break
        case 'g':
        case 'G':
          e.preventDefault()
          kb.toggleExclusive('geo-mode', kb.geoModeOpen)
          break
        case 's':
        case 'S':
          e.preventDefault()
          kb.toggleExclusive('sensor-matrix', kb.sensorMatrixOpen)
          break
        case 'r':
        case 'R':
          e.preventDefault()
          kb.toggleExclusive('report-drawer', kb.reportDrawerOpen)
          break
        case 'z':
        case 'Z':
          e.preventDefault()
          if (kb.dashboardCtx?.incidentActiveRef?.current) {
            kb.toggleExclusive('incident-zoom', kb.incidentZoomOpen)
          }
          break
        case 'x':
        case 'X':
          e.preventDefault()
          stopVoice().catch(() => {})
          break
      }
    }

    function onKeyUp(e) {
      if (e.key === 'Shift') {
        clearTimeout(shiftTimer)
        kb.setShortcutOverlayOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      clearTimeout(shiftTimer)
    }
  }, [kb, navigate])
}
