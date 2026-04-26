function fmt(value, digits = 1) {
  return Number(value).toFixed(digits)
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

export const AGENTS = {
  narrative: {
    id: 'narrative',
    handle: '@aegis-narrative',
    name: 'Narrative Agent',
    role: 'The brain',
  },
  response: {
    id: 'response',
    handle: '@aegis-response',
    name: 'Response Agent',
    role: 'The responder',
  },
}

export function createNarrativeIncidentOutput({ shipmentId, sensors, analysis }) {
  const excursionTemp = fmt(sensors.temperature)
  const humidity = fmt(sensors.humidity, 0)

  return {
    id: `narrative-${Date.now()}`,
    agent: AGENTS.narrative,
    command: `Analyze anomaly on shipment ${shipmentId}`,
    status: analysis.status,
    createdAt: new Date().toISOString(),
    title: 'Critical shipment anomaly detected',
    classification: 'CRITICAL',
    confidence: 87,
    assessment: `A 3.8G shock was followed by water exposure, seal compromise, humidity rising to ${humidity}%, and temperature reaching ${excursionTemp}°C.`,
    hypothesis: 'Most likely physical mishandling caused container integrity loss. Accidental latch failure remains possible; deliberate tampering is plausible because the seal state changed after impact.',
    action: 'Quarantine on arrival, preserve package evidence, and initiate the response workflow.',
    prediction: 'Without intervention, temperature remains outside tolerance and product viability continues to degrade.',
    body: `CLASSIFICATION: CRITICAL
CONFIDENCE: 87%

ASSESSMENT
A 3.8G shock was followed by water exposure, seal compromise, humidity rising to ${humidity}%, and temperature reaching ${excursionTemp}°C.

COMPETING HYPOTHESIS
Most likely physical mishandling caused container integrity loss. Accidental latch failure remains possible; deliberate tampering is plausible because the seal state changed after impact.

RECOMMENDED ACTION
Quarantine on arrival, preserve package evidence, and initiate the response workflow.

PREDICTION
Without intervention, temperature remains outside tolerance and product viability continues to degrade.`,
  }
}

export function createResponseFinalOutput({ shipment, shipmentId, sensors, analysis, incidentActive }) {
  if (!incidentActive) {
    return {
      agent: AGENTS.response,
      command: `Generate final receiving report for shipment ${shipmentId}`,
      status: 'CLEARED',
      body: `AEGIS RESPONSE AGENT - ${timestamp()}
Shipment: ${shipmentId}
Product: ${shipment.name}

DISPOSITION
Cleared for receiving. No deviation response required.

SENSOR REVIEW
Temperature remained within ${shipment.tempMin}°C - ${shipment.tempMax}°C.
Humidity remained within ${shipment.humidityMin}% - ${shipment.humidityMax}%.
Shock events: ${sensors.shockCount}
Seal status: ${sensors.sealStatus}

RESPONSE ACTIONS
No FDA deviation draft generated.
No quarantine notice generated.
Chain-of-custody record retained for standard compliance review.`,
    }
  }

  return {
    agent: AGENTS.response,
    command: `Generate incident response package for shipment ${shipmentId}`,
    status: 'DRAFTED',
    body: `AEGIS RESPONSE AGENT - ${timestamp()}
Shipment: ${shipmentId}
Product: ${shipment.name}
Incident: HANDLING ANOMALY WITH SUSPECTED SEAL COMPROMISE

INCIDENT SUMMARY
Shipment ${shipmentId} recorded shock, water exposure, seal compromise, and a temperature excursion above the approved range. Product viability is estimated at ${fmt(analysis.viabilityScore)}% with ${fmt(analysis.degradationRisk)}% degradation risk.

SENSOR DATA AT INCIDENT
Temperature: ${fmt(sensors.temperature)}°C
Humidity: ${fmt(sensors.humidity, 0)}%
Shock events: ${sensors.shockCount}
Seal: ${sensors.sealStatus}
Water: ${sensors.waterExposure}

AUTONOMOUS RESPONSE DRAFTS
FDA deviation report prepared
Receiving pharmacy notification prepared
Insurance claim draft opened
Quarantine recommendation prepared
Chain-of-custody record flagged

RECOMMENDED FOLLOW-UP
Do not distribute. Quarantine shipment, retain packaging, and require QA review before release.

INTEGRITY ASSESSMENT
REQUIRES INSPECTION`,
  }
}
