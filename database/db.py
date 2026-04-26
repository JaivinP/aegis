import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.environ["MONGODB_URI"]
MONGODB_DB = os.environ.get("MONGODB_DB", "failsafe")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]

shipments = db["shipments"]
shipment_types = db["shipment_types"]
sensor_readings = db["sensor_readings"]
timeline_events = db["timeline_events"]
incident_reports = db["incident_reports"]
escalation_drafts = db["escalation_drafts"]
