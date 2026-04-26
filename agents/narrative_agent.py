import asyncio
import time, os, statistics, random
import math
import requests
from datetime import datetime
from uuid import uuid4
from dotenv import load_dotenv
from openai import OpenAI
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec
)

load_dotenv()

# ─── LLM CLIENT (ASI1) ───────────────────────────────────────────────────────
llm = OpenAI(
    api_key=os.getenv("ASI1_API_KEY"),
    base_url="https://api.asi1.ai/v1"
)

# ─── AGENT ───────────────────────────────────────────────────────────────────
agent = Agent(
    name="stability-narrative",
    seed="stability-narrative-seed-2026-unique",
    port=8001,
    mailbox=True
)

print(f"Narrative Agent address: {agent.address}")

monitor_address = "agent1q2x5fy2xs550nxepfhmtflruwg659m80kghkrztp37m3dapu8fa27s4z89v"
prediction_address = "agent1qwxc6vt44mls54tk3ms7zyrtupffe5hsmlw2lcczgnz2fxna240zghzm5ue"
response_address = "agent1qtjez6jgrqzghvpruhvfewwc2rp3l5au5du2lk3glyqf6fa7tnx5vca5lrt"

# ─── SIMULATOR (replace with Liam's URL later) ───────────────────────────────
state = {"temp": 4.1, "humidity": 43.0, "shock": 0.02, "water": False}

def add_noise(val, std):
    return val + (random.random() - 0.5) * std

def get_readings():
    """Fetch real sensor data from Liam's server"""
    try:
        response = requests.get(
            os.getenv("BACKEND_URL", "http://34.41.16.247:8080"),
            timeout=5
        )
        raw = response.json()

        accel = raw.get("acceleration", {})
        gforce = 0.0
        if all(accel.get(k) is not None for k in ["x", "y", "z"]):
            gforce = round(
                math.sqrt(accel["x"]**2 + accel["y"]**2 + accel["z"]**2) / 9.81, 3)

        reading = {
            "temperature": raw.get("temperature") or 4.1,
            "humidity": raw.get("humidity") or 43.0,
            "shock": gforce,
            "water_detected": (raw.get("water") or 0) > 50,
            "light": raw.get("light") or 0.0,
            "timestamp": time.time()
        }

        # Return 60 copies with slight noise for context building
        # until we have history endpoint
        result = []
        for i in range(60):
            result.append({
                **reading,
                "temperature": round(reading["temperature"] + 
                    (random.random() - 0.5) * 0.1, 2),
                "timestamp": time.time() - (60 - i) * 2
            })
        return result

    except Exception as e:
        # Fall back to simulator if server unreachable
        print(f"Server unreachable, using simulator: {e}")
        return simulate_readings()

def simulate_readings():
    history = []
    t, h = 4.1, 43.0
    for i in range(60):
        t = max(2, min(14, t + (4.1 - t) * 0.05 + (random.random()-0.5)*0.3))
        h = max(30, min(70, h + (43 - h) * 0.05 + (random.random()-0.5)*2))
        s = random.uniform(0.1, 0.4) if random.random() < 0.04 else 0.02
        history.append({
            "temperature": round(t, 2),
            "humidity": round(h, 1),
            "shock": round(s, 3),
            "water_detected": False,
            "timestamp": time.time() - (60 - i) * 2
        })
    return history

# ─── CONTEXT BUILDER ─────────────────────────────────────────────────────────
def build_context(readings):
    if len(readings) < 5:
        return None

    temps = [r["temperature"] for r in readings]
    humids = [r["humidity"] for r in readings]
    shocks = [r["shock"] for r in readings]

    baseline = readings[:20] if len(readings) >= 20 else readings
    temp_mean = statistics.mean([r["temperature"] for r in baseline])
    temp_std = max(0.1, statistics.stdev([r["temperature"] for r in baseline]) if len(baseline) > 1 else 0.1)
    humid_mean = statistics.mean([r["humidity"] for r in baseline])
    humid_std = max(0.1, statistics.stdev([r["humidity"] for r in baseline]) if len(baseline) > 1 else 0.1)

    current = readings[-1]
    temp_z = (current["temperature"] - temp_mean) / temp_std
    humid_z = (current["humidity"] - humid_mean) / humid_std

    recent_temps = temps[-10:]
    temp_rate = (recent_temps[-1] - recent_temps[0]) / len(recent_temps) if len(recent_temps) > 1 else 0
    pred_15 = current["temperature"] + temp_rate * 15

    events = []
    for r in readings[-30:]:
        if r["shock"] > 1.5:
            events.append({"type": "SHOCK", "value": r["shock"]})
        if r["water_detected"]:
            events.append({"type": "WATER_DETECTED"})
        if abs((r["temperature"] - temp_mean) / temp_std) > 3:
            events.append({"type": "TEMP_ANOMALY", "value": r["temperature"]})

    return {
        "shipment_id": os.getenv("SHIPMENT_ID", "STB-0042"),
        "cargo_type": os.getenv("CARGO_TYPE", "Insulin Glargine 100U/ML"),
        "current": current,
        "baselines": {
            "temp_mean": round(temp_mean, 2),
            "temp_std": round(temp_std, 2),
            "humid_mean": round(humid_mean, 1),
            "humid_std": round(humid_std, 1)
        },
        "anomaly_scores": {
            "temperature_zscore": round(temp_z, 2),
            "humidity_zscore": round(humid_z, 2)
        },
        "rates_of_change": {
            "temp_per_interval": round(temp_rate, 3)
        },
        "prediction": {
            "temp_in_15min": round(pred_15, 2)
        },
        "recent_events": events[-10:],
        "event_count": len(events)
    }

