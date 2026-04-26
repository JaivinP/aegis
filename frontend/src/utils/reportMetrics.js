function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function countMatches(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0)
}

export function calculateReportMetrics({ shipment = {}, sensors = {}, sensorHistory = [], timeline = [] }) {
  const tempMin = asNumber(shipment.tempMin)
  const tempMax = asNumber(shipment.tempMax)
  const humidityMin = asNumber(shipment.humidityMin)
  const humidityMax = asNumber(shipment.humidityMax)
  const tempNominal = asNumber(shipment.tempNominal)
  const humidityNominal = asNumber(shipment.humidityNominal)

  const readings = [
    ...sensorHistory,
    {
      temperature: sensors.temperature,
      humidity: sensors.humidity,
    },
  ]

  const temperatures = readings
    .map((reading) => asNumber(reading.temperature))
    .filter((value) => value !== null)
  const humidities = readings
    .map((reading) => asNumber(reading.humidity))
    .filter((value) => value !== null)

  const hasTempRange = tempMin !== null && tempMax !== null
  const hasHumidityRange = humidityMin !== null && humidityMax !== null
  const tempOutsideCount = hasTempRange
    ? countMatches(readings, (reading) => {
        const temp = asNumber(reading.temperature)
        return temp !== null && (temp < tempMin || temp > tempMax)
      })
    : 0
  const humidityOutsideCount = hasHumidityRange
    ? countMatches(readings, (reading) => {
        const humidity = asNumber(reading.humidity)
        return humidity !== null && (humidity < humidityMin || humidity > humidityMax)
      })
    : 0

  const shockCount = asNumber(sensors.shockCount) || 0
  const waterDetected = sensors.waterExposure && sensors.waterExposure !== 'DRY'
  const sealCompromised = sensors.sealStatus && sensors.sealStatus !== 'INTACT'
  const alertCount = countMatches(timeline, (event) => event.type === 'alert')

  const maxTemp = temperatures.length ? Math.max(...temperatures) : tempNominal
  const minTemp = temperatures.length ? Math.min(...temperatures) : tempNominal
  const maxHumidity = humidities.length ? Math.max(...humidities) : humidityNominal
  const minHumidity = humidities.length ? Math.min(...humidities) : humidityNominal
  const totalTempReadings = Math.max(temperatures.length, 1)
  const tempCompliancePct = ((totalTempReadings - tempOutsideCount) / totalTempReadings) * 100

  const tempSeverity = hasTempRange && maxTemp !== null && minTemp !== null
    ? Math.max(tempMin - minTemp, maxTemp - tempMax, 0)
    : 0
  const humiditySeverity = hasHumidityRange && maxHumidity !== null && minHumidity !== null
    ? Math.max(humidityMin - minHumidity, maxHumidity - humidityMax, 0)
    : 0

  const risk =
    tempOutsideCount * 4 +
    tempSeverity * 3 +
    humidityOutsideCount * 2 +
    humiditySeverity * 0.6 +
    shockCount * 5 +
    (waterDetected ? 14 : 0) +
    (sealCompromised ? 18 : 0) +
    alertCount * 1.5

  const degradationRisk = clamp(risk, 0, 100)
  const viabilityScore = clamp(100 - degradationRisk, 0, 100)
  const status = viabilityScore >= 90 ? 'NOMINAL' : viabilityScore >= 70 ? 'WARNING' : 'CRITICAL'

  return {
    status,
    viabilityScore,
    degradationRisk,
    tempCompliancePct,
    timeOutsideRangeSeconds: tempOutsideCount * 2,
    maxTemp,
    minTemp,
    maxHumidity,
    minHumidity,
    humidityBreachEvents: humidityOutsideCount,
    shockCount,
    waterDetected,
    sealCompromised,
    alertCount,
  }
}

export function getFinalStatusFromViability(viabilityScore) {
  if (viabilityScore >= 90) return 'SAFE'
  if (viabilityScore >= 70) return 'AT_RISK'
  return 'COMPROMISED'
}
