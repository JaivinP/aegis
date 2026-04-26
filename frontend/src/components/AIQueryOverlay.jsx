import { useState, useRef, useEffect } from 'react'
import { useKeyboard } from '../context/KeyboardContext'
import { callNarrativeAgent } from '../api'

const EXAMPLE_QUESTIONS = [
  'Why was this shipment flagged?',
  'What caused the temperature spike?',
  'Is this tampering or negligence?',
  'What should the operator do next?',
  'Summarize the incident timeline.',
]

function buildPayload(question, ctx) {
  const shipment = ctx?.shipment || {}
  const sensors = ctx?.sensorsRef?.current || {}
  const analysis = ctx?.analysisRef?.current || {}
  const timeline = ctx?.timelineRef?.current || []
  const incidentActive = ctx?.incidentActiveRef?.current || false

  return {
    query: question,
    shipmentId: ctx?.shipmentId,
    shipment,
    currentSensors: sensors,
    thresholds: {
      tempMin: shipment.tempMin,
      tempMax: shipment.tempMax,
      humidityMin: shipment.humidityMin,
      humidityMax: shipment.humidityMax,
    },
    route: {
      origin: shipment.origin,
      destination: shipment.destination,
      currentLocation: sensors.location,
      routeProgress: sensors.routeProgress,
    },
    timeline,
    incident: incidentActive ? { active: true, ...analysis } : { active: false },
  }
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

  async function submit() {
    if (!question.trim()) return
    setLoading(true)
    setResponse(null)
    try {
      const payload = buildPayload(question, dashboardCtx)
      const result = await callNarrativeAgent(payload)
      setResponse(result.text || 'No response from Failsafe agent.')
    } catch (err) {
      setResponse(`Failsafe agent unavailable: ${err.message}`)
    } finally {
      setLoading(false)
    }
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
            <div className="kb-ai-title">Ask Failsafe</div>
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
            <div className="kb-ai-response-label mono">FAILSAFE ANALYSIS</div>
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
