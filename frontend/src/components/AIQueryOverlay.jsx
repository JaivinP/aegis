import { useState, useRef, useEffect } from 'react'
import { useKeyboard } from '../context/KeyboardContext'
import { calculateReportMetrics } from '../utils/reportMetrics'

const EXAMPLE_QUESTIONS = [
  'Why was this shipment flagged?',
  'What caused the temperature spike?',
  'Is this tampering or negligence?',
  'What should the operator do next?',
  'Summarize the incident timeline.',
]

function generateResponse(question, ctx) {
  const q = question.toLowerCase()
  const id = ctx?.shipmentId || 'this shipment'
  const sensors = ctx?.sensorsRef?.current
  const analysis = ctx?.analysisRef?.current
  const metrics = calculateReportMetrics({
    shipment: ctx?.shipment,
    sensors,
    sensorHistory: ctx?.sensorHistoryRef?.current || [],
    timeline: ctx?.timelineRef?.current || [],
  })
  const incident = ctx?.incidentActiveRef?.current
  const humidityDelta = sensors && ctx?.shipment?.humidityNominal !== undefined
    ? Math.round(sensors.humidity - ctx.shipment.humidityNominal)
    : 0

  if (q.includes('flag') || q.includes('why')) {
    if (incident && analysis?.sealBreachConfidence > 50) {
      return `Shipment ${id} was flagged because shock, humidity, temperature, or integrity readings moved outside the configured profile. The observed humidity delta is ${humidityDelta >= 0 ? '+' : ''}${humidityDelta}%, seal breach confidence is ${(analysis.sealBreachConfidence ?? 0).toFixed(0)}%, tampering confidence is ${(analysis.tamperingConfidence ?? 0).toFixed(0)}%, and calculated product viability is ${metrics.viabilityScore.toFixed(0)}%.`
    }
    return `Shipment ${id} is currently operating within normal parameters. No anomalies have been detected. All sensor readings are within their configured safe ranges and the cold-chain integrity is confirmed intact.`
  }

  if (q.includes('temperature') || q.includes('temp')) {
    if (incident) {
      const temp = sensors?.temperature?.toFixed(1) || 'elevated'
      return `The temperature spike on shipment ${id} was triggered approximately 1.5 seconds after the initial shock event at ${temp}°C. The rapid rise pattern — consistent with warm external air exposure — suggests the container seal was compromised by physical impact, allowing ambient heat ingress. This is distinct from refrigeration failure, which produces a slower, more gradual curve.`
    }
    return `Temperature on shipment ${id} is currently nominal and stable. The sensor is reporting within the configured safe range with no abnormal drift detected.`
  }

  if (q.includes('tamper') || q.includes('negligen') || q.includes('more likely')) {
    if (incident) {
      return `Based on the sensor evidence, tampering probability is ${(analysis?.tamperingConfidence ?? 0).toFixed(0)}% and negligence is ${(analysis?.negligenceConfidence ?? 0).toFixed(0)}%. The current classification is derived from the recorded event order, current sensor state, and configured shipment thresholds.`
    }
    return `No incident is currently active on this shipment. Both tampering and negligence confidence scores are within normal bounds. Continue standard monitoring.`
  }

  if (q.includes('operator') || q.includes('next') || q.includes('action') || q.includes('do')) {
    if (incident) {
      return `Recommended operator actions in order of priority: (1) Immediately quarantine the shipment and halt distribution. (2) Generate an FDA cold-chain deviation report — the temperature excursion duration must be documented. (3) Notify the receiving pharmacy of the likely viability impact. (4) Preserve the container and sensor logs as chain-of-custody evidence. (5) Initiate insurance claim if applicable. Press R to open the report drawer.`
    }
    return `Shipment ${id} is proceeding normally. No operator action is required at this time. Continue monitoring and maintain standard cold-chain procedures through delivery.`
  }

  if (q.includes('summar') || q.includes('timeline') || q.includes('incident')) {
    if (incident) {
      return `Incident summary for shipment ${id}: the timeline contains ${metrics.alertCount} alert event${metrics.alertCount === 1 ? '' : 's'}, with current temperature at ${sensors?.temperature?.toFixed(1) ?? 'unknown'}°C and humidity at ${sensors?.humidity ?? 'unknown'}%. The Narrative Agent classified the active anomaly as ${analysis?.status || metrics.status}. Calculated viability is ${metrics.viabilityScore.toFixed(1)}% and degradation risk is ${metrics.degradationRisk.toFixed(1)}%.`
    }
    return `No active incidents to summarize for shipment ${id}. All timeline events are nominal — container connected, route tracking active, sensors reporting normal readings.`
  }

  return `Aegis has analyzed your query regarding shipment ${id}. Current system status is ${analysis?.status || metrics.status} with calculated viability at ${metrics.viabilityScore.toFixed(1)}%. ${incident ? 'An active incident requires operator attention. Use R to open the report drawer or Z to view incident details.' : 'No anomalies detected. All sensors are within configured safe parameters.'}`
}

export default function AIQueryOverlay() {
  const { aiQueryOpen, setAiQueryOpen, dashboardCtx } = useKeyboard()
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (aiQueryOpen) {
      setQuestion('')
      setResponse(null)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [aiQueryOpen])

  if (!aiQueryOpen) return null

  function submit() {
    if (!question.trim()) return
    setLoading(true)
    setResponse(null)
    setTimeout(() => {
      setResponse(generateResponse(question, dashboardCtx))
      setLoading(false)
    }, 900)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="kb-backdrop" onClick={() => setAiQueryOpen(false)}>
      <div className="kb-ai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kb-ai-header">
          <span className="kb-ai-icon">◈</span>
          <div>
            <div className="kb-ai-title">Ask Aegis</div>
            <div className="kb-ai-subtitle mono">Operational intelligence layer</div>
          </div>
          <button className="kb-close-btn" onClick={() => setAiQueryOpen(false)}>✕</button>
        </div>

        <div className="kb-ai-examples">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              className="kb-ai-example"
              onClick={() => { setQuestion(q); setTimeout(() => inputRef.current?.focus(), 10) }}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="kb-ai-input-row">
          <textarea
            ref={inputRef}
            className="kb-ai-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask why a shipment was flagged, what caused an anomaly, or what action to take..."
            rows={2}
          />
          <button
            className="kb-ai-submit"
            onClick={submit}
            disabled={!question.trim() || loading}
          >
            {loading ? '...' : '→'}
          </button>
        </div>

        {loading && (
          <div className="kb-ai-reasoning mono">
            <span className="kb-ai-reasoning-dot" />
            Reasoning through sensor data and incident context...
          </div>
        )}

        {response && (
          <div className="kb-ai-response">
            <div className="kb-ai-response-label mono">AEGIS ANALYSIS</div>
            <p className="kb-ai-response-text">{response}</p>
          </div>
        )}

        <div className="kb-ai-footer mono">
          <span><kbd className="kb-key kb-key--xs">enter</kbd> submit</span>
          <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
