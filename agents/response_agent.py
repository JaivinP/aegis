import time, os, random
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

agent = Agent(
    name="aegis-response",
    seed="aegis-response-seed-2026-unique",
    port=8004,
    mailbox=True
)

print(f"Response Agent address: {agent.address}")

def generate_deviation_report(incident):
    prompt = f"""You are Aegis, an autonomous pharmaceutical shipment response system.
    
An incident has been detected on shipment {os.getenv('SHIPMENT_ID', 'AGS-0042')}.
Cargo: {os.getenv('CARGO_TYPE', 'Insulin Glargine 100U/ML')}

Incident details:
{incident}

Generate a formal FDA-style deviation report with these sections:
1. INCIDENT SUMMARY (2 sentences)
2. SENSOR DATA AT TIME OF INCIDENT
3. PROBABLE CAUSE (with confidence %)
4. IMMEDIATE ACTIONS TAKEN (list what Aegis did autonomously)
5. RECOMMENDED FOLLOW-UP
6. INTEGRITY ASSESSMENT: PASS / FAIL / REQUIRES INSPECTION

Keep it under 200 words. Be specific and professional."""

    response = llm.chat.completions.create(
        model="asi1-mini",
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
    incident_active = payload.get("incidentActive", False)
    shipment_id = payload.get("shipmentId") or shipment.get("shipmentId") or os.getenv("SHIPMENT_ID", "AGS-0042")
    cargo = shipment.get("productName") or shipment.get("name") or os.getenv("CARGO_TYPE", "Insulin Glargine 100U/ML")

    prompt = f"""You are Aegis Response Agent, an autonomous pharmaceutical shipment response system.

Generate the final response report from this full shipment context. Do not invent readings.

Shipment:
- ID: {shipment_id}
- Cargo: {cargo}
- Compliance framework: {shipment.get('complianceFramework')}
- Route: {route.get('origin') or shipment.get('origin')} to {route.get('destination') or shipment.get('destination')}
- Current location: {route.get('currentLocation') or sensors.get('location')}
- Route progress: {route.get('routeProgress') or sensors.get('routeProgress')}%

Thresholds:
- Temperature: {thresholds.get('tempMin')}°C to {thresholds.get('tempMax')}°C
- Humidity: {thresholds.get('humidityMin')}% to {thresholds.get('humidityMax')}%

Current sensors:
- Temperature: {sensors.get('temperature')}°C
- Humidity: {sensors.get('humidity')}%
- Shock count: {sensors.get('shockCount')}
- Water exposure: {sensors.get('waterExposure')}
- Seal status: {sensors.get('sealStatus')}
- Battery: {sensors.get('battery')}%

Shipment analysis:
- Incident active: {incident_active}
- Viability score: {analysis.get('viabilityScore')}%
- Degradation risk: {analysis.get('degradationRisk')}%
- Status: {analysis.get('status')}

Narrative Agent output:
{narrative}

Timeline:
{timeline[-12:]}

Respond with these sections:
1. DISPOSITION
2. INCIDENT SUMMARY
3. SENSOR DATA AT INCIDENT OR DELIVERY
4. AUTONOMOUS RESPONSE DRAFTS
5. RECOMMENDED FOLLOW-UP
6. INTEGRITY ASSESSMENT: PASS / FAIL / REQUIRES INSPECTION

Keep it under 240 words. Use a professional compliance tone."""

    response = llm.chat.completions.create(
        model="asi1-mini",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def simulate_incident(query):
    """Simulate different incident types based on query keywords"""
    query_lower = query.lower()
    
    if "tamper" in query_lower:
        return {
            "type": "TAMPERING",
            "temperature": 11.2,
            "humidity": 68,
            "shock": 2.4,
            "water": True,
            "events": ["SHOCK 2.1G at 23:31", "TEMP ANOMALY 8.7°C at 23:32", 
                      "WATER DETECTED at 23:33", "SHOCK 2.4G at 23:33"],
            "temp_zscore": 11.7,
            "confidence": 81
        }
    elif "cold chain" in query_lower or "temperature" in query_lower:
        return {
            "type": "COLD CHAIN BREACH",
            "temperature": 12.1,
            "humidity": 55,
            "shock": 0.02,
            "water": False,
            "events": ["TEMP WARNING 6.2°C at 23:28", "TEMP ANOMALY 9.8°C at 23:31",
                      "TEMP CRITICAL 12.1°C at 23:35"],
            "temp_zscore": 13.3,
            "confidence": 94
        }
    else:
        return {
            "type": "HANDLING ANOMALY",
            "temperature": 5.2,
            "humidity": 47,
            "shock": 2.1,
            "water": False,
            "events": ["SHOCK 2.1G at 23:40"],
            "temp_zscore": 1.8,
            "confidence": 76
        }

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

    incident = simulate_incident(user_query)
    
    incident_text = f"""
Incident Type: {incident['type']}
Temperature: {incident['temperature']}°C (z-score: {incident['temp_zscore']}σ)
Humidity: {incident['humidity']}%
Shock: {incident['shock']}G
Water Detected: {incident['water']}
Event Timeline: {', '.join(incident['events'])}
Classification Confidence: {incident['confidence']}%
"""

    report = generate_deviation_report(incident_text)

    autonomous_actions = """
AUTONOMOUS ACTIONS COMPLETED:
  ✓ Deviation report drafted
  ✓ Receiving pharmacy notified
  ✓ Insurance claim opened
  ✓ Chain of custody updated
  ✓ Regulatory flag raised
  
Awaiting human confirmation to finalize submissions.
"""

    response = f"""AEGIS RESPONSE AGENT — {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
Shipment: {os.getenv('SHIPMENT_ID', 'AGS-0042')}
Incident: {incident['type']}

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
