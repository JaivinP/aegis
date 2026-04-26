import { useState, useRef, useEffect } from 'react'
import { useKeyboard } from '../context/KeyboardContext'

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
  const incident = ctx?.incidentActiveRef?.current

  if (q.includes('flag') || q.includes('why')) {
    if (incident && analysis?.sealBreachConfidence > 50) {
      return `Shipment ${id} was flagged because two clustered shock events were followed by a humidity surge of +${sensors ? Math.round(sensors.humidity - (ctx?.shipment?.humidityNominal || 38)) : 17}% and accelerated warming above the safe threshold. This multi-sensor correlation pattern is consistent with seal compromise after physical impact. Seal breach confidence is ${analysis.sealBreachConfidence?.toFixed(0) || 87}%, tampering confidence is ${analysis.tamperingConfidence?.toFixed(0) || 74}%, and product viability has dropped to ${analysis.viabilityScore?.toFixed(0) || 71}%.`
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
      return `Based on the sensor evidence, tampering probability is ${analysis?.tamperingConfidence?.toFixed(0) || 74}% and negligence is ${analysis?.negligenceConfidence?.toFixed(0) || 63}%. The shock-first sequence — impact preceding humidity and temperature rises — is more consistent with deliberate mishandling or drop events than with passive refrigeration failure. However, the pattern does not conclusively rule out accidental mishandling by a logistics handler.`
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
      return `Incident summary for shipment ${id}: A 3.8g impact shock was detected, immediately followed by water exposure and seal compromise. Within 1.5 seconds, temperature began rising above the ${ctx?.shipment?.tempMax || 8}°C threshold and humidity spiked above safe range. The Narrative Agent classified this as a CRITICAL multi-sensor anomaly. Viability score has dropped from 97.8% to ${analysis?.viabilityScore?.toFixed(1) || 71.2}%. Degradation risk is at ${analysis?.degradationRisk?.toFixed(1) || 31.4}%.`
    }
    return `No active incidents to summarize for shipment ${id}. All timeline events are nominal — container connected, route tracking active, sensors reporting normal readings.`
  }

  return `Aegis has analyzed your query regarding shipment ${id}. Current system status is ${analysis?.status || 'NOMINAL'} with viability at ${analysis?.viabilityScore?.toFixed(1) || '97.8'}%. ${incident ? 'An active incident requires operator attention. Use R to open the report drawer or Z to view incident details.' : 'No anomalies detected. All sensors are within configured safe parameters.'}`
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
