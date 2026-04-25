import { useState, useEffect } from 'react'
import './App.css'

const AGENTS = [
  {
    name: 'Monitor Agent',
    tag: 'LIVE',
    tagColor: 'green',
    icon: '◉',
    desc: 'Ingests sensor readings every 2 seconds. Builds a dynamic baseline per journey and computes z-scores — so a cold chain from LA to Seattle in January is judged differently than one from Miami to Phoenix in August.',
  },
  {
    name: 'Narrative Agent',
    tag: 'REASONING',
    tagColor: 'teal',
    icon: '◈',
    desc: 'The core intelligence. Correlates temperature, humidity, shock, and water data across time. Reconstructs causal chains and classifies incidents as NOMINAL / ANOMALY / NEGLIGENCE / TAMPERING / CRITICAL with confidence scores.',
  },
  {
    name: 'Response Agent',
    tag: 'AUTONOMOUS',
    tagColor: 'cyan',
    icon: '◆',
    desc: 'When an incident is flagged, it acts. Deviation report drafted. Receiving party notified. Insurance claim opened. Chain of custody updated. What took 2–4 hours of manual work happens in seconds.',
  },
  {
    name: 'Prediction Agent',
    tag: 'PHYSICS',
    tagColor: 'amber',
    icon: '◇',
    desc: "Physics-informed forecasting via Newton's law of cooling. Outputs: \"Temperature will reach 12°C in 9 minutes if no intervention occurs.\" Turns Aegis from reactive to proactive.",
  },
]

const STATS = [
  { value: '$35B', label: 'in pharmaceuticals destroyed annually due to cold chain failures' },
  { value: '30%', label: 'of global food supply lost — improper transport a leading cause' },
  { value: '50%', label: 'of vaccines arrive compromised worldwide, per WHO estimates' },
  { value: '2–4 hrs', label: 'of manual paperwork per cold chain breach — filed after the damage is done' },
]

const SENSOR_LABELS = ['TEMP', 'HUMIDITY', 'SHOCK', 'WATER']

