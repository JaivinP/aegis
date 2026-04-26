from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).with_name(".env"))

REPO_ROOT = Path(__file__).resolve().parents[1]
AGENTS_DIR = REPO_ROOT / "agents"
if str(AGENTS_DIR) not in sys.path:
    sys.path.append(str(AGENTS_DIR))

from db import (  # noqa: E402
    client,
    escalation_drafts,
    incident_reports,
    sensor_readings,
    shipment_types,
    shipments,
    timeline_events,
)
from models import EscalationDraft, Event, SensorReading, Shipment, ShipmentType  # noqa: E402

app = FastAPI(title="Aegis Database API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def mongo_doc(payload: Any) -> dict:
    return payload.model_dump(mode="python")


async def require_doc(collection, query: dict, label: str) -> dict:
    doc = await collection.find_one(query, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return doc


@app.get("/health")
async def health_check():
    await client.admin.command("ping")
    return {"ok": True, "database": "connected"}


# --- Agent bridge ---


@app.post("/agents/narrative/analyze")
async def analyze_with_narrative_agent(payload: Dict[str, Any]):
    try:
        from narrative_agent import generate_narrative_from_payload
        from voice_agent import alert_for_anomaly

        text = await run_in_threadpool(generate_narrative_from_payload, payload)
        try:
            audio_alert = await run_in_threadpool(alert_for_anomaly, payload, text)
        except Exception as exc:
            audio_alert = {
                "triggered": True,
                "ok": False,
                "error": str(exc),
            }

        return {
            "ok": True,
            "agent": "aegis-narrative",
            "text": text,
            "audioAlert": audio_alert,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"narrative agent failed: {exc}") from exc


@app.post("/agents/response/report")
async def report_with_response_agent(payload: Dict[str, Any]):
    try:
        from response_agent import generate_response_from_payload

        text = await run_in_threadpool(generate_response_from_payload, payload)
        return {
            "ok": True,
            "agent": "aegis-response",
            "text": text,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"response agent failed: {exc}") from exc


# --- Shipment types ---


@app.post("/shipment-types", status_code=status.HTTP_201_CREATED)
async def create_shipment_type(payload: ShipmentType):
    doc = mongo_doc(payload)
    result = await shipment_types.insert_one(doc)
    return {
        "ok": True,
        "id": str(result.inserted_id),
        "shipmentTypeId": payload.shipmentTypeId,
    }


@app.get("/shipment-types")
async def get_shipment_types():
    cursor = shipment_types.find({}, {"_id": 0}).sort("createdAt", -1)
    return await cursor.to_list(length=100)


@app.delete("/shipment-types/{type_id}", status_code=status.HTTP_200_OK)
async def delete_shipment_type(type_id: str):
    result = await shipment_types.delete_one({"shipmentTypeId": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="shipment type not found")
    return {"ok": True}


# --- Shipments ---


@app.post("/shipments", status_code=status.HTTP_201_CREATED)
async def create_shipment(payload: Shipment):
    doc = mongo_doc(payload)
    result = await shipments.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id), "shipmentId": payload.shipmentId}


@app.get("/shipments")
async def list_shipments():
    cursor = shipments.find({}, {"_id": 0}).sort("createdAt", -1)
    return await cursor.to_list(length=200)


@app.get("/shipments/{shipment_id}")
async def get_shipment(shipment_id: str):
    return await require_doc(shipments, {"shipmentId": shipment_id}, "shipment")


@app.delete("/shipments/{shipment_id}", status_code=status.HTTP_200_OK)
async def delete_shipment(shipment_id: str):
    result = await shipments.delete_one({"shipmentId": shipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="shipment not found")
    # Also clean up related collections
    await incident_reports.delete_many({"shipmentId": shipment_id})
    await timeline_events.delete_many({"shipmentId": shipment_id})
    await sensor_readings.delete_many({"shipmentId": shipment_id})
    return {"ok": True}


@app.patch("/shipments/{shipment_id}")
async def update_shipment(shipment_id: str, payload: Dict[str, Any]):
    payload["updatedAt"] = datetime.now(timezone.utc)
    result = await shipments.update_one({"shipmentId": shipment_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="shipment not found")
    return {"ok": True}


# --- Sensor readings ---


@app.post("/shipments/{shipment_id}/readings", status_code=status.HTTP_201_CREATED)
async def add_reading(shipment_id: str, payload: SensorReading):
    doc = mongo_doc(payload)
    doc["shipmentId"] = shipment_id
    result = await sensor_readings.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id), "shipmentId": shipment_id}


@app.get("/shipments/{shipment_id}/readings")
async def get_readings(shipment_id: str):
    cursor = (
        sensor_readings.find({"shipmentId": shipment_id}, {"_id": 0})
        .sort("timestamp", -1)
        .limit(50)
    )
    return await cursor.to_list(length=50)


# --- Timeline events ---


@app.post("/shipments/{shipment_id}/events", status_code=status.HTTP_201_CREATED)
async def add_event(shipment_id: str, payload: Event):
    doc = mongo_doc(payload)
    doc["shipmentId"] = shipment_id
    result = await timeline_events.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id), "shipmentId": shipment_id}


@app.get("/shipments/{shipment_id}/timeline")
async def get_timeline(shipment_id: str):
    cursor = timeline_events.find({"shipmentId": shipment_id}, {"_id": 0}).sort("timestamp", 1)
    return await cursor.to_list(length=200)


# --- Incident and final reports ---


@app.post("/shipments/{shipment_id}/reports", status_code=status.HTTP_201_CREATED)
async def save_report(shipment_id: str, payload: Dict[str, Any]):
    payload["shipmentId"] = shipment_id
    payload.setdefault("generatedAt", datetime.now(timezone.utc).isoformat())
    result = await incident_reports.insert_one(payload)
    return {"ok": True, "id": str(result.inserted_id), "shipmentId": shipment_id}


@app.get("/shipments/{shipment_id}/reports")
async def get_reports(shipment_id: str):
    cursor = (
        incident_reports.find({"shipmentId": shipment_id}, {"_id": 0})
        .sort("generatedAt", -1)
        .limit(20)
    )
    return await cursor.to_list(length=20)


@app.get("/shipments/{shipment_id}/reports/latest")
async def get_latest_report(shipment_id: str):
    doc = await incident_reports.find_one(
        {"shipmentId": shipment_id},
        {"_id": 0},
        sort=[("generatedAt", -1)],
    )
    if not doc:
        raise HTTPException(status_code=404, detail="report not found")
    return doc


# --- Escalation drafts ---


@app.post("/shipments/{shipment_id}/escalation-drafts", status_code=status.HTTP_201_CREATED)
async def save_escalation_draft(shipment_id: str, payload: EscalationDraft):
    doc = mongo_doc(payload)
    doc["shipmentId"] = shipment_id
    result = await escalation_drafts.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id), "shipmentId": shipment_id}


@app.get("/shipments/{shipment_id}/escalation-drafts")
async def get_escalation_drafts(shipment_id: str):
    cursor = escalation_drafts.find({"shipmentId": shipment_id}, {"_id": 0}).sort("createdAt", -1)
    return await cursor.to_list(length=50)
