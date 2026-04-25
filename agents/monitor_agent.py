import time, os, random, statistics
from datetime import datetime
from uuid import uuid4
from dotenv import load_dotenv
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec
)

load_dotenv()

agent = Agent(
    name="aegis-monitor",
    seed="aegis-monitor-seed-2026-unique",
    port=8002,
    mailbox=True
)

print(f"Monitor Agent address: {agent.address}")

# ─── SIMULATOR (replace with Liam's URL later) ───────────────────────────────
_state = {"temp": 4.1, "humidity": 43.0, "shock": 0.02, "water": False}
_history = []

def add_noise(val, std):
    return val + (random.random() - 0.5) * std

def get_reading():
    _state["temp"] = max(2, min(14,
        add_noise(_state["temp"] + (4.1 - _state["temp"]) * 0.05, 0.3)))
    _state["humidity"] = max(30, min(70,
        add_noise(_state["humidity"] + (43 - _state["humidity"]) * 0.05, 2)))
    _state["shock"] = random.uniform(0.1, 0.4) \
        if random.random() < 0.04 else max(0.01, add_noise(0.02, 0.01))
    _state["water"] = False
    reading = {
        "temperature": round(_state["temp"], 2),
        "humidity": round(_state["humidity"], 1),
        "shock": round(_state["shock"], 3),
        "water_detected": _state["water"],
        "timestamp": time.time()
    }
    _history.append(reading)
    if len(_history) > 300:
        _history.pop(0)
    return reading

def analyze():
    # Build up some history first
    for _ in range(30):
        get_reading()

    current = _history[-1]
    temps = [r["temperature"] for r in _history]
    humids = [r["humidity"] for r in _history]

    baseline = _history[:20]
    temp_mean = statistics.mean([r["temperature"] for r in baseline])
    temp_std = max(0.1, statistics.stdev([r["temperature"] for r in baseline]))
    humid_mean = statistics.mean([r["humidity"] for r in baseline])
    humid_std = max(0.1, statistics.stdev([r["humidity"] for r in baseline]))

    temp_z = (current["temperature"] - temp_mean) / temp_std
    humid_z = (current["humidity"] - humid_mean) / humid_std

    events = []
    for r in _history[-30:]:
        if r["shock"] > 1.5:
            events.append(f"SHOCK {r['shock']}G")
        if r["water_detected"]:
            events.append("WATER DETECTED")
        if abs((r["temperature"] - temp_mean) / temp_std) > 3:
            events.append(f"TEMP ANOMALY {r['temperature']}°C")

    # Classify overall status
    if current["water_detected"] or abs(temp_z) > 5 or current["shock"] > 2.5:
        status = "CRITICAL"
    elif abs(temp_z) > 3 or abs(humid_z) > 3 or current["shock"] > 1.5:
        status = "ANOMALY"
    elif abs(temp_z) > 2 or abs(humid_z) > 2:
        status = "WARNING"
    else:
        status = "NOMINAL"

    return {
        "status": status,
        "current": current,
        "temp_zscore": round(temp_z, 2),
        "humid_zscore": round(humid_z, 2),
        "recent_events": events[-5:],
        "baseline": {
            "temp_mean": round(temp_mean, 2),
            "humid_mean": round(humid_mean, 1)
        }
    }

# ─── CHAT PROTOCOL ───────────────────────────────────────────────────────────
chat_proto = Protocol(name="AgentChatProtocol", version="0.3.0")

@chat_proto.on_message(model=ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=msg.timestamp,
        acknowledged_msg_id=msg.msg_id
    ))

    user_query = None
    for item in msg.content:
        if isinstance(item, TextContent):
            user_query = item.text
            break

    ctx.logger.info(f"Monitor query: {user_query}")

    result = analyze()

    response = f"""AEGIS MONITOR REPORT — {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
Shipment: {os.getenv('SHIPMENT_ID', 'AGS-0042')}

STATUS: {result['status']}

Current Readings:
  Temperature: {result['current']['temperature']}°C (z-score: {result['temp_zscore']}σ, baseline: {result['baseline']['temp_mean']}°C)
  Humidity: {result['current']['humidity']}% (z-score: {result['humid_zscore']}σ, baseline: {result['baseline']['humid_mean']}%)
  Shock: {result['current']['shock']}G
  Water: {'DETECTED' if result['current']['water_detected'] else 'None'}

Recent Events: {', '.join(result['recent_events']) if result['recent_events'] else 'None'}
"""

    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response)]
    ))

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()