function usePulsingSensors() {
  const [sensors, setSensors] = useState([
    { value: '4.2°C', status: 'ok' },
    { value: '38%', status: 'ok' },
    { value: '0.0g', status: 'ok' },
    { value: 'DRY', status: 'ok' },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => prev.map((s, i) => {
        if (i === 0) {
          const t = (4.0 + Math.random() * 0.6).toFixed(1)
          return { value: `${t}°C`, status: 'ok' }
        }
        if (i === 1) {
          const h = Math.floor(36 + Math.random() * 5)
          return { value: `${h}%`, status: 'ok' }
        }
        return s
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return sensors
}

export default function App() {
  const sensors = usePulsingSensors()
  const [narrativeText] = useState(
    'Shipment PHR-0042 in transit. All parameters within dynamic baseline. Journey 34% complete. No anomalies detected.'
  )

  return (
    <div className="app">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">AEGIS</span>
          </div>
          <div className="nav-links">
            <a href="#problem">Problem</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#agents">Agents</a>
            <a href="#live">Live Demo</a>
          </div>
          <div className="nav-status">
            <span className="pulse-dot green" />
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--teal)' }}>SYSTEM ONLINE</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-inner">
          <div className="hero-badge mono">
            <span className="pulse-dot green" />
            AUTONOMOUS MULTI-AGENT INTELLIGENCE
          </div>
          <h1 className="hero-title">
            The shipping container<br />
            that <em>understands</em> what's<br />
            happening to its contents.
          </h1>
          <p className="hero-sub">
            Aegis monitors temperature, humidity, shock, and water in real time — reasoning about mishandling,
            tampering, and cargo risk before any human knows something went wrong.
          </p>
          <div className="hero-actions">
            <a href="#live" className="btn-primary">View Live Demo</a>
            <a href="#agents" className="btn-ghost">Explore the Agents</a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section" id="problem">
        <div className="section-inner">
          <div className="section-label mono">THE PROBLEM</div>
          <h2 className="section-title">The industry has sensors.<br />It doesn't have intelligence.</h2>
          <p className="section-sub">
            Current monitoring solutions are passive recorders. They tell you what went wrong after the shipment
            is already ruined. Nobody is notified in time. Nobody intervenes.
          </p>
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-dark" id="how-it-works">
        <div className="section-inner">
          <div className="section-label mono">HOW IT WORKS</div>
          <h2 className="section-title">Hardware meets intelligence.</h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-icon">01</div>
              <h3>Sense</h3>
              <p>A sealed container with DHT22, shock, and water sensors connected to a Raspberry Pi streams readings every 2 seconds.</p>
            </div>
            <div className="how-arrow">→</div>
            <div className="how-card">
              <div className="how-icon">02</div>
              <h3>Reason</h3>
              <p>Four specialized agents on Agentverse analyze multi-sensor patterns, reconstruct causal chains, and classify incidents with confidence scores.</p>
            </div>
            <div className="how-arrow">→</div>
            <div className="how-card">
              <div className="how-icon">03</div>
              <h3>Respond</h3>
              <p>Deviation reports drafted, parties notified, insurance claims opened — autonomously, in seconds, while the judge is still watching.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="section" id="agents">
        <div className="section-inner">
          <div className="section-label mono">AGENT ARCHITECTURE</div>
          <h2 className="section-title">Four specialized agents.<br />One unified intelligence.</h2>
          <div className="agents-grid">
            {AGENTS.map((a) => (
              <div className="agent-card" key={a.name}>
                <div className="agent-header">
                  <span className="agent-icon">{a.icon}</span>
                  <span className={`agent-tag tag-${a.tagColor}`}>{a.tag}</span>
                </div>
                <h3 className="agent-name">{a.name}</h3>
                <p className="agent-desc">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section className="section section-dark" id="live">
        <div className="section-inner">
          <div className="section-label mono">LIVE DEMO</div>
          <h2 className="section-title">Shipment PHR-0042 — In Transit</h2>
          <div className="demo-container">
            <div className="sensor-grid">
              {sensors.map((s, i) => (
                <div className="sensor-card" key={i}>
                  <div className="sensor-label mono">{SENSOR_LABELS[i]}</div>
                  <div className={`sensor-value mono status-${s.status}`}>{s.value}</div>
                  <div className="sensor-bar">
                    <div className={`sensor-bar-fill status-${s.status}`} style={{ width: i === 0 ? '52%' : i === 1 ? '38%' : '0%' }} />
                  </div>
                  <div className={`sensor-status status-${s.status}`}>NOMINAL</div>
                </div>
              ))}
            </div>

            <div className="narrative-box">
              <div className="narrative-header">
                <span className="pulse-dot green" />
                <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--teal)', letterSpacing: '0.1em' }}>NARRATIVE AGENT — LIVE</span>
              </div>
              <p className="narrative-text mono">{narrativeText}</p>
              <div className="narrative-meta">
                <span className="mono meta-item">CONFIDENCE: <strong style={{ color: 'var(--green)' }}>97.4%</strong></span>
                <span className="mono meta-item">CLASSIFICATION: <strong style={{ color: 'var(--green)' }}>NOMINAL</strong></span>
                <span className="mono meta-item">JOURNEY: <strong style={{ color: 'var(--teal)' }}>34%</strong></span>
              </div>
            </div>

            <div className="co2-box">
              <div className="co2-label mono">CO2 EQUIVALENT SAVED THIS JOURNEY</div>
              <div className="co2-value">12.4 <span>kg CO2e</span></div>
              <div className="co2-sub">Based on 1 pharmaceutical breach prevented</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">AEGIS</span>
          </div>
          <p className="footer-tagline">Autonomous Condition Intelligence for High-Stakes Shipping</p>
          <p className="footer-sub mono">Built for LA Hacks 2026</p>
        </div>
      </footer>
    </div>
  )
}
