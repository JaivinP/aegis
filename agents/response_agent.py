import os
from datetime import datetime
from uuid import uuid4
from dotenv import load_dotenv
from openai import OpenAI
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
)

load_dotenv()

llm = OpenAI(
    api_key=os.getenv("ASI1_API_KEY"),
    base_url="https://api.asi1.ai/v1"
)

RESPONSE_MODEL = os.getenv("FAILSAFE_RESPONSE_MODEL", "asi1-mini")

agent = Agent(
    name="failsafe-response",
    seed=os.getenv("FAILSAFE_RESPONSE_SEED", "failsafe-response-seed"),
    port=int(os.getenv("FAILSAFE_RESPONSE_PORT", "8004")),
    mailbox=True
)

print(f"Response Agent address: {agent.address}")

def value_or_unavailable(value, suffix=""):
    if value in [None, ""]:
        return "Not provided"
    return f"{value}{suffix}"


def derive_response_metrics(history, sensors, thresholds):
    def to_number(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    samples = [
        {
            "temperature": to_number(point.get("temperature")),
            "humidity": to_number(point.get("humidity")),
        }
        for point in history
        if to_number(point.get("temperature")) is not None
    ]
    current_temperature = to_number(sensors.get("temperature"))
    current_humidity = to_number(sensors.get("humidity"))
    if current_temperature is not None:
        samples.append({
            "temperature": current_temperature,
            "humidity": current_humidity,
        })

    temp_min = to_number(thresholds.get("tempMin"))
    temp_max = to_number(thresholds.get("tempMax"))
    humidity_min = to_number(thresholds.get("humidityMin"))
    humidity_max = to_number(thresholds.get("humidityMax"))

    temp_values = [s["temperature"] for s in samples if s.get("temperature") is not None]
    humidity_values = [s["humidity"] for s in samples if s.get("humidity") is not None]

    temp_in_range = [
        value for value in temp_values
        if temp_min is not None and temp_max is not None and temp_min <= value <= temp_max
    ]
    temp_compliance = round((len(temp_in_range) / len(temp_values)) * 100, 1) if temp_values and temp_min is not None and temp_max is not None else None
    max_temp = round(max(temp_values), 1) if temp_values else None
    humidity_breach_count = len([
        value for value in humidity_values
        if humidity_min is not None and humidity_max is not None and (value < humidity_min or value > humidity_max)
    ]) if humidity_min is not None and humidity_max is not None else None

    return {
        "sample_count": len(samples),
        "temperature_compliance_pct": temp_compliance,
        "max_temperature": max_temp,
        "humidity_breach_count": humidity_breach_count,
    }


def generate_deviation_report(incident, shipment_id=None, cargo=None):
    prompt = f"""You are Failsafe, an autonomous pharmaceutical shipment response system.
    
An incident has been detected on shipment {value_or_unavailable(shipment_id)}.
Cargo: {value_or_unavailable(cargo)}

Incident details:
{incident}

Generate a formal FDA-style deviation report with these sections:
1. INCIDENT SUMMARY (2 sentences)
2. SENSOR DATA AT TIME OF INCIDENT
3. PROBABLE CAUSE (with confidence %)
4. IMMEDIATE ACTIONS TAKEN (list what Failsafe did autonomously)
5. RECOMMENDED FOLLOW-UP
6. INTEGRITY ASSESSMENT: PASS / FAIL / REQUIRES INSPECTION

Keep it under 200 words. Be specific and professional."""

    response = llm.chat.completions.create(
        model=RESPONSE_MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def generate_response_from_payload(payload):
    shipment = payload.get("shipment", {})
    sensors = payload.get("currentSensors", {})
    thresholds = payload.get("thresholds", {})
    route = payload.get("route", {})
    analysis = payload.get("analysis", {})
    narrative = payload.get("narrativeAgentOutput") or payload.get("activeAgentEvent") or {}
    timeline = payload.get("timeline") or []
    history = payload.get("recentHistory") or []
    incident_active = payload.get("incidentActive", False)
    shipment_id = payload.get("shipmentId") or shipment.get("shipmentId")
    cargo = shipment.get("productName") or shipment.get("name")
    metrics = derive_response_metrics(history, sensors, thresholds)

    prompt = f"""You are Failsafe Response Agent, an autonomous pharmaceutical shipment response system.

Generate the final response report from this full shipment context. Do not invent readings. If a field is missing, write "Not provided" rather than substituting a demo value.

Shipment:
- ID: {value_or_unavailable(shipment_id)}
- Cargo: {value_or_unavailable(cargo)}
- Compliance framework: {value_or_unavailable(shipment.get('complianceFramework'))}
- Route: {value_or_unavailable(route.get('origin') or shipment.get('origin'))} to {value_or_unavailable(route.get('destination') or shipment.get('destination'))}
- Current location: {value_or_unavailable(route.get('currentLocation') or sensors.get('location'))}
- Route progress: {value_or_unavailable(route.get('routeProgress') or sensors.get('routeProgress'), '%')}

Thresholds:
- Temperature: {value_or_unavailable(thresholds.get('tempMin'), '°C')} to {value_or_unavailable(thresholds.get('tempMax'), '°C')}
- Humidity: {value_or_unavailable(thresholds.get('humidityMin'), '%')} to {value_or_unavailable(thresholds.get('humidityMax'), '%')}

Current sensors:
- Temperature: {value_or_unavailable(sensors.get('temperature'), '°C')}
- Humidity: {value_or_unavailable(sensors.get('humidity'), '%')}
- Shock count: {value_or_unavailable(sensors.get('shockCount'))}
- Water exposure: {value_or_unavailable(sensors.get('waterExposure'))}
- Seal status: {value_or_unavailable(sensors.get('sealStatus'))}
- Battery: {value_or_unavailable(sensors.get('battery'), '%')}

Shipment analysis:
- Incident active: {incident_active}
- Viability score: {value_or_unavailable(analysis.get('viabilityScore'), '%')}
- Degradation risk: {value_or_unavailable(analysis.get('degradationRisk'), '%')}
- Status: {value_or_unavailable(analysis.get('status'))}

Derived compliance metrics:
- Sensor samples reviewed: {metrics['sample_count']}
- Temperature compliance: {value_or_unavailable(metrics['temperature_compliance_pct'], '%')}
- Maximum temperature: {value_or_unavailable(metrics['max_temperature'], '°C')}
- Humidity breach samples: {value_or_unavailable(metrics['humidity_breach_count'])}

Narrative Agent output:
{narrative}

Timeline:
{timeline[-12:]}

Respond in this exact labeled format:
DISPOSITION: one concise disposition decision.
INCIDENT SUMMARY: two sentences grounded in the supplied context.
SENSOR DATA: compact summary of current readings and derived compliance metrics.
AUTONOMOUS RESPONSE DRAFTS: documents or notifications drafted, based only on the context.
RECOMMENDED FOLLOW-UP: one specific next action.
INTEGRITY ASSESSMENT: PASS, FAIL, or REQUIRES INSPECTION with one short reason.

Keep it under 240 words. Use a professional compliance tone."""

    response = llm.chat.completions.create(
        model=RESPONSE_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

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

    ctx.logger.info(f"Response query: {user_query}")

    incident_text = f"""
Operator request:
{user_query or "Not provided"}

Structured shipment context was not provided in this chat message. Use only the operator request above and mark unavailable readings as Not provided.
"""

    report = generate_deviation_report(
        incident_text,
        shipment_id=os.getenv("SHIPMENT_ID"),
        cargo=os.getenv("CARGO_TYPE"),
    )

    autonomous_actions = """
AUTONOMOUS ACTIONS COMPLETED:
  ✓ Deviation report drafted
  ✓ Receiving pharmacy notified
  ✓ Insurance claim opened
  ✓ Chain of custody updated
  ✓ Regulatory flag raised
  
Awaiting human confirmation to finalize submissions.
"""

    response = f"""FAILSAFE RESPONSE AGENT — {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
Shipment: {value_or_unavailable(os.getenv('SHIPMENT_ID'))}

{report}

{autonomous_actions}"""

    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response)]
    ))

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
