import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboard } from '../context/KeyboardContext'

const COMMANDS = [
  { id: 'mission-control', icon: '⬛', label: 'Mission Control', desc: 'All active shipments grid', category: 'Navigation', action: 'mission-control' },
  { id: 'sensor-matrix',   icon: '◫',  label: 'Sensor Matrix',   desc: 'Live sensor wall view',     category: 'Navigation', action: 'sensor-matrix' },
  { id: 'geo-mode',        icon: '◎',  label: 'Geo Mode',        desc: 'Fullscreen map view',       category: 'Navigation', action: 'geo-mode' },
  { id: 'ai-query',        icon: '◈',  label: 'Ask Aegis',       desc: 'AI operational intelligence', category: 'AI', action: 'ai-query' },
  { id: 'report',          icon: '▤',  label: 'Open Report',     desc: 'Delivery report drawer',    category: 'Shipment', action: 'report' },
  { id: 'incident-zoom',   icon: '◉',  label: 'Incident Zoom',   desc: 'Detailed incident analysis', category: 'Incident', action: 'incident-zoom' },
  { id: 'trigger-incident',icon: '⚡', label: 'Inject Sensor Event', desc: 'Simulate mishandling incident', category: 'Demo', action: 'trigger-incident' },
  { id: 'reset-nominal',   icon: '↺',  label: 'Return to Nominal', desc: 'Reset all sensors to normal', category: 'Demo', action: 'reset-nominal' },
  { id: 'end-delivery',    icon: '✓',  label: 'Complete Delivery', desc: 'End delivery and generate report', category: 'Demo', action: 'end-delivery' },
  { id: 'critical',        icon: '⚠',  label: 'Filter: Critical', desc: 'Show only critical shipments', category: 'Filter', action: 'critical' },
  { id: 'dashboard',       icon: '◧',  label: 'Go to Dashboard', desc: 'Return to shipment dashboard', category: 'Navigation', action: 'dashboard' },
]

const CATEGORY_ORDER = ['Navigation', 'AI', 'Shipment', 'Incident', 'Demo', 'Filter']

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setAiQueryOpen,
          setMissionControlOpen, setGeoModeOpen, setSensorMatrixOpen,
          setReportDrawerOpen, setIncidentZoomOpen, dashboardCtx } = useKeyboard()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [commandPaletteOpen])

  if (!commandPaletteOpen) return null

  const filtered = query.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS

  // Group by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filtered.filter((c) => c.category === cat)
    if (items.length) acc.push({ cat, items })
    return acc
  }, [])

  const flat = grouped.flatMap((g) => g.items)

  function execute(cmd) {
    setCommandPaletteOpen(false)
    switch (cmd.action) {
      case 'mission-control':   setMissionControlOpen(true);   break
      case 'sensor-matrix':     setSensorMatrixOpen(true);     break
      case 'geo-mode':          setGeoModeOpen(true);          break
      case 'ai-query':          setAiQueryOpen(true);          break
      case 'report':            setReportDrawerOpen(true);     break
      case 'incident-zoom':     setIncidentZoomOpen(true);     break
      case 'trigger-incident':  dashboardCtx?.triggerIncident?.(); break
      case 'reset-nominal':     dashboardCtx?.resetToNominal?.();  break
      case 'end-delivery':      dashboardCtx?.endDelivery?.();     break
      case 'dashboard':         navigate('/');                 break
      default: break
    }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[selectedIdx]) execute(flat[selectedIdx])
    }
  }

  let flatIdx = 0

  return (
    <div className="kb-backdrop" onClick={() => setCommandPaletteOpen(false)}>
      <div className="kb-palette" onClick={(e) => e.stopPropagation()}>
        <div className="kb-palette-header">
          <span className="kb-palette-slash">/</span>
          <input
            ref={inputRef}
            className="kb-palette-input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search..."
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="kb-key">esc</kbd>
        </div>
        <div className="kb-palette-results">
          {grouped.length === 0 && (
            <div className="kb-palette-empty mono">No commands found</div>
          )}
          {grouped.map(({ cat, items }) => (
            <div key={cat} className="kb-palette-group">
              <div className="kb-palette-category mono">{cat}</div>
              {items.map((cmd) => {
                const idx = flatIdx++
                return (
                  <button
                    key={cmd.id}
                    className={`kb-palette-row ${idx === selectedIdx ? 'kb-palette-row--active' : ''}`}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <span className="kb-palette-icon">{cmd.icon}</span>
                    <span className="kb-palette-label">{cmd.label}</span>
                    <span className="kb-palette-desc">{cmd.desc}</span>
                    {idx === selectedIdx && <kbd className="kb-key kb-key--sm">enter</kbd>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="kb-palette-footer mono">
          <span><kbd className="kb-key kb-key--xs">↑</kbd><kbd className="kb-key kb-key--xs">↓</kbd> navigate</span>
          <span><kbd className="kb-key kb-key--xs">enter</kbd> select</span>
          <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
