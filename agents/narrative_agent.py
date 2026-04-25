import time, os, statistics, random
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

# ─── SIMULATOR (replace with Liam's URL later) ───────────────────────────────
state = {"temp": 4.1, "humidity": 43.0, "shock": 0.02, "water": False}

def add_noise(val, std):
    return val + (random.random() - 0.5) * std

def get_readings():
    """Simulated sensor data — swap this for Liam's endpoint later"""
    history = []
    t = state["temp"]
    h = state["humidity"]
    for i in range(60):
        t = max(2, min(14, add_noise(t + (4.1 - t) * 0.05, 0.3)))
        h = max(30, min(70, add_noise(h + (43 - h) * 0.05, 2)))
        s = random.uniform(0.1, 0.4) if random.random() < 0.04 else 0.02
        w = False
        history.append({
            "temperature": round(t, 2),
            "humidity": round(h, 1),
            "shock": round(s, 3),
            "water_detected": w,
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

# ─── CHAT PROTOCOL ───────────────────────────────────────────────────────────
chat_proto = Protocol(name="AgentChatProtocol", version="0.3.0")

@chat_proto.on_message(model=ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    # Step 1 — acknowledge immediately
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=msg.timestamp,
        acknowledged_msg_id=msg.msg_id
    ))

    # Step 2 — extract query
    user_query = None
    for item in msg.content:
        if isinstance(item, TextContent):
            user_query = item.text
            break

    ctx.logger.info(f"Query received: {user_query}")

    # Step 3 — get sensor data and build context
    readings = get_readings()
    context = build_context(readings)

    if not context:
        response_text = "Insufficient sensor data to generate assessment. Please ensure the container sensors are active."
    else:
        response_text = generate_narrative(context, user_query)

    # Step 4 — send response back
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response_text)]
    ))

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()