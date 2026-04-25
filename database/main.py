from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from db import shipments, sensor_readings, timeline_events, incident_reports

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Shipments ---

@app.post("/shipments")
async def create_shipment(payload: dict):
    result = await shipments.insert_one(payload)
    return {"ok": True, "id": str(result.inserted_id), "shipment_id": payload.get("shipment_id")}

@app.get("/shipments/{shipment_id}")
async def get_shipment(shipment_id: str):
    doc = await shipments.find_one({"shipment_id": shipment_id}, {"_id": 0})
    if not doc:
        return {"error": "not found"}
    return doc


# --- Sensor readings ---

@app.post("/shipments/{shipment_id}/readings")
async def add_reading(shipment_id: str, payload: dict):
    payload["shipment_id"] = shipment_id
    result = await sensor_readings.insert_one(payload)
    return {"ok": True, "id": str(result.inserted_id)}

@app.get("/shipments/{shipment_id}/readings")
async def get_readings(shipment_id: str):
    cursor = sensor_readings.find({"shipment_id": shipment_id}, {"_id": 0}).sort("timestamp", -1).limit(50)
    docs = await cursor.to_list(length=50)
    return docs


# --- Timeline events ---

@app.post("/events")
async def add_event(payload: dict):
    result = await timeline_events.insert_one(payload)
    return {"ok": True, "id": str(result.inserted_id)}

@app.get("/shipments/{shipment_id}/timeline")
async def get_timeline(shipment_id: str):
    cursor = timeline_events.find({"shipment_id": shipment_id}, {"_id": 0}).sort("timestamp", 1)
    docs = await cursor.to_list(length=200)
    return docs


# --- Incident reports ---

@app.post("/report")
async def save_report(payload: dict):
    result = await incident_reports.insert_one(payload)
    return {"ok": True, "id": str(result.inserted_id)}

@app.get("/shipments/{shipment_id}/report")
async def get_report(shipment_id: str):
    doc = await incident_reports.find_one({"shipment_id": shipment_id}, {"_id": 0})
    if not doc:
        return {"error": "not found"}
    return doc
