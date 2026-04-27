# 🛡️ AEGIS – Autonomous Pharmaceutical Cold-Chain Intelligence System

**AEGIS** is an AI-powered autonomous system for real-time monitoring, analysis, and incident response in pharmaceutical supply chain logistics. It uses autonomous agents, machine learning, and environmental sensors to ensure pharmaceutical cargo maintains strict temperature and humidity conditions throughout transit.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Agent System](#agent-system)
5. [Workflow & Data Flow](#workflow--data-flow)
6. [Setup & Installation](#setup--installation)
7. [Usage](#usage)
8. [Technology Stack](#technology-stack)

---

## 📌 Project Overview

### The Problem

Pharmaceutical shipments (vaccines, biologics, medicines) require precise environmental conditions during transport. Even minor deviations in temperature or humidity can:

- Compromise product efficacy
- Violate FDA compliance standards
- Result in product loss and regulatory penalties
- Delay critical deliveries

Traditional monitoring is manual, reactive, and lacks intelligent analysis.

### The Solution

AEGIS is an **autonomous condition intelligence system** that:

✅ **Real-time monitoring** of temperature, humidity, shock, and water exposure  
✅ **Predictive anomaly detection** using statistical analysis and LLMs  
✅ **Autonomous incident response** with AI-generated deviation reports  
✅ **Voice alerts** for critical incidents via ElevenLabs TTS  
✅ **Geospatial visualization** of active shipments on interactive maps  
✅ **Compliance reporting** with FDA-style formal documentation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AEGIS SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │   Frontend (React)   │◄───────►│   Database API       │    │
│  │  • Dashboard         │         │   (FastAPI/Python)  │    │
│  │  • Monitoring UI     │         │  • Shipment CRUD    │    │
│  │  • Geo Mode          │         │  • Sensor Readings  │    │
│  │  • Reporting         │         │  • Events/Timeline  │    │
│  └──────────────────────┘         └──────────────────────┘    │
│           ▲                                   ▲                 │
│           │ HTTP (React Router)               │ FastAPI Endpoints
│           │                                   ▼                 │
│           │                            ┌──────────────┐        │
│           │                            │  MongoDB     │        │
│           │                            │  • Shipments │        │
│           └────────────────────────────│  • Sensors   │        │
│                                        │  • Events    │        │
│  ┌──────────────────────────────────────│  • Reports   │        │
│  │                                       └──────────────┘        │
│  │  ┌──────────────────────────────────────────────────┐        │
│  │  │          AUTONOMOUS AGENT SYSTEM (uAgents)      │        │
│  │  │                                                  │        │
│  │  │  ┌─────────────────────────────────────────┐   │        │
│  │  │  │  Monitor Agent (Port 8002)              │   │        │
│  │  │  │  • Ingests sensor data                  │   │        │
│  │  │  │  • Calculates Z-scores                  │   │        │
│  │  │  │  • Detects anomalies                    │   │        │
│  │  │  └─────────────────────────────────────────┘   │        │
│  │  │                    │                            │        │
│  │  │  ┌─────────────────▼─────────────────────────┐ │        │
│  │  │  │  Prediction Agent (Port 8003)            │ │        │
│  │  │  │  • Forecasts 5/15/30 min trends         │ │        │
│  │  │  │  • Risk scoring                          │ │        │
│  │  │  │  • Degradation modeling                  │ │        │
│  │  │  └─────────────────┬─────────────────────────┘ │        │
│  │  │                    │                            │        │
│  │  │  ┌─────────────────▼─────────────────────────┐ │        │
│  │  │  │  Narrative Agent (Port 8001)             │ │        │
│  │  │  │  • LLM-based analysis (GPT-4 Mini)       │ │        │
│  │  │  │  • Generates analysis narratives         │ │        │
│  │  │  │  • Viability scoring                     │ │        │
│  │  │  └─────────────────┬─────────────────────────┘ │        │
│  │  │                    │                            │        │
│  │  │  ┌─────────────────▼─────────────────────────┐ │        │
│  │  │  │  Response Agent (Port 8004)              │ │        │
│  │  │  │  • Incident response protocol            │ │        │
│  │  │  │  • FDA deviation reports (LLM)           │ │        │
│  │  │  │  • Escalation handling                   │ │        │
│  │  │  └─────────────────┬─────────────────────────┘ │        │
│  │  │                    │                            │        │
│  │  │  ┌─────────────────▼─────────────────────────┐ │        │
│  │  │  │  Voice Agent (Port 8005)                 │ │        │
│  │  │  │  • ElevenLabs TTS synthesis              │ │        │
│  │  │  │  • Spoken alerts for incidents           │ │        │
│  │  │  │  • Voice playback                        │ │        │
│  │  │  └─────────────────────────────────────────┘ │        │
│  │  │                                                  │        │
│  │  └──────────────────────────────────────────────────┘        │
│  │                                                              │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         EXTERNAL SENSOR DATA                              │ │
│  │  (Deno/TypeScript Backend - Port 8080)                   │ │
│  │  • Real-time sensor streaming                            │ │
│  │  • Temperature, Humidity, Acceleration, Water            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Core Components

### 1. **Frontend (React + Vite)**

Located in `frontend/src`

**Pages:**

- **Dashboard** (`pages/Dashboard.jsx`) – Overview of all shipments, active vs completed
- **NewShipment** (`pages/NewShipment.jsx`) – Create shipments with configurable templates
- **ConnectPage** (`pages/ConnectPage.jsx`) – Associate shipment with container/sensor
- **MonitorPage** (`pages/MonitorPage.jsx`) – Real-time monitoring dashboard
- **ReportPage** (`pages/ReportPage.jsx`) – Final incident/compliance reports

**Components:**

- **MonitoringDashboard** – Real-time sensor data, analysis panels, alerts
- **GeoMode** – Interactive map with active shipment geospatial visualization
- **AIAnalysisPanel** – AI analysis narratives and viability scoring
- **SensorCharts** – Temperature/humidity trend visualization (Recharts)
- **TimelinePanel** – Event timeline with incidents and escalations
- **CommandPalette** – Keyboard shortcuts (`G` for geo mode, `A` for AI, etc.)

**Key Features:**

- Real-time data polling (5s interval)
- Keyboard-driven navigation (vim-style `hjkl`, `Enter`, `Esc`)
- Responsive design with mono-spaced typography
- Status indicators with color-coded risk levels

### 2. **Backend (FastAPI/Python)**

Located in `database/`

**Database Schema:**

```python
Shipment {
  shipmentId: str
  productName: str
  origin, destination: str
  tempMin/Max/Nominal: float
  humidityMin/Max/Nominal: float
  status: "CREATED" | "CONNECTING" | "IN_TRANSIT" | "COMPLETED" | "ESCALATED"
  currentPhase: "select" | "connect" | "monitor" | "report"
  createdAt, updatedAt: datetime
}

SensorReading {
  shipmentId: str
  timestamp: datetime
  sensors: {temperature, humidity, shock, battery, ...}
  zScores: {temp_z, humid_z, ...}
  location: {lat, lng}
}

Event {
  shipmentId: str
  type: "SHOCK_EVENT" | "ESCALATION" | "AI_ANALYSIS"
  severity: "INFO" | "WARNING" | "CRITICAL"
  title, description: str
  timestamp: datetime
}

IncidentReport {
  shipmentId: str
  incidents: [{timestamp, title, analysis}]
  finalStatus: "SAFE" | "AT_RISK" | "COMPROMISED"
  complianceReport: str
  createdAt: datetime
}
```

**API Endpoints:**

- `GET /shipments` – List all shipments
- `GET /shipments/active` – List only active shipments (for geo view)
- `POST /shipments` – Create new shipment
- `GET /shipments/{id}` – Get shipment details
- `PATCH /shipments/{id}` – Update shipment status/phase
- `GET /shipments/{id}/readings` – Get sensor readings timeline
- `GET /shipments/{id}/reports` – Get all incident reports
- `POST /agents/narrative/analyze` – Trigger narrative agent analysis
- `POST /agents/response/report` – Generate deviation report

**Database:** MongoDB Atlas

### 3. **Sensor Data Backend (Deno/TypeScript)**

Located in `data-backend/main.ts`

Provides real-time sensor data streaming:

```
GET /  → {
  temperature: float
  humidity: float
  acceleration: {x, y, z}
  water: float (0-100)
}
```

Can fallback to **simulator** if hardware unavailable.

---

## 🤖 Agent System

AEGIS uses **uAgents** (Fetch.ai multi-agent framework) with 5 autonomous agents that communicate asynchronously:

### 1. **Monitor Agent** (Port 8002)

**Role:** Real-time sensor data processing

**Workflow:**

```
Continuously fetches sensor readings
    ↓
Calculates Z-scores (deviation from baseline)
    ↓
Detects anomalies:
  • Temperature out of range?
  • Humidity spike?
  • Shock event (>1.5G)?
  • Water exposure?
    ↓
Publishes anomaly to Narrative Agent
```

**Key Metrics:**

- Z-score > 2.0 = anomaly flagged
- Baseline calculated from first 20 readings
- Maintains 300-reading rolling window

**Code:** `agents/monitor_agent.py`

---

### 2. **Prediction Agent** (Port 8003)

**Role:** Forecasting and degradation risk modeling

**Workflow:**

```
Receives sensor history
    ↓
Calculates rate of change (last 10 readings)
    ↓
Projects 5-min, 15-min, 30-min forecasts
    ↓
Assesses risk:
  • Safe: Trajectory within range
  • At Risk: Trending toward breach
  • Compromised: Already breached
    ↓
Publishes risk assessment to Response Agent
```

**Degradation Model:**

- Safe: <20% deviation
- At Risk: 20-50% deviation
- Compromised: >75% deviation

**Code:** `agents/prediction_agent.py`

---

### 3. **Narrative Agent** (Port 8001)

**Role:** LLM-powered analysis and natural language reporting

**Workflow:**

```
Receives anomaly + sensor context from Monitor
    ↓
Calls OpenAI GPT-4 Mini with:
  • Current sensor values
  • Historical trends
  • Baseline deviations
  • Shipment compliance framework
    ↓
LLM generates:
  1. Status (NOMINAL, ANOMALY, INCIDENT, ESCALATION)
  2. Viability score (0-100%)
  3. Degradation risk percentage
  4. Natural language narrative
  5. Confidence levels for root cause
    ↓
Publishes analysis to dashboard
```

**Prompt Engineering:**

- Contextualizes product type (vaccine, biologics, etc.)
- References compliance standards (FDA 21 CFR Part 211, WHO guidelines)
- Explains reasoning in accessible language
- Suggests next actions

**Code:** `agents/narrative_agent.py`

---

### 4. **Response Agent** (Port 8004)

**Role:** Incident response and formal FDA-style reporting

**Workflow:**

```
Receives escalated incident from Narrative Agent
    ↓
Pulls complete shipment history
    ↓
Calls OpenAI GPT-4 Mini to generate formal FDA deviation report:
  1. INCIDENT SUMMARY
  2. SENSOR DATA AT TIME OF INCIDENT
  3. PROBABLE CAUSE (with confidence %)
  4. IMMEDIATE ACTIONS TAKEN
  5. RECOMMENDATION FOR CARGO
  6. COMPLIANCE ASSESSMENT
    ↓
Report stored in database
    ↓
Triggers Voice Agent for spoken alert
```

**Report Sections:**

```
INCIDENT SUMMARY
A temperature excursion of 12.4°C was detected at 14:32 UTC on
shipment AGS-2847 during transit through Phoenix, AZ.

SENSOR DATA AT TIME OF INCIDENT
• Temperature: 12.4°C (safe range: 2–8°C)
• Humidity: 78% (safe range: 30–50%)
• Location: Phoenix, AZ (Route 34.5% completion)
• Duration: 18 minutes

PROBABLE CAUSE
Refrigeration unit malfunction with 87% confidence.
Secondary factor: External ambient heat exposure (104°F recorded).

IMMEDIATE ACTIONS TAKEN
1. Failsafe alert escalated to logistics partner
2. Deviation report generated and logged
3. Reroute recommendation: Expedited iced container transport
4. Compliance event recorded in shipment timeline

RECOMMENDATION FOR CARGO
Product viability: 34% (COMPROMISED)
Recommendation: Quarantine and lab analysis recommended.
```

**Code:** `agents/response_agent.py`

---

### 5. **Voice Agent** (Port 8005)

**Role:** Spoken alert synthesis via ElevenLabs API

**Workflow:**

```
Receives critical incident from Response Agent
    ↓
Synthesizes natural language alert:
  "Critical temperature alert on shipment mRNA vaccine.
   Detected 12-degree excursion. Recommend immediate
   reroute to Phoenix facility."
    ↓
Calls ElevenLabs API with:
  • Text-to-speech
  • Voice ID (configurable, default: George)
  • Model: ElevenLabs Flash v2.5
  • Output format: MP3 128kbps
    ↓
Streams MP3 audio to frontend
    ↓
Browser plays alert sound
```

**Configuration:**

```env
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=L1xUIshtTbSBoOSqBFaP
```

**Code:** `agents/voice_agent.py`

---

### **Agent Communication**

Agents communicate via uAgents mailbox protocol (async messages):

```
Monitor Agent
    ↓ (anomaly detected)
    → Narrative Agent
          ↓ (analysis complete)
          → Dashboard (display analysis)
          ↓ (if critical)
          → Response Agent
                ↓ (report generated)
                → Voice Agent (play alert)
```

---

## 🔄 Workflow & Data Flow

### **Shipment Lifecycle**

```
1. CREATED
   └─ User creates new shipment with template/custom params
   └─ Stored in database
   └─ Status: CREATED, Phase: select

2. CONNECTING
   └─ User associates container/sensor device
   └─ Shipment ready for pickup
   └─ Status: CONNECTING, Phase: connect

3. IN_TRANSIT
   └─ Shipment picked up
   └─ Monitor Agent begins polling sensor data every ~2 seconds
   └─ Sensor readings streamed from hardware/simulator
   └─ Status: IN_TRANSIT, Phase: monitor

4. MONITORING (Real-time)
   ┌─────────────────────────────────────┐
   │ Sensor Data Arrives                 │
   ├─────────────────────────────────────┤
   │ ↓ Monitor Agent                     │
   │   • Parse temperature, humidity     │
   │   • Calculate Z-scores              │
   │   • Detect anomalies                │
   │ ↓ Prediction Agent                  │
   │   • Forecast 5/15/30 min            │
   │   • Assess degradation risk         │
   │ ↓ Narrative Agent (if anomaly)      │
   │   • LLM analysis                    │
   │   • Generate viability score        │
   │   • Create natural language summary │
   │ ↓ If Critical Incident:             │
   │   • Response Agent generates report │
   │   • Voice Agent creates alert       │
   │ ↓ Dashboard Updates                 │
   │   • Timeline events logged          │
   │   • UI refreshes with latest data   │
   └─────────────────────────────────────┘

5. COMPLETED or ESCALATED
   └─ Shipment arrives at destination
   └─ Phase transitions to "report"
   └─ User reviews final incident report
   └─ Status: COMPLETED or ESCALATED

6. REPORTED
   └─ Final FDA-compliance report generated
   └─ All incidents documented
   └─ Cargo viability assessment
```

### **Real-time Data Flow (Per Sensor Reading)**

```
Hardware/Simulator (Port 8080)
    ↓
    Sensor payload: {temperature, humidity, acceleration, water, timestamp}

Frontend (polling every 2s)
    ↓
    /shipments/{id}/readings
    ↓
    Display on charts, update live metrics

Monitor Agent (continuous)
    ↓
    Receives reading via API or subscription
    ↓
    Calculates: Z-score = (value - baseline_mean) / baseline_stdev
    ↓
    If Z-score > 2.0 or value out of range:
      Publish anomaly event to database
      Notify Narrative Agent

Narrative Agent (triggered by anomaly)
    ↓
    LLM prompt:
    "Temperature anomaly detected: 10.2°C (safe: 2–8°C), Z-score: 2.8.
     Product: mRNA Vaccine (FDA 21 CFR compliance).
     What is the viability risk?"
    ↓
    GPT-4 Mini response:
    {
      status: "ANOMALY",
      viabilityScore: 72,
      degradationRisk: 18,
      narrative: "Temperature excursion detected but within
                  acceptable limits for mRNA vaccines..."
    }
    ↓
    Store in database → Dashboard displays

If Incident Critical:
    ↓
    Response Agent (triggered)
    ↓
    Generate formal FDA deviation report
    ↓
    Voice Agent synthesizes and plays alert
    ↓
    Escalate shipment status to ESCALATED
```

---

## 🚀 Setup & Installation

### **Prerequisites**

- Python 3.10+
- Node.js 18+
- MongoDB Atlas account
- OpenAI API key (GPT-4 Mini)
- ElevenLabs API key
- Deno (for sensor backend)

### **1. Clone Repository**

```bash
git clone https://github.com/JaivinP/aegis.git
cd aegis
```

### **2. Database Setup**

```bash
cd database

# Create .env file with MongoDB credentials
cat > .env << EOF
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB=aegis
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=L1xUIshtTbSBoOSqBFaP
OPENAI_API_KEY=sk-...
EOF

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server (port 8000)
uvicorn main:app --reload
```

### **3. Agent System Setup**

```bash
cd agents

# Install uAgents and dependencies
pip install uagents openai

# Start agents (in separate terminals)
python monitor_agent.py        # Port 8002
python prediction_agent.py     # Port 8003
python narrative_agent.py      # Port 8001
python response_agent.py       # Port 8004
python voice_agent.py          # Port 8005
```

### **4. Sensor Backend (Optional)**

```bash
cd data-backend

# Install Deno if needed
curl -fsSL https://deno.land/x/install/install.sh | sh

# Start sensor server (port 8080)
deno run --allow-net dev
```

### **5. Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Build for production
npm run build
```

### **6. Access Application**

```
http://localhost:5173
```

---

## 📖 Usage

### **Creating a Shipment**

1. **Dashboard** → `+ New Shipment`
2. **Select Template** or **Create Custom**
   - Template: mRNA Vaccine, Biologics, etc.
   - Custom: Define temp/humidity ranges
3. **Enter Shipment Details**
   - Product name, origin, destination
   - Compliance framework (FDA, WHO, etc.)
4. **Create** → Routes to Connect page

### **Monitoring Active Shipment**

1. **Dashboard** → Click "IN_TRANSIT" shipment
2. **Monitor Page** shows:
   - Real-time sensor trends
   - AI analysis panel (narrative + viability score)
   - Event timeline
   - Geo view (keyboard shortcut: `G`)
3. **Alerts**: Critical incidents trigger voice alert

### **Viewing Incident Reports**

1. **Dashboard** → Click "ESCALATED" or "COMPLETED" shipment
2. **Report Page** displays:
   - FDA deviation report
   - Timeline of all incidents
   - Final cargo viability assessment
   - Recommendations

### **Keyboard Shortcuts**

| Key     | Action                   |
| ------- | ------------------------ |
| `G`     | Open Geo Mode (map view) |
| `A`     | Focus AI Analysis panel  |
| `T`     | Toggle Timeline          |
| `↑↓`    | Navigate list items      |
| `Enter` | Select/Confirm           |
| `Esc`   | Close overlay            |
| `?`     | Show help                |

---

## 🛠️ Technology Stack

### **Frontend**

- **React 18** – UI framework
- **React Router v6** – Navigation
- **Recharts** – Data visualization (temperature/humidity charts)
- **Vite** – Build tool
- **CSS Grid/Flexbox** – Responsive layout

### **Backend**

- **FastAPI** – REST API framework
- **MongoDB** – NoSQL database
- **Pydantic** – Data validation
- **Python 3.10+**

### **Agents**

- **uAgents** (Fetch.ai) – Autonomous multi-agent framework
- **OpenAI GPT-4 Mini** – LLM for analysis and reporting
- **ElevenLabs API** – Text-to-speech voice alerts
- **Python async/await** – Concurrent processing

### **Sensors**

- **Deno/TypeScript** – Sensor backend
- Real hardware or simulator
- Reads: Temperature, Humidity, Acceleration (shock), Water exposure

---

## 📊 Data Models

### **Shipment Status Lifecycle**

```
CREATED → CONNECTING → IN_TRANSIT → (COMPLETED or ESCALATED)
                           ↓
                      Real-time monitoring
                      Agent analysis
                      Incident reports
```

### **Sensor Reading Structure**

```json
{
  "shipmentId": "AGS-2847",
  "timestamp": "2026-04-27T14:32:00Z",
  "sensors": {
    "temperature": { "value": 4.1, "unit": "C", "status": "NOMINAL" },
    "humidity": { "value": 43, "unit": "%", "status": "NOMINAL" },
    "shock": { "value": 0.2, "unit": "G", "status": "NOMINAL" },
    "water": { "value": false, "status": "NOMINAL" },
    "battery": 94
  },
  "zScores": {
    "temperature": 0.2,
    "humidity": -0.5
  },
  "location": { "lat": 33.374, "lng": -111.929 }
}
```

### **Analysis Response (Narrative Agent)**

```json
{
  "status": "NOMINAL",
  "viabilityScore": 98.5,
  "degradationRisk": 1.2,
  "narrative": "Temperature and humidity stable within acceptable range for mRNA vaccines...",
  "sealBreachConfidence": 0.2,
  "tamperingConfidence": 0.1,
  "negligenceConfidence": 0.8,
  "recommendations": ["Continue monitoring", "Standard delivery"]
}
```

---

## 🔐 Security & Compliance

- **FDA 21 CFR Part 211** compliance for pharmaceutical manufacturing
- **Data encryption** (MongoDB encrypted connections)
- **API authentication** (can be extended with JWT)
- **Audit trail** of all events and incidents
- **Formal incident reporting** for regulatory submission

---

## 🚧 Future Enhancements

- [ ] Real GPS integration with route optimization
- [ ] ML-based anomaly detection (isolation forests, autoencoders)
- [ ] Predictive maintenance alerts
- [ ] Multi-carrier logistics integration
- [ ] Blockchain for supply chain provenance
- [ ] Mobile app for field operators
- [ ] Advanced analytics dashboard with historical trends
- [ ] Integration with customs/regulatory systems

---

## 👥 Contributors

- **Jaivin P** – Architecture, agents, backend
- **LA Hacks 2026** – Hackathon project

---

## 📄 License

This project is proprietary. For more information, contact the development team.

---

## 📞 Support

For issues or questions:

1. Check the `/database/README.md` for backend setup
2. Review agent logs for autonomous system diagnostics
3. Check Frontend UI for real-time system status

---

**AEGIS: Precision. Autonomy. Compliance.** 🛡️
