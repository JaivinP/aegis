const BASE = 'http://localhost:8000'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

// Shipments
export const listShipments = () => req('GET', '/shipments')
export const getShipment = (id) => req('GET', `/shipments/${id}`)
export const createShipment = (data) => req('POST', '/shipments', data)
export const updateShipment = (id, data) => req('PATCH', `/shipments/${id}`, data)
export const deleteShipment = (id) => req('DELETE', `/shipments/${id}`)

// Shipment types (templates)
export const listShipmentTypes = () => req('GET', '/shipment-types')
export const createShipmentType = (data) => req('POST', '/shipment-types', data)
export const deleteShipmentType = (id) => req('DELETE', `/shipment-types/${id}`)

// Timeline events
export const addEvent = (shipmentId, data) =>
  req('POST', `/shipments/${shipmentId}/events`, data)

// Reports
export const saveReport = (shipmentId, data) =>
  req('POST', `/shipments/${shipmentId}/reports`, data)
export const getLatestReport = (shipmentId) =>
  req('GET', `/shipments/${shipmentId}/reports/latest`)
