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

const CLASSIFICATION_COLORS = {
  NOMINAL:    { bg: 'rgba(110,169,122,0.15)', text: '#6ea97a', border: 'rgba(110,169,122,0.4)' },
  ANOMALY:    { bg: 'rgba(230,190,80,0.15)',  text: '#e6be50', border: 'rgba(230,190,80,0.4)' },
  NEGLIGENCE: { bg: 'rgba(230,140,50,0.15)',  text: '#e68c32', border: 'rgba(230,140,50,0.4)' },
  TAMPERING:  { bg: 'rgba(220,80,80,0.15)',   text: '#dc5050', border: 'rgba(220,80,80,0.4)' },
  CRITICAL:   { bg: 'rgba(220,60,60,0.18)',   text: '#e03030', border: 'rgba(220,60,60,0.5)' },
}

function parseResponse(text) {
  const sections = {}
  const keys = ['CLASSIFICATION', 'CONFIDENCE', 'ASSESSMENT', 'COMPETING HYPOTHESIS', 'RECOMMENDED ACTION', 'PREDICTION']
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const next = keys[i + 1]
    const start = text.indexOf(key + ':')
    if (start === -1) continue
    const valueStart = start + key.length + 1
    const end = next ? text.indexOf(next + ':') : text.length
    sections[key] = text.slice(valueStart, end !== -1 ? end : text.length).trim()
  }
  return Object.keys(sections).length > 0 ? sections : null
}

function FailsafeResponse({ text }) {
  const parsed = parseResponse(text)

  if (!parsed) {
    return (
      <div className="kb-ai-response">
        <div className="kb-ai-response-label mono">FAILSAFE ANALYSIS</div>
        <p className="kb-ai-response-text">{text}</p>
      </div>
    )
  }

  const cls = parsed['CLASSIFICATION']?.split(/[\s/]/)[0]?.trim().toUpperCase()
  const clsStyle = CLASSIFICATION_COLORS[cls] || CLASSIFICATION_COLORS.NOMINAL

  return (
    <div className="kb-ai-response kb-ai-response--parsed">
      <div className="kb-ai-response-label mono">FAILSAFE ANALYSIS</div>

      {cls && (
        <div className="kb-ai-row kb-ai-classification-row">
          <span
            className="kb-ai-badge"
            style={{ background: clsStyle.bg, color: clsStyle.text, border: `1px solid ${clsStyle.border}` }}
          >
            {cls}
          </span>
          {parsed['CONFIDENCE'] && (
            <span className="kb-ai-confidence mono">{parsed['CONFIDENCE']}</span>
          )}
        </div>
      )}

      {parsed['ASSESSMENT'] && (
        <p className="kb-ai-section-text">{parsed['ASSESSMENT']}</p>
      )}

      {parsed['RECOMMENDED ACTION'] && (
        <div className="kb-ai-action-row">
          <span className="kb-ai-action-label mono">ACTION</span>
          <span className="kb-ai-action-text">{parsed['RECOMMENDED ACTION']}</span>
        </div>
      )}

      {parsed['PREDICTION'] && (
        <div className="kb-ai-prediction-row">
          <span className="kb-ai-prediction-label mono">15 MIN</span>
          <span className="kb-ai-prediction-text">{parsed['PREDICTION']}</span>
        </div>
      )}
    </div>
  )
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

        {response && <FailsafeResponse text={response} />}

        <div className="kb-ai-footer mono">
          <span><kbd className="kb-key kb-key--xs">enter</kbd> submit</span>
          <span><kbd className="kb-key kb-key--xs">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
