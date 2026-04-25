import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.environ["MONGODB_URI"]
MONGODB_DB = os.environ.get("MONGODB_DB", "aegis")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]

shipments = db["shipments"]
sensor_readings = db["sensor_readings"]
timeline_events = db["timeline_events"]
incident_reports = db["incident_reports"]
