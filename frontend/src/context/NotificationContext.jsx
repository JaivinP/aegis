import { createContext, useContext, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

const NotificationContext = createContext(null)

export function useNotifications() {
  return useContext(NotificationContext)
}

let nextId = 1

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addNotification = useCallback(({ shipmentId, productName, message, type = 'incident' }) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, shipmentId, productName, message, type }])
    // Auto-dismiss after 8 seconds
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000)
  }, [])

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <div className="toast-body">
              <span className="toast-icon">{t.type === 'incident' ? '⚠' : 'ℹ'}</span>
              <div className="toast-text">
                <div className="toast-title mono">{t.productName}</div>
                <div className="toast-msg">{t.message}</div>
              </div>
            </div>
            <div className="toast-actions">
              <Link
                to={`/shipments/${t.shipmentId}/monitor`}
                className="toast-view mono"
                onClick={() => dismiss(t.id)}
              >
                View →
              </Link>
              <button className="toast-dismiss" onClick={() => dismiss(t.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
