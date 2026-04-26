import { useKeyboard } from '../context/KeyboardContext'

const SECTIONS = [
  {
    title: 'NAVIGATION',
    rows: [
      { keys: ['/'],       label: 'Command Palette' },
      { keys: ['?'],       label: 'Ask Aegis (AI Copilot)' },
      { keys: ['M'],       label: 'Mission Control' },
      { keys: ['G'],       label: 'Geo Mode' },
      { keys: ['S'],       label: 'Sensor Matrix' },
    ],
  },
  {
    title: 'PANELS',
    rows: [
      { keys: ['Tab'],     label: 'Next panel' },
      { keys: ['R'],       label: 'Report Drawer' },
      { keys: ['Z'],       label: 'Incident Zoom' },
      { keys: ['Esc'],     label: 'Close overlay' },
    ],
  },
  {
    title: 'DEMO CONTROLS',
    rows: [
      { keys: ['⇧', 'T'], label: 'Inject Sensor Event' },
      { keys: ['⇧', 'N'], label: 'Return to Nominal' },
      { keys: ['⇧', 'E'], label: 'Complete Delivery' },
    ],
  },
  {
    title: 'INCIDENT',
    rows: [
      { keys: ['Z'],       label: 'Incident Zoom Mode' },
      { keys: ['R'],       label: 'Open Report Drawer' },
      { keys: ['Q'],       label: 'Quarantine Shipment' },
      { keys: ['P'],       label: 'Notify Pharmacy' },
    ],
  },
]

export default function ShortcutOverlay() {
  const { shortcutOverlayOpen } = useKeyboard()
  if (!shortcutOverlayOpen) return null

  return (
    <div className="kb-shortcut-overlay">
      <div className="kb-shortcut-panel">
        <div className="kb-shortcut-title mono">AEGIS OPS CONSOLE — KEYBOARD REFERENCE</div>
        <div className="kb-shortcut-grid">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="kb-shortcut-section">
              <div className="kb-shortcut-section-title mono">{sec.title}</div>
              {sec.rows.map((row) => (
                <div key={row.label} className="kb-shortcut-row">
                  <div className="kb-shortcut-keys">
                    {row.keys.map((k, i) => (
                      <span key={i}>
                        <kbd className="kb-key">{k}</kbd>
                        {i < row.keys.length - 1 && <span className="kb-shortcut-plus">+</span>}
                      </span>
                    ))}
                  </div>
                  <span className="kb-shortcut-label">{row.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="kb-shortcut-footer mono">
          Release <kbd className="kb-key kb-key--xs">shift</kbd> to close
        </div>
      </div>
    </div>
  )
}
