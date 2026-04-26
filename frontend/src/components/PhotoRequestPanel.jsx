import { useState } from 'react'

const CAMERA_TYPES = [
  { key: 'interior', label: 'Interior Camera', icon: '📦', desc: 'Inside the container' },
  { key: 'exterior', label: 'Exterior Camera', icon: '🌐', desc: 'Container exterior & environment' },
]

export default function PhotoRequestPanel({ shipmentId }) {
  const [requests, setRequests] = useState({})
  // requests[key] = { status: 'pending' | 'received', url: string | null, requestedAt: Date }

  function requestPhoto(key) {
    if (requests[key]?.status === 'pending') return
    setRequests((prev) => ({
      ...prev,
      [key]: { status: 'pending', url: null, requestedAt: new Date() },
    }))

    // Simulate IoT device responding after ~3s
    // In production: POST to backend → relay command to device → device uploads photo → poll for URL
    setTimeout(() => {
      setRequests((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: 'received',
          url: key === 'interior'
            ? 'https://placehold.co/600x400/0a1520/00c8b4?text=Interior+Camera+Feed'
            : 'https://placehold.co/600x400/0a1520/7dd3fc?text=Exterior+Camera+Feed',
          receivedAt: new Date(),
        },
      }))
    }, 3000)
  }

  function retake(key) {
    setRequests((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <div className="photo-panel">
      <div className="photo-panel-header">
        <div>
          <div className="section-label mono">REMOTE CAMERAS</div>
          <div className="photo-panel-subtitle">Request a live snapshot from the container cameras.</div>
        </div>
      </div>

      <div className="photo-grid">
        {CAMERA_TYPES.map(({ key, label, icon, desc }) => {
          const req = requests[key]
          return (
            <div key={key} className={`photo-slot ${req?.status === 'received' ? 'photo-slot--received' : ''}`}>
              <div className="photo-slot-header">
                <div>
                  <div className="photo-slot-label mono">{icon} {label}</div>
                  <div className="photo-slot-desc">{desc}</div>
                </div>
                {req?.status === 'received' && (
                  <button className="btn-ghost photo-retake-btn" onClick={() => retake(key)}>
                    ↺ Retake
                  </button>
                )}
              </div>

              {!req && (
                <button className="photo-request-btn" onClick={() => requestPhoto(key)}>
                  <span className="photo-request-icon">📷</span>
                  <span className="mono photo-request-text">Request Snapshot</span>
                </button>
              )}

              {req?.status === 'pending' && (
                <div className="photo-pending">
                  <div className="photo-pending-anim">
                    <span className="spinner spinner--sm" />
                  </div>
                  <div className="mono photo-pending-text">Contacting container…</div>
                  <div className="mono photo-pending-sub">Awaiting device response</div>
                </div>
              )}

              {req?.status === 'received' && req.url && (
                <div className="photo-received">
                  <img src={req.url} alt={label} className="photo-img" />
                  <div className="mono photo-timestamp">
                    Captured {req.receivedAt?.toLocaleTimeString('en-US', { hour12: false })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
