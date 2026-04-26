import time, os, random, statistics
from datetime import datetime
import math
import requests
from uuid import uuid4
from dotenv import load_dotenv
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
)

load_dotenv()

agent = Agent(
    name="aegis-prediction",
    seed="aegis-prediction-seed-2026-unique",
    port=8003,
    mailbox=True
)

print(f"Prediction Agent address: {agent.address}")

# ─── SIMULATOR ───────────────────────────────────────────────────────────────
_state = {"temp": 4.1, "humidity": 43.0}
_history = []

def add_noise(val, std):
    return val + (random.random() - 0.5) * std

def get_readings(n=30):
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
            "timestamp": time.time()
        }

        for _ in range(n):
            _history.append({
                **reading,
                "temperature": round(reading["temperature"] +
                    (random.random() - 0.5) * 0.1, 2),
                "timestamp": time.time()
            })

    except Exception as e:
        print(f"Server unreachable, using simulator: {e}")
        for _ in range(n):
            _state["temp"] = max(2, min(14,
                add_noise(_state["temp"] + (4.1 - _state["temp"]) * 0.05, 0.3)))
            _state["humidity"] = max(30, min(70,
                add_noise(_state["humidity"] + (43 - _state["humidity"]) * 0.05, 2)))
            _history.append({
                "temperature": round(_state["temp"], 2),
                "humidity": round(_state["humidity"], 1),
                "shock": 0.02,
                "water_detected": False,
                "timestamp": time.time()
            })

    if len(_history) > 300:
        _history[:] = _history[-300:]
    return _history

def predict(readings):
    temps = [r["temperature"] for r in readings]
    humids = [r["humidity"] for r in readings]

    # Rate of change over last 10 readings
    recent_temps = temps[-10:]
    recent_humids = humids[-10:]

    temp_rate = (recent_temps[-1] - recent_temps[0]) / len(recent_temps)
    humid_rate = (recent_humids[-1] - recent_humids[0]) / len(recent_humids)

    current_temp = temps[-1]
    current_humid = humids[-1]

    # Predictions
    pred_5 = current_temp + temp_rate * 5
    pred_15 = current_temp + temp_rate * 15
    pred_30 = current_temp + temp_rate * 30

    # Risk assessment
    if pred_15 > 8:
        risk = "HIGH — cold chain breach projected"
        action = "Immediate intervention required"
    elif pred_15 > 6:
        risk = "MEDIUM — approaching threshold"
        action = "Monitor closely, prepare intervention"
    elif pred_15 < 0:
        risk = "HIGH — freezing risk projected"
        action = "Reduce cooling immediately"
    else:
        risk = "LOW — within safe range"
        action = "No action required"

    return {
        "current_temp": round(current_temp, 2),
        "current_humid": round(current_humid, 1),
        "temp_rate": round(temp_rate, 3),
        "humid_rate": round(humid_rate, 3),
        "predictions": {
            "5min": round(pred_5, 2),
            "15min": round(pred_15, 2),
            "30min": round(pred_30, 2)
        },
        "risk": risk,
        "action": action
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

    ctx.logger.info(f"Prediction query: {user_query}")

    readings = get_readings(30)
    result = predict(readings)

    response = f"""AEGIS PREDICTION REPORT — {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
Shipment: {os.getenv('SHIPMENT_ID', 'AGS-0042')}

CURRENT STATE
  Temperature: {result['current_temp']}°C
  Humidity: {result['current_humid']}%
  Temp rate of change: {result['temp_rate']}°C per reading

TEMPERATURE FORECAST
  In  5 minutes: {result['predictions']['5min']}°C
  In 15 minutes: {result['predictions']['15min']}°C
  In 30 minutes: {result['predictions']['30min']}°C

RISK ASSESSMENT: {result['risk']}
RECOMMENDED ACTION: {result['action']}

Safe range: 2°C – 8°C (pharmaceutical grade)
"""

    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response)]
    ))

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()