# ─── NARRATIVE GENERATOR ─────────────────────────────────────────────────────
async def query_agent(agent_address: str, question: str, ctx: Context) -> str:
    try:
        response_text = ""
        response_event = asyncio.Event()
        
        msg_id = uuid4()
        
        @agent.on_message(model=ChatMessage)
        async def receive_response(ctx: Context, sender: str, msg: ChatMessage):
            nonlocal response_text
            if sender == agent_address:
                for item in msg.content:
                    if isinstance(item, TextContent):
                        response_text = item.text
                response_event.set()
        
        await ctx.send(agent_address, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=msg_id,
            content=[TextContent(type="text", text=question)]
        ))
        
        await asyncio.wait_for(response_event.wait(), timeout=10.0)
        return response_text
        
    except asyncio.TimeoutError:
        return "Agent timeout"
    except Exception as e:
        return f"Agent error: {e}"

def generate_narrative(context, user_query=None):
    prompt = f"""You are Stability, an autonomous pharmaceutical and food shipment intelligence system.

You reason about sensor data the way a forensic logistics expert would — identifying patterns, 
physical causation, and distinguishing accidental mishandling from deliberate tampering.

Shipment context:
- ID: {context['shipment_id']}
- Cargo: {context['cargo_type']}
- Current temperature: {context['current']['temperature']}°C (baseline: {context['baselines']['temp_mean']}°C ± {context['baselines']['temp_std']}°C)
- Temperature z-score: {context['anomaly_scores']['temperature_zscore']} standard deviations from baseline
- Current humidity: {context['current']['humidity']}% (baseline: {context['baselines']['humid_mean']}% ± {context['baselines']['humid_std']}%)
- Humidity z-score: {context['anomaly_scores']['humidity_zscore']} standard deviations from baseline
- Current shock: {context['current']['shock']}G
- Water detected: {context['current']['water_detected']}
- Temperature rate of change: {context['rates_of_change']['temp_per_interval']}°C per reading
- Predicted temperature in 15 minutes: {context['prediction']['temp_in_15min']}°C
- Recent anomalous events: {context['recent_events']}
- Total event count: {context['event_count']}

{"User query: " + user_query if user_query else "Provide a proactive status assessment."}

Respond with:
1. CLASSIFICATION: (NOMINAL / ANOMALY / NEGLIGENCE / TAMPERING / CRITICAL)
2. CONFIDENCE: percentage for your classification
3. ASSESSMENT: 2-3 sentences explaining what is physically happening
4. COMPETING HYPOTHESES: one alternative explanation with confidence %
5. RECOMMENDED ACTION: one specific immediate action if needed, or NONE if nominal
6. PREDICTION: what happens in the next 15 minutes if no action is taken

Be precise. Cite specific sensor values and z-scores. A logistics manager's 
decision depends on your output. Keep total response under 150 words."""

    response = llm.chat.completions.create(
        model="asi1-mini",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def build_context_from_payload(payload):
    shipment = payload.get("shipment", {})
    sensors = payload.get("currentSensors", {})
    thresholds = payload.get("thresholds", {})
    route = payload.get("route", {})
    history = payload.get("recentHistory") or []
    timeline = payload.get("timeline") or []
    incident = payload.get("incident") or {}

    temperatures = [r.get("temperature") for r in history if r.get("temperature") is not None]
    humidities = [r.get("humidity") for r in history if r.get("humidity") is not None]
    current_temp = sensors.get("temperature", shipment.get("tempNominal", 4.1))
    current_humidity = sensors.get("humidity", shipment.get("humidityNominal", 43))
    temp_baseline = temperatures[:20] or [shipment.get("tempNominal", current_temp)]
    humidity_baseline = humidities[:20] or [shipment.get("humidityNominal", current_humidity)]
    temp_mean = statistics.mean(temp_baseline)
    humidity_mean = statistics.mean(humidity_baseline)
    temp_std = max(0.1, statistics.stdev(temp_baseline) if len(temp_baseline) > 1 else 0.1)
    humidity_std = max(0.1, statistics.stdev(humidity_baseline) if len(humidity_baseline) > 1 else 0.1)
    recent_temps = temperatures[-10:] or [current_temp]
    temp_rate = (recent_temps[-1] - recent_temps[0]) / max(1, len(recent_temps)) if len(recent_temps) > 1 else 0

    return {
        "shipment_id": payload.get("shipmentId") or shipment.get("shipmentId") or os.getenv("SHIPMENT_ID", "AGS-0042"),
        "cargo_type": shipment.get("productName") or shipment.get("name") or os.getenv("CARGO_TYPE", "Insulin Glargine 100U/ML"),
        "compliance_framework": shipment.get("complianceFramework"),
        "origin": route.get("origin") or shipment.get("origin"),
        "destination": route.get("destination") or shipment.get("destination"),
        "current_location": route.get("currentLocation") or sensors.get("location"),
        "route_progress": route.get("routeProgress") or sensors.get("routeProgress"),
        "thresholds": thresholds,
        "current": {
            "temperature": current_temp,
            "humidity": current_humidity,
            "shock": sensors.get("shockG", sensors.get("shockCount", 0)),
            "shock_count": sensors.get("shockCount", 0),
            "water_detected": sensors.get("waterExposure") not in [None, "DRY", False],
            "seal_status": sensors.get("sealStatus"),
            "battery": sensors.get("battery"),
            "timestamp": payload.get("timestamp") or time.time(),
        },
        "baselines": {
            "temp_mean": round(temp_mean, 2),
            "temp_std": round(temp_std, 2),
            "humid_mean": round(humidity_mean, 1),
            "humid_std": round(humidity_std, 1),
        },
        "anomaly_scores": {
            "temperature_zscore": round((current_temp - temp_mean) / temp_std, 2),
            "humidity_zscore": round((current_humidity - humidity_mean) / humidity_std, 2),
        },
        "rates_of_change": {
            "temp_per_interval": round(temp_rate, 3),
        },
        "prediction": {
            "temp_in_15min": round(current_temp + temp_rate * 15, 2),
        },
        "recent_events": timeline[-10:],
        "event_count": len(timeline),
        "incident": incident,
    }


def generate_narrative_from_payload(payload):
    context = build_context_from_payload(payload)
    user_query = payload.get("query") or "Classify this shipment anomaly using the provided shipment, route, threshold, sensor, history, and timeline context."
    prompt = f"""You are Failsafe Narrative Agent, an autonomous shipment intelligence agent.

Use the complete context below. Do not invent readings not present in the context.

Shipment:
- ID: {context['shipment_id']}
- Cargo: {context['cargo_type']}
- Compliance framework: {context.get('compliance_framework')}
- Route: {context.get('origin')} to {context.get('destination')}
- Current location: {context.get('current_location')}
- Route progress: {context.get('route_progress')}%

Thresholds:
- Temperature: {context['thresholds'].get('tempMin')}°C to {context['thresholds'].get('tempMax')}°C
- Humidity: {context['thresholds'].get('humidityMin')}% to {context['thresholds'].get('humidityMax')}%

Current sensors:
- Temperature: {context['current']['temperature']}°C
- Humidity: {context['current']['humidity']}%
- Shock count/G reading: {context['current']['shock_count']} / {context['current']['shock']}
- Water detected: {context['current']['water_detected']}
- Seal status: {context['current']['seal_status']}
- Battery: {context['current']['battery']}%

Derived analysis:
- Temperature baseline: {context['baselines']['temp_mean']}°C ± {context['baselines']['temp_std']}°C
- Humidity baseline: {context['baselines']['humid_mean']}% ± {context['baselines']['humid_std']}%
- Temperature z-score: {context['anomaly_scores']['temperature_zscore']}
- Humidity z-score: {context['anomaly_scores']['humidity_zscore']}
- Temperature rate per reading: {context['rates_of_change']['temp_per_interval']}°C
- Predicted temperature in 15 minutes: {context['prediction']['temp_in_15min']}°C

Incident trigger:
{context['incident']}

Recent timeline:
{context['recent_events']}

User query: {user_query}

Respond in this exact format:
CLASSIFICATION: NOMINAL / ANOMALY / NEGLIGENCE / TAMPERING / CRITICAL
CONFIDENCE: percentage
ASSESSMENT: 2-3 sentences grounded in the readings
COMPETING HYPOTHESIS: one alternative explanation with confidence
RECOMMENDED ACTION: one immediate action
PREDICTION: what happens in the next 15 minutes if no action is taken
"""
    response = llm.chat.completions.create(
        model="asi1-mini",
        max_tokens=450,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def generate_summary(readings):
    temps = [r["temperature"] for r in readings]
    humids = [r["humidity"] for r in readings]
    shocks = [r["shock"] for r in readings]
    
    temp_mean = round(statistics.mean(temps), 2)
    temp_max = round(max(temps), 2)
    temp_min = round(min(temps), 2)
    humid_mean = round(statistics.mean(humids), 1)
    shock_max = round(max(shocks), 3)
    water_events = sum(1 for r in readings if r["water_detected"])
    shock_events = sum(1 for r in readings if r["shock"] > 1.5)
    temp_breaches = sum(1 for r in readings if r["temperature"] > 8)
    
    # Overall integrity verdict
    if temp_breaches > 5 or water_events > 0:
        verdict = "FAIL — Cargo integrity compromised"
        action = "Do not distribute. Quarantine and inspect immediately."
    elif temp_breaches > 0 or shock_events > 2:
        verdict = "REQUIRES INSPECTION — Anomalies detected"
        action = "Physical inspection required before distribution."
    else:
        verdict = "PASS — Cargo integrity maintained"
        action = "Cleared for distribution."

    prompt = f"""You are Failsafe, an autonomous shipment intelligence system.
    
Generate a concise end-of-shipment summary report for:
Shipment: {os.getenv('SHIPMENT_ID', 'AGS-0042')}
Cargo: {os.getenv('CARGO_TYPE', 'Insulin Glargine 100U/ML')}

Journey statistics:
- Duration: {len(readings) * 2} seconds of monitoring
- Temperature: avg {temp_mean}°C, min {temp_min}°C, max {temp_max}°C
- Humidity: avg {humid_mean}%
- Max shock recorded: {shock_max}G
- Shock events (>1.5G): {shock_events}
- Temperature breaches (>8°C): {temp_breaches}
- Water detection events: {water_events}
- Overall verdict: {verdict}
- Required action: {action}

Write a professional 150-word end-of-shipment report covering:
1. JOURNEY SUMMARY
2. KEY STATISTICS  
3. INCIDENTS (if any)
4. INTEGRITY VERDICT
5. NEXT STEPS

Be specific, cite numbers, professional tone."""

    response = llm.chat.completions.create(
        model="asi1-mini",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

# ─── CHAT PROTOCOL ───────────────────────────────────────────────────────────
chat_proto = Protocol(name="AgentChatProtocol", version="0.3.0")

@chat_proto.on_message(model=ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=msg.timestamp,
        acknowledged_msg_id=msg.msg_id
    ))

    user_query = ""
    for item in msg.content:
        if isinstance(item, TextContent):
            user_query = item.text
            break

    ctx.logger.info(f"Orchestrating agents for query: {user_query}")

    readings = get_readings()
    context = build_context(readings)

    monitor_data = await query_agent(
        monitor_address,
        "Give me current sensor status and anomaly scores",
        ctx
    )

    prediction_data = await query_agent(
        prediction_address,
        "What is the temperature forecast for the next 15 minutes",
        ctx
    )

    enriched_context = f"""
SENSOR CONTEXT:
{context}

MONITOR AGENT REPORT:
{monitor_data}

PREDICTION AGENT FORECAST:
{prediction_data}

USER QUERY: {user_query}
"""

    if user_query and any(word in user_query.lower() for word in
                         ["summary", "final", "arrived", "what happened"]):
        response_text = generate_summary(readings)
    else:
        response_text = generate_narrative(context, enriched_context)

    if any(word in response_text for word in ["CRITICAL", "TAMPERING"]):
        ctx.logger.info("Critical incident detected — triggering response agent")
        await ctx.send(response_address, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[TextContent(type="text", text=f"INCIDENT DETECTED: {response_text[:200]}")]
        ))

    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response_text)]
    ))

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
