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

function matchSection(text, label) {
  const pattern = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+:|$)`, 'i')
  return text.match(pattern)?.[1]?.trim() || ''
}

function parseConfidence(text) {
  const raw = matchSection(text, 'CONFIDENCE') || text.match(/CONFIDENCE:\s*([^\n]+)/i)?.[1] || ''
  const pct = raw.match(/\d+(\.\d+)?/)?.[0]
  return pct ? Number(pct) : null
}

export function createNarrativeEventFromAgentResponse({ response, shipmentId }) {
  const text = response.text || ''
  const classification = (matchSection(text, 'CLASSIFICATION') || 'ANOMALY').split(/\s+/)[0]
  const confidence = parseConfidence(text)

  return {
    id: `narrative-${Date.now()}`,
    agent: AGENTS.narrative,
    command: `Analyze anomaly on shipment ${shipmentId}`,
    status: classification === 'NOMINAL' ? 'WARNING' : classification,
    createdAt: response.generatedAt || new Date().toISOString(),
    title: `${classification} shipment anomaly detected`,
    classification,
    confidence: confidence ?? 0,
    assessment: matchSection(text, 'ASSESSMENT') || text,
    hypothesis: matchSection(text, 'COMPETING HYPOTHESIS') || matchSection(text, 'COMPETING HYPOTHESES') || 'No alternate hypothesis returned.',
    action: matchSection(text, 'RECOMMENDED ACTION') || 'No immediate action returned.',
    prediction: matchSection(text, 'PREDICTION') || 'No prediction returned.',
    body: text,
  }
}

export function createResponseReportFromAgentResponse({ response, shipmentId }) {
  return {
    agent: AGENTS.response,
    command: `Generate incident response package for shipment ${shipmentId}`,
    status: 'DRAFTED',
    body: response.text || '',
    generatedAt: response.generatedAt || new Date().toISOString(),
  }
}
