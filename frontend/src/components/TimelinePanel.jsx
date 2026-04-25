import { useEffect, useRef } from 'react'

const TYPE_STYLES = {
  info: { color: 'var(--teal)', icon: '○' },
  alert: { color: 'var(--red)', icon: '●' },
  doc: { color: 'var(--cyan)', icon: '◆' },
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function TimelinePanel({ timeline }) {
  const listRef = useRef(null)

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [timeline.length])

  return (
    <div className="panel timeline-panel">
      <div className="panel-header">
        <span className="panel-title mono">CHAIN OF CUSTODY</span>
        <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          {timeline.length} EVENT{timeline.length !== 1 ? 'S' : ''}
        </span>
      </div>
      <div className="timeline-list" ref={listRef}>
        {timeline.map((event, i) => {
          const style = TYPE_STYLES[event.type] || TYPE_STYLES.info
          return (
            <div key={i} className="timeline-event">
              <div className="timeline-event-icon" style={{ color: style.color }}>
                {style.icon}
              </div>
              <div className="timeline-event-body">
                <div className="timeline-event-label">{event.label}</div>
                <div className="timeline-event-time mono">{formatTime(event.time)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
